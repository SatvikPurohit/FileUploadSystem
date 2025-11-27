import { useCallback, useRef, useState } from "react";
import axios, { AxiosRequestConfig, Canceler } from "axios";

enum UploadStatus {
  PENDING = "pending",
  UPLOADING = "uploading",
  SUCCESS = "success",
  FAILED = "failed",
  CANCELED = "canceled",
}

export type UploadItem = {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  cancel?: Canceler;
  docId?: number;
  key?: string;
  error?: string;
};

export function useServerUploadQueue(concurrency = 3) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const queue = useRef<UploadItem[]>([]);
  const running = useRef(0);

  const enqueue = (files: FileList | File[]) => {
    const arr = Array.from(files).map(f => ({ id: crypto.randomUUID(), file: f, progress: 0, status: UploadStatus.PENDING }));
    setItems(prev => [...prev, ...arr]);
    queue.current.push(...arr);
    processQueue();
  };

  const processQueue = useCallback(() => {
    while (running.current < concurrency && queue.current.length > 0) {
      const next = queue.current.shift()!;
      running.current++;
      uploadOne(next).finally(() => { running.current--; processQueue(); });
    }
  }, [concurrency]);

  const uploadOne = async (item: UploadItem) => {
    setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: UploadStatus.UPLOADING, progress: 0 } : p));
    try {
      // client validation
      const allowed = ["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","text/plain"];
      if (!allowed.includes(item.file.type)) throw new Error("Invalid file type");
      if (item.file.size > 10*1024*1024) throw new Error("Too large");

      // build form data
      const form = new FormData();
      form.append("file", item.file);
      form.append("bucket", (process.env.NEXT_PUBLIC_S3_BUCKET || ""));

      const source = axios.CancelToken.source();
      item.cancel = source.cancel;

      const config: AxiosRequestConfig = {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (ev) => {
          const percent = ev.total ? Math.round((ev.loaded / ev.total) * 100) : 0;
          setItems(prev => prev.map(p => p.id === item.id ? { ...p, progress: percent } : p));
        },
        cancelToken: source.token,
      };

      const token = sessionStorage.getItem("access");
      if (token && config.headers) (config.headers as any).Authorization = `Bearer ${token}`;

      const resp = await axios.post("/api/upload/server-upload", form, config);
      const { docId, key } = resp.data;
      setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: UploadStatus.SUCCESS, progress: 100, docId, key } : p));
    } catch (err:any) {
      if (axios.isCancel(err)) {
        setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: UploadStatus.CANCELED, error: "Canceled" } : p));
      } else {
        setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: UploadStatus.FAILED, error: err?.response?.data?.message || err.message } : p));
      }
    }
  };
  
  const cancelOne = (id: string) => {
    setItems(prev => {
      const it = prev.find(p => p.id === id);
      it?.cancel?.("User canceled");
      queue.current = queue.current.filter(q => q.id !== id);
      return prev.map(p => p.id === id ? { ...p, status: p.status === UploadStatus.PENDING ? UploadStatus.CANCELED : p.status } : p);
    });
  };

  const cancelAll = () => {
    setItems(prev => {
      prev.forEach(it => it.cancel?.("User canceled"));
      queue.current = [];
      return prev.map(p => p.status === UploadStatus.UPLOADING || p.status === UploadStatus.PENDING ? { ...p, status: UploadStatus.CANCELED } : p);
    });
  };

  const retry = (id: string) => {
    setItems(prev => {
      const it = prev.find(p => p.id === id);
        if (it) {   
            const newItem = { ...it, progress: 0, status: UploadStatus.PENDING, error: undefined };    
            queue.current.push(newItem as UploadItem);
            processQueue();
            return prev.map(p => p.id === id ? newItem : p);
        }
        return prev;
    }); 
  };

  return { items, enqueue, cancelOne, cancelAll, retry };
}
