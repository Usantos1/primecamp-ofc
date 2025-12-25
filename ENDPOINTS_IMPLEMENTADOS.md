# 📋 ENDPOINTS IMPLEMENTADOS

**Data:** $(date)
**Escopo:** Storage Upload + Admin Users + DISC Test Functions

---

## 1. STORAGE - UPLOAD DE ARQUIVOS

### POST /api/storage/upload

**Descrição:** Faz upload de arquivos (imagens) para o servidor.

**Autenticação:** ✅ Requerida (Bearer Token)

**Content-Type:** `multipart/form-data`

**Request:**
- **Campo `file`:** Arquivo (obrigatório)
- **Campo `bucket`:** Nome do bucket (opcional)
- **Campo `path`:** Caminho do arquivo (opcional)
- **Campo `cacheControl`:** Cache control (opcional)
- **Campo `upsert`:** Boolean (opcional)
- **Campo `contentType`:** Tipo MIME (opcional)

**Validações:**
- ✅ Arquivo obrigatório
- ✅ Tamanho máximo: 10MB
- ✅ Apenas imagens (mimetype começa com `image/`)

**Response (Sucesso):**
```json
{
  "url": "http://localhost:3000/uploads/1234567890-123456789.jpg",
  "path": "celular-referencia-1234567890.jpg"
}
```

**Response (Erro):**
```json
{
  "error": "Arquivo não fornecido"
}
```

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/api/storage/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/caminho/para/imagem.jpg" \
  -F "bucket=os-reference-images" \
  -F "path=celular-referencia-1234567890.jpg" \
  -F "cacheControl=3600" \
  -F "upsert=true" \
  -F "contentType=image/jpeg"
```

**Nota:** 
- Arquivos são salvos em `server/uploads/`
- Em produção, integrar com S3, GCS ou Google Drive
- Configurar `STORAGE_BASE_URL` no `.env` para URL pública

---

## 2. ADMIN - GET USER

### POST /api/functions/admin-get-user

**Descrição:** Busca dados de um usuário (apenas admin).

**Autenticação:** ✅ Requerida (Bearer Token) + ✅ Requer Role Admin

**Request Body:**
```json
{
  "userId": "uuid-do-usuario"
}
```

**Validações:**
- ✅ `userId` obrigatório
- ✅ Usuário deve ser admin
- ✅ Usuário deve existir

**Response (Sucesso):**
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "usuario@email.com",
      "email_verified": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "profile": {
      "id": "uuid",
      "user_id": "uuid",
      "display_name": "Nome do Usuário",
      "role": "member",
      "department": "TI",
      ...
    }
  }
}
```

**Response (Erro):**
```json
{
  "error": "userId é obrigatório"
}
```

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/api/functions/admin-get-user \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid-do-usuario"
  }'
```

**SQL Usado:**
```sql
-- Buscar usuário
SELECT id, email, email_verified, created_at 
FROM users 
WHERE id = $1;

-- Buscar profile
SELECT * 
FROM profiles 
WHERE user_id = $1;
```

---

## 3. ADMIN - UPDATE USER

### POST /api/functions/admin-update-user

**Descrição:** Atualiza email e/ou senha de um usuário (apenas admin).

**Autenticação:** ✅ Requerida (Bearer Token) + ✅ Requer Role Admin

**Request Body:**
```json
{
  "userId": "uuid-do-usuario",
  "email": "novo@email.com",  // Opcional
  "password": "novaSenha123"   // Opcional
}
```

**Validações:**
- ✅ `userId` obrigatório
- ✅ Usuário deve ser admin
- ✅ Email não pode estar em uso por outro usuário
- ✅ Senha deve ter pelo menos 6 caracteres
- ✅ Pelo menos um campo (email ou password) deve ser fornecido

**Response (Sucesso):**
```json
{
  "data": {
    "success": true,
    "user": {
      "id": "uuid",
      "email": "novo@email.com",
      "email_verified": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Response (Erro):**
```json
{
  "error": "Este email já está em uso por outro usuário"
}
```

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/api/functions/admin-update-user \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid-do-usuario",
    "email": "novo@email.com",
    "password": "novaSenha123"
  }'
```

**SQL Usado:**
```sql
-- Verificar se email já existe
SELECT id 
FROM users 
WHERE email = $1 AND id != $2;

-- Atualizar usuário
UPDATE users
SET email = $1, password_hash = $2, updated_at = NOW()
WHERE id = $3
RETURNING id, email, email_verified, created_at;
```

**Validações Implementadas:**
- ✅ Verificação de email duplicado
- ✅ Hash de senha com bcrypt (10 rounds)
- ✅ Validação de tamanho mínimo de senha

---

## 4. ADMIN - DELETE USER

### POST /api/functions/admin-delete-user

**Descrição:** Deleta um usuário e seu profile (apenas admin).

**Autenticação:** ✅ Requerida (Bearer Token) + ✅ Requer Role Admin

**Request Body:**
```json
{
  "userId": "uuid-do-usuario"
}
```

**Validações:**
- ✅ `userId` obrigatório
- ✅ Usuário deve ser admin
- ✅ Não pode deletar próprio usuário
- ✅ Usuário deve existir

**Response (Sucesso):**
```json
{
  "data": {
    "success": true,
    "message": "Usuário deletado com sucesso"
  }
}
```

**Response (Erro - Foreign Key):**
```json
{
  "error": "Não é possível deletar este usuário pois ele possui registros relacionados",
  "warning": true
}
```

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/api/functions/admin-delete-user \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid-do-usuario"
  }'
```

**SQL Usado:**
```sql
-- Verificar se usuário existe
SELECT id, email 
FROM users 
WHERE id = $1;

-- Deletar profile primeiro (devido a foreign key)
DELETE FROM profiles 
WHERE user_id = $1;

-- Deletar usuário
DELETE FROM users 
WHERE id = $1;
```

**Validações Implementadas:**
- ✅ Prevenção de auto-deleção
- ✅ Tratamento de erro de foreign key (código 23503)

---

## 5. DISC - ANSWER

### POST /api/functions/disc-answer

**Descrição:** Salva uma resposta do teste DISC.

**Autenticação:** ✅ Requerida (Bearer Token)

**Request Body:**
```json
{
  "sessionId": "uuid-da-sessao",
  "questionId": 1,
  "selectedType": "D",
  "idempotencyKey": "unique-key-123"
}
```

**Validações:**
- ✅ `sessionId` obrigatório
- ✅ `questionId` obrigatório
- ✅ `selectedType` obrigatório e deve ser 'D', 'I', 'S' ou 'C'
- ✅ Sessão deve existir
- ✅ Sessão não pode estar completa

**Response (Sucesso):**
```json
{
  "data": {
    "success": true,
    "sessionId": "uuid",
    "questionId": 1,
    "selectedType": "D",
    "totalResponses": 5
  }
}
```

**Response (Erro - Teste já finalizado):**
```json
{
  "error": "Teste já foi finalizado"
}
```

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/api/functions/disc-answer \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "uuid-da-sessao",
    "questionId": 1,
    "selectedType": "D",
    "idempotencyKey": "unique-key-123"
  }'
```

**SQL Usado:**
```sql
-- Buscar sessão
SELECT * 
FROM candidate_responses 
WHERE id = $1;

-- Atualizar respostas
UPDATE candidate_responses 
SET responses = $1, updated_at = NOW() 
WHERE id = $2;
```

**Lógica Implementada:**
- ✅ Carrega respostas existentes (JSON)
- ✅ Remove resposta anterior para mesma questão (evita duplicatas)
- ✅ Adiciona nova resposta
- ✅ Salva no banco como JSON

---

## 6. DISC - FINISH

### POST /api/functions/disc-finish

**Descrição:** Finaliza o teste DISC e calcula os scores.

**Autenticação:** ✅ Requerida (Bearer Token)

**Headers:**
- `Idempotency-Key`: string (opcional, para evitar duplicatas)

**Request Body:**
```json
{
  "testSessionId": "uuid-da-sessao"
}
```

**Validações:**
- ✅ `testSessionId` obrigatório
- ✅ Sessão deve existir
- ✅ Sessão não pode estar completa (idempotência)

**Response (Sucesso):**
```json
{
  "data": {
    "success": true,
    "resultId": "uuid-da-sessao",
    "scores": {
      "d": 10,
      "i": 5,
      "s": 3,
      "c": 2
    },
    "dominantProfile": "D"
  }
}
```

**Response (Erro - Já finalizado):**
```json
{
  "error": "ALREADY_FINISHED",
  "message": "Teste já foi finalizado",
  "resultId": "uuid-da-sessao"
}
```

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/api/functions/disc-finish \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-123" \
  -d '{
    "testSessionId": "uuid-da-sessao"
  }'
```

**SQL Usado:**
```sql
-- Buscar sessão
SELECT * 
FROM candidate_responses 
WHERE id = $1;

-- Atualizar com scores e marcar como completo
UPDATE candidate_responses 
SET is_completed = true, 
    d_score = $1, 
    i_score = $2, 
    s_score = $3, 
    c_score = $4,
    dominant_profile = $5,
    completion_date = NOW(),
    updated_at = NOW()
WHERE id = $6;
```

**Lógica Implementada:**
- ✅ Carrega respostas do teste
- ✅ Calcula scores (contagem de D, I, S, C)
- ✅ Determina perfil dominante (maior score)
- ✅ Salva scores e marca como completo
- ✅ Idempotência: retorna 409 se já finalizado

---

## 7. DISC - SESSION STATUS

### POST /api/functions/disc-session-status

**Descrição:** Verifica o status de uma sessão de teste DISC.

**Autenticação:** ✅ Requerida (Bearer Token)

**Request Body:**
```json
{
  "sessionId": "uuid-da-sessao"
}
```

**Validações:**
- ✅ `sessionId` obrigatório
- ✅ Sessão deve existir

**Response (Em Progresso):**
```json
{
  "data": {
    "status": "IN_PROGRESS"
  }
}
```

**Response (Finalizado):**
```json
{
  "data": {
    "status": "FINISHED",
    "resultId": "uuid-da-sessao",
    "scores": {
      "d": 10,
      "i": 5,
      "s": 3,
      "c": 2
    },
    "dominantProfile": "D"
  }
}
```

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/api/functions/disc-session-status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "uuid-da-sessao"
  }'
```

**SQL Usado:**
```sql
SELECT id, is_completed, d_score, i_score, s_score, c_score, dominant_profile
FROM candidate_responses 
WHERE id = $1;
```

**Lógica Implementada:**
- ✅ Verifica se teste está completo
- ✅ Retorna status e scores se finalizado
- ✅ Retorna apenas status se em progresso

---

## 📊 ESTRUTURA DE TABELAS NECESSÁRIAS

### Tabela `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'member',
  department VARCHAR(255),
  phone VARCHAR(50),
  approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela `candidate_responses`
```sql
CREATE TABLE candidate_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  age INTEGER,
  whatsapp VARCHAR(50),
  email VARCHAR(255),
  test_id UUID,
  responses JSONB DEFAULT '[]',
  is_completed BOOLEAN DEFAULT false,
  d_score INTEGER DEFAULT 0,
  i_score INTEGER DEFAULT 0,
  s_score INTEGER DEFAULT 0,
  c_score INTEGER DEFAULT 0,
  dominant_profile VARCHAR(50),
  completion_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔒 SEGURANÇA

### Middleware de Autenticação
- ✅ Todos os endpoints requerem token JWT válido
- ✅ Endpoints admin verificam role `admin` na tabela `profiles`

### Validações
- ✅ Validação de tipos de arquivo (apenas imagens)
- ✅ Limite de tamanho de arquivo (10MB)
- ✅ Validação de campos obrigatórios
- ✅ Validação de formato de email
- ✅ Validação de tamanho mínimo de senha
- ✅ Prevenção de auto-deleção
- ✅ Verificação de duplicatas (email)

### Tratamento de Erros
- ✅ Códigos HTTP apropriados (400, 401, 403, 404, 409, 500)
- ✅ Mensagens de erro claras
- ✅ Logs detalhados no servidor

---

## 📝 NOTAS DE IMPLEMENTAÇÃO

1. **Storage:** Arquivos salvos localmente em `server/uploads/`. Em produção, integrar com S3/GCS/Drive.

2. **Admin Functions:** Verificação de role admin via query na tabela `profiles`.

3. **DISC Functions:** Respostas armazenadas como JSONB no PostgreSQL. Cálculo de scores feito no backend.

4. **Idempotência:** Endpoint `disc-finish` retorna 409 se já finalizado, permitindo retry seguro.

5. **Autenticação:** Middleware ajustado para permitir `/api/functions/*` e `/api/storage/*` com autenticação própria.

---

## ✅ TESTES RECOMENDADOS

1. **Storage Upload:**
   - ✅ Upload de imagem válida
   - ✅ Upload de arquivo não-imagem (deve falhar)
   - ✅ Upload sem arquivo (deve falhar)
   - ✅ Upload maior que 10MB (deve falhar)

2. **Admin Functions:**
   - ✅ Buscar usuário existente
   - ✅ Buscar usuário inexistente
   - ✅ Atualizar email válido
   - ✅ Atualizar email duplicado (deve falhar)
   - ✅ Deletar usuário sem dependências
   - ✅ Deletar próprio usuário (deve falhar)
   - ✅ Acesso sem ser admin (deve falhar)

3. **DISC Functions:**
   - ✅ Salvar resposta válida
   - ✅ Salvar resposta com tipo inválido (deve falhar)
   - ✅ Finalizar teste válido
   - ✅ Finalizar teste já finalizado (deve retornar 409)
   - ✅ Verificar status em progresso
   - ✅ Verificar status finalizado

---

**Total de endpoints implementados:** 7

