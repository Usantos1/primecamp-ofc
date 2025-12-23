import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardWidgetConfig {
  id: string;
  enabled: boolean;
  order: number;
}

export interface DashboardConfig {
  widgets: DashboardWidgetConfig[];
  presentationMode: boolean;
  autoRefreshEnabled: boolean;
  autoRefreshInterval: number; // em segundos
}

const DEFAULT_WIDGETS: DashboardWidgetConfig[] = [
  { id: 'financial-cards', enabled: true, order: 1 },
  { id: 'os-status', enabled: true, order: 2 },
  { id: 'alerts', enabled: true, order: 3 },
  { id: 'trend-charts', enabled: true, order: 4 },
  { id: 'quick-actions', enabled: true, order: 5 },
  { id: 'main-sections', enabled: true, order: 6 },
];

export function useDashboardConfig() {
  const { user } = useAuth();
  const [config, setConfig] = useState<DashboardConfig>({
    widgets: DEFAULT_WIDGETS,
    presentationMode: false,
    autoRefreshEnabled: false,
    autoRefreshInterval: 60, // 60 segundos padrão
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadConfig();
    }
  }, [user]);

  const loadConfig = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('kv_store_2c4defad')
        .select('value')
        .eq('key', `dashboard_config_${user.id}`)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.value) {
        const savedConfig = data.value as DashboardConfig;
        // Garantir valores padrão para novas propriedades
        setConfig({
          ...savedConfig,
          autoRefreshEnabled: savedConfig.autoRefreshEnabled ?? false,
          autoRefreshInterval: savedConfig.autoRefreshInterval ?? 60,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (newConfig: DashboardConfig) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('kv_store_2c4defad')
        .upsert({
          key: `dashboard_config_${user.id}`,
          value: newConfig,
        });

      if (error) throw error;

      setConfig(newConfig);
    } catch (error) {
      console.error('Erro ao salvar configuração do dashboard:', error);
      throw error;
    }
  };

  const toggleWidget = async (widgetId: string) => {
    const newWidgets = config.widgets.map(w =>
      w.id === widgetId ? { ...w, enabled: !w.enabled } : w
    );
    await saveConfig({ ...config, widgets: newWidgets });
  };

  const updateWidgetOrder = async (widgets: DashboardWidgetConfig[]) => {
    await saveConfig({ ...config, widgets });
  };

  const togglePresentationMode = async () => {
    await saveConfig({ ...config, presentationMode: !config.presentationMode });
  };

  return {
    config,
    loading,
    toggleWidget,
    updateWidgetOrder,
    togglePresentationMode,
    saveConfig,
  };
}

