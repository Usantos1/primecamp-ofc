# Comandos para criar a tabela DRE no VPS

A página `/financeiro/dre` está retornando erro porque a tabela `public.dre` não existe no banco de dados.

Execute os seguintes comandos no servidor para criar a tabela:

```bash
# 1. Navegar para o diretório do projeto
cd /root/primecamp-ofc

# 2. Puxar as últimas alterações (para garantir que o script SQL está atualizado)
git pull origin main

# 3. Executar o script SQL para criar a tabela DRE
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -f sql/CRIAR_TABELA_DRE.sql

# 4. Reiniciar o backend para aplicar as mudanças
cd server
pm2 restart primecamp-api

# 5. Verificar logs do backend
pm2 logs primecamp-api --lines 30
```

**Após executar estes comandos:**
- A tabela `public.dre` será criada
- O backend será reiniciado
- A página `/financeiro/dre` deve funcionar corretamente

**Nota:** O DRE será calculado automaticamente quando você acessar a página, baseado nas vendas e contas do período selecionado.
