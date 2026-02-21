# Remoção de Módulos – Entregáveis

## Rotas removidas (retornam 404 / NotFound)

- `/reset-senha`, `/reset-password`, `/recuperar-acesso`
- `/process-analytics`, `/processos`, `/processos/*`, `/processo/:id`
- `/tarefas`, `/tarefas/*`
- `/calendario`
- `/nps`, `/admin/nps`
- `/metas`, `/metricas`
- `/admin/categories`, `/admin/tags`, `/admin/departments`
- `/notifications`, `/search`, `/productivity`

---

## 1. Arquivos REMOVIDOS

### Páginas
- `src/pages/ResetPassword.tsx`
- `src/pages/ProcessAnalytics.tsx`
- `src/pages/ProcessView.tsx`
- `src/pages/ProcessEdit.tsx`
- `src/pages/ProcessCreate.tsx`
- `src/pages/Processes.tsx`
- `src/pages/Tasks.tsx`
- `src/pages/Calendar.tsx`
- `src/pages/Goals.tsx`
- `src/pages/NPS.tsx`
- `src/pages/Productivity.tsx`
- `src/pages/admin/AdminDepartments.tsx`
- `src/pages/admin/AdminCategories.tsx`
- `src/pages/admin/AdminTags.tsx`
- `src/pages/admin/AdminGoals.tsx`
- `src/pages/admin/AdminNPS.tsx`

### Componentes
- `src/components/ProcessForm.tsx`
- `src/components/ProcessViewer.tsx`
- `src/components/ProcessCard.tsx`
- `src/components/ProcessBlocksModal.tsx`
- `src/components/SimpleProcessForm.tsx`
- `src/components/FlowBuilder.tsx`
- `src/components/Calendar.tsx` (módulo calendário; `ui/calendar.tsx` mantido)
- `src/components/CalendarEventModal.tsx`
- `src/components/TaskForm.tsx`
- `src/components/TaskManager.tsx`
- `src/components/TaskDetailModal.tsx`
- `src/components/TaskFooterTips.tsx`
- `src/components/GoalsManager.tsx`
- `src/components/GoalUpdateForm.tsx`
- `src/components/AdminGoalsManager.tsx`
- `src/components/NPSManager.tsx`
- `src/components/NPSSurveyForm.tsx`
- `src/components/PersonalNPSReport.tsx`
- `src/components/AdminNPSManager.tsx`
- `src/components/CategoryManager.tsx`
- `src/components/TagManager.tsx`
- `src/components/DepartmentManager.tsx`

### Hooks
- `src/hooks/useProcesses.ts`
- `src/hooks/useTasks.ts`
- `src/hooks/useCategories.ts`
- `src/hooks/useGoals.ts`
- `src/hooks/useNPS.ts`
- `src/hooks/useCalendarEvents.ts`
- `src/hooks/useDeleteTask.ts`

### Schemas
- `src/schemas/processSchema.ts`

---

## 2. Arquivos ALTERADOS

- `src/App.tsx` – Rotas dos módulos removidos; rotas listadas acima apontam para `<NotFound />`
- `src/components/AppBar.tsx` – Quick nav sem processos/tarefas/calendário/metas
- `src/components/AppSidebar.tsx` – Itens Metas e NPS removidos de gestão
- `src/components/EnhancedSidebar.tsx` – Processos/Tarefas/Calendário e blocos relacionados removidos
- `src/components/ProfessionalSidebar.tsx` – Processes Tree e quick actions removidos; import de Badge mantido
- `src/components/ModernLayout.tsx` – Remoção de useProcesses/useTasks e busca por processos/tarefas
- `src/components/Dashboard.tsx` – Simplificado: apenas contagem de usuários (sem NPS, metas, tarefas, processos)
- `src/components/NotificationPanel.tsx` – Remoção de useTasks e notificações baseadas em tarefas
- `src/components/NotificationManager.tsx` – Remoção de sendTaskNotification, sendCalendarNotification, sendProcessNotification da dependência
- `src/components/TimeClockWidget.tsx` – Modal de lembrete NPS e navegação para `/nps` removidos
- `src/components/UserManagement.tsx` – Seção DepartmentManager removida
- `src/pages/DashboardGestao.tsx` – Simplificado: apenas ModernLayout + Dashboard (sem processos/tarefas/categorias/calendário)
- `src/pages/Admin.tsx` – Card “Tarefas Pendentes” renomeado para “Pendências”
- `src/pages/RH.tsx` – Cards Metas, Feedback 1:1, NPS, Benefícios, Checklists removidos (conforme feito anteriormente)
- `src/pages/admin/CadastrosBase.tsx` – Links para os módulos removidos (conforme feito anteriormente)
- `src/hooks/useWhatsApp.ts` – Remoção de sendTaskNotification, sendCalendarNotification, sendTaskStatusNotification, sendProcessNotification, sendNPSReminder
- `src/hooks/usePermissions.ts` – Remoção de permissões: processos.*, tarefas.*, calendario.view, metricas.view, nps.view, rh.metas

---

## 3. Migração SQL (DROP das tabelas)

Arquivo: **`server/migrations/DROP_MODULOS_REMOVIDOS.sql`**

Ordem dos DROPs (respeitando FKs):

1. `nps_responses`
2. `nps_surveys`
3. `tasks`
4. `goals`
5. `calendar_events`
6. `processes`
7. `categories`
8. `tags`
9. `notifications`

**Não removidas:** `departments`, `user_position_departments` (usadas em usuários/cargos).

Execução: rodar o SQL no banco (PostgreSQL) quando for aplicar a remoção dos módulos.

---

## 4. Confirmação de referências restantes (busca global)

Buscas realizadas por: **process**, **tarefa**, **calendario**, **nps**, **metas**, **metricas**, **categories**, **tags**, **departments**, **notifications**, **search**, **productivity**, **analytics**.

- **Rotas:** Todas as URLs listadas no início estão mapeadas para `<NotFound />` em `App.tsx`; não há links ativos para essas rotas no menu.
- **process/processo:** Restam apenas:
  - `useAdminLogs.ts`: labels de auditoria (ex.: “Processo criado”) e categoria `tarefas_processos` para log histórico.
  - `useTelegramConfig.ts`: `chatIdProcesso` (config de integração Telegram, não módulo de processos).
  - `driveUpload.ts` / `useTelegram.ts`: uso da palavra “processo” em contexto de OS/fotos (ex.: “Processo” como tipo de etapa).
  - `src/types/process.ts`: arquivo mantido (pode ser usado por logs/auditoria); nenhuma tela ou hook de processos ativo.
- **tarefa:** `useAdminLogs.ts` (labels de auditoria) e `AdminLogsManager.tsx` (ícone da categoria “Tarefas e Processos” no log).
- **calendario:** Apenas em rotas 404 e comentários.
- **nps:** Apenas em rotas 404.
- **metas:** `PlanejamentoAnual.tsx` usa “metas” no sentido de metas financeiras (meta_mensal), não do módulo Goals removido.
- **metricas:** Apenas em rotas 404.
- **categories:** RH.tsx usa “categories” para categorias DISC (D/I/S/C), não admin/categories. Nenhum link para `/admin/categories`.
- **tags:** Apenas em rotas 404 e `NodeTagManager` (componente genérico de tags de nó).
- **departments:** `UserManagement.tsx` e tabelas `departments` / `user_position_departments` mantidos para gestão de usuários e cargos; rota `/admin/departments` retorna 404 (página de admin de departamentos removida).
- **notifications:** `NotificationPanel` e `NotificationManager` usam “notifications” para o painel local (localStorage); rota `/notifications` retorna 404.
- **search:** Rota `/search` retorna 404; `useClientesSupabase` mantém chamada a API de busca de clientes (não é a rota /search do módulo removido).
- **productivity / analytics:** Apenas em rotas 404.

Conclusão: **não restam referências ativas que exponham ou liguem o usuário aos módulos removidos.** As exceções são texto de log/auditoria, configuração (Telegram), tipos e contexto de metas financeiras/DISC.

---

## 5. Build e testes

- **Build:** `npx vite build` concluído com sucesso.
- Login e navegação permanecem funcionando; as rotas listadas acima retornam 404 ou redirecionam para NotFound conforme configurado em `App.tsx`.
