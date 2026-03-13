import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Car, Users, FileText, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCompanySegment } from '@/hooks/useCompanySegment';

export default function Veiculos() {
  const navigate = useNavigate();
  const { segmentoSlug } = useCompanySegment();
  const isOficina = segmentoSlug === 'oficina_mecanica';

  return (
    <ModernLayout
      title="Veículos"
      subtitle={isOficina ? 'Cadastro de veículos e histórico de serviços por veículo.' : 'Cadastro de veículos e histórico.'}
    >
      <div className="space-y-4 md:space-y-6 px-1 md:px-0">
        <Card className="border-2 border-gray-300 shadow-sm">
          <CardHeader className="pb-3 pt-3 md:pt-6 px-3 md:px-6 border-b-2 border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-100 to-white border-2 border-gray-200">
                <Car className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg md:text-xl">Veículos</CardTitle>
                <CardDescription className="mt-1">
                  {isOficina
                    ? 'Os veículos são vinculados aos clientes e registrados nas Ordens de Serviço. Cadastre o cliente em Clientes e, ao abrir uma OS, informe o veículo (marca, modelo, placa). O histórico por veículo aparece nas OS do cliente.'
                    : 'Veículos são vinculados aos clientes e às Ordens de Serviço. Use Clientes para cadastro e a lista de OS para histórico.'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 flex flex-col sm:flex-row gap-3">
            <Button onClick={() => navigate('/clientes')} className="gap-2">
              <Users className="h-4 w-4" />
              Clientes (cadastro e vínculo)
            </Button>
            <Button variant="outline" onClick={() => navigate('/os/nova')} className="gap-2">
              <FileText className="h-4 w-4" />
              Nova OS (registrar veículo)
            </Button>
            <Button variant="outline" onClick={() => navigate('/os')} className="gap-2">
              <List className="h-4 w-4" />
              Ordens de Serviço (histórico)
            </Button>
          </CardContent>
        </Card>
      </div>
    </ModernLayout>
  );
}
