import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import type { AlertCatalogItem, AlertConfigItem } from '@/hooks/useAlerts';

export function AlertRow({
  catalogItem,
  config,
  onSave,
  onPreview,
  onTest,
}: {
  catalogItem: AlertCatalogItem;
  config?: AlertConfigItem;
  onSave: (args: { codigo: string; data: Partial<AlertConfigItem> }) => Promise<unknown>;
  onPreview: (args: { template: string; payload?: Record<string, unknown> }) => Promise<string>;
  onTest?: (args: { codigo_alerta: string; payload?: Record<string, unknown> }) => Promise<unknown>;
}) {
  const ativoDefault = config?.ativo ?? catalogItem.ativo_por_padrao ?? false;
  const templateDefault = config?.template_mensagem ?? catalogItem.template_padrao ?? '';
  const [ativo, setAtivo] = useState(ativoDefault);
  const [template, setTemplate] = useState(templateDefault);
  const [previewText, setPreviewText] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const vars = catalogItem.variaveis_disponiveis ?? [];

  useEffect(() => {
    setAtivo(config?.ativo ?? catalogItem.ativo_por_padrao ?? false);
    setTemplate(config?.template_mensagem ?? catalogItem.template_padrao ?? '');
  }, [config?.ativo, config?.template_mensagem, catalogItem.ativo_por_padrao, catalogItem.template_padrao]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        codigo: catalogItem.codigo_alerta,
        data: { ativo, template_mensagem: template || undefined },
      });
      toast.success(`Configuração de "${catalogItem.nome}" salva.`);
    } catch (e: unknown) {
      toast.error((e as Error)?.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    const payload: Record<string, string> = {};
    vars.forEach((v) => (payload[v] = `[${v}]`));
    try {
      const msg = await onPreview({ template, payload });
      setPreviewText(msg);
    } catch {
      setPreviewText('(erro ao gerar pré-visualização)');
    }
  };

  const handleTest = async () => {
    if (!onTest) return;
    const payload: Record<string, string> = {};
    vars.forEach((v) => (payload[v] = `[${v}]`));
    setTesting(true);
    try {
      await onTest({ codigo_alerta: catalogItem.codigo_alerta, payload });
      toast.success('Mensagem de teste enviada para os números configurados.');
    } catch (e: unknown) {
      toast.error((e as Error)?.message || 'Erro ao enviar teste.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{catalogItem.nome}</p>
          {catalogItem.descricao && (
            <p className="text-sm text-muted-foreground">{catalogItem.descricao}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={ativo} onCheckedChange={setAtivo} />
          <span className="text-sm">{ativo ? 'Ativo' : 'Inativo'}</span>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Template da mensagem</Label>
        <Textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          placeholder="Use variáveis como {cliente}, {numero_os}, {valor}..."
          rows={4}
          className="resize-none font-mono text-sm"
        />
        {vars.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Variáveis: {vars.map((v) => `{${v}}`).join(', ')}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={handlePreview}>
          Pré-visualizar
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar este alerta'}
        </Button>
        {onTest && (
          <Button size="sm" variant="secondary" onClick={handleTest} disabled={testing}>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {testing ? 'Enviando...' : 'Testar mensagem'}
          </Button>
        )}
      </div>
      {previewText && (
        <div className="rounded bg-muted p-3 text-sm whitespace-pre-wrap">{previewText}</div>
      )}
    </div>
  );
}
