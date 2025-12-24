import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

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
app.use(cors({
  origin: process.env.VITE_API_ORIGIN || 'http://localhost:8080',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo de 100 requisições por IP
});
app.use('/api/', limiter);

// Testar conexão com PostgreSQL
pool.on('error', (err) => {
  console.error('Erro inesperado no pool de conexões PostgreSQL', err);
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

// Helper para construir WHERE clause
function buildWhereClause(where, params = []) {
  if (!where || Object.keys(where).length === 0) {
    return { clause: '', params };
  }

  const conditions = [];
  let paramIndex = params.length + 1;

  for (const [field, value] of Object.entries(where)) {
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

