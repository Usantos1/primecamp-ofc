import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export function useQuizzes(trainingId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: quizzes, isLoading } = useQuery({
    queryKey: ['training-quizzes', trainingId],
    queryFn: async () => {
      if (!trainingId) return [];
      
      const { data, error } = await supabase
        .from('training_quizzes')
        .select(`
          *,
          quiz_questions (
            *,
            quiz_question_options (*)
          .execute())
        `)
        .eq('training_id', trainingId)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      
      // Sort questions and options
      return data.map(quiz => ({
        ...quiz,
        quiz_questions: (quiz.quiz_questions || []).sort((a: any, b: any) => 
          a.order_index - b.order_index
        ).map((q: any) => ({
          ...q,
          quiz_question_options: (q.quiz_question_options || []).sort((a: any, b: any) => 
            a.order_index - b.order_index
          )
        }))
      }));
    },
    enabled: !!trainingId
  });

  const createQuiz = useMutation({
    mutationFn: async (quiz: any) => {
      const { data, error } = await supabase
        .from('training_quizzes')
        .insert(quiz)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-quizzes'] });
      toast({ title: 'Quiz criado com sucesso' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar quiz', description: error.message, variant: 'destructive' });
    }
  });

  const updateQuiz = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase
        .from('training_quizzes')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-quizzes'] });
      toast({ title: 'Quiz atualizado' });
    }
  });

  const deleteQuiz = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_quizzes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-quizzes'] });
      toast({ title: 'Quiz deletado' });
    }
  });

  const createQuestion = useMutation({
    mutationFn: async ({ quizId, question, options }: any) => {
      // Create question
      const { data: questionData, error: questionError } = await supabase
        .from('quiz_questions')
        .insert({
          quiz_id: quizId,
          question_text: question.question_text,
          question_type: question.question_type || 'multiple_choice',
          order_index: question.order_index || 0,
          points: question.points || 1.0
        })
        .select()
        .single();
      
      if (questionError) throw questionError;

      // Create options if provided
      if (options && options.length > 0) {
        const { error: optionsError } = await supabase
          .from('quiz_question_options')
          .insert(
            options.map((opt: any, idx: number) => ({
              question_id: questionData.id,
              option_text: opt.option_text,
              is_correct: opt.is_correct || false,
              order_index: idx
            }))
          );
        
        if (optionsError) throw optionsError;
      }

      return questionData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-quizzes'] });
      toast({ title: 'Questão criada' });
    }
  });

  const updateQuestion = useMutation({
    mutationFn: async ({ id, question, options }: any) => {
      const { error: questionError } = await supabase
        .from('quiz_questions')
        .update({
          question_text: question.question_text,
          question_type: question.question_type,
          points: question.points,
          order_index: question.order_index
        })
        .eq('id', id);
      
      if (questionError) throw questionError;

      // Update options
      if (options) {
        // Delete existing options
        await supabase
          .from('quiz_question_options')
          .delete()
          .eq('question_id', id);

        // Insert new options
        if (options.length > 0) {
          const { error: optionsError } = await supabase
            .from('quiz_question_options')
            .insert(
              options.map((opt: any, idx: number) => ({
                question_id: id,
                option_text: opt.option_text,
                is_correct: opt.is_correct || false,
                order_index: idx
              }))
            );
          
          if (optionsError) throw optionsError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-quizzes'] });
      toast({ title: 'Questão atualizada' });
    }
  });

  const deleteQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-quizzes'] });
      toast({ title: 'Questão deletada' });
    }
  });

  // Get user attempts for a quiz
  const { data: userAttempts } = useQuery({
    queryKey: ['quiz-attempts', trainingId],
    queryFn: async () => {
      if (!trainingId) return [];
      
      const { user } = useAuth();
      if (!user) return [];

      const { data: quizzesData } = await supabase
        .from('training_quizzes')
        .select('id')
        .execute().eq('training_id', trainingId);

      if (!quizzesData || quizzesData.length === 0) return [];

      const quizIds = quizzesData.map(q => q.id);

      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .execute().eq('user_id', user.id)
        .in('quiz_id', quizIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!trainingId
  });

  const submitQuizAttempt = useMutation({
    mutationFn: async ({ quizId, answers, timeSpent }: any) => {
      const { user } = useAuth();
      if (!user) throw new Error('User not authenticated');

      // Get quiz and questions
      const { data: quizData, error: quizError } = await supabase
        .from('training_quizzes')
        .select(`
          *,
          quiz_questions (
            *,
            quiz_question_options (*)
          .execute())
        `)
        .eq('id', quizId)
        .single();

      if (quizError) throw quizError;

      // Calculate score
      let totalPoints = 0;
      let earnedPoints = 0;
      const attemptAnswers: any[] = [];

      for (const question of quizData.quiz_questions || []) {
        totalPoints += question.points || 1.0;
        const userAnswer = answers[question.id];
        let isCorrect = false;
        let pointsEarned = 0;

        if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
          const correctOption = question.quiz_question_options?.find((opt: any) => opt.is_correct);
          isCorrect = userAnswer?.selected_option_id === correctOption?.id;
          pointsEarned = isCorrect ? (question.points || 1.0) : 0;
        } else if (question.question_type === 'short_answer') {
          // For short answer, we'll need manual grading or simple text comparison
          // For now, we'll mark as needing review
          isCorrect = false;
          pointsEarned = 0;
        }

        if (isCorrect) earnedPoints += pointsEarned;

        attemptAnswers.push({
          question_id: question.id,
          selected_option_id: userAnswer?.selected_option_id || null,
          answer_text: userAnswer?.answer_text || null,
          is_correct: isCorrect,
          points_earned: pointsEarned
        });
      }

      const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
      const passed = score >= (quizData.passing_score || 70);

      // Create attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: quizId,
          user_id: user.id,
          score,
          passed,
          time_spent_seconds: timeSpent,
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (attemptError) throw attemptError;

      // Create attempt answers
      const { error: answersError } = await supabase
        .from('quiz_attempt_answers')
        .insert(
          attemptAnswers.map((ans: any) => ({
            attempt_id: attemptData.id,
            ...ans
          }))
        );

      if (answersError) throw answersError;

      return { attempt: attemptData, score, passed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-attempts'] });
    }
  });

  return {
    quizzes,
    isLoading,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    userAttempts,
    submitQuizAttempt
  };
}

