/**
 * Popula a empresa "Ativa FIX - Demonstração" com clientes, OS e vendas de exemplo
 * para o dashboard da demo mostrar dados.
 * Rodar na raiz do projeto: node server/scripts/seed-demo-data.js
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const DEMO_COMPANY_NAME = 'Ativa FIX - Demonstração';

async function getDemoCompanyId(client) {
  const r = await client.query(
    `SELECT id FROM companies WHERE name = $1 AND (deleted_at IS NULL) LIMIT 1`,
    [DEMO_COMPANY_NAME]
  );
  if (r.rows.length === 0) {
    throw new Error('Empresa "Ativa FIX - Demonstração" não encontrada. Rode antes: node server/scripts/create-demo-user.js');
  }
  return r.rows[0].id;
}

async function seedClientes(client, companyId) {
  const rows = [
    { nome: 'Maria Silva', email: 'maria.silva@email.com', telefone: '(11) 98765-4321' },
    { nome: 'João Santos', email: 'joao.santos@email.com', telefone: '(11) 97654-3210' },
    { nome: 'Ana Oliveira', email: 'ana.oliveira@email.com', telefone: '(21) 96543-2109' },
    { nome: 'Pedro Costa', email: 'pedro.costa@email.com', telefone: '(31) 95432-1098' },
    { nome: 'Carla Souza', email: 'carla.souza@email.com', telefone: '(41) 94321-0987' },
  ];
  let inserted = 0;
  for (const row of rows) {
    try {
      const hasTipoSituacao = await client.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'clientes' AND column_name = 'tipo_pessoa'
      `).then(r => r.rows.length > 0);
      if (hasTipoSituacao) {
        await client.query(
          `INSERT INTO clientes (company_id, nome, email, telefone, tipo_pessoa, situacao, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'fisica', 'ativo', NOW(), NOW())`,
          [companyId, row.nome, row.email, row.telefone]
        );
      } else {
        await client.query(
          `INSERT INTO clientes (company_id, nome, email, telefone, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [companyId, row.nome, row.email, row.telefone]
        );
      }
      inserted++;
    } catch (e) {
      console.warn('Cliente', row.nome, ':', e.message);
    }
  }
  return inserted;
}

async function seedOrdensServico(client, companyId, clienteIds) {
  const statuses = ['aberta', 'aberta', 'fechada', 'fechada', 'aberta', 'fechada'];
  const descricoes = ['Tela quebrada', 'Bateria não carrega', 'Troca de conector', 'Desbloqueio', 'Problema no áudio', 'Atualização de sistema'];
  const valores = [120, 85, 200, 50, 95, 60];
  let numeroBase = 900000;
  try {
    const maxNum = await client.query(
      `SELECT COALESCE(MAX(numero), 900000) as m FROM ordens_servico WHERE company_id = $1`,
      [companyId]
    );
    const m = maxNum.rows[0]?.m;
    numeroBase = Math.max(900000, (typeof m === 'number' ? m : parseInt(m, 10) || 900000) + 1);
  } catch (_) {}
  let inserted = 0;
  for (let i = 0; i < 6; i++) {
    const numero = numeroBase + i;
    const clienteId = clienteIds.length ? clienteIds[i % clienteIds.length] : null;
    const valorTotal = valores[i];
    const status = statuses[i] === 'fechada' ? 'finalizada' : 'aberta';
    try {
      await client.query(
        `INSERT INTO ordens_servico (
          company_id, numero, cliente_id, telefone_contato, data_entrada, descricao_problema,
          status, situacao, valor_total, tipo_aparelho, created_at, updated_at
        ) VALUES ($1, $2, $3, '(11) 99999-0000', CURRENT_DATE - ($4::int || ' days')::interval, $5, $6, $7, $8, 'Celular', NOW(), NOW())`,
        [companyId, numero, clienteId, i * 2, descricoes[i], status, statuses[i], valorTotal]
      );
      inserted++;
    } catch (e) {
      try {
        await client.query(
          `INSERT INTO ordens_servico (company_id, numero, cliente_nome, defeito_relatado, status, valor_total, data_entrada, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW() - ($7::int || ' days')::interval, NOW(), NOW())`,
          [companyId, numero, 'Cliente ' + (i + 1), descricoes[i], status, valorTotal, i * 2]
        );
        inserted++;
      } catch (e2) {
        console.warn('OS', numero, ':', e2.message);
      }
    }
  }
  return inserted;
}

async function seedVendas(client, companyId) {
  const hasVendas = await client.query(`
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendas'
  `).then(r => r.rows.length > 0);
  const salesTable = hasVendas ? 'vendas' : 'sales';

  let numeroStart = 900000;
  try {
    const maxNum = await client.query(
      `SELECT COALESCE(MAX(numero), 900000) as m FROM ${salesTable} WHERE company_id = $1`,
      [companyId]
    );
    const m = maxNum.rows[0]?.m;
    numeroStart = Math.max(900000, (typeof m === 'number' ? m : parseInt(m, 10) || 900000) + 1);
  } catch (_) {}

  let inserted = 0;
  const totals = [150, 89.9, 320, 45, 199.9, 75, 280, 110];
  for (let i = 0; i < totals.length; i++) {
    const numero = numeroStart + i;
    const total = totals[i];
    try {
      const hasSaleOrigin = await client.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'sale_origin'
      `, [salesTable]).then(r => r.rows.length > 0);
      if (hasSaleOrigin) {
        await client.query(
          `INSERT INTO ${salesTable} (company_id, numero, status, total, subtotal, desconto_total, total_pago, is_draft, sale_origin, created_at, updated_at, finalized_at)
           VALUES ($1, $2, 'paid', $3, $3, 0, $3, false, 'PDV', NOW() - ($4::int || ' days')::interval, NOW(), NOW() - ($4::int || ' days')::interval)`,
          [companyId, numero, total, i]
        );
      } else {
        await client.query(
          `INSERT INTO ${salesTable} (company_id, numero, status, total, subtotal, desconto_total, total_pago, is_draft, created_at, updated_at)
           VALUES ($1, $2, 'paid', $3, $3, 0, $3, false, NOW() - ($4::int || ' days')::interval, NOW())`,
          [companyId, numero, total, i]
        );
      }
      inserted++;
    } catch (e) {
      console.warn(salesTable, numero, ':', e.message);
    }
  }
  return inserted;
}

async function main() {
  const client = await pool.connect();
  try {
    const companyId = await getDemoCompanyId(client);

    const existingClientes = await client.query('SELECT id FROM clientes WHERE company_id = $1 LIMIT 6', [companyId]);
    const clienteIds = existingClientes.rows.map(r => r.id);

    let cCount = 0;
    try {
      cCount = await seedClientes(client, companyId);
    } catch (e) {
      console.warn('Clientes:', e.message);
    }
    const clienteIdsAfter = await client.query('SELECT id FROM clientes WHERE company_id = $1 ORDER BY created_at LIMIT 6', [companyId]);
    const ids = clienteIdsAfter.rows.map(r => r.id);

    let oCount = 0;
    try {
      oCount = await seedOrdensServico(client, companyId, ids.length ? ids : []);
    } catch (e) {
      console.warn('OS:', e.message);
    }

    let vCount = 0;
    try {
      vCount = await seedVendas(client, companyId);
    } catch (e) {
      console.warn('Vendas:', e.message);
    }

    const totalClientes = await client.query('SELECT COUNT(*) FROM clientes WHERE company_id = $1', [companyId]);
    const totalOS = await client.query('SELECT COUNT(*) FROM ordens_servico WHERE company_id = $1', [companyId]);
    const vendasTable = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('vendas','sales') LIMIT 1`
    ).then(r => r.rows[0]?.table_name || 'sales');
    const totalVendas = await client.query(`SELECT COUNT(*) FROM ${vendasTable} WHERE company_id = $1`, [companyId]);
    console.log('✅ Seed demo concluído. Clientes:', totalClientes.rows[0].count, '| OS:', totalOS.rows[0].count, '| Vendas:', totalVendas.rows[0].count);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
