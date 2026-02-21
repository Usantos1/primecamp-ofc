# ✅ Verificar se o Deploy Funcionou

## 🔍 Comandos para Verificar na VPS

```bash
# 1. Verificar data/hora dos arquivos (deve ser recente - após o build)
ls -lh /var/www/primecamp.cloud/index.html
ls -lh /var/www/primecamp.cloud/assets/index-*.js | head -1

# 2. Verificar se o arquivo JS contém as validações (procurar por "Cor do equipamento")
grep -o "Cor do equipamento" /var/www/primecamp.cloud/assets/index-*.js | head -1

# 3. Verificar tamanho do arquivo (para comparar)
ls -lh /var/www/primecamp.cloud/assets/index-*.js
```

---

## 🌐 Limpar Cache do Navegador (IMPORTANTE!)

### Opção 1: Hard Refresh (MAIS RÁPIDO)
- **Windows/Linux:** `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`

### Opção 2: Limpar Cache Completo
1. Pressione `Ctrl + Shift + Delete` (ou `Cmd + Shift + Delete` no Mac)
2. Selecione "Imagens e arquivos em cache" ou "Cache"
3. Período: "Última hora" ou "Todo o período"
4. Clique em "Limpar dados"

### Opção 3: Modo Anônimo/Privado (MELHOR PARA TESTAR)
- **Chrome/Edge:** `Ctrl + Shift + N` (ou `Cmd + Shift + N` no Mac)
- **Firefox:** `Ctrl + Shift + P` (ou `Cmd + Shift + P` no Mac)
- Abra `https://primecamp.cloud/os/nova` na aba anônima
- Faça login e teste

### Opção 4: Desabilitar Cache no DevTools (PARA DESENVOLVIMENTO)
1. Abra o DevTools (`F12`)
2. Vá na aba "Network" (Rede)
3. Marque a opção "Disable cache" (Desabilitar cache)
4. Mantenha o DevTools aberto enquanto testa

---

## ✅ Testar as Validações

Após limpar o cache:

1. Acesse `https://primecamp.cloud/os/nova`
2. Preencha os campos obrigatórios:
   - Cliente
   - Telefone
   - Marca
   - Modelo
   - Descrição do Problema
3. **DEIXE "Cor" VAZIO**
4. **DEIXE "Condições do Equipamento" VAZIO**
5. Clique em "Salvar"
6. **DEVE aparecer um toast/erro:** "Cor do equipamento é obrigatória"
7. Preencha a Cor
8. Clique em "Salvar" novamente
9. **DEVE aparecer um toast/erro:** "Condições do equipamento são obrigatórias"

---

## 🐛 Se Ainda Não Funcionar

### Verificar se o código está no build:

```bash
# Na VPS, verificar o conteúdo do arquivo JS
grep -c "Cor do equipamento" /var/www/primecamp.cloud/assets/index-*.js
```

Se retornar `0` ou nada, o código não está no build. Nesse caso:

1. Verificar se o código foi commitado:
   ```bash
   git log --oneline -1
   git show HEAD:src/pages/assistencia/OrdemServicoForm.tsx | grep -A 3 "Cor do equipamento"
   ```

2. Se não estiver, fazer commit e push novamente

3. Fazer build novamente na VPS:
   ```bash
   cd /root/primecamp-ofc
   git pull origin main
   rm -rf dist
   npm run build
   sudo rm -rf /var/www/primecamp.cloud/*
   sudo cp -r dist/* /var/www/primecamp.cloud/
   sudo systemctl reload nginx
   ```

---

## 📋 Checklist Final

- [ ] Arquivos na VPS foram atualizados (data/hora recente)
- [ ] Cache do navegador foi limpo (hard refresh ou modo anônimo)
- [ ] Logout e login feito novamente
- [ ] Testado deixar "Cor" vazio → erro aparece?
- [ ] Testado deixar "Condições" vazio → erro aparece?
- [ ] Testado preencher tudo → OS é criada e navega para checklist?
