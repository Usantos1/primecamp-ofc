# Configuração do Google Drive para Upload de Fotos

## Passo 1: Criar Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a **Google Drive API**:
   - Vá em "APIs & Services" > "Library"
   - Procure por "Google Drive API"
   - Clique em "Enable"

## Passo 2: Criar Credenciais OAuth 2.0

1. Vá em "APIs & Services" > "Credentials"
2. Clique em "Create Credentials" > "OAuth client ID"
3. Se solicitado, configure a tela de consentimento OAuth:
   - Tipo: "Internal" (para uso interno) ou "External" (para uso público)
   - Preencha os campos obrigatórios
4. Tipo de aplicativo: "Web application"
5. Adicione URLs autorizadas:
   - `http://localhost:3000` (desenvolvimento)
   - Sua URL de produção
6. Salve o **Client ID** e **Client Secret**

## Passo 3: Obter Token de Acesso

### Opção A: Token de Longa Duração (Service Account - Recomendado)

1. Vá em "APIs & Services" > "Credentials"
2. Clique em "Create Credentials" > "Service account"
3. Preencha os dados e crie a conta de serviço
4. Vá em "Keys" > "Add Key" > "Create new key" > "JSON"
5. Baixe o arquivo JSON
6. Compartilhe a pasta "PrimeCamp OS" no Google Drive com o email da service account
7. Use o token JWT do arquivo JSON

### Opção B: Token OAuth 2.0 (Para testes)

1. Use o [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Configure com suas credenciais
3. Selecione escopos:
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/drive`
4. Autorize e obtenha o token de acesso
5. **Nota:** Este token expira em 1 hora. Para produção, use Service Account.

## Passo 4: Compartilhar Pasta no Google Drive

1. Acesse seu Google Drive
2. Crie uma pasta chamada **"PrimeCamp OS"** (ou use uma existente)
3. Clique com botão direito na pasta > "Compartilhar"
4. Adicione o email da Service Account: `uander@calendar-456302.iam.gserviceaccount.com`
5. Dê permissão de **"Editor"** ou **"Proprietário"**
6. Clique em "Enviar"

## Passo 5: Configurar no Supabase

### Via Dashboard do Supabase:

1. Acesse seu projeto no Supabase Dashboard
2. Vá em "Project Settings" > "Edge Functions" > "Secrets"
3. Adicione o secret:
   - **Nome:** `GOOGLE_SERVICE_ACCOUNT_JSON`
   - **Valor:** Cole o JSON completo da Service Account (todo o conteúdo do arquivo JSON que você baixou)

**IMPORTANTE:** Cole o JSON completo, incluindo todas as chaves. Exemplo:
```json
{
  "type": "service_account",
  "project_id": "calendar-456302",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "uander@calendar-456302.iam.gserviceaccount.com",
  ...
}
```

### Via CLI:

```bash
# Primeiro, salve o JSON em um arquivo (ex: service-account.json)
supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON="$(cat service-account.json)"
```

**OU** cole o JSON diretamente (substitua pelo seu JSON completo):
```bash
supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"calendar-456302",...}'
```

## Passo 6: Deploy da Edge Function

```bash
supabase functions deploy upload-to-drive
```

## Estrutura de Pastas no Drive

Após a primeira foto ser enviada, a seguinte estrutura será criada automaticamente:

```
PrimeCamp OS/                    (Pasta raiz)
  └── OS-{numero}/              (Pasta da ordem de serviço)
      ├── Entrada/               (Fotos de entrada)
      ├── Processo/              (Fotos durante o reparo)
      └── Saida/                 (Fotos de saída/entrega)
```

## Nomenclatura dos Arquivos

- **Entrada:** `OS-123-entrada-20250116-143022-1.jpg`
- **Processo:** `OS-123-processo-20250116-150000-1.jpg`
- **Saída:** `OS-123-saida-20250116-180000-1.jpg`

Formato: `OS-{numero}-{tipo}-{data}-{hora}-{index}.jpg`

## Permissões Necessárias

A conta de serviço ou o usuário OAuth precisa ter:
- Acesso de escrita na pasta "PrimeCamp OS" no Google Drive
- Permissão para criar pastas e arquivos

## Troubleshooting

### Erro: "Service Account do Google Drive não configurado"
- Verifique se o secret `GOOGLE_SERVICE_ACCOUNT_JSON` está configurado no Supabase
- Verifique se o JSON está completo e válido
- Certifique-se de que copiou todo o conteúdo do arquivo JSON, incluindo as chaves `{` e `}`

### Erro: "Insufficient permissions"
- Verifique se a service account tem acesso à pasta "PrimeCamp OS"
- Compartilhe a pasta com o email da service account

### Erro: "File not found"
- Verifique se a Google Drive API está habilitada no projeto
- Verifique se as credenciais estão corretas

