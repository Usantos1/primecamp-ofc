import { useState, useEffect } from 'react';
import { from } from '@/integrations/db/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface NPSSurvey {
  id: string;
  title: string;
  description?: string;
  questions: NPSQuestion[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  allowed_respondents?: string[];
  target_employees?: string[];
}

export interface NPSQuestion {
  id: string;
  type: 'rating' | 'text' | 'scale';
  question: string;
  required: boolean;
  options?: string[];
  scale_min?: number;
  scale_max?: number;
  scale_labels?: { min: string; max: string };
}

export interface NPSResponse {
  id: string;
  survey_id: string;
  user_id: string;
  responses: Record<string, any>;
  created_at: string;
  date: string;
  user_name?: string;
}

export const useNPS = () => {
  const { user, profile } = useAuth();
  const [surveys, setSurveys] = useState<NPSSurvey[]>([]);
  const [responses, setResponses] = useState<NPSResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSurveys = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await from('nps_surveys')
        .select('*')
        .order('created_at', { ascending: false })
        .execute();

      if (error) {
        console.error('Error fetching NPS surveys:', error);
        return;
      }

      const formattedSurveys: NPSSurvey[] = (data || []).map(survey => ({
        id: survey.id,
        title: survey.title,
        description: survey.description,
        questions: (survey.questions as any) || [],
        is_active: survey.is_active,
        created_by: survey.created_by,
        created_at: survey.created_at,
        updated_at: survey.updated_at,
        allowed_respondents: survey.allowed_respondents || [],
        target_employees: survey.target_employees || []
      }));
      
      // Filter surveys based on permissions
      const filteredSurveys = formattedSurveys.filter(survey => {
        // If user is admin, show all surveys for management
        if (profile?.role === 'admin') return true;
        
        // If user is the creator, show all surveys
        if (survey.created_by === user.id) return true;
        
        // For active surveys, show to everyone unless allowed_respondents is specifically set
        if (survey.is_active) {
          // If no allowed_respondents specified, show to everyone
          if (!survey.allowed_respondents || survey.allowed_respondents.length === 0) return true;
          
          // Check if user is in allowed_respondents list
          return survey.allowed_respondents.includes(user.id);
        }
        
        return false;
      });
      
      setSurveys(filteredSurveys);
    } catch (error) {
      console.error('Error in fetchSurveys:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResponses = async () => {
    if (!user) return;
    
    try {
      console.log('[NPS] Buscando respostas...');
      const { data, error } = await from('nps_responses')
        .select('*')
        .order('created_at', { ascending: false })
        .execute();

      console.log('[NPS] Respostas do banco:', data?.length || 0, 'erro:', error);

      if (error) {
        console.error('Error fetching NPS responses:', error);
        return;
      }

      const formattedResponses: NPSResponse[] = (data || []).map(response => ({
        id: response.id,
        survey_id: response.survey_id,
        user_id: response.user_id,
        responses: (response.responses as any) || {},
        created_at: response.created_at,
        date: response.date,
        user_name: 'Usuário'
      }));

      console.log('[NPS] Respostas formatadas:', formattedResponses.length);
      setResponses(formattedResponses);
    } catch (error) {
      console.error('Error in fetchResponses:', error);
    }
  };

  const createSurvey = async (surveyData: Omit<NPSSurvey, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await from('nps_surveys')
        .insert({
          title: surveyData.title,
          description: surveyData.description,
          questions: surveyData.questions as any,
          is_active: surveyData.is_active,
          created_by: user.id,
          allowed_respondents: surveyData.allowed_respondents || [],
          target_employees: surveyData.target_employees || []
        })
        .select('*')
        .single();

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao criar pesquisa NPS",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Pesquisa NPS criada com sucesso"
      });

      fetchSurveys();
      return data;
    } catch (error) {
      console.error('Error creating NPS survey:', error);
    }
  };

  const updateSurvey = async (surveyId: string, updates: Partial<NPSSurvey>) => {
    try {
      const updateData: any = {};
      if (updates.title) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.questions) updateData.questions = updates.questions as any;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      if (updates.allowed_respondents !== undefined) updateData.allowed_respondents = updates.allowed_respondents;
      if (updates.target_employees !== undefined) updateData.target_employees = updates.target_employees;

      const { error } = await from('nps_surveys')
        .eq('id', surveyId)
        .update(updateData)
        .execute();

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao atualizar pesquisa NPS",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Pesquisa NPS atualizada com sucesso"
      });

      fetchSurveys();
    } catch (error) {
      console.error('Error updating NPS survey:', error);
    }
  };

  const deleteSurvey = async (surveyId: string) => {
    try {
      const { error } = await from('nps_surveys')
        .eq('id', surveyId)
        .delete()
        .execute();

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao excluir pesquisa NPS",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Pesquisa NPS excluída com sucesso"
      });

      fetchSurveys();
    } catch (error) {
      console.error('Error deleting NPS survey:', error);
    }
  };

  const submitResponse = async (surveyId: string, responses: Record<string, any>) => {
    if (!user) return;

    try {
      // Verificar se já existe uma resposta para hoje
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await from('nps_responses')
        .select('id')
        .eq('survey_id', surveyId)
        .eq('user_id', user.id)
        .eq('date', today)
        .execute();

      let data, error;
      if (existing && existing.length > 0) {
        // Update existing
        const result = await from('nps_responses')
          .eq('id', existing[0].id)
          .update({ responses })
          .execute();
        data = result.data;
        error = result.error;
      } else {
        // Insert new
        const result = await from('nps_responses')
          .insert({
            survey_id: surveyId,
            user_id: user.id,
            responses,
            date: today
          })
          .select('*')
          .single();
        data = result.data;
        error = result.error;
      }

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao enviar resposta",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Resposta enviada com sucesso"
      });

      fetchResponses();
      return data;
    } catch (error) {
      console.error('Error submitting NPS response:', error);
    }
  };

  const getTodayResponse = (surveyId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const found = responses.find(
      r => r.survey_id === surveyId && 
           r.user_id === user?.id && 
           r.date?.split('T')[0] === today
    );
    console.log('[NPS] getTodayResponse:', surveyId, 'today:', today, 'found:', found, 'responses:', responses.length);
    return found;
  };

  useEffect(() => {
    fetchSurveys();
    fetchResponses();
  }, [user, profile]);

  return {
    surveys,
    responses,
    loading,
    createSurvey,
    updateSurvey,
    deleteSurvey,
    submitResponse,
    getTodayResponse,
    refetch: () => {
      fetchSurveys();
      fetchResponses();
    }
  };
};