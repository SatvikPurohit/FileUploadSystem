import { useRef } from 'react';
import { Box, Button, LinearProgress, Typography, Stack, Alert } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useServerUploadQueue } from '../hooks/useUpload';

export const UploadQueue = () => {
  const { items, addFiles, upload, cancel, retry, download } = useServerUploadQueue();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const uploading = items.some(i => i.status === 'uploading');

  // Normalize progress which might come as 0..1 or 0..100 or undefined/null.
  const normalizeProgress = (p?: number) => {
    if (p == null || Number.isNaN(p)) return 0;
    // if it's a fraction <= 1 treat as 0..1 => convert to 0..100
    if (p > 0 && p <= 1) return Math.round(p * 100);
    // if > 1 assume 0..100 already, clamp it
    return Math.max(0, Math.min(100, Math.round(p)));
  };

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept=".pdf,.docx,.txt"
        />
        <Button
          startIcon={<CloudUploadIcon />}
          variant="contained"
          onClick={() => fileInputRef.current?.click()}
        >
          Pick Files
        </Button>
        <Button
          variant="outlined"
          onClick={upload}
          disabled={uploading || items.filter(i => i.status === 'pending').length === 0}
        >
          Upload
        </Button>
        <Button
          variant="outlined"
          color="error"
          disabled={items.length === 0}
          onClick={() => items.forEach(i => cancel(i.id))}
        >
          Clear All
        </Button>
      </Box>

      {items.length === 0 && (
        <Alert severity="info">No files yet. Pick some above.</Alert>
      )}

      <Stack spacing={1.5}>
        {items.map(item => {
          const progressValue = normalizeProgress(item.progress);

          return (
            <Box
              key={item.id}
              sx={{ p: 1.5, backgroundColor: '#fff', borderRadius: 1, border: '1px solid #ddd' }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {item.filename}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: item.status === 'error' ? 'red' : item.status === 'success' ? 'green' : 'inherit'
                  }}
                >
                  {item.status.toUpperCase()}
                </Typography>
              </Box>

              {/* Show progress for uploading items.
                  - If progressValue === 0, show indeterminate animation
                  - Else show determinate with normalized value */}
              {item.status === 'uploading' && (
                <Box sx={{ mb: 1 }}>
                  {progressValue === 0 ? (
                    <LinearProgress sx={{ height: 8, borderRadius: 1 }} />
                  ) : (
                    <Box>
                      <LinearProgress
                        variant="determinate"
                        value={progressValue}
                        sx={{ height: 8, borderRadius: 1, mb: 0.5 }}
                      />
                      <Typography variant="caption">{progressValue}%</Typography>
                    </Box>
                  )}
                </Box>
              )}

              {item.error && <Alert severity="error" sx={{ mb: 1, py: 0.5 }}>{item.error}</Alert>}

              <Box sx={{ display: 'flex', gap: 1 }}>
                {item.status === 'error' && (
                  <Button size="small" startIcon={<RestartAltIcon />} onClick={() => retry(item.id)}>
                    Retry
                  </Button>
                )}
                {item.status === 'success' && (
                  <Button size="small" startIcon={<FileDownloadIcon />} onClick={() => download(item)}>
                    Download
                  </Button>
                )}
                <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => cancel(item.id)}>
                  Remove
                </Button>
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
};
