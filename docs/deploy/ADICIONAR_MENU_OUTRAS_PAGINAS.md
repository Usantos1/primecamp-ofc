# Adicionar Menu de Navegação nas Outras Páginas do Financeiro

O componente `FinanceiroNavMenu` já foi criado e adicionado no `DashboardExecutivo` e `Recomendacoes`.

Para adicionar nas outras páginas, adicione:

1. **Import:**
```typescript
import { FinanceiroNavMenu } from '@/components/financeiro/FinanceiroNavMenu';
```

2. **Adicione logo após o início do conteúdo:**
```typescript
<ModernLayout title="..." subtitle="...">
  <div className="flex flex-col h-full overflow-hidden gap-4">
    {/* Menu de Navegação */}
    <FinanceiroNavMenu />
    
    {/* Resto do conteúdo */}
    ...
  </div>
</ModernLayout>
```

Páginas que precisam do menu:
- ✅ DashboardExecutivo
- ✅ Recomendacoes
- ⏳ EstoqueInteligente
- ⏳ AnaliseVendedores
- ⏳ AnaliseProdutos
- ⏳ PrevisoesVendas
- ⏳ DRE
- ⏳ PlanejamentoAnual
- ⏳ Precificacao
