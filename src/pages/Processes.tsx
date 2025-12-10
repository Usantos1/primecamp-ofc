import { useState, useMemo, useEffect } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { ProcessCard } from '@/components/ProcessCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, LayoutGrid, KanbanSquare, Table } from 'lucide-react';
import { useProcesses } from '@/hooks/useProcesses';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DEPARTMENTS, Department } from '@/types/process';
import { cn } from '@/lib/utils';

export default function Processes() {
  const { processes, loading, deleteProcess } = useProcesses();
  const { categories } = useCategories();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'kanban' | 'table'>('cards');

  useEffect(() => {
    const view = searchParams.get('view') as 'cards' | 'kanban' | 'table' | null;
    if (view && ['cards', 'kanban', 'table'].includes(view)) {
      setViewMode(view);
    }
  }, [searchParams]);

  const handleViewChange = (mode: 'cards' | 'kanban' | 'table') => {
    setViewMode(mode);
    const next = new URLSearchParams(searchParams);
    next.set('view', mode);
    setSearchParams(next, { replace: true });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Rascunho';
      case 'active': return 'Ativo';
      case 'completed': return 'Concluído';
      case 'archived': return 'Arquivado';
      default: return status;
    }
  };

  const filteredProcesses = useMemo(() => {
    return processes.filter(process => {
      const matchesSearch = searchTerm === '' || 
        process.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        process.objective.toLowerCase().includes(searchTerm.toLowerCase()) ||
        process.department.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || process.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || process.categoryId === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [processes, searchTerm, statusFilter, categoryFilter]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleDeleteProcess = async (process: any) => {
    if (window.confirm(`Tem certeza que deseja deletar o processo "${process.name}"? Esta ação não pode ser desfeita.`)) {
      await deleteProcess(process.id);
    }
  };

  // Kanban por departamento
  const departmentKeys = Object.keys(DEPARTMENTS) as Department[];
  const kanbanColumns = departmentKeys.map((dept) => ({
    key: dept,
    title: DEPARTMENTS[dept],
    items: filteredProcesses.filter((p) => p.department === dept),
  }));
  const outros = filteredProcesses.filter((p) => !departmentKeys.includes(p.department as Department));
  if (outros.length > 0) {
    kanbanColumns.push({
      key: 'outros' as Department,
      title: 'Outros',
      items: outros,
    });
  }

  return (
    <ModernLayout 
      title="Processos" 
      subtitle="Gerencie todos os processos do sistema"
      onSearch={handleSearch}
      headerActions={
        isAdmin && (
          <Button 
            onClick={() => navigate('/processos/novo')}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Processo
          </Button>
        )
      }
    >
      {/* Filtros e modos de visualização */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar processos..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="archived">Arquivado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Visualização:</span>
          <div className="flex rounded-md border border-border overflow-hidden">
              {([
              { key: 'cards', label: 'Cards', icon: LayoutGrid },
              { key: 'kanban', label: 'Kanban', icon: KanbanSquare },
              { key: 'table', label: 'Tabela', icon: Table },
            ] as const).map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={viewMode === key ? 'default' : 'ghost'}
                size="sm"
                className="gap-2 rounded-none"
                onClick={() => handleViewChange(key)}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo sem pré-visualização */}
      <div className="space-y-4">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-card/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredProcesses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' 
                  ? 'Nenhum processo encontrado com os filtros aplicados'
                  : 'Nenhum processo criado ainda'}
              </div>
              {isAdmin && !searchTerm && statusFilter === 'all' && categoryFilter === 'all' && (
                <Button 
                  onClick={() => navigate('/processos/novo')}
                  className="gap-2"
                  variant="outline"
                >
                  <Plus className="h-4 w-4" />
                  Criar Primeiro Processo
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {viewMode === 'cards' && (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredProcesses.map(process => (
                  <ProcessCard 
                    key={process.id} 
                    process={process} 
                    onView={() => navigate(`/processo/${process.id}`)}
                    onEdit={() => navigate(`/processo/${process.id}/edit`)}
                    onDelete={handleDeleteProcess}
                  />
                ))}
              </div>
            )}

            {viewMode === 'kanban' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {kanbanColumns.map(col => (
                  <Card key={col.key} className="bg-muted/20 border border-border/70 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-sm">
                        <span>{col.title}</span>
                        <Badge variant="outline">{col.items.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {col.items.length === 0 && (
                        <div className="text-xs text-muted-foreground">Sem processos aqui.</div>
                      )}
                      {col.items.map(proc => (
                        <div 
                          key={proc.id} 
                          className="p-3 rounded-lg border bg-background/80 hover:border-primary/60 hover:shadow-sm cursor-pointer transition"
                          onClick={() => navigate(`/processo/${proc.id}`)}
                        >
                          <div className="font-medium text-sm mb-1 leading-tight">{proc.name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2"
                            dangerouslySetInnerHTML={{ __html: proc.objective || '' }}
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-[11px]">
                              {DEPARTMENTS[proc.department]}
                            </Badge>
                            <Badge variant="secondary" className="text-[11px] capitalize">
                              {getStatusLabel(proc.status)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {viewMode === 'table' && (
                <Card className="border border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Tabela de Processos</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2">Nome</th>
                        <th>Departamento</th>
                        <th>Status</th>
                        <th>Etapas</th>
                        <th>Métricas</th>
                        <th>Participantes</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProcesses.map(proc => (
                        <tr 
                          key={proc.id} 
                          className="border-t border-border/60 hover:bg-muted/30 even:bg-muted/10"
                        >
                          <td className="py-3 font-medium">{proc.name}</td>
                          <td>{DEPARTMENTS[proc.department]}</td>
                          <td className="capitalize">{getStatusLabel(proc.status)}</td>
                          <td>{proc.activities.length}</td>
                          <td>{proc.metrics.length}</td>
                          <td>{proc.participants.length}</td>
                          <td className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/processo/${proc.id}`)}>
                              Abrir
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </ModernLayout>
  );
}