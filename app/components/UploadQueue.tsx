import React, { useRef } from "react";
import { Button, Box, Stack, Typography, LinearProgress } from "@mui/material";
import { useServerUploadQueue, type UploadItem } from "../../hooks/useServerUploadQueue";

export default function UploadQueue() {
  const { items, enqueue, cancelOne, retry, cancelAll } = useServerUploadQueue(3);
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <input
          ref={fileRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => e.target.files && enqueue(e.target.files)}
        />
        <Button variant="contained" onClick={() => fileRef.current?.click()}>
          Pick Files
        </Button>
        <Button variant="outlined" color="error" onClick={() => cancelAll()}>
          Stop All
        </Button>
      </Stack>

      <Stack spacing={1.5}>
        {items.length === 0 && (
          <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
            No files yet
          </Typography>
        )}
        {items.map((item: UploadItem) => (
          <Box
            key={item.id}
            sx={{
              p: 2,
              border: "1px solid #ddd",
              borderRadius: 1,
              backgroundColor: item.status === "success" ? "#f0f7ff" : "#fff",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                mb: 1,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 500, mb: 0.5 }}>
                  {item.file.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {item.status} • {item.progress}% •{" "}
                  {(item.file.size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                {item.status === "failed" && (
                  <Button size="small" variant="outlined" onClick={() => retry(item.id)}>
                    Retry
                  </Button>
                )}
                {item.status !== "success" && (
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={() => cancelOne(item.id)}
                  >
                    Cancel
                  </Button>
                )}
                {item.status === "success" && (
                  <Button
                    size="small"
                    variant="contained"
                    href={`/api/download?docId=${item.docId}`}
                    component="a"
                  >
                    Download
                  </Button>
                )}
              </Stack>
            </Box>

            <LinearProgress variant="determinate" value={item.progress} sx={{ height: 4, borderRadius: 2 }} />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
