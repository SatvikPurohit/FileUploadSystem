import { useState, useRef, useEffect, useCallback } from "react";
import type { UploadItem } from "../../types";
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
  successCount: number;
  hasCancellable: boolean;
}

export const useUploadQueue = (
  onSnackbar: (msg: string, severity: "success" | "error" | "info") => void
): UseUploadQueueReturn => {
  const [queue, setQueue] = useState<UploadItem[]>([]);

  // store file objects out-of-state
  const fileMap = useRef<Map<string, File>>(new Map());
  // keep a ref of queue for worker/reads
  const queueRef = useRef<UploadItem[]>(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // final guard: ensure id isn't started twice
  const activeIdsRef = useRef<Set<string>>(new Set());
  // count of active uploads
  const activeCountRef = useRef(0);
  // tasks queue (ids)
  const tasksRef = useRef<string[]>([]);
  const workerRunningRef = useRef(false);

  // helper to update queue atomically and avoid creating new array if identical
  const updateQueue = useCallback(
    (updater: (prev: UploadItem[]) => UploadItem[]) => {
      setQueue((prev) => {
        const next = updater(prev);
        if (prev.length === next.length && next.every((n, i) => n === prev[i]))
          return prev;
        return next;
      });
    },
    []
  );

  // Callbacks for mutation
  const handleProgress = useCallback(
    (id: string, progress: number) => {
      updateQueue((prev) =>
        prev.map((it) => (it.id === id ? { ...it, progress } : it))
      );
    },
    [updateQueue]
  );

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

  const handleError = useCallback(
    (itemId: string, error: string) => {
      const item = queueRef.current.find((it) => it.id === itemId);
      updateQueue((prev) =>
        prev.map((it) =>
          it.id === itemId
            ? { ...it, status: "FAILED", error, controller: undefined }
            : it
        )
      );
      activeCountRef.current = Math.max(0, activeCountRef.current - 1);
      activeIdsRef.current.delete(itemId);
      startWorker();
      if (item) {
        onSnackbar(`Failed ${item.fileName}`, "error");
      }
    },
    [updateQueue, onSnackbar]
  );

  // mutation with success/error handlers
  const mutation = useUploadMutation({
    onProgress: handleProgress,
    onSuccess: handleSuccess,
    onError: handleError,
    fileMap,
  });

  // enqueue pending ids (syncs tasksRef to any new PENDINGs)
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

  // worker: single place that starts uploads and respects concurrency (uses tasksRef)
  const startWorker = useCallback(() => {
    if (workerRunningRef.current) return;
    workerRunningRef.current = true;

    (async function workerLoop() {
      try {
        while (true) {
          // if no tasks, break
          if (!tasksRef.current.length) break;

          // HARD concurrency limit: stop if >= CONCURRENCY
          if (activeCountRef.current >= CONCURRENCY) break;

          const id = tasksRef.current.shift()!;
          const it = queueRef.current.find((x) => x.id === id);
          if (!it || it.status !== "PENDING") {
            continue;
          }

          // final guard: skip if already active
          if (activeIdsRef.current.has(id)) {
            continue;
          }

          // reserve id immediately
          activeIdsRef.current.add(id);

          // attach controller & flip state
          const controller = new AbortController();
          updateQueue((prev) =>
            prev.map((x) =>
              x.id === id && x.status === "PENDING"
                ? { ...x, status: "UPLOADING", controller }
                : x
            )
          );

          activeCountRef.current += 1;

          // start upload (mutation handles completion)
          mutation.mutate({
            item: { ...it, controller },
            signal: controller.signal,
          });

          // micro-yield so other tasks can be queued
          await new Promise((r) => setTimeout(r, 0));
        }
      } finally {
        workerRunningRef.current = false;
      }
    })();
  }, [mutation, updateQueue]);

  // keep worker in sync whenever queue changes
  useEffect(() => {
    enqueuePendingIds();
    startWorker();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue]);

  // Add files handler
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

      // Append all new items to the queue (worker will only start up to CONCURRENCY items)
      updateQueue((prev) => [...prev, ...items]);

      // ensure worker picks them up
      enqueuePendingIds();
      startWorker();
    },
    [updateQueue, enqueuePendingIds, startWorker]
  );

  // Cancel a specific item
  const cancelItem = useCallback(
    (id: string) => {
      const wasUploading = queueRef.current.some(
        (it) => it.id === id && it.status === "UPLOADING"
      );
      if (wasUploading) {
        activeCountRef.current = Math.max(0, activeCountRef.current - 1);
      }

      updateQueue((prev) =>
        prev.map((it) => {
          if (it.id === id) {
            it.controller?.abort();
            activeIdsRef.current.delete(id);
            return {
              ...it,
              status: "CANCELLED",
              error: "Cancelled by user",
              controller: undefined,
            };
          }
          return it;
        })
      );

      // ensure worker can pick next
      startWorker();
    },
    [updateQueue, startWorker]
  );

  // Retry (put back to PENDING)
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

  // Remove item from list (and remove file)
  const removeItem = useCallback(
    (id: string) => {
      updateQueue((prev) => prev.filter((it) => it.id !== id));
      fileMap.current.delete(id);
      tasksRef.current = tasksRef.current.filter((tid) => tid !== id);
      activeIdsRef.current.delete(id);
    },
    [updateQueue]
  );

  // Cancel all
  const cancelAll = useCallback(() => {
    const uploadingCount = queueRef.current.filter(
      (it) => it.status === "UPLOADING"
    ).length;
    activeCountRef.current = Math.max(
      0,
      activeCountRef.current - uploadingCount
    );

    updateQueue((prev) => {
      prev.forEach((it) => it.controller?.abort());
      return prev.map((it) =>
        it.status === "SUCCESS"
          ? it
          : { ...it, status: "CANCELLED", controller: undefined }
      );
    });

    tasksRef.current = [];
    onSnackbar("All uploads cancelled", "info");
    startWorker();
  }, [updateQueue, onSnackbar, startWorker]);

  // Clear completed items
  const clearCompleted = useCallback(() => {
    updateQueue((q) => q.filter((it) => it.status !== "SUCCESS"));
  }, [updateQueue]);

  // Derived UI counts
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
    successCount,
    hasCancellable,
  };
};
