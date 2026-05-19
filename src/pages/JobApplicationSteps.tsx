import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useNavigate } from "react-router-dom";
import { from } from '@/integrations/db/client';
import { apiClient } from '@/integrations/api/client';
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
  Mail, User, ChevronLeft, ChevronRight,
  Lock, Info, AlertTriangle, Ban
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";

/* =======================
   Tema consistente (Claro/Escuro) - Design Profissional
   ======================= */
const themeCSS = `
  :root {
    --job-bg: 220 20% 97%;
    --job-card: 0 0% 100%;
    --job-card-border: 220 13% 91%;
    --job-text: 222 47% 11%;
    --job-text-muted: 215 16% 47%;
    --job-primary: 358 75% 52%;
    --job-primary-hover: 358 75% 45%;
    --job-badge: 210 40% 96%;
    --job-gradient-start: 358 75% 52%;
    --job-gradient-end: 340 65% 47%;
  }
  .dark {
    --job-bg: 222 22% 8%;
    --job-card: 220 15% 13%;
    --job-card-border: 220 13% 22%;
    --job-text: 210 40% 98%;
    --job-text-muted: 215 20% 65%;
    --job-primary: 358 82% 56%;
    --job-primary-hover: 358 82% 50%;
    --job-badge: 220 15% 18%;
    --job-gradient-start: 358 82% 56%;
    --job-gradient-end: 340 70% 50%;
  }
  
  html {
    overflow-x: hidden;
    overflow-y: auto !important;
    height: auto !important;
  }
  
  body {
    overflow-x: hidden;
    overflow-y: auto !important;
    height: auto !important;
    min-height: 100vh;
  }
  
  #root {
    height: auto !important;
    min-height: 100vh;
    overflow: visible !important;
  }
  
  .job-form-scroll {
    min-height: 100vh;
    max-height: 100vh;
    height: 100vh;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }
  
  /* Scrollbar fino e discreto */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  
  ::-webkit-scrollbar-thumb {
    background: hsl(var(--job-text-muted) / 0.3);
    border-radius: 3px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--job-text-muted) / 0.5);
  }
  
  /* Firefox */
  * {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--job-text-muted) / 0.3) transparent;
  }
  
  .hero-pattern {
    background-image: radial-gradient(circle at 1px 1px, hsl(var(--job-text-muted) / 0.15) 1px, transparent 0);
    background-size: 40px 40px;
  }
  
  /* Animação suave nos cards */
  .form-card {
    transition: all 0.3s ease;
  }
  
  .form-card:hover {
    box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  }
  
  /* Input focus animation */
  .form-input:focus {
    transform: translateY(-1px);
  }
  
  /* Step indicator animation */
  .step-indicator {
    transition: all 0.3s ease;
  }
  
  .step-indicator.active {
    transform: scale(1.1);
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
  support_whatsapp?: string | null;
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

const AGE_OPTIONS = Array.from({ length: 30 }, (_, index) => String(index + 16));

/* ---------------- helpers de máscara/validação ---------------- */
const onlyDigits = (v: string) => v.replace(/\D/g, "");
const formatBRPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7,11)}`;
};
const isValidWhatsApp = (v: string) => onlyDigits(v).length === 11; // 9 dígitos + DDD
const formatCEP = (v: string) => {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0,5)}-${d.slice(5)}`;
};
const isValidCEP = (v: string) => /^\d{5}-?\d{3}$/.test(v);
const isValidEmail = (v: string) => /\S+@\S+\.\S+/.test(v);
const PERSONAL_FIELD_LABELS: Record<string, string> = {
  name: 'nome',
  email: 'e-mail',
  age: 'idade',
  cep: 'CEP',
  address: 'endereço',
  whatsapp: 'WhatsApp',
};
const getPersonalDataErrors = (data: Pick<FormData, 'name' | 'email' | 'age' | 'cep' | 'address' | 'whatsapp'>) => {
  const errors: Record<string, string> = {};
  if (!data.name?.trim()) errors.name = 'Nome é obrigatório';
  if (!data.email?.trim()) errors.email = 'Email é obrigatório';
  else if (!isValidEmail(data.email)) errors.email = 'Email inválido';
  if (!data.whatsapp?.trim()) errors.whatsapp = 'WhatsApp é obrigatório';
  else if (!isValidWhatsApp(data.whatsapp)) errors.whatsapp = 'WhatsApp inválido';
  if (!data.age?.trim()) {
    errors.age = 'Idade é obrigatória';
  } else {
    const age = parseInt(data.age, 10);
    if (Number.isNaN(age) || age < 16 || age > 45) errors.age = 'Idade inválida (16 a 45 anos)';
  }
  if (!data.cep?.trim()) errors.cep = 'CEP é obrigatório';
  else if (!isValidCEP(data.cep)) errors.cep = 'CEP inválido (ex.: 13050-120)';
  if (!data.address?.trim()) errors.address = 'Endereço é obrigatório';
  return errors;
};
const hasRequiredPersonalData = (data: Pick<FormData, 'name' | 'email' | 'age' | 'cep' | 'address' | 'whatsapp'>) =>
  Object.keys(getPersonalDataErrors(data)).length === 0;
const formatMissingPersonalFields = (errors: Record<string, string>) =>
  Object.keys(errors)
    .map((key) => PERSONAL_FIELD_LABELS[key] || key)
    .join(', ');
const clampStepIndex = (step: number, totalSteps: number) => {
  const maxStep = Math.max(totalSteps - 1, 0);
  if (!Number.isFinite(step)) return 0;
  return Math.min(Math.max(Math.trunc(step), 0), maxStep);
};
const DEFAULT_SUPPORT_WHATSAPP = '5519987680453';
const normalizeWhatsAppLinkNumber = (value?: string | null) => {
  const digits = onlyDigits(value || '');
  if (!digits) return DEFAULT_SUPPORT_WHATSAPP;
  if (digits.startsWith('55')) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
};
const WhatsAppIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg
    viewBox="0 0 32 32"
    className={cn('shrink-0', className)}
    aria-hidden
    focusable="false"
  >
    <circle cx="16" cy="16" r="16" fill="#25D366" />
    <path
      fill="#FFFFFF"
      d="M22.62 18.73c-.35-.18-2.08-1.03-2.4-1.14-.32-.12-.56-.18-.79.18-.23.35-.91 1.14-1.11 1.37-.2.23-.41.26-.76.09-.35-.18-1.49-.55-2.84-1.75-1.05-.94-1.76-2.09-1.97-2.44-.2-.35-.02-.54.15-.72.16-.16.35-.41.53-.61.18-.2.23-.35.35-.59.12-.23.06-.44-.03-.61-.09-.18-.79-1.9-1.08-2.6-.28-.68-.57-.59-.79-.6h-.67c-.23 0-.61.09-.93.44-.32.35-1.23 1.2-1.23 2.92s1.26 3.39 1.43 3.62c.18.23 2.48 3.78 6 5.3.84.36 1.49.58 2 .74.84.27 1.61.23 2.22.14.68-.1 2.08-.85 2.38-1.67.29-.82.29-1.52.2-1.67-.09-.15-.32-.23-.67-.4Z"
    />
    <path
      fill="#FFFFFF"
      fillRule="evenodd"
      d="M16.02 5.33c-5.88 0-10.67 4.78-10.67 10.67 0 1.88.49 3.71 1.42 5.32L5.33 26.67l5.49-1.44a10.6 10.6 0 0 0 5.2 1.32h.01c5.88 0 10.67-4.78 10.67-10.67 0-2.85-1.11-5.53-3.13-7.54a10.6 10.6 0 0 0-7.55-3.01Zm.01 19.42h-.01a8.86 8.86 0 0 1-4.52-1.24l-.32-.19-3.25.85.87-3.17-.21-.33A8.82 8.82 0 0 1 7.15 16c0-4.89 3.98-8.87 8.88-8.87 2.37 0 4.59.92 6.27 2.6a8.8 8.8 0 0 1 2.6 6.27c0 4.89-3.98 8.75-8.87 8.75Z"
      clipRule="evenodd"
    />
  </svg>
);

const InstagramLogo = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <span className={cn('inline-flex shrink-0 items-center justify-center', className)} aria-hidden>
    <svg viewBox="0 0 24 24" className="h-full w-full">
      <defs>
        <linearGradient id="instagram-label-gradient" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#feda75" />
          <stop offset="0.28" stopColor="#fa7e1e" />
          <stop offset="0.55" stopColor="#d62976" />
          <stop offset="0.78" stopColor="#962fbf" />
          <stop offset="1" stopColor="#4f5bd5" />
        </linearGradient>
      </defs>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="url(#instagram-label-gradient)" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="white" strokeWidth="2" />
      <circle cx="17.4" cy="6.8" r="1.35" fill="white" />
    </svg>
  </span>
);

export default function JobApplicationSteps() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [survey, setSurvey] = useState<JobSurvey | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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
  const lastDraftPayloadRef = React.useRef<string>('');
  const hasLoggedDraftErrorRef = React.useRef(false);
  // Estado para modal de candidatura já enviada - FORÇADO para evitar tree-shaking
  const [showAlreadyAppliedModal, setShowAlreadyAppliedModal] = useState<boolean>(false);
  const [existingJobResponseId, setExistingJobResponseId] = useState<string | null>(null);
  const [showExitIntentModal, setShowExitIntentModal] = useState(false);

  // Forçar referência ao estado para evitar tree-shaking do Vite
  React.useEffect(() => {
    if (showAlreadyAppliedModal !== undefined) {
      // Esta linha garante que o estado seja incluído no build
      void showAlreadyAppliedModal;
    }
  }, [showAlreadyAppliedModal]);

  const storageKey = useMemo(() => `jobapp:${slug}`, [slug]);
  // Chave estável por sessão para o mesmo rascunho (evita criar dezenas de "leads parciais" quando o usuário ainda não preencheu email)
  const draftSessionKey = useMemo(() => `jobapp_draft_email:${slug}`, [slug]);

  // Debounce para autosave (salvar após 2 segundos sem digitar)
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Força scroll na página pública de vaga (app interno usa overflow hidden no root)
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');

    const prev = {
      htmlOverflowY: html.style.overflowY,
      htmlOverflowX: html.style.overflowX,
      htmlHeight: html.style.height,
      bodyOverflowY: body.style.overflowY,
      bodyOverflowX: body.style.overflowX,
      bodyHeight: body.style.height,
      rootOverflow: root?.style.overflow || '',
      rootHeight: root?.style.height || '',
      rootMinHeight: root?.style.minHeight || '',
    };

    html.style.setProperty('overflow-y', 'auto', 'important');
    html.style.setProperty('overflow-x', 'hidden', 'important');
    html.style.setProperty('height', 'auto', 'important');
    body.style.setProperty('overflow-y', 'auto', 'important');
    body.style.setProperty('overflow-x', 'hidden', 'important');
    body.style.setProperty('height', 'auto', 'important');
    if (root) {
      root.style.setProperty('overflow', 'visible', 'important');
      root.style.setProperty('height', 'auto', 'important');
      root.style.setProperty('min-height', '100vh', 'important');
    }

    return () => {
      html.style.overflowY = prev.htmlOverflowY;
      html.style.overflowX = prev.htmlOverflowX;
      html.style.height = prev.htmlHeight;
      body.style.overflowY = prev.bodyOverflowY;
      body.style.overflowX = prev.bodyOverflowX;
      body.style.height = prev.bodyHeight;
      if (root) {
        root.style.overflow = prev.rootOverflow;
        root.style.height = prev.rootHeight;
        root.style.minHeight = prev.rootMinHeight;
      }
    };
  }, []);

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
      try {
        // Email estável por sessão: evita criar um rascunho novo a cada autosave quando o usuário ainda não preencheu email
        let emailToSave = formData.email?.trim().toLowerCase();
        if (!emailToSave) {
          const stored = sessionStorage.getItem(draftSessionKey);
          if (stored) {
            emailToSave = stored;
          } else {
            const phoneOrWhatsapp = (formData.phone?.replace(/\D/g, '') || formData.whatsapp?.replace(/\D/g, '') || '').slice(-11) || 'anon';
            emailToSave = `lead_${survey.id.slice(0, 8)}_${phoneOrWhatsapp}_${Date.now().toString(36)}@temp.primecamp`;
            sessionStorage.setItem(draftSessionKey, emailToSave);
          }
        }

        const totalDraftSteps = (survey.questions?.length || 0) + 1;
        const effectiveCurrentStep = hasRequiredPersonalData(formData)
          ? clampStepIndex(currentStep, totalDraftSteps)
          : 0;
        const payload = {
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
          current_step: effectiveCurrentStep,
          form_data: formData
        };

        // Evita salvar payload idêntico repetidamente (reduz spam e travamentos)
        const payloadHash = JSON.stringify(payload);
        if (lastDraftPayloadRef.current === payloadHash) {
          return;
        }

        setSaving(true);
        const { data, error } = await apiClient.invokeFunction('job-application-save-draft', {
          ...payload
        });

        if (error) throw error;

        if (data?.draft_id) {
          lastDraftPayloadRef.current = payloadHash;
          hasLoggedDraftErrorRef.current = false;
          setDraftId(data.draft_id);
          setLastSaved(new Date());
        }
      } catch (error) {
        // Evita poluir console com centenas de erros iguais durante digitação
        if (!hasLoggedDraftErrorRef.current) {
          console.warn('Erro ao salvar rascunho:', error);
          hasLoggedDraftErrorRef.current = true;
        }
      } finally {
        setSaving(false);
      }
    }, 2000);
  }, [survey, formData, currentStep, draftSessionKey]);

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
          const { data: backendDraft, error } = await from('job_application_drafts')
            .select('*')
            .eq('survey_id', survey.id)
            .eq('email', parsed.email.trim().toLowerCase())
            .maybeSingle()
            .execute();

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
            
            const restoredStep = Number(backendDraft.current_step);
            const personalErrors = getPersonalDataErrors(mergedData);
            const safeRestoredStep = Object.keys(personalErrors).length === 0
              ? Number.isFinite(restoredStep) ? Math.max(Math.trunc(restoredStep), 0) : 0
              : 0;
            setFormData(mergedData);
            setCurrentStep(safeRestoredStep);
            if (Object.keys(personalErrors).length > 0) {
              setErrors(personalErrors);
            }
            setDraftId(backendDraft.id);
            setLastSaved(new Date(backendDraft.last_saved_at));

            if (Object.keys(personalErrors).length > 0) {
              toast({
                title: "Complete os dados pessoais",
                description: `Falta preencher ou corrigir: ${formatMissingPersonalFields(personalErrors)}.`,
                variant: "destructive",
              });
            } else {
              toast({
                title: "Dados recuperados!",
                description: "Seus dados foram restaurados automaticamente.",
              });
            }
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
      // Usar API pública para buscar vaga por slug (não precisa de autenticação)
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.ativafix.com/api';
      const response = await fetch(`${API_URL}/public/vaga/${slug}`);
      
      if (!response.ok) {
        let errorData: any = null;
        try {
          errorData = await response.json();
        } catch {
          errorData = null;
        }
        console.error("Erro ao buscar vaga:", {
          slug,
          status: response.status,
          error: errorData?.error || response.statusText,
        });
        navigate("/404");
        return;
      }
      
      const result = await response.json();
      const data = result.data;

      if (!data) {
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
      };

      setSurvey(normalizedSurvey);
    } catch (error) {
      console.error("Erro ao buscar formulário:", error);
      navigate("/404");
    } finally {
      setLoading(false);
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
  const safeCurrentStep = clampStepIndex(currentStep, totalSteps);
  const activeStep = steps[safeCurrentStep] || steps[0];
  const progressPercentage = ((safeCurrentStep + 1) / totalSteps) * 100;
  const hasStartedApplication = Boolean(
    formData.name.trim() ||
    formData.email.trim() ||
    formData.phone.trim() ||
    formData.whatsapp.trim() ||
    Object.values(formData.responses || {}).some((value) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && String(value).trim() !== '';
    })
  );
  const supportWhatsAppNumber = useMemo(
    () => normalizeWhatsAppLinkNumber(survey?.support_whatsapp),
    [survey?.support_whatsapp]
  );
  const supportMessage = useMemo(() => {
    const candidateName = formData.name.trim() || 'candidato(a)';
    const jobTitle = survey?.title || survey?.position_title || 'vaga';
    return encodeURIComponent(
      `Olá! Sou ${candidateName} e estou preenchendo a candidatura para ${jobTitle}. Preciso de ajuda para finalizar.`
    );
  }, [formData.name, survey?.position_title, survey?.title]);
  const supportWhatsAppUrl = `https://wa.me/${supportWhatsAppNumber}?text=${supportMessage}`;

  useEffect(() => {
    if (currentStep !== safeCurrentStep) {
      setCurrentStep(safeCurrentStep);
    }
  }, [currentStep, safeCurrentStep]);

  useEffect(() => {
    if (!survey || submitted || !hasStartedApplication) return;

    const handleMouseLeave = (event: MouseEvent) => {
      if (showExitIntentModal || event.clientY > 12) return;
      setShowExitIntentModal(true);
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [hasStartedApplication, showExitIntentModal, submitted, survey]);

  /* ---------- validação ---------- */
  const validateStep = (stepIndex: number) => {
    const newErrors: Record<string, string> = {};

    if (stepIndex === 0) {
      Object.assign(newErrors, getPersonalDataErrors(formData));
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
  // Ordem dos campos no Step 0 — usada pra rolar até o primeiro campo com erro
  const PERSONAL_FIELD_ORDER = ['name', 'email', 'age', 'cep', 'address', 'whatsapp'] as const;

  const focusFirstError = (currentErrors: Record<string, string>) => {
    if (typeof window === 'undefined') return;
    const ids = safeCurrentStep === 0
      ? PERSONAL_FIELD_ORDER.filter((id) => currentErrors[id])
      : Object.keys(currentErrors);
    const firstId = ids[0];
    if (!firstId) return;
    // Pequeno delay para o React renderizar o estado de erro antes do scroll/focus.
    requestAnimationFrame(() => {
      const el = document.getElementById(firstId);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      try {
        (el as HTMLInputElement).focus({ preventScroll: true });
      } catch {
        // alguns componentes (ex.: Select) não aceitam focus direto — ignora.
      }
    });
  };

  const handleNext = () => {
    const isValid = validateStep(safeCurrentStep);
    if (!isValid) {
      const description = safeCurrentStep === 0
        ? 'Preencha os campos destacados em vermelho para continuar.'
        : 'Por favor, responda a pergunta obrigatória antes de continuar.';
      toast({
        title: 'Atenção',
        description,
        variant: 'destructive',
      });
      // Rola até o primeiro campo com erro (ajuda principalmente no mobile).
      setErrors((current) => {
        focusFirstError(current);
        return current;
      });
      return;
    }
    if (safeCurrentStep < totalSteps - 1) setCurrentStep(safeCurrentStep + 1);
    else handleSubmit();
  };
  const handlePrevious = () => safeCurrentStep > 0 && setCurrentStep(safeCurrentStep - 1);


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

    if (!validateStep(safeCurrentStep)) {
      toast({
        title: "Atenção",
        description: "Confira os campos obrigatórios desta etapa antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    let idempotencyKey: string;
    try {
      idempotencyKey = crypto.randomUUID();
    } catch {
      idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    }

    const personalErrors = getPersonalDataErrors(formData);
    if (Object.keys(personalErrors).length > 0) {
      setErrors(personalErrors);
      setCurrentStep(0);
      toast({
        title: "Complete os dados pessoais",
        description: `Falta preencher ou corrigir: ${formatMissingPersonalFields(personalErrors)}.`,
        variant: "destructive",
      });
      return;
    }

    const submissionData = {
      survey_id: survey.id,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.whatsapp?.trim() || null,
      age: formData.age ? parseInt(formData.age, 10) : null,
      cep: formData.cep?.trim() || null,
      address: formData.address?.trim() || null,
      whatsapp: formData.whatsapp?.trim() || null,
      instagram: formData.instagram?.trim() || null,
      responses: formData.responses || {},
    };

    const controller = new AbortController();
    const SUBMIT_TIMEOUT_MS = 120000;
    const timeoutId = window.setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);
    setSubmitting(true);

    try {
      const response = await apiClient.post(
        '/functions/job-application-submit',
        submissionData,
        { 'Idempotency-Key': idempotencyKey },
        { signal: controller.signal }
      );

      const responseData = response.data;

      if (response.error) {
        const errObj = response.error as { message?: string; status?: number; data?: Record<string, unknown> };
        const errorMessage = errObj?.message || 'Erro desconhecido';
        const statusCode = errObj?.status;
        const errorData = errObj?.data || {};

        if (/aborted|AbortError|signal is aborted|interrompida/i.test(errorMessage)) {
          toast({
            title: 'Tempo limite ou conexão instável',
            description:
              'Não recebemos resposta do servidor a tempo. Verifique a internet e toque em «Enviar Candidatura» novamente.',
            variant: 'destructive',
          });
          return;
        }

        if (statusCode === 409 && errorData.code === 'ALREADY_REGISTERED') {
          toast({
            title: 'Cadastro existente',
            description:
              (errorData.message as string) ||
              'Você já possui cadastro no banco de dados. Faça login para acessar sua conta ou use outro e-mail para esta candidatura.',
            variant: 'destructive',
          });
          return;
        }

        if (statusCode === 409 || errorMessage.includes('já se candidatou')) {
          const existingId = (errorData.job_response_id as string) || responseData?.job_response_id;
          console.warn('[JobApplication] Candidatura duplicada:', {
            email: formData.email.trim().toLowerCase(),
            survey_id: survey.id,
            survey_title: survey.title || survey.position_title,
            existing_job_response_id: existingId,
            status_code: statusCode,
          });

          setExistingJobResponseId(existingId || null);
          setShowAlreadyAppliedModal(true);
          return;
        }

        if (statusCode === 400 && /encerrad/i.test(errorMessage)) {
          toast({
            title: 'Inscrições encerradas',
            description: errorMessage,
            variant: 'destructive',
          });
          return;
        }

        throw new Error(errorMessage);
      }

      const jobResponseId = responseData?.submissionId || responseData?.job_response_id;
      const candidateInfo = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.whatsapp?.trim() || null,
        age: formData.age ? parseInt(formData.age, 10) : null,
        job_response_id: jobResponseId || null,
        survey_id: survey.id,
      };

      sessionStorage.setItem('candidate_disc_info', JSON.stringify(candidateInfo));
      sessionStorage.removeItem(draftSessionKey);

      setSubmitted(true);
      toast({
        title: 'Candidatura enviada com sucesso! 🎉',
        description: 'Sua candidatura foi recebida com sucesso!',
      });

      // Não bloquear a UI: análise por IA pode demorar ou falhar sem impedir o candidato de seguir
      void (async () => {
        try {
          const aiResp = await apiClient.invokeFunction('analyze-candidate-responses', {
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
            },
          });

          if (!aiResp.error && aiResp.data?.analysis) {
            sessionStorage.setItem('candidate_ai_analysis', JSON.stringify(aiResp.data.analysis));
          }
        } catch (err) {
          console.error('Erro ao analisar candidato:', err);
        }
      })();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao enviar a candidatura.',
        variant: 'destructive',
      });
    } finally {
      window.clearTimeout(timeoutId);
      setSubmitting(false);
    }
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
            <SelectContent position="popper" sideOffset={4}>
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

  if (survey.is_active === false) {
    return (
      <div className="min-h-screen job-form-scroll" style={{ backgroundColor: 'hsl(var(--job-application))' }}>
        <Helmet>
          <title>{survey.title} – Inscrições encerradas</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <style>{themeCSS}</style>
        <div className="flex items-center justify-center p-4 min-h-screen" style={{ backgroundColor: 'hsl(var(--job-bg))' }}>
          <Card className="w-full max-w-lg border-2 shadow-lg" style={{ backgroundColor: 'hsl(var(--job-card))', borderColor: 'hsl(var(--job-card-border))' }}>
            <CardHeader className="text-center space-y-3 pb-2">
              <Badge variant="secondary" className="mx-auto w-fit gap-1 border border-neutral-400">
                <Ban className="h-3 w-3" />
                Encerrado
              </Badge>
              <CardTitle className="text-xl sm:text-2xl" style={{ color: 'hsl(var(--job-text))' }}>
                {survey.title}
              </CardTitle>
              <p className="text-sm font-medium" style={{ color: 'hsl(var(--job-text-muted))' }}>
                {survey.position_title}
              </p>
            </CardHeader>
            <CardContent className="space-y-4 text-center pb-8">
              <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--job-text-muted))' }}>
                As inscrições para esta vaga foram encerradas. Você ainda pode conferir outras oportunidades no portal.
              </p>
              <Button
                type="button"
                onClick={() => navigate('/vagas')}
                style={{ backgroundColor: 'hsl(var(--job-primary))', color: 'white' }}
              >
                Ver outras vagas
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <>
        <Helmet>
          <title>Candidatura enviada | Prime Camp</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <style>{themeCSS}</style>
        <div className="min-h-screen job-form-scroll" style={{ backgroundColor: 'hsl(var(--job-bg))' }}>
          <div className="flex items-center justify-center p-4 min-h-screen">
            <Card className="w-full max-w-lg text-center border-2 shadow-lg" style={{ backgroundColor: 'hsl(var(--job-card))', borderColor: 'hsl(var(--job-primary))' }}>
              <CardContent className="pt-8 pb-8 px-4">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'hsl(var(--job-primary))' }}>
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: 'hsl(var(--job-text))' }}>
                  Candidatura enviada! 🎉
                </h1>
                <p className="mb-6 text-base sm:text-lg leading-relaxed" style={{ color: 'hsl(var(--job-text-muted))' }}>
                  Sua candidatura foi recebida com sucesso. Nossa equipe vai avaliar suas informações e entrar em contato pelos dados informados.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => navigate('/vagas')}>
                    Ver outras vagas
                  </Button>
                </div>
                <div className="flex items-center justify-center gap-6 text-sm flex-wrap" style={{ color: 'hsl(var(--job-text-muted))' }}>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" style={{ color: 'hsl(var(--job-primary))' }} />
                    <span>Cadastro recebido</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  /* ---------- página principal ---------- */
  return (
    <>
      {/* Modal: Já se candidatou - Renderizado diretamente para evitar tree-shaking */}
      <Dialog open={showAlreadyAppliedModal} onOpenChange={setShowAlreadyAppliedModal}>
        <DialogContent className="sm:max-w-[500px]" style={{ backgroundColor: 'hsl(var(--job-card))', borderColor: 'hsl(var(--job-card-border))' }}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-full p-2" style={{ backgroundColor: 'hsl(var(--job-primary) / 0.1)' }}>
                <AlertTriangle className="h-6 w-6" style={{ color: 'hsl(var(--job-primary))' }} />
              </div>
              <DialogTitle className="text-xl" style={{ color: 'hsl(var(--job-text))' }}>
                Candidatura Já Enviada
              </DialogTitle>
            </div>
            <DialogDescription className="text-base pt-2" style={{ color: 'hsl(var(--job-text-muted))' }}>
              Você já se candidatou para esta vaga anteriormente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="p-4 rounded-lg border" style={{ backgroundColor: 'hsl(var(--job-badge))', borderColor: 'hsl(var(--job-card-border))' }}>
              <p className="text-sm font-medium mb-2" style={{ color: 'hsl(var(--job-text))' }}>
                <strong>Vaga:</strong> {survey?.title || survey?.position_title}
              </p>
              <p className="text-sm" style={{ color: 'hsl(var(--job-text-muted))' }}>
                <strong>Email:</strong> {formData.email.trim()}
              </p>
              {existingJobResponseId && (
                <p className="text-xs mt-2 opacity-70" style={{ color: 'hsl(var(--job-text-muted))' }}>
                  ID: {existingJobResponseId.substring(0, 8)}...
                </p>
              )}
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--job-badge))' }}>
              <Info className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: 'hsl(var(--job-primary))' }} />
              <div className="text-sm space-y-1" style={{ color: 'hsl(var(--job-text-muted))' }}>
                <p>Sua candidatura já está em análise.</p>
                <p>Seu perfil ficará salvo em nosso banco de talentos e, caso haja compatibilidade com esta ou futuras vagas, entraremos em contato pelo e-mail ou WhatsApp informado.</p>
                <p>Obrigado pelo interesse em fazer parte da nossa equipe.</p>
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowAlreadyAppliedModal(false)}
              style={{ borderColor: 'hsl(var(--job-card-border))' }}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExitIntentModal} onOpenChange={setShowExitIntentModal}>
        <DialogContent className="sm:max-w-[520px] rounded-2xl p-0 overflow-hidden" style={{ backgroundColor: 'hsl(var(--job-card))', borderColor: 'hsl(var(--job-card-border))' }}>
          <div className="h-1 bg-green-600" />
          <div className="p-6">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-full bg-green-50 p-2 text-green-600 dark:bg-green-500/10 dark:text-green-300">
                <WhatsAppIcon className="h-6 w-6" />
              </div>
              <DialogTitle className="text-xl" style={{ color: 'hsl(var(--job-text))' }}>
                Está com dificuldade para finalizar?
              </DialogTitle>
            </div>
            <DialogDescription className="text-base pt-2" style={{ color: 'hsl(var(--job-text-muted))' }}>
              Seu progresso foi salvo. Continue a candidatura ou fale com nosso suporte se precisar de ajuda.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="rounded-xl border p-4" style={{ backgroundColor: 'hsl(var(--job-badge))', borderColor: 'hsl(var(--job-card-border))' }}>
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                <div className="space-y-1 text-sm" style={{ color: 'hsl(var(--job-text-muted))' }}>
                  <p><strong style={{ color: 'hsl(var(--job-text))' }}>Você já avançou {Math.round(progressPercentage)}%.</strong></p>
                  <p>Se tiver dúvida em alguma pergunta, o suporte ajuda sem perder suas respostas.</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowExitIntentModal(false)}
              style={{ borderColor: 'hsl(var(--job-card-border))' }}
            >
              Continuar candidatura
            </Button>
            <Button
              type="button"
              onClick={() => window.open(supportWhatsAppUrl, '_blank', 'noopener,noreferrer')}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <WhatsAppIcon className="mr-2 h-4 w-4" />
              Falar no WhatsApp
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="job-form-scroll" style={{ backgroundColor: 'hsl(var(--job-bg))' }}>
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

      <Button
        type="button"
        onClick={() => window.open(supportWhatsAppUrl, '_blank', 'noopener,noreferrer')}
        className="fixed bottom-4 right-4 z-40 h-12 rounded-full bg-green-600 px-4 text-white shadow-lg hover:bg-green-700 sm:bottom-6 sm:right-6"
      >
        <WhatsAppIcon className="mr-2 h-5 w-5" />
        Ajuda no WhatsApp
      </Button>

      {/* Header da vaga - Design Profissional com Gradiente */}
      <header 
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, hsl(var(--job-gradient-start)) 0%, hsl(var(--job-gradient-end)) 100%)`,
        }}
      >
        {/* Pattern overlay */}
        <div className="absolute inset-0 hero-pattern opacity-20" />
        
        <div className="relative max-w-4xl mx-auto px-4 py-6 sm:py-8 md:py-10">
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
            <ThemeToggle variant="button" className="bg-white/20 hover:bg-white/30 text-white border-0" />
          </div>
          
          {/* Logo */}
          <div className="flex items-center justify-center mb-4">
            <a href="/vagas" className="bg-white rounded-xl p-2 sm:p-3 shadow-lg hover:shadow-xl transition-shadow">
              <img
                src="https://api.ativacrm.com/public/logoBanner-1744208731220-626790695.png"
                alt="Prime Camp"
                className="h-8 sm:h-10 md:h-12 w-auto object-contain"
              />
            </a>
          </div>
          
          {/* Título da vaga */}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white text-center drop-shadow-md mb-3">
            {survey.title || survey.position_title}
          </h1>
          
          {/* Badges informativos */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <Badge className="gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0 text-xs sm:text-sm px-2 sm:px-3 py-1">
              <Building className="w-3 h-3 sm:w-4 sm:h-4" />
              {survey.company_name || survey.department}
            </Badge>
            {survey.location && (
              <Badge className="gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0 text-xs sm:text-sm px-2 sm:px-3 py-1">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{survey.location}</span>
                <span className="sm:hidden">{survey.location.split(',')[0]}</span>
              </Badge>
            )}
            {(survey.salary_min || survey.salary_max || survey.salary_range) && (
              <Badge className="gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0 text-xs sm:text-sm px-2 sm:px-3 py-1">
                <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                {survey.salary_min && survey.salary_max
                  ? `R$ ${survey.salary_min.toLocaleString()} - R$ ${survey.salary_max.toLocaleString()}`
                  : survey.salary_range || 'A combinar'}
              </Badge>
            )}
            {survey.work_modality && (
              <Badge className="gap-1.5 bg-white text-[hsl(var(--job-primary))] border-0 text-xs sm:text-sm px-2 sm:px-3 py-1 font-semibold shadow-md">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="capitalize">{survey.work_modality}</span>
              </Badge>
            )}
          </div>
          
          {/* Horário de trabalho */}
          {survey.work_schedule && (
            <p className="text-white/90 text-xs sm:text-sm text-center mt-3">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1.5" />
              {survey.work_schedule}
            </p>
          )}
        </div>
        
        {/* Curva decorativa */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-6 sm:h-10">
            <path d="M0 60V30C240 10 480 0 720 0C960 0 1200 10 1440 30V60H0Z" fill="hsl(var(--job-bg))" />
          </svg>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        {/* Card do Formulário */}
        <Card 
          className="form-card shadow-lg border-0 overflow-hidden"
          style={{ backgroundColor: 'hsl(var(--job-card))' }}
        >
          {/* Barra colorida no topo */}
          <div 
            className="h-1"
            style={{ background: `linear-gradient(90deg, hsl(var(--job-gradient-start)), hsl(var(--job-gradient-end)))` }}
          />
          
          <CardHeader className="text-center pb-4 pt-6">
            <CardTitle className="text-xl sm:text-2xl flex items-center justify-center gap-2 sm:gap-3" style={{ color: 'hsl(var(--job-text))' }}>
              {safeCurrentStep === 0 ? (
                <>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, hsl(var(--job-gradient-start)), hsl(var(--job-gradient-end)))` }}>
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <span>Dados Pessoais</span>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, hsl(var(--job-gradient-start)), hsl(var(--job-gradient-end)))` }}>
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <span>{activeStep.title}</span>
                </>
              )}
            </CardTitle>
          </CardHeader>

              <CardContent className="space-y-6">
                <ErrorBoundary
                  fallback={
                    <div className="py-6 text-center space-y-4" style={{ color: 'hsl(var(--job-text))' }}>
                      <AlertTriangle className="h-12 w-12 mx-auto" style={{ color: 'hsl(var(--job-primary))' }} />
                      <p className="font-medium">Ocorreu um problema ao exibir este passo.</p>
                      <p className="text-sm" style={{ color: 'hsl(var(--job-text-muted))' }}>Seus dados foram salvos. Clique em continuar para seguir.</p>
                      <Button onClick={() => window.location.reload()} style={{ background: 'hsl(var(--job-primary))' }}>
                        Continuar
                      </Button>
                    </div>
                  }
                >
                {/* key por etapa evita conflito de portal (removeChild) ao trocar de passo com Select aberto */}
                {safeCurrentStep === 0 ? (
                  <div key="step-0">
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
                        <Label htmlFor="age" className="text-sm sm:text-base font-medium" style={{ color: 'hsl(var(--job-text))' }}>Idade *</Label>
                        <Select value={formData.age || ''} onValueChange={(age) => setFormData({ ...formData, age })}>
                          <SelectTrigger
                            id="age"
                            className={`h-11 sm:h-12 text-base border focus-visible:ring-2 focus-visible:ring-[hsl(var(--job-primary))] ${errors.age ? 'border-red-500' : ''}`}
                            style={fieldStyle}
                          >
                            <SelectValue placeholder="Selecione a idade" />
                          </SelectTrigger>
                          <SelectContent position="popper" sideOffset={4} className="max-h-72">
                            {AGE_OPTIONS.map((age) => (
                              <SelectItem key={age} value={age}>{age} anos</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          Endereço completo *
                        </Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          autoComplete="street-address"
                          className={`h-11 sm:h-12 text-base border focus-visible:ring-2 focus-visible:ring-[hsl(var(--job-primary))] ${errors.address ? 'border-red-500' : ''}`}
                          style={fieldStyle}
                          placeholder="Rua, número, bairro, cidade/UF"
                        />
                        {errors.address && <p className="text-red-600 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{errors.address}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="whatsapp" className="flex items-center gap-2 text-sm sm:text-base font-medium" style={{ color: 'hsl(var(--job-text))' }}>
                          <WhatsAppIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                          WhatsApp *
                        </Label>
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
                        <Label htmlFor="instagram" className="flex items-center gap-2 text-sm sm:text-base font-medium" style={{ color: 'hsl(var(--job-text))' }}>
                          <InstagramLogo className="h-4 w-4 sm:h-5 sm:w-5" />
                          Instagram
                        </Label>
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

                    </div>
                  </div>
                ) : (
                  <div key={`step-${safeCurrentStep}`} className="max-w-2xl mx-auto">
                    {"question" in activeStep && renderQuestion(activeStep.question)}
                  </div>
                )}
                </ErrorBoundary>
              </CardContent>
        </Card>

            {/* Footer fixo com progresso e navegação - Design Profissional */}
            <div 
              className="mt-6 rounded-xl shadow-lg overflow-hidden"
              style={{ backgroundColor: 'hsl(var(--job-card))' }}
            >
              {/* Barra de progresso no topo do footer */}
              <div className="h-1 bg-gray-100 dark:bg-gray-800">
                <div 
                  className="h-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${progressPercentage}%`,
                    background: `linear-gradient(90deg, hsl(var(--job-gradient-start)), hsl(var(--job-gradient-end)))`
                  }}
                />
              </div>
              
              <div className="p-3 sm:p-4">
                {/* Info da etapa */}
                <div className="flex justify-between items-center text-xs sm:text-sm mb-3 flex-wrap gap-2" style={{ color: 'hsl(var(--job-text-muted))' }}>
                  <span className="font-medium">Etapa {safeCurrentStep + 1} de {totalSteps}</span>
                  <div className="flex items-center gap-3">
                    {saving && (
                      <span className="flex items-center gap-1.5">
                        <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                        Salvando...
                      </span>
                    )}
                    {!saving && lastSaved && (
                      <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                        <CheckCircle className="w-3 h-3" />
                        Salvo
                      </span>
                    )}
                    <span className="font-semibold" style={{ color: 'hsl(var(--job-primary))' }}>
                      {Math.round(progressPercentage)}% concluído
                    </span>
                  </div>
                </div>

                {/* Botões de navegação */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={safeCurrentStep === 0}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-11 sm:h-12 px-4 sm:px-6 text-sm font-medium border-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
                    style={{ borderColor: 'hsl(var(--job-card-border))' }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Anterior</span>
                  </Button>

                  <Button
                    onClick={handleNext}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 h-11 sm:h-12 px-6 sm:px-8 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ 
                      background: `linear-gradient(135deg, hsl(var(--job-gradient-start)), hsl(var(--job-gradient-end)))`,
                    }}
                    aria-busy={submitting}
                  >
                    {submitting ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full shrink-0" aria-hidden />
                    ) : null}
                    <span>
                      {submitting && safeCurrentStep === totalSteps - 1
                        ? 'Enviando…'
                        : safeCurrentStep === totalSteps - 1
                          ? 'Enviar Candidatura'
                          : 'Próxima'}
                    </span>
                    {!submitting && (safeCurrentStep === totalSteps - 1 ? <Send className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                  </Button>
                </div>
              </div>
            </div>
      </main>

      {/* Footer com gradiente */}
      <footer
        className="mt-8"
        style={{
          background: `linear-gradient(135deg, hsl(var(--job-gradient-start)) 0%, hsl(var(--job-gradient-end)) 100%)`,
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="bg-white rounded-lg p-2 shadow-md">
              <img
                src="https://api.ativacrm.com/public/logoBanner-1744208731220-626790695.png"
                alt="Prime Camp"
                className="h-5 sm:h-6 w-auto object-contain"
              />
            </div>
          </div>
          <p className="text-white/90 text-xs sm:text-sm">
            © {new Date().getFullYear()} Prime Camp. Todas as vagas são atualizadas regularmente.
          </p>
          <a 
            href="/vagas" 
            className="inline-block mt-2 text-white/80 hover:text-white text-xs sm:text-sm underline transition-colors"
          >
            Ver todas as vagas
          </a>
        </div>
      </footer>
    </div>
    </>
  );
}
