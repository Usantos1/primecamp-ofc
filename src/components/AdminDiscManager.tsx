import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, Download, Search, Filter, Trash2, FileText } from 'lucide-react';
import { DiscTestResults } from './DiscTestResults';
import { AdminDiscDetailedView } from './AdminDiscDetailedView';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface UserDiscResult {
  id: string;
  user_id: string;
  display_name: string;
  d_score: number;
  i_score: number;
  s_score: number;
  c_score: number;
  dominant_profile: string;
  completion_date: string;
  responses: any[];
}

interface CandidateDiscResult {
  id: string;
  name: string;
  age: number;
  whatsapp: string;
  email: string;
  company: string;
  d_score: number;
  i_score: number;
  s_score: number;
  c_score: number;
  dominant_profile: string;
  completion_date: string;
  created_at: string;
  responses: any[];
}

export const AdminDiscManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [profileFilter, setProfileFilter] = useState('all');
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'details' | 'questions'>('list');
  const queryClient = useQueryClient();

  // Fetch internal users results
  const { data: userResults = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-disc-users'],
    queryFn: async () => {
      const { data, error } = await from('disc_responses')
        .select('*')
        .eq('is_completed', true)
        .order('completion_date', { ascending: false })
        .execute();

      if (error) throw error;
      
      // Get user names separately
      const userIds = [...new Set((data || []).map(item => item.user_id).filter(Boolean))];
      const { data: profiles } = userIds.length > 0 
        ? await from('profiles')
            .select('user_id, display_name')
            .in('user_id', userIds)
            .execute()
        : { data: [] };
        
      return (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        display_name: profiles?.find(p => p.user_id === item.user_id)?.display_name || 'Usuário desconhecido',
        d_score: item.d_score,
        i_score: item.i_score,
        s_score: item.s_score,
        c_score: item.c_score,
        dominant_profile: item.dominant_profile,
        completion_date: item.completion_date,
        responses: item.responses
      })) as UserDiscResult[];
    }
  });

  // Fetch external candidates results (including partial responses)
  const { data: candidateResults = [], isLoading: loadingCandidates } = useQuery({
    queryKey: ['admin-disc-candidates'],
    queryFn: async () => {
      const { data, error } = await from('candidate_responses')
        .select('*')
        .order('created_at', { ascending: false })
        .execute();

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        // Mark partial responses
        isPartial: !item.is_completed,
        responsesCount: Array.isArray(item.responses) ? item.responses.length : 0
      })) as (CandidateDiscResult & { isPartial: boolean; responsesCount: number })[];
    }
  });

  const getProfileName = (profile: string) => {
    const profiles: Record<string, string> = {
      'D': 'Dominante',
      'I': 'Influente', 
      'S': 'Estável',
      'C': 'Cauteloso'
    };
    return profiles[profile] || profile;
  };

  const getProfileColor = (profile: string) => {
    const colors: Record<string, string> = {
      'D': 'bg-red-500',
      'I': 'bg-yellow-500',
      'S': 'bg-green-500', 
      'C': 'bg-blue-500'
    };
    return colors[profile] || 'bg-gray-500';
  };

  const filteredUserResults = userResults.filter(result => {
    const matchesSearch = result.display_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProfile = profileFilter === 'all' || result.dominant_profile === profileFilter;
    return matchesSearch && matchesProfile;
  });

  const filteredCandidateResults = candidateResults.filter(result => {
    const matchesSearch = result.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProfile = profileFilter === 'all' || result.dominant_profile === profileFilter;
    return matchesSearch && matchesProfile;
  });

  const exportResults = (type: 'users' | 'candidates') => {
    const data = type === 'users' ? filteredUserResults : filteredCandidateResults;
    const csv = [
      type === 'users' 
        ? 'Nome,Perfil Dominante,Score D,Score I,Score S,Score C,Data Conclusão'
        : 'Nome,Idade,WhatsApp,Email,Empresa,Perfil Dominante,Score D,Score I,Score S,Score C,Data Conclusão',
      ...data.map(result => 
        type === 'users'
          ? `${result.display_name || result.name},${getProfileName(result.dominant_profile)},${result.d_score},${result.i_score},${result.s_score},${result.c_score},${format(new Date(result.completion_date), 'dd/MM/yyyy', { locale: ptBR })}`
          : `${(result as CandidateDiscResult).name},${(result as CandidateDiscResult).age},${(result as CandidateDiscResult).whatsapp},${(result as CandidateDiscResult).email},${(result as CandidateDiscResult).company},${getProfileName(result.dominant_profile)},${result.d_score},${result.i_score},${result.s_score},${result.c_score},${format(new Date(result.completion_date), 'dd/MM/yyyy', { locale: ptBR })}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disc-${type}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório exportado com sucesso!');
  };

  const viewDetails = (result: any) => {
    const total = result.d_score + result.i_score + result.s_score + result.c_score;
    const discResult = {
      d_score: result.d_score,
      i_score: result.i_score,
      s_score: result.s_score,
      c_score: result.c_score,
      dominant_profile: result.dominant_profile,
      percentages: {
        D: Math.round((result.d_score / total) * 100),
        I: Math.round((result.i_score / total) * 100),
        S: Math.round((result.s_score / total) * 100),
        C: Math.round((result.c_score / total) * 100)
      },
      // Adicionar informações do candidato/usuário para exibição completa
      candidateInfo: result.name ? {
        name: result.name,
        age: result.age,
        whatsapp: result.whatsapp,
        email: result.email,
        company: result.company
      } : {
        name: result.display_name,
        type: 'internal'
      }
    };
    setSelectedResult(discResult);
    setViewMode('details');
  };

  const viewQuestions = (result: any) => {
    setSelectedResult(result);
    setViewMode('questions');
  };

  const handleBack = () => {
    setSelectedResult(null);
    setViewMode('list');
  };

  const deleteUserResult = async (resultId: string) => {
    try {
      console.log('Tentando excluir resultado do usuário com ID:', resultId);
      
      // Debug: verificar se o registro existe
      const { data: existingRecord } = await from('disc_responses')
        .select('*')
        .eq('id', resultId)
        .single();
      
      console.log('Registro encontrado:', existingRecord);
      
      const { error, data } = await from('disc_responses')
        .eq('id', resultId)
        .delete();

      console.log('Resultado da exclusão:', { error, data });

      if (error) {
        console.error('Erro RLS ou SQL:', error);
        throw error;
      }

      toast.success('Resultado excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['admin-disc-users'] });
    } catch (error: any) {
      console.error('Erro ao excluir resultado:', error);
      toast.error(`Erro ao excluir resultado: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const deleteCandidateResult = async (resultId: string) => {
    try {
      console.log('Tentando excluir resultado do candidato com ID:', resultId);
      
      // Debug: verificar se o registro existe
      const { data: existingRecord } = await from('candidate_responses')
        .select('*')
        .eq('id', resultId)
        .single();
      
      console.log('Registro encontrado:', existingRecord);
      
      const { error, data } = await from('candidate_responses')
        .eq('id', resultId)
        .delete();

      console.log('Resultado da exclusão:', { error, data });

      if (error) {
        console.error('Erro RLS ou SQL:', error);
        throw error;
      }

      toast.success('Resultado excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['admin-disc-candidates'] });
    } catch (error: any) {
      console.error('Erro ao excluir resultado:', error);
      toast.error(`Erro ao excluir resultado: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const deletePartialCandidates = async () => {
    try {
      const { error, data } = await from('candidate_responses')
        .eq('is_completed', false)
        .delete();

      if (error) throw error;
      const count = Array.isArray(data) ? data.length : 0;
      toast.success(`Removidos ${count} registros parciais/erro.`);
      queryClient.invalidateQueries({ queryKey: ['admin-disc-candidates'] });
    } catch (error: any) {
      console.error('Erro ao excluir parciais:', error);
      toast.error(`Falha ao excluir parciais: ${error.message || 'Erro desconhecido'}`);
    }
  };

  if (viewMode === 'details' && selectedResult) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={handleBack}
            className="mb-4"
          >
            ← Voltar à Lista
          </Button>
        </div>
        
        {/* Exibir informações do candidato/usuário */}
        {selectedResult.candidateInfo && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Informações do {selectedResult.candidateInfo.type === 'internal' ? 'Usuário' : 'Candidato'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <span className="font-semibold">Nome:</span>
                  <p>{selectedResult.candidateInfo.name}</p>
                </div>
                {selectedResult.candidateInfo.age && (
                  <div>
                    <span className="font-semibold">Idade:</span>
                    <p>{selectedResult.candidateInfo.age} anos</p>
                  </div>
                )}
                {selectedResult.candidateInfo.whatsapp && (
                  <div>
                    <span className="font-semibold">WhatsApp:</span>
                    <p>{selectedResult.candidateInfo.whatsapp}</p>
                  </div>
                )}
                {selectedResult.candidateInfo.email && (
                  <div>
                    <span className="font-semibold">Email:</span>
                    <p>{selectedResult.candidateInfo.email}</p>
                  </div>
                )}
                {selectedResult.candidateInfo.company && (
                  <div>
                    <span className="font-semibold">Empresa:</span>
                    <p>{selectedResult.candidateInfo.company}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        <DiscTestResults 
          result={selectedResult} 
          onRestart={handleBack}
        />
      </div>
    );
  }

  if (viewMode === 'questions' && selectedResult) {
    return (
      <AdminDiscDetailedView 
        result={selectedResult}
        onBack={handleBack}
        isCandidate={!!selectedResult.name}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Testes DISC</CardTitle>
          <CardDescription>
            Visualize e gerencie todos os resultados dos testes DISC realizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={profileFilter} onValueChange={setProfileFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os perfis</SelectItem>
                <SelectItem value="D">Dominante</SelectItem>
                <SelectItem value="I">Influente</SelectItem>
                <SelectItem value="S">Estável</SelectItem>
                <SelectItem value="C">Cauteloso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="internal" className="space-y-4">
            <TabsList>
              <TabsTrigger value="internal">
                Usuários Internos ({userResults.length})
              </TabsTrigger>
              <TabsTrigger value="external">
                Candidatos Externos ({candidateResults.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="internal" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Resultados dos Usuários Internos</h3>
                <Button onClick={() => exportResults('users')} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Perfil Dominante</TableHead>
                      <TableHead className="text-center">D</TableHead>
                      <TableHead className="text-center">I</TableHead>
                      <TableHead className="text-center">S</TableHead>
                      <TableHead className="text-center">C</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingUsers ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : filteredUserResults.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6">
                          Nenhum resultado encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUserResults.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">{result.display_name}</TableCell>
                          <TableCell>
                            <Badge className={`${getProfileColor(result.dominant_profile)} text-white`}>
                              {getProfileName(result.dominant_profile)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{result.d_score}</TableCell>
                          <TableCell className="text-center">{result.i_score}</TableCell>
                          <TableCell className="text-center">{result.s_score}</TableCell>
                          <TableCell className="text-center">{result.c_score}</TableCell>
                          <TableCell>
                            {format(new Date(result.completion_date), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                           <TableCell>
                             <div className="flex gap-2">
                               <Button 
                                 variant="outline" 
                                 size="sm"
                                 onClick={() => viewDetails(result)}
                               >
                                 <Eye className="h-4 w-4 mr-2" />
                                 Resumo
                               </Button>
                               <Button 
                                 variant="outline" 
                                 size="sm"
                                 onClick={() => viewQuestions(result)}
                               >
                                 <FileText className="h-4 w-4 mr-2" />
                                 Perguntas
                               </Button>
                               <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir este resultado DISC? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteUserResult(result.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="external" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Resultados dos Candidatos Externos</h3>
                <div className="flex gap-2">
                  <Button onClick={() => exportResults('candidates')} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Apagar parciais/erro
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir todos os testes parciais?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso removerá todos os registros de candidatos externos com status parcial (is_completed = false). Ação irreversível.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={deletePartialCandidates}>
                          Confirmar exclusão
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Idade</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Perfil Dominante</TableHead>
                      <TableHead className="text-center">D</TableHead>
                      <TableHead className="text-center">I</TableHead>
                      <TableHead className="text-center">S</TableHead>
                      <TableHead className="text-center">C</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingCandidates ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-6">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : filteredCandidateResults.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-6">
                          Nenhum resultado encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                       filteredCandidateResults.map((result) => (
                         <TableRow key={result.id}>
                           <TableCell className="font-medium">
                             <div className="flex items-center gap-2">
                               {result.name}
                               {result.isPartial && (
                                 <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                   Parcial ({result.responsesCount}/20)
                                 </Badge>
                               )}
                             </div>
                           </TableCell>
                           <TableCell>{result.age}</TableCell>
                           <TableCell>{result.whatsapp}</TableCell>
                           <TableCell>{result.email || '-'}</TableCell>
                           <TableCell>
                             {result.dominant_profile ? (
                               <Badge className={`${getProfileColor(result.dominant_profile)} text-white`}>
                                 {getProfileName(result.dominant_profile)}
                               </Badge>
                             ) : (
                               <Badge variant="secondary">Em andamento</Badge>
                             )}
                           </TableCell>
                           <TableCell className="text-center">{result.d_score || '-'}</TableCell>
                           <TableCell className="text-center">{result.i_score || '-'}</TableCell>
                           <TableCell className="text-center">{result.s_score || '-'}</TableCell>
                           <TableCell className="text-center">{result.c_score || '-'}</TableCell>
                           <TableCell>
                             {result.completion_date ? 
                               format(new Date(result.completion_date), 'dd/MM/yyyy', { locale: ptBR }) :
                               format(new Date(result.created_at), 'dd/MM/yyyy', { locale: ptBR }) + ' (iniciado)'
                             }
                           </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                 <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => viewDetails(result)}
                                  disabled={result.isPartial && !result.dominant_profile}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  {result.isPartial ? 'Ver Progresso' : 'Resumo'}
                                </Button>
                                {!result.isPartial && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => viewQuestions(result)}
                                  >
                                    <FileText className="h-4 w-4 mr-2" />
                                    Perguntas
                                  </Button>
                                )}
                               <AlertDialog>
                                 <AlertDialogTrigger asChild>
                                   <Button 
                                     variant="destructive" 
                                     size="sm"
                                   >
                                     <Trash2 className="h-4 w-4 mr-2" />
                                     Excluir
                                   </Button>
                                 </AlertDialogTrigger>
                                 <AlertDialogContent>
                                   <AlertDialogHeader>
                                     <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                     <AlertDialogDescription>
                                       Tem certeza que deseja excluir este resultado DISC? Esta ação não pode ser desfeita.
                                     </AlertDialogDescription>
                                   </AlertDialogHeader>
                                   <AlertDialogFooter>
                                     <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                     <AlertDialogAction onClick={() => deleteCandidateResult(result.id)}>
                                       Excluir
                                     </AlertDialogAction>
                                   </AlertDialogFooter>
                                 </AlertDialogContent>
                               </AlertDialog>
                             </div>
                           </TableCell>
                         </TableRow>
                       ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};