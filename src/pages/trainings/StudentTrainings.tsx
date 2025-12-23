import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Clock, CheckCircle, Play, Search, Filter, Star, Award } from 'lucide-react';
import { useTrainings } from '@/hooks/useTrainings';
import { ModernLayout } from '@/components/ModernLayout';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { CertificateDownloadButton } from '@/components/trainings/TrainingCertificate';
import { useAuth } from '@/contexts/AuthContext';

export default function StudentTrainings() {
  const { user } = useAuth();
  const { myAssignments, isLoading } = useTrainings();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const allTrainings = myAssignments || [];
  
  // Get unique types for filter
  const trainingTypes = useMemo(() => {
    const types = new Set<string>();
    allTrainings.forEach(a => {
      if (a.training?.training_type) types.add(a.training.training_type);
    });
    return Array.from(types);
  }, [allTrainings]);

  // Filter trainings
  const filteredTrainings = useMemo(() => {
    return allTrainings.filter(assignment => {
      const matchesSearch = !searchTerm || 
        assignment.training?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.training?.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'completed' && assignment.status === 'completed') ||
        (filterStatus === 'pending' && assignment.status !== 'completed');
      
      const matchesType = filterType === 'all' || 
        assignment.training?.training_type === filterType;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [allTrainings, searchTerm, filterStatus, filterType]);

  const pendingTrainings = filteredTrainings.filter(a => a.status !== 'completed');
  const completedTrainings = filteredTrainings.filter(a => a.status === 'completed');

  if (isLoading) {
    return (
      <ModernLayout title="Meus Treinamentos">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout 
      title="Meus Treinamentos" 
      subtitle="Acompanhe seu progresso nos treinamentos atribuídos"
    >
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar treinamentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="completed">Concluídos</SelectItem>
          </SelectContent>
        </Select>
        {trainingTypes.length > 0 && (
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {trainingTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {pendingTrainings.length > 0 && (
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Pendentes ({pendingTrainings.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingTrainings.map((assignment) => (
              <Card key={assignment.training_id} className="hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50 group">
                {assignment.training.thumbnail_url && (
                  <div className="relative h-48 overflow-hidden rounded-t-lg">
                    <img 
                      src={assignment.training.thumbnail_url} 
                      alt={assignment.training.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2">
                      {assignment.training.mandatory && (
                        <Badge variant="destructive" className="shadow-lg">
                          Obrigatório
                        </Badge>
                      )}
                    </div>
                    {assignment.progress > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${assignment.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                      {assignment.training.title}
                    </CardTitle>
                    {!assignment.training.thumbnail_url && assignment.training.mandatory && (
                      <Badge variant="destructive" className="shrink-0">Obrigatório</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {assignment.training.description || 'Sem descrição'}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {assignment.training.training_type && (
                      <Badge variant="secondary">{assignment.training.training_type}</Badge>
                    )}
                    {assignment.training.department && (
                      <Badge variant="outline">{assignment.training.department}</Badge>
                    )}
                  </div>

                  {assignment.training.duration_minutes && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{assignment.training.duration_minutes} minutos</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold text-primary">{Math.round(assignment.progress)}%</span>
                    </div>
                    <Progress value={assignment.progress} className="h-2" />
                  </div>

                  <Button 
                    onClick={() => navigate(`/treinamentos/${assignment.training_id}`)}
                    className="w-full"
                    size="lg"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {assignment.progress > 0 ? 'Continuar' : 'Começar'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {completedTrainings.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Concluídos ({completedTrainings.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedTrainings.map((assignment) => (
              <Card key={assignment.training_id} className="border-green-500/20 bg-green-500/5 hover:shadow-lg transition-all">
                {assignment.training.thumbnail_url && (
                  <div className="relative h-48 overflow-hidden rounded-t-lg">
                    <img 
                      src={assignment.training.thumbnail_url} 
                      alt={assignment.training.title}
                      className="w-full h-full object-cover opacity-90"
                    />
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                      <div className="bg-green-500 rounded-full p-3">
                        <CheckCircle className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {assignment.training.title}
                    {!assignment.training.thumbnail_url && (
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Award className="h-4 w-4 text-green-500" />
                    <span>Concluído em {new Date(assignment.completed_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {assignment.training.training_type && (
                    <Badge variant="secondary">{assignment.training.training_type}</Badge>
                  )}
                  <div className="flex gap-2">
                    <CertificateDownloadButton
                      trainingTitle={assignment.training.title}
                      userName={user?.user_metadata?.display_name || user?.email || 'Usuário'}
                      completedAt={assignment.completed_at}
                      variant="default"
                      size="sm"
                    />
                    <Button 
                      variant="outline"
                      onClick={() => navigate(`/treinamentos/${assignment.training_id}`)}
                      className="flex-1"
                      size="sm"
                    >
                      Revisar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {filteredTrainings.length === 0 && (
        <div className="text-center py-12">
          <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">
            {searchTerm || filterStatus !== 'all' || filterType !== 'all' 
              ? 'Nenhum treinamento encontrado com os filtros aplicados'
              : 'Nenhum treinamento atribuído ainda'}
          </p>
          {(searchTerm || filterStatus !== 'all' || filterType !== 'all') && (
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
                setFilterType('all');
              }}
              className="mt-4"
            >
              Limpar Filtros
            </Button>
          )}
        </div>
      )}
    </ModernLayout>
  );
}
