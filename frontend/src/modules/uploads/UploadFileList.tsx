import { lazy } from "react";
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from "@mui/material";
import type { UploadItem } from "../../types";

const CancelIcon = lazy(() => import("@mui/icons-material/Cancel"));
const RefreshIcon = lazy(() => import("@mui/icons-material/Refresh"));
const DeleteIcon = lazy(() => import("@mui/icons-material/Delete"));

interface UploadFileListProps {
  queue: UploadItem[];
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onCancel: (id: string) => void;
}

export const UploadFileList = ({
  queue,
  onRetry,
  onRemove,
  onCancel,
}: UploadFileListProps) => {
  return (
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
            <ListItemSecondaryAction sx={{ marginTop: "0.5rem" }}>
              {it.status === "FAILED" && (
                <IconButton onClick={() => onRetry(it.id)}>
                  <RefreshIcon />
                </IconButton>
              )}
              <IconButton onClick={() => onRemove(it.id)}>
                <DeleteIcon />
              </IconButton>
              {it.status === "UPLOADING" && (
                <IconButton onClick={() => onCancel(it.id)}>
                  <CancelIcon />
                </IconButton>
              )}
            </ListItemSecondaryAction>
          </ListItem>
        </Paper>
      ))}
    </List>
  );
};
