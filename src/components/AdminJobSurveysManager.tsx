import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Eye, Edit, Trash2, ExternalLink, Download, Search, Copy, Clock, MapPin, DollarSign, Users, Briefcase, Star, Filter, UserX, Calendar, BarChart3, TrendingUp, Brain, Video, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ModernSwitch } from '@/components/ui/modern-switch';
import { ResponseModal } from '@/components/ResponseModal';
import { CandidateEvaluationModal } from '@/components/CandidateEvaluationModal';
import { DraftPreviewModal } from '@/components/DraftPreviewModal';
import { AIAnalysisModal } from '@/components/AIAnalysisModal';
import { useCandidateEvaluations } from '@/hooks/useCandidateEvaluations';
import { useJobSurveyStats } from '@/hooks/useJobSurveys';

interface JobSurvey {
  id: string;
  title: string;
  description: string;
  position_title: string;
  department: string;
  slug: string;
  is_active: boolean;
  questions: any[];
  created_at: string;
  created_by: string;
  salary_range?: string;
  contract_type?: string;
  location?: string;
  benefits?: string[];
  requirements?: string[];
  company_logo?: string;
  company_name?: string;
  work_schedule?: string;
  work_modality?: string;
  work_days?: string[];
  daily_schedule?: { [key: string]: { start: string; end: string } };
  lunch_break?: string;
  weekly_hours?: number;
  salary_min?: number;
  salary_max?: number;
  has_commission?: boolean;
  commission_details?: string;
  published_at?: string | null;
  expires_at?: string | null;
}

interface JobResponse {
  id: string;
  survey_id: string;
  name: string;
  email: string;
  phone?: string;
  age?: number;
  whatsapp?: string;
  address?: string;
  cep?: string;
  instagram?: string;
  linkedin?: string;
  responses: any;
  created_at: string;
}

interface Question {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number';
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
}

export const AdminJobSurveysManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<JobSurvey | null>(null);
  const [editingSurvey, setEditingSurvey] = useState<JobSurvey | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<JobResponse | null>(null);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [candidateSearchTerm, setCandidateSearchTerm] = useState('');
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [draftSearchTerm, setDraftSearchTerm] = useState('');
  const [showAIAnalysisModal, setShowAIAnalysisModal] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [iaProvider, setIaProvider] = useState<'openai'>('openai');
  const [iaApiKey, setIaApiKey] = useState<string>('');
  const [iaModel, setIaModel] = useState<string>('gpt-4.1-mini');

  // carrega API key e modelo de integrações (kv_store)
  useEffect(() => {
    const loadIntegrationKey = async () => {
      try {
        const { data, error } = await supabase
          .from('kv_store_2c4defad')
          .select('*')
          .eq('key', 'integration_settings')
          .maybeSingle();

        if (error) {
          console.error('Erro ao buscar integração IA:', error);
          return;
        }
        
        const value = (data as any)?.value;
        console.log('Configurações de IA carregadas:', {
          hasApiKey: !!value?.aiApiKey,
          apiKeyLength: value?.aiApiKey?.length || 0,
          provider: value?.aiProvider,
          model: value?.aiModel
        });
        
        if (value?.aiApiKey) {
          setIaApiKey(value.aiApiKey);
        }
        if (value?.aiProvider === 'openai') {
          setIaProvider('openai');
        }
        if (value?.aiModel) {
          setIaModel(value.aiModel);
        }
      } catch (err) {
        console.error('Erro ao carregar integração IA:', err);
      }
    };

    loadIntegrationKey();
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    position_title: '',
    department: '',
    slug: '',
    company_name: '',
    location: '',
    work_schedule: '',
    work_modality: 'presencial',
    work_days: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'],
    daily_schedule: {
      'Segunda': { start: '08:00', end: '18:00' },
      'Terça': { start: '08:00', end: '18:00' },
      'Quarta': { start: '08:00', end: '18:00' },
      'Quinta': { start: '08:00', end: '18:00' },
      'Sexta': { start: '08:00', end: '18:00' }
    } as { [key: string]: { start: string; end: string } },
    lunch_break: '12:00 às 13:00',
    weekly_hours: 40,
    contract_type: 'CLT',
    salary_range: '',
    salary_min: 0,
    salary_max: 0,
    has_commission: false,
    commission_details: '',
    requirements: [] as string[],
    benefits: ['Vale Alimentação', 'Vale Transporte', 'Plano de Saúde'],
    questions: [] as Question[],
    published_at: '',
    expires_at: ''
  });

  // Fetch job surveys
  const { data: surveys = [], isLoading: loadingSurveys } = useQuery({
    queryKey: ['admin-job-surveys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_surveys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        work_days: Array.isArray(item.work_days) ? item.work_days as string[] : [],
        daily_schedule: typeof item.daily_schedule === 'object' && item.daily_schedule !== null ? 
          item.daily_schedule as { [key: string]: { start: string; end: string } } : {},
        benefits: Array.isArray(item.benefits) ? item.benefits as string[] : [],
        requirements: Array.isArray(item.requirements) ? item.requirements as string[] : [],
        // novo: perguntas dinâmicas geradas por IA
        dynamic_questions: Array.isArray((item as any).dynamic_questions) ? (item as any).dynamic_questions : []
      })) as JobSurvey[];
    }
  });

  // Fetch responses for selected survey
  const { data: responses = [], isLoading: loadingResponses } = useQuery({
    queryKey: ['job-responses', selectedSurvey?.id],
    queryFn: async () => {
      if (!selectedSurvey?.id) return [];
      
      const { data, error } = await supabase
        .from('job_responses')
        .select('*')
        .eq('survey_id', selectedSurvey.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as JobResponse[];
    },
    enabled: !!selectedSurvey?.id
  });

  // Fetch drafts (leads parciais) for selected survey
  const { data: drafts = [], isLoading: loadingDrafts } = useQuery({
    queryKey: ['job-drafts', selectedSurvey?.id],
    queryFn: async () => {
      if (!selectedSurvey?.id) return [];
      
      const { data, error } = await supabase
        .from('job_application_drafts')
        .select('*')
        .eq('survey_id', selectedSurvey.id)
        .order('last_saved_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSurvey?.id
  });

  // Fetch AI analysis for responses
  const { data: aiAnalyses = [] } = useQuery({
    queryKey: ['aiAnalyses', selectedSurvey?.id],
    queryFn: async () => {
      if (!selectedSurvey?.id) return [];
      
      const { data, error } = await supabase
        .from('job_candidate_ai_analysis')
        .select('*')
        .eq('survey_id', selectedSurvey.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSurvey?.id
  });

  // Helper para buscar análise de um candidato
  const getAIAnalysis = (responseId: string) => {
    return aiAnalyses.find((a: any) => a.job_response_id === responseId);
  };

  const generateJobAssets = async () => {
    if (!iaApiKey || iaApiKey.trim() === '') {
      toast({
        title: "API Key não configurada",
        description: "Configure a API Key da OpenAI em Integrações > OpenAI.",
        variant: "destructive"
      });
      return;
    }

    try {
      setGeneratingQuestions(true);
      console.log('Chamando generate-job-assets com:', {
        hasTitle: !!formData.title,
        hasPosition: !!formData.position_title,
        hasApiKey: !!iaApiKey,
        apiKeyLength: iaApiKey?.length || 0,
        model: iaModel
      });

      const { data, error } = await supabase.functions.invoke('generate-job-assets', {
        body: {
          job: {
            title: formData.title,
            position_title: formData.position_title,
            description: formData.description,
            department: formData.department,
            company_name: formData.company_name,
            location: formData.location,
            requirements: formData.requirements,
            benefits: formData.benefits,
            work_modality: formData.work_modality,
            work_schedule: formData.work_schedule,
            work_days: formData.work_days,
            daily_schedule: formData.daily_schedule,
            lunch_break: formData.lunch_break,
            weekly_hours: formData.weekly_hours,
            contract_type: formData.contract_type,
            salary_range: formData.salary_range,
            salary_min: formData.salary_min,
            salary_max: formData.salary_max,
            has_commission: formData.has_commission,
            commission_details: formData.commission_details
          },
          provider: iaProvider,
          apiKey: iaApiKey.trim(),
          model: iaModel || 'gpt-4o-mini',
          locale: 'pt-BR'
        }
      });

      if (error) {
        console.error('Erro na função Supabase:', error);
        // Se o erro tem uma mensagem mais detalhada, use ela
        const errorMsg = error?.message || JSON.stringify(error);
        throw new Error(`Erro na função: ${errorMsg}`);
      }

      if (data?.error) {
        console.error('Erro retornado pela função:', data.error);
        throw new Error(data.error);
      }
      
      console.log('Resposta da função:', { success: data?.success, hasAssets: !!data?.assets });
      const assets = data?.assets;
      if (!assets) {
        toast({ title: "Nenhum dado gerado", description: "A IA não retornou conteúdo." });
        return;
      }

      setFormData(prev => ({
        ...prev,
        description: assets.description || prev.description,
        requirements: Array.isArray(assets.requirements) ? assets.requirements : prev.requirements,
        work_schedule: assets.work_schedule || prev.work_schedule,
        salary_range: assets.salary_range || prev.salary_range,
        slug: assets.slug_suggestion || prev.slug
      }));

      toast({
        title: "Conteúdo gerado",
        description: "Descrição, requisitos e slug atualizados.",
      });
    } catch (err: any) {
      console.error('Erro ao gerar descrição IA:', err);
      
      // Tentar extrair mensagem de erro mais detalhada
      let errorMessage = "Erro desconhecido. Verifique a API Key em Integrações.";
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.error) {
        if (typeof err.error === 'string') {
          errorMessage = err.error;
        } else if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.error?.error) {
          errorMessage = err.error.error;
        }
      } else if (err?.details) {
        errorMessage = `Erro: ${err.details}`;
      }
      
      // Mensagens mais amigáveis para erros comuns
      if (errorMessage.includes('API key')) {
        errorMessage = "API Key inválida ou não configurada. Verifique em Integrações > OpenAI.";
      } else if (errorMessage.includes('model')) {
        errorMessage = "Modelo não disponível. Tente usar outro modelo em Integrações.";
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
        errorMessage = "Limite de uso da API excedido. Verifique seus créditos na OpenAI.";
      }
      
      toast({
        title: "Erro ao gerar",
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setGeneratingQuestions(false);
    }
  };

  // Use candidate evaluations hook
  const { 
    evaluations, 
    deleteCandidate, 
    getEvaluationByResponseId, 
    refreshEvaluations 
  } = useCandidateEvaluations(selectedSurvey?.id);

  // Fetch analytics for selected survey
  const { data: stats } = useJobSurveyStats(selectedSurvey?.id);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      position_title: '',
      department: '',
      slug: '',
      company_name: '',
      location: '',
      work_schedule: '',
      work_modality: 'presencial',
      work_days: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'],
      daily_schedule: {
        'Segunda': { start: '08:00', end: '18:00' },
        'Terça': { start: '08:00', end: '18:00' },
        'Quarta': { start: '08:00', end: '18:00' },
        'Quinta': { start: '08:00', end: '18:00' },
        'Sexta': { start: '08:00', end: '18:00' }
      } as { [key: string]: { start: string; end: string } },
      lunch_break: '12:00 às 13:00',
      weekly_hours: 40,
      contract_type: 'CLT',
      salary_range: '',
      salary_min: 0,
      salary_max: 0,
      has_commission: false,
      commission_details: '',
      requirements: [],
      benefits: ['Vale Alimentação', 'Vale Transporte', 'Plano de Saúde'],
      questions: [],
      published_at: '',
      expires_at: ''
    });
    setEditingSurvey(null);
  };

  const handleCreateSurvey = async () => {
    if (!user?.id) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { error } = await supabase
        .from('job_surveys')
        .insert({
          title: formData.title,
          description: formData.description,
          position_title: formData.position_title,
          department: formData.department,
          company_name: formData.company_name,
          location: formData.location,
          slug: formData.slug || formData.position_title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          work_schedule: formData.work_schedule,
          work_modality: formData.work_modality,
          work_days: formData.work_days,
          daily_schedule: formData.daily_schedule,
          lunch_break: formData.lunch_break,
          weekly_hours: formData.weekly_hours,
          contract_type: formData.contract_type,
          salary_range: formData.salary_range,
          salary_min: formData.salary_min || null,
          salary_max: formData.salary_max || null,
          has_commission: formData.has_commission,
          commission_details: formData.commission_details,
          requirements: formData.requirements,
          benefits: formData.benefits,
          questions: formData.questions as any,
          is_active: false,
          published_at: formData.published_at ? new Date(formData.published_at).toISOString() : null,
          expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
          created_by: profile.id
        });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Formulário criado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-job-surveys'] });
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao criar formulário:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar formulário",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSurvey = async () => {
    if (!editingSurvey) return;

    try {
      const { error } = await supabase
        .from('job_surveys')
        .update({
          title: formData.title,
          description: formData.description,
          position_title: formData.position_title,
          department: formData.department,
          company_name: formData.company_name,
          location: formData.location,
          slug: formData.slug || formData.position_title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          work_schedule: formData.work_schedule,
          work_modality: formData.work_modality,
          work_days: formData.work_days,
          daily_schedule: formData.daily_schedule,
          lunch_break: formData.lunch_break,
          weekly_hours: formData.weekly_hours,
          contract_type: formData.contract_type,
          salary_range: formData.salary_range,
          salary_min: formData.salary_min || null,
          salary_max: formData.salary_max || null,
          has_commission: formData.has_commission,
          commission_details: formData.commission_details,
          requirements: formData.requirements,
          benefits: formData.benefits,
          questions: formData.questions as any,
          published_at: formData.published_at ? new Date(formData.published_at).toISOString() : null,
          expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null
        })
        .eq('id', editingSurvey.id);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Formulário atualizado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-job-surveys'] });
      setEditingSurvey(null);
      resetForm();
    } catch (error) {
      console.error('Erro ao atualizar formulário:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar formulário",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSurvey = async (surveyId: string) => {
    try {
      await supabase
        .from('job_responses')
        .delete()
        .eq('survey_id', surveyId);

      const { error } = await supabase
        .from('job_surveys')
        .delete()
        .eq('id', surveyId);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Formulário excluído com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-job-surveys'] });
    } catch (error) {
      console.error('Erro ao excluir formulário:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir formulário",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (surveyId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('job_surveys')
        .update({ is_active: isActive })
        .eq('id', surveyId);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: `Formulário ${isActive ? 'ativado' : 'desativado'} com sucesso!`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-job-surveys'] });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive",
      });
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      type: 'text',
      title: '',
      required: false
    };
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }));
  };

  const moveQuestion = (from: number, to: number) => {
    setFormData(prev => {
      const list = [...prev.questions];
      if (to < 0 || to >= list.length) return prev;
      const [item] = list.splice(from, 1);
      list.splice(to, 0, item);
      return { ...prev, questions: list };
    });
  };

  const removeQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const generateQuestionsAI = async () => {
    if (!iaApiKey || iaApiKey.trim() === '') {
      toast({
        title: "API Key não configurada",
        description: "Configure a API Key da OpenAI em Integrações > OpenAI.",
        variant: "destructive"
      });
      return;
    }

    try {
      setGeneratingQuestions(true);
      const { data, error } = await supabase.functions.invoke('generate-dynamic-questions', {
        body: {
          survey: {
            id: formData.id,
            title: formData.title,
            position_title: formData.position_title,
            description: formData.description,
            department: formData.department,
            requirements: formData.requirements,
            work_modality: formData.work_modality,
            contract_type: formData.contract_type,
            seniority: (formData as any).seniority
          },
          base_questions: formData.questions || [],
          provider: iaProvider,
          apiKey: iaApiKey.trim(),
          model: iaModel || 'gpt-4o-mini'
        }
      });

      if (error) {
        console.error('Erro na função:', error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }
      const generated = Array.isArray(data?.dynamic_questions) ? data.dynamic_questions : [];
      if (!generated.length) {
        toast({ title: "Nenhuma pergunta gerada", description: "A IA não retornou novas perguntas." });
        return;
      }

      const mapped = generated.map((q: any, idx: number) => ({
        id: q.id || `ia-${Date.now()}-${idx}`,
        title: q.title || q.question || 'Pergunta gerada',
        description: q.description || 'Pergunta sugerida pela IA',
        type: q.type || 'textarea',
        required: typeof q.required === 'boolean' ? q.required : true,
        options: q.options || []
      })) as Question[];

      setFormData(prev => ({
        ...prev,
        questions: [...prev.questions, ...mapped]
      }));

      toast({
        title: "Perguntas geradas",
        description: `${mapped.length} perguntas de IA foram adicionadas ao formulário.`,
      });
    } catch (err: any) {
      console.error('Erro ao gerar perguntas IA:', err);
      const errorMessage = err?.message || err?.error || "Erro desconhecido. Verifique a API Key em Integrações.";
      toast({
        title: "Erro ao gerar perguntas",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const duplicateSurvey = async (survey: JobSurvey) => {
    if (!user?.id) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { error } = await supabase
        .from('job_surveys')
        .insert({
          title: `Cópia de ${survey.title}`,
          description: survey.description,
          position_title: survey.position_title,
          department: survey.department,
          company_name: survey.company_name,
          location: survey.location,
          slug: `${(survey.slug || survey.position_title).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now().toString(36)}`,
          work_schedule: survey.work_schedule,
          work_modality: survey.work_modality,
          work_days: survey.work_days,
          daily_schedule: survey.daily_schedule,
          lunch_break: survey.lunch_break,
          weekly_hours: survey.weekly_hours,
          contract_type: survey.contract_type,
          salary_range: survey.salary_range,
          salary_min: survey.salary_min,
          salary_max: survey.salary_max,
          has_commission: survey.has_commission,
          commission_details: survey.commission_details,
          requirements: survey.requirements,
          benefits: survey.benefits,
          questions: survey.questions,
          is_active: false,
          created_by: profile.id
        });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Vaga duplicada com sucesso! A nova vaga está inativa.",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-job-surveys'] });
    } catch (error) {
      console.error('Erro ao duplicar vaga:', error);
      toast({
        title: "Erro",
        description: "Erro ao duplicar vaga",
        variant: "destructive",
      });
    }
  };

  const copyPublicLink = (survey: JobSurvey) => {
    const link = `${window.location.origin}/vaga/${survey.slug}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "O link público foi copiado para a área de transferência.",
    });
  };

  const exportResponses = () => {
    if (!selectedSurvey || responses.length === 0) return;

    const headers = ['Nome', 'Email', 'Telefone', 'Idade', 'CEP', 'Data de Resposta'];
    const questionTitles = selectedSurvey.questions.map((q: any) => q.title);
    const csvHeaders = [...headers, ...questionTitles];

    const csvData = responses.map(response => {
      const basicData = [
        response.name,
        response.email,
        response.phone || '',
        response.age || '',
        response.cep || '',
        format(new Date(response.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
      ];

      const questionResponses = selectedSurvey.questions.map((q: any) => {
        const answer = response.responses[q.id];
        return Array.isArray(answer) ? answer.join(', ') : (answer || '');
      });

      return [...basicData, ...questionResponses];
    });

    const csv = [csvHeaders, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `respostas-${selectedSurvey.position_title}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    
    toast({
      title: "Sucesso!",
      description: "Respostas exportadas com sucesso!",
    });
  };

  const filteredSurveys = surveys.filter(survey =>
    survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    survey.position_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEditDialog = (survey: JobSurvey) => {
    setEditingSurvey(survey);
    setFormData({
      title: survey.title,
      description: survey.description || '',
      position_title: survey.position_title,
      department: survey.department || '',
      slug: survey.slug || '',
      company_name: survey.company_name || '',
      location: survey.location || '',
      work_schedule: survey.work_schedule || '',
      work_modality: survey.work_modality || 'presencial',
      work_days: survey.work_days || ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'],
      daily_schedule: survey.daily_schedule || {
        'Segunda': { start: '08:00', end: '18:00' },
        'Terça': { start: '08:00', end: '18:00' },
        'Quarta': { start: '08:00', end: '18:00' },
        'Quinta': { start: '08:00', end: '18:00' },
        'Sexta': { start: '08:00', end: '18:00' }
      } as { [key: string]: { start: string; end: string } },
        lunch_break: survey.lunch_break || '12:00 às 13:00',
        weekly_hours: survey.weekly_hours || 40,
        contract_type: survey.contract_type || 'CLT',
        salary_range: survey.salary_range || '',
        salary_min: survey.salary_min || 0,
        salary_max: survey.salary_max || 0,
        has_commission: survey.has_commission || false,
        commission_details: survey.commission_details || '',
          requirements: survey.requirements || [],
          benefits: survey.benefits || [],
          questions: survey.questions,
          published_at: survey.published_at ? format(new Date(survey.published_at), "yyyy-MM-dd'T'HH:mm") : '',
          expires_at: survey.expires_at ? format(new Date(survey.expires_at), "yyyy-MM-dd'T'HH:mm") : ''
    });
  };

  const handleDayChange = (day: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        work_days: [...prev.work_days, day],
        daily_schedule: {
          ...prev.daily_schedule,
          [day]: { start: '08:00', end: '18:00' }
        } as { [key: string]: { start: string; end: string } }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        work_days: prev.work_days.filter(d => d !== day),
        daily_schedule: Object.fromEntries(
          Object.entries(prev.daily_schedule).filter(([key]) => key !== day)
        ) as { [key: string]: { start: string; end: string } }
      }));
    }
  };

  const handleScheduleChange = (day: string, field: 'start' | 'end', value: string) => {
    setFormData(prev => ({
      ...prev,
      daily_schedule: {
        ...prev.daily_schedule,
        [day]: {
          ...prev.daily_schedule[day],
          [field]: value
        }
      }
    }));
  };

  // Filter and search logic for candidates
  const filteredResponses = responses.filter(response => {
    const matchesSearch = response.name.toLowerCase().includes(candidateSearchTerm.toLowerCase()) ||
                         response.email.toLowerCase().includes(candidateSearchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    
    const evaluation = getEvaluationByResponseId(response.id);
    const candidateStatus = evaluation?.status || 'pending';
    
    return matchesSearch && candidateStatus === statusFilter;
  });

  const handleDeleteCandidate = async (candidateId: string) => {
    const success = await deleteCandidate(candidateId);
    if (success) {
      queryClient.invalidateQueries({ queryKey: ['job-responses'] });
    }
  };

  const handleEvaluationSaved = () => {
    refreshEvaluations();
    queryClient.invalidateQueries({ queryKey: ['job-responses'] });
  };

  /**
   * NOVO getStatusBadge – aplica cores de FUNDO (com opacidade), texto e um aro leve.
   * Uso variant="secondary" para não forçar o fundo sólido do shadcn e permitir as classes abaixo.
   */
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending:   'bg-gray-500/15 text-gray-300 ring-1 ring-gray-400/20',
      analyzing: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30',
      qualified: 'bg-green-500/15 text-green-300 ring-1 ring-green-500/30',
      interview: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30',
      approved:  'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
      rejected:  'bg-red-500/15 text-red-300 ring-1 ring-red-500/30',
    };

    const labels: Record<string, string> = {
      pending: 'Pendente',
      analyzing: 'Analisando',
      qualified: 'Qualificado',
      interview: 'Entrevista',
      approved: 'Aprovado',
      rejected: 'Rejeitado',
    };

    const cls = styles[status] ?? styles.pending;
    const label = labels[status] ?? labels.pending;

    return (
      <Badge variant="secondary" className={`px-2 py-0.5 rounded-full ${cls}`}>
        {label}
      </Badge>
    );
  };

  const renderStarRating = (rating?: number) => {
    if (!rating) return <span className="text-muted-foreground">-</span>;
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-muted-foreground">{rating}/5</span>
      </div>
    );
  };

  const statusCounts = {
    total: responses.length,
    pending: evaluations.filter(e => e.status === 'pending').length + (responses.length - evaluations.length),
    analyzing: evaluations.filter(e => e.status === 'analyzing').length,
    qualified: evaluations.filter(e => e.status === 'qualified').length,
    interview: evaluations.filter(e => e.status === 'interview').length,
    approved: evaluations.filter(e => e.status === 'approved').length,
    rejected: evaluations.filter(e => e.status === 'rejected').length
  };

  if (selectedSurvey) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setSelectedSurvey(null)}
            >
              ← Voltar à Lista
            </Button>
            
            {/* Status Summary */}
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Candidatos:</span>
              <Badge variant="outline">{statusCounts.total} Total</Badge>
              <Badge variant="secondary">{statusCounts.pending} Pendentes</Badge>
              <Badge variant="secondary">{statusCounts.analyzing} Analisando</Badge>
              <Badge variant="secondary">{statusCounts.qualified} Qualificados</Badge>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => copyPublicLink(selectedSurvey)}
              className="hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Copiar Link Público
            </Button>
            <Button
              variant="outline"
              onClick={exportResponses}
              disabled={responses.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar Respostas
            </Button>
          </div>
        </div>

        {/* Analytics Card */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total de Visualizações</p>
                    <p className="text-2xl font-bold">{stats.totalViews}</p>
                  </div>
                  <Eye className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Candidaturas</p>
                    <p className="text-2xl font-bold">{stats.totalApplications}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Taxa de Conversão</p>
                    <p className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Últimos 30 dias</p>
                    <p className="text-2xl font-bold">
                      {Object.values(stats.applicationsByDay).reduce((a, b) => a + b, 0)}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Card de Leads Parciais */}
        {drafts.length > 0 && (
          <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                    <Users className="h-5 w-5" />
                    Leads Parciais ({drafts.length})
                  </CardTitle>
                  <CardDescription>
                    Candidatos que começaram a preencher mas não finalizaram. Contate-os para recuperar!
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Exportar leads parciais
                    const csv = [
                      ['Nome', 'Email', 'Telefone', 'WhatsApp', 'Etapa', 'Última Atualização'].join(','),
                      ...drafts.map((d: any) => [
                        d.name || '',
                        d.email || '',
                        d.phone || '',
                        d.whatsapp || '',
                        d.current_step + 1,
                        format(new Date(d.last_saved_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                      ].join(','))
                    ].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `leads-parciais-${selectedSurvey?.title || 'vaga'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
                    link.click();
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
              <div className="pt-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <Input
                    placeholder="Buscar leads parciais..."
                    value={draftSearchTerm}
                    onChange={(e) => setDraftSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {drafts
                  .filter((draft: any) => {
                    if (!draftSearchTerm) return true;
                    const search = draftSearchTerm.toLowerCase();
                    return (
                      draft.name?.toLowerCase().includes(search) ||
                      draft.email?.toLowerCase().includes(search) ||
                      draft.phone?.includes(search) ||
                      draft.whatsapp?.includes(search)
                    );
                  })
                  .map((draft: any) => (
                    <div
                      key={draft.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-gray-800 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {draft.name || 'Sem nome'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            Etapa {draft.current_step + 1}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                          {draft.email && !draft.email.includes('@temp.primecamp') && (
                            <span className="truncate">{draft.email}</span>
                          )}
                          {draft.phone && <span>📞 {draft.phone}</span>}
                          {draft.whatsapp && <span>💬 {draft.whatsapp}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Última atualização: {format(new Date(draft.last_saved_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDraft(draft);
                            setShowDraftModal(true);
                          }}
                          className="hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        {draft.whatsapp && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`https://wa.me/55${draft.whatsapp.replace(/\D/g, '')}`, '_blank')}
                            className="text-green-600 hover:text-green-700"
                          >
                            WhatsApp
                          </Button>
                        )}
                        {draft.phone && !draft.whatsapp && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`tel:${draft.phone.replace(/\D/g, '')}`, '_blank')}
                          >
                            Ligar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedSurvey.title}
              <Badge variant={selectedSurvey.is_active ? "secondary" : "secondary"}>
                {selectedSurvey.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Vaga: {selectedSurvey.position_title} | {filteredResponses.length} candidato(s) completo(s) {candidateSearchTerm || statusFilter !== 'all' ? 'filtrado(s)' : ''}
              {drafts.length > 0 && (
                <span className="ml-2 text-orange-600 dark:text-orange-400 font-medium">
                  • {drafts.length} lead(s) parcial(is)
                </span>
              )}
            </CardDescription>
            
            {/* Filters */}
            <div className="flex items-center gap-4 pt-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <Input
                  placeholder="Buscar candidatos..."
                  value={candidateSearchTerm}
                  onChange={(e) => setCandidateSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="analyzing">Analisando</SelectItem>
                    <SelectItem value="qualified">Qualificados</SelectItem>
                    <SelectItem value="interview">Entrevista</SelectItem>
                    <SelectItem value="approved">Aprovados</SelectItem>
                    <SelectItem value="rejected">Rejeitados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidato</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Avaliação</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingResponses ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredResponses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6">
                        {candidateSearchTerm || statusFilter !== 'all' 
                          ? 'Nenhum candidato encontrado com os filtros aplicados' 
                          : 'Nenhuma resposta encontrada'
                        }
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredResponses.map((response) => {
                      const evaluation = getEvaluationByResponseId(response.id);
                      const status = evaluation?.status || 'pending';
                      
                      return (
                        <TableRow key={response.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{response.name}</div>
                              {response.age && (
                                <div className="text-sm text-muted-foreground">{response.age} anos</div>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">{response.email}</div>
                              {response.phone && (
                                <div className="text-sm text-muted-foreground">{response.phone}</div>
                              )}
                              {response.cep && (
                                <div className="text-sm text-muted-foreground">CEP: {response.cep}</div>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(status)}
                              {getAIAnalysis(response.id) && (
                                <Badge 
                                  variant="outline" 
                                  className="cursor-pointer hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-900/20 bg-purple-50/50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800"
                                  onClick={() => {
                                    setSelectedResponse(response);
                                    setShowAIAnalysisModal(true);
                                  }}
                                >
                                  <Brain className="h-3 w-3 mr-1" />
                                  IA
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            {renderStarRating(evaluation?.rating)}
                          </TableCell>
                          
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(response.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                            </div>
                          </TableCell>
                          
                          <TableCell className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={async () => {
                                  try {
                                    // Criar entrevista online para este candidato
                                    const { data: newInterview, error: createError } = await supabase
                                      .from('job_interviews')
                                      .insert({
                                        job_response_id: response.id,
                                        survey_id: response.survey_id,
                                        interview_type: 'online',
                                        status: 'scheduled',
                                        questions: []
                                      })
                                      .select()
                                      .single();

                                    if (createError) {
                                      // Se já existe, buscar a existente
                                      const { data: existing } = await supabase
                                        .from('job_interviews')
                                        .select('*')
                                        .eq('job_response_id', response.id)
                                        .eq('interview_type', 'online')
                                        .maybeSingle();

                                      if (existing) {
                                        // Navegar para página de entrevista
                                        window.location.href = `/admin/interviews?interview_id=${existing.id}`;
                                      } else {
                                        throw createError;
                                      }
                                    } else {
                                      // Navegar para página de entrevista
                                      window.location.href = `/admin/interviews?interview_id=${newInterview.id}`;
                                    }
                                  } catch (error: any) {
                                    toast({
                                      title: "Erro",
                                      description: error.message || "Não foi possível criar entrevista.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                className="hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900/20"
                              >
                                <Video className="h-4 w-4 mr-1" />
                                Criar Entrevista
                              </Button>

                              {getAIAnalysis(response.id) ? (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedResponse(response);
                                    setShowAIAnalysisModal(true);
                                  }}
                                  className="hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-900/20 bg-purple-50/50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800"
                                >
                                  <Brain className="h-4 w-4 mr-1" />
                                  Ver IA
                                </Button>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      toast({
                                        title: "Gerando análise...",
                                        description: "Aguarde enquanto analisamos o candidato com IA.",
                                      });
                                      
                                      // Buscar dados completos do candidato
                                      const { data: jobResponse } = await supabase
                                        .from('job_responses')
                                        .select('*')
                                        .eq('id', response.id)
                                        .single();

                                      const { data: jobSurvey } = await supabase
                                        .from('job_surveys')
                                        .select('*')
                                        .eq('id', response.survey_id)
                                        .single();

                                      if (!jobResponse || !jobSurvey) {
                                        toast({
                                          title: "Erro",
                                          description: "Dados do candidato ou vaga não encontrados.",
                                          variant: "destructive",
                                        });
                                        return;
                                      }

                                      // Buscar resultado do DISC se existir
                                      const { data: discResult } = await supabase
                                        .from('candidate_responses')
                                        .select('*')
                                        .eq('whatsapp', jobResponse.whatsapp || jobResponse.phone || '')
                                        .eq('is_completed', true)
                                        .order('created_at', { ascending: false })
                                        .maybeSingle();

                                      // Chamar análise com OpenAI
                                      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-candidate', {
                                        body: {
                                          job_response_id: response.id,
                                          survey_id: response.survey_id,
                                          candidate_data: {
                                            name: jobResponse.name,
                                            email: jobResponse.email,
                                            age: jobResponse.age,
                                            phone: jobResponse.phone || jobResponse.whatsapp,
                                            responses: jobResponse.responses,
                                            disc_profile: discResult ? {
                                              d_score: discResult.d_score || 0,
                                              i_score: discResult.i_score || 0,
                                              s_score: discResult.s_score || 0,
                                              c_score: discResult.c_score || 0,
                                              dominant_profile: discResult.dominant_profile || ''
                                            } : undefined
                                          },
                                          job_data: {
                                            title: jobSurvey.title,
                                            position_title: jobSurvey.position_title,
                                            description: jobSurvey.description,
                                            requirements: jobSurvey.requirements,
                                            work_modality: jobSurvey.work_modality,
                                            contract_type: jobSurvey.contract_type
                                          }
                                        }
                                      });

                                      if (analysisError) {
                                        console.error('Erro na análise:', analysisError);
                                        toast({
                                          title: "Erro ao gerar análise",
                                          description: analysisError.message || "Não foi possível gerar a análise.",
                                          variant: "destructive",
                                        });
                                      } else {
                                        toast({
                                          title: "Análise gerada!",
                                          description: "A análise de IA foi criada com sucesso.",
                                        });
                                        // Recarregar análises
                                        queryClient.invalidateQueries({ queryKey: ['aiAnalyses', selectedSurvey?.id] });
                                        // Abrir modal com a análise
                                        setSelectedResponse(response);
                                        setTimeout(() => {
                                          setShowAIAnalysisModal(true);
                                        }, 500);
                                      }
                                    } catch (error: any) {
                                      console.error('Erro ao processar análise:', error);
                                      toast({
                                        title: "Erro",
                                        description: error.message || "Erro ao gerar análise.",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  className="hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-900/20"
                                >
                                  <Brain className="h-4 w-4 mr-1" />
                                  Analisar IA
                                </Button>
                              )}
                              
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedResponse(response);
                                  setShowEvaluationModal(true);
                                }}
                                className="hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20"
                              >
                                <Star className="h-4 w-4 mr-1" />
                                Avaliar
                              </Button>
                              
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedResponse(response);
                                  setShowResponseModal(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20"
                                  >
                                    <UserX className="h-4 w-4 mr-1" />
                                    Excluir
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. Isso excluirá permanentemente 
                                      o candidato <strong>{response.name}</strong> e todas as suas avaliações.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeleteCandidate(response.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir Candidato
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Modals */}
        <ResponseModal
          isOpen={showResponseModal}
          onClose={() => {
            setShowResponseModal(false);
            setSelectedResponse(null);
          }}
          response={selectedResponse}
          questions={selectedSurvey?.questions || []}
        />
        
        <CandidateEvaluationModal
          isOpen={showEvaluationModal}
          onClose={() => {
            setShowEvaluationModal(false);
            setSelectedResponse(null);
          }}
          candidate={selectedResponse}
          evaluation={selectedResponse ? getEvaluationByResponseId(selectedResponse.id) : null}
          onEvaluationSaved={handleEvaluationSaved}
        />

        <DraftPreviewModal
          isOpen={showDraftModal}
          onClose={() => {
            setShowDraftModal(false);
            setSelectedDraft(null);
          }}
          draft={selectedDraft}
          surveyTitle={selectedSurvey?.title}
          questions={selectedSurvey?.questions || []}
        />

        <AIAnalysisModal
          isOpen={showAIAnalysisModal}
          onClose={() => {
            setShowAIAnalysisModal(false);
            setSelectedResponse(null);
          }}
          analysis={selectedResponse ? getAIAnalysis(selectedResponse.id) : null}
          candidateName={selectedResponse?.name}
        />
      </div>
    );
  }

  const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Formulários de Vaga</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
          <Plus className="h-4 w-4 mr-2" />
          Novo Formulário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Buscar formulários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Dica: as vagas exibem quantas perguntas são base e quantas foram geradas por IA. Use isso para revisar rapidamente o questionário antes de enviar o link.
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSurveys ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p>Carregando formulários...</p>
            </div>
          ) : filteredSurveys.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum formulário encontrado</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredSurveys.map((survey) => (
                <Card key={survey.id} className="border border-border/50 hover:border-border transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold">{survey.title}</h3>
                          <Badge variant={survey.is_active ? "secondary" : "secondary"}>
                            {survey.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Briefcase className="h-4 w-4" />
                            <span>{survey.position_title}</span>
                          </div>
                          {survey.company_name && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="h-4 w-4" />
                              <span>{survey.company_name}</span>
                            </div>
                          )}
                          {survey.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{survey.location}</span>
                            </div>
                          )}
                          {(survey.salary_min || survey.salary_max) && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <DollarSign className="h-4 w-4" />
                              <span>
                                R$ {survey.salary_min?.toLocaleString()} - R$ {survey.salary_max?.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {survey.weekly_hours && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{survey.weekly_hours}h semanais - {survey.work_modality}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-sm text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:gap-3">
                          <div>
                            {survey.questions.length} pergunta(s) base
                            {survey.dynamic_questions?.length ? ` • ${survey.dynamic_questions.length} dinâmicas (IA)` : ''}
                          </div>
                          <div className="flex items-center gap-2 mt-1 sm:mt-0">
                            <Badge variant="outline" className="text-xs">
                              IA ativa
                            </Badge>
                            <span>
                              Criado em {format(new Date(survey.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <ModernSwitch
                          checked={survey.is_active}
                          onCheckedChange={(checked) => handleToggleActive(survey.id, checked)}
                        />
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSurvey(survey)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyPublicLink(survey)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Link
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(survey)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => duplicateSurvey(survey)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Duplicar
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4 mr-1" />
                              Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso excluirá permanentemente o formulário e todas as respostas associadas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteSurvey(survey.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de criação/edição */}
      <Dialog open={isCreateDialogOpen || !!editingSurvey} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setEditingSurvey(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSurvey ? 'Editar Formulário' : 'Criar Novo Formulário'}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações da vaga e configure as perguntas do formulário.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="info" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="schedule">Horários</TabsTrigger>
              <TabsTrigger value="compensation">Remuneração</TabsTrigger>
              <TabsTrigger value="scheduling">Agendamento</TabsTrigger>
              <TabsTrigger value="questions">Perguntas</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              <Card className="p-3 border-dashed">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">IA configurada em Integrações</p>
                    <p className="text-xs text-muted-foreground">A API Key é lida de Integrações &gt; OpenAI. Defina lá para habilitar IA aqui.</p>
                  </div>
                  {!iaApiKey && (
                    <Badge variant="destructive">API Key não configurada</Badge>
                  )}
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título da Vaga *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Desenvolvedor Frontend"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position_title">Cargo *</Label>
                  <Input
                    id="position_title"
                    value={formData.position_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, position_title: e.target.value }))}
                    placeholder="Ex: Desenvolvedor React"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_name">Empresa</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="Nome da empresa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="Ex: Tecnologia"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Localização</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Ex: São Paulo - SP"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="work_modality">Modalidade de Trabalho</Label>
                  <Select value={formData.work_modality} onValueChange={(value) => setFormData(prev => ({ ...prev, work_modality: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="remoto">Remoto</SelectItem>
                      <SelectItem value="hibrido">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva a vaga..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL da Vaga</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="Ex: desenvolvedor-frontend"
                />
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="work_schedule" className="text-base font-medium">Horários de Trabalho</Label>
                  <Textarea
                    id="work_schedule"
                    value={formData.work_schedule || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, work_schedule: e.target.value }))}
                    placeholder="Ex: Segunda a Sexta das 09:00 às 18:00 e Sábado das 09:00 às 13:00"
                    className="min-h-[100px]"
                  />
                  <p className="text-sm text-muted-foreground">
                    Descreva os horários de trabalho de forma clara e detalhada. 
                    Exemplo: "Segunda a Sexta das 08:00 às 17:00 com intervalo para almoço das 12:00 às 13:00. Sábados das 08:00 às 12:00."
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="compensation" className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract_type">Tipo de Contrato</Label>
                  <Select value={formData.contract_type} onValueChange={(value) => setFormData(prev => ({ ...prev, contract_type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLT">CLT</SelectItem>
                      <SelectItem value="PJ">PJ</SelectItem>
                      <SelectItem value="Estagio">Estágio</SelectItem>
                      <SelectItem value="Freelancer">Freelancer</SelectItem>
                      <SelectItem value="Temporario">Temporário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary_range">Faixa Salarial (Texto)</Label>
                  <Input
                    id="salary_range"
                    value={formData.salary_range}
                    onChange={(e) => setFormData(prev => ({ ...prev, salary_range: e.target.value }))}
                    placeholder="Ex: A combinar"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary_min">Salário Mínimo (R$)</Label>
                  <Input
                    id="salary_min"
                    type="number"
                    value={formData.salary_min}
                    onChange={(e) => setFormData(prev => ({ ...prev, salary_min: parseFloat(e.target.value) || 0 }))}
                    placeholder="3000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary_max">Salário Máximo (R$)</Label>
                  <Input
                    id="salary_max"
                    type="number"
                    value={formData.salary_max}
                    onChange={(e) => setFormData(prev => ({ ...prev, salary_max: parseFloat(e.target.value) || 0 }))}
                    placeholder="5000"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_commission"
                    checked={formData.has_commission}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_commission: !!checked }))}
                  />
                  <Label htmlFor="has_commission">Possui comissão/bonificação</Label>
                </div>

                {formData.has_commission && (
                  <div className="space-y-2">
                    <Label htmlFor="commission_details">Detalhes da Comissão</Label>
                    <Textarea
                      id="commission_details"
                      value={formData.commission_details}
                      onChange={(e) => setFormData(prev => ({ ...prev, commission_details: e.target.value }))}
                      placeholder="Descreva como funciona a comissão..."
                      rows={3}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Label>Benefícios</Label>
                <div className="space-y-2">
                  {formData.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={benefit}
                        onChange={(e) => {
                          const newBenefits = [...formData.benefits];
                          newBenefits[index] = e.target.value;
                          setFormData(prev => ({ ...prev, benefits: newBenefits }));
                        }}
                        placeholder="Nome do benefício"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newBenefits = formData.benefits.filter((_, i) => i !== index);
                          setFormData(prev => ({ ...prev, benefits: newBenefits }));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData(prev => ({ ...prev, benefits: [...prev.benefits, ''] }))}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Benefício
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="scheduling" className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Agendamento de Publicação
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure quando a vaga será publicada automaticamente. Deixe em branco para publicar imediatamente.
                  </p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="published_at">Data e Hora de Publicação</Label>
                      <Input
                        id="published_at"
                        type="datetime-local"
                        value={formData.published_at}
                        onChange={(e) => setFormData(prev => ({ ...prev, published_at: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        A vaga será publicada automaticamente nesta data. Se deixar em branco, será publicada imediatamente ao ativar.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expires_at">Data e Hora de Expiração</Label>
                      <Input
                        id="expires_at"
                        type="datetime-local"
                        value={formData.expires_at}
                        onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        A vaga será desativada automaticamente nesta data. Deixe em branco para não expirar.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg bg-primary/5">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Gerar Descrição Completa com IA
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Use a IA para gerar uma descrição completa da vaga baseada em todas as informações preenchidas (horários, remuneração, requisitos, etc.).
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      onClick={generateJobAssets} 
                      disabled={generatingQuestions || !iaApiKey}
                      className="w-full sm:w-auto"
                    >
                      {generatingQuestions ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Gerando descrição...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-2" />
                          Gerar descrição completa com IA
                        </>
                      )}
                    </Button>
                    {!iaApiKey && (
                      <p className="text-xs text-red-500 w-full sm:w-auto">Configure a API key em Integrações &gt; OpenAI.</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="questions" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">Perguntas do Formulário</h3>
                  <p className="text-xs text-muted-foreground">
                    Use IA para gerar/refinar perguntas ou reordene arrastando com os botões de mover.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button 
                    onClick={generateQuestionsAI}
                    variant="outline"
                    disabled={generatingQuestions || !iaApiKey}
                  >
                    {generatingQuestions ? 'Gerando...' : 'Gerar/Refinar com IA'}
                  </Button>
                  {!iaApiKey && (
                    <p className="text-xs text-red-500 w-full sm:w-auto">Configure a API key em Integrações &gt; OpenAI.</p>
                  )}
                  <Button onClick={addQuestion} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Pergunta
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {formData.questions.map((question, index) => (
                  <Card key={question.id} className="p-4">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium">Pergunta {index + 1}</span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={index === 0}
                            onClick={() => moveQuestion(index, index - 1)}
                          >
                            ↑
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={index === formData.questions.length - 1}
                            onClick={() => moveQuestion(index, index + 1)}
                          >
                            ↓
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeQuestion(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Título da Pergunta</Label>
                          <Input
                            value={question.title}
                            onChange={(e) => updateQuestion(index, 'title', e.target.value)}
                            placeholder="Digite a pergunta..."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Tipo de Pergunta</Label>
                          <Select
                            value={question.type}
                            onValueChange={(value) => updateQuestion(index, 'type', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texto</SelectItem>
                              <SelectItem value="textarea">Texto Longo</SelectItem>
                              <SelectItem value="number">Número</SelectItem>
                              <SelectItem value="select">Seleção</SelectItem>
                              <SelectItem value="radio">Múltipla Escolha</SelectItem>
                              <SelectItem value="checkbox">Caixas de Seleção</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Descrição (opcional)</Label>
                        <Input
                          value={question.description || ''}
                          onChange={(e) => updateQuestion(index, 'description', e.target.value)}
                          placeholder="Descrição adicional da pergunta..."
                        />
                      </div>

                      {(question.type === 'select' || question.type === 'radio' || question.type === 'checkbox') && (
                        <div className="space-y-2">
                          <Label>Opções</Label>
                          <div className="space-y-2">
                            {(question.options || []).map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center gap-2">
                                <Input
                                  value={option}
                                  onChange={(e) => {
                                    const newOptions = [...(question.options || [])];
                                    newOptions[optionIndex] = e.target.value;
                                    updateQuestion(index, 'options', newOptions);
                                  }}
                                  placeholder={`Opção ${optionIndex + 1}`}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newOptions = (question.options || []).filter((_, i) => i !== optionIndex);
                                    updateQuestion(index, 'options', newOptions);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newOptions = [...(question.options || []), ''];
                                updateQuestion(index, 'options', newOptions);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Adicionar Opção
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`required-${question.id}`}
                          checked={question.required}
                          onCheckedChange={(checked) => updateQuestion(index, 'required', !!checked)}
                        />
                        <Label htmlFor={`required-${question.id}`}>Pergunta obrigatória</Label>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {generatingQuestions && (
            <div className="mt-4 flex gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <div className="space-y-1">
                <p className="font-medium leading-none">IA trabalhando...</p>
                <p className="text-xs text-muted-foreground">
                  Gerando ou refinando conteúdo. Isso pode levar alguns segundos.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setEditingSurvey(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={editingSurvey ? handleUpdateSurvey : handleCreateSurvey}>
              {editingSurvey ? 'Atualizar' : 'Criar'} Formulário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
