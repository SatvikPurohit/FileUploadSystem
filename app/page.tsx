"use client";

import { Box, Container, Typography, Button, Stack, Paper } from "@mui/material";
import { useRouter } from "next/navigation";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import LoginIcon from "@mui/icons-material/Login";

export default function Home() {
  const router = useRouter();

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ textAlign: "center", color: "white", mb: 4 }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 2,
              fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
            }}
          >
            File Upload System
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 300, mb: 4, opacity: 0.95 }}>
            Upload, store, and download your files locally. Simple. Fast. Secure.
          </Typography>
        </Box>

        <Stack spacing={3} sx={{ mb: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              textAlign: "center",
              transition: "transform 0.3s, box-shadow 0.3s",
              "&:hover": {
                transform: "translateY(-8px)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              },
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Upload Files
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Select and upload multiple files. Track progress in real-time.
            </Typography>
            <Button
              variant="contained"
              fullWidth
              startIcon={<CloudUploadIcon />}
              onClick={() => router.push("/upload")}
            >
              Go to Upload
            </Button>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              textAlign: "center",
              transition: "transform 0.3s, box-shadow 0.3s",
              "&:hover": {
                transform: "translateY(-8px)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              },
            }}
          >
            <LoginIcon sx={{ fontSize: 48, color: "secondary.main", mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Login
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Manage your account and access your files securely.
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              startIcon={<LoginIcon />}
              onClick={() => router.push("/login")}
            >
              Go to Login
            </Button>
          </Paper>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            background: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            borderRadius: 2,
            color: "white",
            textAlign: "center",
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          <Typography variant="body2">
            Demo account: <strong>demo@local.test</strong> / <strong>Password123!</strong>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
