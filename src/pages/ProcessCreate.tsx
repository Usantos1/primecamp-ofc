import { useNavigate } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { ProcessForm } from '@/components/ProcessForm';
import { Process } from '@/types/process';
import { useProcesses } from '@/hooks/useProcesses';
import { useErrorHandler } from '@/hooks/useErrorHandler';

export default function ProcessCreate() {
  const navigate = useNavigate();
  const { createProcess } = useProcesses();
  const { handleError, handleSuccess } = useErrorHandler();

  const handleSave = async (processData: Omit<Process, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createProcess(processData);
      handleSuccess('Processo criado com sucesso.');
      navigate('/processos');
    } catch (error) {
      handleError(error, {
        context: 'ProcessCreate',
        fallbackMessage: 'Erro ao criar processo. Tente novamente.',
      });
    }
  };

  const handleCancel = () => {
    navigate('/processos');
  };

  return (
    <ModernLayout
      title="Novo Processo"
      subtitle="Configure o processo interno da PrimeCamp"
    >
      <ProcessForm
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </ModernLayout>
  );
}


