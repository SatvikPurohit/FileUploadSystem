"use client";

import { Box, Container, Typography, Button, Stack } from "@mui/material";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f5f5f5", py: 4 }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ mb: 6, textAlign: "center" }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 600, mb: 1 }}
          >
            Upload Files
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Store files locally. Simple as that.
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Stack spacing={2} sx={{ mb: 4 }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => router.push("/upload")}
            sx={{ py: 2 }}
          >
            Upload Files
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => router.push("/login")}
            sx={{ py: 2 }}
          >
            Login
          </Button>
        </Stack>

        {/* Demo Info */}
        <Box sx={{ p: 2, backgroundColor: "#fff", borderRadius: 1, border: "1px solid #ddd" }}>
          <Typography variant="caption" display="block" sx={{ mb: 1, fontWeight: 600 }}>
            Demo login:
          </Typography>
          <Typography variant="caption">
            Email: demo@local.test
          </Typography>
          <br />
          <Typography variant="caption">
            Password: Password123!
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
