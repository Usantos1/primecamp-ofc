# 🔧 Comandos para Diagnosticar e Corrigir

## Diagnóstico Completo

```bash
cd /root/primecamp-ofc
git pull origin main
chmod +x VERIFICAR_NGINX_E_ARQUIVOS.sh
./VERIFICAR_NGINX_E_ARQUIVOS.sh
```

Isso vai mostrar:
- Configuração do Nginx
- Se os arquivos foram deployados
- Se o componente está no bundle
- Status do cache

## Forçar Deploy Completo (Recomendado)

```bash
cd /root/primecamp-ofc
git pull origin main
chmod +x FORCAR_DEPLOY_COMPLETO.sh
./FORCAR_DEPLOY_COMPLETO.sh
```

Isso vai:
- Limpar tudo (dist, cache)
- Fazer build limpo
- Deploy completo
- Verificar se está correto
- Recarregar Nginx

## Depois do Deploy

No navegador:
1. F12 (DevTools)
2. Aba Network → Marcar "Disable cache"
3. Ctrl+Shift+R (hard refresh)
4. Ou fechar e abrir nova aba anônima

## Se ainda não funcionar

Envie a saída do script de diagnóstico para análise.
