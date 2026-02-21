# Comandos VPS - Corrigir Erro nas Vagas

## Problema Corrigido
- Erro: `ReferenceError: showAlreadyAppliedModal is not defined`
- Solução: Estados faltantes adicionados no componente `JobApplicationSteps`

## Comandos para Atualizar no VPS

```bash
cd /root/primecamp-ofc && \
git pull origin main && \
npm run build && \
sudo rm -rf /var/www/primecamp.cloud/* && \
sudo cp -r dist/* /var/www/primecamp.cloud/ && \
sudo chown -R www-data:www-data /var/www/primecamp.cloud && \
sudo chmod -R 755 /var/www/primecamp.cloud && \
sudo systemctl reload nginx && \
echo "✅ Deploy concluído!"
```

## Verificar se Funcionou

Após o deploy:
1. Acesse: https://primecamp.cloud/vaga/[qualquer-slug]
2. A página deve carregar sem erros
3. O formulário de candidatura deve funcionar normalmente
