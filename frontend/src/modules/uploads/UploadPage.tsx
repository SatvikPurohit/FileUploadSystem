import { useEffect, useRef, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Snackbar,
  Alert,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteIcon from "@mui/icons-material/Delete";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { AxiosProgressEvent } from "axios";
import axios from "../../api/axios";
import type { UploadItem } from "../../types";

type MutVars = { item: UploadItem; signal?: AbortSignal };
type UploadResult = unknown;

// Allowed file types & limits
const ALLOWED = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const MAX_BYTES = 10 * 1024 * 1024;
const CONCURRENCY = 3;

export default function UploadPage() {
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [snack, setSnack] = useState<{
    open: boolean;
    msg: string;
    severity: "success" | "error" | "info";
  } | null>(null);

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

  // Add files handler
  const handleFiles = (files: File[]) => {
    // Remove previous "reject if files.length > CONCURRENCY" logic.
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
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => handleFiles(acceptedFiles),
    multiple: true,
  });

  // Upload single file using axios — accepts AbortSignal and reports progress.
  const uploadSingle = useCallback(
    async (item: UploadItem, signal?: AbortSignal): Promise<UploadResult> => {
      const file = fileMap.current.get(item.id);
      if (!file) throw new Error("File not found");

      const form = new FormData();
      form.append("file", file);

      const res = await axios.post("/upload", form, {
        withCredentials: true,
        signal,
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          const loaded = progressEvent.loaded ?? 0;
          const total = progressEvent.total ?? file.size;
          const pct = total ? Math.round((loaded * 100) / total) : 0;
          updateQueue((prev) =>
            prev.map((it) =>
              it.id === item.id ? { ...it, progress: pct } : it
            )
          );
        },
      });

      return res.data;
    },
    [updateQueue]
  );

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

  // mutation with success/error handlers — defined after worker so startWorker exists
  const mutation = useMutation<UploadResult, Error, MutVars, unknown>({
    mutationFn: async (vars: MutVars) => uploadSingle(vars.item, vars.signal),

    onSuccess: (_data, vars) => {
      // mark success
      updateQueue((prev) =>
        prev.map((it) =>
          it.id === vars.item.id
            ? { ...it, progress: 100, status: "SUCCESS", controller: undefined }
            : it
        )
      );
      // housekeeping
      activeCountRef.current = Math.max(0, activeCountRef.current - 1);
      activeIdsRef.current.delete(vars.item.id);
      // trigger worker to pick next
      startWorker();
      setSnack({
        open: true,
        msg: `Uploaded ${vars.item.fileName}`,
        severity: "success",
      });
    },

    onError: (err: unknown, vars) => {
      const message =
        (err as any)?.response?.data?.error ??
        (err as any)?.message ??
        "Upload error";
      updateQueue((prev) =>
        prev.map((it) =>
          it.id === vars.item.id
            ? { ...it, status: "FAILED", error: message, controller: undefined }
            : it
        )
      );
      activeCountRef.current = Math.max(0, activeCountRef.current - 1);
      activeIdsRef.current.delete(vars.item.id);
      startWorker();
      setSnack({
        open: true,
        msg: `Failed ${vars.item.fileName}`,
        severity: "error",
      });
    },
  });

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

  // Cancel a specific item
  const cancelItem = (id: string) => {
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
  };

  // Retry (put back to PENDING)
  const retry = (id: string) => {
    updateQueue((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, status: "PENDING", progress: 0, error: undefined }
          : it
      )
    );
    enqueuePendingIds();
    startWorker();
  };

  // Remove item from list (and remove file)
  const removeItem = (id: string) => {
    updateQueue((prev) => prev.filter((it) => it.id !== id));
    fileMap.current.delete(id);
    tasksRef.current = tasksRef.current.filter((tid) => tid !== id);
    activeIdsRef.current.delete(id);
  };

  // Cancel all
  const cancelAll = () => {
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
    setSnack({ open: true, msg: "All uploads cancelled", severity: "info" });
    startWorker();
  };

  // Derived UI counts
  const pendingCount = queue.filter((it) => it.status === "PENDING").length;
  const uploadingCount = queue.filter((it) => it.status === "UPLOADING").length;
  const successCount = queue.filter((it) => it.status === "SUCCESS").length;
  const hasCancellable = pendingCount + uploadingCount > 0;

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" gap={2}>
        <Button
          onClick={cancelAll}
          startIcon={<CancelIcon />}
          disabled={!hasCancellable}
        >
          Cancel All
        </Button>
        <Button
          onClick={() =>
            updateQueue((q) => q.filter((it) => it.status !== "SUCCESS"))
          }
          startIcon={<DeleteIcon />}
          disabled={successCount === 0}
        >
          Clear Completed
        </Button>
      </Box>

      <ConcurrencyDemo queue={queue} />

      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          textAlign: "center",
          border: "2px dashed",
          borderColor: "grey.400",
          cursor: "pointer",
        }}
      >
        <input {...getInputProps()} />
        <UploadFileIcon sx={{ fontSize: 64, mb: 1 }} />
        <Typography>Drag & drop files here, or click to select</Typography>
        <Typography variant="caption">
          Allowed: PDF, DOCX, TXT — max 10MB each
        </Typography>
      </Paper>

      <List>
        {queue.map((it) => (
          <Paper key={it.id} sx={{ mt: 2, p: 1 }}>
            <ListItem>
              <ListItemText
                primary={it.fileName}
                secondary={`${(it.fileSize / 1024 / 1024).toFixed(2)} MB`}
              />
              <Box sx={{ width: "40%", mr: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={it.progress}
                  sx={{
                    height: 8,
                    borderRadius: 5,
                    "& .MuiLinearProgress-bar": {
                      backgroundColor:
                        it.status === "SUCCESS"
                          ? "success.main"
                          : it.status === "FAILED"
                          ? "error.main"
                          : it.status === "PENDING"
                          ? "warning.main"
                          : it.status === "CANCELLED"
                          ? "error.main"
                          : "info.main", // UPLOADING
                    },
                    backgroundColor:
                      it.status === "PENDING"
                        ? "warning.light"
                        : it.status === "FAILED" || it.status === "CANCELLED"
                        ? "error.light"
                        : "grey.300",
                  }}
                />

                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color:
                      it.status === "SUCCESS"
                        ? "success.main"
                        : it.status === "FAILED"
                        ? "error.main"
                        : it.status === "PENDING"
                        ? "warning.main"
                        : it.status === "CANCELLED"
                        ? "error.main"
                        : "info.main",
                  }}
                >
                  {it.status}
                  {it.error ? " — " + it.error : ""}
                </Typography>
              </Box>
              <ListItemSecondaryAction>
                {it.status === "FAILED" && (
                  <IconButton onClick={() => retry(it.id)}>
                    <RefreshIcon />
                  </IconButton>
                )}
                <IconButton onClick={() => removeItem(it.id)}>
                  <DeleteIcon />
                </IconButton>
                {it.status === "UPLOADING" && (
                  <IconButton onClick={() => cancelItem(it.id)}>
                    <CancelIcon />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          </Paper>
        ))}
      </List>

      <Snackbar
        open={!!snack?.open}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
      >
        <Alert severity={snack?.severity}>{snack?.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

const ConcurrencyDemo = ({ queue }: { queue: UploadItem[] }) => {
  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      <Typography variant="subtitle2">
        Uploading (max {CONCURRENCY}):
      </Typography>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
        {queue
          .filter((it) => it.status === "UPLOADING")
          .map((it) => (
            <Paper key={it.id} sx={{ px: 1, py: 0.5, bgcolor: "info.light" }}>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {it.fileName}
              </Typography>
            </Paper>
          ))}
        {queue.filter((it) => it.status === "UPLOADING").length === 0 && (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            (none)
          </Typography>
        )}
      </Box>

      <Typography variant="subtitle2">Waiting:</Typography>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {queue
          .filter((it) => it.status === "PENDING")
          .map((it) => (
            <Paper key={it.id} sx={{ px: 1, py: 0.5, bgcolor: "grey.100" }}>
              <Typography variant="caption">{it.fileName}</Typography>
            </Paper>
          ))}
        {queue.filter((it) => it.status === "PENDING").length === 0 && (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            (none)
          </Typography>
        )}
      </Box>
    </Box>
  );
};
