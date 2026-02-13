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
      // Mesma fonte que ConfiguracaoCupom: kv_store (key cupom_config) ou tabela cupom_config
      try {
        const { data: kvData, error: kvError } = await from('kv_store_2c4defad')
          .select('value')
          .eq('key', 'cupom_config')
          .limit(1)
          .execute();

        if (!kvError && kvData?.[0]?.value) {
          return { ...kvData[0].value } as CupomConfig;
        }

        const { data, error } = await from('cupom_config')
          .select('*')
          .limit(1)
          .execute();

        if (error || !data?.length) {
          return null;
        }
        return data[0] as CupomConfig;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

