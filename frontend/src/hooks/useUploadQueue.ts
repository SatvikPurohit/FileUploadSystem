import { useState, useRef, useEffect, useCallback } from "react";
import type { UploadItem } from "../types";
import { useUploadMutation } from "./useUploadMutation";

// Allowed file types & limits
const ALLOWED = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const MAX_BYTES = 10 * 1024 * 1024;
const CONCURRENCY = 3;

interface UseUploadQueueReturn {
  queue: UploadItem[];
  handleFiles: (files: File[]) => void;
  cancelItem: (id: string) => void;
  retry: (id: string) => void;
  removeItem: (id: string) => void;
  cancelAll: () => void;
  clearCompleted: () => void;
  pendingCount: number;
  uploadingCount: number;
  successCount: number;
  hasCancellable: boolean;
}

export const useUploadQueue = (
  onSnackbar: (msg: string, severity: "success" | "error" | "info") => void
): UseUploadQueueReturn => {
  const [queue, setQueue] = useState<UploadItem[]>([]); // [ {A: CANCELLED}, {B: PENDING}, {C: PENDING} ]: main upload queue state with file descriptions and id
  const queueRef = useRef<UploadItem[]>(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]); // exact copy of queue for startWorker and mutation handler hook
  const fileMap = useRef<Map<string, File>>(new Map()); // map of queue item id to File(from queue) objects for ?

  const activeIdsRef = useRef<Set<string>>(new Set()); // {}   // A removed or  {A} UPLOADING -> no uploading same fie twice
  const activeCountRef = useRef(0); // UPLOADING status objects count, concurency limit
  const tasksRef = useRef<string[]>([]); // []. No uploads to start. ['B','C'] only PENDING ids
  const workerRunningRef = useRef(false); // to keep track of one task or bundle of files getting uploaded in loop

  const updateQueue = useCallback(
    (updater: (prev: UploadItem[]) => UploadItem[]) => {
      // accepts callbackk to update as needed

      setQueue((prev) => {
        const next = updater(prev);
        if (
          prev.length === next.length &&
          next.every((n, i) => n === prev[i])
        ) {
          return prev;
        }
        return next;
      });
    },
    []
  );

  // ---------- 1) handleProgress ----------
  const handleProgress = useCallback(
    (id: string, progress: number) => {
      updateQueue((prev) =>
        prev.map((it) => (it.id === id ? { ...it, progress } : it))
      );
    },
    [updateQueue]
  );

  // ---------- 2) handleSuccess ----------
  const handleSuccess = useCallback(
    (itemId: string) => {
      const item = queueRef.current.find((it) => it.id === itemId);

      updateQueue((prev) =>
        prev.map((it) =>
          it.id === itemId
            ? { ...it, progress: 100, status: "SUCCESS", controller: undefined }
            : it
        )
      );

      activeCountRef.current = Math.max(0, activeCountRef.current - 1);
      activeIdsRef.current.delete(itemId);

      startWorker();

      if (item) {
        onSnackbar(`Uploaded ${item.fileName}`, "success");
      }
    },
    [updateQueue, onSnackbar]
  );

  // ---------- 3) handleError ----------
  const handleError = useCallback(
    (itemId: string, error: string) => {
      const item = queueRef.current.find((it) => it.id === itemId);

      updateQueue((prev) =>
        prev.map((it) => {
          if (it.id !== itemId) return it;

          if (it.status === "CANCELLED") {
            return { ...it, controller: undefined };
          }

          return { ...it, status: "FAILED", error, controller: undefined };
        })
      );

      activeCountRef.current = Math.max(0, activeCountRef.current - 1);
      activeIdsRef.current.delete(itemId);
      fileMap.current.delete(itemId);

      startWorker();

      if (item) {
        onSnackbar(`Failed ${item.fileName}`, "error");
      }
    },
    [updateQueue, onSnackbar]
  );

  // ---------- 4) mutation (AFTER success/error are defined) ----------
  const mutation = useUploadMutation({
    onProgress: handleProgress,
    onSuccess: handleSuccess,
    onError: handleError,
    fileMap,
  });

  // ---------- 5) enqueuePendingIds ----------
  const enqueuePendingIds = useCallback(() => {
    const cur = queueRef.current;
    const pending = cur.filter((p) => p.status === "PENDING").map((p) => p.id);
    const set = new Set(tasksRef.current);

    pending.forEach((id) => {
      if (!set.has(id)) {
        tasksRef.current.push(id);
        set.add(id);
      }
    });
  }, []);

  // ---------- 6) startWorker (AFTER mutation exists) ----------
  const startWorker = useCallback(() => {
    if (workerRunningRef.current) return;
    workerRunningRef.current = true;

    (async function workerLoop() {
      try {
        // till tasksRef becomes empty
        while (true) {
          if (!tasksRef.current.length) break;
          if (activeCountRef.current >= CONCURRENCY) break;

          const id = tasksRef.current.shift()!;
          const it = queueRef.current.find((x) => x.id === id);
          if (!it || it.status !== "PENDING") continue;
          if (activeIdsRef.current.has(id)) continue;

          activeIdsRef.current.add(id);

          const controller = new AbortController();

          updateQueue((prev) =>
            prev.map((x) =>
              x.id === id && x.status === "PENDING"
                ? { ...x, status: "UPLOADING", controller }
                : x
            )
          );

          activeCountRef.current += 1;

          mutation.mutate({
            item: { ...it, controller },
            signal: controller.signal,
          });

          await new Promise((r) => setTimeout(r, 0));
        }
      } finally {
        workerRunningRef.current = false;
      }
    })();
  }, [mutation, updateQueue]);

  // ---------- 7) sync worker on queue updates ----------
  useEffect(() => {
    enqueuePendingIds();
    startWorker();
  }, [queue]);

  // ---------- 8) handleFiles ----------
  const handleFiles = useCallback(
    (files: File[]) => {
      const items: UploadItem[] = files.map((f) => {
        const id =
          (globalThis as any).crypto?.randomUUID?.() ??
          String(Date.now()) + Math.random().toString(36).slice(2, 8);

        fileMap.current.set(id, f);

        if (!ALLOWED.includes(f.type)) {
          return {
            id,
            fileName: f.name,
            fileSize: f.size,
            status: "FAILED",
            progress: 0,
            error: "Invalid file type",
          } as UploadItem;
        }

        if (f.size > MAX_BYTES) {
          return {
            id,
            fileName: f.name,
            fileSize: f.size,
            status: "FAILED",
            progress: 0,
            error: "File exceeds 10MB",
          } as UploadItem;
        }

        return {
          id,
          fileName: f.name,
          fileSize: f.size,
          status: "PENDING",
          progress: 0,
        } as UploadItem;
      });

      updateQueue((prev) => [...prev, ...items]);

      enqueuePendingIds();
      startWorker();
    },
    [updateQueue, enqueuePendingIds, startWorker]
  );

  // ---------- 9) cancelItem ----------
  const cancelItem = useCallback(
    (id: string) => {
      const item = queueRef.current.find((it) => it.id === id);
      if (!item) return;

      if (item.status === "UPLOADING") {
        item.controller?.abort();
      }

      activeIdsRef.current.delete(id);

      updateQueue((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                status: "CANCELLED",
                error: "Cancelled by user",
                controller: undefined,
              }
            : it
        )
      );

      startWorker();
    },
    [updateQueue, startWorker]
  );

  // ---------- 10) retry ----------
  const retry = useCallback(
    (id: string) => {
      updateQueue((prev) =>
        prev.map((it) =>
          it.id === id
            ? { ...it, status: "PENDING", progress: 0, error: undefined }
            : it
        )
      );
      enqueuePendingIds();
      startWorker();
    },
    [updateQueue, enqueuePendingIds, startWorker]
  );

  // ---------- 11) removeItem ----------
  const removeItem = useCallback(
    (id: string) => {
      updateQueue((prev) => prev.filter((it) => it.id !== id));
      fileMap.current.delete(id);
      tasksRef.current = tasksRef.current.filter((tid) => tid !== id);
      activeIdsRef.current.delete(id);
    },
    [updateQueue]
  );

  // ---------- 12) cancelAll ----------
  const cancelAll = useCallback(() => {
    queueRef.current.forEach((it) => {
      if (it.status === "UPLOADING") {
        it.controller?.abort();
      }
    });

    updateQueue((prev) =>
      prev.map((it) =>
        it.status === "SUCCESS"
          ? it
          : { ...it, status: "CANCELLED", controller: undefined }
      )
    );

    tasksRef.current = [];
    activeIdsRef.current.clear();

    onSnackbar("All uploads cancelled", "info");
    startWorker();
  }, [updateQueue, onSnackbar, startWorker]);

  // ---------- 13) clearCompleted ----------
  const clearCompleted = useCallback(() => {
    updateQueue((q) => q.filter((it) => it.status !== "SUCCESS"));
  }, [updateQueue]);

  // ---------- 14) derived UI state ----------
  const pendingCount = queue.filter((it) => it.status === "PENDING").length;
  const uploadingCount = queue.filter((it) => it.status === "UPLOADING").length;
  const successCount = queue.filter((it) => it.status === "SUCCESS").length;
  const hasCancellable = pendingCount + uploadingCount > 0;

  return {
    queue,
    handleFiles,
    cancelItem,
    retry,
    removeItem,
    cancelAll,
    clearCompleted,
    pendingCount,
    uploadingCount,
    successCount,
    hasCancellable,
  };
};
