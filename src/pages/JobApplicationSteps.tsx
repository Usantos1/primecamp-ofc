import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useNavigate } from "react-router-dom";
import { from } from '@/integrations/db/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertCircle, CheckCircle, FileText, Send,
  Home, Building, MapPin, DollarSign, Users, Clock,
  Phone, Mail, User, ChevronLeft, ChevronRight, Zap, Award,
  Lock, Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";

/* =======================
   Tema consistente (Claro/Escuro)
   ======================= */
const themeCSS = `
  :root {
    --job-application: 0 0% 99%;
    --job-card: 0 0% 100%;
    --job-card-border: 220 13% 91%;
    --job-text: 222 47% 11%;
    --job-text-muted: 215 16% 47%;
    --job-primary: 358 75% 52%;
    --job-badge: 210 40% 96%;
  }
  .dark {
    --job-application: 222 22% 10%;
    --job-card: 220 13% 18%;
    --job-card-border: 220 13% 28%;
    --job-text: 210 40% 98%;
    --job-text-muted: 215 20% 70%;
    --job-primary: 358 82% 56%;
    --job-badge: 220 13% 22%;
  }
`;

interface JobSurvey {
  id: string;
  title: string;
  description: string;
  position_title: string;
  department: string;
  company_name?: string;
  company_logo?: string;
  location?: string;
  salary_range?: string;
  contract_type?: string;
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
  benefits?: string[];
  requirements?: string[];
  slug: string;
  is_active: boolean;
  questions: Question[];
}

interface Question {
  id: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'radio' | 'checkbox';
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  age: string;
  cep: string;
  address: string;
  whatsapp: string;
  instagram: string;
  linkedin: string;
  responses: Record<string, any>;
}

/* ---------------- helpers de máscara/validação ---------------- */
const onlyDigits = (v: string) => v.replace(/\D/g, "");
const formatBRPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7,11)}`;
};
const isValidBRPhone = (v: string) => {
  const len = onlyDigits(v).length;
  return len === 10 || len === 11;
};
const isValidWhatsApp = (v: string) => onlyDigits(v).length === 11; // 9 dígitos + DDD
const formatCEP = (v: string) => {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0,5)}-${d.slice(5)}`;
};
const isValidCEP = (v: string) => /^\d{5}-?\d{3}$/.test(v);
const isValidEmail = (v: string) => /\S+@\S+\.\S+/.test(v);

export default function JobApplicationSteps() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [survey, setSurvey] = useState<JobSurvey | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dynamicQuestions, setDynamicQuestions] = useState<Question[]>([]);
  const [loadingDynamic, setLoadingDynamic] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [showDiscPrompt, setShowDiscPrompt] = useState(false);
  const [jobResponseId, setJobResponseId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    age: "",
    cep: "",
    address: "",
    whatsapp: "",
    instagram: "",
    linkedin: "",
    responses: {},
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);

  const storageKey = useMemo(() => `jobapp:${slug}`, [slug]);

  // Debounce para autosave (salvar após 2 segundos sem digitar)
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // classes padronizadas para campos
  const fieldClass =
    "h-12 text-base border focus-visible:ring-2 focus-visible:ring-[hsl(var(--job-primary))] text-[hsl(var(--job-text))] placeholder:text-[hsl(var(--job-text-muted))]";
  const fieldStyle: React.CSSProperties = {
    backgroundColor: 'hsl(var(--job-card))',
    borderColor: 'hsl(var(--job-card-border))',
  };

  /* ---------- carregar survey ---------- */
  useEffect(() => {
    fetchSurvey();
  }, [slug]);

  /* ---------- carregar dados salvos do localStorage ao montar ---------- */
  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try { 
        const parsed = JSON.parse(raw);
        setFormData(parsed);
      } catch {}
    }
  }, [storageKey]);

  /* ---------- autosave no localStorage (instantâneo) ---------- */
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(formData));
  }, [formData, storageKey]);

  /* ---------- autosave no backend (com debounce) ---------- */
  const saveDraftToBackend = React.useCallback(async () => {
    if (!survey) return;

    // Salva mesmo sem email completo - qualquer dado é valioso!
    // Se tiver nome OU telefone OU whatsapp, já salva
    const hasAnyContact = formData.name?.trim() || 
                         formData.phone?.trim() || 
                         formData.whatsapp?.trim() || 
                         formData.email?.trim();

    if (!hasAnyContact) return; // Só salva se tiver algum dado de contato

    // Limpar timeout anterior
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Aguardar 2 segundos sem digitar antes de salvar
    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        // Usar email se tiver, senão usar um placeholder baseado no telefone/whatsapp
        const emailToSave = formData.email?.trim().toLowerCase() || 
                           `lead_${formData.phone?.replace(/\D/g, '') || formData.whatsapp?.replace(/\D/g, '') || Date.now()}@temp.primecamp`;

        const { data, error } = await supabase.functions.invoke('job-application-save-draft', {
          body: {
            survey_id: survey.id,
            email: emailToSave,
            name: formData.name?.trim() || null,
            phone: formData.phone?.trim() || null,
            age: formData.age ? parseInt(formData.age) : null,
            cep: formData.cep?.trim() || null,
            address: formData.address?.trim() || null,
            whatsapp: formData.whatsapp?.trim() || null,
            instagram: formData.instagram?.trim() || null,
            linkedin: formData.linkedin?.trim() || null,
            responses: formData.responses || {},
            current_step: currentStep,
            form_data: formData
          }
        });

        if (error) throw error;

        if (data?.draft_id) {
          setDraftId(data.draft_id);
          setLastSaved(new Date());
        }
      } catch (error) {
        console.error('Erro ao salvar rascunho:', error);
        // Não mostrar erro para o usuário, apenas logar
      } finally {
        setSaving(false);
      }
    }, 2000);
  }, [survey, formData, currentStep]);

  // Salvar no backend quando formData ou currentStep mudar (salva qualquer dado de contato)
  useEffect(() => {
    const hasAnyContact = formData.name?.trim() || 
                         formData.phone?.trim() || 
                         formData.whatsapp?.trim() || 
                         formData.email?.trim();

    if (hasAnyContact && survey) {
      saveDraftToBackend();
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, currentStep, saveDraftToBackend]);

  /* ---------- recuperar draft do backend após survey carregar ---------- */
  useEffect(() => {
    const loadDraft = async () => {
      if (!survey) return;

      // Primeiro tenta carregar do localStorage (mais rápido)
      const localData = localStorage.getItem(storageKey);
      let parsed: any = null;
      
      if (localData) {
        try {
          parsed = JSON.parse(localData);
        } catch (e) {
          console.error('Erro ao parsear localStorage:', e);
        }
      }

      // Se tem email no localStorage, tenta buscar do backend
      if (parsed?.email) {
        try {
          const { data: backendDraft, error } = await supabase
            .from('job_application_drafts')
            .select('*')
            .execute().eq('survey_id', survey.id)
            .eq('email', parsed.email.trim().toLowerCase())
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            console.error('Erro ao buscar draft:', error);
          }

          if (backendDraft) {
            // Mesclar dados: backend tem prioridade
            const mergedData = {
              name: backendDraft.name || parsed.name || '',
              email: backendDraft.email || parsed.email || '',
              phone: backendDraft.phone || parsed.phone || '',
              age: backendDraft.age?.toString() || parsed.age || '',
              cep: backendDraft.cep || parsed.cep || '',
              address: backendDraft.address || parsed.address || '',
              whatsapp: backendDraft.whatsapp || parsed.whatsapp || '',
              instagram: backendDraft.instagram || parsed.instagram || '',
              linkedin: backendDraft.linkedin || parsed.linkedin || '',
              responses: { ...parsed.responses, ...(backendDraft.responses || {}) }
            };
            
            setFormData(mergedData);
            setCurrentStep(backendDraft.current_step || 0);
            setDraftId(backendDraft.id);
            setLastSaved(new Date(backendDraft.last_saved_at));
            
            toast({
              title: "Dados recuperados!",
              description: "Seus dados foram restaurados automaticamente.",
            });
          }
        } catch (e) {
          console.error('Erro ao carregar rascunho do backend:', e);
        }
      }
    };

    if (survey && !loading) {
      loadDraft();
    }
  }, [survey, storageKey, loading]);

  const fetchSurvey = async () => {
    try {
      const { data, error } = await supabase
        .from("job_surveys")
        .select("*")
        .execute().eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        navigate("/404");
        return;
      }

      const normalizedSurvey = {
        ...data,
        questions: Array.isArray(data.questions) ? (data.questions as unknown as Question[]) : [],
        benefits: Array.isArray(data.benefits) ? (data.benefits as string[]) : [],
        requirements: Array.isArray(data.requirements) ? (data.requirements as string[]) : [],
        work_days: Array.isArray(data.work_days) ? (data.work_days as string[]) : [],
        daily_schedule:
          typeof data.daily_schedule === 'object' && data.daily_schedule !== null
            ? (data.daily_schedule as { [key: string]: { start: string; end: string } })
            : {},
        dynamic_questions: Array.isArray((data as any).dynamic_questions) ? (data as any).dynamic_questions : [],
      };

      setSurvey(normalizedSurvey);
      fetchDynamicQuestions(normalizedSurvey);
    } catch (error) {
      console.error("Erro ao buscar formulário:", error);
      navigate("/404");
    } finally {
      setLoading(false);
    }
  };

  const fetchDynamicQuestions = async (baseSurvey: any) => {
    try {
      setLoadingDynamic(true);
      const { data, error } = await supabase.functions.invoke('generate-dynamic-questions', {
        body: {
          survey: {
            id: baseSurvey.id,
            title: baseSurvey.title,
            position_title: baseSurvey.position_title,
            description: baseSurvey.description,
            department: baseSurvey.department,
            requirements: baseSurvey.requirements,
            work_modality: baseSurvey.work_modality,
            contract_type: baseSurvey.contract_type,
            seniority: (baseSurvey as any).seniority,
          },
          base_questions: baseSurvey.questions || [],
        }
      });

      if (error) {
        console.error('Erro ao gerar perguntas dinâmicas:', error);
        return;
      }

      const generated = Array.isArray(data?.dynamic_questions) ? data.dynamic_questions : [];
      setDynamicQuestions(generated);
      setSurvey((prev) => {
        if (!prev) return prev;
        const mapped = generated.map((q: any, idx: number) => ({
          id: q.id || `dyn-${idx}`,
          title: q.title || q.question || 'Pergunta personalizada',
          description: q.description || 'Pergunta adaptada para esta vaga',
          type: q.type || 'textarea',
          required: typeof q.required === 'boolean' ? q.required : true,
          options: q.options || [],
        }));
        return { ...prev, questions: [...prev.questions, ...mapped] };
      });
    } catch (err) {
      console.error('Erro ao buscar perguntas dinâmicas:', err);
    } finally {
      setLoadingDynamic(false);
    }
  };

  /* ---------- steps ---------- */
  const steps = [
    { title: "Dados Pessoais", type: "personal" },
    ...(survey?.questions || []).map((question, index) => ({
      title: `Pergunta ${index + 1}`,
      type: "question" as const,
      question,
    })),
  ];

  const totalSteps = steps.length;
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

  /* ---------- validação ---------- */
  const validateStep = (stepIndex: number) => {
    const newErrors: Record<string, string> = {};

    if (stepIndex === 0) {
      if (!formData.name.trim()) newErrors.name = "Nome é obrigatório";
      if (!formData.email.trim()) newErrors.email = "Email é obrigatório";
      if (formData.email && !isValidEmail(formData.email)) newErrors.email = "Email inválido";
      if (!formData.phone.trim()) newErrors.phone = "Telefone é obrigatório";
      if (formData.phone && !isValidBRPhone(formData.phone)) newErrors.phone = "Telefone inválido";

      if (!formData.age.trim()) newErrors.age = "Idade é obrigatória";
      if (formData.age) {
        const n = parseInt(formData.age, 10);
        if (Number.isNaN(n) || n < 16 || n > 100) newErrors.age = "Idade inválida";
      }

      if (!formData.cep.trim()) newErrors.cep = "CEP é obrigatório";
      else if (!isValidCEP(formData.cep)) newErrors.cep = "CEP inválido (ex.: 13050-120)";
    } else {
      const questionIndex = stepIndex - 1;
      const question = survey?.questions[questionIndex];
      if (question?.required) {
        const response = formData.responses[question.id];
        // Validação mais rigorosa: verificar se há resposta válida
        const isEmpty = 
          response === undefined || 
          response === null || 
          response === '' ||
          (typeof response === 'string' && !response.trim()) ||
          (Array.isArray(response) && response.length === 0);
        
        if (isEmpty) {
          newErrors[question.id] = "Esta pergunta é obrigatória";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ---------- navegação ---------- */
  const handleNext = () => {
    const isValid = validateStep(currentStep);
    if (!isValid) {
      toast({ 
        title: "Atenção", 
        description: "Por favor, responda a pergunta obrigatória antes de continuar.", 
        variant: "destructive" 
      });
      return;
    }
    if (currentStep < totalSteps - 1) setCurrentStep((s) => s + 1);
    else handleSubmit();
  };
  const handlePrevious = () => currentStep > 0 && setCurrentStep((s) => s - 1);


  const handleResponseChange = (questionId: string, value: string | string[]) => {
    setFormData((prev) => ({
      ...prev,
      responses: { ...prev.responses, [questionId]: value },
    }));
  };

  /* ---------- submit ---------- */
  const handleSubmit = async () => {
    if (!survey) {
      toast({ title: "Erro", description: "Formulário não encontrado. Tente novamente.", variant: "destructive" });
      return;
    }

    const idempotencyKey = crypto.randomUUID();
    setSubmitting(true);

    try {
      if (!formData.name.trim() || !formData.email.trim()) {
        throw new Error("Nome e email são obrigatórios");
      }

      const submissionData = {
        survey_id: survey.id,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone?.trim() || null,
        age: formData.age ? parseInt(formData.age) : null,
        cep: formData.cep?.trim() || null,
        address: formData.address?.trim() || null,
        whatsapp: formData.whatsapp?.trim() || null,
        instagram: formData.instagram?.trim() || null,
        linkedin: formData.linkedin?.trim() || null,
        responses: formData.responses || {},
      };

      const response = await supabase.functions.invoke('job-application-submit', {
        headers: { 'Idempotency-Key': idempotencyKey },
        body: submissionData,
      });

      const responseData = response.data;
      if (response.error) throw new Error(response.error.message);

      setSubmitted(true);
      setShowDiscPrompt(true);
      toast({ title: "Candidatura enviada com sucesso! 🎉", description: "Você pode fazer o teste comportamental agora ou depois." });
      
      const jobResponseId = responseData?.submissionId || responseData?.job_response_id;
      const candidateInfo = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone?.trim() || null,
        age: formData.age ? parseInt(formData.age) : null,
        job_response_id: jobResponseId || null,
        survey_id: survey.id
      };
      setJobResponseId(jobResponseId || null);
      
      sessionStorage.setItem('candidate_disc_info', JSON.stringify(candidateInfo));

      // Rodar análise de IA das respostas
      try {
        const aiResp = await supabase.functions.invoke('analyze-candidate-responses', {
          body: {
            job_response_id: jobResponseId,
            survey_id: survey.id,
            candidate: {
              ...candidateInfo,
              responses: formData.responses || {},
              disc_final: null,
            },
            job: {
              title: survey.title,
              position_title: survey.position_title,
              description: survey.description,
              department: survey.department,
              requirements: survey.requirements,
              work_modality: survey.work_modality,
              contract_type: survey.contract_type,
              seniority: (survey as any).seniority,
            }
          }
        });

        if (!aiResp.error && aiResp.data?.analysis) {
          setAiAnalysis(aiResp.data.analysis);
          sessionStorage.setItem('candidate_ai_analysis', JSON.stringify(aiResp.data.analysis));
        }
      } catch (err) {
        console.error('Erro ao analisar candidato:', err);
      }
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao enviar a candidatura.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const startDiscTest = () => {
    navigate(`/disc-externo?job_response_id=${jobResponseId || ''}&survey_id=${survey?.id || ''}`);
  };

  /* ---------- renderização de perguntas dinâmicas ---------- */
  const renderQuestion = (question: Question) => {
    const value = formData.responses[question.id];
    const error = errors[question.id];

    return (
      <div className="space-y-4">
        <div>
          <Label className="text-lg font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--job-text))' }}>
            {question.title} {question.required && <span className="text-red-600">*</span>}
          </Label>
          {question.description && (
            <p className="mt-2" style={{ color: 'hsl(var(--job-text-muted))' }}>{question.description}</p>
          )}
        </div>

        {question.type === 'text' && (
          <Input
            value={(value as string) || ''}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            className={`${fieldClass} ${error ? 'border-red-500' : ''}`}
            style={fieldStyle}
            placeholder="Digite sua resposta..."
          />
        )}

        {question.type === 'textarea' && (
          <Textarea
            value={(value as string) || ''}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            className={`${fieldClass} min-h-[120px] ${error ? 'border-red-500' : ''}`}
            style={fieldStyle}
            placeholder="Digite sua resposta detalhada..."
          />
        )}

        {question.type === 'number' && (
          <Input
            type="number"
            value={(value as string) || ''}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            className={`${fieldClass} ${error ? 'border-red-500' : ''}`}
            style={fieldStyle}
            placeholder="Digite um número..."
          />
        )}

        {question.type === 'select' && (
          <Select value={(value as string) || ''} onValueChange={(val) => handleResponseChange(question.id, val)}>
            <SelectTrigger className={`${fieldClass} ${error ? 'border-red-500' : ''}`} style={fieldStyle}>
              <SelectValue placeholder="Selecione uma opção" />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option, index) => (
                <SelectItem key={index} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {question.type === 'radio' && (
          <RadioGroup value={(value as string) || ''} onValueChange={(val) => handleResponseChange(question.id, val)} className="space-y-3">
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border" style={{ backgroundColor: 'hsl(var(--job-card))', borderColor: 'hsl(var(--job-card-border))' }}>
                <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                <Label htmlFor={`${question.id}-${index}`} className="flex-1 cursor-pointer text-base" style={{ color: 'hsl(var(--job-text))' }}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {question.type === 'checkbox' && (
          <div className="space-y-3">
            {question.options?.map((option, index) => {
              const arr = (value as string[]) || [];
              const checked = arr.includes(option);
              return (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border" style={{ backgroundColor: 'hsl(var(--job-card))', borderColor: 'hsl(var(--job-card-border))' }}>
                  <Checkbox
                    id={`${question.id}-${index}`}
                    checked={checked}
                    onCheckedChange={(isOn) => {
                      const next = isOn ? [...arr, option] : arr.filter((v) => v !== option);
                      handleResponseChange(question.id, next);
                    }}
                  />
                  <Label htmlFor={`${question.id}-${index}`} className="flex-1 cursor-pointer text-base" style={{ color: 'hsl(var(--job-text))' }}>{option}</Label>
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <p className="text-red-600 text-sm flex items-center gap-2" role="alert">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  };

  /* ---------- telas de loading/erro/sucesso ---------- */
  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'hsl(var(--job-application))' }}>
        <div className="flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center" style={{ backgroundColor: 'hsl(var(--job-card))', borderColor: 'hsl(var(--job-card-border))' }}>
            <CardContent className="pt-6 pb-6">
              <div className="animate-spin w-12 h-12 border-4 border-[hsl(var(--job-primary))] border-t-transparent rounded-full mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2" style={{ color: 'hsl(var(--job-text))' }}>Carregando formulário...</h2>
              <p style={{ color: 'hsl(var(--job-text-muted))' }}>Aguarde um momento</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'hsl(var(--job-application))' }}>
        <div className="flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center border-2" style={{ backgroundColor: 'hsl(var(--job-card))', borderColor: 'hsl(var(--job-primary))' }}>
            <CardContent className="pt-6">
              <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'hsl(var(--job-primary))' }} />
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'hsl(var(--job-text))' }}>Formulário não encontrado</h1>
              <p style={{ color: 'hsl(var(--job-text-muted))' }}>O formulário solicitado não existe ou não está mais ativo.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'hsl(var(--job-application))' }}>
        <div className="flex items-center justify-center p-4">
          <Card className="w-full max-w-lg text-center border-2" style={{ backgroundColor: 'hsl(var(--job-card))', borderColor: 'hsl(var(--job-primary))' }}>
            <CardContent className="pt-8 pb-8">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'hsl(var(--job-primary))' }}>
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-3" style={{ color: 'hsl(var(--job-text))' }}>Candidatura enviada! 🎉</h1>
              <p className="mb-6 text-lg" style={{ color: 'hsl(var(--job-text-muted))' }}>Em instantes você será direcionado para completar o teste DISC.</p>
              <div className="flex items-center justify-center space-x-4 text-sm" style={{ color: 'hsl(var(--job-text-muted))' }}>
                <div className="flex items-center space-x-1">
                  <Zap className="w-4 h-4" style={{ color: 'hsl(var(--job-primary))' }} />
                  <span>Avaliação comportamental</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Award className="w-4 h-4" style={{ color: 'hsl(var(--job-primary))' }} />
                  <span>Perfil profissional</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  /* ---------- página principal ---------- */
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'hsl(var(--job-application))' }}>
      <Helmet>
        <title>{survey ? `${survey.title} - Candidatura | Prime Camp` : 'Candidatura - Prime Camp'}</title>
        <meta
          name="description"
          content={survey 
            ? `Candidate-se para a vaga de ${survey.position_title} na Prime Camp. ${survey.description?.substring(0, 150) || ''}`
            : 'Candidatura para vaga de emprego na Prime Camp'
          }
        />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={`${window.location.origin}/vaga/${slug}`} />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={survey ? survey.title : 'Candidatura - Prime Camp'} />
        <meta property="og:description" content={survey?.description?.substring(0, 200) || 'Candidate-se para esta vaga'} />
        <meta property="og:url" content={`${window.location.origin}/vaga/${slug}`} />
        
        {/* Schema.org JobPosting */}
        {survey && (
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'JobPosting',
              title: survey.title,
              description: survey.description || survey.position_title,
              identifier: {
                '@type': 'PropertyValue',
                name: 'ID',
                value: survey.id
              },
              datePosted: survey.created_at,
              validThrough: survey.expires_at || undefined,
              employmentType: survey.contract_type || 'FULL_TIME',
              hiringOrganization: {
                '@type': 'Organization',
                name: survey.company_name || 'Prime Camp',
                sameAs: window.location.origin
              },
              jobLocation: survey.location ? {
                '@type': 'Place',
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: survey.location
                }
              } : undefined,
              baseSalary: (survey.salary_min || survey.salary_max) ? {
                '@type': 'MonetaryAmount',
                currency: 'BRL',
                value: {
                  '@type': 'QuantitativeValue',
                  minValue: survey.salary_min,
                  maxValue: survey.salary_max,
                  unitText: 'MONTH'
                }
              } : undefined,
              workHours: survey.weekly_hours ? `${survey.weekly_hours} horas por semana` : undefined
            })}
          </script>
        )}
        <style>{themeCSS}</style>
      </Helmet>

      {/* Header da vaga - tema consistente */}
      <header className="border-b shadow-sm" style={{ backgroundColor: 'hsl(var(--job-card))', borderColor: 'hsl(var(--job-card-border))' }}>
        <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              {survey.company_logo && (
                <img src={survey.company_logo} alt="Logo" className="w-12 h-12 sm:w-16 sm:h-16 object-contain rounded-xl border p-2" style={{ borderColor: 'hsl(var(--job-card-border))', backgroundColor: 'white' }} />
              )}
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight" style={{ color: 'hsl(var(--job-text))' }}>{survey.position_title}</h1>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 text-xs sm:text-sm">
                  <Badge variant="secondary" className="gap-1" style={{ backgroundColor: 'hsl(var(--job-badge))', color: 'hsl(var(--job-text))' }}>
                    <Building className="w-4 h-4" />
                    {survey.company_name || survey.department}
                  </Badge>
                  {survey.location && (
                    <Badge variant="secondary" className="gap-1" style={{ backgroundColor: 'hsl(var(--job-badge))', color: 'hsl(var(--job-text))' }}>
                      <MapPin className="w-4 h-4" />
                      {survey.location}
                    </Badge>
                  )}
                  {(survey.salary_min || survey.salary_max || survey.salary_range) && (
                    <Badge variant="secondary" className="gap-1" style={{ backgroundColor: 'hsl(var(--job-badge))', color: 'hsl(var(--job-text))' }}>
                      <DollarSign className="w-4 h-4" />
                      {survey.salary_min && survey.salary_max
                        ? `R$ ${survey.salary_min.toLocaleString()} - R$ ${survey.salary_max.toLocaleString()}`
                        : survey.salary_range}
                    </Badge>
                  )}
                  {survey.work_schedule && (
                    <Badge variant="secondary" className="gap-1" style={{ backgroundColor: 'hsl(var(--job-badge))', color: 'hsl(var(--job-text))' }}>
                      <Clock className="w-4 h-4" />
                      {survey.work_schedule}
                    </Badge>
                  )}
                  {survey.work_modality && (
                    <Badge className="gap-1 text-white" style={{ backgroundColor: 'hsl(var(--job-primary))' }}>
                      <Users className="w-4 h-4" />
                      <span className="capitalize">{survey.work_modality}</span>
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
        <div className="max-w-3xl mx-auto">
          {loadingDynamic && (
            <div className="mb-3 text-sm text-center text-job-text-muted">
              Gerando perguntas personalizadas para esta vaga...
            </div>
          )}
          {!loadingDynamic && dynamicQuestions.length > 0 && (
            <div className="mb-3 text-sm text-center text-job-text-muted">
              Adicionamos {dynamicQuestions.length} perguntas personalizadas para esta vaga.
            </div>
          )}
          <div className="min-h-[60vh] flex flex-col">
            <Card className="flex-1" style={{ backgroundColor: 'hsl(var(--job-card))', borderColor: 'hsl(var(--job-card-border))' }}>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl flex items-center justify-center gap-3" style={{ color: 'hsl(var(--job-text))' }}>
                  {currentStep === 0 ? (
                    <>
                      <User className="h-6 w-6" style={{ color: 'hsl(var(--job-primary))' }} />
                      Dados Pessoais
                    </>
                  ) : (
                    <>
                      <FileText className="h-6 w-6" style={{ color: 'hsl(var(--job-primary))' }} />
                      {steps[currentStep].title}
                    </>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {currentStep === 0 ? (
                  <>
                    {/* Aviso de Privacidade LGPD */}
                    <div className="mb-4 p-4 rounded-lg border" style={{ 
                      backgroundColor: 'hsl(var(--job-badge))', 
                      borderColor: 'hsl(var(--job-card-border))' 
                    }}>
                      <p className="text-sm flex items-start gap-2" style={{ color: 'hsl(var(--job-text-muted))' }}>
                        <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'hsl(var(--job-primary))' }} />
                        <span>
                          <strong style={{ color: 'hsl(var(--job-text))' }}>Privacidade e segurança:</strong> Seus dados são utilizados exclusivamente para processos de candidatura a vagas de emprego e são mantidos com total segurança e confidencialidade.
                        </span>
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm sm:text-base font-medium flex items-center gap-2" style={{ color: 'hsl(var(--job-text))' }}>
                          <User className="w-4 h-4" style={{ color: 'hsl(var(--job-primary))' }} />
                          Nome Completo *
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          autoComplete="name"
                          className={`h-11 sm:h-12 text-base border focus-visible:ring-2 focus-visible:ring-[hsl(var(--job-primary))] ${errors.name ? 'border-red-500' : ''}`}
                          style={fieldStyle}
                          placeholder="Digite seu nome completo"
                        />
                        {errors.name && <p className="text-red-600 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{errors.name}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm sm:text-base font-medium flex items-center gap-2" style={{ color: 'hsl(var(--job-text))' }}>
                          <Mail className="w-4 h-4" style={{ color: 'hsl(var(--job-primary))' }} />
                          Email *
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          autoComplete="email"
                          className={`h-11 sm:h-12 text-base border focus-visible:ring-2 focus-visible:ring-[hsl(var(--job-primary))] ${errors.email ? 'border-red-500' : ''}`}
                          style={fieldStyle}
                          placeholder="seu@email.com"
                        />
                        {errors.email && <p className="text-red-600 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{errors.email}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm sm:text-base font-medium flex items-center gap-2" style={{ color: 'hsl(var(--job-text))' }}>
                          <Phone className="w-4 h-4" style={{ color: 'hsl(var(--job-primary))' }} />
                          Telefone *
                        </Label>
                        <Input
                          id="phone"
                          inputMode="tel"
                          autoComplete="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: formatBRPhone(e.target.value) })}
                          className={`h-11 sm:h-12 text-base border focus-visible:ring-2 focus-visible:ring-[hsl(var(--job-primary))] ${errors.phone ? 'border-red-500' : ''}`}
                          style={fieldStyle}
                          placeholder="(00) 00000-0000"
                        />
                        {errors.phone && <p className="text-red-600 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{errors.phone}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="age" className="text-sm sm:text-base font-medium" style={{ color: 'hsl(var(--job-text))' }}>Idade *</Label>
                        <Input
                          id="age"
                          type="number"
                          min={16}
                          max={100}
                          value={formData.age || ''}
                          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                          className={`h-11 sm:h-12 text-base border focus-visible:ring-2 focus-visible:ring-[hsl(var(--job-primary))] ${errors.age ? 'border-red-500' : ''}`}
                          style={fieldStyle}
                          placeholder="Sua idade"
                        />
                        {errors.age && <p className="text-red-600 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{errors.age}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cep" className="text-sm sm:text-base font-medium" style={{ color: 'hsl(var(--job-text))' }}>CEP *</Label>
                        <Input
                          id="cep"
                          inputMode="numeric"
                          value={formData.cep}
                          onChange={(e) => setFormData({ ...formData, cep: formatCEP(e.target.value) })}
                          className={`h-11 sm:h-12 text-base border focus-visible:ring-2 focus-visible:ring-[hsl(var(--job-primary))] tracking-widest ${errors.cep ? 'border-red-500' : ''}`}
                          style={fieldStyle}
                          placeholder="00000-000"
                        />
                        {errors.cep && <p className="text-red-600 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{errors.cep}</p>}
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="address" className="text-sm sm:text-base font-medium flex items-center gap-2" style={{ color: 'hsl(var(--job-text))' }}>
                          <Home className="w-4 h-4" style={{ color: 'hsl(var(--job-primary))' }} />
                          Endereço completo
                        </Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          autoComplete="street-address"
                          className="h-11 sm:h-12 text-base border focus-visible:ring-2 focus-visible:ring-[hsl(var(--job-primary))]"
                          style={fieldStyle}
                          placeholder="Rua, número, bairro, cidade/UF"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="whatsapp" className="text-sm sm:text-base font-medium" style={{ color: 'hsl(var(--job-text))' }}>WhatsApp</Label>
                        <Input
                          id="whatsapp"
                          inputMode="tel"
                          autoComplete="tel-national"
                          value={formData.whatsapp}
                          onChange={(e) => setFormData({ ...formData, whatsapp: formatBRPhone(e.target.value) })}
                          className={`h-11 sm:h-12 text-base border focus-visible:ring-2 focus-visible:ring-[hsl(var(--job-primary))] ${errors.whatsapp ? 'border-red-500' : ''}`}
                          style={fieldStyle}
                          placeholder="(00) 00000-0000"
                        />
                        {errors.whatsapp && <p className="text-red-600 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{errors.whatsapp}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="instagram" className="text-sm sm:text-base font-medium" style={{ color: 'hsl(var(--job-text))' }}>Instagram</Label>
                        <Input
                          id="instagram"
                          value={formData.instagram}
                          onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                          className="h-11 sm:h-12 text-base border focus-visible:ring-2 focus-visible:ring-[hsl(var(--job-primary))]"
                          style={fieldStyle}
                          placeholder="@seuusuario"
                        />
                        <p className="text-xs flex items-center gap-1.5" style={{ color: 'hsl(var(--job-primary))' }}>
                          <Info className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="font-medium">Instagram aberto é considerado diferencial!</span>
                        </p>
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="linkedin" className="text-sm sm:text-base font-medium" style={{ color: 'hsl(var(--job-text))' }}>LinkedIn</Label>
                        <Input
                          id="linkedin"
                          type="url"
                          value={formData.linkedin}
                          onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                          className="h-11 sm:h-12 text-base border focus-visible:ring-2 focus-visible:ring-[hsl(var(--job-primary))]"
                          style={fieldStyle}
                          placeholder="https://linkedin.com/in/seuperfil"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="max-w-2xl mx-auto">
                    {"question" in steps[currentStep] && renderQuestion((steps[currentStep] as any).question)}
                  </div>
                )}
              </CardContent>
            </Card>

          {showDiscPrompt && (
            <Card className="mt-4 border-dashed" style={{ backgroundColor: 'hsl(var(--job-badge))', borderColor: 'hsl(var(--job-card-border))' }}>
              <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-base font-semibold" style={{ color: 'hsl(var(--job-text))' }}>Teste comportamental opcional</p>
                  <p className="text-sm" style={{ color: 'hsl(var(--job-text-muted))' }}>
                    Faça o DISC para validar o perfil inferido pela IA. Você pode pular e fazer depois.
                  </p>
                  {aiAnalysis && (
                    <p className="text-sm mt-2" style={{ color: 'hsl(var(--job-text))' }}>
                      Perfil inferido: {aiAnalysis?.disc_inferido?.dominante || 'N/A'} | Fit: {aiAnalysis?.scores?.fit ?? 0}%
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowDiscPrompt(false)}>Fazer depois</Button>
                  <Button onClick={startDiscTest}>Fazer teste agora</Button>
                </div>
              </CardContent>
            </Card>
          )}

            {/* Footer fixo com dots menores + progresso e navegação */}
            <Card className="mt-4 sm:mt-6 sticky bottom-0 z-10 shadow-lg" style={{ backgroundColor: 'hsl(var(--job-card))', borderColor: 'hsl(var(--job-card-border))' }}>
              <CardContent className="pt-4 sm:pt-5 pb-3 sm:pb-4 px-3 sm:px-6">
                {/* Dots compactos no rodapé */}
                <div className="flex items-center justify-center gap-2 mb-3">
                  {steps.map((_, idx) => (
                    <button
                      key={idx}
                      aria-label={`Ir para etapa ${idx + 1}`}
                      onClick={() => setCurrentStep(idx)}
                      className={`w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full transition-all ${idx === currentStep ? 'scale-125' : 'opacity-70'}`}
                      style={{ backgroundColor: idx <= currentStep ? 'hsl(var(--job-primary))' : 'hsl(var(--job-card-border))' }}
                    />
                  ))}
                </div>

                <div className="mb-3">
                  <div className="flex justify-between items-center text-sm mb-2 flex-wrap gap-2" style={{ color: 'hsl(var(--job-text-muted))' }}>
                    <span>Etapa {currentStep + 1} de {totalSteps}</span>
                    <div className="flex items-center gap-2">
                      {saving && (
                        <span className="text-xs flex items-center gap-1">
                          <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                          Salvando...
                        </span>
                      )}
                      {!saving && lastSaved && (
                        <span className="text-xs flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle className="w-3 h-3" />
                          Salvo {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      <span>{Math.round(progressPercentage)}% concluído</span>
                    </div>
                  </div>
                  <Progress value={progressPercentage} className="w-full h-2" />
                </div>

                <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className="flex items-center justify-center gap-2 h-11 sm:h-12 px-4 sm:px-6 text-sm sm:text-base order-2 sm:order-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Anterior</span>
                    <span className="sm:hidden">Voltar</span>
                  </Button>

                  <Button
                    onClick={handleNext}
                    disabled={submitting}
                    className="flex items-center justify-center gap-2 h-11 sm:h-12 px-4 sm:px-6 text-sm sm:text-base font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed order-1 sm:order-2"
                    style={{ backgroundColor: 'hsl(var(--job-primary))' }}
                    aria-busy={submitting}
                  >
                    {submitting && (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    )}
                    <span className="hidden sm:inline">
                      {currentStep === totalSteps - 1 ? 'Enviar Candidatura' : 'Próxima'}
                    </span>
                    <span className="sm:hidden">
                      {currentStep === totalSteps - 1 ? 'Enviar' : 'Próxima'}
                    </span>
                    {!submitting && (currentStep === totalSteps - 1 ? <Send className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Rodapé igual ao do portal */}
      <footer className="border-t mt-12 shadow-sm" style={{ backgroundColor: 'hsl(var(--job-card))', borderColor: 'hsl(var(--job-card-border))' }}>
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <p className="text-sm" style={{ color: 'hsl(var(--job-text-muted))' }}>
            © {new Date().getFullYear()} Prime Camp. Todas as vagas são atualizadas regularmente.
          </p>
        </div>
      </footer>
    </div>
  );
}
