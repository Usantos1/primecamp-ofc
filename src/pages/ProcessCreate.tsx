import { useNavigate } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { ProcessForm } from '@/components/ProcessForm';
import { Process } from '@/types/process';
import { useProcesses } from '@/hooks/useProcesses';
import { useToast } from '@/hooks/use-toast';

export default function ProcessCreate() {
  const navigate = useNavigate();
  const { createProcess } = useProcesses();
  const { toast } = useToast();

  const handleSave = async (processData: Omit<Process, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createProcess(processData);
      toast({
        title: "Sucesso!",
        description: "Processo criado com sucesso.",
      });
      navigate('/processos');
    } catch (error: any) {
      console.error('Erro ao criar processo:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar processo.",
        variant: "destructive",
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


