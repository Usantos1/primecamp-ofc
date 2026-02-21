# 🚀 Comandos de Deploy - Validações Backend (sale_origin)

## ✅ Alteração Commitada

`feat: adicionar validações de sale_origin no backend (OS/PDV)`

## 📋 O que foi implementado

Validações no backend (`server/index.js`) para garantir integridade dos dados de vendas:

- ✅ Vendas com `sale_origin = 'OS'` DEVE ter `ordem_servico_id` e `technician_id`
- ✅ Vendas com `sale_origin = 'OS'` NÃO pode ter `cashier_user_id`
- ✅ Vendas com `sale_origin = 'PDV'` DEVE ter `cashier_user_id`
- ✅ Vendas com `sale_origin = 'PDV'` NÃO pode ter `ordem_servico_id` nem `technician_id`
- ✅ Todas as vendas DEVE ter `sale_origin` definido ('PDV' ou 'OS')
- ✅ Validações aplicadas em INSERT (`/api/insert/sales`) e UPDATE (`/api/update/sales`)

## 📋 Comandos para Deploy na VPS

```bash
cd /root/primecamp-ofc
git pull origin main
cd server
npm install
pm2 restart primecamp-api
sleep 5
pm2 status
pm2 logs primecamp-api --lines 30 --nostream
```

## 🧪 Como Testar

1. Tentar criar uma venda OS sem `ordem_servico_id` → Deve retornar erro
2. Tentar criar uma venda OS sem `technician_id` → Deve retornar erro
3. Tentar criar uma venda OS com `cashier_user_id` → Deve retornar erro
4. Tentar criar uma venda PDV sem `cashier_user_id` → Deve retornar erro
5. Tentar criar uma venda PDV com `ordem_servico_id` → Deve retornar erro
6. Tentar criar uma venda PDV com `technician_id` → Deve retornar erro
7. Tentar criar uma venda sem `sale_origin` → Deve retornar erro

## ✅ Status

**IMPLEMENTAÇÃO COMPLETA!** Todas as 6 partes do plano original foram implementadas:
- ✅ PARTE 1: Estrutura de vendas (PDV/OS) + Validações backend
- ✅ PARTE 2: Produto x Serviço
- ✅ PARTE 3: Relatórios e Indicadores
- ✅ PARTE 4: Checklist automático + Impressão OS
- ✅ PARTE 5: Impressão automática PDV
- ✅ PARTE 6: Melhorias UI/UX
