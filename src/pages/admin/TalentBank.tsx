import { useState, useMemo } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Eye, Brain, Download, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  age?: number;
  survey_id: string;
  survey_title?: string;
  survey_position?: string;
  created_at: string;
  responses?: any;
  ai_analysis?: any;
}

export default function TalentBank() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState<string>('all');
  const [competenceFilter, setCompetenceFilter] = useState<string>('all');

  // Fetch all candidates from all surveys
  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['talent-bank', selectedSurvey, competenceFilter],
    queryFn: async () => {
      let query = supabase
        .from('job_responses')
        .select(`
          *,
          job_surveys!inner (
            id,
            title,
            position_title,
            department
          )
        `)
        .order('created_at', { ascending: false });

      if (selectedSurvey !== 'all') {
        query = query.eq('survey_id', selectedSurvey);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao carregar candidatos do banco de talentos:', error);
        toast({
          title: 'Erro ao carregar candidatos',
          description: error.message || 'Tente novamente ou verifique as permissões.',
          variant: 'destructive',
        });
        return [];
      }

      // Fetch AI analysis for each candidate
      const candidateIds = (data || []).map((c: any) => c.id);
      let aiAnalyses: any[] = [];
      if (candidateIds.length > 0) {
        const { data: analyses, error: aiError } = await supabase
          .from('job_candidate_ai_analysis')
          .select('*')
          .in('job_response_id', candidateIds);

        if (aiError) {
          console.error('Erro ao carregar análises de IA:', aiError);
          toast({
            title: 'Erro ao carregar análises de IA',
            description: aiError.message || 'As análises de IA não puderam ser carregadas.',
            variant: 'destructive',
          });
        } else {
          aiAnalyses = analyses || [];
        }
      }

      return (data || []).map((candidate: any) => ({
        ...candidate,
        survey_title: candidate.job_surveys?.title,
        survey_position: candidate.job_surveys?.position_title,
        ai_analysis: aiAnalyses?.find((a: any) => a.job_response_id === candidate.id)
      })) as Candidate[];
    }
  });

  // Fetch all surveys for filter
  const { data: surveys = [] } = useQuery({
    queryKey: ['all-surveys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_surveys')
        .select('id, title, position_title')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const filteredCandidates = useMemo(() => {
    return candidates.filter(candidate => {
      const matchesSearch = 
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.survey_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.survey_position?.toLowerCase().includes(searchTerm.toLowerCase());

      if (competenceFilter === 'all') return matchesSearch;
      
      // Filter by competence from AI analysis
      if (candidate.ai_analysis) {
        const analysis = candidate.ai_analysis;
        const competences = [
          analysis.disc_profile,
          analysis.commitment_level,
          analysis.writing_ability,
          analysis.job_fit_score
        ].filter(Boolean);
        
        return matchesSearch && competences.some(c => 
          c?.toLowerCase().includes(competenceFilter.toLowerCase())
        );
      }

      return matchesSearch;
    });
  }, [candidates, searchTerm, competenceFilter]);

  const exportCandidates = () => {
    const headers = ['Nome', 'Email', 'Telefone', 'Idade', 'Vaga', 'Cargo', 'Data'];
    const csvData = filteredCandidates.map(candidate => [
      candidate.name,
      candidate.email,
      candidate.phone || candidate.whatsapp || '',
      candidate.age || '',
      candidate.survey_title || '',
      candidate.survey_position || '',
      format(new Date(candidate.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
    ]);

    const csv = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `banco-talentos-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast({
      title: "Sucesso!",
      description: "Candidatos exportados com sucesso!",
    });
  };

  return (
    <ModernLayout
      title="Banco de Talentos"
      subtitle="Visualize todos os candidatos de todas as vagas"
    >
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Banco de Talentos</CardTitle>
              <CardDescription>
                {filteredCandidates.length} candidato(s) encontrado(s)
              </CardDescription>
            </div>
            <Button onClick={exportCandidates} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou vaga..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedSurvey} onValueChange={setSelectedSurvey}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por vaga" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as vagas</SelectItem>
                  {surveys.map((survey: any) => (
                    <SelectItem key={survey.id} value={survey.id}>
                      {survey.title} - {survey.position_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={competenceFilter} onValueChange={setCompetenceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por competência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as competências</SelectItem>
                  <SelectItem value="alto">Alto comprometimento</SelectItem>
                  <SelectItem value="excelente">Excelente escrita</SelectItem>
                  <SelectItem value="alto fit">Alto fit para vaga</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tabela de candidatos */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidato</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Vaga</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Avaliação IA</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredCandidates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum candidato encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCandidates.map((candidate) => (
                      <TableRow key={candidate.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{candidate.name}</div>
                            {candidate.age && (
                              <div className="text-sm text-muted-foreground">
                                {candidate.age} anos
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{candidate.email}</div>
                            {(candidate.phone || candidate.whatsapp) && (
                              <div className="text-muted-foreground">
                                {candidate.phone || candidate.whatsapp}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{candidate.survey_title}</div>
                            <div className="text-sm text-muted-foreground">
                              {candidate.survey_position}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(candidate.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {candidate.ai_analysis ? (
                            <div className="space-y-1">
                              {candidate.ai_analysis.disc_profile && (
                                <Badge variant="outline">
                                  DISC: {candidate.ai_analysis.disc_profile}
                                </Badge>
                              )}
                              {candidate.ai_analysis.commitment_level && (
                                <Badge variant="outline">
                                  Comprometimento: {candidate.ai_analysis.commitment_level}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Sem análise</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigate(`/admin/job-surveys/${candidate.survey_id}?candidate_id=${candidate.id}`);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                            {candidate.ai_analysis && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  navigate(`/admin/job-surveys/${candidate.survey_id}?candidate_id=${candidate.id}&show_ai=true`);
                                }}
                              >
                                <Brain className="h-4 w-4 mr-1" />
                                IA
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </ModernLayout>
  );
}

