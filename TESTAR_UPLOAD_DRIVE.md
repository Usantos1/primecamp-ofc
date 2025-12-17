# Como Testar o Upload de Fotos para Google Drive

## ✅ Checklist Antes de Testar

1. **✅ Service Account configurado no Supabase?**
   - Vá em Supabase Dashboard > Project Settings > Edge Functions > Secrets
   - Verifique se existe `GOOGLE_SERVICE_ACCOUNT_JSON`

2. **✅ Pasta "PrimeCamp OS" compartilhada?**
   - No Google Drive, compartilhe a pasta com: `uander@calendar-456302.iam.gserviceaccount.com`
   - Permissão: "Editor" ou "Proprietário"

3. **✅ Edge Function deployada?**
   ```bash
   supabase functions deploy upload-to-drive
   ```

## 🧪 Como Testar

1. **Abra uma OS no sistema**
   - Vá para `/pdv/os/{id}/fotos` ou abra uma OS existente

2. **Vá na aba "Fotos"**

3. **Clique em "Adicionar Fotos Entrada"** (ou qualquer outro tipo)

4. **Selecione uma foto**

5. **Observe:**
   - Toast de "Upload em andamento..."
   - Toast de sucesso ou erro
   - Console do navegador (F12) para ver logs

## 🔍 Verificar se Funcionou

### No Sistema:
- A foto deve aparecer na galeria abaixo dos botões
- O contador deve aumentar (ex: "1 foto(s) cadastrada(s)")

### No Google Drive:
1. Acesse seu Google Drive
2. Vá na pasta "PrimeCamp OS"
3. Deve ter uma pasta "OS-{numero}"
4. Dentro deve ter a pasta "Entrada" (ou "Saida"/"Processo")
5. A foto deve estar lá com o nome: `OS-{numero}-entrada-YYYYMMDD-HHMMSS-1.jpg`

## ❌ Possíveis Erros

### Erro: "Service Account não configurado"
**Solução:** Configure o secret `GOOGLE_SERVICE_ACCOUNT_JSON` no Supabase

### Erro: "Insufficient permissions" ou "File not found"
**Solução:** 
- Compartilhe a pasta "PrimeCamp OS" com `uander@calendar-456302.iam.gserviceaccount.com`
- Dê permissão de "Editor"

### Erro: "Google Drive API não habilitada"
**Solução:**
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Vá em "APIs & Services" > "Library"
3. Procure "Google Drive API"
4. Clique em "Enable"

### Erro no console: "Failed to fetch" ou erro de rede
**Solução:**
- Verifique se a Edge Function foi deployada
- Verifique os logs da Edge Function no Supabase Dashboard

## 📝 Comandos Úteis

```bash
# Deploy da função
supabase functions deploy upload-to-drive

# Ver logs da função
supabase functions logs upload-to-drive

# Verificar secrets configurados
supabase secrets list
```

## 🎯 Teste Rápido

1. Abra o console do navegador (F12)
2. Vá na aba "Fotos" de uma OS
3. Clique em "Adicionar Fotos Entrada"
4. Selecione uma foto
5. Veja os logs no console
6. Verifique se aparece toast de sucesso
7. Verifique se a foto aparece na galeria
8. Verifique no Google Drive se a foto foi salva

