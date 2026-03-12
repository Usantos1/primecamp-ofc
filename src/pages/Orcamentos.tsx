import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCompanySegment } from '@/hooks/useCompanySegment';

export default function Orcamentos() {
  const navigate = useNavigate();
  const { segmentoSlug } = useCompanySegment();
  const isOficina = segmentoSlug === 'oficina_mecanica';

  return (
    <ModernLayout
      title="Orçamentos"
      subtitle={isOficina ? 'Crie e gerencie orçamentos de serviços para veículos.' : 'Crie e gerencie orçamentos.'}
    >
      <div className="space-y-4 md:space-y-6 px-1 md:px-0">
        <Card className="border-2 border-gray-300 shadow-sm">
          <CardHeader className="pb-3 pt-3 md:pt-6 px-3 md:px-6 border-b-2 border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-white border-2 border-gray-200">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg md:text-xl">Orçamentos</CardTitle>
                <CardDescription className="mt-1">
                  {isOficina
                    ? 'Use as Ordens de Serviço para criar orçamentos, aprovar e converter em OS.'
                    : 'Use as Ordens de Serviço para criar orçamentos e converter em OS.'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 flex flex-col sm:flex-row gap-3">
            <Button onClick={() => navigate('/os/nova')} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova ordem (orçamento)
            </Button>
            <Button variant="outline" onClick={() => navigate('/os')} className="gap-2">
              <List className="h-4 w-4" />
              Ver ordens de serviço
            </Button>
          </CardContent>
        </Card>
      </div>
    </ModernLayout>
  );
}
