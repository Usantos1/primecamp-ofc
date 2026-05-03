import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { from } from '@/integrations/db/client';
import { apiClient } from '@/integrations/api/client';
import { Activity, BadgeDollarSign, CheckCircle2, Megaphone, MessageSquare, MousePointerClick, Send, Settings, ShieldCheck, Paperclip, Key, Plug } from 'lucide-react';
import { useTelegramConfig } from '@/hooks/useTelegramConfig';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ApiManager } from '@/components/ApiManager';

const TAB_VALUES = ['api', 'crm', 'telegram', 'ia', 'meta'] as const;
type TabValue = (typeof TAB_VALUES)[number];

const integrationTabClassName = [
  'group flex h-11 items-center gap-2 rounded-full border border-emerald-200/80 bg-white px-4 py-2',
  'text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200',
  'hover:border-emerald-300 hover:bg-emerald-50/80 hover:text-emerald-800',
  'data-[state=active]:border-emerald-600 data-[state=active]:bg-emerald-600 data-[state=active]:text-white',
].join(' ');

const OPENAI_MODELS = [
  { value: 'gpt-5.5', label: 'GPT-5.5 (mais avançado)' },
  { value: 'gpt-5.4-mini', label: 'GPT-5.4 Mini (rápido/custo menor)' },
  { value: 'gpt-5.4-nano', label: 'GPT-5.4 Nano (mais econômico)' },
  { value: 'gpt-5.2', label: 'GPT-5.2' },
  { value: 'gpt-5.2-chat-latest', label: 'GPT-5.2 Chat Latest' },
  { value: 'gpt-5.1', label: 'GPT-5.1' },
  { value: 'gpt-5', label: 'GPT-5' },
  { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
] as const;

const META_EVENTS = [
  {
    title: 'OS faturada',
    description: 'Envia Purchase com valor, telefone, nome e modelo do aparelho.',
  },
  {
    title: 'Venda PDV paga',
    description: 'Preparado para ativar depois como Purchase de balcão.',
  },
  {
    title: 'Cliente criado',
    description: 'Pode virar Lead ou CompleteRegistration para públicos.',
  },
  {
    title: 'Atendimento iniciado',
    description: 'Pode alimentar Lead quando um contato entra pelo CRM.',
  },
] as const;

const META_PAYLOAD_EXAMPLE = `{
  "event_name": "Purchase",
  "action_source": "system_generated",
  "user_data": {
    "ph": ["sha256(telefone_com_55)"],
    "fn": ["sha256(primeiro_nome)"],
    "ln": ["sha256_sobrenome"]
  },
  "custom_data": {
    "currency": "BRL",
    "value": 650,
    "content_name": "Apple iPhone 11",
    "content_category": "Ordem de Serviço",
    "order_id": "OS-1234"
  }
}`;

interface IntegrationSettings {
  ativaCrmToken: string;
  ativaCrmSensitiveToken: string;
  webhookUrl: string;
  aiProvider?: 'openai';
  aiApiKey?: string;
  aiModel?: string;
  metaAds?: {
    enabled: boolean;
    pixelId: string;
    accessToken: string;
    testEventCode: string;
    sendOsPurchase: boolean;
    sendPdvPurchase: boolean;
    sendClientLead: boolean;
  };
}

interface WhatsAppTestResponse {
  warning?: string;
  success?: boolean;
  message?: string;
  error?: string;
}

interface MetaAdsEventLog {
  id: string;
  event_id: string;
  event_name: string;
  event_type: string;
  source: string;
  status: 'pendente' | 'enviando' | 'enviado' | 'erro' | 'ignorado';
  attempts: number;
  error_message?: string | null;
  sent_at?: string | null;
  created_at: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const candidate = error as { message?: unknown; error?: { message?: unknown } };
    if (typeof candidate.error?.message === 'string') return candidate.error.message;
    if (typeof candidate.message === 'string') return candidate.message;
  }
  return fallback;
}

export default function Integration() {
  const { tab: tabParam } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const { isAdmin, user, session } = useAuth();
  const integrationKey = user?.company_id ? `integration_settings_${user.company_id}` : 'integration_settings';

  const currentTab: TabValue = TAB_VALUES.includes(tabParam as TabValue) ? (tabParam as TabValue) : 'api';

  useEffect(() => {
    if (!tabParam || !TAB_VALUES.includes(tabParam as TabValue)) {
      navigate('/integracoes/api', { replace: true });
    }
  }, [tabParam, navigate]);
  const [settings, setSettings] = useState<IntegrationSettings>({
    ativaCrmToken: '',
    ativaCrmSensitiveToken: '',
    webhookUrl: '',
    aiProvider: 'openai',
    aiApiKey: '',
    aiModel: 'gpt-4.1-mini',
    metaAds: {
      enabled: false,
      pixelId: '',
      accessToken: '',
      testEventCode: '',
      sendOsPurchase: true,
      sendPdvPurchase: false,
      sendClientLead: false,
    },
  });
  const [loading, setLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Teste de integração WhatsApp');
  const [metaLogs, setMetaLogs] = useState<MetaAdsEventLog[]>([]);
  const [metaLogsWarning, setMetaLogsWarning] = useState<string | null>(null);
  
  // Configurações do Telegram
  const {
    chatIdEntrada,
    chatIdProcesso,
    chatIdSaida,
    updateChatIdEntrada,
    updateChatIdProcesso,
    updateChatIdSaida,
    isUpdating: isUpdatingTelegramConfig,
  } = useTelegramConfig();
  
  const [telegramChatIdEntrada, setTelegramChatIdEntrada] = useState('');
  const [telegramChatIdProcesso, setTelegramChatIdProcesso] = useState('');
  const [telegramChatIdSaida, setTelegramChatIdSaida] = useState('');
  
  // Carregar chat IDs do banco quando disponíveis
  useEffect(() => {
    if (chatIdEntrada) setTelegramChatIdEntrada(chatIdEntrada);
    if (chatIdProcesso) setTelegramChatIdProcesso(chatIdProcesso);
    if (chatIdSaida) setTelegramChatIdSaida(chatIdSaida);
  }, [chatIdEntrada, chatIdProcesso, chatIdSaida]);
  
  // Salvar Chat IDs no banco automaticamente quando mudarem (com debounce de 2 segundos)
  useEffect(() => {
    if (telegramChatIdEntrada && telegramChatIdEntrada.trim() && telegramChatIdEntrada !== chatIdEntrada) {
      const timeoutId = setTimeout(async () => {
        try {
          await updateChatIdEntrada(telegramChatIdEntrada.trim());
          toast.success('Chat ID de Entrada salvo!');
        } catch (error) {
          console.error('Erro ao salvar Chat ID Entrada:', error);
        }
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [telegramChatIdEntrada, chatIdEntrada, updateChatIdEntrada]);

  useEffect(() => {
    if (telegramChatIdProcesso && telegramChatIdProcesso.trim() && telegramChatIdProcesso !== chatIdProcesso) {
      const timeoutId = setTimeout(async () => {
        try {
          await updateChatIdProcesso(telegramChatIdProcesso.trim());
          toast.success('Chat ID de Processo salvo!');
        } catch (error) {
          console.error('Erro ao salvar Chat ID Processo:', error);
        }
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [telegramChatIdProcesso, chatIdProcesso, updateChatIdProcesso]);

  useEffect(() => {
    if (telegramChatIdSaida && telegramChatIdSaida.trim() && telegramChatIdSaida !== chatIdSaida) {
      const timeoutId = setTimeout(async () => {
        try {
          await updateChatIdSaida(telegramChatIdSaida.trim());
          toast.success('Chat ID de Saída salvo!');
        } catch (error) {
          console.error('Erro ao salvar Chat ID Saída:', error);
        }
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [telegramChatIdSaida, chatIdSaida, updateChatIdSaida]);

  const loadSettings = useCallback(async () => {
    try {
      const { data, error } = await from('kv_store_2c4defad')
        .select('value')
        .eq('key', integrationKey)
        .maybeSingle();

      if (!error && data?.value) {
        const v = data.value as Record<string, unknown>;
        setSettings({
          ativaCrmToken: (v.ativaCrmToken as string) ?? '',
          ativaCrmSensitiveToken: (v.ativaCrmSensitiveToken as string) ?? '',
          webhookUrl: (v.webhookUrl as string) ?? '',
          aiProvider: (v.aiProvider as 'openai') ?? 'openai',
          aiApiKey: (v.aiApiKey as string) ?? '',
          aiModel: (v.aiModel as string) ?? 'gpt-4.1-mini',
          metaAds: {
            enabled: ((v.metaAds as IntegrationSettings['metaAds'])?.enabled as boolean) ?? false,
            pixelId: ((v.metaAds as IntegrationSettings['metaAds'])?.pixelId as string) ?? '',
            accessToken: ((v.metaAds as IntegrationSettings['metaAds'])?.accessToken as string) ?? '',
            testEventCode: ((v.metaAds as IntegrationSettings['metaAds'])?.testEventCode as string) ?? '',
            sendOsPurchase: ((v.metaAds as IntegrationSettings['metaAds'])?.sendOsPurchase as boolean) ?? true,
            sendPdvPurchase: ((v.metaAds as IntegrationSettings['metaAds'])?.sendPdvPurchase as boolean) ?? false,
            sendClientLead: ((v.metaAds as IntegrationSettings['metaAds'])?.sendClientLead as boolean) ?? false,
          },
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Não mostrar erro ao usuário se não existir configuração ainda
    }
  }, [integrationKey]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const loadMetaLogs = useCallback(async () => {
    try {
      const result = await apiClient.get('/meta-ads/logs?limit=8');
      if (result.error) throw result.error;
      const payload = result.data as { data?: MetaAdsEventLog[]; warning?: string };
      setMetaLogs(Array.isArray(payload?.data) ? payload.data : []);
      setMetaLogsWarning(payload?.warning || null);
    } catch (error) {
      console.error('Erro ao carregar logs Meta Ads:', error);
      setMetaLogsWarning('Erro ao carregar histórico da Meta Ads');
    }
  }, []);

  useEffect(() => {
    if (currentTab === 'meta') {
      void loadMetaLogs();
    }
  }, [currentTab, loadMetaLogs]);

  const saveSettings = async () => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem alterar configurações');
      return;
    }

    setLoading(true);
    try {
      // Usar upsert para inserir ou atualizar automaticamente
      const result = await from('kv_store_2c4defad')
        .upsert({
          key: integrationKey,
          value: settings as Record<string, unknown>
        }, {
          onConflict: 'key'
        });

      if (result.error) throw result.error;

      toast.success('Configurações salvas com sucesso!');
      loadSettings(); // Recarregar após salvar
    } catch (error: unknown) {
      console.error('Error saving settings:', error);
      const errorMsg = getErrorMessage(error, 'Erro ao salvar configurações');
      toast.error(`Erro ao salvar: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const testWhatsAppIntegration = async () => {
    if (!testPhone || !testMessage) {
      toast.error('Preencha o número e a mensagem para teste');
      return;
    }

    setLoading(true);
    try {
      console.log('Testing WhatsApp with:', { number: testPhone, body: testMessage });
      
      // 🚫 Supabase Functions removido - usar API direta
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.ativafix.com/api';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.token) headers['Authorization'] = `Bearer ${session.token}`;
      const response = await fetch(`${API_URL}/whatsapp/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'send_message',
          data: {
            number: testPhone,
            body: testMessage
          }
        }),
      });
      
      let data: WhatsAppTestResponse | null = null;
      let error: unknown = null;
      
      if (!response.ok) {
        error = await response.json().catch(() => ({ error: 'Erro ao enviar mensagem' }));
      } else {
        data = await response.json();
      }

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      // Verificar warnings específicos
      if (data && data.warning) {
        if (data.warning === 'ERR_NO_DEF_WAPP_FOUND') {
          toast.warning('⚠️ Mensagem processada, mas não há WhatsApp configurado no Ativa CRM. Configure um WhatsApp padrão em https://app.ativacrm.com/');
        } else {
          toast.warning(`⚠️ Warning: ${data.warning}`);
        }
        return;
      }

      if (data && data.success === false) {
        throw new Error(data.message || data.error || 'Erro na resposta da API');
      }

      toast.success('✅ Mensagem de teste enviada com sucesso!');
    } catch (error) {
      console.error('Error testing WhatsApp:', error);
      toast.error(`❌ Erro ao enviar mensagem: ${getErrorMessage(error, 'Erro desconhecido')}`);
    } finally {
      setLoading(false);
    }
  };

  const updateMetaAds = (patch: Partial<NonNullable<IntegrationSettings['metaAds']>>) => {
    setSettings(prev => ({
      ...prev,
      metaAds: {
        enabled: prev.metaAds?.enabled ?? false,
        pixelId: prev.metaAds?.pixelId ?? '',
        accessToken: prev.metaAds?.accessToken ?? '',
        testEventCode: prev.metaAds?.testEventCode ?? '',
        sendOsPurchase: prev.metaAds?.sendOsPurchase ?? true,
        sendPdvPurchase: prev.metaAds?.sendPdvPurchase ?? false,
        sendClientLead: prev.metaAds?.sendClientLead ?? false,
        ...patch,
      },
    }));
  };

  const testMetaAdsIntegration = async () => {
    if (!settings.metaAds?.pixelId || !settings.metaAds?.accessToken) {
      toast.error('Informe Pixel ID e Access Token antes de testar.');
      return;
    }

    setLoading(true);
    try {
      const result = await apiClient.post('/meta-ads/test-event', {
        value: 1,
        content_name: 'Evento de teste Ativa Fix',
      });

      if (result.error) throw result.error;
      toast.success('Evento de teste enviado para a Meta. Confira no Test Events do Pixel.');
      void loadMetaLogs();
    } catch (error) {
      toast.error(`Erro ao enviar evento de teste: ${getErrorMessage(error, 'Erro desconhecido')}`);
    } finally {
      setLoading(false);
    }
  };

  const setTab = (value: string) => {
    const tab = value as TabValue;
    if (TAB_VALUES.includes(tab)) navigate(`/integracoes/${tab}`);
  };

  if (!isAdmin) {
    return (
      <ModernLayout title="Integrações" subtitle="Acesso negado">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Apenas administradores podem acessar as configurações de integração.
            </p>
          </CardContent>
        </Card>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout 
      title="Integrações" 
      subtitle="Configure integrações com APIs externas"
    >
      <div className="h-full overflow-y-auto overflow-x-hidden -mx-2 md:-mx-4 px-2 md:px-4">
        <Tabs value={currentTab} onValueChange={setTab} className="w-full">
          <TabsList className="mx-auto mb-4 flex h-auto w-fit flex-wrap justify-center gap-2 rounded-full border border-emerald-100 bg-white p-2 text-slate-700 shadow-sm">
            <TabsTrigger
              value="api"
              className={integrationTabClassName}
            >
              <Key className="h-4 w-4" />
              API Externa
            </TabsTrigger>
            <TabsTrigger
              value="crm"
              className={integrationTabClassName}
            >
              <MessageSquare className="h-4 w-4" />
              Ativa CRM
            </TabsTrigger>
            <TabsTrigger
              value="telegram"
              className={integrationTabClassName}
            >
              <Paperclip className="h-4 w-4" />
              Telegram
            </TabsTrigger>
            <TabsTrigger
              value="ia"
              className={integrationTabClassName}
            >
              <Plug className="h-4 w-4" />
              OpenAI
            </TabsTrigger>
            <TabsTrigger
              value="meta"
              className={integrationTabClassName}
            >
              <Megaphone className="h-4 w-4" />
              Meta Ads
            </TabsTrigger>
          </TabsList>

          {/* Tab API Externa */}
          <TabsContent value="api" className="space-y-6">
            <ApiManager />
          </TabsContent>

          {/* Tab CRM (WhatsApp / Ativa CRM) */}
          <TabsContent value="crm" className="space-y-6">
        <div className="grid gap-4 md:gap-6 pb-6 max-w-full">
        {/* WhatsApp / Ativa CRM Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              <div>
                <CardTitle>Integração WhatsApp (Ativa CRM)</CardTitle>
                <CardDescription>
                  Configure a integração com Ativa CRM para envio de mensagens WhatsApp
                </CardDescription>
              </div>
            </div>
          </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="ativaCrmToken">Token de Acesso Ativa CRM - Clientes e OS</Label>
                <Input
                  id="ativaCrmToken"
                  type="password"
                  placeholder="Bearer token para mensagens comuns"
                  value={settings.ativaCrmToken}
                  onChange={(e) => setSettings({...settings, ativaCrmToken: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">
                  Usado para mensagens comuns ao cliente, abertura/andamento de OS e demais envios operacionais.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ativaCrmSensitiveToken">Token Ativa CRM - Financeiro e Alertas Sensíveis</Label>
                <Input
                  id="ativaCrmSensitiveToken"
                  type="password"
                  placeholder="Bearer token do celular restrito para alertas"
                  value={settings.ativaCrmSensitiveToken}
                  onChange={(e) => setSettings({...settings, ativaCrmSensitiveToken: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">
                  Usado exclusivamente pelo Painel de Alertas, incluindo financeiro, RH e dados internos. Configure aqui um WhatsApp que vendedores não acessam.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-2">
                  Obtenha seu token em:{' '}
                  <a href="https://app.ativacrm.com/connections" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    https://app.ativacrm.com/connections
                  </a>
                  {' '}(menu Conexões → editar WhatsApp → campo Token).
                </p>
                <div className="rounded-lg border overflow-hidden bg-muted/30 max-w-2xl">
                  <img
                    src="/images/ativacrm-connections-token.png"
                    alt="Tela do Ativa CRM: Conexões → Editar WhatsApp → campo Token para obter o token de integração"
                    className="w-full h-auto"
                  />
                </div>
                {(settings.ativaCrmToken || settings.ativaCrmSensitiveToken) && (
                  <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      ⚠️ <strong>Importante:</strong> Certifique-se de configurar um WhatsApp padrão no Ativa CRM 
                      (<a href="https://app.ativacrm.com/" target="_blank" rel="noopener noreferrer" className="underline">painel administrativo</a>) 
                      para que as mensagens sejam enviadas corretamente.
                    </p>
                  </div>
                )}
              </div>

            <Button onClick={saveSettings} disabled={loading}>
              <Settings className="h-4 w-4 mr-2" />
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>

        {/* Test WhatsApp Integration */}
        {settings.ativaCrmToken && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Teste de Integração
              </CardTitle>
              <CardDescription>
                Envie uma mensagem de teste para verificar a integração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="testPhone">Número para teste</Label>
                  <Input
                    id="testPhone"
                    placeholder="5519987794141"
                    value={testPhone || "5519987794141"}
                    onChange={(e) => setTestPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testMessage">Mensagem de teste</Label>
                  <Input
                    id="testMessage"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={testWhatsAppIntegration} disabled={loading}>
                <Send className="h-4 w-4 mr-2" />
                Enviar Teste
              </Button>
            </CardContent>
          </Card>
        )}

        </div>
          </TabsContent>

          {/* Tab Telegram */}
          <TabsContent value="telegram" className="space-y-6">
        {/* Telegram Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle>Integração Telegram</CardTitle>
                <CardDescription>
                  Configure os Chat IDs dos canais/grupos do Telegram para envio de fotos das Ordens de Serviço
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-700">
                💡 <strong>Como obter o Chat ID:</strong> Use o comando <code className="bg-white px-1 rounded">/getchatid</code> no Telegram 
                dentro do canal ou grupo desejado. Os Chat IDs serão salvos automaticamente após 2 segundos.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Chat ID Entrada */}
              <div className="space-y-2">
                <Label htmlFor="telegram-chat-entrada">Chat ID - Fotos de Entrada</Label>
                <Input
                  id="telegram-chat-entrada"
                  type="text"
                  placeholder="Ex: -1002120498327"
                  value={telegramChatIdEntrada}
                  onChange={(e) => setTelegramChatIdEntrada(e.target.value)}
                  disabled={isUpdatingTelegramConfig}
                />
                {chatIdEntrada && (
                  <p className="text-xs text-green-600">
                    ✅ Salvo: <code className="bg-background px-1 rounded text-xs">{chatIdEntrada}</code>
                  </p>
                )}
              </div>

              {/* Chat ID Processo */}
              <div className="space-y-2">
                <Label htmlFor="telegram-chat-processo">Chat ID - Fotos de Processo</Label>
                <Input
                  id="telegram-chat-processo"
                  type="text"
                  placeholder="Ex: -1001234567890"
                  value={telegramChatIdProcesso}
                  onChange={(e) => setTelegramChatIdProcesso(e.target.value)}
                  disabled={isUpdatingTelegramConfig}
                />
                {chatIdProcesso && (
                  <p className="text-xs text-green-600">
                    ✅ Salvo: <code className="bg-background px-1 rounded text-xs">{chatIdProcesso}</code>
                  </p>
                )}
              </div>

              {/* Chat ID Saída */}
              <div className="space-y-2">
                <Label htmlFor="telegram-chat-saida">Chat ID - Fotos de Saída</Label>
                <Input
                  id="telegram-chat-saida"
                  type="text"
                  placeholder="Ex: -4925747509"
                  value={telegramChatIdSaida}
                  onChange={(e) => setTelegramChatIdSaida(e.target.value)}
                  disabled={isUpdatingTelegramConfig}
                />
                {chatIdSaida && (
                  <p className="text-xs text-green-600">
                    ✅ Salvo: <code className="bg-background px-1 rounded text-xs">{chatIdSaida}</code>
                  </p>
                )}
              </div>
            </div>
            
            {isUpdatingTelegramConfig && (
              <p className="text-xs text-muted-foreground">
                💾 Salvando configurações...
              </p>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          {/* Tab IA */}
          <TabsContent value="ia" className="space-y-6">
        {/* IA / OpenAI */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              OpenAI / IA
            </CardTitle>
            <CardDescription>
              Chave usada para gerar descrição/slug e perguntas de vagas no painel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={settings.aiProvider || 'openai'}
                  onValueChange={(v) => setSettings(prev => ({ ...prev, aiProvider: v as 'openai' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={settings.aiApiKey || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, aiApiKey: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Armazenada no servidor; usada automaticamente no editor de vagas.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Modelo LLM</Label>
              <Select
                value={settings.aiModel || 'gpt-4.1-mini'}
                onValueChange={(v) => setSettings(prev => ({ ...prev, aiModel: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent>
                  {OPENAI_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Modelo usado para gerar descrições, slugs e perguntas de vagas.
              </p>
            </div>

            <Button onClick={saveSettings} disabled={loading}>
              <Settings className="h-4 w-4 mr-2" />
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>

          </TabsContent>

          {/* Tab Meta Ads */}
          <TabsContent value="meta" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-5 w-5 text-blue-600" />
                      <div>
                        <CardTitle>Meta Ads / Conversions API</CardTitle>
                        <CardDescription>
                          Envie conversões offline em tempo real quando uma OS for faturada.
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={settings.metaAds?.enabled ?? false}
                      onCheckedChange={(enabled) => updateMetaAds({ enabled })}
                      aria-label="Ativar integração Meta Ads"
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="metaPixelId">Pixel ID</Label>
                      <Input
                        id="metaPixelId"
                        placeholder="Ex: 123456789012345"
                        value={settings.metaAds?.pixelId ?? ''}
                        onChange={(e) => updateMetaAds({ pixelId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="metaTestEventCode">Código de teste (opcional)</Label>
                      <Input
                        id="metaTestEventCode"
                        placeholder="TEST12345"
                        value={settings.metaAds?.testEventCode ?? ''}
                        onChange={(e) => updateMetaAds({ testEventCode: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="metaAccessToken">Access Token da Conversions API</Label>
                    <Input
                      id="metaAccessToken"
                      type="password"
                      placeholder="Cole aqui o token gerado no Events Manager"
                      value={settings.metaAds?.accessToken ?? ''}
                      onChange={(e) => updateMetaAds({ accessToken: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Gere no Meta Events Manager em Pixel → Configurações → Conversions API. Dados pessoais são enviados com SHA-256 no backend.
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border bg-blue-50/60 p-3">
                      <BadgeDollarSign className="mb-2 h-4 w-4 text-blue-700" />
                      <p className="text-sm font-semibold">Evento principal</p>
                      <p className="text-xs text-muted-foreground">Purchase para OS faturada</p>
                    </div>
                    <div className="rounded-lg border bg-emerald-50/60 p-3">
                      <ShieldCheck className="mb-2 h-4 w-4 text-emerald-700" />
                      <p className="text-sm font-semibold">Dados tratados</p>
                      <p className="text-xs text-muted-foreground">Nome e telefone com hash SHA-256</p>
                    </div>
                    <div className="rounded-lg border bg-violet-50/60 p-3">
                      <MousePointerClick className="mb-2 h-4 w-4 text-violet-700" />
                      <p className="text-sm font-semibold">Atribuição</p>
                      <p className="text-xs text-muted-foreground">Ajuda campanhas a otimizar por faturamento real</p>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Enviar OS faturada automaticamente</p>
                        <p className="text-xs text-muted-foreground">Dispara quando uma venda de OS fica paga.</p>
                      </div>
                      <Switch
                        checked={settings.metaAds?.sendOsPurchase ?? true}
                        onCheckedChange={(sendOsPurchase) => updateMetaAds({ sendOsPurchase })}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Venda PDV paga</p>
                        <p className="text-xs text-muted-foreground">Preparado para ativar em uma próxima etapa.</p>
                      </div>
                      <Switch
                        checked={settings.metaAds?.sendPdvPurchase ?? false}
                        onCheckedChange={(sendPdvPurchase) => updateMetaAds({ sendPdvPurchase })}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Cliente criado / Lead</p>
                        <p className="text-xs text-muted-foreground">Preparado para públicos de prospecção.</p>
                      </div>
                      <Switch
                        checked={settings.metaAds?.sendClientLead ?? false}
                        onCheckedChange={(sendClientLead) => updateMetaAds({ sendClientLead })}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={saveSettings} disabled={loading}>
                      <Settings className="h-4 w-4 mr-2" />
                      Salvar Configurações
                    </Button>
                    <Button type="button" variant="outline" onClick={testMetaAdsIntegration} disabled={loading}>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar evento de teste
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Activity className="h-4 w-4 text-blue-600" />
                      Eventos planejados
                    </CardTitle>
                    <CardDescription>
                      O primeiro já fica ativo para OS faturada; os demais ficam mapeados para evolução.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {META_EVENTS.map((item) => (
                      <div key={item.title} className="rounded-lg border bg-background p-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <p className="text-sm font-medium">{item.title}</p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">Últimos envios</CardTitle>
                        <CardDescription>
                          Histórico salvo em `meta_ads_event_logs`.
                        </CardDescription>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={loadMetaLogs}>
                        Atualizar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {metaLogsWarning === 'META_ADS_EVENT_LOGS_MISSING' ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        Rode a migration `db/migrations/manual/META_ADS_EVENT_LOGS.sql` na VPS para exibir e gravar o histórico.
                      </div>
                    ) : metaLogs.length === 0 ? (
                      <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                        Nenhum evento enviado ainda. Salve as configurações e use o botão de teste.
                      </div>
                    ) : (
                      <ScrollArea className="h-[280px] pr-3">
                        <div className="space-y-2">
                          {metaLogs.map((log) => {
                            const statusClass = log.status === 'enviado'
                              ? 'bg-emerald-100 text-emerald-700'
                              : log.status === 'erro'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-slate-100 text-slate-700';
                            return (
                              <div key={log.id} className="rounded-lg border bg-background p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{log.event_name}</p>
                                    <p className="truncate text-xs text-muted-foreground">{log.event_id}</p>
                                  </div>
                                  <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass}`}>
                                    {log.status}
                                  </span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                  <span>{log.event_type}</span>
                                  <span>tentativas: {log.attempts}</span>
                                  <span>{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                                </div>
                                {log.error_message && (
                                  <p className="mt-2 rounded-md bg-red-50 p-2 text-xs text-red-700">
                                    {log.error_message}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Payload enviado para Meta</CardTitle>
                    <CardDescription>
                      Exemplo resumido. O backend monta e envia o JSON com dados sensíveis hasheados.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="max-h-[360px] overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100 whitespace-pre-wrap">
                      {META_PAYLOAD_EXAMPLE}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ModernLayout>
  );
}