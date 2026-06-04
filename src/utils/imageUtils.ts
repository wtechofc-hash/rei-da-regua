import { supabase } from '../lib/supabase';

/**
 * Converte um arquivo de imagem para o formato WebP (Blob) usando HTML5 Canvas.
 */
export function convertToWebP(file: File, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível obter o contexto do canvas 2d'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Conversão do canvas para blob falhou'));
            }
          },
          'image/webp',
          quality
        );
      };
      img.onerror = (err) => reject(err);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Faz upload de um arquivo ou blob para um bucket do Supabase Storage.
 * Retorna a URL pública do arquivo.
 */
export async function uploadImage(bucket: string, file: File | Blob, shopId: string, prefix = ''): Promise<string> {
  const fileExt = 'webp';
  const fileName = `${prefix ? prefix + '-' : ''}${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `${shopId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      contentType: 'image/webp',
      cacheControl: '3600',
      upsert: true
    });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Analisa a URL e, se pertencer ao Supabase Storage público do projeto, remove o arquivo correspondente.
 */
export async function deleteOldImage(url: string | null | undefined): Promise<void> {
  if (!url) return;
  
  // Verifica se é uma URL válida do storage público do Supabase
  if (url.includes('/storage/v1/object/public/')) {
    try {
      const parts = url.split('/storage/v1/object/public/');
      if (parts.length < 2) return;
      
      const pathParts = parts[1].split('/');
      const bucket = pathParts[0];
      const filePath = pathParts.slice(1).join('/');
      
      if (!bucket || !filePath) return;
      
      const { error } = await supabase.storage.from(bucket).remove([filePath]);
      if (error) {
        console.error(`Erro ao remover arquivo antigo (${filePath}) do bucket (${bucket}):`, error);
      } else {
        console.log(`Sucesso: arquivo antigo removido do bucket ${bucket}: ${filePath}`);
      }
    } catch (e) {
      console.error('Erro ao analisar URL para remoção:', e);
    }
  }
}
