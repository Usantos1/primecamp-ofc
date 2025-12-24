import { useState, useEffect } from 'react';
import { from } from '@/integrations/db/client';
import { useAuth } from '@/contexts/AuthContext';

interface OSImageReferenceConfig {
  imageUrl?: string;
  uploadedAt?: string;
}

const STORAGE_BUCKET = 'os-reference-images';
const CONFIG_KEY = 'os_image_reference';

export function useOSImageReference() {
  const { isAdmin } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Carregar URL da imagem de referência
  useEffect(() => {
    loadImageReference();
  }, []);

  const loadImageReference = async () => {
    try {
      const { data, error } = await supabase
        .from('kv_store_2c4defad')
        .select('value')
        .execute().eq('key', CONFIG_KEY)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar imagem de referência:', error);
        return;
      }

      if (data?.value) {
        const config = data.value as OSImageReferenceConfig;
        setImageUrl(config.imageUrl || null);
      }
    } catch (error) {
      console.error('Erro ao carregar imagem de referência:', error);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!isAdmin) {
      throw new Error('Apenas administradores podem fazer upload de imagens');
    }

    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('A imagem deve ter no máximo 2MB');
    }

    // Validar tipo
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
      throw new Error('Apenas imagens PNG ou JPG são permitidas');
    }

    setUploading(true);
    try {
      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `celular-referencia-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Fazer upload para Supabase Storage
      // Nota: O upload requer que o usuário esteja autenticado e tenha permissão via RLS
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Substituir se já existir
          contentType: file.type, // Especificar o tipo MIME explicitamente
        });

      if (uploadError) {
        // Detectar vários tipos de erro relacionados ao bucket não encontrado
        const errorMessage = uploadError.message || '';
        const errorStatus = (uploadError as any).statusCode || (uploadError as any).status;
        
        if (errorMessage.includes('Bucket not found') || 
            errorMessage.includes('not found') ||
            errorMessage.includes('does not exist') ||
            errorMessage.includes('bucket') && errorMessage.includes('404') ||
            errorStatus === 404 ||
            errorStatus === 400 ||
            errorMessage.includes('406')) {
          const errorMsg = new Error(
            'O bucket de armazenamento "os-reference-images" não foi encontrado. ' +
            'Por favor, acesse o Supabase Dashboard > Storage e crie o bucket com este nome. ' +
            'Configure-o como público para leitura. Veja o arquivo CRIAR_BUCKET_OS_REFERENCE.md para instruções detalhadas.'
          );
          (errorMsg as any).code = 'BUCKET_NOT_FOUND';
          throw errorMsg;
        }
        throw uploadError;
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Salvar URL na configuração
      const config: OSImageReferenceConfig = {
        imageUrl: publicUrl,
        uploadedAt: new Date().toISOString(),
      };

      const { error: configError } = await supabase
        .from('kv_store_2c4defad')
        .upsert({
          key: CONFIG_KEY,
          value: config,
        }, {
          onConflict: 'key',
        });

      if (configError) throw configError;

      setImageUrl(publicUrl);
      return publicUrl;
    } catch (error: any) {
      console.error('Erro ao fazer upload da imagem:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async () => {
    if (!isAdmin) {
      throw new Error('Apenas administradores podem deletar imagens');
    }

    setLoading(true);
    try {
      // Remover da configuração
      const { error } = await supabase
        .from('kv_store_2c4defad')
        .delete()
        .eq('key', CONFIG_KEY);

      if (error) throw error;

      setImageUrl(null);
    } catch (error: any) {
      console.error('Erro ao deletar imagem:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    imageUrl,
    loading,
    uploading,
    uploadImage,
    deleteImage,
    reload: loadImageReference,
  };
}

