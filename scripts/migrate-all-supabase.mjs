#!/usr/bin/env node

/**
 * Script para migrar TODOS os arquivos de Supabase para PostgreSQL
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.join(__dirname, '..', 'src');

// Arquivos que devem ser ignorados (já migrados ou são mocks)
const IGNORE_FILES = [
  'integrations/supabase/client.ts',
  'integrations/db/client.ts',
  'intercept-supabase.ts',
  'main.tsx',
];

// Padrões de substituição
const replacements = [
  // Import statements
  {
    pattern: /import\s+{\s*supabase\s*}\s+from\s+['"]@\/integrations\/supabase\/client['"];?/g,
    replacement: "import { from } from '@/integrations/db/client';"
  },
  
  // supabase.from() → from()
  {
    pattern: /supabase\.from\(/g,
    replacement: 'from('
  },
  
  // supabase.rpc() → TODO: implementar na API
  {
    pattern: /supabase\.rpc\(/g,
    replacement: '// 🚫 Supabase RPC removido - TODO: implementar na API\n      // supabase.rpc('
  },
  
  // supabase.functions.invoke() → fetch
  {
    pattern: /const\s+{\s*data[^}]*error[^}]*}\s*=\s*await\s+supabase\.functions\.invoke\(([^,]+),\s*\{[^}]*body:\s*([^}]+)\s*\}\);?/gs,
    replacement: (match, functionName, body) => {
      return `// 🚫 Supabase Functions removido - usar API direta
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const response = await fetch(\`\${API_URL}/functions/\${${functionName}}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(${body}),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Erro na requisição' }));
        throw new Error(error.error || 'Erro na requisição');
      }
      
      const data = await response.json();
      const error = null;`;
    }
  },
  
  // Adicionar .execute() após .select() que não tem
  {
    pattern: /\.select\([^)]+\)\s*(?!\.execute\(\))(?!\.eq\(\))(?!\.order\(\))(?!\.limit\(\))(?!\.single\(\))(?!\.range\()(?!\.gte\()(?!\.lte\()(?!\.in\()(?!\.lt\()(?!\.gt\()(?!\.maybeSingle\()/g,
    replacement: (match) => {
      // Verificar se já tem .execute() depois
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
    
    // Verificar se está na lista de ignorados
    const relativePath = path.relative(SRC_DIR, filePath).replace(/\\/g, '/');
    if (IGNORE_FILES.some(ignore => relativePath.includes(ignore))) {
      return false;
    }
    
    // Aplicar substituições
    replacements.forEach(({ pattern, replacement }) => {
      const newContent = typeof replacement === 'function' 
        ? content.replace(pattern, replacement)
        : content.replace(pattern, replacement);
      
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Migrado: ${relativePath}`);
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
      if (!['node_modules', '.git', 'dist', 'build', '.vite'].includes(file)) {
        findFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function main() {
  console.log('🚀 Iniciando migração completa Supabase → PostgreSQL...\n');
  
  const files = findFiles(SRC_DIR);
  let migratedCount = 0;
  
  files.forEach(file => {
    if (migrateFile(file)) {
      migratedCount++;
    }
  });
  
  console.log(`\n✅ Migração concluída! ${migratedCount} arquivos migrados.`);
  console.log('\n⚠️  IMPORTANTE: Revise os arquivos migrados manualmente.');
  console.log('⚠️  Alguns padrões podem precisar de ajuste manual (RPC, Functions, etc.).');
}

main();

