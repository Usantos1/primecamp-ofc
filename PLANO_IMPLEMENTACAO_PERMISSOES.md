# 📋 PLANO DE IMPLEMENTAÇÃO - SISTEMA DE PERMISSÕES E CONTROLE DE ACESSOS

## 🎯 OBJETIVO
Refazer completamente o sistema de permissões, criando um painel de controle de acessos granular onde cada usuário/colaborador pode ter permissões específicas por funcionalidade.

---

## 📊 ANÁLISE DO SISTEMA ATUAL

### Situação Atual:
- **Sistema de Roles**: Apenas `admin` e `member` (binário)
- **Verificação**: `isAdmin` boolean simples
- **Problema**: Não há granularidade - vendedor vê tudo ou nada

### Estrutura Atual:
- Tabela `profiles` com campo `role` ('admin' | 'member')
- Tabela `user_roles` (sistema seguro, mas ainda binário)
- Tabela `positions` (cargos) com campo `permissions` JSONB (não utilizado)
- Tabela `user_position_departments` (relacionamento usuário-cargo-departamento)

---

## 🗺️ MAPEAMENTO DE FUNCIONALIDADES

### 1. **DASHBOARD E GESTÃO**
- `/` - Dashboard Principal
- `/gestao` - Dashboard de Gestão
- `/processos` - Gestão de Processos
- `/tarefas` - Tarefas
- `/calendario` - Calendário
- `/relatorios` - Relatórios Gerais
- `/metricas` - Métricas

### 2. **PDV - VENDAS**
- `/pdv` - Nova Venda
- `/pdv/vendas` - Lista de Vendas
- `/pdv/caixa` - Caixa (Fechamento)
- `/pdv/relatorios` - Relatórios de Vendas
- `/pdv/configuracao-cupom` - Configuração de Cupom

### 3. **ASSISTÊNCIA TÉCNICA**
- `/assistencia` - Dashboard Assistência
- `/pdv/os` - Lista de Ordens de Serviço
- `/pdv/os/nova` - Nova OS
- `/pdv/os/:id` - Detalhes/Edição de OS
- `/pdv/configuracao-status` - Configuração de Status
- `/produtos` - Produtos
- `/pdv/marcas-modelos` - Marcas e Modelos

### 4. **CLIENTES**
- `/pdv/clientes` - Gestão de Clientes

### 5. **ADMINISTRAÇÃO**
- `/admin` - Dashboard Admin
- `/admin/users` - Gestão de Usuários
- `/admin/positions` - Gestão de Cargos
- `/admin/departments` - Gestão de Departamentos
- `/admin/categories` - Categorias
- `/admin/tags` - Tags
- `/admin/timeclock` - Gestão de Ponto
- `/admin/goals` - Metas
- `/admin/nps` - NPS
- `/admin/disc` - DISC
- `/admin/financeiro/*` - Financeiro
- `/admin/job-surveys` - Pesquisas de Vaga
- `/admin/talent-bank` - Banco de Talentos
- `/admin/interviews` - Entrevistas
- `/admin/logs` - Logs do Sistema
- `/admin/estrutura` - Estrutura Organizacional
- `/admin/cadastros` - Cadastros Base

### 6. **RH**
- `/rh` - Dashboard RH
- `/ponto` - Ponto Eletrônico
- `/metas` - Metas Pessoais
- `/treinamentos` - Treinamentos
- `/nps` - NPS Pessoal
- `/teste-disc` - Teste DISC

### 7. **OUTROS**
- `/usuarios` - Lista de Usuários
- `/perfil` - Perfil do Usuário
- `/integracoes` - Integrações
- `/logs` - Logs Pessoais
- `/productivity` - Produtividade
- `/process-analytics` - Analytics de Processos

---

## 🏗️ PROPOSTA DE NOVA ARQUITETURA

### 1. **SISTEMA DE PERMISSÕES GRANULARES**

#### Estrutura de Permissões:
```typescript
interface Permission {
  id: string;
  resource: string;        // Ex: 'vendas', 'os', 'clientes', 'financeiro'
  action: string;          // Ex: 'view', 'create', 'edit', 'delete', 'manage'
  description: string;
  category: string;        // Ex: 'pdv', 'assistencia', 'admin', 'rh'
}

// Exemplos:
- vendas.view          // Ver vendas
- vendas.create        // Criar vendas
- vendas.edit          // Editar vendas
- vendas.delete        // Deletar vendas
- vendas.manage        // Gerenciar tudo de vendas
- financeiro.view       // Ver financeiro
- financeiro.manage    // Gerenciar financeiro
- os.view              // Ver OS
- os.create            // Criar OS
- os.edit              // Editar OS
- clientes.view        // Ver clientes
- clientes.edit        // Editar clientes
- admin.users          // Gerenciar usuários
- admin.config          // Configurações do sistema
```

### 2. **ROLES PREDEFINIDOS (Templates)**

#### Roles Sugeridos:
1. **Admin** - Acesso total
2. **Gerente** - Acesso a relatórios e gestão (sem admin)
3. **Vendedor** - Apenas vendas e clientes (sem financeiro)
4. **Técnico** - Apenas OS e produtos
5. **Atendente** - OS, clientes, produtos (sem configurações)
6. **Financeiro** - Vendas, caixa, relatórios financeiros
7. **RH** - Apenas módulo RH
8. **Visualizador** - Apenas visualização (sem edição)

### 3. **ESTRUTURA DE BANCO DE DADOS**

#### Nova Tabela: `permissions`
```sql
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource TEXT NOT NULL,           -- 'vendas', 'os', 'clientes', etc
  action TEXT NOT NULL,             -- 'view', 'create', 'edit', 'delete', 'manage'
  description TEXT NOT NULL,
  category TEXT NOT NULL,           -- 'pdv', 'assistencia', 'admin', 'rh'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(resource, action)
);
```

#### Nova Tabela: `role_permissions` (Roles com Permissões)
```sql
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, permission_id)
);
```

#### Nova Tabela: `roles` (Roles do Sistema)
```sql
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,        -- 'admin', 'vendedor', 'tecnico', etc
  display_name TEXT NOT NULL,      -- 'Administrador', 'Vendedor', etc
  description TEXT,
  is_system BOOLEAN DEFAULT false, -- Roles do sistema não podem ser deletados
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Nova Tabela: `user_permissions` (Permissões Customizadas por Usuário)
```sql
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,     -- true = permitido, false = negado (override)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, permission_id)
);
```

#### Atualizar Tabela: `user_position_departments`
Adicionar campo `role_id` para vincular role ao cargo:
```sql
ALTER TABLE public.user_position_departments
ADD COLUMN role_id UUID REFERENCES public.roles(id);
```

---

## 🎨 INTERFACE DO PAINEL DE CONTROLE

### Página: `/admin/users` (Refeita)

#### Seções:

1. **Lista de Usuários**
   - Tabela com: Nome, Email, Cargo, Departamento, Role, Status, Ações
   - Filtros: Por departamento, cargo, role, status
   - Busca por nome/email

2. **Modal de Edição de Usuário**
   - **Aba 1: Dados Básicos**
     - Nome, Email, Telefone
     - Departamento
     - Cargo
     - Status (Ativo/Inativo)
   
   - **Aba 2: Permissões**
     - **Opção 1: Selecionar Role Predefinido**
       - Dropdown com roles (Admin, Vendedor, Técnico, etc)
       - Ao selecionar, aplica todas as permissões do role
     
     - **Opção 2: Permissões Customizadas**
       - Tree/Checkbox organizado por categoria:
         ```
         ☑ PDV - Vendas
           ☑ Ver Vendas
           ☑ Criar Vendas
           ☑ Editar Vendas
           ☐ Deletar Vendas
           ☐ Gerenciar Vendas
         
         ☑ PDV - Financeiro
           ☐ Ver Financeiro
           ☐ Gerenciar Financeiro
         
         ☑ Assistência Técnica
           ☑ Ver OS
           ☑ Criar OS
           ☑ Editar OS
           ☐ Deletar OS
         
         ☑ Clientes
           ☑ Ver Clientes
           ☑ Editar Clientes
         
         ☐ Administração
           ☐ Gerenciar Usuários
           ☐ Configurações do Sistema
         ```
       - Checkbox "Negar" para override (permissão negada mesmo com role)
   
   - **Aba 3: Histórico**
     - Log de alterações de permissões
     - Quem alterou, quando, o que mudou

3. **Gestão de Roles**
   - Criar/Editar/Deletar roles predefinidos
   - Atribuir permissões aos roles
   - Visualizar quais usuários usam cada role

---

## 🔒 SISTEMA DE VERIFICAÇÃO DE PERMISSÕES

### Hook: `usePermissions`
```typescript
const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

// Uso:
if (hasPermission('vendas.view')) {
  // Mostrar lista de vendas
}

if (hasPermission('financeiro.manage')) {
  // Mostrar botão de gerenciar financeiro
}
```

### Componente: `PermissionGate`
```typescript
<PermissionGate permission="vendas.view">
  <VendasList />
</PermissionGate>

<PermissionGate permission="financeiro.manage" fallback={<div>Acesso negado</div>}>
  <FinanceiroPanel />
</PermissionGate>
```

### Rota Protegida: `PermissionRoute`
```typescript
<PermissionRoute 
  path="/pdv/vendas" 
  permission="vendas.view"
  component={Vendas}
/>
```

### Função SQL: `has_permission`
```sql
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id UUID,
  _resource TEXT,
  _action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Verificar se é admin (tem acesso total)
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id AND role = 'admin'
  ) THEN
    RETURN true;
  END IF;

  -- 2. Verificar permissões customizadas (override)
  IF EXISTS (
    SELECT 1 FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = _user_id 
      AND p.resource = _resource 
      AND p.action = _action
      AND up.granted = false
  ) THEN
    RETURN false; -- Negado explicitamente
  END IF;

  -- 3. Verificar permissões customizadas (granted)
  IF EXISTS (
    SELECT 1 FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = _user_id 
      AND p.resource = _resource 
      AND p.action = _action
      AND up.granted = true
  ) THEN
    RETURN true; -- Permitido explicitamente
  END IF;

  -- 4. Verificar permissões via role
  IF EXISTS (
    SELECT 1 FROM public.user_position_departments upd
    JOIN public.role_permissions rp ON rp.role_id = upd.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE upd.user_id = _user_id
      AND p.resource = _resource
      AND p.action = _action
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
```

---

## 📝 PLANO DE IMPLEMENTAÇÃO (FASES)

### **FASE 1: Estrutura de Banco de Dados** ⏱️ ~2h
1. ✅ Criar tabela `permissions` com todas as permissões do sistema
2. ✅ Criar tabela `roles` para roles predefinidos
3. ✅ Criar tabela `role_permissions` (relacionamento)
4. ✅ Criar tabela `user_permissions` (permisões customizadas)
5. ✅ Atualizar `user_position_departments` com `role_id`
6. ✅ Criar função SQL `has_permission`
7. ✅ Popular permissões iniciais
8. ✅ Criar roles predefinidos com permissões

### **FASE 2: Backend e Hooks** ⏱️ ~3h
1. ✅ Criar hook `usePermissions`
2. ✅ Criar componente `PermissionGate`
3. ✅ Criar componente `PermissionRoute`
4. ✅ Atualizar `AuthContext` para incluir permissões
5. ✅ Criar funções de verificação de permissões

### **FASE 3: Interface de Gerenciamento** ⏱️ ~4h
1. ✅ Refazer página `/admin/users`
2. ✅ Criar modal de edição com abas
3. ✅ Implementar seletor de roles
4. ✅ Implementar editor de permissões customizadas (tree/checkbox)
5. ✅ Implementar gestão de roles (CRUD)
6. ✅ Adicionar histórico de alterações

### **FASE 4: Aplicar Permissões nas Rotas** ⏱️ ~3h
1. ✅ Atualizar todas as rotas com `PermissionRoute`
2. ✅ Adicionar `PermissionGate` em componentes sensíveis
3. ✅ Atualizar menus/sidebars para ocultar itens sem permissão
4. ✅ Atualizar botões de ação (criar/editar/deletar)

### **FASE 5: RLS Policies** ⏱️ ~2h
1. ✅ Atualizar RLS policies para usar `has_permission`
2. ✅ Aplicar em tabelas: `sales`, `ordens_servico`, `clientes`, etc
3. ✅ Testar segurança em nível de banco

### **FASE 6: Migração de Dados** ⏱️ ~1h
1. ✅ Migrar usuários existentes para roles apropriados
2. ✅ Manter compatibilidade com sistema antigo durante transição

### **FASE 7: Testes e Ajustes** ⏱️ ~2h
1. ✅ Testar todos os cenários de permissão
2. ✅ Validar que vendedor não vê financeiro
3. ✅ Validar que técnico não vê vendas
4. ✅ Ajustar permissões conforme necessário

---

## 📋 LISTA COMPLETA DE PERMISSÕES PROPOSTAS

### **PDV - VENDAS**
- `vendas.view` - Ver lista de vendas
- `vendas.create` - Criar nova venda
- `vendas.edit` - Editar venda existente
- `vendas.delete` - Deletar venda
- `vendas.manage` - Gerenciar tudo (inclui configurações)

### **PDV - CAIXA**
- `caixa.view` - Ver informações do caixa
- `caixa.open` - Abrir caixa
- `caixa.close` - Fechar caixa
- `caixa.manage` - Gerenciar tudo de caixa

### **PDV - FINANCEIRO**
- `financeiro.view` - Ver informações financeiras
- `financeiro.manage` - Gerenciar financeiro (valores, relatórios)

### **PDV - RELATÓRIOS**
- `relatorios.vendas` - Ver relatórios de vendas
- `relatorios.financeiro` - Ver relatórios financeiros
- `relatorios.geral` - Ver relatórios gerais

### **ASSISTÊNCIA - OS**
- `os.view` - Ver lista de OS
- `os.create` - Criar nova OS
- `os.edit` - Editar OS existente
- `os.delete` - Deletar OS
- `os.manage` - Gerenciar tudo de OS (inclui configurações)

### **ASSISTÊNCIA - PRODUTOS**
- `produtos.view` - Ver produtos
- `produtos.create` - Criar produto
- `produtos.edit` - Editar produto
- `produtos.delete` - Deletar produto
- `produtos.manage` - Gerenciar produtos

### **ASSISTÊNCIA - CONFIGURAÇÕES**
- `os.config.status` - Configurar status de OS
- `os.config.checklist` - Configurar checklist
- `os.config.imagem` - Configurar imagem de referência

### **CLIENTES**
- `clientes.view` - Ver clientes
- `clientes.create` - Criar cliente
- `clientes.edit` - Editar cliente
- `clientes.delete` - Deletar cliente
- `clientes.manage` - Gerenciar clientes

### **ADMINISTRAÇÃO**
- `admin.users` - Gerenciar usuários
- `admin.roles` - Gerenciar roles
- `admin.departments` - Gerenciar departamentos
- `admin.positions` - Gerenciar cargos
- `admin.config` - Configurações do sistema
- `admin.logs` - Ver logs do sistema

### **RH**
- `rh.view` - Ver módulo RH
- `rh.ponto` - Acessar ponto eletrônico
- `rh.metas` - Ver/gerenciar metas
- `rh.treinamentos` - Acessar treinamentos
- `rh.manage` - Gerenciar tudo de RH

### **PROCESSOS E TAREFAS**
- `processos.view` - Ver processos
- `processos.create` - Criar processo
- `processos.edit` - Editar processo
- `processos.delete` - Deletar processo
- `tarefas.view` - Ver tarefas
- `tarefas.manage` - Gerenciar tarefas

---

## 🎯 EXEMPLOS DE CONFIGURAÇÃO

### **Vendedor**
```
Role: Vendedor
Permissões:
  ✅ vendas.view
  ✅ vendas.create
  ✅ vendas.edit
  ❌ vendas.delete
  ❌ vendas.manage
  ❌ financeiro.view
  ❌ financeiro.manage
  ✅ clientes.view
  ✅ clientes.create
  ✅ clientes.edit
  ❌ clientes.delete
  ✅ caixa.view
  ❌ caixa.close
```

### **Técnico**
```
Role: Técnico
Permissões:
  ✅ os.view
  ✅ os.create
  ✅ os.edit
  ❌ os.delete
  ❌ os.manage
  ✅ produtos.view
  ✅ produtos.create
  ✅ produtos.edit
  ❌ produtos.delete
  ✅ clientes.view
  ❌ clientes.edit
  ❌ vendas.view
  ❌ financeiro.view
```

### **Financeiro**
```
Role: Financeiro
Permissões:
  ✅ vendas.view
  ❌ vendas.create
  ❌ vendas.edit
  ❌ vendas.delete
  ✅ financeiro.view
  ✅ financeiro.manage
  ✅ caixa.view
  ✅ caixa.close
  ✅ relatorios.vendas
  ✅ relatorios.financeiro
  ✅ relatorios.geral
```

---

## ⚠️ CONSIDERAÇÕES IMPORTANTES

1. **Compatibilidade**: Manter sistema antigo funcionando durante migração
2. **Performance**: Cache de permissões no frontend
3. **Segurança**: Verificação sempre no backend (RLS)
4. **UX**: Mensagens claras quando acesso negado
5. **Auditoria**: Log de todas as alterações de permissões

---

## 📊 ESTIMATIVA TOTAL
- **Tempo**: ~17 horas de desenvolvimento
- **Complexidade**: Alta
- **Risco**: Médio (mudança estrutural grande)

---

## ✅ CHECKLIST DE APROVAÇÃO

Antes de começar, confirme:
- [ ] Estrutura de permissões proposta está correta?
- [ ] Roles predefinidos estão adequados?
- [ ] Lista de permissões está completa?
- [ ] Interface proposta está clara?
- [ ] Fases de implementação fazem sentido?
- [ ] Alguma funcionalidade faltando?

---

**Aguardando sua aprovação e ajustes antes de iniciar a implementação!** 🚀

