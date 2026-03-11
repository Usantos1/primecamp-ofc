-- =====================================================
-- PAINEL DE ALERTAS - Estrutura de tabelas (multi-empresa)
-- Execute no banco: pgAdmin ou psql -f PAINEL_ALERTAS_TABELAS.sql
-- =====================================================

-- 1) Configuração geral do painel por empresa
CREATE TABLE IF NOT EXISTS public.alert_panel_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome_painel VARCHAR(255) DEFAULT 'Painel de Alertas',
  ativo BOOLEAN DEFAULT false,
  numero_principal VARCHAR(20),
  numeros_adicionais TEXT[], -- array de números
  horario_inicio_envio TIME, -- ex: 08:00
  horario_fim_envio TIME,    -- ex: 22:00
  timezone VARCHAR(63) DEFAULT 'America/Sao_Paulo',
  relatorio_diario_ativo BOOLEAN DEFAULT false,
  horario_relatorio_diario TIME, -- ex: 19:00
  resumo_semanal_ativo BOOLEAN DEFAULT false,
  dia_resumo_semanal INTEGER,    -- 0=domingo .. 6=sábado
  horario_resumo_semanal TIME,
  canal_padrao VARCHAR(32) DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)
);
CREATE INDEX IF NOT EXISTS idx_alert_panel_config_company ON public.alert_panel_config(company_id);

-- 2) Catálogo de alertas (base do sistema, não por empresa)
CREATE TABLE IF NOT EXISTS public.alert_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_alerta VARCHAR(64) NOT NULL UNIQUE,
  categoria VARCHAR(32) NOT NULL, -- operacional, financeiro, comercial, gestao
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  variaveis_disponiveis TEXT[], -- ex: ['cliente','numero_os','status']
  tipo_disparo VARCHAR(32) DEFAULT 'tempo_real', -- tempo_real, agendado
  ativo_por_padrao BOOLEAN DEFAULT false,
  template_padrao TEXT,
  prioridade_padrao INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alert_catalog_categoria ON public.alert_catalog(categoria);

-- 3) Configuração por empresa por alerta (personalização)
CREATE TABLE IF NOT EXISTS public.alert_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  codigo_alerta VARCHAR(64) NOT NULL REFERENCES public.alert_catalog(codigo_alerta) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT false,
  usar_destinatarios_globais BOOLEAN DEFAULT true,
  numeros_destino TEXT[], -- override por alerta
  prioridade INTEGER DEFAULT 0,
  template_mensagem TEXT,
  permitir_edicao_template BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, codigo_alerta)
);
CREATE INDEX IF NOT EXISTS idx_alert_config_company ON public.alert_config(company_id);
CREATE INDEX IF NOT EXISTS idx_alert_config_codigo ON public.alert_config(codigo_alerta);

-- 4) Log de alertas enviados
CREATE TABLE IF NOT EXISTS public.alert_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  codigo_alerta VARCHAR(64) NOT NULL,
  categoria VARCHAR(32),
  destino VARCHAR(20) NOT NULL,
  payload JSONB,
  mensagem_final TEXT,
  status VARCHAR(32) NOT NULL, -- enviado, erro, agendado
  erro TEXT,
  enviado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alert_logs_company ON public.alert_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_alert_logs_created ON public.alert_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_alert_logs_codigo ON public.alert_logs(codigo_alerta);
CREATE INDEX IF NOT EXISTS idx_alert_logs_status ON public.alert_logs(status);

-- Inserir catálogo base de alertas (se não existir)
INSERT INTO public.alert_catalog (codigo_alerta, categoria, nome, descricao, variaveis_disponiveis, tipo_disparo, ativo_por_padrao, template_padrao, prioridade_padrao)
VALUES
  ('os.criada', 'operacional', 'Nova OS aberta', 'Ordem de serviço criada', ARRAY['cliente','numero_os','marca','modelo','usuario','link_os','empresa'], 'tempo_real', false,
   E'Nova ordem de serviço aberta.\n\nOS: #{numero_os}\nCliente: {cliente}\nAparelho: {marca} {modelo}\nResponsável: {usuario}', 0),
  ('os.status_alterado', 'operacional', 'OS alterada de status', 'Status da OS alterado', ARRAY['cliente','numero_os','status','usuario','link_os'], 'tempo_real', false, 'OS #{numero_os} alterada para {status}. Cliente: {cliente}.', 0),
  ('os.finalizada', 'operacional', 'OS finalizada', 'Ordem de serviço finalizada', ARRAY['cliente','numero_os','usuario','link_os'], 'tempo_real', false, 'OS #{numero_os} finalizada. Cliente: {cliente}.', 0),
  ('os.entregue', 'operacional', 'OS entregue', 'OS entregue ao cliente', ARRAY['cliente','numero_os','usuario'], 'tempo_real', false, 'OS #{numero_os} entregue. Cliente: {cliente}.', 0),
  ('os.cancelada', 'operacional', 'Cancelamento de OS', 'OS cancelada', ARRAY['cliente','numero_os','usuario'], 'tempo_real', false, 'OS #{numero_os} cancelada. Cliente: {cliente}.', 0),
  ('os.orcamento_aprovado', 'operacional', 'Orçamento aprovado', 'Orçamento aprovado pelo cliente', ARRAY['cliente','numero_os','valor','usuario'], 'tempo_real', false, 'Orçamento OS #{numero_os} aprovado. Cliente: {cliente}. Valor: {valor}.', 0),
  ('os.orcamento_recusado', 'operacional', 'Orçamento recusado', 'Orçamento recusado', ARRAY['cliente','numero_os','usuario'], 'tempo_real', false, 'Orçamento OS #{numero_os} recusado. Cliente: {cliente}.', 0),
  ('devolucao.criada', 'operacional', 'Devolução registrada', 'Devolução de venda registrada', ARRAY['cliente','valor','usuario'], 'tempo_real', false,
   E'Uma devolução foi registrada no sistema.\n\nCliente: {cliente}\nValor: {valor}\nResponsável: {usuario}', 0),
  ('caixa.fechado', 'financeiro', 'Fechamento de caixa', 'Caixa fechado', ARRAY['valor_abertura','valor_fechamento','total_vendas','usuario'], 'tempo_real', true,
   E'Caixa fechado com sucesso.\n\nAbertura: {valor_abertura}\nFechamento: {valor_fechamento}\nTotal em vendas: {total_vendas}\nResponsável: {usuario}', 0),
  ('caixa.sangria', 'financeiro', 'Sangria realizada', 'Sangria de caixa', ARRAY['valor','usuario'], 'tempo_real', false, 'Sangria de {valor} realizada. Responsável: {usuario}.', 0),
  ('caixa.suprimento', 'financeiro', 'Suprimento realizado', 'Suprimento de caixa', ARRAY['valor','usuario'], 'tempo_real', false, 'Suprimento de {valor} realizado. Responsável: {usuario}.', 0),
  ('financeiro.despesa_lancada', 'financeiro', 'Despesa lançada', 'Nova despesa', ARRAY['descricao','valor','usuario'], 'tempo_real', false, 'Despesa lançada: {descricao} - {valor}.', 0),
  ('financeiro.conta_pagar_vencendo', 'financeiro', 'Conta a pagar vencendo', 'Conta a pagar vence hoje ou em breve', ARRAY['descricao','valor','data_vencimento'], 'agendado', true,
   E'Alerta financeiro.\n\nHá uma conta a pagar vencendo.\n\nDescrição: {descricao}\nValor: {valor}\nVencimento: {data_vencimento}', 1),
  ('financeiro.conta_pagar_atrasada', 'financeiro', 'Conta a pagar atrasada', 'Conta a pagar em atraso', ARRAY['descricao','valor','data_vencimento'], 'agendado', true, 'Conta a pagar atrasada: {descricao} - {valor}. Vencimento: {data_vencimento}.', 1),
  ('financeiro.conta_receber_vencendo', 'financeiro', 'Conta a receber vencendo', 'Conta a receber vence em breve', ARRAY['cliente','valor','data_vencimento'], 'agendado', false, 'Conta a receber vencendo: {cliente} - {valor}. Vencimento: {data_vencimento}.', 0),
  ('financeiro.conta_receber_atrasada', 'financeiro', 'Conta a receber atrasada', 'Conta a receber em atraso', ARRAY['cliente','valor','data_vencimento'], 'agendado', false, 'Conta a receber atrasada: {cliente} - {valor}.', 0),
  ('financeiro.pagamento_realizado', 'financeiro', 'Pagamento realizado', 'Pagamento de conta efetuado', ARRAY['descricao','valor','usuario'], 'tempo_real', false, 'Pagamento realizado: {descricao} - {valor}.', 0),
  ('financeiro.recebimento_confirmado', 'financeiro', 'Recebimento confirmado', 'Recebimento de valor confirmado', ARRAY['cliente','valor','usuario'], 'tempo_real', false, 'Recebimento confirmado: {cliente} - {valor}.', 0),
  ('venda.concluida', 'comercial', 'Venda concluída', 'Venda finalizada no PDV', ARRAY['total_vendas','quantidade_vendas','usuario'], 'tempo_real', false, 'Venda concluída. Total: {total_vendas}. Responsável: {usuario}.', 0),
  ('venda.meta_dia_atingida', 'comercial', 'Meta do dia atingida', 'Meta de vendas do dia atingida', ARRAY['total_vendas','meta','usuario'], 'tempo_real', false, 'Meta do dia atingida! Total: {total_vendas}. Meta: {meta}.', 0),
  ('venda.meta_mes_atingida', 'comercial', 'Meta do mês atingida', 'Meta mensal atingida', ARRAY['total_vendas','meta'], 'tempo_real', false, 'Meta do mês atingida! Total: {total_vendas}. Meta: {meta}.', 0),
  ('venda.resumo_diario', 'comercial', 'Resumo diário de vendas', 'Resumo automático do dia', ARRAY['total_vendas','quantidade_vendas','ticket_medio','empresa'], 'agendado', false,
   E'Resumo diário de vendas.\n\nTotal vendido: {total_vendas}\nQuantidade de vendas: {quantidade_vendas}\nTicket médio: {ticket_medio}', 0),
  ('venda.resumo_semanal', 'comercial', 'Resumo semanal', 'Resumo semanal de vendas', ARRAY['total_vendas','quantidade_vendas','ticket_medio','empresa'], 'agendado', false, 'Resumo semanal: Total {total_vendas}, {quantidade_vendas} vendas, ticket médio {ticket_medio}.', 0),
  ('venda.ticket_medio_dia', 'comercial', 'Ticket médio do dia', 'Ticket médio do dia', ARRAY['ticket_medio','quantidade_vendas'], 'tempo_real', false, 'Ticket médio do dia: {ticket_medio} ({quantidade_vendas} vendas).', 0),
  ('venda.quantidade_dia', 'comercial', 'Quantidade de vendas do dia', 'Número de vendas do dia', ARRAY['quantidade_vendas','total_vendas'], 'tempo_real', false, 'Quantidade de vendas hoje: {quantidade_vendas}. Total: {total_vendas}.', 0),
  ('gestao.desconto_acima_limite', 'gestao', 'Desconto acima do limite', 'Desconto aplicado acima do permitido', ARRAY['valor','limite','usuario'], 'tempo_real', true, 'Alerta: desconto acima do limite. Valor: {valor}. Limite: {limite}. Usuário: {usuario}.', 1),
  ('gestao.registro_excluido', 'gestao', 'Exclusão de registro importante', 'Registro excluído', ARRAY['tipo','id','usuario'], 'tempo_real', false, 'Registro excluído: {tipo} (ID: {id}). Usuário: {usuario}.', 0),
  ('gestao.valor_alterado_manual', 'gestao', 'Alteração manual de valor', 'Valor alterado manualmente', ARRAY['campo','valor_anterior','valor_novo','usuario'], 'tempo_real', false, 'Valor alterado manualmente: {campo}. De {valor_anterior} para {valor_novo}. Usuário: {usuario}.', 0),
  ('gestao.caixa_aberto_apos_horario', 'gestao', 'Caixa aberto após horário', 'Caixa ainda aberto fora do expediente', ARRAY['usuario','horario'], 'agendado', false, 'Alerta: caixa ainda aberto após {horario}. Responsável: {usuario}.', 0),
  ('gestao.os_parada', 'gestao', 'OS parada há muitos dias', 'OS sem movimento', ARRAY['numero_os','cliente','dias'], 'agendado', false, 'OS #{numero_os} parada há {dias} dias. Cliente: {cliente}.', 0),
  ('gestao.retirada_pendente', 'gestao', 'Cliente com aparelho aguardando retirada', 'Aparelhos prontos não retirados', ARRAY['cliente','numero_os','dias'], 'agendado', false, 'Cliente {cliente} com aparelho aguardando retirada (OS #{numero_os}, {dias} dias).', 0),
  ('gestao.baixa_movimentacao', 'gestao', 'Baixa movimentação no dia', 'Poucas vendas/movimentações no dia', ARRAY['quantidade_vendas','total_vendas'], 'agendado', false, 'Baixa movimentação hoje: {quantidade_vendas} vendas, total {total_vendas}.', 0)
ON CONFLICT (codigo_alerta) DO NOTHING;

SELECT 'Tabelas do Painel de Alertas criadas com sucesso.' AS resultado;
