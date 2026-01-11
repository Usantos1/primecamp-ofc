# Rotas do Sistema Financeiro IA-First

Todas as rotas do sistema financeiro já estão configuradas no `src/App.tsx`:

## Rotas Disponíveis

1. **Dashboard Executivo** (página principal)
   - `/financeiro` ou `/financeiro/dashboard`
   - Componente: `DashboardExecutivo`

2. **Recomendações**
   - `/financeiro/recomendacoes`
   - Componente: `Recomendacoes`

3. **Estoque Inteligente**
   - `/financeiro/estoque-inteligente`
   - Componente: `EstoqueInteligente`

4. **Análise de Vendedores**
   - `/financeiro/analise-vendedores`
   - Componente: `AnaliseVendedores`

5. **Análise de Produtos**
   - `/financeiro/analise-produtos`
   - Componente: `AnaliseProdutos`

6. **Previsões de Vendas**
   - `/financeiro/previsoes-vendas`
   - Componente: `PrevisoesVendas`

7. **DRE (Demonstrativo de Resultado do Exercício)**
   - `/financeiro/dre`
   - Componente: `DRE`

8. **Planejamento Anual**
   - `/financeiro/planejamento-anual`
   - Componente: `PlanejamentoAnual`

9. **Precificação Inteligente**
   - `/financeiro/precificacao`
   - Componente: `Precificacao`

## Acesso

Todas as rotas exigem a permissão: `relatorios.financeiro`

## Navegação

Atualmente, a navegação pode ser feita diretamente pela URL ou você pode adicionar um menu de navegação dentro do `DashboardExecutivo` para facilitar o acesso às outras páginas.
