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
        {items.map(item => (
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

            {item.progress > 0 && item.status === 'uploading' && (
              <LinearProgress variant="determinate" value={item.progress} sx={{ mb: 1 }} />
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
        ))}
      </Stack>
    </Stack>
  );
};
