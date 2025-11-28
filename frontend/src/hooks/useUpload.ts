import { useState, useCallback } from 'react';
import client from '../api/client';

export interface UploadItem {
  id: string;
  filename: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  docId?: number;
  file?: File;
}

const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const useServerUploadQueue = () => {
  const [items, setItems] = useState<UploadItem[]>([]);

  const addFiles = useCallback((files: File[]) => {
    const newItems: UploadItem[] = [];
    for (const f of files) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        newItems.push({
          id: Math.random().toString(36).substring(7),
          filename: f.name,
          progress: 0,
          status: 'error',
          error: `Invalid file type. Allowed: PDF, DOCX, TXT`
        });
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        newItems.push({
          id: Math.random().toString(36).substring(7),
          filename: f.name,
          progress: 0,
          status: 'error',
          error: `File exceeds 10MB limit`
        });
        continue;
      }
      newItems.push({
        id: `${Date.now()}_${Math.random()}`,
        filename: f.name,
        progress: 0,
        status: 'pending',
        file: f
      });
    }
    setItems(prev => [...prev, ...newItems]);
  }, []);

  const upload = useCallback(async () => {
    const pending = items.filter(i => i.status === 'pending');
    if (pending.length === 0) return;

    for (const item of pending) {
      if (!item.file) continue;

      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'uploading', progress: 0 } : i));

      const formData = new FormData();
      formData.append('file', item.file);

      try {
        const resp = await client.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            const progress = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, progress } : i));
          }
        });

        const result = resp.data?.results?.[0];
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'success', docId: result?.id, progress: 100 } : i));
      } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } }; message?: string };
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', error: error?.response?.data?.message || 'Upload failed' } : i));
      }
    }
  }, [items]);

  const cancel = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const retry = useCallback((id: string) => {
    setItems(prev => prev.map(i => i.id === id && i.status === 'error' ? { ...i, status: 'pending', error: undefined } : i));
  }, []);

  const download = useCallback((item: UploadItem) => {
    if (!item.docId) return;
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/download?docId=${item.docId}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = item.filename;
    a.click();
  }, []);

  return { items, addFiles, upload, cancel, retry, download };
};
