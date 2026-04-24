-- Alerta: nova candidatura concluída (formulário público / job-application-submit)
-- Requisitos: Painel de Alertas ativo, números em alert_panel_config, token Ativa CRM em Integrações.
-- Ative o alerta "Nova candidatura à vaga" em Relatórios > Painel de Alertas (código rh.nova_candidatura).

INSERT INTO public.alert_catalog (
  codigo_alerta,
  categoria,
  nome,
  descricao,
  variaveis_disponiveis,
  tipo_disparo,
  ativo_por_padrao,
  template_padrao,
  prioridade_padrao
)
VALUES
  (
    'rh.nova_candidatura',
    'comercial',
    'Nova candidatura à vaga',
    'Dispara quando o candidato conclui e envia o formulário público de uma vaga',
    ARRAY[
      'vaga_titulo',
      'vaga_cargo',
      'empresa',
      'candidato_nome',
      'candidato_email',
      'candidato_telefone',
      'candidato_whatsapp',
      'candidato_idade',
      'candidato_cep',
      'candidato_endereco',
      'candidato_instagram',
      'candidato_linkedin',
      'protocolo_id',
      'perguntas_respostas'
    ],
    'tempo_real',
    true,
    E'*Nova candidatura*\n.\n*Vaga:* {vaga_titulo}\n*Cargo:* {vaga_cargo}\n*Empresa:* {empresa}\n.\n*Candidato:* {candidato_nome}\n*E-mail:* {candidato_email}\n*Tel:* {candidato_telefone}\n*WhatsApp:* {candidato_whatsapp}\n*Idade:* {candidato_idade}\n*CEP:* {candidato_cep}\n*Endereço:* {candidato_endereco}\n*Instagram:* {candidato_instagram}\n*LinkedIn:* {candidato_linkedin}\n*ID registro:* {protocolo_id}\n.\n*Perguntas e respostas:*\n{perguntas_respostas}',
    0
  )
ON CONFLICT (codigo_alerta) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  variaveis_disponiveis = EXCLUDED.variaveis_disponiveis,
  tipo_disparo = EXCLUDED.tipo_disparo,
  ativo_por_padrao = EXCLUDED.ativo_por_padrao,
  template_padrao = EXCLUDED.template_padrao,
  prioridade_padrao = EXCLUDED.prioridade_padrao,
  updated_at = NOW();
