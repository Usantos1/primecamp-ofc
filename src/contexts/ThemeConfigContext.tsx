import { createContext, useContext, useState, useEffect, useLayoutEffect, ReactNode } from 'react';
import { getApiUrl } from '@/utils/apiUrl';

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

// Cor padrão Ativa Fix (dourado) — HSL: 44 100% 53%
const ATIVAFIX_PRIMARY_HSL = '44 100% 53%';

/** Configuração padrão por domínio: em ativafix.com o logo, nome e cores vêm do mesmo build. */
function getDefaultConfigByHost(): ThemeConfig {
  if (typeof window === 'undefined') return defaultConfigPrimeCamp;
  const h = window.location.hostname;
  if (h === 'ativafix.com' || h === 'www.ativafix.com') {
    const origin = window.location.origin;
    return {
      ...defaultConfigPrimeCamp,
      logo: `${origin}/logo-ativafix.png`,
      logoAlt: 'Ativa Fix',
      companyName: 'Ativa FIX | Gestão de Assistência e Vendas',
      colors: {
        ...defaultConfigPrimeCamp.colors,
        primary: ATIVAFIX_PRIMARY_HSL,
        accent: ATIVAFIX_PRIMARY_HSL,
        sidebar: ATIVAFIX_PRIMARY_HSL,
        button: ATIVAFIX_PRIMARY_HSL,
      },
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

export function ThemeConfigProvider({ children }: { children: ReactNode }) {
  const baseConfig = getDefaultConfigByHost();
  const [config, setConfig] = useState<ThemeConfig>(baseConfig);

  // Buscar tema: logado = tema da empresa (company); não logado = tema do domínio (host)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const host = window.location.hostname;
    const base = getApiUrl();
    const url = new URL('theme-config', base.endsWith('/') ? base : base + '/');
    url.searchParams.set('host', host);
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch(url.toString(), { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Partial<ThemeConfig> | null) => {
        if (!data || typeof data !== 'object') return;
        setConfig((prev) => {
          const next = {
            ...prev,
            ...(data.companyName != null && { companyName: data.companyName }),
            ...(data.logo != null && { logo: data.logo }),
            ...(data.logoAlt != null && { logoAlt: data.logoAlt }),
            colors: {
              ...prev.colors,
              ...(data.colors && typeof data.colors === 'object' ? data.colors : {}),
            },
          };
          return next;
        });
      })
      .catch(() => {});
  }, []);

  // Título da aba: useLayoutEffect para atualizar antes da pintura e evitar flash "Prime Camp" ao carregar
  useLayoutEffect(() => {
    if (config.companyName) {
      document.title = config.companyName;
    }
  }, [config.companyName]);

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
