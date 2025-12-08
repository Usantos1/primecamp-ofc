import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NPSManager } from '@/components/NPSManager';
import { useNPS } from '@/hooks/useNPS';
import { useUsers } from '@/hooks/useUsers';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, MessageSquare, BarChart3 } from 'lucide-react';

export const AdminNPSManager = () => {
  const { surveys, responses, loading } = useNPS();
  const { users } = useUsers();
  const [searchTerm, setSearchTerm] = useState('');

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.display_name || 'Usuário desconhecido';
  };

  const calculateUserAverageScore = (userId: string) => {
    const userResponses = responses.filter(r => r.user_id === userId);
    if (userResponses.length === 0) return null;

    // Get all NPS ratings from user responses
    const ratings = userResponses
      .map(response => {
        const firstQuestionKey = Object.keys(response.responses)[0];
        return response.responses[firstQuestionKey];
      })
      .filter(rating => typeof rating === 'number' && rating >= 0 && rating <= 5);

    if (ratings.length === 0) return null;

    const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    return Math.round(average * 10) / 10; // Round to 1 decimal place
  };

  const calculateNPSScore = (surveyId: string) => {
    const surveyResponses = responses.filter(r => r.survey_id === surveyId);
    if (surveyResponses.length === 0) return null;

    // Assuming the first question is always the NPS rating (0-10)
    const ratings = surveyResponses
      .map(response => {
        const firstQuestionKey = Object.keys(response.responses)[0];
        return response.responses[firstQuestionKey];
      })
      .filter(rating => typeof rating === 'number' && rating >= 0 && rating <= 10);

    if (ratings.length === 0) return null;

    const promoters = ratings.filter(rating => rating >= 9).length;
    const detractors = ratings.filter(rating => rating <= 6).length;
    const npsScore = Math.round(((promoters - detractors) / ratings.length) * 100);

    return {
      score: npsScore,
      total: ratings.length,
      promoters,
      detractors,
      passives: ratings.length - promoters - detractors
    };
  };

  const filteredResponses = responses.filter(response => {
    const userName = getUserName(response.user_id).toLowerCase();
    const surveyTitle = surveys.find(s => s.id === response.survey_id)?.title || '';
    return userName.includes(searchTerm.toLowerCase()) ||
           surveyTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
           response.date.includes(searchTerm);
  });

  const getOverallStats = () => {
    const totalSurveys = surveys.length;
    const activeSurveys = surveys.filter(s => s.is_active).length;
    const totalResponses = responses.length;
    const todayResponses = responses.filter(r => r.date === format(new Date(), 'yyyy-MM-dd')).length;

    return { totalSurveys, activeSurveys, totalResponses, todayResponses };
  };

  const stats = getOverallStats();

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Pesquisas</p>
                <p className="text-2xl font-bold">{stats.totalSurveys}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pesquisas Ativas</p>
                <p className="text-2xl font-bold">{stats.activeSurveys}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Respostas</p>
                <p className="text-2xl font-bold">{stats.totalResponses}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Respostas Hoje</p>
                <p className="text-2xl font-bold">{stats.todayResponses}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NPS Scores Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Pontuação NPS por Pesquisa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {surveys.map((survey) => {
              const npsData = calculateNPSScore(survey.id);
              return (
                <div key={survey.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{survey.title}</h3>
                    <p className="text-sm text-muted-foreground">{survey.description}</p>
                  </div>
                  <div className="text-right">
                    {npsData ? (
                      <>
                        <div className="text-2xl font-bold">
                          {npsData.score > 0 ? '+' : ''}{npsData.score}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {npsData.total} respostas
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {npsData.promoters}P | {npsData.passives}N | {npsData.detractors}D
                        </div>
                      </>
                    ) : (
                      <div className="text-muted-foreground">Sem dados</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Manage Surveys */}
      <NPSManager />

      {/* Responses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Respostas Recebidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário, pesquisa ou data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Carregando respostas...</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Pesquisa</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Nota Média</TableHead>
                    <TableHead className="w-1/3">Todas as Respostas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResponses.map((response) => {
                    const survey = surveys.find(s => s.id === response.survey_id);
                    const firstQuestionKey = Object.keys(response.responses)[0];
                    const mainRating = response.responses[firstQuestionKey];
                    
                    return (
                  <TableRow key={response.id}>
                    <TableCell className="font-medium">
                      {getUserName(response.user_id)}
                    </TableCell>
                    <TableCell>{survey?.title || 'Pesquisa não encontrada'}</TableCell>
                    <TableCell>
                      {format(new Date(response.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(response.created_at), 'HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {calculateUserAverageScore(response.user_id) !== null ? (
                        <Badge variant={calculateUserAverageScore(response.user_id)! >= 4 ? 'default' : calculateUserAverageScore(response.user_id)! >= 3 ? 'secondary' : 'destructive'}>
                          {calculateUserAverageScore(response.user_id)}/5
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                     <TableCell>
                       <div className="space-y-1">
                         {Object.entries(response.responses).map(([questionId, answer], idx) => {
                           const question = survey?.questions?.find(q => q.id === questionId);
                           return (
                             <div key={idx} className="text-sm">
                               <div className="font-medium text-muted-foreground">
                                 {question?.question || `Pergunta ${questionId}`}:
                               </div>
                               <div className="text-foreground">
                                 {question?.type === 'scale' 
                                   ? `${answer}/${question?.scale_max || 10}` 
                                   : answer || '-'}
                               </div>
                             </div>
                           );
                         })}
                       </div>
                     </TableCell>
                  </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};