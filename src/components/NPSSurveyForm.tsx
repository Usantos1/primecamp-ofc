import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Settings, Users } from 'lucide-react';
import { NPSQuestion, NPSSurvey } from '@/hooks/useNPS';
import { useUsers } from '@/hooks/useUsers';
import { MultiSelect } from '@/components/ui/multi-select';

interface NPSSurveyFormProps {
  survey?: NPSSurvey;
  onSubmit: (data: Omit<NPSSurvey, 'id' | 'created_at' | 'updated_at'>) => void | Promise<void>;
  trigger: React.ReactNode;
}

export const NPSSurveyForm: React.FC<NPSSurveyFormProps> = ({ survey, onSubmit, trigger }) => {
  const [open, setOpen] = useState(false);
  const { users } = useUsers();
  const [formData, setFormData] = useState({
    title: survey?.title || '',
    description: survey?.description || '',
    questions: (survey?.questions || []) as NPSQuestion[],
    is_active: survey?.is_active ?? true,
    created_by: survey?.created_by || '',
    allowed_respondents: survey?.allowed_respondents || [] as string[],
    target_employees: survey?.target_employees || [] as string[]
  });

  // Sincronizar formulário ao abrir o modal (criar ou editar)
  useEffect(() => {
    if (open) {
      setFormData({
        title: survey?.title || '',
        description: survey?.description || '',
        questions: Array.isArray(survey?.questions) ? [...survey.questions] : [],
        is_active: survey?.is_active ?? true,
        created_by: survey?.created_by || '',
        allowed_respondents: Array.isArray(survey?.allowed_respondents) ? [...survey.allowed_respondents] : [],
        target_employees: Array.isArray(survey?.target_employees) ? [...survey.target_employees] : []
      });
    }
  }, [open, survey]);

  const userOptions = users.map(user => ({
    label: user.display_name,
    value: user.id
  }));

  const addQuestion = () => {
    const newQuestion: NPSQuestion = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'scale',
      question: '',
      required: true,
      scale_min: 1,
      scale_max: 5,
      scale_labels: { min: 'Muito ruim', max: 'Excelente' }
    };
    
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }));
  };

  const removeQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(formData);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {survey ? 'Editar' : 'Criar'} Pesquisa NPS
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, is_active: checked as boolean }))
                }
              />
              <Label htmlFor="is_active">Pesquisa ativa</Label>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Quem pode responder
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MultiSelect
                  options={userOptions}
                  selected={formData.allowed_respondents}
                  onChange={(values) => setFormData(prev => ({ ...prev, allowed_respondents: values }))}
                  placeholder="Selecione colaboradores..."
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Deixe vazio para permitir que todos respondam
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Sobre quem é a pesquisa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MultiSelect
                  options={userOptions}
                  selected={formData.target_employees}
                  onChange={(values) => setFormData(prev => ({ ...prev, target_employees: values }))}
                  placeholder="Selecione colaboradores..."
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Para pesquisas de avaliação de colaboradores
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Perguntas</h3>
              <Button type="button" onClick={addQuestion} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Pergunta
              </Button>
            </div>
            
            {formData.questions.map((question, index) => (
              <Card key={question.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Pergunta {index + 1}</CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestion(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Pergunta</Label>
                      <Input
                        value={question.question}
                        onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                        placeholder="Digite a pergunta..."
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={question.type}
                        onValueChange={(value) => updateQuestion(index, 'type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scale">Escala Numérica</SelectItem>
                          <SelectItem value="rating">Avaliação (Estrelas)</SelectItem>
                          <SelectItem value="text">Texto Livre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {question.type === 'scale' && (
                    <div className="grid grid-cols-4 gap-4">
                       <div className="space-y-2">
                         <Label>Mín</Label>
                         <Input
                           type="number"
                           value={question.scale_min || 1}
                           onChange={(e) => updateQuestion(index, 'scale_min', parseInt(e.target.value))}
                         />
                       </div>
                       <div className="space-y-2">
                         <Label>Máx</Label>
                         <Input
                           type="number"
                           value={question.scale_max || 5}
                           onChange={(e) => updateQuestion(index, 'scale_max', parseInt(e.target.value))}
                         />
                       </div>
                      <div className="space-y-2">
                        <Label>Label Mín</Label>
                        <Input
                          value={question.scale_labels?.min || ''}
                          onChange={(e) => updateQuestion(index, 'scale_labels', { 
                            ...question.scale_labels, 
                            min: e.target.value 
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Label Máx</Label>
                        <Input
                          value={question.scale_labels?.max || ''}
                          onChange={(e) => updateQuestion(index, 'scale_labels', { 
                            ...question.scale_labels, 
                            max: e.target.value 
                          })}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={question.required}
                      onCheckedChange={(checked) => updateQuestion(index, 'required', checked)}
                    />
                    <Label>Pergunta obrigatória</Label>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : (survey ? 'Atualizar' : 'Criar') + ' Pesquisa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};