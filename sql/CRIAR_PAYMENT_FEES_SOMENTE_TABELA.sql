-- =====================================================
-- SOMENTE a tabela payment_fees (sem INSERT de Fiado/Carteira)
-- Use este script NO BANCO que a API api.primecamp.cloud usa.
-- Se você rodou o outro script no DBeaver em "banco_gestao",
-- esse é outro banco. Rode ESTE script no banco da API.
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    payment_method_id UUID NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
    installments INTEGER NOT NULL DEFAULT 1,
    fee_percentage DECIMAL(5,2) DEFAULT 0,
    fee_fixed DECIMAL(10,2) DEFAULT 0,
    days_to_receive INTEGER DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_fees_method ON payment_fees(payment_method_id);
