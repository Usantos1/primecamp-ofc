/**
 * Script para testar conexão com PostgreSQL
 * Execute: node test-connection.js
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

// Validar variáveis de ambiente obrigatórias
const requiredEnvVars = {
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
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

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function testConnection() {
  console.log('🔍 Testando conexão com PostgreSQL...');
  console.log(`📍 Host: ${process.env.DB_HOST}`);
  console.log(`💾 Database: ${process.env.DB_NAME}`);
  console.log(`👤 User: ${process.env.DB_USER}`);
  console.log('');

  try {
    // Teste 1: Conexão básica
    console.log('1️⃣ Testando conexão básica...');
    const result = await pool.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ Conexão bem-sucedida!');
    console.log(`   Hora do servidor: ${result.rows[0].current_time}`);
    console.log(`   Versão PostgreSQL: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
    console.log('');

    // Teste 2: Listar tabelas
    console.log('2️⃣ Listando tabelas disponíveis...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log(`✅ Encontradas ${tablesResult.rows.length} tabelas:`);
      tablesResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.table_name}`);
      });
    } else {
      console.log('⚠️  Nenhuma tabela encontrada no schema public');
    }
    console.log('');

    // Teste 3: Verificar tabelas específicas (se existirem)
    const commonTables = ['ordens_servico', 'clientes', 'produtos', 'profiles'];
    console.log('3️⃣ Verificando tabelas comuns...');
    for (const table of commonTables) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   ✅ ${table}: ${countResult.rows[0].count} registros`);
      } catch (error) {
        if (error.code === '42P01') {
          console.log(`   ⚠️  ${table}: tabela não existe`);
        } else {
          console.log(`   ❌ ${table}: erro - ${error.message}`);
        }
      }
    }
    console.log('');

    console.log('✅ Todos os testes concluídos com sucesso!');
    console.log('');
    console.log('🚀 Próximos passos:');
    console.log('   1. Inicie a API: npm run dev');
    console.log('   2. Teste a API: curl http://localhost:3000/health');
    console.log('   3. Configure VITE_DB_MODE=postgres no .env do frontend');

  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message);
    console.error('');
    console.error('🔧 Verifique:');
    console.error('   1. PostgreSQL está rodando no servidor');
    console.error('   2. Credenciais estão corretas no .env');
    console.error('   3. Firewall permite conexão na porta 5432');
    console.error('   4. Usuário tem permissões adequadas');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();

