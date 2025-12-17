# Como Configurar o Google Drive - Passo a Passo

## Seu Token/Configuração

Você tem um arquivo JSON de **Service Account** do Google. Este é o arquivo correto! Você não precisa de um "token" separado.

## Passo 1: Compartilhar Pasta no Google Drive

1. Acesse seu Google Drive
2. Crie uma pasta chamada **"PrimeCamp OS"** (ou use uma existente)
3. Clique com botão direito na pasta > **"Compartilhar"**
4. Adicione o email da Service Account: **`uander@calendar-456302.iam.gserviceaccount.com`**
5. Dê permissão de **"Editor"** ou **"Proprietário"**
6. Clique em **"Enviar"**

⚠️ **IMPORTANTE:** Sem compartilhar a pasta, a Service Account não conseguirá criar arquivos!

## Passo 2: Configurar no Supabase

### Opção A: Via Dashboard (Recomendado)

1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **"Project Settings"** > **"Edge Functions"** > **"Secrets"**
3. Clique em **"Add new secret"**
4. Preencha:
   - **Name:** `GOOGLE_SERVICE_ACCOUNT_JSON`
   - **Value:** Cole o JSON completo que você tem (todo o conteúdo, incluindo `{` e `}`)
5. Clique em **"Save"**

### Opção B: Via CLI

```bash
# Salve seu JSON em um arquivo (ex: service-account.json)
# Depois execute:
supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON="$(cat service-account.json)"
```

## Passo 3: Deploy da Edge Function

```bash
supabase functions deploy upload-to-drive
```

## Passo 4: Testar

1. Abra uma OS no sistema
2. Vá na aba **"Fotos"**
3. Clique em **"Adicionar Fotos Entrada"** (ou qualquer outro tipo)
4. Selecione uma foto
5. A foto deve ser enviada para o Google Drive automaticamente!

## Estrutura que será criada no Drive

```
PrimeCamp OS/                    (Você precisa criar e compartilhar esta pasta)
  └── OS-{numero}/              (Criada automaticamente)
      ├── Entrada/               (Criada automaticamente)
      ├── Processo/              (Criada automaticamente)
      └── Saida/                 (Criada automaticamente)
```

## Troubleshooting

### Erro: "Service Account não configurado"
- Verifique se o secret `GOOGLE_SERVICE_ACCOUNT_JSON` está configurado
- Certifique-se de que copiou o JSON completo (todo o conteúdo)

### Erro: "Insufficient permissions" ou "File not found"
- **A pasta "PrimeCamp OS" foi compartilhada?** 
- Verifique se compartilhou com: `uander@calendar-456302.iam.gserviceaccount.com`
- A permissão deve ser "Editor" ou "Proprietário"

### Erro: "Google Drive API não habilitada"
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Vá em **"APIs & Services"** > **"Library"**
3. Procure por **"Google Drive API"**
4. Clique em **"Enable"**

## Seu JSON (exemplo do que deve ser configurado)

```json
{
  "type": "service_account",
  "project_id": "calendar-456302",
  "private_key_id": "f83e8ca88859d0937a6ff23be757f6e489e95938",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "uander@calendar-456302.iam.gserviceaccount.com",
  "client_id": "111698870774893947278",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/uander%40calendar-456302.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
```

**Cole este JSON completo no secret do Supabase!**

