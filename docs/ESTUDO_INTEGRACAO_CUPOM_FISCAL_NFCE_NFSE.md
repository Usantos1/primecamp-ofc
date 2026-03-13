# Estudo: Integração para Emissão de Cupom Fiscal (NFC-e e NFS-e)

## 1. Objetivo

Este documento analisa como integrar o sistema Prime Camp à emissão de **cupom fiscal** no Brasil, com foco em **Campinas/SP** e nos demais estados, cobrindo:

- **NFC-e** (Nota Fiscal do Consumidor Eletrônica) — venda de **mercadorias** no varejo (PDV).
- **NFS-e** (Nota Fiscal de Serviço Eletrônica) — prestação de **serviços** (ex.: oficina, assistência técnica), quando exigido pelo município.

---

## 2. Situação atual do sistema

- **PDV** já registra vendas em `sales`, `sale_items`, `sale_payments`.
- Geração de **cupom não fiscal** (térmico 80mm e PDF) para impressão e compartilhamento.
- Tipo de documento em `documents`: `cupom_nao_fiscal`, `nota_fiscal` (previsto, não integrado a SEFAZ).
- Dados de empresa (nome, CNPJ) hoje em parte hardcoded; o sistema é **multi-empresa** (`companies`, `company_id`).
- **Nenhuma** integração hoje com SEFAZ, prefeitura ou provedor de NFC-e/NFS-e.

Para emissão fiscal de verdade é necessário:

1. Escolher e integrar um **provedor de API** (NFC-e e/ou NFS-e).
2. Armazenar por empresa: **certificado digital**, **inscrição estadual/municipal**, endereço completo, etc.
3. Após confirmar a venda (ou no fechamento), chamar a API do provedor e gravar **chave/ID da NFC-e** (e link do DANFE) na venda.
4. Opcional: **NFS-e** para serviços (ex.: Campinas) quando o negócio for oficina/serviço.

---

## 3. NFC-e (Nota Fiscal do Consumidor Eletrônica)

### 3.1 O que é

- Documento **eletrônico** que substitui o cupom fiscal em papel.
- Usado em **varejo** (venda de mercadorias ao consumidor final, no mesmo estado).
- Emitida perante a **SEFAZ do estado** (no caso de Campinas, **SEFAZ-SP**).
- Gera **XML** assinado, **DANFE** (espelho para impressão) e **QR Code** para consulta pelo consumidor.

### 3.2 Obrigatoriedade por estado (visão geral)

| Região   | Estados com NFC-e obrigatória (exemplos) |
|----------|-------------------------------------------|
| **SP**   | São Paulo (NFC-e obrigatória; SAT-CF-e em equipamentos físicos também existe) |
| **Demais** | Praticamente todos os estados já possuem NFC-e, cada um com cronograma próprio. |
| **SC**   | Obrigatoriedade escalonada a partir de **mar/2025** (Ato DIAT nº 56/2024). |
| **CE**   | Ceará ainda **não aceita** NFC-e (usa outro modelo). |

Para **Campinas/SP**: a empresa está no **estado de São Paulo**, então a emissão é feita na **SEFAZ-SP** (NFC-e). O município de Campinas não “emite” a NFC-e; a SEFAZ emite. Campinas pode exigir **NFS-e** para **serviços** (ver seção 4).

### 3.3 Requisitos técnicos e cadastrais (NFC-e)

- **Certificado digital A1** (e-CNPJ) válido — arquivo `.pfx` ou `.p12` com senha.
- **Inscrição Estadual (IE)** ativa.
- **Cadastro** no ambiente da SEFAZ do estado (produção/homologação).
- **Numeração** da NFC-e: sequencial por série (ex.: série 1) e por ambiente; o provedor de API costuma gerenciar ou exigir que o sistema envie o próximo número.
- Dados da **empresa**: razão social, CNPJ, endereço completo, CEP, município, UF, etc.
- Dados do **consumidor** (quando informado): nome, CPF/CNPJ.
- **Itens**: descrição, NCM, CFOP, CST, quantidade, valor unitário, valor total, unidade.
- **Pagamento**: forma (dinheiro, cartão, PIX etc.) e valor.

O sistema já tem: itens da venda, totais, formas de pagamento, cliente (nome, CPF/CNPJ). Falta: NCM/CFOP por produto (ou padrão), e lado empresa: certificado, IE, endereço completo por `company_id`.

---

## 4. NFS-e (Nota Fiscal de Serviço Eletrônica) — Campinas/SP

### 4.1 O que é

- Nota fiscal **municipal** para **prestação de serviços** (ISS).
- Em **Campinas**, a prefeitura exige NFS-e para diversos serviços (incluindo oficina mecânica, assistência técnica, etc.).
- Portal: [Sistema NFSe Campinas](https://nfse.campinas.sp.gov.br/NotaFiscal/index.php) / [Portal API Campinas](http://portal-api.campinas.sp.gov.br/servico/sistema-nfse-campinas).

### 4.2 Requisitos em Campinas

- **Cadastro** na Prefeitura de Campinas (contribuinte ISS).
- **Inscrição Municipal**.
- **Certificado digital** (e-CNPJ).
- **CNAE** de 9 dígitos (obrigatório).
- **Padrão ABRASF 2.03** (usado pelo município).
- **Item da lista de serviços** (LC 116/2003).
- **Um item de serviço por nota** (em muitos municípios é 1 serviço = 1 NFS-e; valores podem ser compostos).

Para **oficina/assistência** em Campinas: além do PDV (NFC-e para peças), pode ser necessário emitir **NFS-e** para o serviço (mão de obra). A integração seria: ao finalizar uma OS ou venda de serviço, disparar a emissão da NFS-e via API (provedor que suporte Campinas).

### 4.3 Integração NFS-e Campinas

- Prefeitura oferece ambiente próprio; na prática, a integração costuma ser feita via **provedores de API** que já falam com o sistema da prefeitura (ex.: Focus NFe, NFE.io, Nuvem Fiscal), evitando implementar o webservice municipal na mão.
- Documentação de integração: ver sites oficiais da prefeitura e dos provedores (ex.: [Focus NFe – NFS-e Campinas](https://focusnfe.com.br/blog/nfse-campinas-cidades-atendidas-pelo-focus-nfe/)).

---

## 5. Provedores de API (NFC-e e NFS-e)

Solução recomendada: **não** falar direto com SEFAZ/prefeitura; usar um **provedor** que já faz isso e oferece API REST (JSON).

### 5.1 Comparativo resumido

| Provedor      | NFC-e | NFS-e (Campinas) | Modelo de preço (exemplos) | Observação |
|---------------|-------|-------------------|-----------------------------|------------|
| **Focus NFe** | Sim   | Sim (Campinas)    | Plano Retail ~R$ 59,90/mês (1 CNPJ, 500 NFC-e + 100 NFe); Retail+ para multi-CNPJ | Muito usado, documentação boa, contingência, SAT/MFe (SP/CE) |
| **Nuvem Fiscal** | Sim | Sim (vários municípios) | Planos por volume (ex.: 10k/100k operações/mês) | API REST, OAuth2 |
| **NFE.io**    | Sim   | Sim (Campinas)    | Planos por emissão          | Foco em integração |
| **eNotas**    | Sim   | Sim               | Planos por volume           | API v2 documentada |
| **ACBr API**  | Sim   | Depende           | Self-hosted / serviço       | Open source, mais controle e mais trabalho |

### 5.2 Focus NFe (exemplo de integração NFC-e)

- Documentação: [Focus NFe – NFC-e](https://focusnfe.com.br/guides/nfce/).
- Fluxo típico:
  1. **Cadastrar empresa** no painel (ou via API): CNPJ, IE, endereço, certificado A1.
  2. **POST** para criar NFC-e: enviar JSON com emitente, destinatário (opcional), itens (com NCM, CFOP, CST), pagamentos.
  3. Resposta: `id`, `ref`, `caminho_xml`, `caminho_danfe`, `status` (autorizada, rejeitada, etc.).
  4. Guardar na `sales` (ou tabela auxiliar): `nfce_ref`, `nfce_chave`, `nfce_status`, `nfce_url_danfe`.

Para **multi-empresa**: cada `company_id` teria seu próprio cadastro no provedor (ou um cadastro por CNPJ) e suas credenciais (token por empresa, ou certificado por empresa).

---

## 6. Arquitetura sugerida no Prime Camp

### 6.1 Dados por empresa (companies)

- **Novos campos** (ou tabela `company_fiscal_config`):
  - `certificado_digital_url` ou armazenamento seguro do certificado (A1).
  - `certificado_senha` (criptografada).
  - `inscricao_estadual`, `inscricao_municipal`.
  - Endereço completo: `logradouro`, `numero`, `complemento`, `bairro`, `cep`, `municipio`, `uf`, `codigo_municipio_ibge`.
  - Provedor escolhido: `fiscal_provider` (ex.: `focus_nfe`, `nuvem_fiscal`).
  - `fiscal_api_token` (ou por ambiente) — token do provedor para essa empresa.
  - Ambiente: `fiscal_ambiente` (`homologacao` | `producao`).
  - Série NFC-e (ex.: 1) e numeração (ou deixar o provedor gerenciar).

### 6.2 Produtos

- **NCM** (Nomenclatura Comum do Mercadoria) — obrigatório na NFC-e.
- **CFOP** padrão (ex.: 5102 para venda dentro do estado).
- **CST** (ICMS) — conforme regime (Simples, Lucro Presumido, etc.).
- Podem ser campos em `produtos` ou tabela de parâmetros por empresa.

### 6.3 Fluxo de emissão NFC-e (PDV)

1. Usuário **finaliza a venda** no PDV (status `paid` ou equivalente).
2. Backend (ou job):
   - Carrega empresa (`company_id` da venda), itens, pagamentos, cliente.
   - Monta o JSON no formato do provedor (emitente, itens com NCM/CFOP/CST, pagamentos).
   - Chama a API do provedor (ex.: `POST /v2/nfce?ref=VENDA-{sale_id}`).
3. Se **autorizada**:
   - Grava em `sales`: `nfce_ref`, `nfce_chave`, `nfce_status`, `nfce_url_danfe`, `nfce_emitted_at`.
   - Opcional: grava XML/PDF em `documents` com tipo `nota_fiscal`.
4. Se **rejeitada**: grava `nfce_status = 'rejeitada'`, `nfce_mensagem_erro` e permite retentar ou emitir cupom não fiscal.

### 6.4 Fluxo NFS-e (serviços — Campinas e outros)

- Disparo a partir de **ordem de serviço** ou de um “serviço” no PDV (mão de obra).
- Payload: emitente (empresa), tomador (cliente), item da lista LC 116, valor, CNAE, texto do serviço.
- Mesma ideia: chamar API do provedor, salvar `nfse_ref`, `nfse_chave`, `nfse_url` na OS ou em tabela de documentos fiscais.

### 6.5 Multi-estado (demais estados do Brasil)

- **NFC-e**: cada **estado** tem sua SEFAZ. O provedor (Focus, Nuvem, etc.) abstrai isso: você envia o **UF do emitente** (e eventualmente o ambiente) e ele roteia para a SEFAZ correta.
- Por empresa: o endereço (UF) já define o estado; o provedor usa esse dado para escolher SEFAZ.
- **NFS-e**: cada **município** tem seu sistema. O provedor mantém lista de prefeituras integradas (Campinas, São Paulo capital, etc.). Basta informar o **código do município** (IBGE) do prestador e o provedor envia para a prefeitura certa.
- Conclusão: **uma única integração** (um provedor) atende Campinas/SP e os demais estados; a diferença está nos **dados cadastrais** (IE, certificado, endereço, CNAE) por empresa e no tipo de documento (NFC-e vs NFS-e).

---

## 7. Campinas/SP — Resumo

| Documento | Finalidade | Quem emite | Integração no sistema |
|----------|------------|------------|------------------------|
| **NFC-e** | Venda de mercadorias (PDV) | SEFAZ-SP | Após finalizar venda: chamar API do provedor com itens (NCM, CFOP, CST), pagamentos e dados do consumidor; salvar chave e link do DANFE na venda. |
| **NFS-e** | Prestação de serviços (oficina, mão de obra) | Prefeitura Campinas | Após finalizar OS ou serviço: chamar API do provedor com dados do serviço (lista LC 116, CNAE, tomador); salvar referência da NFS-e. |

Ambos podem ser feitos pelo **mesmo provedor** (ex.: Focus NFe), com **um cadastro por empresa** (CNPJ, certificado, IE, endereço, inscrição municipal para NFS-e).

---

## 8. Passos práticos para implementação

1. **Definir provedor**  
   - Escolher um (ex.: Focus NFe) e criar conta de teste/homologação.

2. **Modelagem**  
   - Estender `companies` (ou criar `company_fiscal_config`) com: certificado (ou referência segura), IE, endereço completo, token do provedor, ambiente, série.  
   - Estender `produtos` com NCM (e CFOP/CST padrão se necessário).

3. **Backend**  
   - Serviço `FiscalService` (ou módulo) que:  
     - Lê configuração fiscal da empresa.  
     - Monta payload NFC-e (e depois NFS-e) no formato do provedor.  
     - Chama a API (HTTPS), trata resposta e atualiza `sales` (e eventualmente `ordens_servico` para NFS-e).

4. **Frontend**  
   - Tela de **configuração fiscal** por empresa (certificado, IE, endereço, token, ambiente).  
   - Na tela de venda/PDV: botão “Emitir NFC-e” (ou emissão automática ao finalizar) e exibição do status/link do DANFE.  
   - Opcional: tela de **consulta/cancelamento** de NFC-e/NFS-e.

5. **Homologação**  
   - Emitir NFC-e e NFS-e em ambiente de homologação (SEFAZ e prefeitura) com dados de teste.  
   - Validar fluxo completo (incluindo impressão do DANFE e QR Code).

6. **Produção**  
   - Certificado e cadastros em produção; ativar emissão apenas para empresas que tiverem configuração fiscal preenchida.

---

## 9. Riscos e cuidados

- **Certificado digital**: armazenar com segurança (criptografia, acesso restrito); renovar antes do vencimento.
- **Conformidade**: NCM, CFOP e CST devem estar corretos (pode exigir suporte contábil).
- **Contingência**: em caso de queda da SEFAZ, o provedor pode oferecer contingência offline; o sistema pode exibir “cupom não fiscal” e tentar emitir NFC-e depois.
- **Multi-tenant**: nunca misturar certificado/token de uma empresa com outra; sempre filtrar por `company_id`.

---

## 10. Referências

- [Focus NFe – NFC-e](https://focusnfe.com.br/guides/nfce/)
- [Focus NFe – NFS-e Campinas](https://focusnfe.com.br/blog/nfse-campinas-cidades-atendidas-pelo-focus-nfe/)
- [Nuvem Fiscal – NFC-e](https://dev.nuvemfiscal.com.br/docs/nfce)
- [NFE.io – Documentação](https://nfe.io/docs/documentacao/nota-fiscal-consumidor/integracao-api-nfc/primeiros-passos/)
- [Sistema NFSe Campinas](https://nfse.campinas.sp.gov.br/NotaFiscal/index.php)
- [Obrigatoriedade NFC-e por estado (Focus NFe)](https://focusnfe.com.br/blog/obrigatoriedade-da-nfc-e-saiba-situacao-de-cada-estado/)

---

*Documento gerado para suporte à decisão de integração de cupom fiscal (NFC-e e NFS-e) no sistema Prime Camp.*
