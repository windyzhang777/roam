import { api } from '@/services/api';
import type { ChunkedUploader } from '@/services/chunkedUploader';
import { type Book, type UploadProgress } from '@roam/shared';
import { useCallback, useRef, useState } from 'react';

export type UploadStatus = 'uploading' | 'completed' | 'error' | 'cancelled';
export interface UploadingBook {
  id: string;
  fileName: string;
  status: UploadStatus;
  progress: UploadProgress;
  error: string;
  book?: Book;
}

let uploadCount = 0;

export function useBookUpload(onComplete?: (book: Book) => void) {
  const [uploads, setUploads] = useState<UploadingBook[]>([]);
  const uploaderRefs = useRef<Map<string, ChunkedUploader>>(new Map());

  const updateUpload = (id: string, patch: Partial<UploadingBook>) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)) || []);
  };

  const removeUpload = useCallback((id: string) => {
    const uploader = uploaderRefs.current.get(id);
    if (uploader) {
      uploader.cancel();
      uploaderRefs.current.delete(id);
    }
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const startUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';

      const id = `upload-${++uploadCount}`;
      const fileName = file.name;
      setUploads((prev) => prev.filter((u) => !(u.fileName === fileName && u.status === 'error')));

      const entry: UploadingBook = {
        id,
        fileName,
        status: 'uploading',
        progress: { uploadedBytes: 0, totalBytes: file.size, percentage: 0, currentChunk: 0, totalChunks: 0, speed: 0, estimatedTimeRemaining: 0 },
        error: '',
      };
      setUploads((prev) => [entry, ...prev]);

      try {
        const { bookPromise, uploader } = await api.upload.upload(file, {
          onProgress: (progress) => updateUpload(id, { progress }),
          onError: (err) => updateUpload(id, { status: 'error', error: err instanceof Error ? err.message : 'Upload failed' }),
        });

        uploaderRefs.current.set(id, uploader);

        const book = await bookPromise;
        setUploads((prev) => prev.filter((u) => u.id !== id));
        onComplete?.(book);
      } catch (error) {
        updateUpload(id, { status: 'error', error: error instanceof Error ? error.message : 'Upload failed' });
      } finally {
        e.target.value = '';
      }
    },
    [onComplete],
  );

  return { uploads, startUpload, removeUpload };
}
