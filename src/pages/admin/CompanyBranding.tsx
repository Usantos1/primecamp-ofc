import { useEffect, useRef, useState } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Palette, RotateCcw, Save, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/integrations/api/client';
import { useThemeConfig } from '@/contexts/ThemeConfigContext';

const DEFAULT_HSL = '160 84% 30%';
const DEFAULT_LOGIN_BACKGROUND =
  'https://img.freepik.com/fotos-gratis/nuvens-brancas-dramaticas-e-ceu-azul-da-vista-da-janela-do-aviao-fundo-colorido-do-por-do-sol-cloudscape_90220-1209.jpg';

const hslToHex = (hsl: string): string => {
  const [h, s, l] = hsl.split(' ').map((value) => parseFloat(value));
  const hNorm = (Number.isFinite(h) ? h : 160) / 360;
  const sNorm = (Number.isFinite(s) ? s : 84) / 100;
  const lNorm = (Number.isFinite(l) ? l : 30) / 100;
  let r = lNorm;
  let g = lNorm;
  let b = lNorm;

  if (sNorm !== 0) {
    const hue2rgb = (p: number, q: number, tValue: number) => {
      let t = tValue;
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
    const p = 2 * lNorm - q;
    r = hue2rgb(p, q, hNorm + 1 / 3);
    g = hue2rgb(p, q, hNorm);
    b = hue2rgb(p, q, hNorm - 1 / 3);
  }

  const toHex = (color: number) => Math.round(color * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const hexToHsl = (hex: string): string => {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const normalizeHexInput = (value: string) => {
  const raw = value.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  return `#${raw.toLowerCase()}`;
};

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const [hexValue, setHexValue] = useState(hslToHex(value));

  useEffect(() => {
    setHexValue(hslToHex(value));
  }, [value]);

  const commitHex = (nextValue: string) => {
    const normalized = normalizeHexInput(nextValue);
    if (normalized) {
      setHexValue(normalized);
      onChange(hexToHsl(normalized));
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2 rounded-full border bg-white px-2 py-1.5">
        <input
          type="color"
          value={hslToHex(value)}
          onChange={(event) => commitHex(event.target.value)}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0"
        />
        <Input
          value={hexValue}
          onChange={(event) => setHexValue(event.target.value)}
          onBlur={(event) => {
            const normalized = normalizeHexInput(event.target.value);
            if (normalized) commitHex(normalized);
            else setHexValue(hslToHex(value));
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            }
          }}
          placeholder="#ff0000"
          className="h-8 border-0 px-1 font-mono text-sm shadow-none focus-visible:ring-0"
        />
      </div>
      <p className="text-[11px] text-muted-foreground">Use o seletor HTML ou informe em HEX.</p>
    </div>
  );
}

const readImageAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Use uma imagem PNG, JPG, SVG ou ICO.'));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error('A imagem deve ter no máximo 2MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Erro ao ler a imagem.'));
    reader.readAsDataURL(file);
  });

export default function CompanyBranding() {
  const { config, updateConfig, refreshConfig, resetConfig } = useThemeConfig();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [systemName, setSystemName] = useState(config.companyName || 'Ativa FIX');
  const [logo, setLogo] = useState(config.logo || '');
  const [favicon, setFavicon] = useState(config.favicon || '');
  const [loginBackground, setLoginBackground] = useState(config.loginBackground || DEFAULT_LOGIN_BACKGROUND);
  const [primaryColor, setPrimaryColor] = useState(config.colors.primary || DEFAULT_HSL);
  const [sidebarColor, setSidebarColor] = useState(config.colors.sidebar || config.colors.primary || DEFAULT_HSL);
  const [buttonColor, setButtonColor] = useState(config.colors.button || config.colors.primary || DEFAULT_HSL);

  useEffect(() => {
    setSystemName(config.companyName || 'Ativa FIX');
    setLogo(config.logo || '');
    setFavicon(config.favicon || '');
    setLoginBackground(config.loginBackground || DEFAULT_LOGIN_BACKGROUND);
    setPrimaryColor(config.colors.primary || DEFAULT_HSL);
    setSidebarColor(config.colors.sidebar || config.colors.primary || DEFAULT_HSL);
    setButtonColor(config.colors.button || config.colors.primary || DEFAULT_HSL);
  }, [config]);

  const handleImage = async (file: File | undefined, setter: (value: string) => void) => {
    if (!file) return;
    try {
      setter(await readImageAsDataUrl(file));
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar imagem');
    }
  };

  const saveBranding = async () => {
    setSaving(true);
    try {
      const payload = {
        companyName: systemName.trim() || 'Ativa FIX',
        logo,
        logoAlt: systemName.trim() || 'Ativa FIX',
        favicon,
        loginBackground,
        navigationVariant: 'miui',
        colors: {
          primary: primaryColor,
          sidebar: sidebarColor,
          button: buttonColor,
        },
      };
      const { data, error } = await apiClient.post('/theme-config', payload);
      if (error) throw new Error((error as any).message || String(error) || 'Erro ao salvar whitelabel');
      if (data?.resetToDefault) {
        resetConfig();
        toast.error('Whitelabel não está liberado para esta empresa. A aparência voltou para o padrão.');
        return;
      }
      updateConfig(data?.config || payload);
      await refreshConfig();
      toast.success('Aparência salva com sucesso');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar aparência');
    } finally {
      setSaving(false);
    }
  };

  const resetLocal = () => {
    setSystemName('Ativa FIX');
    setLogo('/logo-ativafix.png');
    setFavicon('');
    setLoginBackground(DEFAULT_LOGIN_BACKGROUND);
    setPrimaryColor(DEFAULT_HSL);
    setSidebarColor(DEFAULT_HSL);
    setButtonColor(DEFAULT_HSL);
  };

  return (
    <ModernLayout title="Aparência" subtitle="Configure whitelabel, cores, logo e nome do sistema">
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-emerald-600" />
                Identidade visual
              </CardTitle>
              <CardDescription>
                Estas informações aparecem no topo do sistema, tela de login, título da aba e domínio personalizado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Nome do sistema</Label>
                <Input value={systemName} onChange={(event) => setSystemName(event.target.value)} placeholder="Ex: PrimeCamp Gestão" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="rounded-2xl border bg-slate-50 p-4">
                    {logo ? <img src={logo} alt="Logo" className="h-20 max-w-full object-contain" /> : <p className="text-sm text-muted-foreground">Nenhuma logo selecionada.</p>}
                  </div>
                  <Button variant="outline" className="rounded-full" onClick={() => logoInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Enviar logo
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Recomendado: PNG transparente, 600x220 px ou proporção 3:1. Máximo 2MB.
                  </p>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImage(event.target.files?.[0], setLogo)} />
                </div>

                <div className="space-y-2">
                  <Label>Favicon</Label>
                  <div className="flex h-[114px] items-center rounded-2xl border bg-slate-50 p-4">
                    {favicon ? <img src={favicon} alt="Favicon" className="h-12 w-12 rounded-xl object-contain" /> : <p className="text-sm text-muted-foreground">Opcional.</p>}
                  </div>
                  <Button variant="outline" className="rounded-full" onClick={() => faviconInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Enviar favicon
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Recomendado: quadrado, 512x512 px. PNG, SVG ou ICO.
                  </p>
                  <input ref={faviconInputRef} type="file" accept="image/*,.ico" className="hidden" onChange={(event) => handleImage(event.target.files?.[0], setFavicon)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Imagem de fundo do login</Label>
                <Input value={loginBackground} onChange={(event) => setLoginBackground(event.target.value)} placeholder="URL da imagem de fundo" />
                <p className="text-xs text-muted-foreground">
                  Recomendado: 1920x1080 px, formato horizontal, até 2MB se for enviada como imagem.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cores</CardTitle>
              <CardDescription>Escolha as cores principais do sistema desta empresa.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <ColorControl label="Principal" value={primaryColor} onChange={setPrimaryColor} />
              <ColorControl label="Menu/Appbar" value={sidebarColor} onChange={setSidebarColor} />
              <ColorControl label="Botões" value={buttonColor} onChange={setButtonColor} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Prévia</CardTitle>
              <CardDescription>Como a marca vai aparecer para o cliente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  {logo && <img src={logo} alt="Logo" className="h-10 max-w-[160px] object-contain" />}
                  <div>
                    <p className="font-bold">{systemName || 'Ativa FIX'}</p>
                    <Badge className="rounded-full" style={{ backgroundColor: `hsl(${buttonColor})` }}>Botão</Badge>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl bg-cover bg-center p-6" style={{ backgroundImage: `url(${loginBackground || DEFAULT_LOGIN_BACKGROUND})` }}>
                <div className="rounded-2xl bg-white/95 p-5 text-center shadow">
                  {logo && <img src={logo} alt="Logo login" className="mx-auto mb-3 h-14 object-contain" />}
                  <p className="text-sm font-semibold">Tela de login</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 rounded-full" onClick={saveBranding} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </Button>
                <Button variant="outline" className="rounded-full" onClick={resetLocal} disabled={saving}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Padrão
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ModernLayout>
  );
}
