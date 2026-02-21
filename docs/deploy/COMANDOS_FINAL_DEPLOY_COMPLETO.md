# 🚀 Comandos Finais para Deploy Completo

## Executar no Servidor VPS

```bash
cd /root/primecamp-ofc

# Tornar o script executável
chmod +x CORRIGIR_PM2_E_ROTAS.sh

# Executar o script completo
./CORRIGIR_PM2_E_ROTAS.sh
```

## O script irá:

1. ✅ Parar e deletar todos os processos PM2
2. ✅ Matar processos na porta 3000
3. ✅ Atualizar código com `git pull`
4. ✅ Instalar dependências do backend
5. ✅ Aplicar migração SQL (banco detectado automaticamente)
6. ✅ Iniciar backend com PM2
7. ✅ Instalar dependências do frontend
8. ✅ Limpar build anterior
9. ✅ Fazer build completo do frontend
10. ✅ Deploy para Nginx
11. ✅ Limpar cache do Nginx
12. ✅ Verificar se componentes estão no bundle

## Verificações Manuais (Opcional)

Após o deploy, você pode verificar:

```bash
# Verificar se o backend está rodando
pm2 status
pm2 logs primecamp-api --lines 50

# Verificar se a rota está no bundle JS
grep -r "DashboardExecutivo" /var/www/html/assets/*.js | head -3

# Testar endpoint da API
curl -H "Authorization: Bearer SEU_TOKEN" https://api.primecamp.cloud/api/financeiro/dashboard
```

## Se ainda houver problemas:

1. **Limpar cache do navegador** (Ctrl+Shift+Delete)
2. **Testar em aba anônima/privada**
3. **Verificar permissões do usuário**: A rota `/financeiro` requer a permissão `relatorios.financeiro`
4. **Verificar logs do backend**: `pm2 logs primecamp-api`

## Acesso

Após o deploy, acesse:
- Frontend: https://primecamp.cloud/financeiro
- API: https://api.primecamp.cloud/api/financeiro/dashboard
