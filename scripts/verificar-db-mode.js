/**
 * Script para verificar qual modo de banco está configurado
 * Execute: node scripts/verificar-db-mode.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar .env
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🔍 Verificando configuração do banco de dados...\n');

// Verificar variáveis de ambiente
const dbMode = process.env.VITE_DB_MODE || 'supabase';
const apiUrl = process.env.VITE_API_URL || 'http://localhost:3000/api';
const dbHost = process.env.VITE_DB_HOST || '72.62.106.76';
const dbName = process.env.VITE_DB_NAME || 'banco_gestao';

console.log('📋 Variáveis de Ambiente:');
console.log(`   VITE_DB_MODE: ${dbMode}`);
console.log(`   VITE_API_URL: ${apiUrl}`);
console.log(`   VITE_DB_HOST: ${dbHost}`);
console.log(`   VITE_DB_NAME: ${dbName}`);
console.log('');

// Verificar qual modo está sendo usado
if (dbMode === 'postgres') {
  console.log('✅ Modo PostgreSQL está configurado!');
  console.log(`   API: ${apiUrl}`);
  console.log(`   Banco: ${dbName} em ${dbHost}`);
} else {
  console.log('⚠️  Modo Supabase está configurado!');
  console.log('   Para usar PostgreSQL, configure: VITE_DB_MODE=postgres');
}

console.log('');
console.log('⚠️  IMPORTANTE:');
console.log('   Variáveis VITE_* são embutidas no build!');
console.log('   Se mudou o .env, precisa rebuildar:');
console.log('   npm run build');
console.log('');

// Verificar se existe build
try {
  const buildIndex = readFileSync(join(__dirname, '..', 'dist', 'index.html'), 'utf-8');
  console.log('📦 Build encontrado em dist/');
  
  // Tentar detectar qual modo está no build (limitado)
  if (buildIndex.includes('gogxicjaqpqbhsfzutij.supabase.co')) {
    console.log('   ⚠️  Build parece estar usando Supabase');
  }
  if (buildIndex.includes('api.primecamp.cloud') || buildIndex.includes('localhost:3000')) {
    console.log('   ✅ Build parece estar usando PostgreSQL');
  }
} catch (e) {
  console.log('   ⚠️  Nenhum build encontrado em dist/');
  console.log('   Execute: npm run build');
}

console.log('');

