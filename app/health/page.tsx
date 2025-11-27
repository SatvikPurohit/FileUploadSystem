// app/health/page.tsx
import { Box, Container, Typography, Paper, Stack, Chip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export default function HealthPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          textAlign: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          borderRadius: 3,
        }}
      >
        <CheckCircleIcon sx={{ fontSize: 64, mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          System is Running
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9, mb: 3 }}>
          All systems are operational and ready to go.
        </Typography>

        <Stack spacing={2} sx={{ mt: 3 }}>
          <Box>
            <Chip label="✓ Server" color="success" />
            <Chip label="✓ Database" color="success" sx={{ ml: 1 }} />
            <Chip label="✓ API" color="success" sx={{ ml: 1 }} />
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
}
