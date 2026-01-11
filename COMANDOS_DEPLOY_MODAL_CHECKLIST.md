# 🚀 Comandos de Deploy - Modal de Checklist de Entrada

## ✅ Últimas Alterações Commitadas

1. `feat: abrir modal de checklist após criar OS e imprimir 2 vias ao finalizar`
2. `feat: adicionar modal de checklist de entrada e função para finalizar e imprimir`
3. `feat: adicionar Dialog do modal de checklist de entrada`
4. `fix: adicionar indicador visual (*) nos campos obrigatórios Cor e Condições do Equipamento`

---

## 📋 Comandos para Deploy na VPS

### Opção 1: Script Automático (Recomendado)

```bash
cd /root/primecamp-ofc
git pull origin main
npm install
npm run build
sudo rm -rf /var/cache/nginx/* /var/www/primecamp.cloud/* /var/www/primecamp.cloud/.*
sleep 1
sudo cp -r dist/* /var/www/primecamp.cloud/
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo chmod -R 755 /var/www/primecamp.cloud
sudo nginx -t
sudo systemctl reload nginx
```

### Opção 2: Passo a Passo Manual

```bash
# 1. Entrar no diretório do projeto
cd /root/primecamp-ofc

# 2. Atualizar código
git pull origin main

# 3. Instalar dependências (se necessário)
npm install

# 4. Build do frontend
npm run build

# 5. Limpar cache do Nginx e arquivos antigos
sudo rm -rf /var/cache/nginx/*
sudo rm -rf /var/www/primecamp.cloud/*
sudo rm -rf /var/www/primecamp.cloud/.*
sleep 1

# 6. Copiar novos arquivos
sudo cp -r dist/* /var/www/primecamp.cloud/

# 7. Ajustar permissões
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo chmod -R 755 /var/www/primecamp.cloud

# 8. Testar configuração do Nginx
sudo nginx -t

# 9. Recarregar Nginx
sudo systemctl reload nginx
```

---

## 🧪 Como Testar Após o Deploy

1. **Limpar cache do navegador:**
   - `Ctrl + Shift + Delete` → Marcar "Cache" → "Limpar dados"
   - Ou usar modo anônimo: `Ctrl + Shift + N`

2. **Testar criação de OS:**
   - Acesse `/os/nova`
   - Preencha os campos obrigatórios (incluindo "Cor *" e "Condições do Equipamento *")
   - Clique em "Salvar"
   - **O modal de checklist deve abrir automaticamente**

3. **Testar checklist no modal:**
   - Marque alguns itens do checklist
   - Adicione observações (opcional)
   - Clique em "Finalizar Checklist e Imprimir"
   - **A OS deve ser impressa em 2 vias automaticamente**
   - **Você deve ser redirecionado para a OS editada**

4. **Verificar:**
   - Status da OS deve estar como "em_andamento"
   - Checklist de entrada deve estar salvo
   - Campos `printed_at` e `print_status` devem estar preenchidos no banco

---

## 📝 Notas Importantes

- ⚠️ **SEMPRE** limpe o cache do navegador após o deploy
- ⚠️ Faça **LOGOUT e LOGIN** novamente se necessário
- ⚠️ As impressões são automáticas (sem confirmação, sem nova aba)
- ⚠️ Se a impressão falhar, o checklist ainda será salvo (não bloqueia)

---

## 🔍 Verificar se Deploy Funcionou

```bash
# Verificar data/hora dos arquivos (deve ser recente)
ls -lh /var/www/primecamp.cloud/index.html

# Verificar se o código está no build (procurar por "showChecklistEntradaModal")
grep -o "showChecklistEntradaModal" /var/www/primecamp.cloud/assets/index-*.js | head -1
```
