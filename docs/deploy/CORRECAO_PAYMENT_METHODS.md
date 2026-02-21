# Correção: Payment Methods - Erro e Integração PDV

## Problema 1: Erro "column pm.description does not exist" ✅ RESOLVIDO

**Erro:** A query no backend estava tentando buscar `pm.description` sem verificar se a coluna existe na tabela.

**Solução:** Adicionada verificação da coluna `description` antes de incluir no SELECT.

**Arquivo alterado:** `server/routes/paymentMethods.js`

**Mudanças:**
- Adicionada verificação `hasDescription = await columnExists('payment_methods', 'description')`
- Query agora usa `hasDescription ? 'pm.description' : 'NULL as description'`

## Problema 2: Formas de Pagamento não aparecem no PDV ⚠️ PENDENTE

**Situação atual:**
- O PDV usa valores hardcoded no Select de formas de pagamento
- Não está integrado com a API `/api/payment-methods`
- As taxas configuradas em `/admin/configuracoes/pagamentos` não são aplicadas

**O que precisa ser feito:**

1. **Integrar API no PDV:**
   - Usar `usePaymentMethods()` hook no componente `NovaVenda.tsx`
   - Buscar formas de pagamento ativas (`active_only=true`)
   - Popular o Select com as formas de pagamento da API

2. **Exibir taxas configuradas:**
   - Quando o usuário seleciona uma forma de pagamento com parcelamento
   - Buscar as taxas configuradas para aquela forma de pagamento
   - Aplicar automaticamente a taxa conforme o número de parcelas selecionado

3. **Mapear códigos:**
   - O PDV espera códigos como `'dinheiro'`, `'pix'`, `'credito'`, etc.
   - A API retorna formas de pagamento com campo `code`
   - Garantir que os códigos da API correspondem aos tipos esperados

**Arquivos que precisam ser modificados:**
- `src/pages/pdv/NovaVenda.tsx` - Integrar com usePaymentMethods
- Possivelmente `src/types/pdv.ts` - Ajustar tipo PaymentMethod se necessário

**Próximos passos:**
1. Implementar busca de formas de pagamento no PDV
2. Integrar taxas no cálculo de pagamentos
3. Testar criação de formas de pagamento e uso no PDV
