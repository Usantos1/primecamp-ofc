# Verificar index.html no Servidor

Execute no servidor:

```bash
# Ver conteúdo do index.html no servidor
cat /var/www/primecamp.cloud/index.html | grep -A 5 -B 5 "script"

# OU ver o arquivo completo
head -50 /var/www/primecamp.cloud/index.html
tail -20 /var/www/primecamp.cloud/index.html
```

**O que procurar:**
- Em **produção**, o index.html deve ter: `<script type="module" src="/assets/index-XXXXX.js">`
- Em **desenvolvimento**, o index.html tem: `<script type="module" src="/src/main.tsx">`

Se o index.html no servidor ainda tem `/src/main.tsx`, isso significa que o arquivo `index.html` do código fonte foi copiado diretamente, e não o `index.html` gerado pelo build do Vite.

**Solução:**
O Vite gera um `index.html` diferente no `dist/` durante o build. Esse é o arquivo que deve ser copiado para o servidor, não o `index.html` da raiz do projeto.
