import { useEffect, useRef, useState } from "react";
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
// import PQueue from "p-queue";

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
// const queue = new PQueue({ concurrency: CONCURRENCY });

export default function UploadPage() {
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [snack, setSnack] = useState<{
    open: boolean;
    msg: string;
    severity: "success" | "error" | "info";
  } | null>(null);

  // Map to store actual File objects (not kept in state)
  const fileMap = useRef<Map<string, File>>(new Map());

  // Add files handler (stores File in fileMap and adds queue item)
  const handleFiles = (files: File[]) => {
    const items: UploadItem[] = files.map((f) => {
      const id = (globalThis as any).crypto?.randomUUID
        ? (globalThis as any).crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(36).slice(2, 8);
      fileMap.current.set(id, f);
      if (!ALLOWED.includes(f.type)) {
        return {
          id,
          fileName: f.name,
          fileSize: f.size,
          status: "FAILED",
          progress: 0,
          error: "Invalid file type",
        };
      }
      if (f.size > MAX_BYTES) {
        return {
          id,
          fileName: f.name,
          fileSize: f.size,
          status: "FAILED",
          progress: 0,
          error: "File exceeds 10MB",
        };
      }
      return {
        id,
        fileName: f.name,
        fileSize: f.size,
        status: "PENDING",
        progress: 0,
      };
    });
    setQueue((q) => [...q, ...items]);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => handleFiles(acceptedFiles),
    multiple: true,
  });

  // Upload single file using axios — accepts AbortSignal and reports progress.
  const uploadSingle = async (
    item: UploadItem,
    signal?: AbortSignal
  ): Promise<UploadResult> => {
    const file = fileMap.current.get(item.id);
    if (!file) throw new Error("File not found");

    const form = new FormData();
    form.append("files", file);

    const res = await axios.post("/upload", form, {
      signal,
      // Use AxiosProgressEvent type from axios
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        const loaded = progressEvent.loaded ?? 0;
        const total = progressEvent.total ?? file.size;
        const pct = total ? Math.round((loaded * 100) / total) : 0;
        // update progress in queue for this item
        setQueue((q) =>
          q.map((it) => (it.id === item.id ? { ...it, progress: pct } : it))
        );
      },
    });

    return res.data;
  };

  const mutation = useMutation<UploadResult, Error, MutVars, unknown>({
    // provide the mutation function here (no overload ambiguity)
    mutationFn: async (vars: MutVars) => {
      return uploadSingle(vars.item, vars.signal);
    },

    // success handler — vars has type MutVars
    onSuccess: (_data, vars) => {
      setQueue((q) =>
        q.map((it) =>
          it.id === vars.item.id
            ? { ...it, progress: 100, status: "SUCCESS", controller: undefined }
            : it
        )
      );
      setSnack({
        open: true,
        msg: `Uploaded ${vars.item.fileName}`,
        severity: "success",
      });
    },

    // error handler; err may be an Axios error object or other
    onError: (err: unknown, vars) => {
      const message =
        (err as any)?.response?.data?.error ??
        (err as any)?.message ??
        "Upload error";
      setQueue((q) =>
        q.map((it) =>
          it.id === vars.item.id
            ? { ...it, status: "FAILED", error: message, controller: undefined }
            : it
        )
      );
      setSnack({
        open: true,
        msg: `Failed ${vars.item.fileName}`,
        severity: "error",
      });
    },
  });

  // Pump enforcing concurrency
  useEffect(() => {
    let active = true;
    const pump = async () => {
      if (!active) return;
      const uploadingCount = queue.filter(
        (q) => q.status === "UPLOADING"
      ).length;
      const toStart = queue
        .filter((q) => q.status === "PENDING")
        .slice(0, CONCURRENCY - uploadingCount);
      for (const item of toStart) {
        // create abort controller for this upload
        const controller = new AbortController();

        // attach controller to queue item so cancel can abort it
        setQueue((q) =>
          q.map((it) =>
            it.id === item.id && it.status === "PENDING"
              ? { ...it, status: "UPLOADING", controller }
              : it
          )
        );

        // Start mutation and pass the signal — now types align
        mutation.mutate({ item, signal: controller.signal });
      }
    };

    pump();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue]);

  // Cancel a specific item by aborting its controller
  const cancelItem = (id: string) => {
    setQueue((q) =>
      q.map((it) => {
        if (it.id === id) {
          it.controller?.abort();
          return { ...it, status: "CANCELLED", error: "Cancelled by user", controller: undefined};
        }
        return it;
      })
    );
  };

  const retry = (id: string) => {
    setQueue((q) =>
      q.map((it) =>
        it.id === id
          ? { ...it, status: "PENDING", progress: 0, error: undefined }
          : it
      )
    );
  };

  const removeItem = (id: string) => {
    setQueue((q) => q.filter((it) => it.id !== id));
    fileMap.current.delete(id);
  };

  const cancelAll = () => {
    setQueue((q) => {
      // abort all controllers
      q.forEach((it) => it.controller?.abort());
      return q.map((it) =>
        it.status === "SUCCESS" ? it : { ...it, status: "CANCELLED" }
      );
    });
    setSnack({ open: true, msg: "All uploads cancelled", severity: "info" });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Document Upload</Typography>
          <Box>
            <Button onClick={cancelAll} startIcon={<CancelIcon />}>
              Cancel All
            </Button>
            <Button
              onClick={() =>
                setQueue((q) => q.filter((it) => it.status !== "SUCCESS"))
              }
              startIcon={<DeleteIcon />}
            >
              Clear Completed
            </Button>
          </Box>
        </Box>
      </Paper>

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
                <LinearProgress variant="determinate" value={it.progress} />
                <Typography variant="caption">
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
