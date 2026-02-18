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

const defaultConfig: ThemeConfig = {
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

interface ThemeConfigContextType {
  config: ThemeConfig;
  updateConfig: (newConfig: Partial<ThemeConfig>) => void;
  resetConfig: () => void;
}

const ThemeConfigContext = createContext<ThemeConfigContextType | undefined>(undefined);

export function ThemeConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ThemeConfig>(defaultConfig);

  const updateConfig = (newConfig: Partial<ThemeConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    applyThemeConfig({ ...config, ...newConfig });
  };

  const resetConfig = () => {
    setConfig(defaultConfig);
    applyThemeConfig(defaultConfig);
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
