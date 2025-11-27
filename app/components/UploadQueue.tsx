// components/UploadQueue.tsx
import React, { useRef } from "react";
import {
  Button,
  Card,
  CardContent,
  LinearProgress,
  Box,
  Stack,
  Typography,
  Chip,
} from "@mui/material";
import {
  useServerUploadQueue,
  type UploadItem,
} from "../../hooks/useServerUploadQueue";

export default function UploadQueue() {
  const { items, enqueue, cancelOne, retry, cancelAll } =
    useServerUploadQueue(3);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const getStatusColor = (status: string): "default" | "primary" | "success" | "error" | "warning" => {
    switch (status) {
      case "success":
        return "success";
      case "failed":
        return "error";
      case "uploading":
        return "primary";
      default:
        return "default";
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Controls */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <input
          ref={fileRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => e.target.files && enqueue(e.target.files)}
        />
        <Button
          variant="contained"
          size="large"
          onClick={() => fileRef.current?.click()}
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            fontWeight: 600,
            py: 1.5,
          }}
        >
          + Pick Files
        </Button>
        <Button
          variant="outlined"
          color="error"
          size="large"
          onClick={() => cancelAll()}
          sx={{ fontWeight: 600 }}
        >
          Stop All
        </Button>
      </Stack>

      {/* Items list */}
      <Stack spacing={2}>
        {items.length === 0 && (
          <Card elevation={0} sx={{ p: 3, textAlign: "center", background: "#f5f5f5" }}>
            <Typography variant="body2" color="textSecondary">
              No files yet. Pick some to get started!
            </Typography>
          </Card>
        )}
        {items.map((it: UploadItem) => (
          <Card
            key={it.id}
            elevation={1}
            sx={{
              background: it.status === "success" ? "#f1f8e9" : "#fff",
              transition: "all 0.3s ease",
              "&:hover": {
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              },
            }}
          >
            <CardContent sx={{ pb: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                <Box sx={{ flex: 1, mr: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {it.file.name}
                    </Typography>
                    <Chip
                      label={it.status}
                      size="small"
                      color={getStatusColor(it.status)}
                      variant="outlined"
                    />
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    {it.progress}% • {(it.file.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                  {it.status === "failed" && (
                    <Button size="small" variant="outlined" onClick={() => retry(it.id)}>
                      Retry
                    </Button>
                  )}
                  {it.status !== "success" && (
                    <Button size="small" color="error" variant="outlined" onClick={() => cancelOne(it.id)}>
                      Cancel
                    </Button>
                  )}
                  {it.status === "success" && (
                    <Button
                      size="small"
                      variant="contained"
                      href={`/api/download?docId=${it.docId}`}
                      component="a"
                    >
                      Download
                    </Button>
                  )}
                </Stack>
              </Box>
              <Box sx={{ position: "relative" }}>
                <LinearProgress
                  variant="determinate"
                  value={it.progress}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    background: "#e0e0e0",
                    "& .MuiLinearProgress-bar": {
                      background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                      borderRadius: 4,
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}
