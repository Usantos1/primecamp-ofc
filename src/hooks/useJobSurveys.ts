import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';
import { apiClient } from '@/integrations/api/client';
import { toast } from 'sonner';

export interface JobSurvey {
  id: string;
  title: string;
  description: string;
  position_title: string;
  department: string | null;
  slug: string | null;
  is_active: boolean;
  questions: any[];
  created_at: string;
  created_by: string;
  salary_range?: string | null;
  contract_type?: string | null;
  location?: string | null;
  benefits?: string[] | null;
  requirements?: string[] | null;
  company_logo?: string | null;
  company_name?: string | null;
  work_schedule?: string | null;
  work_modality?: string | null;
  work_days?: string[] | null;
  daily_schedule?: { [key: string]: { start: string; end: string } } | null;
  lunch_break?: string | null;
  weekly_hours?: number | null;
  salary_min?: number | null;
  salary_max?: number | null;
  has_commission?: boolean | null;
  commission_details?: string | null;
  published_at?: string | null;
  expires_at?: string | null;
}

export interface JobApplicationStatus {
  id: string;
  protocol: string;
  survey_id: string;
  name: string;
  email: string;
  status: 'received' | 'reviewing' | 'interview' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  survey?: {
    title: string;
    position_title: string;
  };
}

interface JobSurveysFilters {
  search?: string;
  location?: string;
  modality?: string;
  contract_type?: string;
  salary_min?: number;
  salary_max?: number;
  department?: string;
  is_active?: boolean;
}

interface JobSurveysOptions {
  filters?: JobSurveysFilters;
  page?: number;
  pageSize?: number;
}

export const useJobSurveys = (options: JobSurveysOptions = {}) => {
  const queryClient = useQueryClient();
  const { filters = {}, page = 1, pageSize = 12 } = options;

  const queryKey = ['job-surveys', filters, page, pageSize];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('job_surveys')
        .select('*', { count: 'exact' }).execute();

      // Aplicar filtros
      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        query = query.or(`title.ilike.%${searchTerm}%,position_title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,department.ilike.%${searchTerm}%`);
      }

      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }

      if (filters.modality) {
        query = query.eq('work_modality', filters.modality);
      }

      if (filters.contract_type) {
        query = query.eq('contract_type', filters.contract_type);
      }

      if (filters.department) {
        query = query.ilike('department', `%${filters.department}%`);
      }

      if (filters.salary_min) {
        query = query.gte('salary_min', filters.salary_min);
      }

      if (filters.salary_max) {
        query = query.lte('salary_max', filters.salary_max);
      }

      // Ordenação e paginação
      query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      const formattedData = (data || []).map(item => ({
        ...item,
        work_days: Array.isArray(item.work_days) ? item.work_days as string[] : [],
        daily_schedule: typeof item.daily_schedule === 'object' && item.daily_schedule !== null
          ? item.daily_schedule as { [key: string]: { start: string; end: string } }
          : {},
        benefits: Array.isArray(item.benefits) ? item.benefits as string[] : [],
        requirements: Array.isArray(item.requirements) ? item.requirements as string[] : [],
        questions: Array.isArray(item.questions) ? item.questions : []
      })) as JobSurvey[];

      return {
        data: formattedData,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
    staleTime: 30000, // 30 segundos
    gcTime: 300000, // 5 minutos
  });

  return {
    surveys: data?.data || [],
    total: data?.total || 0,
    page: data?.page || 1,
    totalPages: data?.totalPages || 0,
    loading: isLoading,
    error,
    refetch
  };
};

export const useJobSurvey = (slugOrId: string) => {
  return useQuery({
    queryKey: ['job-survey', slugOrId],
    queryFn: async () => {
      // Tentar buscar por slug primeiro
      let query = supabase
        .from('job_surveys')
        .select('*')
        .execute().eq('slug', slugOrId)
        .eq('is_active', true)
        .single();

      let { data, error } = await query;

      // Se não encontrar por slug, tentar por ID
      if (error && slugOrId.length === 36) {
        query = supabase
          .from('job_surveys')
          .select('*')
          .execute().eq('id', slugOrId)
          .eq('is_active', true)
          .single();
        
        const result = await query;
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      return {
        ...data,
        work_days: Array.isArray(data.work_days) ? data.work_days as string[] : [],
        daily_schedule: typeof data.daily_schedule === 'object' && data.daily_schedule !== null
          ? data.daily_schedule as { [key: string]: { start: string; end: string } }
          : {},
        benefits: Array.isArray(data.benefits) ? data.benefits as string[] : [],
        requirements: Array.isArray(data.requirements) ? data.requirements as string[] : [],
        questions: Array.isArray(data.questions) ? data.questions : []
      } as JobSurvey;
    },
    enabled: !!slugOrId,
    staleTime: 60000, // 1 minuto
  });
};

export const useJobApplicationStatus = (protocol: string, email?: string) => {
  return useQuery({
    queryKey: ['job-application-status', protocol, email],
    queryFn: async () => {
      // O protocolo é gerado como APP-{primeira parte do UUID}
      // Exemplo: APP-A1B2C3D4 (onde A1B2C3D4 é o início do UUID)
      
      if (protocol) {
        // Tentar usar a edge function get-candidate-data que já existe
        try {
          const { data: functionData, error: functionError } = await apiClient.invokeFunction('get-candidate-data', {
            protocol
          });
          
          if (!functionError && functionData?.success && functionData?.data) {
            // Buscar a resposta completa usando os dados retornados
            const { data: response, error: responseError } = await supabase
              .from('job_responses')
              .select(`
                id,
                survey_id,
                name,
                email,
                created_at,
                job_surveys (
                  title,
                  position_title
                )
              .execute()`)
              .eq('email', functionData.data.email)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (responseError && responseError.code !== 'PGRST116') throw responseError;
            
            if (response) {
              return {
                id: response.id,
                protocol: protocol,
                survey_id: response.survey_id,
                name: response.name,
                email: response.email,
                status: 'received' as const,
                created_at: response.created_at,
                updated_at: response.created_at,
                survey: Array.isArray(response.job_surveys) 
                  ? response.job_surveys[0] 
                  : response.job_surveys
              } as JobApplicationStatus;
            }
          }
        } catch (err) {
          console.error('Error fetching by protocol via function:', err);
        }
      }
      
      // Fallback: buscar por email (se fornecido)
      if (email) {
        const { data, error } = await supabase
          .from('job_responses')
          .select(`
            id,
            survey_id,
            name,
            email,
            created_at,
            job_surveys (
              title,
              position_title
            )
          .execute()`)
          .eq('email', email.toLowerCase().trim())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          // Gerar protocolo a partir do ID (mesma lógica da edge function)
          const generatedProtocol = protocol || `APP-${data.id.split('-')[0].toUpperCase()}`;
          
          return {
            id: data.id,
            protocol: generatedProtocol,
            survey_id: data.survey_id,
            name: data.name,
            email: data.email,
            status: 'received' as const,
            created_at: data.created_at,
            updated_at: data.created_at,
            survey: Array.isArray(data.job_surveys) 
              ? data.job_surveys[0] 
              : data.job_surveys
          } as JobApplicationStatus;
        }
      }
      
      throw new Error('Candidatura não encontrada');
    },
    enabled: !!(protocol || email),
    staleTime: 60000,
  });
};

export const useJobSurveyStats = (surveyId?: string) => {
  return useQuery({
    queryKey: ['job-survey-stats', surveyId],
    queryFn: async () => {
      if (!surveyId) return null;

      const [responsesResult, viewsResult] = await Promise.all([
        supabase
          .from('job_responses')
          .select('id, created_at', { count: 'exact' })
          .execute().eq('survey_id', surveyId),
        supabase
          .from('job_survey_views')
          .select('id', { count: 'exact' })
          .execute().eq('survey_id', surveyId)
          .catch(() => ({ data: null, count: 0, error: null })) // Tabela pode não existir
      ]);

      const totalApplications = responsesResult.count || 0;
      const totalViews = viewsResult.count || 0;

      // Calcular aplicações por dia (últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentApplications } = await supabase
        .from('job_responses')
        .select('created_at')
        .execute().eq('survey_id', surveyId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      const applicationsByDay = (recentApplications || []).reduce((acc, app) => {
        const date = new Date(app.created_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const conversionRate = totalViews > 0 
        ? ((totalApplications / totalViews) * 100).toFixed(2)
        : '0.00';

      return {
        totalApplications,
        totalViews,
        conversionRate: parseFloat(conversionRate),
        applicationsByDay
      };
    },
    enabled: !!surveyId,
    staleTime: 30000,
  });
};

