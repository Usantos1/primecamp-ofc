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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here_change_in_production';

// Configuração do PostgreSQL
const pool = new Pool({
  host: process.env.VITE_DB_HOST || '72.62.106.76',
  database: process.env.VITE_DB_NAME || 'banco_gestao',
  user: process.env.VITE_DB_USER || 'postgres',
  password: process.env.VITE_DB_PASSWORD || 'AndinhoSurf2015@',
  port: parseInt(process.env.VITE_DB_PORT || '5432'),
  ssl: process.env.VITE_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
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
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:8080',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:3000',
      process.env.VITE_API_ORIGIN,
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
app.use(express.json());

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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo de 100 requisições por IP
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo de 10 tentativas de login por IP
});

// Aplicar rate limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/', limiter);

// Aplicar autenticação a rotas de dados (não aplicar em /api/auth/*)
app.use((req, res, next) => {
  // Pular autenticação para rotas de auth
  if (req.path.startsWith('/api/auth/')) {
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
// ENDPOINTS DE AUTENTICAÇÃO
// ============================================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário no banco
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    const user = result.rows[0];

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    // Buscar profile do usuário
    const profileResult = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [user.id]
    );

    const profile = profileResult.rows[0] || null;

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
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Signup (Cadastro)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, display_name, phone, department, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar se email já existe
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Este email já está cadastrado' });
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Criar usuário
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, email_verified)
       VALUES ($1, $2, true)
       RETURNING *`,
      [email.toLowerCase(), passwordHash]
    );

    const newUser = userResult.rows[0];

    // Criar profile
    let profile = null;
    if (display_name || phone || department || role) {
      const profileResult = await pool.query(
        `INSERT INTO profiles (user_id, display_name, phone, department, role, approved, approved_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW())
         RETURNING *`,
        [newUser.id, display_name || email, phone || null, department || null, role || 'member']
      );
      profile = profileResult.rows[0];
    }

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: newUser.id, 
        email: newUser.email,
        role: profile?.role || 'member'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

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
    console.error('Erro no cadastro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
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

// ============================================
// FIM DOS ENDPOINTS DE AUTENTICAÇÃO
// ============================================

// Helper para construir WHERE clause
function buildWhereClause(where, params = []) {
  if (!where || Object.keys(where).length === 0) {
    return { clause: '', params };
  }

  const conditions = [];
  let paramIndex = params.length + 1;

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
      const [actualField, , operator] = field.split('__not__');
      if (operator === 'is' && value === null) {
        conditions.push(`${actualField} IS NOT NULL`);
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
      const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
      conditions.push(`${actualField} IN (${placeholders})`);
      params.push(...value);
    } else {
      conditions.push(`${field} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
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

    const fields = Array.isArray(select) ? select.join(', ') : (select || '*');
    const { clause: whereClause, params } = buildWhereClause(where);

    let sql = `SELECT ${fields} FROM ${table}`;
    if (whereClause) sql += ` ${whereClause}`;

    if (orderBy) {
      const direction = orderBy.ascending === false ? 'DESC' : 'ASC';
      sql += ` ORDER BY ${orderBy.field} ${direction}`;
    }

    if (limit) {
      sql += ` LIMIT ${limit}`;
    }

    if (offset) {
      sql += ` OFFSET ${offset}`;
    }

    const result = await pool.query(sql, params);
    res.json({ rows: result.rows, count: result.rowCount });
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

    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

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

    if (!where || Object.keys(where).length === 0) {
      return res.status(400).json({ error: 'Update requires WHERE clause' });
    }

    const { clause: whereClause, params: whereParams } = buildWhereClause(where);
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const params = [...values, ...whereParams];

    const sql = `
      UPDATE ${table}
      SET ${setClause}
      ${whereClause}
      RETURNING *
    `;

    const result = await pool.query(sql, params);
    res.json({ data: result.rows, rows: result.rows, count: result.rowCount });
  } catch (error) {
    console.error('Erro ao atualizar:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete endpoint
app.post('/api/delete/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { where } = req.body;

    if (!where || Object.keys(where).length === 0) {
      return res.status(400).json({ error: 'Delete requires WHERE clause' });
    }

    const { clause: whereClause, params } = buildWhereClause(where);

    const sql = `
      DELETE FROM ${table}
      ${whereClause}
      RETURNING *
    `;

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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📊 Conectado ao PostgreSQL: ${process.env.VITE_DB_HOST || '72.62.106.76'}`);
  console.log(`💾 Database: ${process.env.VITE_DB_NAME || 'banco_gestao'}`);
});

