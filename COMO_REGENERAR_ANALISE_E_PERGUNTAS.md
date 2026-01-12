# Como Regenerar Análise de IA e Perguntas de Entrevista

## 1. Onde estão os dados?

As análises de IA e perguntas de entrevista **ESTÃO NO BANCO**, mas podem estar escondidas devido ao filtro de `company_id`.

### Verificar no banco:

```sql
-- Ver análises de IA
SELECT 
    id, 
    job_response_id, 
    analysis_data,
    company_id,
    created_at
FROM job_candidate_ai_analysis
ORDER BY created_at DESC
LIMIT 10;

-- Ver perguntas de entrevista
SELECT 
    id,
    job_response_id,
    questions,
    company_id,
    status,
    created_at
FROM job_interviews
ORDER BY created_at DESC
LIMIT 10;
```

## 2. Como Refazer Análise de IA

### Opção A: Pela lista de candidatos (Talent Bank)

1. Acesse: **Admin > Talent Bank** (ou a lista de candidatos da vaga)
2. Encontre o candidato que precisa de análise
3. Clique no botão **"Analisar IA"** (ícone de cérebro 🧠)
4. Aguarde a geração (pode levar alguns segundos)
5. A análise será salva no banco

### Opção B: Pela página da vaga

1. Acesse a vaga específica: **Admin > Vagas > [Nome da Vaga]**
2. Na aba **"Candidatos"**, encontre o candidato
3. Clique no botão **"Analisar IA"**
4. Aguarde a geração

### Opção C: Via API (se necessário)

Se o botão não aparecer, você pode forçar a análise editando o código temporariamente ou via API direta.

## 3. Como Gerar/Regenerar Perguntas de Entrevista

### Passo a Passo:

1. **Acesse a lista de entrevistas**: 
   - Admin > Entrevistas (ou `/admin/interviews`)

2. **Encontre a entrevista** que precisa de perguntas

3. **Clique no botão "Gerar Perguntas"** (ícone de faíscas ✨)
   - Este botão só aparece se a entrevista NÃO tiver perguntas ainda
   - Se já tiver perguntas, você precisa **apagar as perguntas primeiro** ou editar diretamente

4. **Aguarde a geração** - a IA criará 5-8 perguntas personalizadas

5. As perguntas serão salvas automaticamente no campo `questions` da tabela `job_interviews`

### Se o botão "Gerar Perguntas" não aparecer:

Isso significa que a entrevista já tem perguntas no banco. Para regenerar:

**Opção 1: Editar manualmente**
- Abra a entrevista para avaliação
- Edite as perguntas diretamente na interface

**Opção 2: Limpar perguntas via SQL e regenerar**
```sql
-- CUIDADO: Isso apaga as perguntas existentes!
UPDATE job_interviews 
SET questions = '[]'::jsonb
WHERE id = 'ID_DA_ENTREVISTA_AQUI';
```

Depois disso, o botão "Gerar Perguntas" aparecerá novamente.

## 4. Como Editar Perguntas de Entrevista

1. **Acesse a avaliação da entrevista**:
   - Clique em "Avaliar" ou "Ver" na lista de entrevistas
   - Ou acesse diretamente: `/admin/interviews/evaluate/[ID_DA_ENTREVISTA]`

2. **Na seção "Perguntas da Entrevista"**:
   - Você verá todas as perguntas geradas
   - Pode editar o texto das perguntas diretamente
   - Pode adicionar respostas do candidato
   - Pode adicionar observações

3. **Clique em "Salvar Progresso"** para salvar as alterações

## 5. Verificar se os dados estão sendo filtrados por company_id

Se você suspeitar que os dados estão no banco mas não aparecem:

```sql
-- Verificar company_id das análises
SELECT 
    a.id,
    a.job_response_id,
    a.company_id,
    jr.company_id as job_response_company_id,
    CASE 
        WHEN a.company_id IS NULL THEN 'ANÁLISE SEM COMPANY_ID'
        WHEN a.company_id != jr.company_id THEN 'ANÁLISE COM COMPANY_ID DIFERENTE'
        ELSE 'OK'
    END as status
FROM job_candidate_ai_analysis a
JOIN job_responses jr ON jr.id = a.job_response_id
ORDER BY a.created_at DESC
LIMIT 20;

-- Verificar company_id das entrevistas
SELECT 
    i.id,
    i.job_response_id,
    i.company_id,
    jr.company_id as job_response_company_id,
    CASE 
        WHEN i.questions IS NULL OR i.questions::text = '[]' THEN 'SEM PERGUNTAS'
        WHEN i.company_id IS NULL THEN 'ENTREVISTA SEM COMPANY_ID'
        WHEN i.company_id != jr.company_id THEN 'ENTREVISTA COM COMPANY_ID DIFERENTE'
        ELSE 'OK'
    END as status
FROM job_interviews i
JOIN job_responses jr ON jr.id = i.job_response_id
ORDER BY i.created_at DESC
LIMIT 20;
```

## 6. Corrigir company_id se necessário

Se os dados existem mas têm `company_id` incorreto:

```sql
-- Já foi executado antes, mas pode rodar novamente se necessário:
-- Ver arquivo: sql/CORRIGIR_COMPANY_ID_ANALISES_IA.sql
-- Ver arquivo: sql/CORRIGIR_COMPANY_ID_ENTREVISTAS.sql
```

## Resumo Rápido:

- **Análise de IA**: Botão "Analisar IA" na lista de candidatos
- **Perguntas de Entrevista**: Botão "Gerar Perguntas" na lista de entrevistas (só aparece se não tiver perguntas)
- **Editar Perguntas**: Abra a entrevista para avaliação e edite diretamente
- **Dados antigos**: Podem estar no banco mas com `company_id` incorreto - execute os scripts de correção se necessário
