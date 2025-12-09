import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, FileQuestion, CheckCircle2, XCircle } from 'lucide-react';
import { useQuizzes } from '@/hooks/useQuizzes';
import { Switch } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestionForm } from './QuestionForm';

interface QuizManagerProps {
  trainingId: string;
}

export function QuizManager({ trainingId }: QuizManagerProps) {
  const { quizzes, isLoading, createQuiz, updateQuiz, deleteQuiz } = useQuizzes(trainingId);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    passing_score: 70,
    max_attempts: '',
    time_limit_minutes: '',
    randomize_questions: false,
    show_correct_answers: true,
    required: true
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      passing_score: 70,
      max_attempts: '',
      time_limit_minutes: '',
      randomize_questions: false,
      show_correct_answers: true,
      required: true
    });
    setEditingQuiz(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const quizData = {
      training_id: trainingId,
      ...formData,
      max_attempts: formData.max_attempts ? parseInt(formData.max_attempts) : null,
      time_limit_minutes: formData.time_limit_minutes ? parseInt(formData.time_limit_minutes) : null
    };

    if (editingQuiz) {
      await updateQuiz.mutateAsync({ id: editingQuiz.id, ...quizData });
    } else {
      await createQuiz.mutateAsync(quizData);
    }
    
    setIsCreateOpen(false);
    resetForm();
  };

  const handleEdit = (quiz: any) => {
    setFormData({
      title: quiz.title,
      description: quiz.description || '',
      passing_score: quiz.passing_score || 70,
      max_attempts: quiz.max_attempts?.toString() || '',
      time_limit_minutes: quiz.time_limit_minutes?.toString() || '',
      randomize_questions: quiz.randomize_questions || false,
      show_correct_answers: quiz.show_correct_answers !== false,
      required: quiz.required !== false
    });
    setEditingQuiz(quiz);
    setIsCreateOpen(true);
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando quizzes...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Quizzes e Avaliações</h3>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Quiz
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingQuiz ? 'Editar' : 'Criar'} Quiz</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input 
                  id="title" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea 
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="passing_score">Nota Mínima para Aprovação (%)</Label>
                  <Input 
                    id="passing_score"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.passing_score}
                    onChange={(e) => setFormData({...formData, passing_score: parseFloat(e.target.value) || 70})}
                  />
                </div>

                <div>
                  <Label htmlFor="max_attempts">Tentativas Máximas (deixe vazio para ilimitado)</Label>
                  <Input 
                    id="max_attempts"
                    type="number"
                    min="1"
                    value={formData.max_attempts}
                    onChange={(e) => setFormData({...formData, max_attempts: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="time_limit_minutes">Tempo Limite (minutos, deixe vazio para sem limite)</Label>
                <Input 
                  id="time_limit_minutes"
                  type="number"
                  min="1"
                  value={formData.time_limit_minutes}
                  onChange={(e) => setFormData({...formData, time_limit_minutes: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="randomize_questions"
                    checked={formData.randomize_questions}
                    onChange={(e) => setFormData({...formData, randomize_questions: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="randomize_questions">Embaralhar questões</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="show_correct_answers"
                    checked={formData.show_correct_answers}
                    onChange={(e) => setFormData({...formData, show_correct_answers: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="show_correct_answers">Mostrar respostas corretas após conclusão</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="required"
                    checked={formData.required}
                    onChange={(e) => setFormData({...formData, required: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="required">Obrigatório para concluir treinamento</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingQuiz ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {quizzes && quizzes.length > 0 ? (
        <div className="space-y-3">
          {quizzes.map((quiz) => (
            <Card key={quiz.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileQuestion className="h-5 w-5" />
                      {quiz.title}
                    </CardTitle>
                    {quiz.description && (
                      <p className="text-sm text-muted-foreground mt-1">{quiz.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedQuiz(selectedQuiz === quiz.id ? null : quiz.id)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Gerenciar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEdit(quiz)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o quiz "{quiz.title}"? 
                            Todas as questões e tentativas serão excluídas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteQuiz.mutateAsync(quiz.id)}
                            className="bg-destructive"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap mt-2">
                  <Badge variant="secondary">
                    Nota mínima: {quiz.passing_score}%
                  </Badge>
                  {quiz.max_attempts && (
                    <Badge variant="outline">
                      Máx. {quiz.max_attempts} tentativa{quiz.max_attempts > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {quiz.time_limit_minutes && (
                    <Badge variant="outline">
                      {quiz.time_limit_minutes} min
                    </Badge>
                  )}
                  {quiz.required && (
                    <Badge variant="destructive">Obrigatório</Badge>
                  )}
                  <Badge variant="outline">
                    {quiz.quiz_questions?.length || 0} questão{(quiz.quiz_questions?.length || 0) !== 1 ? 'ões' : ''}
                  </Badge>
                </div>
              </CardHeader>
              {selectedQuiz === quiz.id && (
                <CardContent>
                  <QuestionForm quizId={quiz.id} questions={quiz.quiz_questions || []} />
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum quiz criado ainda
        </div>
      )}
    </div>
  );
}

