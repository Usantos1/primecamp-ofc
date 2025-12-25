# 📋 CONTRATOS DE API - FRONTEND → BACKEND

**Data:** $(date)
**Objetivo:** Documentar TODOS os contratos esperados pelo frontend

---

## 🔍 METODOLOGIA

Este documento foi gerado analisando TODAS as chamadas do frontend para:
- `apiClient.invokeFunction()`
- `apiClient.uploadFile()`
- `from('tabela')` → Endpoints já existentes no backend

**Regra:** Não inventar campos - apenas documentar o que o frontend realmente envia e espera receber.

---

## 📊 TABELA DE CONTRATOS

### 1. STORAGE

| Endpoint | Método | Payload Request | Response Esperado | Arquivo Frontend |
|----------|--------|-----------------|-------------------|------------------|
| `/api/storage/upload` | POST | **Content-Type:** `multipart/form-data`<br><br>**Campos:**<br>- `file`: File (obrigatório)<br>- `bucket`: string (ex: "os-reference-images")<br>- `path`: string (ex: "celular-referencia-1234567890.jpg")<br>- `cacheControl`: string (ex: "3600")<br>- `upsert`: boolean (ex: true)<br>- `contentType`: string (ex: "image/jpeg") | `{ url: string, path: string }`<br><br>**Exemplo:**<br>`{ url: "https://...", path: "celular-referencia-1234567890.jpg" }` | `src/hooks/useOSImageReference.ts` |

---

### 2. FUNCTIONS - ADMINISTRAÇÃO DE USUÁRIOS

| Endpoint | Método | Payload Request | Response Esperado | Arquivo Frontend |
|----------|--------|-----------------|-------------------|------------------|
| `/api/functions/admin-get-user` | POST | `{ userId: string }`<br><br>**Exemplo:**<br>`{ userId: "uuid-do-usuario" }` | `{ user: { id: string, email: string, ... }, profile?: {...} }`<br><br>**Estrutura esperada:**<br>`{ data: { user: { email: string, ... } } }` | `src/components/UserManagementNew.tsx`<br>`src/components/UserEditModal.tsx` |
| `/api/functions/admin-update-user` | POST | `{ userId: string, email?: string, password?: string }`<br><br>**Exemplo:**<br>`{ userId: "uuid", email: "novo@email.com", password: "novaSenha123" }`<br><br>**Nota:** Campos opcionais - apenas enviar se for alterar | `{ success: boolean, message?: string }`<br><br>**Estrutura esperada:**<br>`{ data: { ... } }` ou `{ error: string }` | `src/components/UserManagementNew.tsx`<br>`src/components/UserEditModal.tsx` |
| `/api/functions/admin-delete-user` | POST | `{ userId: string }`<br><br>**Exemplo:**<br>`{ userId: "uuid-do-usuario" }`<br><br>**Nota:** Alguns arquivos enviam `body: { userId }` mas o wrapper é removido | `{ success: boolean, message?: string, warning?: boolean }`<br><br>**Estrutura esperada:**<br>`{ data: { success: true, message: "..." } }` ou `{ error: string }` | `src/components/UserManagement.tsx`<br>`src/components/UserManagementNew.tsx` |

---

### 3. FUNCTIONS - DISC TEST

| Endpoint | Método | Payload Request | Response Esperado | Arquivo Frontend |
|----------|--------|-----------------|-------------------|------------------|
| `/api/functions/disc-answer` | POST | `{ sessionId: string, questionId: number, selectedType: 'D' \| 'I' \| 'S' \| 'C', idempotencyKey: string }`<br><br>**Exemplo:**<br>`{ sessionId: "uuid", questionId: 1, selectedType: "D", idempotencyKey: "unique-key" }` | `{ success: boolean, data?: {...}, error?: {...} }`<br><br>**Estrutura esperada:**<br>`{ data: { ... } }` ou `{ error: { message: string } }` | `src/hooks/useCandidateDiscTest.ts` |
| `/api/functions/disc-finish` | POST | **Headers:** `Idempotency-Key: string`<br><br>**Body:**<br>`{ testSessionId: string }`<br><br>**Exemplo:**<br>`{ testSessionId: "uuid" }` | `{ success: boolean, resultId?: string, error?: { message: string } }`<br><br>**Nota:** Se erro 409 (ALREADY_FINISHED), frontend trata como sucesso e redireciona | `src/hooks/useCandidateDiscTest.ts` |
| `/api/functions/disc-session-status` | POST | `{ sessionId: string }`<br><br>**Exemplo:**<br>`{ sessionId: "uuid" }` | `{ status: 'IN_PROGRESS' \| 'FINISHED', resultId?: string }`<br><br>**Estrutura esperada:**<br>`{ data: { status: "FINISHED", resultId: "uuid" } }` | `src/hooks/useCandidateDiscTest.ts` |

---

### 4. FUNCTIONS - JOB APPLICATION

| Endpoint | Método | Payload Request | Response Esperado | Arquivo Frontend |
|----------|--------|-----------------|-------------------|------------------|
| `/api/functions/job-application-save-draft` | POST | `{ survey_id: string, email: string, name?: string \| null, phone?: string \| null, age?: number \| null, cep?: string \| null, address?: string \| null, whatsapp?: string \| null, instagram?: string \| null, linkedin?: string \| null, responses?: object, current_step?: number, form_data?: object }` | `{ success: boolean, draftId?: string, error?: string }` | `src/pages/JobApplicationSteps.tsx` |
| `/api/functions/job-application-submit` | POST | **Headers:** `Idempotency-Key: string` (opcional)<br><br>**Body:**<br>`{ survey_id: string, name: string, email: string, phone?: string \| null, age?: number \| null, address?: string \| null, cep?: string \| null, whatsapp?: string \| null, instagram?: string \| null, linkedin?: string \| null, responses?: object }` | `{ submissionId?: string, job_response_id?: string, success: boolean }`<br><br>**Nota:** Frontend usa `submissionId` ou `job_response_id` | `src/pages/JobApplication.tsx`<br>`src/pages/JobApplicationSteps.tsx` |
| `/api/functions/analyze-candidate-responses` | POST | `{ job_response_id: string, survey_id: string, candidate: { name: string, email: string, phone?: string, age?: number, responses?: object, disc_final?: null }, job: { title: string, position_title: string, description: string, department?: string, requirements?: string[], work_modality?: string, contract_type?: string, seniority?: string } }` | `{ success: boolean, analysis?: {...}, error?: string }` | `src/pages/JobApplicationSteps.tsx` |

---

### 5. FUNCTIONS - CANDIDATE ANALYSIS

| Endpoint | Método | Payload Request | Response Esperado | Arquivo Frontend |
|----------|--------|-----------------|-------------------|------------------|
| `/api/functions/analyze-candidate` | POST | `{ job_response_id: string, survey_id: string, candidate_data: { name: string, email: string, age?: number, phone?: string, responses?: object, disc_profile?: { d_score: number, i_score: number, s_score: number, c_score: number, dominant_profile: string } }, job_data: { title: string, position_title: string, description: string, requirements?: string[], work_modality?: string, contract_type?: string } }` | `{ success: boolean, analysis?: {...}, score?: number, recommendation?: string, error?: string }` | `src/pages/CandidateDisc.tsx`<br>`src/pages/admin/TalentBank.tsx`<br>`src/components/AdminJobSurveysManager.tsx` |

---

### 6. FUNCTIONS - JOB SURVEYS

| Endpoint | Método | Payload Request | Response Esperado | Arquivo Frontend |
|----------|--------|-----------------|-------------------|------------------|
| `/api/functions/generate-job-assets` | POST | `{ job: { title: string, position_title: string, description: string, department?: string, company_name?: string, location?: string, requirements?: string[], benefits?: string[], work_modality?: string, work_schedule?: string, work_days?: string[], daily_schedule?: string, lunch_break?: string, weekly_hours?: number, contract_type?: string, salary_range?: string, salary_min?: number, salary_max?: number, has_commission?: boolean, commission_details?: string }, provider: string, apiKey: string, model: string, locale: string }` | `{ success: boolean, assets?: {...}, error?: string }` | `src/components/AdminJobSurveysManager.tsx` |
| `/api/functions/generate-dynamic-questions` | POST | `{ survey: { id: string, title: string, position_title: string, description: string, department?: string, requirements?: string[], work_modality?: string, contract_type?: string, seniority?: string }, base_questions?: array, provider?: string, apiKey?: string, model?: string }` | `{ success: boolean, dynamic_questions?: array, error?: string }`<br><br>**Nota:** Frontend espera `data.dynamic_questions` como array | `src/pages/JobApplicationSteps.tsx`<br>`src/components/AdminJobSurveysManager.tsx` |

---

### 7. FUNCTIONS - INTERVIEWS

| Endpoint | Método | Payload Request | Response Esperado | Arquivo Frontend |
|----------|--------|-----------------|-------------------|------------------|
| `/api/functions/generate-interview-questions` | POST | `{ job_response_id: string, survey_id: string, interview_type: string, ai_analysis?: object }`<br><br>**Nota:** Alguns arquivos enviam `body: {...}` mas o wrapper é removido | `{ success: boolean, questions?: array, error?: string }` | `src/pages/AdminInterviews.tsx` |
| `/api/functions/evaluate-interview-transcription` | POST | `{ interview_id: string, transcription: string, interview_type: string, job_response_id: string, survey_id: string, include_profile_analysis?: boolean }`<br><br>**Nota:** Alguns arquivos enviam `body: {...}` mas o wrapper é removido | `{ success: boolean, evaluation?: {...}, error?: string }` | `src/pages/AdminInterviews.tsx`<br>`src/pages/admin/InterviewEvaluation.tsx` |

---

### 8. FUNCTIONS - TELEGRAM

| Endpoint | Método | Payload Request | Response Esperado | Arquivo Frontend |
|----------|--------|-----------------|-------------------|------------------|
| `/api/functions/telegram-bot` | POST | **Ação 1 - Enviar foto:**<br>`{ file: string (base64), fileName: string, osNumero: string, tipo: string, chatId?: string, caption?: string }`<br><br>**Ação 2 - Deletar mensagem:**<br>`{ action: "delete", chatId: string, messageId: number }` | **Enviar foto:**<br>`{ success: boolean, messageId?: number, fileId?: string, fileUrl?: string, thumbnailUrl?: string, postLink?: string, error?: string }`<br><br>**Deletar:**<br>`{ success: boolean, error?: string }` | `src/hooks/useTelegram.ts` |

---

### 9. FUNCTIONS - OUTRAS

| Endpoint | Método | Payload Request | Response Esperado | Arquivo Frontend |
|----------|--------|-----------------|-------------------|------------------|
| `/api/functions/daily-nps-reminder` | POST | `{}` (sem body) | `{ success: boolean, message?: string, error?: string }` | `src/pages/Integration.tsx` |
| `/api/functions/get-candidate-data` | POST | `{ protocol: string }`<br><br>**Exemplo:**<br>`{ protocol: "APP-A1B2C3D4" }` | `{ success: boolean, data?: {...}, error?: string }` | `src/hooks/useJobSurveys.ts` |
| `/api/functions/upload-to-drive` | POST | `{ file: string (base64), fileName: string, osNumero: string, tipo: string, mimeType: string, folderId?: string }` | `{ success: boolean, fileId?: string, webViewLink?: string, error?: string }` | `src/utils/driveUpload.ts` |

---

## 📊 ENDPOINTS DE BANCO DE DADOS (JÁ EXISTENTES)

### Query (SELECT)
**Endpoint:** `POST /api/query/:table`

**Request:**
```json
{
  "select": "*" | ["campo1", "campo2"],
  "where": {
    "campo": "valor",
    "campo2__gt": 100,
    "campo3__like": "%texto%",
    "campo4__in": [1, 2, 3],
    "__or": "campo1.ilike.%valor%,campo2.eq.valor"
  },
  "orderBy": {
    "field": "created_at",
    "ascending": false
  },
  "limit": 10,
  "offset": 0
}
```

**Response:**
```json
{
  "rows": [...],
  "count": 10
}
```

---

### Insert
**Endpoint:** `POST /api/insert/:table`

**Request:**
```json
{
  "campo1": "valor1",
  "campo2": "valor2"
}
```

**Response:**
```json
{
  "data": { "id": "...", "campo1": "valor1", ... },
  "rows": [{ "id": "...", ... }]
}
```

---

### Update
**Endpoint:** `POST /api/update/:table`

**Request:**
```json
{
  "data": {
    "campo": "novoValor"
  },
  "where": {
    "id": "uuid"
  }
}
```

**Response:**
```json
{
  "data": [{ "id": "...", "campo": "novoValor", ... }],
  "rows": [{ "id": "...", ... }],
  "count": 1
}
```

---

### Delete
**Endpoint:** `POST /api/delete/:table`

**Request:**
```json
{
  "where": {
    "id": "uuid"
  }
}
```

**Response:**
```json
{
  "data": {...},
  "rows": [...],
  "count": 1
}
```

---

## ⚠️ NOTAS IMPORTANTES

1. **Wrapper `body:` removido:** Alguns arquivos ainda têm `body: {...}` no código, mas o `apiClient.invokeFunction()` remove esse wrapper automaticamente.

2. **Headers de Idempotency:** Alguns endpoints usam header `Idempotency-Key` ou `idempotency-key` (case-insensitive).

3. **Formato de Response:** Todos os endpoints devem retornar:
   - Sucesso: `{ data: {...} }`
   - Erro: `{ error: string }` ou `{ error: { message: string } }`

4. **Autenticação:** Todos os endpoints requerem header `Authorization: Bearer {token}` (exceto endpoints públicos).

5. **Content-Type:** 
   - JSON: `application/json`
   - Upload: `multipart/form-data` (sem Content-Type header - browser define automaticamente)

---

## 📝 TABELAS MAIS USADAS NO FRONTEND

Baseado nas chamadas `from('tabela')`:

- `profiles` - Perfis de usuários
- `sales` - Vendas (PDV)
- `sale_items` - Itens de venda
- `payments` - Pagamentos
- `cash_register_sessions` - Sessões de caixa
- `cash_movements` - Movimentações de caixa
- `departments` - Departamentos
- `user_position_departments` - Posições de usuários
- `job_responses` - Respostas de candidatos
- `job_surveys` - Pesquisas de vagas
- `candidate_responses` - Respostas DISC
- `disc_test_results` - Resultados DISC
- `job_interviews` - Entrevistas
- `job_candidate_ai_analysis` - Análises de IA
- `ordens_servico` - Ordens de serviço
- `clientes` - Clientes
- `produtos` - Produtos
- `kv_store_2c4defad` - Key-value store (configurações)

---

**Total de endpoints necessários:** 19 edge functions + 4 CRUD básicos (já existentes) + 1 storage

