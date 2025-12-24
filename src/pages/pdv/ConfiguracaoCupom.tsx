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
import { from } from '@/integrations/db/client';
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
  imprimir_2_vias?: boolean;
  imprimir_sem_dialogo?: boolean;
  impressora_padrao?: string;
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
    imprimir_2_vias: false,
    imprimir_sem_dialogo: true,
    impressora_padrao: '',
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      // Tentar carregar de kv_store_2c4defad primeiro (padrão)
      const { data: kvData, error: kvError } = await supabase
        .from('kv_store_2c4defad')
        .select('value')
        .execute().eq('key', 'cupom_config')
        .single();

      if (!kvError && kvData) {
        setConfig({ ...config, ...kvData.value });
        return;
      }

      // Fallback para cupom_config (tabela antiga)
      const { data, error } = await supabase
        .from('cupom_config')
        .select('*')
        .execute().limit(1)
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
      // Salvar em kv_store_2c4defad (padrão)
      const { error: kvError } = await supabase
        .from('kv_store_2c4defad')
        .upsert({
          key: 'cupom_config',
          value: config,
        }, {
          onConflict: 'key',
        });

      if (kvError) throw kvError;

      // Também salvar em cupom_config para compatibilidade (se a tabela existir)
      try {
        const { user } = useAuth();
        const configToSave = {
          ...config,
          created_by: user?.id || null,
        };

        await supabase
          .from('cupom_config')
          .upsert(configToSave, {
            onConflict: 'id',
          });
      } catch (oldTableError) {
        // Ignorar erro se a tabela antiga não existir
        console.warn('Tabela cupom_config não existe, usando apenas kv_store:', oldTableError);
      }

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
        <Card className="border-2 border-gray-300">
          <CardContent className="p-6 md:p-12">
            <p className="text-center text-sm md:text-base text-muted-foreground">
              Apenas administradores podem acessar esta página.
            </p>
          </CardContent>
        </Card>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout title="Configuração do Cupom" subtitle="Personalize o cupom térmico">
      <div className="space-y-4 md:space-y-6 px-1 md:px-0">
        {/* Dados da Empresa */}
        <Card className="border-2 border-gray-300">
          <CardHeader className="pb-2 md:pb-3 pt-3 md:pt-6">
            <CardTitle className="text-base md:text-lg">Dados da Empresa</CardTitle>
            <CardDescription className="text-xs md:text-sm">Informações que aparecerão no cabeçalho do cupom</CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6 space-y-3 md:space-y-4">
            <div>
              <Label htmlFor="empresa_nome" className="text-xs md:text-sm">Nome da Empresa *</Label>
              <Input
                id="empresa_nome"
                value={config.empresa_nome}
                onChange={(e) => setConfig({ ...config, empresa_nome: e.target.value })}
                placeholder="PRIME CAMP ASSISTÊNCIA TÉCNICA"
                className="h-9 md:h-10 text-sm border-2 border-gray-300"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <Label htmlFor="empresa_cnpj" className="text-xs md:text-sm">CNPJ</Label>
                <Input
                  id="empresa_cnpj"
                  value={config.empresa_cnpj}
                  onChange={(e) => setConfig({ ...config, empresa_cnpj: e.target.value })}
                  placeholder="31.833.574/0001-74"
                  className="h-9 md:h-10 text-sm border-2 border-gray-300"
                />
              </div>
              <div>
                <Label htmlFor="empresa_ie" className="text-xs md:text-sm">Inscrição Estadual (IE)</Label>
                <Input
                  id="empresa_ie"
                  value={config.empresa_ie}
                  onChange={(e) => setConfig({ ...config, empresa_ie: e.target.value })}
                  placeholder="122.047.010.118"
                  className="h-9 md:h-10 text-sm border-2 border-gray-300"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="empresa_endereco" className="text-xs md:text-sm">Endereço</Label>
              <Input
                id="empresa_endereco"
                value={config.empresa_endereco}
                onChange={(e) => setConfig({ ...config, empresa_endereco: e.target.value })}
                placeholder="AV COM EMILIO PIERI, 823 CONJ. HABIT. VIDA NOVA, CAMPINAS"
                className="h-9 md:h-10 text-sm border-2 border-gray-300"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <Label htmlFor="empresa_telefone" className="text-xs md:text-sm">Telefone</Label>
                <Input
                  id="empresa_telefone"
                  value={config.empresa_telefone}
                  onChange={(e) => setConfig({ ...config, empresa_telefone: e.target.value })}
                  placeholder="(19) 98768-0453"
                  className="h-9 md:h-10 text-sm border-2 border-gray-300"
                />
              </div>
              <div>
                <Label htmlFor="empresa_whatsapp" className="text-xs md:text-sm">WhatsApp</Label>
                <Input
                  id="empresa_whatsapp"
                  value={config.empresa_whatsapp}
                  onChange={(e) => setConfig({ ...config, empresa_whatsapp: e.target.value })}
                  placeholder="(19) 98768-0453"
                  className="h-9 md:h-10 text-sm border-2 border-gray-300"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card className="border-2 border-gray-300">
          <CardHeader className="pb-2 md:pb-3 pt-3 md:pt-6">
            <CardTitle className="text-base md:text-lg">Logo da Empresa</CardTitle>
            <CardDescription className="text-xs md:text-sm">Logo que aparecerá no topo do cupom (centrado)</CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6 space-y-3 md:space-y-4">
            <div className="space-y-3 md:space-y-4">
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4">
                <div className="flex-1">
                  <Label htmlFor="logo_upload" className="text-xs md:text-sm">Upload de Logo</Label>
                  <Input
                    id="logo_upload"
                    type="file"
                    accept="image/*"
                    onChange={handleUploadLogo}
                    disabled={uploadingLogo}
                    className="cursor-pointer h-9 md:h-10 text-xs md:text-sm border-2 border-gray-300"
                  />
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                    Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 2MB
                  </p>
                </div>
                {config.logo_url && (
                  <div className="flex-shrink-0 flex justify-center md:justify-start">
                    <img
                      src={config.logo_url}
                      alt="Logo"
                      className="h-16 md:h-20 w-auto object-contain border-2 border-gray-300 rounded p-2 bg-white max-w-[150px] md:max-w-[200px]"
                      onError={(e) => {
                        console.error('Erro ao carregar logo');
                      }}
                    />
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="logo_url" className="text-xs md:text-sm">Ou cole uma URL de imagem</Label>
                <Input
                  id="logo_url"
                  value={config.logo_url || ''}
                  onChange={(e) => setConfig({ ...config, logo_url: e.target.value })}
                  placeholder="https://exemplo.com/logo.png"
                  className="h-9 md:h-10 text-sm border-2 border-gray-300"
                />
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                  Você pode usar uma URL externa ou fazer upload acima
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-2 border-t-2 border-gray-200">
              <Checkbox
                id="mostrar_logo"
                checked={config.mostrar_logo}
                onCheckedChange={(checked) => setConfig({ ...config, mostrar_logo: checked === true })}
                className="h-4 w-4 md:h-5 md:w-5"
              />
              <Label htmlFor="mostrar_logo" className="cursor-pointer text-xs md:text-sm">
                Mostrar logo no cupom
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Termos de Garantia */}
        <Card className="border-2 border-gray-300">
          <CardHeader className="pb-2 md:pb-3 pt-3 md:pt-6">
            <CardTitle className="text-base md:text-lg">Termos de Garantia</CardTitle>
            <CardDescription className="text-xs md:text-sm">Texto que aparecerá no rodapé do cupom</CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            <Textarea
              value={config.termos_garantia}
              onChange={(e) => setConfig({ ...config, termos_garantia: e.target.value })}
              placeholder="Esse comprovante de venda é sua Garantia..."
              rows={4}
              className="font-mono text-xs md:text-sm border-2 border-gray-300"
            />
          </CardContent>
        </Card>

        {/* Mensagem do Rodapé */}
        <Card className="border-2 border-gray-300">
          <CardHeader className="pb-2 md:pb-3 pt-3 md:pt-6">
            <CardTitle className="text-base md:text-lg">Mensagem do Rodapé</CardTitle>
            <CardDescription className="text-xs md:text-sm">Mensagem final do cupom</CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            <Input
              value={config.mensagem_rodape}
              onChange={(e) => setConfig({ ...config, mensagem_rodape: e.target.value })}
              placeholder="Obrigado pela preferência! Volte sempre"
              className="h-9 md:h-10 text-sm border-2 border-gray-300"
            />
          </CardContent>
        </Card>

        {/* Opções de Exibição */}
        <Card className="border-2 border-gray-300">
          <CardHeader className="pb-2 md:pb-3 pt-3 md:pt-6">
            <CardTitle className="text-base md:text-lg">Opções de Exibição</CardTitle>
            <CardDescription className="text-xs md:text-sm">Configure o que será exibido no cupom</CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6 space-y-2 md:space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mostrar_qr_code"
                checked={config.mostrar_qr_code}
                onCheckedChange={(checked) => setConfig({ ...config, mostrar_qr_code: checked === true })}
                className="h-4 w-4 md:h-5 md:w-5"
              />
              <Label htmlFor="mostrar_qr_code" className="cursor-pointer text-xs md:text-sm">
                Mostrar QR Code no cupom
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Opções de Impressão */}
        <Card className="border-2 border-gray-300">
          <CardHeader className="pb-2 md:pb-3 pt-3 md:pt-6">
            <CardTitle className="text-base md:text-lg">Opções de Impressão</CardTitle>
            <CardDescription className="text-xs md:text-sm">Configure o comportamento da impressão</CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6 space-y-2 md:space-y-3">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="imprimir_2_vias"
                checked={config.imprimir_2_vias || false}
                onCheckedChange={(checked) => setConfig({ ...config, imprimir_2_vias: checked === true })}
                className="h-4 w-4 md:h-5 md:w-5 mt-0.5"
              />
              <Label htmlFor="imprimir_2_vias" className="cursor-pointer text-xs md:text-sm leading-tight">
                Imprimir 2 vias automaticamente
              </Label>
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="imprimir_sem_dialogo"
                checked={config.imprimir_sem_dialogo !== false}
                onCheckedChange={(checked) => setConfig({ ...config, imprimir_sem_dialogo: checked === true })}
                className="h-4 w-4 md:h-5 md:w-5 mt-0.5"
              />
              <Label htmlFor="imprimir_sem_dialogo" className="cursor-pointer text-xs md:text-sm leading-tight">
                Imprimir diretamente sem abrir caixa de diálogo (usar impressora padrão)
              </Label>
            </div>
            <div className="pt-2 border-t-2 border-gray-200">
              <Label htmlFor="impressora_padrao" className="text-xs md:text-sm">Impressora Padrão (opcional)</Label>
              <Input
                id="impressora_padrao"
                value={config.impressora_padrao || ''}
                onChange={(e) => setConfig({ ...config, impressora_padrao: e.target.value })}
                placeholder="Deixe em branco para usar a impressora padrão do sistema"
                className="h-9 md:h-10 text-sm border-2 border-gray-300 mt-1.5"
              />
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                Nome da impressora que será usada para impressão direta. Deixe em branco para usar a impressora padrão do sistema.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Botão Salvar */}
        <div className="flex justify-center md:justify-end px-4 md:px-0">
          <LoadingButton 
            onClick={handleSave} 
            loading={loading} 
            className="gap-2 w-full md:w-auto h-9 md:h-10 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-md"
          >
            <Save className="h-4 w-4" />
            <span className="text-xs md:text-sm">Salvar Configurações</span>
          </LoadingButton>
        </div>
      </div>
    </ModernLayout>
  );
}

