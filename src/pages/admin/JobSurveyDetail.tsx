import { useParams, useNavigate } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { AdminJobSurveysManager } from '@/components/AdminJobSurveysManager';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function JobSurveyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <ModernLayout
      title="Detalhes da Vaga"
      subtitle="Visualize e gerencie candidatos desta vaga"
    >
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => navigate('/admin/job-surveys')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar à Lista
        </Button>
        <AdminJobSurveysManager surveyId={id} />
      </div>
    </ModernLayout>
  );
}

