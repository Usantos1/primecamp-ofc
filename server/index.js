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
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação necessário' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado' });
    }
    req.user = user;
    next();
  });
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

// Aplicar autenticação a rotas de dados (não aplicar em /api/auth/*, /api/health e /api/functions/*)
// Os endpoints /api/functions/* terão autenticação própria dentro de cada rota
app.use((req, res, next) => {
  // Pular autenticação para rotas de auth, health check e functions
  if (req.path.startsWith('/api/auth/') || 
      req.path === '/api/health' || 
      req.path === '/health' ||
      req.path.startsWith('/api/functions/') ||
      req.path.startsWith('/api/storage/')) {
    return next();
  }
  // Aplicar autenticação para outras rotas /api/*
  if (req.path.startsWith('/api/')) {
    return authenticateToken(req, res, next);
  }
  next();
});

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

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: profile?.role || 'member'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('[API] Login bem-sucedido:', { userId: user.id, email: user.email, hasToken: !!token });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        email_verified: user.email_verified,
        created_at: user.created_at
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
    const { email, password, display_name, phone, department, role } = req.body;

    console.log('[API] Tentativa de cadastro:', { email: email?.toLowerCase(), hasDisplayName: !!display_name });

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

    // Criar usuário
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, email_verified)
       VALUES ($1, $2, true)
       RETURNING *`,
      [email.toLowerCase().trim(), passwordHash]
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

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: newUser.id, 
        email: newUser.email,
        role: profile.role || 'member'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('[API] Cadastro bem-sucedido:', { userId: newUser.id, email: newUser.email, hasToken: !!token });

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
      'SELECT id, email, email_verified, created_at FROM users WHERE id = $1',
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

    // Query para buscar dados
    let sql = `SELECT ${fields} FROM ${tableName}`;
    if (whereClause) sql += ` ${whereClause}`;

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

    console.log(`[Query] ${tableName}:`, sql, params);
    const result = await pool.query(sql, params);
    console.log(`[Query] ${tableName} resultado:`, result.rows.length, 'registros');
    
    // Query para contar total (sem limit/offset)
    let countSql = `SELECT COUNT(*) as total FROM ${tableName}`;
    if (whereClause) countSql += ` ${whereClause}`;
    
    const countResult = await pool.query(countSql, params);
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

    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `
      INSERT INTO ${tableName} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    console.log(`[Insert] ${tableName}:`, keys);
    const result = await pool.query(sql, values);
    res.json({ data: result.rows[0], rows: result.rows });
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

    if (!where || Object.keys(where).length === 0) {
      return res.status(400).json({ error: 'Update requires WHERE clause' });
    }

    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    
    // Passar o número de valores do SET como offset para buildWhereClause
    const { clause: whereClause, params: whereParams } = buildWhereClause(where, values.length);
    const params = [...values, ...whereParams];

    const sql = `
      UPDATE ${tableName}
      SET ${setClause}
      ${whereClause}
      RETURNING *
    `;

    console.log(`[Update] ${tableName}:`, keys, 'WHERE:', where);
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
    const values = Object.values(data);
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

// Delete endpoint
app.post('/api/delete/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { where } = req.body;

    // Usar schema public explicitamente
    const tableName = table.includes('.') ? table : `public.${table}`;

    if (!where || Object.keys(where).length === 0) {
      return res.status(400).json({ error: 'Delete requires WHERE clause' });
    }

    const { clause: whereClause, params } = buildWhereClause(where);

    const sql = `
      DELETE FROM ${tableName}
      ${whereClause}
      RETURNING *
    `;

    console.log(`[Delete] ${tableName}`);
    const result = await pool.query(sql, params);
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

    // Enviar mensagem via API do Ativa CRM
    const ativaCrmResponse = await fetch('https://api.ativacrm.com.br/v1/whatsapp/send-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ativaCrmToken}`,
      },
      body: JSON.stringify({
        number: formattedNumber,
        text: data.body,
      }),
    });

    const ativaCrmData = await ativaCrmResponse.json().catch(() => ({}));

    console.log('[WhatsApp] Resposta Ativa CRM:', ativaCrmResponse.status, ativaCrmData);

    if (!ativaCrmResponse.ok) {
      // Verificar se é erro de WhatsApp não configurado
      if (ativaCrmData.code === 'ERR_NO_DEF_WAPP_FOUND' || ativaCrmData.error?.includes('WhatsApp')) {
        return res.json({
          success: false,
          warning: 'ERR_NO_DEF_WAPP_FOUND',
          message: 'Nenhum WhatsApp padrão configurado no Ativa CRM',
        });
      }
      
      return res.status(ativaCrmResponse.status).json({
        success: false,
        error: ativaCrmData.message || ativaCrmData.error || 'Erro ao enviar mensagem',
      });
    }

    res.json({
      success: true,
      message: 'Mensagem enviada com sucesso',
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
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId é obrigatório' });
    }

    // Buscar usuário na tabela users
    const userResult = await pool.query(
      'SELECT id, email, email_verified, created_at FROM users WHERE id = $1',
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
    const { userId, email, password } = req.body;

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
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId é obrigatório' });
    }

    // Verificar se usuário existe
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se é o próprio usuário (não permitir auto-deleção)
    if (req.user.id === userId) {
      return res.status(400).json({ error: 'Você não pode deletar seu próprio usuário' });
    }

    // Deletar profile primeiro (devido a foreign key)
    await pool.query('DELETE FROM profiles WHERE user_id = $1', [userId]);

    // Deletar usuário
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    console.log('[API] Usuário deletado:', { userId, email: userResult.rows[0].email });

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
        error: 'Não é possível deletar este usuário pois ele possui registros relacionados',
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

        // Preparar dados
        const dadosCliente = {
          nome: String(cliente.nome).toUpperCase().substring(0, 255),
          cpf_cnpj: cliente.cpf_cnpj ? String(cliente.cpf_cnpj).substring(0, 20) : null,
          telefone: cliente.telefone ? String(cliente.telefone).substring(0, 20) : null,
          telefone2: cliente.telefone2 ? String(cliente.telefone2).substring(0, 20) : null,
          whatsapp: cliente.whatsapp ? String(cliente.whatsapp).substring(0, 20) : null,
          logradouro: cliente.endereco ? String(cliente.endereco).substring(0, 255) : null,
          numero: cliente.numero ? String(cliente.numero).substring(0, 20) : null,
          complemento: cliente.complemento ? String(cliente.complemento).substring(0, 100) : null,
          bairro: cliente.bairro ? String(cliente.bairro).substring(0, 100) : null,
          cep: cliente.cep ? String(cliente.cep).replace(/\D/g, '').substring(0, 10) : null,
          cidade: cliente.cidade ? String(cliente.cidade).substring(0, 100) : null,
          estado: cliente.estado ? String(cliente.estado).substring(0, 2) : null,
          tipo_pessoa: cliente.tipo_pessoa || 'fisica',
          tipo_cliente: 'cliente',
          situacao: 'ativo',
        };

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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📊 Conectado ao PostgreSQL: ${process.env.DB_HOST}`);
  console.log(`💾 Database: ${process.env.DB_NAME}`);
});

