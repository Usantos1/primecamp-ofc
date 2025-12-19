import { useState, useEffect } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { LoadingButton } from '@/components/LoadingButton';
import { Upload, Image as ImageIcon, Save } from 'lucide-react';

interface CupomConfig {
  id?: string;
  empresa_nome: string;
  empresa_cnpj: string;
  empresa_ie: string;
  empresa_endereco: string;
  empresa_telefone: string;
  empresa_whatsapp: string;
  logo_url: string;
  termos_garantia: string;
  mostrar_logo: boolean;
  mostrar_qr_code: boolean;
  mensagem_rodape: string;
}

export default function ConfiguracaoCupom() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [config, setConfig] = useState<CupomConfig>({
    empresa_nome: 'PRIME CAMP ASSISTÊNCIA TÉCNICA',
    empresa_cnpj: '',
    empresa_ie: '',
    empresa_endereco: '',
    empresa_telefone: '',
    empresa_whatsapp: '',
    logo_url: '',
    termos_garantia: 'Esse comprovante de venda é sua Garantia, portando guarde-o com cuidado. A Garantia não cobre mau uso do cliente. (pressão, impacto, quebra, umidade, calor excessivo).',
    mostrar_logo: true,
    mostrar_qr_code: true,
    mensagem_rodape: 'Obrigado pela preferência! Volte sempre',
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('cupom_config')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig(data);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const handleUploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem válida.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 2MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploadingLogo(true);
    try {
      // Converter para base64 para armazenar inline (mais simples e não depende de storage)
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setConfig({ ...config, logo_url: base64String });
        toast({
          title: 'Logo carregado com sucesso!',
          description: 'Lembre-se de salvar as configurações.',
        });
        setUploadingLogo(false);
      };
      reader.onerror = () => {
        toast({
          title: 'Erro ao ler arquivo',
          description: 'Não foi possível ler o arquivo selecionado.',
          variant: 'destructive',
        });
        setUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('Erro ao processar logo:', error);
      toast({
        title: 'Erro ao processar logo',
        description: error.message || 'Não foi possível processar o logo.',
        variant: 'destructive',
      });
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!isAdmin) {
      toast({
        title: 'Acesso negado',
        description: 'Apenas administradores podem alterar configurações.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const configToSave = {
        ...config,
        created_by: user?.id || null,
      };

      const { error } = await supabase
        .from('cupom_config')
        .upsert(configToSave, {
          onConflict: 'id',
        });

      if (error) throw error;

      toast({
        title: 'Configurações salvas!',
        description: 'As configurações do cupom foram atualizadas com sucesso.',
      });
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <ModernLayout title="Configuração do Cupom" subtitle="Personalize o cupom térmico">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Apenas administradores podem acessar esta página.
            </p>
          </CardContent>
        </Card>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout title="Configuração do Cupom" subtitle="Personalize o cupom térmico">
      <div className="space-y-6">
        {/* Dados da Empresa */}
        <Card>
          <CardHeader>
            <CardTitle>Dados da Empresa</CardTitle>
            <CardDescription>Informações que aparecerão no cabeçalho do cupom</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="empresa_nome">Nome da Empresa *</Label>
              <Input
                id="empresa_nome"
                value={config.empresa_nome}
                onChange={(e) => setConfig({ ...config, empresa_nome: e.target.value })}
                placeholder="PRIME CAMP ASSISTÊNCIA TÉCNICA"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="empresa_cnpj">CNPJ</Label>
                <Input
                  id="empresa_cnpj"
                  value={config.empresa_cnpj}
                  onChange={(e) => setConfig({ ...config, empresa_cnpj: e.target.value })}
                  placeholder="31.833.574/0001-74"
                />
              </div>
              <div>
                <Label htmlFor="empresa_ie">Inscrição Estadual (IE)</Label>
                <Input
                  id="empresa_ie"
                  value={config.empresa_ie}
                  onChange={(e) => setConfig({ ...config, empresa_ie: e.target.value })}
                  placeholder="122.047.010.118"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="empresa_endereco">Endereço</Label>
              <Input
                id="empresa_endereco"
                value={config.empresa_endereco}
                onChange={(e) => setConfig({ ...config, empresa_endereco: e.target.value })}
                placeholder="AV COM EMILIO PIERI, 823 CONJ. HABIT. VIDA NOVA, CAMPINAS"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="empresa_telefone">Telefone</Label>
                <Input
                  id="empresa_telefone"
                  value={config.empresa_telefone}
                  onChange={(e) => setConfig({ ...config, empresa_telefone: e.target.value })}
                  placeholder="(19) 98768-0453"
                />
              </div>
              <div>
                <Label htmlFor="empresa_whatsapp">WhatsApp</Label>
                <Input
                  id="empresa_whatsapp"
                  value={config.empresa_whatsapp}
                  onChange={(e) => setConfig({ ...config, empresa_whatsapp: e.target.value })}
                  placeholder="(19) 98768-0453"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle>Logo da Empresa</CardTitle>
            <CardDescription>Logo que aparecerá no topo do cupom (centrado)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="logo_upload">Upload de Logo</Label>
                <Input
                  id="logo_upload"
                  type="file"
                  accept="image/*"
                  onChange={handleUploadLogo}
                  disabled={uploadingLogo}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 2MB
                </p>
              </div>
              {config.logo_url && (
                <div className="flex-shrink-0">
                  <img
                    src={config.logo_url}
                    alt="Logo"
                    className="h-20 w-auto object-contain border rounded p-2 bg-white"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mostrar_logo"
                checked={config.mostrar_logo}
                onCheckedChange={(checked) => setConfig({ ...config, mostrar_logo: checked === true })}
              />
              <Label htmlFor="mostrar_logo" className="cursor-pointer">
                Mostrar logo no cupom
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Termos de Garantia */}
        <Card>
          <CardHeader>
            <CardTitle>Termos de Garantia</CardTitle>
            <CardDescription>Texto que aparecerá no rodapé do cupom</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={config.termos_garantia}
              onChange={(e) => setConfig({ ...config, termos_garantia: e.target.value })}
              placeholder="Esse comprovante de venda é sua Garantia..."
              rows={5}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>

        {/* Mensagem do Rodapé */}
        <Card>
          <CardHeader>
            <CardTitle>Mensagem do Rodapé</CardTitle>
            <CardDescription>Mensagem final do cupom</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              value={config.mensagem_rodape}
              onChange={(e) => setConfig({ ...config, mensagem_rodape: e.target.value })}
              placeholder="Obrigado pela preferência! Volte sempre"
            />
          </CardContent>
        </Card>

        {/* Opções de Exibição */}
        <Card>
          <CardHeader>
            <CardTitle>Opções de Exibição</CardTitle>
            <CardDescription>Configure o que será exibido no cupom</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mostrar_qr_code"
                checked={config.mostrar_qr_code}
                onCheckedChange={(checked) => setConfig({ ...config, mostrar_qr_code: checked === true })}
              />
              <Label htmlFor="mostrar_qr_code" className="cursor-pointer">
                Mostrar QR Code no cupom
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <LoadingButton onClick={handleSave} loading={loading} className="gap-2">
            <Save className="h-4 w-4" />
            Salvar Configurações
          </LoadingButton>
        </div>
      </div>
    </ModernLayout>
  );
}

