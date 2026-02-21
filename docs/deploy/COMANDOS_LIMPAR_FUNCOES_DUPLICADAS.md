# Comandos para Limpar Funções Duplicadas

## 1. Verificar Funções Duplicadas

Primeiro, execute o script de verificação para ver quais funções estão duplicadas:

```bash
psql -U postgres -d seu_database -f sql/VERIFICAR_FUNCOES_DUPLICADAS.sql
```

Ou conecte no banco e execute:

```sql
-- Ver quais funções estão duplicadas
SELECT 
    name,
    display_name,
    COUNT(*) as quantidade
FROM roles
GROUP BY name, display_name
HAVING COUNT(*) > 1
ORDER BY name;
```

## 2. Limpar Funções Duplicadas

**⚠️ ATENÇÃO: Este script irá:**
- Manter apenas UMA função de cada tipo
- Manter a função com MAIS permissões associadas
- Se empatar, manterá a MAIS RECENTE (updated_at mais recente)
- Se empatar novamente, manterá a MAIS ANTIGA (created_at mais antiga)
- Atualizará automaticamente os usuários que estavam usando as funções deletadas

Execute o script de limpeza:

```bash
psql -U postgres -d seu_database -f sql/LIMPAR_FUNCOES_DUPLICADAS.sql
```

Ou conecte no banco e execute o script diretamente.

## 3. Verificar Resultado

Após executar, verifique se não há mais duplicações:

```sql
SELECT 
    name,
    display_name,
    COUNT(*) as quantidade
FROM roles
GROUP BY name, display_name
HAVING COUNT(*) > 1;
```

Se retornar 0 linhas, não há mais duplicações! ✅

## 4. Verificar Usuários Atualizados

Verifique se os usuários foram atualizados corretamente:

```sql
SELECT 
    p.role,
    COUNT(*) as usuarios
FROM profiles p
GROUP BY p.role
ORDER BY p.role;
```
