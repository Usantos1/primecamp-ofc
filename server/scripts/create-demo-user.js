/**
 * Cria o usuário de demonstração no banco (email e senha vêm do .env).
 * Rodar na raiz do projeto: node server/scripts/create-demo-user.js
 * Ou, de dentro de server/: node scripts/create-demo-user.js
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env na raiz do projeto (pasta que contém server/)
const envPath = join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

const email = (process.env.DEMO_EMAIL || process.env.DEMO_USER_EMAIL || '').trim().toLowerCase();
const password = process.env.DEMO_PASSWORD || process.env.DEMO_USER_PASSWORD;

if (!email || !password) {
  console.error('❌ Defina DEMO_EMAIL e DEMO_PASSWORD no .env da raiz do projeto.');
  process.exit(1);
}

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function main() {
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log('✅ Usuário demo já existe:', email);
      return;
    }

    const companies = await client.query('SELECT id FROM companies ORDER BY created_at ASC LIMIT 1');
    const companyId = companies.rows[0]?.id;
    if (!companyId) {
      console.error('❌ Nenhuma empresa encontrada. Crie uma empresa antes de rodar este script.');
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      `INSERT INTO users (id, email, password_hash, email_verified, company_id, created_at)
       VALUES (gen_random_uuid(), $1, $2, true, $3, NOW())
       RETURNING id`,
      [email, passwordHash, companyId]
    );
    const userId = userResult.rows[0].id;

    await client.query(
      `INSERT INTO profiles (id, user_id, display_name, role, approved, approved_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'Visitante Demo', 'admin', true, NOW(), NOW(), NOW())`,
      [userId]
    );

    console.log('✅ Usuário demo criado:', email, '(company_id:', companyId + ')');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
