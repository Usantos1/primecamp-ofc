import { z } from 'zod';
import { DEPARTMENTS } from '@/types/process';

const departmentEnum = z.enum(Object.keys(DEPARTMENTS) as [string, ...string[]]);

const activitySchema = z.object({
  id: z.string().optional(),
  step: z.number().int().positive(),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  responsible: z.string().min(1, 'Responsável é obrigatório'),
  estimatedTime: z.string().optional(),
  tools: z.array(z.string()).default([]),
});

export const processSchema = z.object({
  name: z.string()
    .min(10, 'Nome deve ter pelo menos 10 caracteres')
    .max(200, 'Nome deve ter no máximo 200 caracteres'),
  
  objective: z.string()
    .min(50, 'Objetivo deve ter pelo menos 50 caracteres')
    .refine(
      (val) => {
        // Remove HTML tags para contar caracteres
        const textOnly = val.replace(/<[^>]*>/g, '');
        return textOnly.length >= 50;
      },
      { message: 'Objetivo deve ter pelo menos 50 caracteres (sem contar HTML)' }
    ),
  
  department: departmentEnum,
  
  owner: z.string().min(1, 'Proprietário é obrigatório'),
  
  participants: z.array(z.string()).default([]),
  
  activities: z.array(activitySchema)
    .min(1, 'Adicione pelo menos uma atividade')
    .refine(
      (activities) => {
        // Verificar se todas as atividades têm descrição válida
        return activities.every(act => {
          const textOnly = act.description.replace(/<[^>]*>/g, '');
          return textOnly.length >= 10;
        });
      },
      { message: 'Todas as atividades devem ter descrição válida' }
    ),
  
  metrics: z.array(z.string())
    .default([])
    .refine(
      (metrics) => metrics.every(m => m.trim().length > 0),
      { message: 'Métricas não podem estar vazias' }
    ),
  
  automations: z.array(z.string()).default([]),
  
  notes: z.string().optional(),
  
  priority: z.number().int().min(1).max(4).default(2),
  
  status: z.enum(['draft', 'active', 'review', 'archived']).default('draft'),
  
  categoryId: z.string().uuid().optional(),
});

export type ProcessFormData = z.infer<typeof processSchema>;









