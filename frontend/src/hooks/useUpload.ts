import { useCallback, useRef, useState } from "react";
import client from "../api/client";

export interface UploadItem {
  id: string;
  filename: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  docId?: number;
  file?: File;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const useServerUploadQueue = () => {
  const [items, setItems] = useState<UploadItem[]>([]);
  // ref to store current timers / cancel tokens (optional)
  const uploadsRef = useRef<Record<string, { cancelled?: boolean }>>({});

  const addFiles = useCallback((files: File[]) => {
    const newItems: UploadItem[] = [];
    for (const f of files) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        newItems.push({
          id: Math.random().toString(36).substring(7),
          filename: f.name,
          progress: 0,
          status: "error",
          error: `Invalid file type. Allowed: PDF, DOCX, TXT`,
        });
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        newItems.push({
          id: Math.random().toString(36).substring(7),
          filename: f.name,
          progress: 0,
          status: "error",
          error: `File exceeds 10MB limit`,
        });
        continue;
      }
      newItems.push({
        id: `${Date.now()}_${Math.random()}`,
        filename: f.name,
        progress: 0,
        status: "pending",
        file: f,
      });
    }
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const upload = useCallback(() => {
    setItems((prev) => {
      const pending = prev.filter((i) => i.status === "pending" && i.file);
      if (pending.length === 0) return prev;

      pending.forEach((item) => {
        // 1. immediately mark as uploading
        setItems((curr) =>
          curr.map((i) =>
            i.id === item.id ? { ...i, status: "uploading", progress: 0 } : i
          )
        );

        // 2. start async upload task
        (async () => {
          try {
            const formData = new FormData();
            formData.append('file', item.file!, item.file!.name);

            const resp = await client.post("/api/upload", formData, {
              // IMPORTANT: do NOT set Content-Type manually
              onUploadProgress: (e) => {
                const loaded = e.loaded ?? 0;
                const total = e.total ?? 0;
                const progress = total ? Math.round((loaded / total) * 100) : 0;

                setItems((curr) =>
                  curr.map((i) => (i.id === item.id ? { ...i, progress } : i))
                );
              },
            });

            const result = resp.data?.results?.[0];
            setItems((curr) =>
              curr.map((i) =>
                i.id === item.id
                  ? {
                      ...i,
                      status: "success",
                      docId: result?.id,
                      progress: 100,
                    }
                  : i
              )
            );
          } catch (err: any) {
            setItems((curr) =>
              curr.map((i) =>
                i.id === item.id
                  ? {
                      ...i,
                      status: "error",
                      error: err?.response?.data?.message || "Upload failed",
                    }
                  : i
              )
            );
          }
        })();
      });

      return prev;
    });
  }, []);

  // Cancel — stop and remove the item
  const cancel = useCallback((id: string) => {
    // mark cancelled if in-progress
    if (uploadsRef.current[id]) uploadsRef.current[id].cancelled = true;
    // remove item from list
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const retry = useCallback(
    (id: string) => {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, status: "pending", error: undefined, progress: 0 }
            : i
        )
      );
      // start uploads after state settles (small timeout to ensure state update)
      setTimeout(() => upload(), 50);
    },
    [upload]
  );

  const download = useCallback((item: UploadItem) => {
    if (!item.docId) return;
    const url = `${
      import.meta.env.VITE_API_URL || "http://localhost:4000"
    }/api/download?docId=${item.docId}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = item.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  return { items, addFiles, upload, cancel, retry, download };
};
