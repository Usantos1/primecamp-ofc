#!/usr/bin/env node

/**
 * Script para migrar automaticamente imports do Supabase para PostgreSQL wrapper
 * 
 * Uso: node scripts/migrate-supabase-to-postgres.js
 * 
 * Este script:
 * 1. Substitui imports de supabase por from wrapper
 * 2. Substitui supabase.from() por from()
 * 3. Adiciona .execute() onde necessário
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC_DIR = path.join(__dirname, '..', 'src');

// Padrões de substituição
const replacements = [
  // Import statements
  {
    pattern: /import\s+{\s*supabase\s*}\s+from\s+['"]@\/integrations\/supabase\/client['"];?/g,
    replacement: "import { from } from '@/integrations/db/client';"
  },
  {
    pattern: /import\s+{\s*supabase\s*,\s*.*?}\s+from\s+['"]@\/integrations\/supabase\/client['"];?/g,
    replacement: (match) => {
      // Manter outros imports se houver
      return match.replace(/supabase\s*,?\s*/g, '').replace(/,\s*,/g, ',').replace(/,\s*}/g, '}');
    }
  },
  
  // supabase.from() -> from()
  {
    pattern: /supabase\.from\(/g,
    replacement: 'from('
  },
  
  // Adicionar .execute() após .select() que não tem
  {
    pattern: /\.select\([^)]+\)\s*(?!\.execute\(\))(?!\.eq\(\))(?!\.order\(\))(?!\.limit\(\))(?!\.single\(\))(?!\.range\()/g,
    replacement: (match) => {
      // Só adicionar se não tiver .execute() depois
      return match + '.execute()';
    }
  },
];

function migrateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Verificar se o arquivo usa Supabase
    if (!content.includes('supabase') && !content.includes('@/integrations/supabase')) {
      return false;
    }
    
    // Aplicar substituições
    replacements.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Migrado: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Erro ao migrar ${filePath}:`, error.message);
    return false;
  }
}

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Ignorar node_modules e outras pastas
      if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
        findFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function main() {
  console.log('🚀 Iniciando migração Supabase → PostgreSQL...\n');
  
  const files = findFiles(SRC_DIR);
  let migratedCount = 0;
  
  files.forEach(file => {
    if (migrateFile(file)) {
      migratedCount++;
    }
  });
  
  console.log(`\n✅ Migração concluída! ${migratedCount} arquivos migrados.`);
  console.log('\n⚠️  IMPORTANTE: Revise os arquivos migrados manualmente.');
  console.log('⚠️  Alguns padrões podem precisar de ajuste manual.');
}

if (require.main === module) {
  main();
}

module.exports = { migrateFile, findFiles };


