import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import fetch from 'node-fetch';
import crypto from 'crypto';
import resellerRoutes from './routes/reseller.js';
import paymentsRoutes from './routes/payments.js';
import dashboardRoutes from './routes/dashboard.js';
import refundsRoutes from './routes/refunds.js';
import paymentMethodsRoutes from './routes/paymentMethods.js';
import { checkSubscription, checkAndBlockOverdueCompanies } from './middleware/subscriptionMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy para funcionar corretamente atrás do Nginx
app.set('trust proxy', 1);

// Validar variáveis de ambiente obrigatórias
const requiredEnvVars = {
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  JWT_SECRET: process.env.JWT_SECRET,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ ERRO: Variáveis de ambiente obrigatórias não encontradas:');
  missingVars.forEach(key => console.error(`   - ${key}`));
  console.error('\n💡 Configure essas variáveis no arquivo .env');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

// Configuração do PostgreSQL - SEM fallbacks sensíveis
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Handler explícito para requisições OPTIONS (preflight)
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requisições sem origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);
    
    // Lista de origens permitidas
    // Usar API_ORIGIN ao invés de VITE_API_ORIGIN (não é credencial, mas mantém consistência)
    const apiOrigin = process.env.API_ORIGIN || process.env.VITE_API_ORIGIN;
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:8080',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:3000',
      apiOrigin,
      'https://primecamp.cloud',
      'http://primecamp.cloud',
      'https://www.primecamp.cloud',
      'http://www.primecamp.cloud',
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(null, true); // Permitir em desenvolvimento
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Total-Count'],
  preflightContinue: false,
  optionsSuccessStatus: 200,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configurar multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Criar diretório uploads se não existir
    const uploadDir = join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Usar nome original ou gerar nome único
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop();
    cb(null, `${uniqueSuffix}.${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Aceitar apenas imagens
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos'));
    }
  }
});

// Middleware para log de requisições (debug)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    headers: req.headers,
    body: req.body,
  });
  next();
});

// Testar conexão com PostgreSQL
pool.on('error', (err) => {
  console.error('Erro inesperado no pool de conexões PostgreSQL', err);
});

// Middleware de autenticação JWT
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação necessário' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    // CRÍTICO: Buscar company_id do banco para garantir isolamento de dados
    // Mesmo que o token tenha company_id, buscar do banco para garantir dados atualizados
    const userResult = await pool.query(
      'SELECT company_id FROM users WHERE id = $1',
      [decoded.id]
    );
    
    if (userResult.rows.length > 0) {
      req.companyId = userResult.rows[0].company_id;
      req.user.company_id = userResult.rows[0].company_id;
    }
    
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }
};

// Rate limiting - aumentado para suportar o dashboard com muitas queries
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5000, // máximo de 5000 requisições por IP (dashboard faz muitas queries)
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo de 100 tentativas de login por IP
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar rate limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/', limiter);

// Rota de teste de API tokens (ANTES do middleware de autenticação)
app.get('/api/api-tokens/test', (req, res) => {
  res.json({ success: true, message: 'Rota de API tokens está funcionando!' });
});

// POST - Gerar códigos em massa para produtos sem código (autenticado)
// IMPORTANTE: Esta rota deve estar ANTES do middleware global que pula /api/functions/*
app.post('/api/functions/gerar-codigos-produtos', authenticateToken, async (req, res) => {
  try {
    console.log('[Gerar Códigos] Iniciando geração de códigos para produtos sem código...');
    
    // Buscar o maior código existente
    const maxCodigoResult = await pool.query(`
      SELECT MAX(codigo) as max_codigo
      FROM produtos
      WHERE codigo IS NOT NULL
    `);
    
    const maxCodigo = maxCodigoResult.rows[0]?.max_codigo || 0;
    let proximoCodigo = maxCodigo + 1;
    
    // Buscar todos os produtos sem código
    const produtosSemCodigoResult = await pool.query(`
      SELECT id, nome
      FROM produtos
      WHERE codigo IS NULL
      ORDER BY nome
    `);
    
    const produtosSemCodigo = produtosSemCodigoResult.rows;
    console.log(`[Gerar Códigos] Encontrados ${produtosSemCodigo.length} produtos sem código`);
    
    if (produtosSemCodigo.length === 0) {
      return res.json({ 
        success: true, 
        message: 'Nenhum produto sem código encontrado',
        atualizados: 0 
      });
    }
    
    // Atualizar cada produto com um código sequencial
    let atualizados = 0;
    for (const produto of produtosSemCodigo) {
      try {
        await pool.query(`
          UPDATE produtos
          SET codigo = $1
          WHERE id = $2
        `, [proximoCodigo, produto.id]);
        
        atualizados++;
        proximoCodigo++;
      } catch (error) {
        console.error(`[Gerar Códigos] Erro ao atualizar produto ${produto.id}:`, error);
      }
    }
    
    console.log(`[Gerar Códigos] ${atualizados} produtos atualizados com sucesso`);
    
    res.json({ 
      success: true, 
      message: `${atualizados} produtos receberam códigos automaticamente`,
      atualizados 
    });
  } catch (error) {
    console.error('[Gerar Códigos] Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rotas de revenda (admin apenas) - ANTES do middleware global
try {
  console.log('[Server] Registrando rotas de revenda em /api/admin/revenda');
  console.log('[Server] Tipo de resellerRoutes:', typeof resellerRoutes);
  console.log('[Server] resellerRoutes é função?', typeof resellerRoutes === 'function');
  console.log('[Server] resellerRoutes:', resellerRoutes);
  
  if (!resellerRoutes) {
    throw new Error('resellerRoutes é undefined ou null');
  }
  
  // Registrar rotas de revenda
  app.use('/api/admin/revenda', resellerRoutes);
  console.log('[Server] ✅ Rotas de revenda registradas com sucesso');
  
  // Registrar rotas de pagamentos (COM autenticação)
  app.use('/api/payments', authenticateToken, paymentsRoutes);
  console.log('[Server] ✅ Rotas de pagamentos registradas com sucesso');
  
  // Registrar rotas de dashboard (COM autenticação)
  app.use('/api/dashboard', authenticateToken, dashboardRoutes);
  console.log('[Server] ✅ Rotas de dashboard registradas com sucesso');
  
  // Registrar rotas de devoluções e vales (COM autenticação)
  app.use('/api/refunds', authenticateToken, refundsRoutes);
  console.log('[Server] ✅ Rotas de devoluções registradas com sucesso');
  
  // Registrar rotas de formas de pagamento (COM autenticação)
  app.use('/api/payment-methods', authenticateToken, paymentMethodsRoutes);
  console.log('[Server] ✅ Rotas de formas de pagamento registradas com sucesso');
  
  // Job para verificar inadimplentes a cada hora
  setInterval(async () => {
    try {
      const result = await checkAndBlockOverdueCompanies();
      if (result.blocked > 0) {
        console.log(`[Server] ${result.blocked} empresas bloqueadas por inadimplência`);
      }
    } catch (error) {
      console.error('[Server] Erro ao verificar inadimplentes:', error);
    }
  }, 60 * 60 * 1000); // 1 hora
  
  // Rota de teste para verificar se está funcionando
  app.get('/api/admin/revenda/test', (req, res) => {
    res.json({ success: true, message: 'Rotas de revenda estão funcionando!' });
  });
  
  // Listar rotas registradas (debug)
  console.log('[Server] Rotas registradas no Express:', app._router?.stack?.filter(r => r.route || r.regexp?.test('/api/admin/revenda')).length || 'N/A');
} catch (error) {
  console.error('[Server] ❌ Erro ao registrar rotas de revenda:', error);
  console.error('[Server] Stack trace:', error.stack);
  app.use('/api/admin/revenda', (req, res) => {
    res.status(500).json({ error: 'Rotas de revenda não disponíveis', details: error.message });
  });
}

// Importar middleware de company
let requireCompanyAccess;
try {
  const companyMiddleware = await import('./middleware/companyMiddleware.js');
  requireCompanyAccess = companyMiddleware.requireCompanyAccess;
  console.log('[Server] ✅ Middleware de company carregado');
} catch (error) {
  console.warn('[Server] ⚠️ Middleware de company não encontrado:', error.message);
  requireCompanyAccess = null;
}

// Aplicar autenticação a rotas de dados (não aplicar em /api/auth/*, /api/health, /api/functions/*, /api/whatsapp/*, /api/v1/*)
// Os endpoints /api/functions/*, /api/whatsapp/* e /api/v1/* terão autenticação própria dentro de cada rota
app.use((req, res, next) => {
  // Pular autenticação para rotas de auth, health check, functions, whatsapp, webhook/leads, webhook/test e API pública v1
  // Também pular para rota de teste de api-tokens
  // IMPORTANTE: Pular também para /api/admin/revenda/* pois já tem autenticação própria
  if (req.path.startsWith('/api/auth/') || 
      req.path === '/api/health' || 
      req.path === '/health' ||
      req.path.startsWith('/api/functions/') ||
      req.path.startsWith('/api/storage/') ||
      req.path.startsWith('/api/whatsapp/') ||
      req.path.startsWith('/api/webhook/leads/') ||
      req.path.startsWith('/api/v1/') ||  // API pública v1 usa validateApiToken
      req.path.startsWith('/api/admin/revenda/') || // Rotas de revenda já têm autenticação própria
      req.path.startsWith('/api/api-tokens') || // Rotas de API tokens (admin apenas)
      req.path === '/api/api-tokens/test' ||
      (req.method === 'POST' && /^\/api\/webhook\/test\/[^/]+$/.test(req.path))) { // Webhook test público
    return next();
  }
  // Aplicar autenticação para outras rotas /api/*
  if (req.path.startsWith('/api/')) {
    return authenticateToken(req, res, next);
  }
  next();
});

// Aplicar verificação de assinatura ativa para rotas que precisam (após autenticação)
if (requireCompanyAccess) {
  app.use((req, res, next) => {
    // Pular verificação de company para rotas que não precisam
    if (req.path.startsWith('/api/auth/') || 
        req.path === '/api/health' || 
        req.path === '/health' ||
        req.path.startsWith('/api/functions/') ||
        req.path.startsWith('/api/storage/') ||
        req.path.startsWith('/api/whatsapp/') ||
        req.path.startsWith('/api/webhook/') ||
        req.path.startsWith('/api/v1/') ||  // API pública v1
        req.path.startsWith('/api/admin/revenda/') || // Rotas de revenda
        req.path.startsWith('/api/api-tokens') || // Rotas de API tokens
        !req.user) { // Se não está autenticado, pula
      return next();
    }
    // Aplicar verificação de company para rotas autenticadas
    return requireCompanyAccess(req, res, next);
  });
  console.log('[Server] ✅ Middleware de verificação de assinatura aplicado');
}

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ============================================
// ENDPOINT DE HEALTH CHECK
// ============================================

// Health check (não precisa de autenticação)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API PostgreSQL está funcionando',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// ENDPOINTS DE AUTENTICAÇÃO
// ============================================

// Login - APENAS PostgreSQL, SEM Supabase
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('[API] Tentativa de login:', { email: email?.toLowerCase() });

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // 🚫 BUSCAR APENAS NA TABELA users DO POSTGRESQL
    // NÃO usar Supabase Auth de forma alguma
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      console.log('[API] Usuário não encontrado na tabela users:', email.toLowerCase());
      return res.status(401).json({ error: 'Email ou senha incorretos. Verifique se o usuário existe na tabela "users" do PostgreSQL.' });
    }

    const user = result.rows[0];
    console.log('[API] Usuário encontrado:', { id: user.id, email: user.email, hasPasswordHash: !!user.password_hash });

    // Verificar se tem password_hash
    if (!user.password_hash) {
      console.error('[API] Usuário sem password_hash:', user.id);
      return res.status(401).json({ error: 'Usuário sem senha configurada. Entre em contato com o administrador.' });
    }

    // Verificar senha usando bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log('[API] Senha incorreta para usuário:', email.toLowerCase());
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    console.log('[API] Senha válida, buscando profile...');

    // Buscar profile do usuário na tabela profiles do PostgreSQL
    const profileResult = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [user.id]
    );

    const profile = profileResult.rows[0] || null;
    console.log('[API] Profile encontrado:', { hasProfile: !!profile, role: profile?.role });

    // Gerar token JWT (incluindo company_id para isolamento de dados)
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: profile?.role || 'member',
        company_id: user.company_id
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('[API] Login bem-sucedido:', { userId: user.id, email: user.email, company_id: user.company_id, hasToken: !!token });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        email_verified: user.email_verified,
        created_at: user.created_at,
        company_id: user.company_id
      },
      profile
    });
  } catch (error) {
    console.error('[API] Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Signup (Cadastro)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, display_name, phone, department, role, company_id } = req.body;

    console.log('[API] Tentativa de cadastro:', { email: email?.toLowerCase(), hasDisplayName: !!display_name, company_id });

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar se email já existe
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (existingUser.rows.length > 0) {
      console.log('[API] Email já cadastrado:', email.toLowerCase());
      return res.status(400).json({ error: 'Este email já está cadastrado' });
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('[API] Senha hash criada');

    // Criar usuário com company_id (se fornecido)
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, email_verified, company_id)
       VALUES ($1, $2, true, $3)
       RETURNING *`,
      [email.toLowerCase().trim(), passwordHash, company_id || null]
    );

    const newUser = userResult.rows[0];
    console.log('[API] Usuário criado:', { id: newUser.id, email: newUser.email });

    // Criar profile SEMPRE (mesmo que vazio)
    const profileResult = await pool.query(
      `INSERT INTO profiles (user_id, display_name, phone, department, role, approved, approved_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW())
       RETURNING *`,
      [
        newUser.id, 
        display_name || email.split('@')[0] || email, // Usar nome do email se não fornecido
        phone || null, 
        department || null, 
        role || 'member'
      ]
    );
    
    const profile = profileResult.rows[0];
    console.log('[API] Profile criado:', { id: profile.id, display_name: profile.display_name, role: profile.role });

    // Gerar token JWT (incluindo company_id para isolamento de dados)
    const token = jwt.sign(
      { 
        id: newUser.id, 
        email: newUser.email,
        role: profile.role || 'member',
        company_id: newUser.company_id
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('[API] Cadastro bem-sucedido:', { userId: newUser.id, email: newUser.email, company_id: newUser.company_id, hasToken: !!token });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        email_verified: newUser.email_verified,
        created_at: newUser.created_at
      },
      profile
    });
  } catch (error) {
    console.error('[API] Erro no cadastro:', error);
    res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
});

// Obter usuário atual
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar usuário
    const userResult = await pool.query(
      'SELECT id, email, email_verified, created_at, company_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = userResult.rows[0];

    // Buscar profile
    const profileResult = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [userId]
    );

    const profile = profileResult.rows[0] || null;

    res.json({
      user,
      profile
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Logout (apenas remove token do cliente, não precisa fazer nada no servidor)
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logout realizado com sucesso' });
});

// Request Password Reset (Solicitar reset de senha)
app.post('/api/auth/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    // Buscar usuário
    const result = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Por segurança, não revelar se o email existe ou não
      return res.json({ message: 'Se o email existir, um link de redefinição será enviado' });
    }

    const user = result.rows[0];

    // Gerar token de reset (válido por 1 hora)
    const resetToken = jwt.sign(
      { id: user.id, email: user.email, type: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // TODO: Enviar email com link de reset usando nodemailer ou serviço de email
    // Por enquanto, apenas retornar o token (em desenvolvimento)
    const resetLink = `${process.env.FRONTEND_URL || 'https://primecamp.cloud'}/reset-password?access_token=${resetToken}`;
    
    console.log(`[API] Link de reset gerado para ${user.email}: ${resetLink}`);

    res.json({ 
      message: 'Se o email existir, um link de redefinição será enviado',
      // Em desenvolvimento, retornar o link (remover em produção)
      ...(process.env.NODE_ENV === 'development' && { resetLink })
    });
  } catch (error) {
    console.error('Erro ao solicitar reset de senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Reset Password (Redefinir senha com token)
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { password, token } = req.body;

    console.log('[API] Tentativa de reset de senha:', { hasPassword: !!password, hasToken: !!token });

    if (!password || !token) {
      return res.status(400).json({ error: 'Senha e token são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.type !== 'password_reset') {
        console.log('[API] Token inválido - tipo incorreto:', decoded.type);
        return res.status(400).json({ error: 'Token inválido' });
      }
      console.log('[API] Token válido:', { userId: decoded.id, email: decoded.email });
    } catch (error) {
      console.error('[API] Erro ao verificar token:', error.message);
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    // Hash da nova senha
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('[API] Nova senha hash criada');

    // Atualizar senha
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email',
      [passwordHash, decoded.id]
    );

    if (result.rows.length === 0) {
      console.log('[API] Usuário não encontrado para reset:', decoded.id);
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    console.log('[API] Senha redefinida com sucesso:', { userId: result.rows[0].id, email: result.rows[0].email });

    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    console.error('[API] Erro ao redefinir senha:', error);
    res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
});

// ============================================
// FIM DOS ENDPOINTS DE AUTENTICAÇÃO
// ============================================

// Helper para construir WHERE clause
// offset: número de parâmetros já usados (para começar a contar a partir desse número)
function buildWhereClause(where, offsetOrParams = []) {
  if (!where || Object.keys(where).length === 0) {
    return { clause: '', params: [] };
  }

  const conditions = [];
  const params = [];
  // Se for array, usar o length; se for número, usar diretamente
  const offset = Array.isArray(offsetOrParams) ? offsetOrParams.length : offsetOrParams;
  let paramIndex = offset + 1;

  // Tratar OR primeiro
  if (where.__or) {
    const orConditions = [];
    const orParts = where.__or.split(',');
    
    for (const part of orParts) {
      const [field, operator, ...valueParts] = part.split('.');
      const value = valueParts.join('.');
      
      if (operator === 'ilike') {
        const searchValue = value.replace(/%/g, '');
        orConditions.push(`${field} ILIKE $${paramIndex}`);
        params.push(`%${searchValue}%`);
        paramIndex++;
      } else if (operator === 'eq') {
        orConditions.push(`${field} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }
    
    if (orConditions.length > 0) {
      conditions.push(`(${orConditions.join(' OR ')})`);
    }
  }
  
  // Tratar NOT
  for (const [field, value] of Object.entries(where)) {
    if (field.includes('__not__')) {
      // Split por '__not__' e pegar o que vem depois
      const parts = field.split('__not__');
      const actualField = parts[0];
      const operatorPart = parts[1] || '';
      
      // Remover underscore inicial se existir (para casos como __not___is -> _is)
      const operator = operatorPart.startsWith('_') ? operatorPart.substring(1) : operatorPart;
      
      if (operator === 'is' && value === null) {
        conditions.push(`${actualField} IS NOT NULL`);
      } else if (operator === 'eq') {
        conditions.push(`${actualField} != $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
      continue;
    }
    
    // Pular __or que já foi tratado
    if (field === '__or') continue;
    
    if (field.endsWith('__neq')) {
      const actualField = field.replace('__neq', '');
      conditions.push(`${actualField} != $${paramIndex}`);
      params.push(value);
      paramIndex++;
    } else if (field.endsWith('__gt')) {
      const actualField = field.replace('__gt', '');
      conditions.push(`${actualField} > $${paramIndex}`);
      params.push(value);
      paramIndex++;
    } else if (field.endsWith('__gte')) {
      const actualField = field.replace('__gte', '');
      conditions.push(`${actualField} >= $${paramIndex}`);
      params.push(value);
      paramIndex++;
    } else if (field.endsWith('__lt')) {
      const actualField = field.replace('__lt', '');
      conditions.push(`${actualField} < $${paramIndex}`);
      params.push(value);
      paramIndex++;
    } else if (field.endsWith('__lte')) {
      const actualField = field.replace('__lte', '');
      conditions.push(`${actualField} <= $${paramIndex}`);
      params.push(value);
      paramIndex++;
    } else if (field.endsWith('__like')) {
      const actualField = field.replace('__like', '');
      conditions.push(`${actualField} LIKE $${paramIndex}`);
      params.push(value);
      paramIndex++;
    } else if (field.endsWith('__ilike')) {
      const actualField = field.replace('__ilike', '');
      conditions.push(`${actualField} ILIKE $${paramIndex}`);
      params.push(value);
      paramIndex++;
    } else if (field.endsWith('__in')) {
      const actualField = field.replace('__in', '');
      // Se array vazio, adicionar condição que sempre retorna false
      if (!Array.isArray(value) || value.length === 0) {
        conditions.push('1=0'); // Sempre false - não retorna nenhum resultado
      } else {
        const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
        conditions.push(`${actualField} IN (${placeholders})`);
        params.push(...value);
      }
    } else {
      conditions.push(`${field} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  // Se não há condições, retornar clause vazio
  if (conditions.length === 0) {
    return { clause: '', params };
  }

  return {
    clause: `WHERE ${conditions.join(' AND ')}`,
    params,
  };
}

// Query endpoint
app.post('/api/query/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { select, where, orderBy, limit, offset } = req.body;

    // Usar schema public explicitamente
    const tableName = table.includes('.') ? table : `public.${table}`;
    
    const fields = Array.isArray(select) ? select.join(', ') : (select || '*');
    const { clause: whereClause, params } = buildWhereClause(where);

    // Lista COMPLETA de tabelas que precisam filtrar por company_id
    // CRÍTICO: Garante isolamento de dados entre empresas
    const tablesWithCompanyId = [
      // Dados de negócio principais
      'produtos', 'vendas', 'sales', 'clientes', 'ordens_servico',
      'sale_items', 'os_items', 'produto_movimentacoes',
      // Ponto eletrônico
      'time_clock',
      // Usuários (cada empresa só vê seus usuários)
      'users',
      // NPS e pesquisas
      'nps_surveys', 'nps_responses',
      // Vagas e recrutamento
      'job_surveys', 'job_responses', 'job_application_drafts',
      'job_candidate_ai_analysis', 'job_candidate_evaluations', 
      'job_interviews', 'candidate_responses',
      // Financeiro
      'payments', 'caixa_sessions', 'caixa_movements',
      // Marcas e modelos (se tiver por empresa)
      'marcas', 'modelos',
      // Configurações específicas da empresa
      'configuracoes_empresa', 'company_settings'
    ];
    
    const tableNameOnly = table.includes('.') ? table.split('.')[1] : table;
    const needsCompanyFilter = tablesWithCompanyId.includes(tableNameOnly.toLowerCase());
    
    // Se a tabela precisa de filtro por company_id e o usuário está autenticado
    let finalWhereClause = whereClause;
    let finalParams = [...params];
    
    if (needsCompanyFilter && req.user && req.companyId) {
      // Verificar se já existe filtro de company_id no where
      const hasCompanyFilter = where && (
        (typeof where === 'object' && 'company_id' in where) ||
        (Array.isArray(where) && where.some((w) => w.field === 'company_id' || w.company_id))
      );
      
      if (!hasCompanyFilter) {
        // Adicionar filtro de company_id automaticamente
        if (finalWhereClause) {
          finalWhereClause += ` AND ${tableNameOnly}.company_id = $${finalParams.length + 1}`;
        } else {
          finalWhereClause = `WHERE ${tableNameOnly}.company_id = $${finalParams.length + 1}`;
        }
        finalParams.push(req.companyId);
        console.log(`[Query] Adicionando filtro company_id=${req.companyId} para tabela ${tableNameOnly}`);
      }
    }

    // Query para buscar dados
    let sql = `SELECT ${fields} FROM ${tableName}`;
    if (finalWhereClause) sql += ` ${finalWhereClause}`;

    // Validar coluna de ordenação para evitar erro "column ... does not exist"
    if (orderBy && orderBy.field) {
      let columnExists = true;
      try {
        const colCheck = await pool.query(
          `SELECT 1 FROM information_schema.columns 
           WHERE table_schema = 'public' 
             AND table_name = $1 
             AND column_name = $2`,
          [table.includes('.') ? table.split('.')[1] : table, orderBy.field]
        );
        columnExists = colCheck.rows.length > 0;
      } catch (e) {
        console.warn(`[Query] Falha ao checar coluna ${orderBy.field} em ${tableName}:`, e.message);
      }

      if (columnExists) {
        const direction = orderBy.ascending === false ? 'DESC' : 'ASC';
        sql += ` ORDER BY ${orderBy.field} ${direction}`;
      } else {
        console.warn(`[Query] Coluna de ordenação '${orderBy.field}' não existe em ${tableName}, ignorando ORDER BY.`);
      }
    }

    if (limit) {
      sql += ` LIMIT ${limit}`;
    }

    if (offset) {
      sql += ` OFFSET ${offset}`;
    }

    console.log(`[Query] ${tableName}:`, sql, finalParams);
    const result = await pool.query(sql, finalParams);
    console.log(`[Query] ${tableName} resultado:`, result.rows.length, 'registros');
    
    // Query para contar total (sem limit/offset)
    let countSql = `SELECT COUNT(*) as total FROM ${tableName}`;
    if (finalWhereClause) countSql += ` ${finalWhereClause}`;
    
    const countResult = await pool.query(countSql, finalParams);
    const totalCount = parseInt(countResult.rows[0]?.total || '0');

    res.json({ rows: result.rows, count: totalCount });
  } catch (error) {
    console.error('Erro na query:', error);
    res.status(500).json({ error: error.message });
  }
});

// Insert endpoint
app.post('/api/insert/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const data = req.body;

    // Usar schema public explicitamente
    const tableName = table.includes('.') ? table : `public.${table}`;
    const tableNameOnly = table.includes('.') ? table.split('.')[1] : table;

    // Lista COMPLETA de tabelas que precisam de company_id no INSERT
    // CRÍTICO: Garante isolamento de dados entre empresas
    const tablesWithCompanyId = [
      'produtos', 'vendas', 'sales', 'clientes', 'ordens_servico',
      'sale_items', 'os_items', 'produto_movimentacoes',
      'time_clock', 'users',
      'nps_surveys', 'nps_responses',
      'job_surveys', 'job_responses', 'job_application_drafts',
      'job_candidate_ai_analysis', 'job_candidate_evaluations', 
      'job_interviews', 'candidate_responses',
      'payments', 'caixa_sessions', 'caixa_movements',
      'marcas', 'modelos', 'configuracoes_empresa', 'company_settings'
    ];
    
    const needsCompanyId = tablesWithCompanyId.includes(tableNameOnly.toLowerCase());

    // Suportar INSERT em lote: body pode ser array de objetos
    const rowsToInsert = Array.isArray(data) ? data : [data];
    
    // Adicionar company_id automaticamente se necessário
    if (needsCompanyId && req.user && req.companyId) {
      rowsToInsert.forEach(row => {
        if (!row.company_id) {
          row.company_id = req.companyId;
        }
      });
      console.log(`[Insert] Adicionando company_id=${req.companyId} para tabela ${tableNameOnly}`);
    }

    if (!rowsToInsert || rowsToInsert.length === 0) {
      return res.status(400).json({ error: 'Insert requires data' });
    }

    // VALIDAÇÃO CRÍTICA: Verificar estoque para sale_items
    if (table === 'sale_items') {
      for (const row of rowsToInsert) {
        if (row?.produto_id && row?.quantidade && row?.produto_tipo === 'produto') {
          const estoqueResult = await pool.query(
            'SELECT quantidade FROM public.produtos WHERE id = $1',
            [row.produto_id]
          );
          
          if (estoqueResult.rows.length > 0) {
            const estoqueDisponivel = Number(estoqueResult.rows[0].quantidade || 0);
            const quantidadeSolicitada = Number(row.quantidade || 0);
            
            if (quantidadeSolicitada > estoqueDisponivel) {
              console.log(`[Insert] Bloqueado: Estoque insuficiente. Solicitado: ${quantidadeSolicitada}, Disponível: ${estoqueDisponivel}`);
              return res.status(400).json({ 
                error: `Estoque insuficiente para este produto. Disponível: ${estoqueDisponivel} unidade(s)`,
                codigo: 'ESTOQUE_INSUFICIENTE',
                estoque_disponivel: estoqueDisponivel
              });
            }
          }
        }
      }
    }

    // Normalizar colunas a partir do primeiro item
    const firstRow = rowsToInsert[0] || {};
    const keys = Object.keys(firstRow);
    if (keys.length === 0) {
      return res.status(400).json({ error: 'Insert requires non-empty object' });
    }

    // Garantir que todas as linhas têm as mesmas colunas (evita SQL inválido)
    for (const row of rowsToInsert) {
      const rowKeys = Object.keys(row || {});
      const same = rowKeys.length === keys.length && rowKeys.every(k => keys.includes(k));
      if (!same) {
        return res.status(400).json({ error: 'Insert batch requires consistent columns in all rows' });
      }
    }

    const values = [];
    const rowsPlaceholders = rowsToInsert.map((row, rowIndex) => {
      const base = rowIndex * keys.length;
      keys.forEach((k, i) => {
        // Serializar objetos/arrays como JSON para campos JSONB
        let value = row[k];
        if (value !== null && typeof value === 'object') {
          value = JSON.stringify(value);
        }
        values.push(value);
      });
      const placeholders = keys.map((_, i) => `$${base + i + 1}`).join(', ');
      return `(${placeholders})`;
    }).join(', ');

    const sql = `
      INSERT INTO ${tableName} (${keys.join(', ')})
      VALUES ${rowsPlaceholders}
      RETURNING *
    `;

    console.log(`[Insert] ${tableName}:`, keys, Array.isArray(data) ? `(batch ${rowsToInsert.length})` : '(single)');
    const result = await pool.query(sql, values);
    res.json({ data: Array.isArray(data) ? result.rows : result.rows[0], rows: result.rows });
  } catch (error) {
    console.error('Erro ao inserir:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update endpoint
app.post('/api/update/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { data, where } = req.body;

    // Usar schema public explicitamente
    const tableName = table.includes('.') ? table : `public.${table}`;
    const tableNameOnly = table.includes('.') ? table.split('.')[1] : table;

    // Lista COMPLETA de tabelas que precisam filtrar por company_id no UPDATE
    // CRÍTICO: Garante isolamento de dados entre empresas
    const tablesWithCompanyId = [
      'produtos', 'vendas', 'sales', 'clientes', 'ordens_servico',
      'sale_items', 'os_items', 'produto_movimentacoes',
      'time_clock', 'users',
      'nps_surveys', 'nps_responses',
      'job_surveys', 'job_responses', 'job_application_drafts',
      'job_candidate_ai_analysis', 'job_candidate_evaluations', 
      'job_interviews', 'candidate_responses',
      'payments', 'caixa_sessions', 'caixa_movements',
      'marcas', 'modelos', 'configuracoes_empresa', 'company_settings'
    ];
    
    const needsCompanyFilter = tablesWithCompanyId.includes(tableNameOnly.toLowerCase());

    if (!where || Object.keys(where).length === 0) {
      return res.status(400).json({ error: 'Update requires WHERE clause' });
    }

    const keys = Object.keys(data);
    // Serializar objetos/arrays como JSON para campos JSONB
    const values = Object.values(data).map(value => {
      if (value !== null && typeof value === 'object') {
        return JSON.stringify(value);
      }
      return value;
    });
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    
    // Passar o número de valores do SET como offset para buildWhereClause
    const { clause: whereClause, params: whereParams } = buildWhereClause(where, values.length);
    let params = [...values, ...whereParams];
    let finalWhereClause = whereClause;
    
    // Adicionar filtro de company_id se necessário
    if (needsCompanyFilter && req.user && req.companyId) {
      const hasCompanyFilter = where && (
        (typeof where === 'object' && 'company_id' in where) ||
        (Array.isArray(where) && where.some((w) => w.field === 'company_id' || w.company_id))
      );
      
      if (!hasCompanyFilter) {
        if (finalWhereClause) {
          finalWhereClause += ` AND ${tableNameOnly}.company_id = $${params.length + 1}`;
        } else {
          finalWhereClause = `WHERE ${tableNameOnly}.company_id = $${params.length + 1}`;
        }
        params.push(req.companyId);
        console.log(`[Update] Adicionando filtro company_id=${req.companyId} para tabela ${tableNameOnly}`);
      }
    }

    const sql = `
      UPDATE ${tableName}
      SET ${setClause}
      ${finalWhereClause}
      RETURNING *
    `;

    console.log(`[Update] ${tableName}:`, keys, 'WHERE:', finalWhereClause, 'Params:', params.length);
    const result = await pool.query(sql, params);
    res.json({ data: result.rows, rows: result.rows, count: result.rowCount });
  } catch (error) {
    console.error('Erro ao atualizar:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upsert endpoint (INSERT ... ON CONFLICT UPDATE)
app.post('/api/upsert/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { data, onConflict } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }

    // Usar schema public explicitamente
    const tableName = table.includes('.') ? table : `public.${table}`;

    const keys = Object.keys(data);
    // Serializar objetos/arrays como JSON para campos JSONB
    const values = Object.values(data).map(value => {
      if (value !== null && typeof value === 'object') {
        return JSON.stringify(value);
      }
      return value;
    });
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    // Determinar coluna de conflito (padrão: 'key' para kv_store, 'id' para outras)
    const conflictColumn = onConflict || (table === 'kv_store_2c4defad' ? 'key' : 'id');
    
    // Verificar se a coluna de conflito existe na tabela
    let actualConflictColumn = conflictColumn;
    try {
      const checkColumn = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = $2
      `, [table, conflictColumn]);
      
      if (checkColumn.rows.length === 0 && conflictColumn === 'id') {
        // Se 'id' não existe, tentar 'key' ou primeira coluna única
        const uniqueCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
          WHERE tc.table_schema = 'public' 
          AND tc.table_name = $1 
          AND tc.constraint_type = 'UNIQUE'
          LIMIT 1
        `, [table]);
        
        if (uniqueCheck.rows.length > 0) {
          actualConflictColumn = uniqueCheck.rows[0].column_name;
        } else if (table === 'kv_store_2c4defad') {
          actualConflictColumn = 'key';
        }
      }
    } catch (checkError) {
      console.warn(`[Upsert] Erro ao verificar coluna de conflito, usando padrão: ${checkError.message}`);
    }
    
    // Verificar se a coluna updated_at existe na tabela
    let hasUpdatedAt = false;
    try {
      const checkUpdatedAt = await pool.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'updated_at'
      `, [table]);
      hasUpdatedAt = checkUpdatedAt.rows.length > 0;
    } catch (e) {
      console.warn(`[Upsert] Erro ao verificar coluna updated_at: ${e.message}`);
    }

    // Construir cláusula SET para UPDATE em caso de conflito
    const keysToUpdate = keys.filter(key => key !== actualConflictColumn && key !== 'created_at');
    const updateClause = keysToUpdate
      .map((key) => {
        const valueIndex = keys.indexOf(key) + 1;
        return `${key} = $${valueIndex}`;
      })
      .join(', ');

    // Se não há colunas para atualizar além da de conflito, usar apenas updated_at (se existir)
    let finalUpdateClause;
    if (updateClause) {
      finalUpdateClause = hasUpdatedAt ? `${updateClause}, updated_at = NOW()` : updateClause;
    } else {
      // Se não há nada para atualizar, fazer um update "dummy" ou usar updated_at se existir
      finalUpdateClause = hasUpdatedAt ? 'updated_at = NOW()' : `${actualConflictColumn} = EXCLUDED.${actualConflictColumn}`;
    }

    const sql = `
      INSERT INTO ${tableName} (${keys.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (${actualConflictColumn}) 
      DO UPDATE SET ${finalUpdateClause}
      RETURNING *
    `;

    console.log(`[Upsert] ${tableName} on conflict: ${actualConflictColumn}`);
    const result = await pool.query(sql, values);
    res.json({ data: result.rows[0], rows: result.rows });
  } catch (error) {
    console.error('Erro ao upsert:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete endpoint (COM FILTRO DE company_id OBRIGATÓRIO)
app.post('/api/delete/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { where } = req.body;

    // Usar schema public explicitamente
    const tableName = table.includes('.') ? table : `public.${table}`;
    const tableNameOnly = table.includes('.') ? table.split('.')[1] : table;

    if (!where || Object.keys(where).length === 0) {
      return res.status(400).json({ error: 'Delete requires WHERE clause' });
    }

    // Lista COMPLETA de tabelas que precisam filtrar por company_id no DELETE
    // CRÍTICO: Garante isolamento de dados entre empresas
    const tablesWithCompanyId = [
      'produtos', 'vendas', 'sales', 'clientes', 'ordens_servico',
      'sale_items', 'os_items', 'produto_movimentacoes',
      'time_clock', 'users',
      'nps_surveys', 'nps_responses',
      'job_surveys', 'job_responses', 'job_application_drafts',
      'job_candidate_ai_analysis', 'job_candidate_evaluations', 
      'job_interviews', 'candidate_responses',
      'payments', 'caixa_sessions', 'caixa_movements',
      'marcas', 'modelos', 'configuracoes_empresa', 'company_settings'
    ];
    
    const needsCompanyFilter = tablesWithCompanyId.includes(tableNameOnly.toLowerCase());

    const { clause: whereClause, params } = buildWhereClause(where);
    let finalWhereClause = whereClause;
    let finalParams = [...params];

    // CRÍTICO: Adicionar filtro de company_id automaticamente
    if (needsCompanyFilter && req.user && req.companyId) {
      const hasCompanyFilter = where && (typeof where === 'object' && 'company_id' in where);
      
      if (!hasCompanyFilter) {
        if (finalWhereClause) {
          finalWhereClause += ` AND company_id = $${finalParams.length + 1}`;
        } else {
          finalWhereClause = `WHERE company_id = $${finalParams.length + 1}`;
        }
        finalParams.push(req.companyId);
        console.log(`[Delete] Adicionando filtro company_id=${req.companyId} para tabela ${tableNameOnly}`);
      }
    }

    const sql = `
      DELETE FROM ${tableName}
      ${finalWhereClause}
      RETURNING *
    `;

    console.log(`[Delete] ${tableName} - SQL: ${sql.substring(0, 100)}...`);
    const result = await pool.query(sql, finalParams);
    res.json({ data: result.rows, rows: result.rows, count: result.rowCount });
  } catch (error) {
    console.error('Erro ao deletar:', error);
    res.status(500).json({ error: error.message });
  }
});

// RPC endpoint (para funções stored procedures)
app.post('/api/rpc/:function', async (req, res) => {
  try {
    const { function: functionName } = req.params;
    const params = req.body.params || [];

    const placeholders = params.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `SELECT * FROM ${functionName}(${placeholders})`;

    const result = await pool.query(sql, params);
    res.json({ data: result.rows, rows: result.rows });
  } catch (error) {
    console.error('Erro ao executar RPC:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ENDPOINT WHATSAPP - ENVIO DE MENSAGENS VIA ATIVA CRM
// ============================================

// POST /api/whatsapp/send
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { action, data } = req.body;

    if (!data || !data.number || !data.body) {
      return res.status(400).json({ error: 'number e body são obrigatórios' });
    }

    // Buscar token do Ativa CRM do banco de dados
    const tokenResult = await pool.query(`
      SELECT value FROM kv_store_2c4defad WHERE key = 'integration_settings'
    `);

    let ativaCrmToken = null;
    if (tokenResult.rows.length > 0 && tokenResult.rows[0].value) {
      const settings = tokenResult.rows[0].value;
      ativaCrmToken = settings.ativaCrmToken;
    }

    if (!ativaCrmToken) {
      return res.status(400).json({ 
        error: 'Token do Ativa CRM não configurado',
        warning: 'Configure o token em Integrações'
      });
    }

    // Formatar número (remover caracteres especiais)
    const formattedNumber = data.number.replace(/\D/g, '');

    // Enviar mensagem via API do Ativa CRM (documentação oficial)
    // URL: https://api.ativacrm.com/api/messages/send
    const ativaCrmResponse = await fetch('https://api.ativacrm.com/api/messages/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ativaCrmToken}`,
      },
      body: JSON.stringify({
        number: formattedNumber,
        body: data.body,
      }),
    });

    const ativaCrmData = await ativaCrmResponse.json().catch(() => ({}));

    console.log('[WhatsApp] Resposta Ativa CRM:', ativaCrmResponse.status, ativaCrmData);

    if (!ativaCrmResponse.ok) {
      // Verificar se é erro de WhatsApp não configurado
      if (ativaCrmData.message?.includes('WhatsApp') || ativaCrmData.error?.includes('WhatsApp')) {
        return res.json({
          success: false,
          warning: 'ERR_NO_DEF_WAPP_FOUND',
          message: ativaCrmData.message || 'Nenhum WhatsApp padrão configurado no Ativa CRM',
        });
      }
      
      return res.status(ativaCrmResponse.status).json({
        success: false,
        error: ativaCrmData.message || ativaCrmData.error || 'Erro ao enviar mensagem',
      });
    }

    res.json({
      success: true,
      message: ativaCrmData.message || 'Mensagem enviada com sucesso',
      data: ativaCrmData,
    });
  } catch (error) {
    console.error('[WhatsApp] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ENDPOINT DE STORAGE - UPLOAD DE ARQUIVOS
// ============================================

// POST /api/storage/upload
app.post('/api/storage/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo não fornecido' });
    }

    const { bucket, path, cacheControl, upsert, contentType } = req.body;
    
    // Usar path fornecido ou nome do arquivo
    const filePath = path || req.file.filename;
    
    // Construir URL pública
    // STORAGE_BASE_URL é opcional - se não definido, usa localhost
    // Em produção, configure STORAGE_BASE_URL no .env para sua URL pública
    // Exemplo: STORAGE_BASE_URL=https://api.primecamp.cloud/uploads
    const baseUrl = process.env.STORAGE_BASE_URL || `http://localhost:${PORT}/uploads`;
    const publicUrl = `${baseUrl}/${req.file.filename}`;

    console.log('[API] Upload realizado:', {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: filePath,
      size: req.file.size,
      bucket
    });

    res.json({
      url: publicUrl,
      path: filePath
    });
  } catch (error) {
    console.error('[API] Erro no upload:', error);
    res.status(500).json({ error: error.message || 'Erro ao fazer upload' });
  }
});

// Servir arquivos estáticos da pasta uploads
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// ============================================
// FUNCTIONS - ADMINISTRAÇÃO DE USUÁRIOS
// ============================================

// Middleware para verificar se usuário é admin
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Buscar role do usuário
    const result = await pool.query(
      'SELECT role FROM profiles WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem executar esta ação.' });
    }
    
    next();
  } catch (error) {
    console.error('[API] Erro ao verificar permissões:', error);
    res.status(500).json({ error: 'Erro ao verificar permissões' });
  }
};

// POST /api/functions/admin-get-user
app.post('/api/functions/admin-get-user', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.body?.userId || req.body?.body?.userId;

    if (!userId) {
      return res.status(400).json({ error: 'userId é obrigatório' });
    }

    // Buscar usuário na tabela users
    const userResult = await pool.query(
      'SELECT id, email, email_verified, created_at FROM users WHERE id = $1',
      [userId]
    );

    // Buscar profile
    const profileResult = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [userId]
    );

    const profile = profileResult.rows[0] || null;

    // Se não existir em users, ainda assim retornar o profile (evita quebrar UI por dados órfãos)
    const user = userResult.rows[0] || null;

    res.json({
      data: {
        user,
        profile
      }
    });
  } catch (error) {
    console.error('[API] Erro ao buscar usuário:', error);
    res.status(500).json({ error: error.message || 'Erro ao buscar usuário' });
  }
});

// POST /api/functions/admin-update-user
app.post('/api/functions/admin-update-user', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const rawBody = req.body?.body && typeof req.body.body === 'object' ? req.body.body : req.body;
    const { userId, email, password } = rawBody || {};

    if (!userId) {
      return res.status(400).json({ error: 'userId é obrigatório' });
    }

    // Verificar se usuário existe
    const userResult = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    // Atualizar email se fornecido
    if (email !== undefined) {
      // Verificar se email já existe
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email.toLowerCase().trim(), userId]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Este email já está em uso por outro usuário' });
      }

      updates.push(`email = $${paramIndex}`);
      values.push(email.toLowerCase().trim());
      paramIndex++;
    }

    // Atualizar senha se fornecida
    if (password !== undefined && password.trim() !== '') {
      if (password.length < 6) {
        return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramIndex}`);
      values.push(passwordHash);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const sql = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, email_verified, created_at
    `;

    const result = await pool.query(sql, values);

    console.log('[API] Usuário atualizado:', { userId, updatedFields: updates.length });

    res.json({
      data: {
        success: true,
        user: result.rows[0]
      }
    });
  } catch (error) {
    console.error('[API] Erro ao atualizar usuário:', error);
    res.status(500).json({ error: error.message || 'Erro ao atualizar usuário' });
  }
});

// POST /api/functions/admin-delete-user
app.post('/api/functions/admin-delete-user', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.body?.userId || req.body?.body?.userId;

    if (!userId) {
      return res.status(400).json({ error: 'userId é obrigatório' });
    }

    console.log('[API] Tentando deletar usuário:', userId);

    // Verificar se é o próprio usuário (não permitir auto-deleção)
    if (req.user.id === userId) {
      return res.status(400).json({ error: 'Você não pode deletar seu próprio usuário' });
    }

    // Verificar se existe em profiles ou users
    const profileResult = await pool.query('SELECT user_id FROM profiles WHERE user_id = $1', [userId]);
    const userResult = await pool.query('SELECT id, email FROM users WHERE id = $1', [userId]);

    if (profileResult.rows.length === 0 && userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Limpar todas as tabelas relacionadas (evita erro de FK)
    const tablesToClean = [
      'user_permissions',
      'user_position_departments', 
      'permission_changes_history',
      'disc_responses',
      'nps_responses',
      'audit_logs'
    ];

    for (const table of tablesToClean) {
      try {
        await pool.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
      } catch (e) {
        // Ignorar se tabela não existir
      }
    }

    // Deletar profile
    await pool.query('DELETE FROM profiles WHERE user_id = $1', [userId]).catch(() => {});

    // Deletar usuário da tabela users
    if (userResult.rows.length > 0) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }

    console.log('[API] Usuário deletado com sucesso:', { userId, email: userResult.rows[0]?.email || null });

    res.json({
      data: {
        success: true,
        message: 'Usuário deletado com sucesso'
      }
    });
  } catch (error) {
    console.error('[API] Erro ao deletar usuário:', error);
    
    // Verificar se é erro de foreign key
    if (error.code === '23503') {
      return res.status(400).json({ 
        error: 'Não é possível deletar este usuário pois ele possui registros relacionados. Detalhes: ' + error.detail,
        warning: true
      });
    }

    res.status(500).json({ error: error.message || 'Erro ao deletar usuário' });
  }
});

// ============================================
// FUNCTIONS - DISC TEST
// ============================================

// POST /api/functions/disc-answer
app.post('/api/functions/disc-answer', authenticateToken, async (req, res) => {
  try {
    const { sessionId, questionId, selectedType, idempotencyKey } = req.body;

    if (!sessionId || !questionId || !selectedType) {
      return res.status(400).json({ error: 'sessionId, questionId e selectedType são obrigatórios' });
    }

    if (!['D', 'I', 'S', 'C'].includes(selectedType)) {
      return res.status(400).json({ error: 'selectedType deve ser D, I, S ou C' });
    }

    // Buscar sessão de teste
    const sessionResult = await pool.query(
      'SELECT * FROM candidate_responses WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessão de teste não encontrada' });
    }

    const session = sessionResult.rows[0];

    // Verificar se já está completo
    if (session.is_completed) {
      return res.status(409).json({ error: 'Teste já foi finalizado' });
    }

    // Carregar respostas existentes
    let responses = [];
    if (session.responses) {
      try {
        responses = typeof session.responses === 'string' 
          ? JSON.parse(session.responses) 
          : session.responses;
      } catch (e) {
        responses = [];
      }
    }

    // Remover resposta anterior para esta questão (evitar duplicatas)
    responses = responses.filter((r) => r.questionId !== questionId);

    // Adicionar nova resposta
    responses.push({
      questionId,
      selectedType
    });

    // Atualizar no banco
    await pool.query(
      'UPDATE candidate_responses SET responses = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(responses), sessionId]
    );

    console.log('[API] Resposta DISC salva:', { sessionId, questionId, selectedType });

    res.json({
      data: {
        success: true,
        sessionId,
        questionId,
        selectedType,
        totalResponses: responses.length
      }
    });
  } catch (error) {
    console.error('[API] Erro ao salvar resposta DISC:', error);
    res.status(500).json({ error: error.message || 'Erro ao salvar resposta' });
  }
});

// POST /api/functions/disc-finish
app.post('/api/functions/disc-finish', authenticateToken, async (req, res) => {
  try {
    const { testSessionId } = req.body;

    if (!testSessionId) {
      return res.status(400).json({ error: 'testSessionId é obrigatório' });
    }

    // Buscar sessão de teste
    const sessionResult = await pool.query(
      'SELECT * FROM candidate_responses WHERE id = $1',
      [testSessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessão de teste não encontrada' });
    }

    const session = sessionResult.rows[0];

    // Verificar se já está completo (idempotência)
    if (session.is_completed) {
      return res.status(409).json({ 
        error: 'ALREADY_FINISHED',
        message: 'Teste já foi finalizado',
        resultId: session.id
      });
    }

    // Carregar respostas
    let responses = [];
    if (session.responses) {
      try {
        responses = typeof session.responses === 'string' 
          ? JSON.parse(session.responses) 
          : session.responses;
      } catch (e) {
        responses = [];
      }
    }

    // Calcular scores DISC
    const scores = {
      d: 0,
      i: 0,
      s: 0,
      c: 0
    };

    responses.forEach((r) => {
      if (r.selectedType === 'D') scores.d++;
      else if (r.selectedType === 'I') scores.i++;
      else if (r.selectedType === 'S') scores.s++;
      else if (r.selectedType === 'C') scores.c++;
    });

    // Determinar perfil dominante
    const maxScore = Math.max(scores.d, scores.i, scores.s, scores.c);
    let dominantProfile = 'BALANCED';
    if (maxScore === scores.d) dominantProfile = 'D';
    else if (maxScore === scores.i) dominantProfile = 'I';
    else if (maxScore === scores.s) dominantProfile = 'S';
    else if (maxScore === scores.c) dominantProfile = 'C';

    // Atualizar sessão como completa e salvar scores
    await pool.query(
      `UPDATE candidate_responses 
       SET is_completed = true, 
           d_score = $1, 
           i_score = $2, 
           s_score = $3, 
           c_score = $4,
           dominant_profile = $5,
           completion_date = NOW(),
           updated_at = NOW()
       WHERE id = $6`,
      [scores.d, scores.i, scores.s, scores.c, dominantProfile, testSessionId]
    );

    console.log('[API] Teste DISC finalizado:', { 
      testSessionId, 
      scores, 
      dominantProfile 
    });

    res.json({
      data: {
        success: true,
        resultId: testSessionId,
        scores,
        dominantProfile
      }
    });
  } catch (error) {
    console.error('[API] Erro ao finalizar teste DISC:', error);
    res.status(500).json({ error: error.message || 'Erro ao finalizar teste' });
  }
});

// POST /api/functions/disc-session-status
app.post('/api/functions/disc-session-status', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId é obrigatório' });
    }

    // Buscar sessão de teste
    const sessionResult = await pool.query(
      'SELECT id, is_completed, d_score, i_score, s_score, c_score, dominant_profile FROM candidate_responses WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessão de teste não encontrada' });
    }

    const session = sessionResult.rows[0];

    if (session.is_completed) {
      res.json({
        data: {
          status: 'FINISHED',
          resultId: session.id,
          scores: {
            d: session.d_score || 0,
            i: session.i_score || 0,
            s: session.s_score || 0,
            c: session.c_score || 0
          },
          dominantProfile: session.dominant_profile
        }
      });
    } else {
      res.json({
        data: {
          status: 'IN_PROGRESS'
        }
      });
    }
  } catch (error) {
    console.error('[API] Erro ao verificar status da sessão DISC:', error);
    res.status(500).json({ error: error.message || 'Erro ao verificar status' });
  }
});

// POST /api/functions/import-produtos - Importar produtos em lote
app.post('/api/functions/import-produtos', authenticateToken, async (req, res) => {
  try {
    const { produtos, opcoes } = req.body;
    
    if (!produtos || !Array.isArray(produtos)) {
      return res.status(400).json({ error: 'Array de produtos é obrigatório' });
    }

    const skipDuplicates = opcoes?.skipDuplicates ?? true;
    const updateExisting = opcoes?.updateExisting ?? false;

    let inseridos = 0;
    let atualizados = 0;
    let erros = 0;
    let invalidos = 0;
    const errosDetalhes = [];

    console.log(`[ImportProdutos] Processando ${produtos.length} produtos...`);

    for (const produto of produtos) {
      try {
        // Validar produto
        if (!produto.descricao && !produto.nome) {
          invalidos++;
          continue;
        }

        // Preparar dados - aceitar múltiplos nomes de campos para compatibilidade
        // Função para limitar valores numéricos
        const limitNum = (val, min, max) => {
          if (val === null || val === undefined || isNaN(val)) return null;
          return Math.min(Math.max(val, min), max);
        };
        
        let valorVenda = parseFloat(produto.valor_dinheiro_pix) || parseFloat(produto.vi_venda) || parseFloat(produto.valor_venda) || 0;
        valorVenda = limitNum(valorVenda, 0, 9999999999.99) || 0; // Max ~10 bilhões
        
        let valorParcelado = produto.valor_parcelado_6x ? parseFloat(produto.valor_parcelado_6x) : (valorVenda ? valorVenda * 1.2 : null);
        valorParcelado = limitNum(valorParcelado, 0, 9999999999.99);
        
        let margemPercentual = produto.margem_percentual ? parseFloat(produto.margem_percentual) : (produto.margem ? parseFloat(produto.margem) : null);
        margemPercentual = limitNum(margemPercentual, 0, 999.99); // DECIMAL(5,2) max é 999.99
        
        // Código: se for número pequeno (< 2 bilhões), usar como INT, senão ignorar
        let codigoVal = null;
        if (produto.codigo !== null && produto.codigo !== undefined) {
          const codigoNum = parseInt(produto.codigo);
          if (!isNaN(codigoNum) && codigoNum > 0 && codigoNum < 2000000000) {
            codigoVal = codigoNum;
          }
        }
        
        // Quantidade e estoque - limitar para evitar overflow
        let quantidade = parseInt(produto.quantidade) || 0;
        quantidade = Math.min(Math.max(quantidade, 0), 2000000000);
        
        let estoqueMinimo = parseInt(produto.estoque_minimo) || 0;
        estoqueMinimo = Math.min(Math.max(estoqueMinimo, 0), 2000000000);
        
        const dadosProduto = {
          codigo: codigoVal,
          nome: (produto.descricao || produto.nome || '').toUpperCase().substring(0, 255),
          codigo_barras: produto.codigo_barras ? String(produto.codigo_barras).substring(0, 50) : null,
          referencia: produto.referencia ? String(produto.referencia).substring(0, 100) : null,
          marca: produto.marca ? String(produto.marca).substring(0, 100) : null,
          modelo: produto.modelo ? String(produto.modelo).substring(0, 100) : null,
          grupo: produto.grupo ? String(produto.grupo).substring(0, 100) : null,
          sub_grupo: produto.sub_grupo ? String(produto.sub_grupo).substring(0, 100) : null,
          qualidade: produto.qualidade ? String(produto.qualidade).substring(0, 50) : null,
          valor_dinheiro_pix: valorVenda,
          valor_parcelado_6x: valorParcelado,
          margem_percentual: margemPercentual,
          quantidade: quantidade,
          estoque_minimo: estoqueMinimo,
          localizacao: produto.localizacao ? String(produto.localizacao).substring(0, 100) : null,
        };

        // Verificar se produto já existe (APENAS por código_barras - referência é localização, não identificador)
        let produtoExistente = null;
        
        if (produto.codigo_barras) {
          const checkResult = await pool.query(
            'SELECT id FROM produtos WHERE codigo_barras = $1 LIMIT 1',
            [produto.codigo_barras]
          );
          if (checkResult.rows.length > 0) {
            produtoExistente = checkResult.rows[0];
          }
        }

        if (produtoExistente) {
          if (skipDuplicates) {
            // Pular duplicado - não conta como processado
            continue;
          } else if (updateExisting) {
            // Atualizar existente
            const keys = Object.keys(dadosProduto).filter(k => dadosProduto[k] !== null);
            const values = keys.map(k => dadosProduto[k]);
            const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
            
            await pool.query(
              `UPDATE produtos SET ${setClause}, atualizado_em = NOW() WHERE id = $${keys.length + 1}`,
              [...values, produtoExistente.id]
            );
            atualizados++;
          } else {
            // Ambas opções desmarcadas: inserir como novo (cria duplicado)
            const keys = Object.keys(dadosProduto).filter(k => dadosProduto[k] !== null);
            const values = keys.map(k => dadosProduto[k]);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            
            await pool.query(
              `INSERT INTO produtos (${keys.join(', ')}, criado_em) VALUES (${placeholders}, NOW())`,
              values
            );
            inseridos++;
          }
        } else {
          // Inserir novo
          const keys = Object.keys(dadosProduto).filter(k => dadosProduto[k] !== null);
          const values = keys.map(k => dadosProduto[k]);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          
          await pool.query(
            `INSERT INTO produtos (${keys.join(', ')}, criado_em) VALUES (${placeholders}, NOW())`,
            values
          );
          inseridos++;
        }
      } catch (produtoError) {
        console.error('[ImportProdutos] Erro ao processar produto:', produtoError.message);
        erros++;
        errosDetalhes.push(produtoError.message);
      }
    }

    console.log(`[ImportProdutos] Concluído: ${inseridos} inseridos, ${atualizados} atualizados, ${erros} erros, ${invalidos} inválidos`);

    res.json({
      success: true,
      resultado: {
        inseridos,
        atualizados,
        erros,
        invalidos,
        erros_detalhes: errosDetalhes.length > 0 ? errosDetalhes.slice(0, 10) : undefined
      }
    });
  } catch (error) {
    console.error('[ImportProdutos] Erro geral:', error);
    res.status(500).json({ error: error.message || 'Erro ao importar produtos' });
  }
});

// POST /api/functions/import-clientes - Importar clientes em lote
app.post('/api/functions/import-clientes', authenticateToken, async (req, res) => {
  try {
    const { clientes, opcoes } = req.body;
    
    if (!clientes || !Array.isArray(clientes)) {
      return res.status(400).json({ error: 'Array de clientes é obrigatório' });
    }

    const skipDuplicates = opcoes?.skipDuplicates ?? true;
    const updateExisting = opcoes?.updateExisting ?? false;

    // Verificar quais colunas existem na tabela clientes
    const colunasResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'clientes'
    `);
    const colunasExistentes = new Set(colunasResult.rows.map(r => r.column_name));
    console.log('[ImportClientes] Colunas existentes:', Array.from(colunasExistentes));

    let inseridos = 0;
    let atualizados = 0;
    let erros = 0;
    let invalidos = 0;
    const errosDetalhes = [];

    console.log(`[ImportClientes] Processando ${clientes.length} clientes...`);

    for (const cliente of clientes) {
      try {
        // Validar cliente
        if (!cliente.nome) {
          invalidos++;
          continue;
        }

        // Preparar dados - usar nomes de colunas que existem na tabela
        const dadosPossiveis = {
          nome: String(cliente.nome).toUpperCase().substring(0, 255),
          cpf_cnpj: cliente.cpf_cnpj ? String(cliente.cpf_cnpj).substring(0, 20) : null,
          telefone: cliente.telefone ? String(cliente.telefone).substring(0, 50) : null,
          telefone2: cliente.telefone2 ? String(cliente.telefone2).substring(0, 50) : null,
          whatsapp: cliente.whatsapp ? String(cliente.whatsapp).substring(0, 50) : null,
          endereco: cliente.endereco ? String(cliente.endereco).substring(0, 255) : null,
          logradouro: cliente.endereco ? String(cliente.endereco).substring(0, 255) : null,
          numero: cliente.numero ? String(cliente.numero).substring(0, 20) : null,
          complemento: cliente.complemento ? String(cliente.complemento).substring(0, 100) : null,
          bairro: cliente.bairro ? String(cliente.bairro).substring(0, 100) : null,
          cep: cliente.cep ? String(cliente.cep).replace(/\D/g, '').substring(0, 10) : null,
          cidade: cliente.cidade ? String(cliente.cidade).substring(0, 100) : null,
          estado: cliente.estado ? String(cliente.estado).substring(0, 50) : null,
          tipo_pessoa: cliente.tipo_pessoa || 'fisica',
          tipo_cliente: 'cliente',
          situacao: 'ativo',
          codigo_original: cliente.codigo_original ? String(cliente.codigo_original) : null,
        };
        
        // Filtrar apenas colunas que existem na tabela
        const dadosCliente = {};
        for (const [key, value] of Object.entries(dadosPossiveis)) {
          if (colunasExistentes.has(key)) {
            dadosCliente[key] = value;
          }
        }

        // Verificar se cliente já existe (por CPF/CNPJ)
        let clienteExistente = null;
        
        if (cliente.cpf_cnpj) {
          const cpfCnpjLimpo = String(cliente.cpf_cnpj).replace(/\D/g, '');
          if (cpfCnpjLimpo.length > 0) {
            const checkResult = await pool.query(
              'SELECT id FROM clientes WHERE REPLACE(REPLACE(REPLACE(cpf_cnpj, \'.\', \'\'), \'-\', \'\'), \'/\', \'\') = $1 LIMIT 1',
              [cpfCnpjLimpo]
            );
            if (checkResult.rows.length > 0) {
              clienteExistente = checkResult.rows[0];
            }
          }
        }

        if (clienteExistente) {
          if (skipDuplicates) {
            // Pular duplicado
            continue;
          } else if (updateExisting) {
            // Atualizar existente
            const keys = Object.keys(dadosCliente).filter(k => dadosCliente[k] !== null);
            const values = keys.map(k => dadosCliente[k]);
            const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
            
            await pool.query(
              `UPDATE clientes SET ${setClause}, updated_at = NOW() WHERE id = $${keys.length + 1}`,
              [...values, clienteExistente.id]
            );
            atualizados++;
          } else {
            // Inserir como novo (cria duplicado)
            const keys = Object.keys(dadosCliente).filter(k => dadosCliente[k] !== null);
            const values = keys.map(k => dadosCliente[k]);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            
            await pool.query(
              `INSERT INTO clientes (${keys.join(', ')}, created_at) VALUES (${placeholders}, NOW())`,
              values
            );
            inseridos++;
          }
        } else {
          // Inserir novo
          const keys = Object.keys(dadosCliente).filter(k => dadosCliente[k] !== null);
          const values = keys.map(k => dadosCliente[k]);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          
          await pool.query(
            `INSERT INTO clientes (${keys.join(', ')}, created_at) VALUES (${placeholders}, NOW())`,
            values
          );
          inseridos++;
        }
      } catch (clienteError) {
        console.error('[ImportClientes] Erro ao processar cliente:', clienteError.message);
        erros++;
        errosDetalhes.push(clienteError.message);
      }
    }

    console.log(`[ImportClientes] Concluído: ${inseridos} inseridos, ${atualizados} atualizados, ${erros} erros, ${invalidos} inválidos`);

    res.json({
      inseridos,
      atualizados,
      erros,
      invalidos,
      errosDetalhes: errosDetalhes.length > 0 ? errosDetalhes.slice(0, 10) : undefined
    });
  } catch (error) {
    console.error('[ImportClientes] Erro geral:', error);
    res.status(500).json({ error: error.message || 'Erro ao importar clientes' });
  }
});

// ============================================
// ENDPOINT DE BUSCA DE CLIENTES (AUTOCOMPLETE)
// ============================================

// GET /api/clientes/search - Buscar clientes por termo (ILIKE)
app.get('/api/clientes/search', authenticateToken, async (req, res) => {
  try {
    const { q, limit = 15 } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const searchTerm = `%${q}%`;
    const limitNum = Math.min(parseInt(limit) || 15, 50);

    const result = await pool.query(
      `SELECT id, nome, cpf_cnpj, telefone, whatsapp, email, cidade, estado
       FROM clientes 
       WHERE (situacao IS NULL OR situacao != 'inativo')
         AND (
           nome ILIKE $1 
           OR cpf_cnpj ILIKE $1 
           OR telefone ILIKE $1 
           OR whatsapp ILIKE $1
           OR email ILIKE $1
         )
       ORDER BY nome ASC
       LIMIT $2`,
      [searchTerm, limitNum]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('[ClientesSearch] Erro:', error);
    res.status(500).json({ error: error.message || 'Erro ao buscar clientes' });
  }
});

// ============================================
// TELEGRAM BOT FUNCTIONS
// ============================================

// POST /api/functions/telegram-bot - Enviar foto para Telegram
app.post('/api/functions/telegram-bot', authenticateToken, async (req, res) => {
  try {
    const { action, file, fileName, osNumero, tipo, chatId, caption, messageId } = req.body;

    // Ação de deletar mensagem
    if (action === 'delete') {
      if (!chatId || !messageId) {
        return res.status(400).json({ error: 'chatId e messageId são obrigatórios para deletar' });
      }

      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      if (!TELEGRAM_BOT_TOKEN) {
        return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN não configurado' });
      }

      const deleteUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage`;
      const deleteResponse = await fetch(deleteUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
        }),
      });

      const deleteResult = await deleteResponse.json();
      
      if (!deleteResult.ok) {
        return res.status(400).json({ 
          success: false, 
          error: deleteResult.description || 'Erro ao deletar mensagem' 
        });
      }

      return res.json({ success: true });
    }

    // Ação padrão: enviar foto
    if (!file || !osNumero || !tipo || !chatId) {
      return res.status(400).json({ error: 'file, osNumero, tipo e chatId são obrigatórios' });
    }

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!TELEGRAM_BOT_TOKEN) {
      return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN não configurado. Configure no arquivo .env' });
    }

    console.log(`[Telegram] Enviando foto para OS-${osNumero}, tipo: ${tipo}, chat: ${chatId}`);

    // Decodificar base64 para buffer
    const imageBuffer = Buffer.from(file, 'base64');
    
    // Criar FormData para envio multipart
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('photo', imageBuffer, {
      filename: fileName || `os-${osNumero}-${tipo}.jpg`,
      contentType: 'image/jpeg',
    });
    formData.append('caption', caption || `📱 OS-${osNumero}\n📁 Tipo: ${tipo === 'entrada' ? 'Entrada' : tipo === 'saida' ? 'Saída' : 'Processo'}\n📅 ${new Date().toLocaleString('pt-BR')}`);

    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
    
    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    const telegramResult = await telegramResponse.json();

    if (!telegramResult.ok) {
      console.error('[Telegram] Erro na API:', telegramResult);
      return res.status(400).json({ 
        success: false, 
        error: telegramResult.description || 'Erro ao enviar foto para Telegram' 
      });
    }

    const photo = telegramResult.result.photo;
    const largestPhoto = photo[photo.length - 1]; // Pegar a maior resolução
    const smallestPhoto = photo[0]; // Pegar a menor resolução (thumbnail)

    // Obter URL do arquivo
    let fileUrl = null;
    let thumbnailUrl = null;
    
    try {
      // URL do arquivo grande
      const fileResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${largestPhoto.file_id}`);
      const fileData = await fileResponse.json();
      if (fileData.ok) {
        fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`;
      }
      
      // URL do thumbnail
      const thumbResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${smallestPhoto.file_id}`);
      const thumbData = await thumbResponse.json();
      if (thumbData.ok) {
        thumbnailUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${thumbData.result.file_path}`;
      }
    } catch (urlError) {
      console.warn('[Telegram] Não foi possível obter URLs das fotos:', urlError.message);
    }

    console.log(`[Telegram] Foto enviada com sucesso. MessageId: ${telegramResult.result.message_id}`);

    res.json({
      success: true,
      messageId: telegramResult.result.message_id,
      fileId: largestPhoto.file_id,
      fileUrl,
      thumbnailUrl,
    });

  } catch (error) {
    console.error('[Telegram] Erro:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno ao processar requisição do Telegram' 
    });
  }
});

// =====================================================
// MINI CRM - Chat com Leads via AtivaCRM
// =====================================================

// Buscar configuração do AtivaCRM
app.get('/api/ativacrm/config', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, is_active, created_at FROM ativacrm_config LIMIT 1');
    res.json({ data: result.rows[0] || null, hasConfig: result.rows.length > 0 });
  } catch (error) {
    console.error('Erro ao buscar config AtivaCRM:', error);
    res.status(500).json({ error: 'Erro ao buscar configuração' });
  }
});

// Salvar configuração do AtivaCRM
app.post('/api/ativacrm/config', authenticateToken, async (req, res) => {
  const { api_token, webhook_secret } = req.body;
  
  try {
    // Verificar se já existe configuração
    const existing = await pool.query('SELECT id FROM ativacrm_config LIMIT 1');
    
    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE ativacrm_config SET api_token = $1, webhook_secret = $2, updated_at = NOW() WHERE id = $3',
        [api_token, webhook_secret, existing.rows[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO ativacrm_config (api_token, webhook_secret) VALUES ($1, $2)',
        [api_token, webhook_secret]
      );
    }
    
    res.json({ success: true, message: 'Configuração salva com sucesso' });
  } catch (error) {
    console.error('Erro ao salvar config AtivaCRM:', error);
    res.status(500).json({ error: 'Erro ao salvar configuração' });
  }
});

// Buscar mensagens de um lead
app.get('/api/leads/:leadId/messages', authenticateToken, async (req, res) => {
  const { leadId } = req.params;
  const { limit = 50, offset = 0 } = req.query;
  
  try {
    const result = await pool.query(
      `SELECT * FROM lead_messages 
       WHERE lead_id = $1 
       ORDER BY created_at ASC 
       LIMIT $2 OFFSET $3`,
      [leadId, limit, offset]
    );
    
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM lead_messages WHERE lead_id = $1',
      [leadId]
    );
    
    res.json({ 
      data: result.rows, 
      total: parseInt(countResult.rows[0].total),
      hasMore: result.rows.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
});

// Enviar mensagem para um lead via AtivaCRM
app.post('/api/leads/:leadId/messages/send', authenticateToken, async (req, res) => {
  const { leadId } = req.params;
  const { body, media_url } = req.body;
  
  try {
    // Buscar lead para pegar o número
    const leadResult = await pool.query('SELECT * FROM leads WHERE id = $1', [leadId]);
    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }
    
    const lead = leadResult.rows[0];
    const phoneNumber = lead.whatsapp || lead.telefone;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Lead não possui número de telefone' });
    }
    
    // Buscar token do AtivaCRM
    const configResult = await pool.query('SELECT api_token FROM ativacrm_config WHERE is_active = true LIMIT 1');
    if (configResult.rows.length === 0) {
      return res.status(400).json({ error: 'AtivaCRM não configurado' });
    }
    
    const apiToken = configResult.rows[0].api_token;
    
    // Limpar número (apenas dígitos)
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Enviar mensagem via AtivaCRM
    console.log(`[AtivaCRM] Enviando mensagem para ${cleanNumber}`);
    
    const ativaCrmPayload = media_url 
      ? { number: cleanNumber, body, url: media_url }
      : { number: cleanNumber, body };
    
    const ativaCrmResponse = await fetch('https://api.ativacrm.com/api/messages/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify(ativaCrmPayload)
    });
    
    const ativaCrmResult = await ativaCrmResponse.json();
    
    if (!ativaCrmResponse.ok) {
      console.error('[AtivaCRM] Erro ao enviar:', ativaCrmResult);
      return res.status(500).json({ error: 'Erro ao enviar mensagem via AtivaCRM', details: ativaCrmResult });
    }
    
    console.log('[AtivaCRM] Mensagem enviada:', ativaCrmResult);
    
    // Salvar mensagem no banco
    const messageResult = await pool.query(
      `INSERT INTO lead_messages (lead_id, direction, message_type, body, media_url, status, sender_name)
       VALUES ($1, 'outbound', $2, $3, $4, 'sent', $5)
       RETURNING *`,
      [leadId, media_url ? 'image' : 'text', body, media_url, req.user.email]
    );
    
    // Atualizar última interação do lead
    await pool.query(
      'UPDATE leads SET total_interacoes = COALESCE(total_interacoes, 0) + 1, updated_at = NOW() WHERE id = $1',
      [leadId]
    );
    
    res.json({ 
      success: true, 
      message: messageResult.rows[0],
      ativacrm: ativaCrmResult
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

// Buscar conversas recentes (leads com mensagens)
app.get('/api/leads/conversations', authenticateToken, async (req, res) => {
  const { limit = 20 } = req.query;
  
  try {
    const result = await pool.query(`
      SELECT 
        l.*,
        lm.last_message,
        lm.last_message_at,
        lm.unread_count,
        lm.last_direction
      FROM leads l
      INNER JOIN (
        SELECT 
          lead_id,
          MAX(body) FILTER (WHERE created_at = max_created) as last_message,
          MAX(created_at) as last_message_at,
          COUNT(*) FILTER (WHERE direction = 'inbound' AND status != 'read') as unread_count,
          MAX(direction) FILTER (WHERE created_at = max_created) as last_direction
        FROM (
          SELECT *, MAX(created_at) OVER (PARTITION BY lead_id) as max_created
          FROM lead_messages
        ) sub
        GROUP BY lead_id
      ) lm ON l.id = lm.lead_id
      ORDER BY lm.last_message_at DESC
      LIMIT $1
    `, [limit]);
    
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    // Se a query complexa falhar, tentar uma mais simples
    try {
      const simpleResult = await pool.query(`
        SELECT DISTINCT ON (l.id)
          l.*,
          lm.body as last_message,
          lm.created_at as last_message_at,
          lm.direction as last_direction
        FROM leads l
        INNER JOIN lead_messages lm ON l.id = lm.lead_id
        ORDER BY l.id, lm.created_at DESC
        LIMIT $1
      `, [limit]);
      
      res.json({ data: simpleResult.rows });
    } catch (simpleError) {
      res.status(500).json({ error: 'Erro ao buscar conversas' });
    }
  }
});

// Marcar mensagens como lidas
app.post('/api/leads/:leadId/messages/read', authenticateToken, async (req, res) => {
  const { leadId } = req.params;
  
  try {
    await pool.query(
      `UPDATE lead_messages SET status = 'read' WHERE lead_id = $1 AND direction = 'inbound' AND status != 'read'`,
      [leadId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao marcar como lido:', error);
    res.status(500).json({ error: 'Erro ao marcar como lido' });
  }
});

// Apagar uma mensagem específica
app.delete('/api/leads/:leadId/messages/:messageId', authenticateToken, async (req, res) => {
  const { leadId, messageId } = req.params;
  
  try {
    await pool.query(
      `DELETE FROM lead_messages WHERE id = $1 AND lead_id = $2`,
      [messageId, leadId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao apagar mensagem:', error);
    res.status(500).json({ error: 'Erro ao apagar mensagem' });
  }
});

// Apagar todas as mensagens de um lead (limpar conversa)
app.delete('/api/leads/:leadId/messages', authenticateToken, async (req, res) => {
  const { leadId } = req.params;
  
  try {
    await pool.query(
      `DELETE FROM lead_messages WHERE lead_id = $1`,
      [leadId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao apagar conversa:', error);
    res.status(500).json({ error: 'Erro ao apagar conversa' });
  }
});

// Atualizar status do lead (ganho/perdido)
app.patch('/api/leads/:leadId/status', authenticateToken, async (req, res) => {
  const { leadId } = req.params;
  const { status, temperatura } = req.body;
  
  try {
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (status) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
      
      // Se convertido, marcar como tal
      if (status === 'convertido') {
        updates.push(`convertido = true`);
      }
    }
    
    if (temperatura) {
      updates.push(`temperatura = $${paramIndex}`);
      values.push(temperatura);
      paramIndex++;
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(leadId);
    
    await pool.query(
      `UPDATE leads SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// =====================================================
// WEBHOOK TEST - Sistema de Teste em Tempo Real
// =====================================================

// Armazenamento em memória para eventos de teste (expira em 30 min)
const webhookTestSessions = new Map();

// Limpar sessões antigas a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of webhookTestSessions.entries()) {
    if (now - session.createdAt > 30 * 60 * 1000) { // 30 minutos
      webhookTestSessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000);

// Criar sessão de teste (autenticado)
app.post('/api/webhook/test/session', authenticateToken, async (req, res) => {
  const sessionId = crypto.randomUUID();
  webhookTestSessions.set(sessionId, {
    createdAt: Date.now(),
    events: [],
    userId: req.user.id
  });
  
  const testUrl = `${process.env.STORAGE_BASE_URL?.replace('/uploads', '') || 'https://api.primecamp.cloud'}/api/webhook/test/${sessionId}`;
  
  res.json({ 
    success: true, 
    sessionId,
    testUrl,
    expiresIn: '30 minutos'
  });
});

// Receber webhook de teste (público)
app.post('/api/webhook/test/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const payload = req.body;
  
  console.log(`[Webhook Test] Sessão: ${sessionId}`);
  console.log(`[Webhook Test] Payload:`, JSON.stringify(payload, null, 2));
  
  const session = webhookTestSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ 
      success: false, 
      error: 'Sessão de teste não encontrada ou expirada' 
    });
  }
  
  // Adicionar evento
  session.events.push({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    payload,
    headers: {
      'content-type': req.get('content-type'),
      'user-agent': req.get('user-agent'),
      'x-real-ip': req.get('x-real-ip') || req.ip
    }
  });
  
  // Manter apenas os últimos 50 eventos
  if (session.events.length > 50) {
    session.events = session.events.slice(-50);
  }
  
  res.json({ success: true, message: 'Evento recebido' });
});

// Buscar eventos de teste (autenticado)
app.get('/api/webhook/test/:sessionId/events', authenticateToken, (req, res) => {
  const { sessionId } = req.params;
  const { since } = req.query; // timestamp para buscar apenas novos eventos
  
  const session = webhookTestSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ 
      success: false, 
      error: 'Sessão de teste não encontrada ou expirada' 
    });
  }
  
  let events = session.events;
  
  // Filtrar eventos desde um timestamp específico
  if (since) {
    events = events.filter(e => new Date(e.timestamp) > new Date(since));
  }
  
  res.json({ 
    success: true, 
    events,
    totalEvents: session.events.length,
    sessionCreatedAt: new Date(session.createdAt).toISOString()
  });
});

// Encerrar sessão de teste
app.delete('/api/webhook/test/:sessionId', authenticateToken, (req, res) => {
  const { sessionId } = req.params;
  
  if (webhookTestSessions.has(sessionId)) {
    webhookTestSessions.delete(sessionId);
    res.json({ success: true, message: 'Sessão encerrada' });
  } else {
    res.status(404).json({ success: false, error: 'Sessão não encontrada' });
  }
});

// =====================================================
// WEBHOOK - Receber Leads de Fontes Externas (AtivaCRM, etc)
// =====================================================

// Endpoint público para receber webhooks (não requer autenticação)
app.post('/api/webhook/leads/:webhookKey', async (req, res) => {
  const { webhookKey } = req.params;
  const payload = req.body;
  
  console.log(`[Webhook] Recebendo lead via webhook key: ${webhookKey}`);
  console.log(`[Webhook] Payload:`, JSON.stringify(payload, null, 2));

  try {
    // Verificar se o webhook está ativo
    const webhookResult = await pool.query(
      `SELECT * FROM webhook_configs WHERE webhook_key = $1 AND is_active = true`,
      [webhookKey]
    );

    if (webhookResult.rows.length === 0) {
      console.log(`[Webhook] Webhook key não encontrada ou inativa: ${webhookKey}`);
      return res.status(404).json({ success: false, error: 'Webhook não encontrado ou inativo' });
    }

    const webhook = webhookResult.rows[0];
    
    // Mapear campos do payload para os campos do lead
    // Suporta vários formatos: CRM, Elementor, AtivaCRM, etc.
    // Detectar formato do payload
    const isAtivaCRMTicket = payload.ticket && payload.contact;
    
    let leadData;
    
    if (isAtivaCRMTicket) {
      // Formato AtivaCRM - Ticket de WhatsApp
      console.log('[Webhook] Formato detectado: AtivaCRM WhatsApp Ticket');
      const contact = payload.contact || {};
      const rawMessage = payload.rawMessage?.Info || {};
      const messages = payload.messages || [];
      const lastMessage = messages[0]?.body || payload.ticket?.lastMessage || '';
      
      leadData = {
        nome: contact.name || rawMessage.PushName || 'Lead WhatsApp',
        email: contact.email || null,
        telefone: contact.number || rawMessage.Sender || null,
        whatsapp: contact.number || rawMessage.Sender || null,
        cidade: null,
        estado: null,
        fonte: 'webhook',
        webhook_id: webhook.id,
        webhook_nome: webhook.nome,
        utm_source: 'ativacrm_whatsapp',
        utm_medium: payload.ticket?.queueName || null,
        utm_campaign: payload.company?.name || null,
        utm_term: null,
        utm_content: payload.ticket?.id?.toString() || null,
        interesse: null,
        observacoes: lastMessage ? `Mensagem: ${lastMessage}` : null,
        status: 'novo',
        temperatura: 'quente', // WhatsApp = lead mais quente
        convertido: false,
        total_interacoes: 1,
        raw_payload: JSON.stringify(payload),
      };
    } else {
      // Formato padrão (Elementor, formulários, etc.)
      console.log('[Webhook] Formato detectado: Formulário padrão');
      leadData = {
        nome: payload.nome || payload.name || payload.full_name || payload.lead_name || payload.Nome || payload['Nome:'] || payload['Nome'] || 'Lead sem nome',
        email: payload.email || payload.Email || payload.e_mail || payload['E-mail:'] || payload['E-mail'] || payload['email:'] || null,
        telefone: payload.telefone || payload.phone || payload.tel || payload.Telefone || payload['DDD + Telefone:'] || payload['Telefone:'] || payload['Celular:'] || payload['WhatsApp:'] || null,
        whatsapp: payload.whatsapp || payload.whats || payload.celular || payload.mobile || payload.Whatsapp || payload['WhatsApp:'] || payload['Celular:'] || payload['DDD + Telefone:'] || payload.telefone || null,
        cidade: payload.cidade || payload.city || payload.Cidade || payload['Cidade:'] || null,
        estado: payload.estado || payload.state || payload.uf || payload.Estado || payload['Estado:'] || payload['UF:'] || null,
        fonte: 'webhook',
        webhook_id: webhook.id,
        webhook_nome: webhook.nome,
        utm_source: payload.utm_source || payload.source || payload['URL da página'] || webhook.fonte_padrao || null,
        utm_medium: payload.utm_medium || payload.medium || payload.form_name || null,
        utm_campaign: payload.utm_campaign || payload.campaign || payload.campanha || payload['Campanha:'] || null,
        utm_term: payload.utm_term || payload.keyword || payload.palavra_chave || payload['Palavra-chave:'] || null,
        utm_content: payload.utm_content || payload.form_id || null,
        interesse: payload.interesse || payload.interest || payload.produto || payload.servico || payload['Interesse:'] || payload['Serviço:'] || payload['Produto:'] || null,
        observacoes: payload.observacoes || payload.obs || payload.notes || payload.mensagem || payload.message || payload['Mensagem:'] || payload['Observações:'] || null,
        status: 'novo',
        temperatura: 'frio',
        convertido: false,
        total_interacoes: 0,
        raw_payload: JSON.stringify(payload),
      };
    }

    // Verificar se o lead já existe pelo telefone/whatsapp
    const phoneNumber = leadData.whatsapp || leadData.telefone;
    let leadId = null;
    let isNewLead = false;
    
    if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const existingLead = await pool.query(
        `SELECT id FROM leads WHERE 
         REPLACE(REPLACE(REPLACE(whatsapp, '+', ''), '-', ''), ' ', '') = $1 OR
         REPLACE(REPLACE(REPLACE(telefone, '+', ''), '-', ''), ' ', '') = $1
         LIMIT 1`,
        [cleanPhone]
      );
      
      if (existingLead.rows.length > 0) {
        leadId = existingLead.rows[0].id;
        console.log(`[Webhook] Lead já existe. ID: ${leadId}`);
        
        // Atualizar dados do lead existente (exceto status e temperatura para não sobrescrever)
        await pool.query(
          `UPDATE leads SET 
            nome = COALESCE(NULLIF($1, ''), nome),
            email = COALESCE(NULLIF($2, ''), email),
            total_interacoes = COALESCE(total_interacoes, 0) + 1,
            updated_at = NOW()
          WHERE id = $3`,
          [leadData.nome, leadData.email, leadId]
        );
      }
    }
    
    // Se não encontrou lead existente, criar novo
    if (!leadId) {
      isNewLead = true;
      const insertResult = await pool.query(
        `INSERT INTO leads (
          nome, email, telefone, whatsapp, cidade, estado,
          fonte, webhook_id, webhook_nome, 
          utm_source, utm_medium, utm_campaign, utm_term, utm_content,
          interesse, observacoes, status, temperatura, convertido, total_interacoes, raw_payload
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING id`,
        [
          leadData.nome, leadData.email, leadData.telefone, leadData.whatsapp,
          leadData.cidade, leadData.estado, leadData.fonte, leadData.webhook_id,
          leadData.webhook_nome, leadData.utm_source, leadData.utm_medium,
          leadData.utm_campaign, leadData.utm_term, leadData.utm_content,
          leadData.interesse, leadData.observacoes, leadData.status,
          leadData.temperatura, leadData.convertido, leadData.total_interacoes,
          leadData.raw_payload
        ]
      );
      leadId = insertResult.rows[0].id;
    }

    // Atualizar contador de leads recebidos no webhook (apenas para novos leads)
    if (isNewLead) {
      await pool.query(
        `UPDATE webhook_configs SET leads_recebidos = COALESCE(leads_recebidos, 0) + 1, ultimo_lead_em = NOW() WHERE id = $1`,
        [webhook.id]
      );
    }

    // Registrar log do webhook
    await pool.query(
      `INSERT INTO webhook_logs (webhook_id, tipo, payload, lead_id, ip_origem) VALUES ($1, $2, $3, $4, $5)`,
      [webhook.id, 'lead_recebido', JSON.stringify(payload), leadId, req.ip]
    );

    console.log(`[Webhook] Lead ${isNewLead ? 'criado' : 'atualizado'} com sucesso. ID: ${leadId}`);

    // Se for um webhook do AtivaCRM com mensagem, salvar na tabela de mensagens
    if (isAtivaCRMTicket && leadData.observacoes) {
      try {
        const messageBody = leadData.observacoes.replace('Mensagem: ', '');
        const externalMessageId = payload.messages?.[0]?.id || null;
        
        // Verificar se a mensagem já existe pelo external_id
        if (externalMessageId) {
          const existingMsg = await pool.query(
            `SELECT id FROM lead_messages WHERE external_id = $1 LIMIT 1`,
            [externalMessageId]
          );
          
          if (existingMsg.rows.length > 0) {
            console.log(`[Webhook] Mensagem já existe. External ID: ${externalMessageId}`);
          } else {
            await pool.query(
              `INSERT INTO lead_messages (lead_id, direction, message_type, body, sender_name, sender_number, external_id, metadata)
               VALUES ($1, 'inbound', 'text', $2, $3, $4, $5, $6)`,
              [
                leadId, 
                messageBody,
                payload.contact?.name || 'Desconhecido',
                payload.contact?.number || null,
                externalMessageId,
                JSON.stringify({
                  ticket_id: payload.ticket?.id,
                  queue_name: payload.ticket?.queueName
                })
              ]
            );
            console.log(`[Webhook] Mensagem salva para lead ${leadId}`);
          }
        } else {
          // Sem external_id, verificar por body + lead_id + timestamp recente (evitar duplicatas)
          const recentMsg = await pool.query(
            `SELECT id FROM lead_messages 
             WHERE lead_id = $1 AND body = $2 AND created_at > NOW() - INTERVAL '1 minute'
             LIMIT 1`,
            [leadId, messageBody]
          );
          
          if (recentMsg.rows.length === 0) {
            await pool.query(
              `INSERT INTO lead_messages (lead_id, direction, message_type, body, sender_name, sender_number, metadata)
               VALUES ($1, 'inbound', 'text', $2, $3, $4, $5)`,
              [
                leadId, 
                messageBody,
                payload.contact?.name || 'Desconhecido',
                payload.contact?.number || null,
                JSON.stringify({
                  ticket_id: payload.ticket?.id,
                  queue_name: payload.ticket?.queueName
                })
              ]
            );
            console.log(`[Webhook] Mensagem salva para lead ${leadId}`);
          } else {
            console.log(`[Webhook] Mensagem duplicada ignorada para lead ${leadId}`);
          }
        }
      } catch (msgError) {
        console.error('[Webhook] Erro ao salvar mensagem:', msgError);
        // Não falhar o webhook por erro na mensagem
      }
    }

    res.json({ 
      success: true, 
      message: isNewLead ? 'Lead recebido com sucesso' : 'Mensagem adicionada ao lead existente',
      lead_id: leadId,
      is_new_lead: isNewLead
    });

  } catch (error) {
    console.error('[Webhook] Erro ao processar lead:', error);
    
    // Tentar registrar o erro no log
    try {
      const webhookResult = await pool.query(
        `SELECT id FROM webhook_configs WHERE webhook_key = $1`,
        [webhookKey]
      );
      if (webhookResult.rows.length > 0) {
        await pool.query(
          `INSERT INTO webhook_logs (webhook_id, tipo, payload, erro, ip_origem) VALUES ($1, $2, $3, $4, $5)`,
          [webhookResult.rows[0].id, 'erro', JSON.stringify(payload), error.message, req.ip]
        );
      }
    } catch (logError) {
      console.error('[Webhook] Erro ao registrar log:', logError);
    }

    res.status(500).json({ 
      success: false, 
      error: 'Erro ao processar lead',
      details: error.message 
    });
  }
});

// GET - Listar webhooks configurados (autenticado)
app.get('/api/webhook/configs', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM webhook_configs ORDER BY created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Webhook] Erro ao listar configs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Criar novo webhook (autenticado)
app.post('/api/webhook/configs', authenticateToken, async (req, res) => {
  try {
    const { nome, fonte_padrao, descricao } = req.body;
    
    // Gerar chave única para o webhook
    const crypto = await import('crypto');
    const webhookKey = crypto.randomBytes(16).toString('hex');
    
    const result = await pool.query(
      `INSERT INTO webhook_configs (nome, webhook_key, fonte_padrao, descricao, is_active, created_by)
       VALUES ($1, $2, $3, $4, true, $5)
       RETURNING *`,
      [nome, webhookKey, fonte_padrao || 'webhook', descricao, req.user.id]
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Webhook] Erro ao criar config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Atualizar webhook (autenticado)
app.put('/api/webhook/configs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, fonte_padrao, descricao, is_active } = req.body;
    
    const result = await pool.query(
      `UPDATE webhook_configs 
       SET nome = COALESCE($1, nome), 
           fonte_padrao = COALESCE($2, fonte_padrao), 
           descricao = COALESCE($3, descricao),
           is_active = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [nome, fonte_padrao, descricao, is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Webhook não encontrado' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Webhook] Erro ao atualizar config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Excluir webhook (autenticado)
app.delete('/api/webhook/configs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query(`DELETE FROM webhook_configs WHERE id = $1`, [id]);
    
    res.json({ success: true, message: 'Webhook excluído' });
  } catch (error) {
    console.error('[Webhook] Erro ao excluir config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Logs do webhook (autenticado)
app.get('/api/webhook/logs/:webhookId', authenticateToken, async (req, res) => {
  try {
    const { webhookId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const result = await pool.query(
      `SELECT * FROM webhook_logs WHERE webhook_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [webhookId, limit]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Webhook] Erro ao buscar logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// API PÚBLICA - ENDPOINTS PARA INTEGRAÇÃO EXTERNA (Agentes IA, Sistemas, etc)
// ═══════════════════════════════════════════════════════════════════════════════

// Middleware para validar API Token
const validateApiToken = async (req, res, next) => {
  console.log('[API Token Validation] Middleware chamado para:', req.method, req.path);
  try {
    const authHeader = req.headers.authorization;
    console.log('[API Token Validation] Header authorization recebido:', authHeader ? 'SIM' : 'NÃO');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token de API não fornecido',
        message: 'Inclua o header Authorization: Bearer <seu_token>'
      });
    }
    
    const token = authHeader.substring(7).trim();
    console.log('[API Token Validation] Validando token:', token.substring(0, 20) + '...');
    console.log('[API Token Validation] Tamanho do token:', token.length);
    
    // Buscar token no banco (primeiro sem filtro de ativo para debug)
    const resultAll = await pool.query(
      `SELECT id, nome, token, ativo, expires_at FROM api_tokens WHERE token = $1`,
      [token]
    );
    
    console.log('[API Token Validation] Token encontrado no banco:', resultAll.rows.length > 0);
    if (resultAll.rows.length > 0) {
      console.log('[API Token Validation] Status do token:', {
        nome: resultAll.rows[0].nome,
        ativo: resultAll.rows[0].ativo,
        expires_at: resultAll.rows[0].expires_at
      });
    }
    
    // Buscar token no banco (com filtro de ativo)
    const result = await pool.query(
      `SELECT * FROM api_tokens WHERE token = $1 AND ativo = true`,
      [token]
    );
    
    if (result.rows.length === 0) {
      console.log('[API Token Validation] Token não encontrado ou inativo');
      return res.status(401).json({ 
        success: false, 
        error: 'Token de API inválido ou inativo'
      });
    }
    
    const apiToken = result.rows[0];
    
    // Verificar se expirou
    if (apiToken.expires_at && new Date(apiToken.expires_at) < new Date()) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token de API expirado'
      });
    }
    
    // Atualizar último uso
    await pool.query(
      `UPDATE api_tokens SET ultimo_uso = NOW(), uso_count = uso_count + 1 WHERE id = $1`,
      [apiToken.id]
    );
    
    // Interceptar resposta para salvar no log
    const originalJson = res.json.bind(res);
    res.json = function(body) {
      // Salvar log com resposta (assíncrono, não bloqueia resposta)
      pool.query(
        `INSERT INTO api_access_logs (token_id, endpoint, method, ip_address, user_agent, query_params, response_status, response_body)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          apiToken.id, 
          req.path, 
          req.method, 
          req.ip, 
          req.headers['user-agent'], 
          JSON.stringify(req.query),
          res.statusCode,
          JSON.stringify(body).substring(0, 5000) // Limitar a 5000 caracteres
        ]
      ).catch(err => console.error('[API Log] Erro ao salvar log:', err));
      
      return originalJson(body);
    };
    
    req.apiToken = apiToken;
    next();
  } catch (error) {
    console.error('[API] Erro ao validar token:', error);
    res.status(500).json({ success: false, error: 'Erro interno ao validar token' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GESTÃO DE TOKENS (autenticado - apenas admins)
// ═══════════════════════════════════════════════════════════════════════════════

// Criar tabelas se não existirem
const initApiTables = async () => {
  try {
    console.log('[API Tables] Iniciando criação de tabelas...');
    
    // Verificar se tabela users existe
    const usersCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'users'
      );
    `);
    
    if (!usersCheck.rows[0].exists) {
      console.error('[API Tables] ❌ ERRO: Tabela users não existe! Execute CRIAR_TABELAS_API_TOKENS.sql primeiro.');
      return;
    }
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        token VARCHAR(64) UNIQUE NOT NULL,
        permissoes JSONB DEFAULT '["produtos:read"]'::jsonb,
        ativo BOOLEAN DEFAULT true,
        expires_at TIMESTAMP,
        ultimo_uso TIMESTAMP,
        uso_count INTEGER DEFAULT 0,
        criado_por UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS api_access_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token_id UUID REFERENCES api_tokens(id) ON DELETE CASCADE,
        endpoint VARCHAR(255),
        method VARCHAR(10),
        ip_address VARCHAR(45),
        user_agent TEXT,
        query_params JSONB,
        response_status INTEGER,
        response_body TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      -- Adicionar coluna response_body se não existir (para tabelas já criadas)
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'api_access_logs' AND column_name = 'response_body'
        ) THEN
          ALTER TABLE api_access_logs ADD COLUMN response_body TEXT;
        END IF;
      END $$;
      
      CREATE INDEX IF NOT EXISTS idx_api_tokens_token ON api_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_api_tokens_ativo ON api_tokens(ativo);
      CREATE INDEX IF NOT EXISTS idx_api_tokens_criado_por ON api_tokens(criado_por);
      CREATE INDEX IF NOT EXISTS idx_api_access_logs_token_id ON api_access_logs(token_id);
      CREATE INDEX IF NOT EXISTS idx_api_access_logs_created_at ON api_access_logs(created_at);
    `);
    
    // Verificar se as tabelas foram criadas
    const tokensCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'api_tokens'
      );
    `);
    
    const logsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'api_access_logs'
      );
    `);
    
    if (tokensCheck.rows[0].exists && logsCheck.rows[0].exists) {
      console.log('✅ Tabelas de API inicializadas com sucesso');
    } else {
      console.error('[API Tables] ❌ ERRO: Tabelas não foram criadas corretamente!');
      console.error('[API Tables] api_tokens existe:', tokensCheck.rows[0].exists);
      console.error('[API Tables] api_access_logs existe:', logsCheck.rows[0].exists);
    }
  } catch (error) {
    console.error('[API Tables] ❌ ERRO ao inicializar tabelas de API:', error);
    console.error('[API Tables] Detalhes:', error.message);
    console.error('[API Tables] Stack:', error.stack);
  }
};
initApiTables();

// GET - Listar tokens (autenticado)
app.get('/api/api-tokens', authenticateToken, async (req, res) => {
  try {
    console.log('[API Tokens] GET /api/api-tokens - Usuário:', req.user?.id);
    const result = await pool.query(`
      SELECT id, nome, descricao, token, permissoes, ativo, expires_at, ultimo_uso, uso_count, created_at
      FROM api_tokens 
      ORDER BY created_at DESC
    `);
    console.log('[API Tokens] Tokens encontrados:', result.rows.length);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[API Tokens] Erro ao listar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Criar token (autenticado)
app.post('/api/api-tokens', authenticateToken, async (req, res) => {
  try {
    console.log('[API Tokens] POST /api/api-tokens - Usuário:', req.user?.id, 'Body:', req.body);
    const { nome, descricao, permissoes, expires_at } = req.body;
    
    if (!nome) {
      return res.status(400).json({ success: false, error: 'Nome é obrigatório' });
    }
    
    // Gerar token seguro
    const token = crypto.randomBytes(32).toString('hex');
    
    const result = await pool.query(`
      INSERT INTO api_tokens (nome, descricao, token, permissoes, expires_at, criado_por)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [nome, descricao, token, JSON.stringify(permissoes || ['produtos:read']), expires_at, req.user.id]);
    
    console.log('[API Tokens] Token criado com sucesso:', result.rows[0].id);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[API Tokens] Erro ao criar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Atualizar token (autenticado)
app.put('/api/api-tokens/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, permissoes, ativo, expires_at } = req.body;
    
    const result = await pool.query(`
      UPDATE api_tokens 
      SET nome = COALESCE($1, nome), 
          descricao = COALESCE($2, descricao), 
          permissoes = COALESCE($3, permissoes),
          ativo = COALESCE($4, ativo),
          expires_at = $5,
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [nome, descricao, permissoes ? JSON.stringify(permissoes) : null, ativo, expires_at, id]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[API Tokens] Erro ao atualizar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Excluir token (autenticado)
app.delete('/api/api-tokens/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM api_tokens WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Token excluído' });
  } catch (error) {
    console.error('[API Tokens] Erro ao excluir:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Logs de acesso de um token (autenticado)
app.get('/api/api-tokens/:id/logs', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    const result = await pool.query(`
      SELECT * FROM api_access_logs 
      WHERE token_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `, [id, limit]);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[API Tokens] Erro ao buscar logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINTS PÚBLICOS (com API Token)
// ═══════════════════════════════════════════════════════════════════════════════

// GET - Buscar produtos (API pública)
app.get('/api/v1/produtos', validateApiToken, async (req, res) => {
  try {
    const { 
      busca, 
      modelo, 
      marca, 
      grupo,
      codigo,
      referencia,
      codigo_barras,
      localizacao,
      estoque_min,
      estoque_max,
      preco_min,
      preco_max,
      ativo,
      limit = 50, 
      offset = 0,
      ordenar = 'descricao',
      ordem = 'asc'
    } = req.query;
    
    let query = `
      SELECT 
        p.id,
        p.nome,
        COALESCE(p.valor_dinheiro_pix, 0) as valor_dinheiro_pix,
        COALESCE(p.valor_parcelado_6x, 0) as valor_parcelado_6x
      FROM produtos p
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    // Filtros
    if (busca) {
      query += ` AND (
        p.nome ILIKE $${paramIndex} OR 
        p.referencia ILIKE $${paramIndex} OR
        p.modelo ILIKE $${paramIndex}
      )`;
      params.push(`%${busca}%`);
      paramIndex++;
    }
    
    if (modelo) {
      query += ` AND (p.modelo ILIKE $${paramIndex} OR p.nome ILIKE $${paramIndex})`;
      params.push(`%${modelo}%`);
      paramIndex++;
    }
    
    if (marca) {
      query += ` AND p.marca ILIKE $${paramIndex}`;
      params.push(`%${marca}%`);
      paramIndex++;
    }
    
    if (grupo) {
      query += ` AND p.grupo ILIKE $${paramIndex}`;
      params.push(`%${grupo}%`);
      paramIndex++;
    }
    
    if (codigo) {
      query += ` AND p.codigo::text = $${paramIndex}`;
      params.push(codigo);
      paramIndex++;
    }
    
    if (referencia) {
      query += ` AND p.referencia ILIKE $${paramIndex}`;
      params.push(`%${referencia}%`);
      paramIndex++;
    }
    
    if (codigo_barras) {
      query += ` AND p.codigo_barras = $${paramIndex}`;
      params.push(codigo_barras);
      paramIndex++;
    }
    
    if (localizacao) {
      query += ` AND p.localizacao ILIKE $${paramIndex}`;
      params.push(`%${localizacao}%`);
      paramIndex++;
    }
    
    if (estoque_min !== undefined) {
      query += ` AND COALESCE(p.quantidade, 0) >= $${paramIndex}`;
      params.push(parseInt(estoque_min));
      paramIndex++;
    }
    
    if (estoque_max !== undefined) {
      query += ` AND COALESCE(p.quantidade, 0) <= $${paramIndex}`;
      params.push(parseInt(estoque_max));
      paramIndex++;
    }
    
    if (preco_min !== undefined) {
      query += ` AND COALESCE(p.valor_dinheiro_pix, 0) >= $${paramIndex}`;
      params.push(parseFloat(preco_min));
      paramIndex++;
    }
    
    if (preco_max !== undefined) {
      query += ` AND COALESCE(p.valor_dinheiro_pix, 0) <= $${paramIndex}`;
      params.push(parseFloat(preco_max));
      paramIndex++;
    }
    
    if (ativo !== undefined) {
      const ativoValue = ativo === 'true' || ativo === true;
      query += ` AND (p.situacao = $${paramIndex} OR UPPER(p.situacao) = $${paramIndex + 1})`;
      params.push(ativoValue ? 'ativo' : 'inativo', ativoValue ? 'ATIVO' : 'INATIVO');
      paramIndex += 2;
    }
    
    // Ordenação
    const ordenarCampos = ['nome', 'codigo', 'quantidade'];
    const ordemValida = ['asc', 'desc'];
    let campoOrdenar = ordenarCampos.includes(ordenar) ? ordenar : 'nome';
    // Mapear 'descricao' para 'nome' para compatibilidade
    if (campoOrdenar === 'descricao') campoOrdenar = 'nome';
    // Mapear 'preco_venda' para usar valor_dinheiro_pix
    let campoReal;
    if (campoOrdenar === 'preco_venda') {
      campoReal = 'COALESCE(p.valor_dinheiro_pix, 0)';
    } else {
      campoReal = `p.${campoOrdenar}`;
    }
    const direcao = ordemValida.includes(ordem.toLowerCase()) ? ordem.toUpperCase() : 'ASC';
    
    query += ` ORDER BY ${campoReal} ${direcao}`;
    
    // Paginação
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));
    
    // Executar query
    const result = await pool.query(query, params);
    
    // Construir query de count com os mesmos filtros
    let countQuery = `SELECT COUNT(*) FROM produtos p WHERE 1=1`;
    const countParams = [];
    let countParamIndex = 1;
    
    // Aplicar os mesmos filtros da query principal
    if (busca) {
      countQuery += ` AND (p.nome ILIKE $${countParamIndex} OR p.referencia ILIKE $${countParamIndex} OR p.modelo ILIKE $${countParamIndex})`;
      countParams.push(`%${busca}%`);
      countParamIndex++;
    }
    if (modelo) {
      countQuery += ` AND (p.modelo ILIKE $${countParamIndex} OR p.nome ILIKE $${countParamIndex})`;
      countParams.push(`%${modelo}%`);
      countParamIndex++;
    }
    if (marca) {
      countQuery += ` AND p.marca ILIKE $${countParamIndex}`;
      countParams.push(`%${marca}%`);
      countParamIndex++;
    }
    if (grupo) {
      countQuery += ` AND p.grupo ILIKE $${countParamIndex}`;
      countParams.push(`%${grupo}%`);
      countParamIndex++;
    }
    if (codigo) {
      countQuery += ` AND p.codigo::text = $${countParamIndex}`;
      countParams.push(codigo);
      countParamIndex++;
    }
    if (referencia) {
      countQuery += ` AND p.referencia ILIKE $${countParamIndex}`;
      countParams.push(`%${referencia}%`);
      countParamIndex++;
    }
    if (codigo_barras) {
      countQuery += ` AND p.codigo_barras = $${countParamIndex}`;
      countParams.push(codigo_barras);
      countParamIndex++;
    }
    if (localizacao) {
      countQuery += ` AND p.localizacao ILIKE $${countParamIndex}`;
      countParams.push(`%${localizacao}%`);
      countParamIndex++;
    }
    if (estoque_min !== undefined) {
      countQuery += ` AND COALESCE(p.quantidade, 0) >= $${countParamIndex}`;
      countParams.push(parseInt(estoque_min));
      countParamIndex++;
    }
    if (estoque_max !== undefined) {
      countQuery += ` AND COALESCE(p.quantidade, 0) <= $${countParamIndex}`;
      countParams.push(parseInt(estoque_max));
      countParamIndex++;
    }
    if (preco_min !== undefined) {
      countQuery += ` AND COALESCE(p.valor_dinheiro_pix, 0) >= $${countParamIndex}`;
      countParams.push(parseFloat(preco_min));
      countParamIndex++;
    }
    if (preco_max !== undefined) {
      countQuery += ` AND COALESCE(p.valor_dinheiro_pix, 0) <= $${countParamIndex}`;
      countParams.push(parseFloat(preco_max));
      countParamIndex++;
    }
    if (ativo !== undefined) {
      const ativoValue = ativo === 'true' || ativo === true;
      countQuery += ` AND (p.situacao = $${countParamIndex} OR UPPER(p.situacao) = $${countParamIndex + 1})`;
      countParams.push(ativoValue ? 'ativo' : 'inativo', ativoValue ? 'ATIVO' : 'INATIVO');
      countParamIndex += 2;
    }
    
    const countResult = await pool.query(countQuery, countParams);
    
    // Formato compacto para economizar tokens (sem metadados)
    const compact = req.query.compact === 'true';
    
    if (compact) {
      // Retorna apenas array de produtos com campos mínimos
      res.json(result.rows.map(p => ({
        n: p.nome, // nome abreviado
        v: parseFloat(p.valor_dinheiro_pix), // valor_dinheiro_pix
        p: parseFloat(p.valor_parcelado_6x) // valor_parcelado_6x
      })));
    } else {
      // Formato completo (padrão)
      res.json({ 
        success: true, 
        data: result.rows,
        meta: {
          total: parseInt(countResult.rows[0].count),
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: parseInt(offset) + result.rows.length < parseInt(countResult.rows[0].count)
        }
      });
    }
  } catch (error) {
    console.error('[API Produtos] Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Buscar produto por ID (API pública)
app.get('/api/v1/produtos/:id', validateApiToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        p.id,
        p.nome,
        COALESCE(p.valor_dinheiro_pix, 0) as valor_dinheiro_pix,
        COALESCE(p.valor_parcelado_6x, 0) as valor_parcelado_6x
      FROM produtos p
      WHERE p.id = $1 OR p.codigo::text = $1 OR p.codigo_barras = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Produto não encontrado' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[API Produtos] Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Listar marcas (API pública)
app.get('/api/v1/marcas', validateApiToken, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM marcas ORDER BY nome`);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[API Marcas] Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Listar modelos (API pública)
app.get('/api/v1/modelos', validateApiToken, async (req, res) => {
  try {
    const { marca_id } = req.query;
    
    let query = `SELECT mo.*, m.nome as marca_nome FROM modelos mo LEFT JOIN marcas m ON mo.marca_id = m.id`;
    const params = [];
    
    if (marca_id) {
      query += ` WHERE mo.marca_id = $1`;
      params.push(marca_id);
    }
    
    query += ` ORDER BY mo.nome`;
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[API Modelos] Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Grupos de produtos (API pública)
app.get('/api/v1/grupos', validateApiToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT grupo, COUNT(*) as quantidade
      FROM produtos 
      WHERE grupo IS NOT NULL AND grupo != ''
      GROUP BY grupo
      ORDER BY grupo
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[API Grupos] Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Documentação da API
app.get('/api/v1/docs', (req, res) => {
  res.json({
    name: "PrimeCamp API",
    version: "1.0.0",
    description: "API para integração com sistemas externos e agentes de IA",
    base_url: "https://api.primecamp.cloud/api/v1",
    authentication: {
      type: "Bearer Token",
      header: "Authorization: Bearer <seu_token>",
      how_to_get: "Acesse /admin/integracoes no painel e gere um token de API"
    },
    endpoints: [
      {
        method: "GET",
        path: "/produtos",
        description: "Buscar produtos com filtros",
        parameters: {
          busca: "Busca geral (descrição, código, referência, código de barras)",
          modelo: "Filtrar por modelo do aparelho",
          marca: "Filtrar por marca",
          grupo: "Filtrar por grupo/categoria",
          codigo: "Buscar por código exato",
          referencia: "Buscar por referência",
          codigo_barras: "Buscar por código de barras",
          localizacao: "Filtrar por localização no estoque",
          estoque_min: "Estoque mínimo",
          estoque_max: "Estoque máximo",
          preco_min: "Preço mínimo",
          preco_max: "Preço máximo",
          ativo: "true/false - filtrar por ativos/inativos",
          limit: "Quantidade de resultados (default: 50, max: 100)",
          offset: "Offset para paginação",
          ordenar: "Campo para ordenação (descricao, codigo, preco_venda, quantidade)",
          ordem: "Direção da ordenação (asc, desc)"
        },
        example: "/produtos?modelo=iPhone%2015&limit=10"
      },
      {
        method: "GET",
        path: "/produtos/:id",
        description: "Buscar produto por ID, código ou código de barras"
      },
      {
        method: "GET",
        path: "/marcas",
        description: "Listar todas as marcas"
      },
      {
        method: "GET",
        path: "/modelos",
        description: "Listar modelos (use ?marca_id=UUID para filtrar)"
      },
      {
        method: "GET",
        path: "/grupos",
        description: "Listar grupos/categorias de produtos"
      }
    ],
    examples: {
      curl: `curl -X GET "https://api.primecamp.cloud/api/v1/produtos?modelo=iPhone%2015" -H "Authorization: Bearer SEU_TOKEN"`,
      javascript: `fetch('https://api.primecamp.cloud/api/v1/produtos?modelo=iPhone 15', {
  headers: { 'Authorization': 'Bearer SEU_TOKEN' }
}).then(r => r.json()).then(console.log)`,
      ai_agent: `Use esta API quando o cliente perguntar sobre preços, disponibilidade ou características de produtos. Exemplo: "Qual o preço da tela do iPhone 15?" -> GET /produtos?modelo=iPhone 15&busca=tela`
    }
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📊 Conectado ao PostgreSQL: ${process.env.DB_HOST}`);
  console.log(`💾 Database: ${process.env.DB_NAME}`);
});

