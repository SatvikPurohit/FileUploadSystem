import { Box, Container, Typography, Button } from '@mui/material';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import { UploadQueue } from '../components/UploadQueue';

interface UploadProps {
  onNavigate: (page: string) => void;
}

export const Upload = ({ onNavigate }: UploadProps) => {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="md">
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Upload
          </Typography>
          <Button startIcon={<KeyboardBackspaceIcon />} onClick={() => onNavigate('home')} size="small">
            Back
          </Button>
        </Box>

        <Box sx={{ backgroundColor: '#fff', p: 2, borderRadius: 1, border: '1px solid #ddd' }}>
          <UploadQueue />
        </Box>
      </Container>
    </Box>
  );
};
