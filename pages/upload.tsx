import dynamic from "next/dynamic";
import React from "react";
import { Box, Container, Typography, Button, Stack } from "@mui/material";
import { useRouter } from "next/router";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";

const UploadQueue = dynamic(() => import("../app/components/UploadQueue"), { ssr: false });

export default function UploadPage() {
  const router = useRouter();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        py: 4,
      }}
    >
      <Container maxWidth="md">
        {/* Header with back button */}
        <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
                color: "#fff",
                mb: 0.5,
              }}
            >
              Upload Files
            </Typography>
            <Typography variant="body1" sx={{ color: "rgba(255, 255, 255, 0.8)" }}>
              Pick files to save on the server
            </Typography>
          </Box>
          <Button
            startIcon={<KeyboardBackspaceIcon />}
            onClick={() => router.push("/")}
            sx={{
              color: "#fff",
              "&:hover": {
                background: "rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            Back
          </Button>
        </Box>

        {/* Upload Queue Card */}
        <Box
          sx={{
            background: "#fff",
            borderRadius: 2,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
            overflow: "hidden",
          }}
        >
          <UploadQueue />
        </Box>
      </Container>
    </Box>
  );
}
