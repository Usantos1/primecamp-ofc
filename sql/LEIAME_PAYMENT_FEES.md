# Erro: "relation payment_fees does not exist" / "column name does not exist"

## Erro de sintaxe "at or near #"
Não cole mensagens de erro nem comentários no meio do script (ex.: `# Erro: ...`). Execute só o SQL do arquivo, sem adicionar texto na mesma janela.

## Por que o erro continua?

Você rodou o script no **banco local** (ex.: `banco_gestao` no DBeaver).  
A aplicação em **localhost:8080** usa a API em **https://api.primecamp.cloud**, que se conecta a **outro banco de dados** (servidor de produção).

A tabela `payment_fees` precisa existir **no banco que a API api.primecamp.cloud usa**.

## O que fazer

1. **Conectar no banco da API de produção**  
   Use o mesmo banco que está configurado no servidor da API (variáveis `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` no servidor api.primecamp.cloud).

2. **Rodar o script nesse banco**  
   Execute o conteúdo de `CRIAR_TABELA_PAYMENT_FEES.sql` nessa conexão (psql, DBeaver, ou o cliente que você usa no servidor).

3. **Se você só tem acesso ao banco local**  
   Para testar tudo localmente, configure a aplicação para usar a API local (variável `VITE_API_URL` apontando para seu backend local) e use o banco onde você já criou a tabela.

Resumo: **rodar o script no mesmo banco em que a API que você está usando (api.primecamp.cloud) se conecta.**

---

## Se der erro de "companies does not exist"

Se ao rodar o script aparecer erro referindo à tabela `companies`, use esta versão (sem foreign key em `company_id`):

```sql
CREATE TABLE IF NOT EXISTS payment_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NULL,
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
```
