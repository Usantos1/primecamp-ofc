import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  accent: string;
  sidebar?: string;
  button?: string;
}

interface ThemeConfig {
  logo?: string;
  logoAlt?: string;
  colors: ThemeColors;
  companyName?: string;
}

// Cores fixas do sistema — uma vez definidas valem para todos os usuários (AppBar, Sidebar, Botões)
const SYSTEM_PRIMARY_HSL = '0 100% 47%';

const defaultConfigPrimeCamp: ThemeConfig = {
  logo: "https://primecamp.com.br/wp-content/uploads/2025/07/Design-sem-nome-4.png",
  logoAlt: "Prime Camp Logo",
  colors: {
    primary: SYSTEM_PRIMARY_HSL,
    primaryForeground: '0 0% 100%',
    secondary: '210 40% 95%',
    accent: SYSTEM_PRIMARY_HSL,
    sidebar: SYSTEM_PRIMARY_HSL,
    button: SYSTEM_PRIMARY_HSL,
  },
  companyName: 'Prime Camp',
};

/** Configuração padrão por domínio: em ativafix.com o logo/nome vêm do mesmo build (arquivo em /public). */
function getDefaultConfigByHost(): ThemeConfig {
  if (typeof window === 'undefined') return defaultConfigPrimeCamp;
  const h = window.location.hostname;
  if (h === 'ativafix.com' || h === 'www.ativafix.com') {
    const origin = window.location.origin;
    return {
      ...defaultConfigPrimeCamp,
      logo: `${origin}/logo-ativafix.png`,
      logoAlt: 'Ativa Fix',
      companyName: 'Ativa Fix',
    };
  }
  return defaultConfigPrimeCamp;
}

const defaultConfig = defaultConfigPrimeCamp;

interface ThemeConfigContextType {
  config: ThemeConfig;
  updateConfig: (newConfig: Partial<ThemeConfig>) => void;
  resetConfig: () => void;
}

const ThemeConfigContext = createContext<ThemeConfigContextType | undefined>(undefined);

function loadSystemNameFromStorage(): string | undefined {
  try {
    const saved = localStorage.getItem('systemSettings');
    if (saved) {
      const parsed = JSON.parse(saved) as { systemName?: string };
      return typeof parsed.systemName === 'string' && parsed.systemName.trim() ? parsed.systemName.trim() : undefined;
    }
  } catch (_) {}
  return undefined;
}

function loadLogoFromStorage(): string | undefined {
  try {
    const logo = localStorage.getItem('systemLogo');
    if (logo && typeof logo === 'string' && logo.startsWith('data:image/')) return logo;
  } catch (_) {}
  return undefined;
}

function loadThemeColorsFromStorage(): Partial<ThemeColors> | null {
  try {
    const raw = localStorage.getItem('themeColors');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { primary?: string; sidebar?: string; button?: string };
    if (parsed && typeof parsed === 'object') {
      return {
        ...(typeof parsed.primary === 'string' && parsed.primary.trim() ? { primary: parsed.primary } : {}),
        ...(typeof parsed.sidebar === 'string' && parsed.sidebar.trim() ? { sidebar: parsed.sidebar } : {}),
        ...(typeof parsed.button === 'string' && parsed.button.trim() ? { button: parsed.button } : {}),
      };
    }
  } catch (_) {}
  return null;
}

export function ThemeConfigProvider({ children }: { children: ReactNode }) {
  const savedName = loadSystemNameFromStorage();
  const savedLogo = loadLogoFromStorage();
  const savedColors = loadThemeColorsFromStorage();
  const baseConfig = getDefaultConfigByHost();
  const [config, setConfig] = useState<ThemeConfig>({
    ...baseConfig,
    ...(savedName ? { companyName: savedName } : {}),
    ...(savedLogo ? { logo: savedLogo } : {}),
    ...(savedColors && Object.keys(savedColors).length > 0
      ? { colors: { ...baseConfig.colors, ...savedColors } }
      : {}),
  });

  // Aplicar nome do sistema e título da aba ao carregar (salvo nas configurações ou padrão do domínio)
  useEffect(() => {
    const name = loadSystemNameFromStorage() || getDefaultConfigByHost().companyName;
    if (name) {
      document.title = name;
    }
  }, []);

  const updateConfig = (newConfig: Partial<ThemeConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    applyThemeConfig({ ...config, ...newConfig });
  };

  const resetConfig = () => {
    const base = getDefaultConfigByHost();
    setConfig(base);
    applyThemeConfig(base);
  };

  // Aplicar configurações de tema no CSS
  const applyThemeConfig = (themeConfig: ThemeConfig) => {
    const root = document.documentElement;
    
    // Cor principal (usada como fallback)
    root.style.setProperty('--primary', themeConfig.colors.primary);
    root.style.setProperty('--primary-foreground', themeConfig.colors.primaryForeground);
    root.style.setProperty('--secondary', themeConfig.colors.secondary);
    root.style.setProperty('--accent', themeConfig.colors.accent);
    
    // Cor do Sidebar (navegação)
    const sidebarColor = themeConfig.colors.sidebar || themeConfig.colors.primary;
    root.style.setProperty('--sidebar-primary', sidebarColor);
    root.style.setProperty('--sidebar-primary-foreground', '0 0% 100%');
    
    // Cor dos Botões - aplica em --primary para que todos os botões usem
    const buttonColor = themeConfig.colors.button || themeConfig.colors.primary;
    root.style.setProperty('--button-primary', buttonColor);
    // Atualizar --primary para que os botões default usem a cor configurada
    root.style.setProperty('--primary', buttonColor);
  };

  // Aplicar configurações ao carregar
  useEffect(() => {
    applyThemeConfig(config);
  }, [config]);

  return (
    <ThemeConfigContext.Provider value={{ config, updateConfig, resetConfig }}>
      {children}
    </ThemeConfigContext.Provider>
  );
}

export function useThemeConfig() {
  const context = useContext(ThemeConfigContext);
  if (context === undefined) {
    throw new Error('useThemeConfig must be used within a ThemeConfigProvider');
  }
  return context;
}
