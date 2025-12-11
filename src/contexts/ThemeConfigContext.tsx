import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface ThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  accent: string;
}

interface ThemeConfig {
  logo?: string;
  logoAlt?: string;
  colors: ThemeColors;
  companyName?: string;
}

const defaultConfig: ThemeConfig = {
  logo: "https://primecamp.com.br/wp-content/uploads/2025/07/Design-sem-nome-4.png",
  logoAlt: "Prime Camp Logo",
  colors: {
    primary: '198 100% 35%',
    primaryForeground: '0 0% 100%',
    secondary: '210 40% 95%',
    accent: '197 71% 73%',
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
  const [config, setConfig] = useLocalStorage<ThemeConfig>('theme-config', defaultConfig);

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
    root.style.setProperty('--primary', themeConfig.colors.primary);
    root.style.setProperty('--primary-foreground', themeConfig.colors.primaryForeground);
    root.style.setProperty('--secondary', themeConfig.colors.secondary);
    root.style.setProperty('--accent', themeConfig.colors.accent);
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
