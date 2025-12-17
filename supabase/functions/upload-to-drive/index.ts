import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v5.2.0/index.ts";

const GOOGLE_DRIVE_API_URL = "https://www.googleapis.com/drive/v3";

interface DriveUploadRequest {
  file: string; // Base64 encoded file
  fileName: string;
  osNumero: number | string;
  tipo: 'entrada' | 'saida' | 'processo';
  mimeType?: string;
  folderId?: string; // ID da pasta OS no Drive (opcional, será criada se não existir)
}

serve(async (req) => {
  console.log('[upload-to-drive] Requisição recebida:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
  });

  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      console.log('[upload-to-drive] Respondendo OPTIONS (CORS preflight)');
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    console.log('[upload-to-drive] Processando requisição POST');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verificar autenticação
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autenticado' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[upload-to-drive] Lendo body da requisição...');
    const body: DriveUploadRequest = await req.json();
    console.log('[upload-to-drive] Body recebido:', {
      fileName: body.fileName,
      osNumero: body.osNumero,
      tipo: body.tipo,
      fileSize: body.file?.length || 0,
      folderId: body.folderId,
    });
    
    const { file, fileName, osNumero, tipo, mimeType = 'image/jpeg', folderId } = body;

    if (!file || !fileName || !osNumero || !tipo) {
      console.error('[upload-to-drive] Parâmetros obrigatórios faltando:', {
        hasFile: !!file,
        hasFileName: !!fileName,
        hasOsNumero: !!osNumero,
        hasTipo: !!tipo,
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Parâmetros obrigatórios faltando' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[upload-to-drive] Parâmetros validados. Obtendo Service Account...');
    // Obter credenciais da Service Account do Google Drive
    const GOOGLE_SERVICE_ACCOUNT = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    
    if (!GOOGLE_SERVICE_ACCOUNT) {
      console.error('[upload-to-drive] GOOGLE_SERVICE_ACCOUNT_JSON não configurado');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Service Account do Google Drive não configurado. Configure a variável GOOGLE_SERVICE_ACCOUNT_JSON com o JSON completo da service account' 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    let serviceAccount: any;
    try {
      serviceAccount = JSON.parse(GOOGLE_SERVICE_ACCOUNT);
    } catch (e) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao parsear JSON da Service Account' 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[upload-to-drive] Service Account obtido. Gerando token de acesso...');
    // Gerar token de acesso usando JWT
    const accessToken = await getAccessTokenFromServiceAccount(serviceAccount);
    
    if (!accessToken) {
      console.error('[upload-to-drive] Falha ao obter access token');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao obter token de acesso do Google Drive' 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[upload-to-drive] Token obtido. Decodificando arquivo base64...');
    // Decodificar arquivo base64
    const fileBuffer = Uint8Array.from(atob(file), c => c.charCodeAt(0));
    console.log('[upload-to-drive] Arquivo decodificado. Tamanho:', fileBuffer.length, 'bytes');

    console.log('[upload-to-drive] Criando/obtendo pasta raiz "PrimeCamp OS"...');
    // 1. Criar ou obter pasta raiz "PrimeCamp OS"
    const rootFolderId = await getOrCreateFolder('PrimeCamp OS', accessToken, null);
    console.log('[upload-to-drive] Pasta raiz ID:', rootFolderId);
    
    // 2. Criar ou obter pasta da OS "OS-{numero}"
    const osFolderName = `OS-${osNumero}`;
    console.log('[upload-to-drive] Criando/obtendo pasta OS:', osFolderName);
    const osFolderId = folderId || await getOrCreateFolder(osFolderName, accessToken, rootFolderId);
    console.log('[upload-to-drive] Pasta OS ID:', osFolderId);
    
    // 3. Criar ou obter subpasta (Entrada, Saida, Processo)
    const subFolderNames = {
      entrada: 'Entrada',
      saida: 'Saida',
      processo: 'Processo'
    };
    const subFolderName = subFolderNames[tipo];
    console.log('[upload-to-drive] Criando/obtendo subpasta:', subFolderName);
    const subFolderId = await getOrCreateFolder(subFolderName, accessToken, osFolderId);
    console.log('[upload-to-drive] Subpasta ID:', subFolderId);

    console.log('[upload-to-drive] Fazendo upload do arquivo para o Drive...');
    // 4. Fazer upload do arquivo
    const uploadResult = await uploadFileToDrive(
      fileBuffer,
      fileName,
      mimeType,
      subFolderId,
      accessToken
    );
    console.log('[upload-to-drive] Resultado do upload:', uploadResult);

    if (!uploadResult.success) {
      return new Response(
        JSON.stringify(uploadResult),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        fileId: uploadResult.fileId,
        webViewLink: uploadResult.webViewLink,
        folderId: osFolderId,
        subFolderId: subFolderId,
      }),
      {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    console.error('[upload-to-drive] Erro capturado no catch:', error);
    console.error('[upload-to-drive] Stack trace:', error.stack);
    console.error('[upload-to-drive] Error message:', error.message);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro desconhecido' 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

/**
 * Gerar token de acesso usando Service Account JWT
 */
async function getAccessTokenFromServiceAccount(serviceAccount: any): Promise<string | null> {
  try {
    // Importar chave privada
    const privateKey = await importPKCS8(serviceAccount.private_key, 'RS256');

    // Criar JWT
    const now = Math.floor(Date.now() / 1000);
    const jwt = await new SignJWT({
      scope: 'https://www.googleapis.com/auth/drive.file',
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt(now)
      .setIssuer(serviceAccount.client_email)
      .setAudience(serviceAccount.token_uri)
      .setExpirationTime(now + 3600) // 1 hora
      .sign(privateKey);

    // Trocar JWT por access token
    const tokenResponse = await fetch(serviceAccount.token_uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Erro ao obter token:', error);
      return null;
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('Erro ao gerar token:', error);
    return null;
  }
}

/**
 * Criar ou obter pasta no Google Drive
 */
async function getOrCreateFolder(
  folderName: string,
  accessToken: string,
  parentFolderId: string | null
): Promise<string> {
  // Buscar pasta existente
  let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  } else {
    query += ` and 'root' in parents`;
  }

  const searchResponse = await fetch(
    `${GOOGLE_DRIVE_API_URL}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  const searchData = await searchResponse.json();
  
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Criar pasta se não existir
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    ...(parentFolderId && { parents: [parentFolderId] }),
  };

  const createResponse = await fetch(
    `${GOOGLE_DRIVE_API_URL}/files`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(folderMetadata),
    }
  );

  const createData = await createResponse.json();
  
  if (!createData.id) {
    throw new Error(`Erro ao criar pasta ${folderName}: ${createData.error?.message || 'Erro desconhecido'}`);
  }

  return createData.id;
}

/**
 * Fazer upload de arquivo para o Google Drive
 */
async function uploadFileToDrive(
  fileBuffer: Uint8Array,
  fileName: string,
  mimeType: string,
  folderId: string,
  accessToken: string
): Promise<{ success: boolean; fileId?: string; webViewLink?: string; error?: string }> {
  try {
    // Usar método resumable upload (mais confiável no Deno)
    // Passo 1: Criar o arquivo com metadata
    console.log('[upload-to-drive] Criando arquivo no Drive (resumable upload)...');
    
    const createResponse = await fetch(
      `${GOOGLE_DRIVE_API_URL}/files?uploadType=resumable&fields=id`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: fileName,
          parents: [folderId],
        }),
      }
    );

    console.log('[upload-to-drive] Resposta do create. Status:', createResponse.status, createResponse.statusText);
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[upload-to-drive] Erro ao criar arquivo:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        return {
          success: false,
          error: `Erro HTTP ${createResponse.status}: ${errorText.substring(0, 200)}`,
        };
      }
      return {
        success: false,
        error: errorData.error?.message || `Erro ao criar arquivo: ${createResponse.status}`,
      };
    }

    // Verificar se retornou Location (resumable upload) ou ID direto (arquivo já criado)
    const location = createResponse.headers.get('Location') || createResponse.headers.get('location');
    const responseText = await createResponse.text();
    let fileId: string | null = null;
    
    if (responseText) {
      try {
        const responseData = JSON.parse(responseText);
        if (responseData.id) {
          fileId = responseData.id;
          console.log('[upload-to-drive] Arquivo já criado com ID:', fileId);
        }
      } catch (e) {
        console.warn('[upload-to-drive] Resposta não é JSON válido');
      }
    }

    // Se tiver Location, fazer upload resumable
    if (location) {
      console.log('[upload-to-drive] Location obtido. Fazendo upload do arquivo (resumable)...');
      
      // Passo 2: Fazer upload do arquivo usando a location
      const uploadResponse = await fetch(
        location,
        {
          method: 'PUT',
          headers: {
            'Content-Type': mimeType,
            'Content-Length': fileBuffer.length.toString(),
          },
          body: fileBuffer,
        }
      );

      console.log('[upload-to-drive] Resposta do upload. Status:', uploadResponse.status, uploadResponse.statusText);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('[upload-to-drive] Erro no upload:', errorText);
        return {
          success: false,
          error: `Erro HTTP ${uploadResponse.status}: ${errorText.substring(0, 200)}`,
        };
      }

      // Para resumable upload, a resposta pode ser vazia ou conter JSON
      const uploadResponseText = await uploadResponse.text();
      if (uploadResponseText) {
        try {
          const uploadData = JSON.parse(uploadResponseText);
          if (uploadData.id) {
            fileId = uploadData.id;
          }
        } catch (e) {
          console.warn('[upload-to-drive] Resposta não é JSON, mas upload pode ter sido bem-sucedido');
        }
      }
    } else if (fileId) {
      // Arquivo foi criado sem Location, fazer upload do conteúdo usando PATCH
      console.log('[upload-to-drive] Arquivo criado sem Location. Fazendo upload do conteúdo...');
      const updateResponse = await fetch(
        `${GOOGLE_DRIVE_API_URL}/files/${fileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': mimeType,
          },
          body: fileBuffer,
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('[upload-to-drive] Erro ao fazer upload do conteúdo:', errorText);
        return {
          success: false,
          error: `Erro ao fazer upload do conteúdo: ${updateResponse.status}`,
        };
      }

      console.log('[upload-to-drive] Conteúdo do arquivo enviado com sucesso');
    }

    // Se não tiver fileId ainda, buscar o arquivo criado
    if (!fileId) {
      console.log('[upload-to-drive] Buscando arquivo criado...');
      const searchResponse = await fetch(
        `${GOOGLE_DRIVE_API_URL}/files?q=name='${encodeURIComponent(fileName)}' and '${folderId}' in parents&fields=files(id,webViewLink)`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.files && searchData.files.length > 0) {
          fileId = searchData.files[0].id;
          console.log('[upload-to-drive] Arquivo encontrado:', fileId);
        }
      }
    }

    if (!fileId) {
      return {
        success: false,
        error: 'Não foi possível obter o ID do arquivo criado',
      };
    }

    // Buscar webViewLink do arquivo
    console.log('[upload-to-drive] Buscando webViewLink do arquivo:', fileId);
    const fileResponse = await fetch(
      `${GOOGLE_DRIVE_API_URL}/files/${fileId}?fields=id,webViewLink`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    let webViewLink: string | undefined;
    if (fileResponse.ok) {
      const fileData = await fileResponse.json();
      webViewLink = fileData.webViewLink;
      console.log('[upload-to-drive] webViewLink obtido:', webViewLink);
    }

    console.log('[upload-to-drive] Upload bem-sucedido:', {
      fileId: fileId,
      hasWebViewLink: !!webViewLink,
    });

    return {
      success: true,
      fileId: fileId,
      webViewLink: webViewLink,
    };
  } catch (error: any) {
    console.error('[upload-to-drive] Erro ao fazer upload:', error);
    console.error('[upload-to-drive] Stack:', error.stack);
    return {
      success: false,
      error: error.message || 'Erro desconhecido ao fazer upload',
    };
  }
}
