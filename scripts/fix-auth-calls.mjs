#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.join(__dirname, '..', 'src');

function fixAuthCalls(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Verificar se usa supabase.auth.getUser
    if (!content.includes('supabase.auth.getUser')) {
      return false;
    }
    
    // Verificar se já tem useAuth importado
    const hasUseAuth = content.includes('useAuth') && content.includes('@/contexts/AuthContext');
    
    // Adicionar import se não tiver
    if (!hasUseAuth && content.includes('import')) {
      // Encontrar última linha de import
      const importLines = content.split('\n').filter(line => line.trim().startsWith('import'));
      if (importLines.length > 0) {
        const lastImportIndex = content.lastIndexOf(importLines[importLines.length - 1]);
        const insertIndex = content.indexOf('\n', lastImportIndex) + 1;
        content = content.slice(0, insertIndex) + 
          "import { useAuth } from '@/contexts/AuthContext';\n" + 
          content.slice(insertIndex);
        modified = true;
      }
    }
    
    // Substituir supabase.auth.getUser() por useAuth()
    const patterns = [
      // Padrão 1: const { data: { user } } = await supabase.auth.getUser();
      {
        pattern: /const\s+{\s*data:\s*{\s*user\s*}\s*}\s*=\s*await\s+supabase\.auth\.getUser\(\);?/g,
        replacement: 'const { user } = useAuth();'
      },
      // Padrão 2: const { data: { user: userData } } = await supabase.auth.getUser();
      {
        pattern: /const\s+{\s*data:\s*{\s*user:\s*(\w+)\s*}\s*}\s*=\s*await\s+supabase\.auth\.getUser\(\);?/g,
        replacement: 'const { user: $1 } = useAuth();'
      },
      // Padrão 3: const { data: { user: currentUser } } = await supabase.auth.getUser();
      {
        pattern: /const\s+{\s*data:\s*{\s*user:\s*(\w+)\s*}\s*}\s*=\s*await\s+supabase\.auth\.getUser\(\);?/g,
        replacement: 'const { user: $1 } = useAuth();'
      },
    ];
    
    patterns.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      const relativePath = path.relative(SRC_DIR, filePath).replace(/\\/g, '/');
      console.log(`✅ Corrigido: ${relativePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Erro ao corrigir ${filePath}:`, error.message);
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
  console.log('🔧 Corrigindo chamadas supabase.auth.getUser()...\n');
  
  const files = findFiles(SRC_DIR);
  let fixedCount = 0;
  
  files.forEach(file => {
    if (fixAuthCalls(file)) {
      fixedCount++;
    }
  });
  
  console.log(`\n✅ Correção concluída! ${fixedCount} arquivos corrigidos.`);
}

main();

