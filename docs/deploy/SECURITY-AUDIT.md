# Vulnerabilidades npm – status e o que fazer

## O que aconteceu

- **`npm audit fix`** – Corrigiu a maior parte (21 → 6) sem mudar versão major.
- **`npm audit fix --force`** – Atualizou Vite para 7.x, jsPDF para 4.x, react-quill para 0.0.2 (quebrando coisas). Pode ter deixado o build ou a app instável.

## Se a aplicação quebrou na VPS

Reverter dependências e voltar ao estado anterior:

```bash
cd ~/primecamp-ofc
git checkout package.json package-lock.json
npm install
```

Depois use só **`npm audit fix`** (sem `--force`).

## Correções recomendadas (sem --force)

### 1. jsPDF (critical) – atualizar para 4.x

No `package.json`, trocar `"jspdf": "^3.0.1"` por `"jspdf": "^4.1.0"`.  
Em seguida: `npm install` e testar geração de PDF (cupom, orçamento, etc.). A API do jsPDF 4 pode exigir pequenos ajustes no código.

### 2. xlsx (high) – sem correção oficial

O pacote `xlsx` (SheetJS) não tem versão corrigida no npm. Opções:

- **Curto prazo:** Manter e aceitar o risco (uso interno/importação de planilhas controlada).
- **Médio prazo:** Trocar por outra lib (ex.: `exceljs`) e refatorar os pontos que usam `xlsx`.

### 3. Vite / esbuild (moderate)

Só corrige subindo para Vite 7 (`npm audit fix --force`), que é breaking. Recomendação: manter Vite 5 por enquanto; em produção o servidor de dev do Vite não fica exposto.

### 4. react-quill / quill / lodash (moderate/critical na árvore)

O `--force` instalou react-quill 0.0.2 e trouxe `quilljs` com lodash vulnerável. Melhor manter **react-quill ^2.0.0** (como no package.json) e **não** usar `npm audit fix --force` de novo para esse pacote.

## Resumo

| Pacote   | Gravidade | Ação recomendada                                      |
|----------|-----------|--------------------------------------------------------|
| jspdf    | critical  | Atualizar para ^4.1.0 no package.json e testar PDFs   |
| xlsx     | high      | Sem fix; considerar trocar por exceljs no futuro      |
| vite     | moderate  | Manter 5.x; não usar --force                           |
| react-quill | moderate | Manter 2.x; não usar --force                        |

Depois de alterar o `package.json` (ex.: jsPDF), rodar na VPS:

```bash
npm install
npm run build
```

Se o build passar, fazer deploy normalmente.
