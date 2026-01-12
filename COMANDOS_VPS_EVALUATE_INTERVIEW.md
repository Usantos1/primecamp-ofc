# Comandos VPS - Atualizar Backend (evaluate-interview-transcription)

## 🔧 Problema
A rota `/api/functions/evaluate-interview-transcription` estava faltando no backend, causando erro 404 ao tentar avaliar entrevistas com IA.

## ✅ Solução
Rota implementada no backend. Execute no VPS para atualizar:

```bash
cd /root/primecamp-ofc
git pull origin main
cd server
npm install
pm2 restart primecamp-api
pm2 logs primecamp-api --lines 50
```

## Ou em uma linha:

```bash
cd /root/primecamp-ofc && git pull origin main && cd server && npm install && pm2 restart primecamp-api && echo "✅ Backend atualizado! Verifique os logs: pm2 logs primecamp-api --lines 50"
```

## 📋 O que foi implementado

A rota `/api/functions/evaluate-interview-transcription` agora:
1. Recebe: interview_id, transcription, interview_type, job_response_id, survey_id, include_profile_analysis (opcional)
2. Busca dados da entrevista, candidato e vaga (com filtro de company_id)
3. Busca análise de IA prévia do candidato (se disponível)
4. Chama OpenAI para avaliar a transcrição
5. Salva a avaliação no banco (ai_evaluation, ai_recommendation, ai_score)
6. Retorna: evaluation com score, recommendation, justification, strengths, weaknesses, candidate_profile, summary
