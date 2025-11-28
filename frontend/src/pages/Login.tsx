import { useState } from 'react';
import { Box, Container, TextField, Button, Typography, Alert, Stack } from '@mui/material';
import { useAuth } from '../hooks/useAuth';

interface LoginProps {
  onLoginSuccess: () => void;
  onNavigate: (page: string) => void;
}

export const Login = ({ onLoginSuccess, onNavigate }: LoginProps) => {
  const [email, setEmail] = useState('demo@local.test');
  const [password, setPassword] = useState('Password123!');
  const { login, loading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) {
      onLoginSuccess();
      onNavigate('upload');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="sm">
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Login
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ backgroundColor: '#fff', p: 3, borderRadius: 1, border: '1px solid #ddd' }}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth size="small" />
            <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth size="small" />
            <Button type="submit" variant="contained" fullWidth disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};
