import dynamic from "next/dynamic";
import React from "react";
import { Box, Container, Typography, Button } from "@mui/material";
import { useRouter } from "next/router";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";

const UploadQueue = dynamic(() => import("../app/components/UploadQueue"), { ssr: false });

export default function UploadPage() {
  const router = useRouter();

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f5f5f5", py: 4 }}>
      <Container maxWidth="md">
        <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Upload
          </Typography>
          <Button startIcon={<KeyboardBackspaceIcon />} onClick={() => router.push("/")} size="small">
            Back
          </Button>
        </Box>

        <Box sx={{ backgroundColor: "#fff", p: 2, borderRadius: 1, border: "1px solid #ddd" }}>
          <UploadQueue />
        </Box>
      </Container>
    </Box>
  );
}
