import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProcesses } from "@/hooks/useProcesses";
import { useUsers } from "@/hooks/useUsers";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TaskFormProps {
  onClose?: () => void;
}

export function TaskForm({ onClose }: TaskFormProps) {
  const navigate = useNavigate();
  const { processes } = useProcesses();
  const { users } = useUsers();
  const { createTask } = useTasks();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    processId: "",
    responsible: "",
    deadline: "",
    priority: "media" as "baixa" | "media" | "alta" | "critica"
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.processId || !formData.responsible) {
      toast.error("Nome, processo e responsável são obrigatórios");
      return;
    }

    setLoading(true);
    
    try {
      const responsibleUser = users.find(u => u.id === formData.responsible);
      
      await createTask({
        name: formData.name,
        description: formData.description,
        category_id: formData.processId, // Using processId as category_id for now
        process_id: formData.processId,
        responsible_user_id: formData.responsible,
        deadline: new Date(formData.deadline).toISOString(),
        status: "pending",
        created_by: user?.id || "",
        responsible_name: responsibleUser?.display_name || "",
        category_name: "",
        process_name: ""
      });
      
      toast.success("Tarefa criada com sucesso!");
      onClose?.();
      navigate("/tarefas");
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
      toast.error("Erro ao criar tarefa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Nova Tarefa</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da Tarefa</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Revisar documentação"
              required
            />
          </div>

          <div>
            <Label htmlFor="process">Processo</Label>
            <Select
              value={formData.processId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, processId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um processo" />
              </SelectTrigger>
              <SelectContent>
                {processes.map((process) => (
                  <SelectItem key={process.id} value={process.id}>
                    {process.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="responsible">Responsável</Label>
            <Select
              value={formData.responsible}
              onValueChange={(value) => setFormData(prev => ({ ...prev, responsible: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um responsável" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="deadline">Prazo</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="priority">Prioridade</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: "baixa" | "media" | "alta" | "critica") => 
                setFormData(prev => ({ ...prev, priority: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">🟢 Baixa</SelectItem>
                <SelectItem value="media">🟡 Média</SelectItem>
                <SelectItem value="alta">🟠 Alta</SelectItem>
                <SelectItem value="critica">🔴 Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva a tarefa..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Tarefa"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}