/**
 * Painel de Alertas — Uma categoria de alertas (Operacional, Financeiro, Comercial, Gestão).
 * Rota: /painel-alertas/alertas/:categoria
 */
import { useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAlertsCatalog, useAlertsConfigs, useAlertsPreview, useAlertsFire } from '@/hooks/useAlerts';
import { Activity } from 'lucide-react';
import { AlertRow } from './AlertRow';
import { PainelAlertasNav } from './PainelAlertasNav';
import { CATEGORIAS, type CategoriaSlug } from './constants';

const CATEGORIAS_VALIDAS: CategoriaSlug[] = ['operacional', 'financeiro', 'comercial', 'gestao'];

export default function PainelAlertasCategoria() {
  const { categoria } = useParams<{ categoria: string }>();
  const { catalog, catalogLoading } = useAlertsCatalog();
  const { configs, configsLoading, saveOneConfig } = useAlertsConfigs();
  const { preview } = useAlertsPreview();
  const { fire: fireAlert } = useAlertsFire();

  const slug = (categoria ?? '').toLowerCase() as CategoriaSlug;
  const isValid = CATEGORIAS_VALIDAS.includes(slug);

  const configByCodigo = useMemo(() => {
    const map: Record<string, (typeof configs)[0]> = {};
    for (const c of configs) map[c.codigo_alerta] = c;
    return map;
  }, [configs]);

  const items = useMemo(() => {
    if (!catalog.length) return [];
    return catalog.filter((item) => (item.categoria || '').toLowerCase() === slug);
  }, [catalog, slug]);

  const tituloCategoria = CATEGORIAS[slug] ?? slug;

  if (categoria && !isValid) {
    return <Navigate to="/painel-alertas/alertas/operacional" replace />;
  }

  return (
    <ModernLayout
      title="Painel de Alertas"
      subtitle={`${tituloCategoria} — ative e personalize os alertas`}
    >
      <div className="h-full flex flex-col min-h-0 p-4 md:p-6 w-full">
        <PainelAlertasNav />
        {catalogLoading || configsLoading ? (
          <p className="text-muted-foreground">Carregando catálogo...</p>
        ) : (
          <div className="space-y-6 pb-4 overflow-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  {tituloCategoria}
                </CardTitle>
                <CardDescription>
                  Ative os alertas que deseja receber e personalize o texto quando permitido.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {items.length === 0 ? (
                  <p className="text-muted-foreground">Nenhum alerta nesta categoria.</p>
                ) : (
                  items.map((item) => (
                    <AlertRow
                      key={item.codigo_alerta}
                      catalogItem={item}
                      config={configByCodigo[item.codigo_alerta]}
                      onSave={saveOneConfig}
                      onPreview={preview}
                      onTest={fireAlert}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ModernLayout>
  );
}
