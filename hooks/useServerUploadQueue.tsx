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

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain"
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function useServerUploadQueue(concurrency = 3) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const queue = useRef<UploadItem[]>([]);
  const running = useRef(0);

  const enqueue = (files: FileList | File[]) => {
    const newItems = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: UploadStatus.PENDING,
    }));

    setItems((prev) => [...prev, ...newItems]);
    queue.current.push(...newItems);
    processQueue();
  };

  const processQueue = useCallback(() => {
    while (running.current < concurrency && queue.current.length > 0) {
      const item = queue.current.shift()!;
      running.current++;
      uploadOne(item).finally(() => {
        running.current--;
        processQueue();
      });
    }
  }, [concurrency]);

  const uploadOne = async (item: UploadItem) => {
    setItems((prev) =>
      prev.map((p) =>
        p.id === item.id
          ? { ...p, status: UploadStatus.UPLOADING, progress: 0 }
          : p
      )
    );

    try {
      if (!ALLOWED_TYPES.includes(item.file.type)) {
        throw new Error("Invalid file type");
      }
      if (item.file.size > MAX_FILE_SIZE) {
        throw new Error("File exceeds 10MB limit");
      }

      const form = new FormData();
      form.append("file", item.file);

      const source = axios.CancelToken.source();
      item.cancel = source.cancel;

      const token = sessionStorage.getItem("access");
      const config: AxiosRequestConfig = {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        onUploadProgress: (ev) => {
          const percent = ev.total ? Math.round((ev.loaded / ev.total) * 100) : 0;
          setItems((prev) =>
            prev.map((p) =>
              p.id === item.id ? { ...p, progress: percent } : p
            )
          );
        },
        cancelToken: source.token,
      };

      const { data } = await axios.post("/api/upload/server-upload", form, config);
      setItems((prev) =>
        prev.map((p) =>
          p.id === item.id
            ? {
                ...p,
                status: UploadStatus.SUCCESS,
                progress: 100,
                docId: data.docId,
                key: data.key,
              }
            : p
        )
      );
    } catch (err: any) {
      if (axios.isCancel(err)) {
        setItems((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? { ...p, status: UploadStatus.CANCELED, error: "Canceled" }
              : p
          )
        );
      } else {
        const message = err?.response?.data?.message || err.message;
        setItems((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? { ...p, status: UploadStatus.FAILED, error: message }
              : p
          )
        );
      }
    }
  };

  const cancelOne = (id: string) => {
    const item = items.find((p) => p.id === id);
    if (item?.cancel) {
      item.cancel("User canceled");
    }
    queue.current = queue.current.filter((q) => q.id !== id);
    setItems((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: UploadStatus.CANCELED } : p
      )
    );
  };

  const cancelAll = () => {
    items.forEach((item) => {
      if (item.cancel) {
        item.cancel("User canceled");
      }
    });
    queue.current = [];
    setItems((prev) =>
      prev.map((p) =>
        p.status === UploadStatus.UPLOADING ||
        p.status === UploadStatus.PENDING
          ? { ...p, status: UploadStatus.CANCELED }
          : p
      )
    );
  };

  const retry = (id: string) => {
    const item = items.find((p) => p.id === id);
    if (item) {
      const retryItem = {
        ...item,
        progress: 0,
        status: UploadStatus.PENDING,
        error: undefined,
      };
      queue.current.push(retryItem);
      setItems((prev) =>
        prev.map((p) => (p.id === id ? retryItem : p))
      );
      processQueue();
    }
  };

  return { items, enqueue, cancelOne, cancelAll, retry };
}
