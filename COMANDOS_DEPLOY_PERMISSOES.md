# 🚀 Deploy - Correção de Permissões (NPS e Ponto Eletrônico)

## ⚡ Deploy Rápido (Uma Linha)

```bash
cd /root/primecamp-ofc && git pull origin main && npm run build && sudo rm -rf /var/www/primecamp.cloud/* && sudo cp -r dist/* /var/www/primecamp.cloud/ && sudo chown -R www-data:www-data /var/www/primecamp.cloud && sudo chmod -R 755 /var/www/primecamp.cloud && sudo rm -rf /var/cache/nginx/* && sudo systemctl reload nginx && echo "✅ Deploy concluído!"
```

## 📋 O que foi corrigido:

1. **Permissões no Banco de Dados:**
   - ✅ `nps.view` e `rh.ponto` já estão associadas ao role "sales" (verificado via SQL)
   - ✅ Script `sql/CORRIGIR_PERMISSOES_VENDEDOR.sql` executado com sucesso

2. **Código Frontend:**
   - ✅ Mapeamento melhorado: "vendedor" → busca "sales" primeiro (que é o que está no banco)
   - ✅ Logs de debug adicionados para diagnosticar problemas
   - ✅ Menu "NPS" e "Ponto Eletrônico" já estão no AppSidebar com as permissões corretas

## 🔍 Como verificar se funcionou:

1. **Após o deploy, abra o console do navegador (F12)**
2. **Procure por logs que começam com `[usePermissions]`**
3. **Os logs devem mostrar:**
   - Qual role está sendo buscado
   - Se encontrou o role no banco
   - Quantas permissões foram carregadas
   - Quais permissões foram adicionadas

4. **Se ainda não aparecer:**
   - Limpe o cache do navegador (Ctrl+Shift+Delete)
   - Faça logout e login novamente
   - Verifique no console se há erros

## 📝 Deploy Manual (Passo a Passo)

```bash
# 1. Conectar na VPS
ssh usuario@seu-servidor

# 2. Navegar até o diretório do projeto
cd /root/primecamp-ofc

# 3. Buscar alterações
git pull origin main

# 4. Build do frontend
npm run build

# 5. Limpar diretório de deploy
sudo rm -rf /var/www/primecamp.cloud/*

# 6. Copiar arquivos buildados
sudo cp -r dist/* /var/www/primecamp.cloud/

# 7. Ajustar permissões
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo chmod -R 755 /var/www/primecamp.cloud

# 8. Limpar cache do Nginx
sudo rm -rf /var/cache/nginx/*

# 9. Recarregar Nginx
sudo systemctl reload nginx

# 10. Verificar status
sudo systemctl status nginx
```

## ⚠️ Importante:

- As permissões **já estão corretas no banco de dados** (verificado via SQL)
- O problema era no código que buscava as permissões
- Após o deploy, os logs no console ajudarão a diagnosticar se ainda houver problemas
