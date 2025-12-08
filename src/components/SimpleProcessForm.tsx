import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories } from "@/hooks/useCategories";
import { useProcesses } from "@/hooks/useProcesses";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SimpleProcessFormProps {
  onClose?: () => void;
}

export function SimpleProcessForm({ onClose }: SimpleProcessFormProps) {
  const navigate = useNavigate();
  const { categories } = useCategories();
  const { createProcess } = useProcesses();
  
  const [formData, setFormData] = useState({
    name: "",
    objective: "",
    categoryId: "",
    priority: "media" as "baixa" | "media" | "alta" | "critica",
    description: ""
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.objective) {
      toast.error("Nome e objetivo são obrigatórios");
      return;
    }

    setLoading(true);
    
    try {
      await createProcess({
        name: formData.name,
        objective: formData.objective,
        department: "vendas" as any,
        owner: "Sistema",
        participants: [],
        activities: [],
        metrics: [],
        automations: [],
        tags: [],
        priority: 2,
        mediaFiles: [],
        flowNodes: [],
        flowEdges: [],
        youtubeVideoId: "",
        status: "draft",
        categoryId: formData.categoryId
      });
      
      toast.success("Processo criado com sucesso!");
      onClose?.();
      navigate("/processos");
    } catch (error) {
      console.error("Erro ao criar processo:", error);
      toast.error("Erro ao criar processo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Novo Processo</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Processo</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Atendimento ao Cliente"
              required
            />
          </div>

          <div>
            <Label htmlFor="objective">Objetivo</Label>
            <Input
              id="objective"
              value={formData.objective}
              onChange={(e) => setFormData(prev => ({ ...prev, objective: e.target.value }))}
              placeholder="Ex: Melhorar satisfação do cliente"
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              placeholder="Descreva o processo..."
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
              {loading ? "Criando..." : "Criar Processo"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}