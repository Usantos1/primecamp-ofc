-- Configuração de status de OS: global por empresa (um único conjunto por company_id)
-- Substitui o uso de localStorage; todos os usuários e dispositivos veem a mesma config.
--
-- OBRIGATÓRIO: Rodar este script no MESMO PostgreSQL que a API (api.primecamp.cloud) usa.
-- Se a tabela não existir nesse banco, /pdv/configuracao-status retorna 500 ao salvar/carregar.

CREATE TABLE IF NOT EXISTS os_config_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  status VARCHAR(80) NOT NULL,
  label VARCHAR(120) NOT NULL,
  cor VARCHAR(80) DEFAULT 'bg-blue-500',
  notificar_whatsapp BOOLEAN DEFAULT false,
  mensagem_whatsapp TEXT,
  ordem INTEGER NOT NULL DEFAULT 1,
  ativo BOOLEAN DEFAULT true,
  acao VARCHAR(40) DEFAULT 'nenhuma',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, status)
);

CREATE INDEX IF NOT EXISTS idx_os_config_status_company ON os_config_status(company_id);

COMMENT ON TABLE os_config_status IS 'Configuração de status de OS por empresa (label, cor, WhatsApp, ação). Uma única config global por empresa.';
