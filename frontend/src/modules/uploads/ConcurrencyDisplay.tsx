import { Box, Paper, Typography } from "@mui/material";
import type { UploadItem } from "../../types";

const CONCURRENCY = 3;

interface ConcurrencyDisplayProps {
  queue: UploadItem[];
}

export const ConcurrencyDisplay = ({ queue }: ConcurrencyDisplayProps) => {
  const uploadingItems = queue.filter((it) => it.status === "UPLOADING");
  const pendingItems = queue.filter((it) => it.status === "PENDING");

  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      <Typography variant="subtitle2">
        Uploading (max {CONCURRENCY}):
      </Typography>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
        {uploadingItems.map((it) => (
          <Paper key={it.id} sx={{ px: 1, py: 0.5, bgcolor: "info.light" }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {it.fileName}
            </Typography>
          </Paper>
        ))}
        {uploadingItems.length === 0 && (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            (none)
          </Typography>
        )}
      </Box>

      <Typography variant="subtitle2">Waiting:</Typography>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {pendingItems.map((it) => (
          <Paper key={it.id} sx={{ px: 1, py: 0.5, bgcolor: "grey.100" }}>
            <Typography variant="caption">{it.fileName}</Typography>
          </Paper>
        ))}
        {pendingItems.length === 0 && (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            (none)
          </Typography>
        )}
      </Box>
    </Box>
  );
};
