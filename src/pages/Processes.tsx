import { useState, useMemo } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { ProcessCard } from '@/components/ProcessCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter } from 'lucide-react';
import { useProcesses } from '@/hooks/useProcesses';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Processes() {
  const { processes, loading, deleteProcess } = useProcesses();
  const { categories } = useCategories();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

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
      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
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

      {/* Process Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
           style={{ 
             '--process-card-border': 'rgb(203 213 225)', 
             '--process-card-border-dark': 'rgb(71 85 105)' 
           } as React.CSSProperties}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-card/30 rounded-lg animate-pulse" />
          ))
        ) : filteredProcesses.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' 
                ? 'Nenhum processo encontrado com os filtros aplicados'
                : 'Nenhum processo criado ainda'
              }
            </div>
            {isAdmin && !searchTerm && statusFilter === 'all' && categoryFilter === 'all' && (
              <Button 
                onClick={() => navigate('/processos/novo')}
                className="mt-4 gap-2"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
                Criar Primeiro Processo
              </Button>
            )}
          </div>
        ) : (
          filteredProcesses.map(process => (
            <ProcessCard 
              key={process.id} 
              process={process} 
              onView={() => navigate(`/processo/${process.id}`)}
              onEdit={() => navigate(`/processo/${process.id}/edit`)}
              onDelete={handleDeleteProcess}
            />
          ))
        )}
      </div>
    </ModernLayout>
  );
}