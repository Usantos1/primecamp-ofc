import { useQuery } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';

export interface CupomConfig {
  id?: string;
  empresa_nome: string;
  empresa_cnpj?: string;
  empresa_ie?: string;
  empresa_endereco?: string;
  empresa_telefone?: string;
  empresa_whatsapp?: string;
  logo_url?: string;
  termos_garantia?: string;
  mostrar_logo: boolean;
  mostrar_qr_code: boolean;
  mensagem_rodape?: string;
  imprimir_2_vias?: boolean;
  imprimir_sem_dialogo?: boolean;
  impressora_padrao?: string;
}

export function useCupomConfig() {
  return useQuery<CupomConfig | null>({
    queryKey: ['cupom_config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cupom_config')
        .select('*')
        .execute().limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Não existe configuração, retornar null para usar valores padrão
          return null;
        }
        throw error;
      }

      return data as CupomConfig;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

