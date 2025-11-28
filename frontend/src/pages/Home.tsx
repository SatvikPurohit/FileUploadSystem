import { Box, Container, Typography, Button, Stack } from '@mui/material';

interface HomeProps {
  onNavigate: (page: string) => void;
}

export const Home = ({ onNavigate }: HomeProps) => {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="md">
        <Box sx={{ mb: 6, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Upload Files
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Store files locally
          </Typography>
        </Box>

        <Stack spacing={2} sx={{ mb: 4 }}>
          <Button variant="contained" size="large" onClick={() => onNavigate('upload')} sx={{ py: 2 }}>
            Upload Files
          </Button>
          <Button variant="outlined" size="large" onClick={() => onNavigate('login')} sx={{ py: 2 }}>
            Login
          </Button>
        </Stack>

        <Box sx={{ p: 2, backgroundColor: '#fff', borderRadius: 1, border: '1px solid #ddd' }}>
          <Typography variant="caption" display="block" sx={{ mb: 1, fontWeight: 600 }}>
            Demo:
          </Typography>
          <Typography variant="caption">
            demo@local.test / Password123!
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};
