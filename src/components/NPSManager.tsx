import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNPS, NPSSurvey, NPSQuestion } from '@/hooks/useNPS';
import { useAuth } from '@/contexts/AuthContext';
import { NPSSurveyForm } from './NPSSurveyForm';
import { Plus, Edit3, Trash2, BarChart3, Users, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface NPSManagerProps {
  mode?: 'surveys' | 'manage' | 'analytics';
  hideTabs?: boolean;
}

export const NPSManager = ({ mode = 'surveys', hideTabs = false }: NPSManagerProps = {}) => {
  const { surveys, responses, loading, createSurvey, updateSurvey, deleteSurvey, submitResponse, getTodayResponse } = useNPS();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(mode);
  const [surveyResponses, setSurveyResponses] = useState<Record<string, any>>({});

  const activeSurveys = surveys.filter(s => s.is_active);
  const todayResponses = responses.filter(r => r.date === format(new Date(), 'yyyy-MM-dd'));

  const handleResponseSubmit = async (survey: NPSSurvey) => {
    await submitResponse(survey.id, surveyResponses[survey.id] || {});
    setSurveyResponses(prev => ({ ...prev, [survey.id]: {} }));
  };

  const updateResponse = (surveyId: string, questionId: string, value: any) => {
    setSurveyResponses(prev => ({
      ...prev,
      [surveyId]: {
        ...prev[surveyId],
        [questionId]: value
      }
    }));
  };

  const getResponseChartData = (survey: NPSSurvey) => {
    const surveyResponses = responses.filter(r => r.survey_id === survey.id);
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last30Days.map(date => {
      const dayResponses = surveyResponses.filter(r => r.date === date);
      const averages: Record<string, number> = {};
      
      survey.questions.forEach(question => {
        if (question.type === 'scale' || question.type === 'rating') {
          const values = dayResponses
            .map(r => r.responses[question.id])
            .filter(v => v !== undefined && v !== null);
          
          averages[question.id] = values.length > 0 
            ? values.reduce((sum, val) => sum + Number(val), 0) / values.length 
            : 0;
        }
      });

      return {
        date: format(new Date(date), 'dd/MM', { locale: ptBR }),
        fullDate: date,
        responses: dayResponses.length,
        ...averages
      };
    });
  };

  const renderQuestionInput = (question: NPSQuestion, surveyId: string) => {
    const value = surveyResponses[surveyId]?.[question.id] || '';

    switch (question.type) {
      case 'scale':
        return (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{question.scale_labels?.min}</span>
              <span>{question.scale_labels?.max}</span>
            </div>
            <div className="flex gap-2">
              {Array.from({ length: (question.scale_max || 10) - (question.scale_min || 1) + 1 }, (_, i) => {
                const val = (question.scale_min || 1) + i;
                return (
                  <Button
                    key={val}
                    type="button"
                    variant={value === val ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateResponse(surveyId, question.id, val)}
                    className="w-10 h-10"
                  >
                    {val}
                  </Button>
                );
              })}
            </div>
          </div>
        );
      
      case 'rating':
        return (
          <div className="flex gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Button
                key={i + 1}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => updateResponse(surveyId, question.id, i + 1)}
                className={`p-1 ${value >= i + 1 ? 'text-yellow-500' : 'text-gray-300'}`}
              >
                ⭐
              </Button>
            ))}
          </div>
        );
      
      case 'text':
        return (
          <Textarea
            value={value}
            onChange={(e) => updateResponse(surveyId, question.id, e.target.value)}
            placeholder="Digite sua resposta..."
            rows={3}
          />
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="border-2 border-gray-300 border-l-4 border-l-green-500 shadow-sm bg-green-50/50 md:bg-transparent">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm font-medium text-green-700 md:text-muted-foreground">Pesquisas Ativas</p>
                <p className="text-base md:text-2xl font-bold text-green-700 md:text-foreground">{activeSurveys.length}</p>
              </div>
              <BarChart3 className="h-3 w-3 md:h-8 md:w-8 text-green-600 md:text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-300 border-l-4 border-l-blue-500 shadow-sm bg-blue-50/50 md:bg-transparent">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm font-medium text-blue-700 md:text-muted-foreground">Respostas Hoje</p>
                <p className="text-base md:text-2xl font-bold text-blue-700 md:text-foreground">{todayResponses.length}</p>
              </div>
              <Calendar className="h-3 w-3 md:h-8 md:w-8 text-blue-600 md:text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-300 border-l-4 border-l-purple-500 shadow-sm bg-purple-50/50 md:bg-transparent">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm font-medium text-purple-700 md:text-muted-foreground">Total de Respostas</p>
                <p className="text-base md:text-2xl font-bold text-purple-700 md:text-foreground">{responses.length}</p>
              </div>
              <Users className="h-3 w-3 md:h-8 md:w-8 text-purple-600 md:text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {!hideTabs ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 border-2 border-gray-300 bg-gray-50">
            <TabsTrigger 
              value="surveys"
              className="text-xs md:text-sm border-r-2 border-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white"
            >
              Responder Pesquisas
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger 
                value="manage"
                className="text-xs md:text-sm border-r-2 border-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white"
              >
                Gerenciar Pesquisas
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger 
                value="analytics"
                className="text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white"
              >
                Análises
              </TabsTrigger>
            )}
          </TabsList>

        <TabsContent value="surveys" className="space-y-4">
          {activeSurveys.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Nenhuma pesquisa ativa no momento</p>
              </CardContent>
            </Card>
          ) : (
            activeSurveys.map(survey => {
              const todayResponse = getTodayResponse(survey.id);
              
              return (
                <Card key={survey.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{survey.title}</CardTitle>
                        {survey.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {survey.description}
                          </p>
                        )}
                      </div>
                      {todayResponse && (
                        <Badge variant="default">Respondido hoje</Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  {!todayResponse && (
                    <CardContent className="space-y-6">
                      {survey.questions.map((question, index) => (
                        <div key={question.id} className="space-y-3">
                          <Label className="text-base font-medium">
                            {index + 1}. {question.question}
                            {question.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          {renderQuestionInput(question, survey.id)}
                        </div>
                      ))}
                      
                      <Button 
                        onClick={() => handleResponseSubmit(survey)}
                        className="w-full"
                      >
                        Enviar Resposta
                      </Button>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="manage" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Gerenciar Pesquisas NPS</h3>
              <NPSSurveyForm
                onSubmit={createSurvey}
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Pesquisa
                  </Button>
                }
              />
            </div>

            <div className="grid gap-4">
              {surveys.map(survey => (
                <Card key={survey.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {survey.title}
                          <Badge variant={survey.is_active ? 'default' : 'secondary'}>
                            {survey.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </CardTitle>
                        {survey.description && (
                          <p className="text-sm text-muted-foreground">
                            {survey.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <NPSSurveyForm
                          survey={survey}
                          onSubmit={(data) => updateSurvey(survey.id, data)}
                          trigger={
                            <Button variant="outline" size="sm">
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir pesquisa</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir esta pesquisa? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteSurvey(survey.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {survey.questions.length} pergunta(s) • 
                      Criada em {format(new Date(survey.created_at), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="analytics" className="space-y-6">
            {surveys.map(survey => {
              const chartData = getResponseChartData(survey);
              const surveyResponses = responses.filter(r => r.survey_id === survey.id);
              
              return (
                <Card key={survey.id}>
                  <CardHeader>
                    <CardTitle>{survey.title} - Análises</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{surveyResponses.length}</p>
                        <p className="text-sm text-muted-foreground">Total de Respostas</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {chartData.reduce((sum, day) => sum + day.responses, 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {Math.round(chartData.reduce((sum, day) => sum + day.responses, 0) / 30 * 10) / 10}
                        </p>
                        <p className="text-sm text-muted-foreground">Média diária</p>
                      </div>
                    </div>

                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line 
                            type="monotone" 
                            dataKey="responses" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            name="Respostas"
                          />
                          {survey.questions
                            .filter(q => q.type === 'scale' || q.type === 'rating')
                            .map((question, index) => (
                              <Line
                                key={question.id}
                                type="monotone"
                                dataKey={question.id}
                                stroke={`hsl(${(index * 60) % 360}, 70%, 50%)`}
                                strokeWidth={2}
                                name={question.question}
                              />
                            ))
                          }
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        )}
      </Tabs>
      ) : (
        <>
          {mode === 'surveys' && (
            <div className="space-y-4">
              {activeSurveys.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">Nenhuma pesquisa ativa no momento</p>
                  </CardContent>
                </Card>
              ) : (
                activeSurveys.map(survey => {
                  const todayResponse = getTodayResponse(survey.id);
                  
                  return (
                    <Card key={survey.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>{survey.title}</CardTitle>
                            {survey.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {survey.description}
                              </p>
                            )}
                          </div>
                          {todayResponse && (
                            <Badge variant="default">Respondido hoje</Badge>
                          )}
                        </div>
                      </CardHeader>
                      
                      {!todayResponse && (
                        <CardContent className="space-y-6">
                          {survey.questions.map((question, index) => (
                            <div key={question.id} className="space-y-3">
                              <Label className="text-base font-medium">
                                {index + 1}. {question.question}
                                {question.required && <span className="text-red-500 ml-1">*</span>}
                              </Label>
                              {renderQuestionInput(question, survey.id)}
                            </div>
                          ))}
                          
                          <Button 
                            onClick={() => handleResponseSubmit(survey)}
                            className="w-full"
                          >
                            Enviar Resposta
                          </Button>
                        </CardContent>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          )}
          
          {mode === 'manage' && isAdmin && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Gerenciar Pesquisas NPS</h3>
                <NPSSurveyForm
                  onSubmit={createSurvey}
                  trigger={
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Pesquisa
                    </Button>
                  }
                />
              </div>

              <div className="grid gap-4">
                {surveys.map(survey => (
                  <Card key={survey.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {survey.title}
                            <Badge variant={survey.is_active ? 'default' : 'secondary'}>
                              {survey.is_active ? 'Ativa' : 'Inativa'}
                            </Badge>
                          </CardTitle>
                          {survey.description && (
                            <p className="text-sm text-muted-foreground">
                              {survey.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <NPSSurveyForm
                            survey={survey}
                            onSubmit={(data) => updateSurvey(survey.id, data)}
                            trigger={
                              <Button variant="outline" size="sm">
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir pesquisa</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir esta pesquisa? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteSurvey(survey.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {survey.questions.length} pergunta(s) • 
                        Criada em {format(new Date(survey.created_at), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {mode === 'analytics' && isAdmin && (
            <div className="space-y-6">
              {surveys.map(survey => {
                const chartData = getResponseChartData(survey);
                const surveyResponses = responses.filter(r => r.survey_id === survey.id);
                
                return (
                  <Card key={survey.id}>
                    <CardHeader>
                      <CardTitle>{survey.title} - Análises</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">{surveyResponses.length}</p>
                          <p className="text-sm text-muted-foreground">Total de Respostas</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">
                            {chartData.reduce((sum, day) => sum + day.responses, 0)}
                          </p>
                          <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">
                            {Math.round(chartData.reduce((sum, day) => sum + day.responses, 0) / 30 * 10) / 10}
                          </p>
                          <p className="text-sm text-muted-foreground">Média diária</p>
                        </div>
                      </div>

                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line 
                              type="monotone" 
                              dataKey="responses" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={2}
                              name="Respostas"
                            />
                            {survey.questions
                              .filter(q => q.type === 'scale' || q.type === 'rating')
                              .map((question, index) => (
                                <Line
                                  key={question.id}
                                  type="monotone"
                                  dataKey={question.id}
                                  stroke={`hsl(${(index * 60) % 360}, 70%, 50%)`}
                                  strokeWidth={2}
                                  name={question.question}
                                />
                              ))
                            }
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};