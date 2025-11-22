import { supabase } from '@/integrations/supabase/client';

export async function uploadFileToR2(
  file: File,
  userId: string,
  folder: string,
  onProgress?: (progress: number) => void
) {
  const safeName = file.name.replace(/\s+/g, "-").toLowerCase();
  const fileName = `${userId}-${crypto.randomUUID()}-${safeName}`;

  try {
    // 1. Get pre-signed URL from edge function
    const { data, error } = await supabase.functions.invoke('generate-r2-upload-url', {
      body: {
        fileName,
        fileType: file.type || "application/octet-stream",
        folder,
      }
    });

    if (error) throw error;

    // 2. Upload directly to R2 using pre-signed URL with progress tracking
    return await new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(Math.round(percentComplete));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data.publicUrl);
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed: Network error'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      xhr.open('PUT', data.uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    throw new Error(error.message || 'Upload failed');
  }
}
