import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Wrench,
  Settings,
  FileText,
  Monitor,
  RefreshCw,
} from 'lucide-react';
import { DashboardConfigModal } from '@/components/dashboard/DashboardConfigModal';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGate } from '@/components/PermissionGate';

export default function Configuracoes() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [showDashboardConfig, setShowDashboardConfig] = useState(false);

  const configSections = [
    {
      title: 'Dashboard',
      description: 'Configure widgets, modo apresentação e atualização automática',
      icon: LayoutDashboard,
      color: 'from-blue-500 to-indigo-500',
      hoverColor: 'hover:from-blue-600 hover:to-indigo-600',
      action: () => setShowDashboardConfig(true),
      permission: 'admin.view',
    },
    {
      title: 'Configurar Cupom',
      description: 'Personalize informações e layout dos cupons fiscais',
      icon: Receipt,
      color: 'from-green-500 to-emerald-500',
      hoverColor: 'hover:from-green-600 hover:to-emerald-600',
      path: '/pdv/configuracao-cupom',
      permission: 'vendas.manage',
    },
    {
      title: 'Configurar Status OS',
      description: 'Gerencie status de ordens de serviço e checklists',
      icon: Wrench,
      color: 'from-purple-500 to-pink-500',
      hoverColor: 'hover:from-purple-600 hover:to-pink-600',
      path: '/pdv/configuracao-status',
      permission: 'os.config.status',
    },
  ];

  return (
    <ModernLayout
      title="Configurações"
      subtitle="Centralize todas as configurações do sistema"
    >
      <div className="space-y-4 md:space-y-6 px-1 md:px-0">
        {/* Header */}
        <Card className="border-2 border-gray-300 shadow-sm">
          <CardHeader className="pb-3 pt-3 md:pt-6 px-3 md:px-6 border-b-2 border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-gray-100 to-white border-2 border-gray-200">
                <Settings className="h-6 w-6 md:h-8 md:w-8 text-gray-600" />
              </div>
              <div>
                <CardTitle className="text-base md:text-xl">Central de Configurações</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Gerencie todas as configurações do sistema em um só lugar
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Cards de Configuração */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {configSections.map((section) => {
            const Icon = section.icon;
            const content = (
              <Card
                key={section.title}
                className="border-2 border-gray-300 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                onClick={section.action || (() => navigate(section.path!))}
              >
                <CardHeader className="pb-3 pt-3 md:pt-6 px-3 md:px-6">
                  <div className="flex items-start justify-between mb-2">
                    <div className={`p-2 md:p-3 rounded-lg bg-gradient-to-br ${section.color} ${section.hoverColor} transition-all group-hover:scale-110`}>
                      <Icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-sm md:text-lg mb-1">{section.title}</CardTitle>
                  <CardDescription className="text-xs md:text-sm line-clamp-2">
                    {section.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
                  <Button
                    className={`w-full bg-gradient-to-r ${section.color} ${section.hoverColor} text-white border-0 h-9`}
                    onClick={(e) => {
                      e.stopPropagation();
                      section.action ? section.action() : navigate(section.path!);
                    }}
                  >
                    Configurar
                  </Button>
                </CardContent>
              </Card>
            );

            if (section.permission) {
              return (
                <PermissionGate key={section.title} permission={section.permission}>
                  {content}
                </PermissionGate>
              );
            }

            return content;
          })}
        </div>

        {/* Informações Adicionais */}
        <Card className="border-2 border-gray-300 shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-50 border-2 border-blue-200">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm md:text-base font-semibold mb-1">Sobre as Configurações</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Todas as configurações são salvas por usuário e aplicadas imediatamente. 
                  Use o modo apresentação para exibir o dashboard em TVs da loja com atualização automática.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Configuração do Dashboard */}
      <DashboardConfigModal
        open={showDashboardConfig}
        onOpenChange={setShowDashboardConfig}
      />
    </ModernLayout>
  );
}

