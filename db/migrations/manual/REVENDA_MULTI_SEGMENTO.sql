-- =====================================================
-- MULTI-SEGMENTO: Segmentos, Módulos, Recursos
-- Permite empacotar o sistema por nicho (Oficina, Comércio, etc.)
-- Execute após INSTALAR_SISTEMA_REVENDA_COMPLETO.sql
-- =====================================================

-- 1. Tabela de Segmentos (Oficina Mecânica, Comércio, Assistência Técnica, etc.)
CREATE TABLE IF NOT EXISTS public.segmentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    descricao TEXT,
    icone VARCHAR(50) DEFAULT 'briefcase',
    cor VARCHAR(20) DEFAULT '#3b82f6',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Módulos (Dashboard, OS, PDV, Clientes, etc.)
CREATE TABLE IF NOT EXISTS public.modulos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    descricao TEXT,
    categoria VARCHAR(50),
    icone VARCHAR(50) DEFAULT 'box',
    path VARCHAR(255),
    label_menu VARCHAR(100),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Recursos (ações dentro de cada módulo)
CREATE TABLE IF NOT EXISTS public.recursos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modulo_id UUID NOT NULL REFERENCES public.modulos(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    slug VARCHAR(80) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(30) DEFAULT 'action',
    permission_key VARCHAR(100),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(modulo_id, slug)
);

-- 4. Segmento x Módulos (quais módulos cada segmento possui + ordem no menu)
CREATE TABLE IF NOT EXISTS public.segmentos_modulos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    segmento_id UUID NOT NULL REFERENCES public.segmentos(id) ON DELETE CASCADE,
    modulo_id UUID NOT NULL REFERENCES public.modulos(id) ON DELETE CASCADE,
    ativo BOOLEAN DEFAULT true,
    ordem_menu INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(segmento_id, modulo_id)
);

-- 5. Segmento x Recursos (quais recursos cada segmento possui)
CREATE TABLE IF NOT EXISTS public.segmentos_recursos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    segmento_id UUID NOT NULL REFERENCES public.segmentos(id) ON DELETE CASCADE,
    recurso_id UUID NOT NULL REFERENCES public.recursos(id) ON DELETE CASCADE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(segmento_id, recurso_id)
);

-- 6. Adicionar segmento_id em companies (nullable para não quebrar existentes)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'segmento_id') THEN
        ALTER TABLE public.companies ADD COLUMN segmento_id UUID REFERENCES public.segmentos(id) ON DELETE SET NULL;
        RAISE NOTICE 'Coluna segmento_id adicionada em companies.';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_companies_segmento ON public.companies(segmento_id);
CREATE INDEX IF NOT EXISTS idx_segmentos_modulos_segmento ON public.segmentos_modulos(segmento_id);
CREATE INDEX IF NOT EXISTS idx_segmentos_modulos_modulo ON public.segmentos_modulos(modulo_id);
CREATE INDEX IF NOT EXISTS idx_segmentos_recursos_segmento ON public.segmentos_recursos(segmento_id);
CREATE INDEX IF NOT EXISTS idx_recursos_modulo ON public.recursos(modulo_id);

-- Trigger updated_at para segmentos
CREATE OR REPLACE FUNCTION set_updated_at_segmentos()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Na 1ª execução pode aparecer NOTICE "trigger does not exist, skipping" — é normal
DROP TRIGGER IF EXISTS set_updated_at_segmentos ON public.segmentos;
CREATE TRIGGER set_updated_at_segmentos BEFORE UPDATE ON public.segmentos FOR EACH ROW EXECUTE PROCEDURE set_updated_at_segmentos();

-- =====================================================
-- SEEDS: Módulos do sistema (reutilizáveis por segmento)
-- =====================================================
INSERT INTO public.modulos (id, nome, slug, descricao, categoria, icone, path, label_menu, ativo) VALUES
    ('a1000001-0000-4000-8000-000000000001', 'Dashboard', 'dashboard', 'Visão geral e indicadores', 'operacao', 'layout-dashboard', '/', 'Dashboard', true),
    ('a1000001-0000-4000-8000-000000000002', 'Ordens de Serviço', 'ordens_servico', 'Gestão de OS', 'operacao', 'wrench', '/os', 'Ordens de Serviço', true),
    ('a1000001-0000-4000-8000-000000000003', 'Clientes', 'clientes', 'Cadastro de clientes', 'operacao', 'users', '/clientes', 'Clientes', true),
    ('a1000001-0000-4000-8000-000000000004', 'Veículos', 'veiculos', 'Cadastro de veículos', 'operacao', 'car', '/veiculos', 'Veículos', true),
    ('a1000001-0000-4000-8000-000000000005', 'Orçamentos', 'orcamentos', 'Orçamentos', 'operacao', 'file-text', '/orcamentos', 'Orçamentos', true),
    ('a1000001-0000-4000-8000-000000000006', 'Estoque', 'estoque', 'Controle de estoque', 'estoque', 'package', '/inventario', 'Estoque', true),
    ('a1000001-0000-4000-8000-000000000007', 'Produtos e Peças', 'produtos_pecas', 'Produtos e peças', 'estoque', 'box', '/produtos', 'Produtos e Peças', true),
    ('a1000001-0000-4000-8000-000000000008', 'PDV', 'pdv', 'Ponto de venda', 'operacao', 'shopping-cart', '/pdv', 'PDV', true),
    ('a1000001-0000-4000-8000-000000000009', 'Vendas', 'vendas', 'Histórico de vendas', 'operacao', 'receipt', '/pdv/vendas', 'Vendas', true),
    ('a1000001-0000-4000-8000-000000000010', 'Pedidos', 'pedidos', 'Pedidos', 'estoque', 'list', '/pedidos', 'Pedidos', true),
    ('a1000001-0000-4000-8000-000000000011', 'Devoluções', 'devolucoes', 'Devoluções', 'operacao', 'refresh-cw', '/pdv/devolucoes', 'Devoluções', true),
    ('a1000001-0000-4000-8000-000000000012', 'Caixa', 'caixa', 'Caixa', 'operacao', 'wallet', '/pdv/caixa', 'Caixa', true),
    ('a1000001-0000-4000-8000-000000000013', 'Financeiro', 'financeiro', 'Financeiro', 'gestao', 'bar-chart-3', '/financeiro', 'Financeiro', true),
    ('a1000001-0000-4000-8000-000000000014', 'Relatórios', 'relatorios', 'Relatórios', 'gestao', 'file-text', '/relatorios', 'Relatórios', true),
    ('a1000001-0000-4000-8000-000000000015', 'Painel de Alertas', 'painel_alertas', 'Alertas', 'gestao', 'activity', '/painel-alertas', 'Painel de Alertas', true)
ON CONFLICT (id) DO NOTHING;

-- Inserir por slug para evitar conflito de ID em ambientes já com dados
INSERT INTO public.modulos (nome, slug, descricao, categoria, icone, path, label_menu, ativo)
SELECT 'Dashboard', 'dashboard', 'Visão geral', 'operacao', 'layout-dashboard', '/', 'Dashboard', true
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE slug = 'dashboard');
INSERT INTO public.modulos (nome, slug, descricao, categoria, icone, path, label_menu, ativo)
SELECT 'Ordens de Serviço', 'ordens_servico', 'Gestão de OS', 'operacao', 'wrench', '/os', 'Ordens de Serviço', true
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE slug = 'ordens_servico');
INSERT INTO public.modulos (nome, slug, descricao, categoria, icone, path, label_menu, ativo)
SELECT 'Clientes', 'clientes', 'Cadastro de clientes', 'operacao', 'users', '/clientes', 'Clientes', true
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE slug = 'clientes');
INSERT INTO public.modulos (nome, slug, descricao, categoria, icone, path, label_menu, ativo)
SELECT 'Veículos', 'veiculos', 'Cadastro de veículos', 'operacao', 'car', '/veiculos', 'Veículos', true
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE slug = 'veiculos');
INSERT INTO public.modulos (nome, slug, descricao, categoria, icone, path, label_menu, ativo)
SELECT 'Orçamentos', 'orcamentos', 'Orçamentos', 'operacao', 'file-text', '/orcamentos', 'Orçamentos', true
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE slug = 'orcamentos');
INSERT INTO public.modulos (nome, slug, descricao, categoria, icone, path, label_menu, ativo)
SELECT 'Estoque', 'estoque', 'Controle de estoque', 'estoque', 'package', '/inventario', 'Estoque', true
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE slug = 'estoque');
INSERT INTO public.modulos (nome, slug, descricao, categoria, icone, path, label_menu, ativo)
SELECT 'Produtos e Peças', 'produtos_pecas', 'Produtos e peças', 'estoque', 'box', '/produtos', 'Produtos e Peças', true
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE slug = 'produtos_pecas');
INSERT INTO public.modulos (nome, slug, descricao, categoria, icone, path, label_menu, ativo)
SELECT 'PDV', 'pdv', 'Ponto de venda', 'operacao', 'shopping-cart', '/pdv', 'PDV', true
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE slug = 'pdv');
INSERT INTO public.modulos (nome, slug, descricao, categoria, icone, path, label_menu, ativo)
SELECT 'Vendas', 'vendas', 'Histórico de vendas', 'operacao', 'receipt', '/pdv/vendas', 'Vendas', true
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE slug = 'vendas');
INSERT INTO public.modulos (nome, slug, descricao, categoria, icone, path, label_menu, ativo)
SELECT 'Pedidos', 'pedidos', 'Pedidos', 'estoque', 'list', '/pedidos', 'Pedidos', true
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE slug = 'pedidos');
INSERT INTO public.modulos (nome, slug, descricao, categoria, icone, path, label_menu, ativo)
SELECT 'Devoluções', 'devolucoes', 'Devoluções', 'operacao', 'refresh-cw', '/pdv/devolucoes', 'Devoluções', true
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE slug = 'devolucoes');
INSERT INTO public.modulos (nome, slug, descricao, categoria, icone, path, label_menu, ativo)
SELECT 'Caixa', 'caixa', 'Caixa', 'operacao', 'wallet', '/pdv/caixa', 'Caixa', true
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE slug = 'caixa');
INSERT INTO public.modulos (nome, slug, descricao, categoria, icone, path, label_menu, ativo)
SELECT 'Financeiro', 'financeiro', 'Financeiro', 'gestao', 'bar-chart-3', '/financeiro', 'Financeiro', true
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE slug = 'financeiro');
INSERT INTO public.modulos (nome, slug, descricao, categoria, icone, path, label_menu, ativo)
SELECT 'Relatórios', 'relatorios', 'Relatórios', 'gestao', 'file-text', '/relatorios', 'Relatórios', true
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE slug = 'relatorios');
INSERT INTO public.modulos (nome, slug, descricao, categoria, icone, path, label_menu, ativo)
SELECT 'Painel de Alertas', 'painel_alertas', 'Alertas', 'gestao', 'activity', '/painel-alertas', 'Painel de Alertas', true
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE slug = 'painel_alertas');

-- =====================================================
-- SEEDS: Segmentos iniciais
-- =====================================================
INSERT INTO public.segmentos (id, nome, slug, descricao, icone, cor, ativo) VALUES
    ('b2000001-0000-4000-8000-000000000001', 'Assistência Técnica', 'assistencia_tecnica', 'Celulares, eletrônicos, equipamentos', 'smartphone', '#10b981', true),
    ('b2000001-0000-4000-8000-000000000002', 'Oficina Mecânica', 'oficina_mecanica', 'Oficinas e auto centers', 'car', '#f59e0b', true),
    ('b2000001-0000-4000-8000-000000000003', 'Comércio', 'comercio', 'Lojas físicas e varejo', 'shopping-cart', '#3b82f6', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.segmentos (nome, slug, descricao, icone, cor, ativo)
SELECT 'Assistência Técnica', 'assistencia_tecnica', 'Celulares, eletrônicos, equipamentos', 'smartphone', '#10b981', true
WHERE NOT EXISTS (SELECT 1 FROM public.segmentos WHERE slug = 'assistencia_tecnica');
INSERT INTO public.segmentos (nome, slug, descricao, icone, cor, ativo)
SELECT 'Oficina Mecânica', 'oficina_mecanica', 'Oficinas e auto centers', 'car', '#f59e0b', true
WHERE NOT EXISTS (SELECT 1 FROM public.segmentos WHERE slug = 'oficina_mecanica');
INSERT INTO public.segmentos (nome, slug, descricao, icone, cor, ativo)
SELECT 'Comércio', 'comercio', 'Lojas físicas e varejo', 'shopping-cart', '#3b82f6', true
WHERE NOT EXISTS (SELECT 1 FROM public.segmentos WHERE slug = 'comercio');

-- =====================================================
-- Recursos por módulo (buscar modulo_id por slug)
-- =====================================================
-- Recursos do módulo Dashboard
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Visão de indicadores', 'dashboard_indicadores', 'Indicadores do dashboard', 'dashboard.view', true FROM public.modulos m WHERE m.slug = 'dashboard' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'dashboard_indicadores');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Serviços em andamento', 'dashboard_servicos_andamento', 'OS em andamento', 'os.view', true FROM public.modulos m WHERE m.slug = 'dashboard' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'dashboard_servicos_andamento');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Faturamento do dia', 'dashboard_faturamento', 'Faturamento', 'dashboard.view', true FROM public.modulos m WHERE m.slug = 'dashboard' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'dashboard_faturamento');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Vendas do dia', 'dashboard_vendas_dia', 'Vendas do dia', 'vendas.view', true FROM public.modulos m WHERE m.slug = 'dashboard' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'dashboard_vendas_dia');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Ticket médio', 'dashboard_ticket_medio', 'Ticket médio', 'vendas.view', true FROM public.modulos m WHERE m.slug = 'dashboard' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'dashboard_ticket_medio');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Estoque baixo', 'dashboard_estoque_baixo', 'Alertas estoque', 'produtos.view', true FROM public.modulos m WHERE m.slug = 'dashboard' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'dashboard_estoque_baixo');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Contas pendentes', 'dashboard_contas_pendentes', 'Contas a pagar/receber', 'relatorios.financeiro', true FROM public.modulos m WHERE m.slug = 'dashboard' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'dashboard_contas_pendentes');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Alertas operacionais', 'dashboard_alertas', 'Alertas', 'dashboard.view', true FROM public.modulos m WHERE m.slug = 'dashboard' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'dashboard_alertas');

-- Recursos do módulo Ordens de Serviço
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Abrir OS', 'abrir_os', 'Abrir ordem de serviço', 'os.create', true FROM public.modulos m WHERE m.slug = 'ordens_servico' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'abrir_os');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Editar OS', 'editar_os', 'Editar OS', 'os.edit', true FROM public.modulos m WHERE m.slug = 'ordens_servico' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'editar_os');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Alterar status', 'alterar_status_os', 'Alterar status da OS', 'os.edit', true FROM public.modulos m WHERE m.slug = 'ordens_servico' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'alterar_status_os');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Checklist de entrada', 'checklist_entrada', 'Checklist', 'os.create', true FROM public.modulos m WHERE m.slug = 'ordens_servico' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'checklist_entrada');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Anexar fotos', 'anexar_fotos', 'Anexar fotos na OS', 'os.edit', true FROM public.modulos m WHERE m.slug = 'ordens_servico' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'anexar_fotos');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Adicionar serviços executados', 'servicos_executados', 'Serviços na OS', 'os.edit', true FROM public.modulos m WHERE m.slug = 'ordens_servico' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'servicos_executados');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Adicionar peças utilizadas', 'pecas_utilizadas', 'Peças na OS', 'os.edit', true FROM public.modulos m WHERE m.slug = 'ordens_servico' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'pecas_utilizadas');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Impressão de OS', 'impressao_os', 'Imprimir OS', 'os.view', true FROM public.modulos m WHERE m.slug = 'ordens_servico' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'impressao_os');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Link de acompanhamento', 'link_acompanhamento', 'Link acompanhamento', 'os.view', true FROM public.modulos m WHERE m.slug = 'ordens_servico' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'link_acompanhamento');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Finalização da OS', 'finalizacao_os', 'Finalizar OS', 'os.edit', true FROM public.modulos m WHERE m.slug = 'ordens_servico' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'finalizacao_os');

-- Recursos do módulo Clientes
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Cadastro de clientes', 'cadastrar_cliente', 'Cadastrar cliente', 'clientes.create', true FROM public.modulos m WHERE m.slug = 'clientes' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'cadastrar_cliente');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Histórico de serviços', 'historico_servicos', 'Histórico', 'clientes.view', true FROM public.modulos m WHERE m.slug = 'clientes' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'historico_servicos');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Histórico de compras', 'historico_compras', 'Histórico de compras', 'clientes.view', true FROM public.modulos m WHERE m.slug = 'clientes' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'historico_compras');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Busca rápida', 'busca_rapida', 'Busca', 'clientes.view', true FROM public.modulos m WHERE m.slug = 'clientes' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'busca_rapida');

-- Recursos do módulo Veículos
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Cadastro de veículo', 'cadastrar_veiculo', 'Cadastrar veículo', 'clientes.edit', true FROM public.modulos m WHERE m.slug = 'veiculos' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'cadastrar_veiculo');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Histórico por veículo', 'historico_veiculo', 'Histórico do veículo', 'clientes.view', true FROM public.modulos m WHERE m.slug = 'veiculos' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'historico_veiculo');

-- Recursos do módulo Orçamentos
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Criar orçamento', 'criar_orcamento', 'Criar orçamento', 'os.create', true FROM public.modulos m WHERE m.slug = 'orcamentos' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'criar_orcamento');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Aprovar orçamento', 'aprovar_orcamento', 'Aprovar', 'os.edit', true FROM public.modulos m WHERE m.slug = 'orcamentos' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'aprovar_orcamento');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Reprovar orçamento', 'reprovar_orcamento', 'Reprovar', 'os.edit', true FROM public.modulos m WHERE m.slug = 'orcamentos' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'reprovar_orcamento');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Converter orçamento em OS', 'converter_orcamento_os', 'Converter em OS', 'os.create', true FROM public.modulos m WHERE m.slug = 'orcamentos' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'converter_orcamento_os');

-- Recursos do módulo Estoque / Produtos
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Cadastro de peças', 'cadastrar_pecas', 'Cadastrar peças', 'produtos.create', true FROM public.modulos m WHERE m.slug = 'produtos_pecas' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'cadastrar_pecas');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Cadastro de produtos', 'cadastrar_produto', 'Cadastrar produto', 'produtos.create', true FROM public.modulos m WHERE m.slug = 'produtos_pecas' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'cadastrar_produto');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Entrada e saída', 'entrada_saida', 'Movimentação', 'produtos.edit', true FROM public.modulos m WHERE m.slug = 'estoque' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'entrada_saida');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Ajuste manual', 'ajuste_manual', 'Ajuste de estoque', 'produtos.edit', true FROM public.modulos m WHERE m.slug = 'estoque' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'ajuste_manual');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Inventário', 'inventario', 'Inventário', 'produtos.view', true FROM public.modulos m WHERE m.slug = 'estoque' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'inventario');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Estoque mínimo', 'estoque_minimo', 'Alertas estoque mínimo', 'produtos.view', true FROM public.modulos m WHERE m.slug = 'estoque' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'estoque_minimo');

-- Recursos do módulo PDV
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Venda rápida', 'venda_rapida', 'Venda rápida', 'vendas.create', true FROM public.modulos m WHERE m.slug = 'pdv' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'venda_rapida');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Múltiplas formas de pagamento', 'multiplos_pagamentos', 'Formas de pagamento', 'vendas.create', true FROM public.modulos m WHERE m.slug = 'pdv' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'multiplos_pagamentos');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Desconto', 'desconto', 'Aplicar desconto', 'vendas.create', true FROM public.modulos m WHERE m.slug = 'pdv' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'desconto');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Impressão de comprovante', 'impressao_comprovante', 'Imprimir comprovante', 'vendas.create', true FROM public.modulos m WHERE m.slug = 'pdv' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'impressao_comprovante');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Registrar venda', 'registrar_venda', 'Registrar venda', 'vendas.create', true FROM public.modulos m WHERE m.slug = 'vendas' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'registrar_venda');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Cancelamento', 'cancelamento_venda', 'Cancelar venda', 'vendas.manage', true FROM public.modulos m WHERE m.slug = 'vendas' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'cancelamento_venda');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Registrar devolução', 'registrar_devolucao', 'Registrar devolução', 'vendas.manage', true FROM public.modulos m WHERE m.slug = 'devolucoes' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'registrar_devolucao');

-- Recursos do módulo Caixa
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Abertura de caixa', 'abrir_caixa', 'Abrir caixa', 'caixa.open', true FROM public.modulos m WHERE m.slug = 'caixa' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'abrir_caixa');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Fechamento de caixa', 'fechar_caixa', 'Fechar caixa', 'caixa.close', true FROM public.modulos m WHERE m.slug = 'caixa' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'fechar_caixa');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Sangria', 'sangria', 'Sangria', 'caixa.sangria', true FROM public.modulos m WHERE m.slug = 'caixa' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'sangria');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Suprimento', 'suprimento', 'Suprimento', 'caixa.suprimento', true FROM public.modulos m WHERE m.slug = 'caixa' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'suprimento');

-- Recursos do módulo Financeiro
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Contas a pagar', 'contas_pagar', 'Contas a pagar', 'relatorios.financeiro', true FROM public.modulos m WHERE m.slug = 'financeiro' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'contas_pagar');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Contas a receber', 'contas_receber', 'Contas a receber', 'relatorios.financeiro', true FROM public.modulos m WHERE m.slug = 'financeiro' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'contas_receber');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Fluxo de caixa', 'fluxo_caixa', 'Fluxo de caixa', 'relatorios.financeiro', true FROM public.modulos m WHERE m.slug = 'financeiro' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'fluxo_caixa');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'DRE', 'dre', 'DRE', 'relatorios.financeiro', true FROM public.modulos m WHERE m.slug = 'financeiro' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'dre');

-- Recursos do módulo Pedidos
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Criação de pedido', 'criar_pedido', 'Criar pedido', 'produtos.view', true FROM public.modulos m WHERE m.slug = 'pedidos' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'criar_pedido');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Atualização de status', 'atualizar_status_pedido', 'Atualizar status', 'produtos.edit', true FROM public.modulos m WHERE m.slug = 'pedidos' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'atualizar_status_pedido');

-- Recursos do módulo Relatórios e Painel de Alertas (genéricos)
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Relatórios gerais', 'relatorios_gerais', 'Relatórios', 'relatorios.view', true FROM public.modulos m WHERE m.slug = 'relatorios' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'relatorios_gerais');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Alertas', 'alertas', 'Painel de alertas', 'relatorios.financeiro', true FROM public.modulos m WHERE m.slug = 'painel_alertas' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'alertas');


-- =====================================================
-- Vínculos: Oficina Mecânica - Módulos (ordem do menu)
-- =====================================================
DO $$
DECLARE
    seg_id UUID;
    mod_id UUID;
    ord INTEGER;
    r RECORD;
BEGIN
    SELECT id INTO seg_id FROM public.segmentos WHERE slug = 'oficina_mecanica' LIMIT 1;
    IF seg_id IS NULL THEN RETURN; END IF;

    ord := 0;
    FOR r IN (SELECT slug FROM (VALUES ('dashboard'), ('ordens_servico'), ('clientes'), ('veiculos'), ('orcamentos'), ('pdv'), ('estoque'), ('produtos_pecas'), ('caixa'), ('financeiro'), ('relatorios'), ('painel_alertas')) AS t(slug))
    LOOP
        SELECT id INTO mod_id FROM public.modulos WHERE modulos.slug = r.slug LIMIT 1;
        IF mod_id IS NOT NULL THEN
            INSERT INTO public.segmentos_modulos (segmento_id, modulo_id, ativo, ordem_menu)
            VALUES (seg_id, mod_id, true, ord)
            ON CONFLICT (segmento_id, modulo_id) DO UPDATE SET ordem_menu = ord, ativo = true;
            ord := ord + 1;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- Vínculos: Comércio - Módulos (ordem do menu)
-- =====================================================
DO $$
DECLARE
    seg_id UUID;
    mod_id UUID;
    ord INTEGER;
    r RECORD;
BEGIN
    SELECT id INTO seg_id FROM public.segmentos WHERE slug = 'comercio' LIMIT 1;
    IF seg_id IS NULL THEN RETURN; END IF;

    ord := 0;
    FOR r IN (SELECT slug FROM (VALUES ('dashboard'), ('pdv'), ('vendas'), ('clientes'), ('produtos_pecas'), ('estoque'), ('pedidos'), ('devolucoes'), ('caixa'), ('financeiro'), ('relatorios'), ('painel_alertas')) AS t(slug))
    LOOP
        SELECT id INTO mod_id FROM public.modulos WHERE modulos.slug = r.slug LIMIT 1;
        IF mod_id IS NOT NULL THEN
            INSERT INTO public.segmentos_modulos (segmento_id, modulo_id, ativo, ordem_menu)
            VALUES (seg_id, mod_id, true, ord)
            ON CONFLICT (segmento_id, modulo_id) DO UPDATE SET ordem_menu = ord, ativo = true;
            ord := ord + 1;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- Vínculos: Oficina Mecânica - Recursos (todos os recursos dos módulos do segmento)
-- =====================================================
INSERT INTO public.segmentos_recursos (segmento_id, recurso_id, ativo)
SELECT sm.segmento_id, r.id, true
FROM public.segmentos_modulos sm
JOIN public.recursos r ON r.modulo_id = sm.modulo_id
WHERE sm.segmento_id = (SELECT id FROM public.segmentos WHERE slug = 'oficina_mecanica' LIMIT 1)
ON CONFLICT (segmento_id, recurso_id) DO UPDATE SET ativo = true;

-- =====================================================
-- Vínculos: Comércio - Recursos (todos os recursos dos módulos do segmento)
-- =====================================================
INSERT INTO public.segmentos_recursos (segmento_id, recurso_id, ativo)
SELECT sm.segmento_id, r.id, true
FROM public.segmentos_modulos sm
JOIN public.recursos r ON r.modulo_id = sm.modulo_id
WHERE sm.segmento_id = (SELECT id FROM public.segmentos WHERE slug = 'comercio' LIMIT 1)
ON CONFLICT (segmento_id, recurso_id) DO UPDATE SET ativo = true;

-- =====================================================
-- Vínculos: Assistência Técnica - Módulos (ordem do menu)
-- Celulares, eletrônicos, equipamentos: OS, clientes, orçamentos, estoque, caixa, financeiro
-- =====================================================
DO $$
DECLARE
    seg_id UUID;
    mod_id UUID;
    ord INTEGER;
    r RECORD;
BEGIN
    SELECT id INTO seg_id FROM public.segmentos WHERE slug = 'assistencia_tecnica' LIMIT 1;
    IF seg_id IS NULL THEN RETURN; END IF;

    ord := 0;
    FOR r IN (SELECT slug FROM (VALUES ('dashboard'), ('ordens_servico'), ('clientes'), ('orcamentos'), ('estoque'), ('produtos_pecas'), ('caixa'), ('financeiro'), ('relatorios'), ('painel_alertas')) AS t(slug))
    LOOP
        SELECT id INTO mod_id FROM public.modulos WHERE modulos.slug = r.slug LIMIT 1;
        IF mod_id IS NOT NULL THEN
            INSERT INTO public.segmentos_modulos (segmento_id, modulo_id, ativo, ordem_menu)
            VALUES (seg_id, mod_id, true, ord)
            ON CONFLICT (segmento_id, modulo_id) DO UPDATE SET ordem_menu = ord, ativo = true;
            ord := ord + 1;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- Vínculos: Assistência Técnica - Recursos (todos os recursos dos módulos do segmento)
-- =====================================================
INSERT INTO public.segmentos_recursos (segmento_id, recurso_id, ativo)
SELECT sm.segmento_id, r.id, true
FROM public.segmentos_modulos sm
JOIN public.recursos r ON r.modulo_id = sm.modulo_id
WHERE sm.segmento_id = (SELECT id FROM public.segmentos WHERE slug = 'assistencia_tecnica' LIMIT 1)
ON CONFLICT (segmento_id, recurso_id) DO UPDATE SET ativo = true;
