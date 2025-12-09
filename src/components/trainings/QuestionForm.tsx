import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { useQuizzes } from '@/hooks/useQuizzes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface QuestionFormProps {
  quizId: string;
  questions: any[];
}

export function QuestionForm({ quizId, questions }: QuestionFormProps) {
  const { createQuestion, updateQuestion, deleteQuestion } = useQuizzes();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [formData, setFormData] = useState({
    question_text: '',
    question_type: 'multiple_choice',
    points: 1.0,
    options: [
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false }
    ]
  });

  const resetForm = () => {
    setFormData({
      question_text: '',
      question_type: 'multiple_choice',
      points: 1.0,
      options: [
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false }
      ]
    });
    setEditingQuestion(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.question_text.trim() === '') {
      return;
    }

    const questionData = {
      question_text: formData.question_text,
      question_type: formData.question_type,
      points: formData.points,
      order_index: editingQuestion ? editingQuestion.order_index : (questions.length || 0)
    };

    if (editingQuestion) {
      await updateQuestion.mutateAsync({
        id: editingQuestion.id,
        question: questionData,
        options: formData.question_type !== 'short_answer' ? formData.options : []
      });
    } else {
      await createQuestion.mutateAsync({
        quizId,
        question: questionData,
        options: formData.question_type !== 'short_answer' ? formData.options : []
      });
    }
    
    setIsCreateOpen(false);
    resetForm();
  };

  const handleEdit = (question: any) => {
    setFormData({
      question_text: question.question_text,
      question_type: question.question_type,
      points: question.points || 1.0,
      options: question.quiz_question_options?.length > 0 
        ? question.quiz_question_options.map((opt: any) => ({
            option_text: opt.option_text,
            is_correct: opt.is_correct
          }))
        : [
            { option_text: '', is_correct: false },
            { option_text: '', is_correct: false }
          ]
    });
    setEditingQuestion(question);
    setIsCreateOpen(true);
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, { option_text: '', is_correct: false }]
    });
  };

  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index)
    });
  };

  const updateOption = (index: number, field: string, value: any) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    
    // If setting as correct, unset others for single choice
    if (field === 'is_correct' && value) {
      newOptions.forEach((opt, i) => {
        if (i !== index) opt.is_correct = false;
      });
    }
    
    setFormData({ ...formData, options: newOptions });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Questões ({questions.length})</h4>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Questão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? 'Editar' : 'Criar'} Questão</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="question_text">Texto da Questão *</Label>
                <Textarea 
                  id="question_text"
                  value={formData.question_text}
                  onChange={(e) => setFormData({...formData, question_text: e.target.value})}
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="question_type">Tipo</Label>
                  <Select 
                    value={formData.question_type} 
                    onValueChange={(value) => setFormData({...formData, question_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                      <SelectItem value="true_false">Verdadeiro/Falso</SelectItem>
                      <SelectItem value="short_answer">Resposta Curta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="points">Pontos</Label>
                  <Input 
                    id="points"
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={formData.points}
                    onChange={(e) => setFormData({...formData, points: parseFloat(e.target.value) || 1.0})}
                  />
                </div>
              </div>

              {(formData.question_type === 'multiple_choice' || formData.question_type === 'true_false') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Opções de Resposta</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addOption}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Opção
                    </Button>
                  </div>
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        value={option.option_text}
                        onChange={(e) => updateOption(index, 'option_text', e.target.value)}
                        placeholder={`Opção ${index + 1}`}
                        className="flex-1"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={option.is_correct}
                          onChange={(e) => updateOption(index, 'is_correct', e.target.checked)}
                          className="rounded"
                        />
                        <Label className="text-sm">Correta</Label>
                      </div>
                      {formData.options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingQuestion ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {questions.length > 0 ? (
        <div className="space-y-2">
          {questions.map((question, index) => (
            <div key={question.id} className="p-3 border rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <Badge variant="secondary">{question.question_type === 'multiple_choice' ? 'Múltipla Escolha' : question.question_type === 'true_false' ? 'V/F' : 'Resposta Curta'}</Badge>
                    <Badge variant="outline">{question.points} ponto{question.points !== 1 ? 's' : ''}</Badge>
                  </div>
                  <p className="text-sm font-medium">{question.question_text}</p>
                  {question.quiz_question_options && question.quiz_question_options.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {question.quiz_question_options.map((opt: any, optIdx: number) => (
                        <div key={opt.id} className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{optIdx + 1}.</span>
                          <span>{opt.option_text}</span>
                          {opt.is_correct && (
                            <Badge variant="default" className="text-xs">Correta</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleEdit(question)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir esta questão?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => deleteQuestion.mutateAsync(question.id)}
                          className="bg-destructive"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Nenhuma questão criada ainda
        </div>
      )}
    </div>
  );
}

