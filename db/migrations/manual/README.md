# Migrações manuais (PostgreSQL)

Esta pasta concentra os scripts SQL de migração aplicados **manualmente** no banco (ADD_*, ALTER_*, ADICIONAR_*, CREATE_*, FIX_*, etc.).

- **Uso:** executar no PostgreSQL da VPS (ou do ambiente alvo) com `psql -d banco -f arquivo.sql` ou pelo cliente (DBeaver, etc.).
- **Ordem:** em geral, respeitar dependências (ex.: criar tabela antes de ADD_FK). Quando a documentação em `docs/deploy` citar `sql/ADICIONAR_*.sql` ou caminho antigo, use **`db/migrations/manual/NOME_DO_ARQUIVO.sql`**.
- **Migrações de remoção de módulos** (ex.: drop de tabelas) podem estar em `server/migrations/` conforme o contexto do projeto.

Não remova arquivos sem conferir se a migração já foi aplicada em todos os ambientes e se não há referência em docs ou em outros scripts.
