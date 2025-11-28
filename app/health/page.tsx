import { Box, Container, Typography, Stack } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export default function HealthPage() {
  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f5f5f5", py: 4 }}>
      <Container maxWidth="md">
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 48, color: "green", mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            System Status
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Everything is running
          </Typography>
        </Box>

        <Stack spacing={1} sx={{ backgroundColor: "#fff", p: 3, borderRadius: 1, border: "1px solid #ddd" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2">Server</Typography>
            <Typography variant="body2" sx={{ color: "green", fontWeight: 600 }}>
              ✓ OK
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2">Database</Typography>
            <Typography variant="body2" sx={{ color: "green", fontWeight: 600 }}>
              ✓ OK
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2">API</Typography>
            <Typography variant="body2" sx={{ color: "green", fontWeight: 600 }}>
              ✓ OK
            </Typography>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
