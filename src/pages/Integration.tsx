import { useState, useEffect } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { from } from '@/integrations/db/client';
import { MessageSquare, Send, Settings, Webhook } from 'lucide-react';

interface IntegrationSettings {
  ativaCrmToken: string;
  whatsappNotifications: boolean;
  defaultNotificationPhone: string;
  webhookUrl: string;
  notificationEvents: string[];
  aiProvider?: 'openai';
  aiApiKey?: string;
  aiModel?: string;
}

export default function Integration() {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState<IntegrationSettings>({
    ativaCrmToken: '',
    whatsappNotifications: false,
    defaultNotificationPhone: '',
    webhookUrl: '',
    notificationEvents: [],
    aiProvider: 'openai',
    aiApiKey: '',
    aiModel: 'gpt-4.1-mini'
  });
  const [loading, setLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Teste de integração WhatsApp');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('kv_store_2c4defad')
        .select('*')
        .execute().eq('key', 'integration_settings')
        .single();

      if (data && !error) {
        setSettings(data.value as any);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem alterar configurações');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('kv_store_2c4defad')
        .upsert({
          key: 'integration_settings',
          value: settings as any
        });

      if (error) throw error;

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
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
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${API_URL}/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          data: {
            number: testPhone,
            body: testMessage
          }
        }),
      });
      
      let data: any = null;
      let error: any = null;
      
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
      toast.error(`❌ Erro ao enviar mensagem: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testNPSReminder = async () => {
    // Verificar se é domingo
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    if (dayOfWeek === 0) {
      toast.warning('🚫 Lembretes de NPS são bloqueados aos domingos. Tente novamente em outro dia.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-nps-reminder');

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      // Verificar se foi bloqueado por domingo
      if (data && data.blocked) {
        toast.warning(`🚫 ${data.message}`);
        return;
      }

      // Verificar se está desabilitado
      if (data && data.message && (
        data.message.includes('disabled') || 
        data.message.includes('WhatsApp notifications disabled') ||
        data.message.includes('NPS daily reminders disabled')
      )) {
        toast.warning(`⚠️ ${data.message}`);
        return;
      }

      if (data && data.sent !== undefined) {
        if (data.sent === 0 && data.errors === 0) {
          toast.info('ℹ️ Nenhum lembrete foi enviado - todos os usuários já responderam hoje ou não há usuários elegíveis.');
        } else if (data.errors > 0 && data.sent === 0) {
          toast.error(`❌ Erro: ${data.errors} falhas no envio. Verifique configuração do WhatsApp no Ativa CRM.`);
        } else {
          toast.success(`✅ Lembretes NPS enviados! Enviados: ${data.sent}, Erros: ${data.errors}, Total: ${data.total}`);
        }
      } else {
        toast.success('✅ Processo de lembrete NPS executado!');
      }
    } catch (error) {
      console.error('Error testing NPS reminder:', error);
      toast.error(`❌ Erro ao enviar lembretes NPS: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const eventOptions = [
    { value: 'task_created', label: 'Nova Tarefa Criada' },
    { value: 'task_status_changed', label: 'Mudança de Status da Tarefa' },
    { value: 'task_assigned', label: 'Tarefa Atribuída' },
    { value: 'task_completed', label: 'Tarefa Concluída' },
    { value: 'process_created', label: 'Novo Processo Criado' },
    { value: 'calendar_event', label: 'Evento de Calendário' },
    { value: 'nps_daily_reminder', label: 'Lembrete NPS Diário (08:00)' }
  ];

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
      <div className="grid gap-6">
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
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ativaCrmToken">Token de Acesso Ativa CRM</Label>
                <Input
                  id="ativaCrmToken"
                  type="password"
                  placeholder="Bearer token para API do Ativa CRM"
                  value={settings.ativaCrmToken}
                  onChange={(e) => setSettings({...settings, ativaCrmToken: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">
                  Obtenha seu token em: https://app.ativacrm.com/settings/integrations
                </p>
                {settings.ativaCrmToken && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-xs text-amber-700">
                      ⚠️ <strong>Importante:</strong> Certifique-se de configurar um WhatsApp padrão no Ativa CRM 
                      (<a href="https://app.ativacrm.com/" target="_blank" className="underline">painel administrativo</a>) 
                      para que as mensagens sejam enviadas corretamente.
                    </p>
                  </div>
                )}
              </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="whatsapp-notifications"
                checked={settings.whatsappNotifications}
                onCheckedChange={(checked) => setSettings({...settings, whatsappNotifications: checked})}
              />
              <Label htmlFor="whatsapp-notifications">Habilitar notificações WhatsApp</Label>
            </div>

            {settings.whatsappNotifications && (
              <div className="space-y-4 border-l-2 border-primary/20 pl-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultPhone">Número padrão para notificações</Label>
                  <Input
                    id="defaultPhone"
                    placeholder="5511999999999"
                    value={settings.defaultNotificationPhone}
                    onChange={(e) => setSettings({...settings, defaultNotificationPhone: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Eventos que disparam notificações</Label>
                  <div className="flex flex-wrap gap-2">
                    {eventOptions.map((option) => (
                      <Badge
                        key={option.value}
                        variant={settings.notificationEvents.includes(option.value) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          const events = settings.notificationEvents.includes(option.value)
                            ? settings.notificationEvents.filter(e => e !== option.value)
                            : [...settings.notificationEvents, option.value];
                          setSettings({...settings, notificationEvents: events});
                        }}
                      >
                        {option.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Button onClick={saveSettings} disabled={loading}>
              <Settings className="h-4 w-4 mr-2" />
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>

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
                  <SelectItem value="gpt-5">GPT-5 (Avançado)</SelectItem>
                  <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
                  <SelectItem value="chatgpt-5.1">ChatGPT 5.1</SelectItem>
                  <SelectItem value="chatgpt-5.1-mini">ChatGPT 5.1 Mini</SelectItem>
                  <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                  <SelectItem value="gpt-4.1-mini">GPT-4.1 Mini</SelectItem>
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

        {/* NPS Reminder Test */}
        {settings.whatsappNotifications && settings.notificationEvents.includes('nps_daily_reminder') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                Teste de Lembrete NPS
              </CardTitle>
              <CardDescription>
                Envie lembretes de NPS diário manualmente para testar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs text-blue-700">
                  ℹ️ <strong>Nota:</strong> Lembretes de NPS são automaticamente bloqueados aos domingos.
                  O sistema executa diariamente às 08:00 (BRT) e envia apenas para usuários que ainda não responderam no dia.
                </p>
              </div>
              <Button onClick={testNPSReminder} disabled={loading}>
                <Send className="h-4 w-4 mr-2" />
                Enviar Lembretes NPS Agora
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Webhook Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              <div>
                <CardTitle>Configuração de Webhook</CardTitle>
                <CardDescription>
                  URL para receber notificações de eventos externos
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL do Webhook (somente leitura)</Label>
              <Input
                readOnly
                value={`${window.location.origin}/api/webhook`}
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Configure esta URL no Ativa CRM para receber notificações automáticas
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModernLayout>
  );
}