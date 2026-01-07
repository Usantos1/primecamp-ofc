#!/bin/bash

echo "🔍 VERIFICANDO COMPANY_ID DOS USUÁRIOS"
echo "======================================"
echo ""

cd /root/primecamp-ofc || { echo "Erro: Diretório não encontrado."; exit 1; }

# Tentar ler do .env do servidor
if [ -f "server/.env" ]; then
    source server/.env
    export PGPASSWORD="$DB_PASSWORD"
    DB_HOST="${DB_HOST:-72.62.106.76}"
    DB_USER="${DB_USER:-postgres}"
    DB_NAME="${DB_NAME:-postgres}"
else
    echo "⚠️ Arquivo server/.env não encontrado. Usando valores padrão."
    echo "Por favor, informe a senha do PostgreSQL manualmente."
    read -sp "Senha do PostgreSQL: " PGPASSWORD
    export PGPASSWORD
    DB_HOST="72.62.106.76"
    DB_USER="postgres"
    DB_NAME="postgres"
fi

echo ""
echo "1️⃣ Listando todos os usuários com seus company_id..."
echo ""

psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" <<EOF
SELECT 
    u.id,
    u.email,
    u.company_id,
    c.name as company_name,
    p.role,
    p.display_name
FROM users u
LEFT JOIN companies c ON c.id = u.company_id
LEFT JOIN profiles p ON p.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 20;
EOF

echo ""
echo "2️⃣ Verificando quantos usuários têm company_id NULL..."
echo ""

psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" <<EOF
SELECT 
    COUNT(*) as total_usuarios,
    COUNT(u.company_id) as usuarios_com_company_id,
    COUNT(*) - COUNT(u.company_id) as usuarios_sem_company_id
FROM users u;
EOF

echo ""
echo "3️⃣ Listando usuários SEM company_id..."
echo ""

psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" <<EOF
SELECT 
    u.id,
    u.email,
    p.display_name,
    p.role,
    u.created_at
FROM users u
LEFT JOIN profiles p ON p.user_id = u.id
WHERE u.company_id IS NULL
ORDER BY u.created_at DESC;
EOF

echo ""
echo "4️⃣ Verificando empresas disponíveis..."
echo ""

psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" <<EOF
SELECT id, name, status FROM companies ORDER BY name LIMIT 10;
EOF

echo ""
echo "✅ Verificação concluída!"
echo ""

