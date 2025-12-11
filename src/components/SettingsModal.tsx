import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Settings, Moon, Sun, Save, Building, Palette, Upload, Image as ImageIcon, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useThemeConfig } from '@/contexts/ThemeConfigContext';
import { toast } from 'sonner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const { config, updateConfig } = useThemeConfig();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [systemName, setSystemName] = useState('Prime Camp | Gestão de Processos');
  const [autoSave, setAutoSave] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  
  // Cores do tema
  const [primaryColor, setPrimaryColor] = useState(config.colors.primary);
  const [sidebarColor, setSidebarColor] = useState(config.colors.sidebar || config.colors.primary);
  const [buttonColor, setButtonColor] = useState(config.colors.button || config.colors.primary);
  const [logoPreview, setLogoPreview] = useState<string | null>(config.logo || null);

  const handleSave = () => {
    try {
      // Save settings to localStorage
      localStorage.setItem('systemSettings', JSON.stringify({
        systemName,
        autoSave,
        notifications,
        compactMode
      }));
      
      // Update theme colors
      updateConfig({
        colors: {
          primary: primaryColor,
          primaryForeground: config.colors.primaryForeground,
          secondary: config.colors.secondary,
          accent: config.colors.accent,
          sidebar: sidebarColor,
          button: buttonColor,
        },
        logo: logoPreview || config.logo,
      });
      
      // Update document title
      document.title = systemName || 'Prime Camp | Gestão de Processos';
      
      toast.success('Configurações salvas com sucesso!');
      onClose();
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Converter HSL para RGB para o input color
  const hslToHex = (hsl: string): string => {
    const [h, s, l] = hsl.split(' ').map(v => parseFloat(v));
    const hNorm = h / 360;
    const sNorm = s / 100;
    const lNorm = l / 100;
    
    let r, g, b;
    if (sNorm === 0) {
      r = g = b = lNorm;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
      const p = 2 * lNorm - q;
      r = hue2rgb(p, q, hNorm + 1/3);
      g = hue2rgb(p, q, hNorm);
      b = hue2rgb(p, q, hNorm - 1/3);
    }
    
    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Converter Hex para HSL
  const hexToHsl = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações do Sistema
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="h-4 w-4" />
                Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="system-name">Nome do Sistema</Label>
                <Input
                  id="system-name"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  placeholder="Digite o nome do sistema"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Salvamento Automático</Label>
                  <p className="text-sm text-muted-foreground">
                    Salva automaticamente as alterações
                  </p>
                </div>
                <Switch
                  checked={autoSave}
                  onCheckedChange={setAutoSave}
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-4 w-4" />
                Aparência
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Tema Escuro</Label>
                  <p className="text-sm text-muted-foreground">
                    Alterna entre tema claro e escuro
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={toggleTheme}
                  />
                  <Moon className="h-4 w-4" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Modo Compacto</Label>
                  <p className="text-sm text-muted-foreground">
                    Reduz o espaçamento da interface
                  </p>
                </div>
                <Switch
                  checked={compactMode}
                  onCheckedChange={setCompactMode}
                />
              </div>
            </CardContent>
          </Card>

          {/* Logo Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ImageIcon className="h-4 w-4" />
                Logo do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Logo</Label>
                {logoPreview ? (
                  <div className="relative inline-block">
                    <img 
                      src={logoPreview} 
                      alt="Logo preview" 
                      className="h-20 w-auto object-contain rounded border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={handleRemoveLogo}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Nenhuma logo selecionada
                    </p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {logoPreview ? 'Alterar Logo' : 'Upload Logo'}
                  </Button>
                  {logoPreview && (
                    <Button
                      variant="outline"
                      onClick={handleRemoveLogo}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Remover
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: PNG, JPG, SVG. Tamanho máximo: 2MB
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Color Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-4 w-4" />
                Cores do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cor Principal (AppBar)</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={hslToHex(primaryColor)}
                    onChange={(e) => {
                      const hex = e.target.value;
                      setPrimaryColor(hexToHsl(hex));
                      setSidebarColor(hexToHsl(hex));
                      setButtonColor(hexToHsl(hex));
                    }}
                    className="h-10 w-20 rounded border cursor-pointer"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => {
                      setPrimaryColor(e.target.value);
                      setSidebarColor(e.target.value);
                      setButtonColor(e.target.value);
                    }}
                    placeholder="198 100% 35%"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Formato HSL: H S% L%
                </p>
              </div>

              <div className="space-y-2">
                <Label>Cor do Sidebar</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={hslToHex(sidebarColor)}
                    onChange={(e) => setSidebarColor(hexToHsl(e.target.value))}
                    className="h-10 w-20 rounded border cursor-pointer"
                  />
                  <Input
                    value={sidebarColor}
                    onChange={(e) => setSidebarColor(e.target.value)}
                    placeholder="198 100% 35%"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cor dos Botões</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={hslToHex(buttonColor)}
                    onChange={(e) => setButtonColor(hexToHsl(e.target.value))}
                    className="h-10 w-20 rounded border cursor-pointer"
                  />
                  <Input
                    value={buttonColor}
                    onChange={(e) => setButtonColor(e.target.value)}
                    placeholder="198 100% 35%"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                <div className="flex gap-2">
                  <div 
                    className="h-8 w-20 rounded"
                    style={{ backgroundColor: `hsl(${primaryColor})` }}
                  />
                  <div 
                    className="h-8 w-20 rounded"
                    style={{ backgroundColor: `hsl(${sidebarColor})` }}
                  />
                  <div 
                    className="h-8 w-20 rounded"
                    style={{ backgroundColor: `hsl(${buttonColor})` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notificações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações Push</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba notificações sobre tarefas e processos
                  </p>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
            </CardContent>
          </Card>

          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Versão</Label>
                  <p>1.0.0</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Última Atualização</Label>
                  <p>25/01/2025</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tema Atual</Label>
                  <p className="capitalize">{theme}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Navegador</Label>
                  <p>{navigator.userAgent.split(' ')[0]}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Salvar Configurações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}