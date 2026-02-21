# Deploy: Correção Payment Methods

## Problema

O erro `column pm.description does not exist` está ocorrendo porque o código no servidor (VPS) ainda não foi atualizado.

## Correção Aplicada

A correção já foi commitada e está no código local:
- Adicionada verificação se a coluna `description` existe antes de buscá-la
- Query agora usa `NULL as description` se a coluna não existir

## Deploy Necessário

Execute os comandos abaixo no VPS para atualizar o backend:

```bash
# 1. Acessar o diretório do projeto
cd /root/primecamp-ofc

# 2. Pull das mudanças
git pull origin main

# 3. Reiniciar o backend (PM2)
pm2 restart all

# 4. Verificar logs para confirmar que está funcionando
pm2 logs --lines 50
```

## Verificação

Após o deploy, acesse `/admin/configuracoes/pagamentos` e verifique se:
1. A página carrega sem erros
2. É possível criar formas de pagamento
3. As formas de pagamento aparecem na lista

## Se o Erro Persistir

Se após o deploy o erro continuar, pode ser necessário adicionar a coluna `description` na tabela:

```sql
-- Conectar ao banco
sudo -u postgres psql -d primecamp

-- Adicionar coluna se não existir
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS description TEXT;

-- Verificar se foi adicionada
\d payment_methods
```
