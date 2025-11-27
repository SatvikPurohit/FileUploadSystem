"use client";

import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
  Card,
  CardContent,
  Divider,
} from "@mui/material";

export default function LoginPage() {
  const [email, setEmail] = useState("demo@local.test");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function validate() {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError("Enter a valid email.");
      return false;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return false;
    }
    setError(null);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const resp = await axios.post("/api/auth/login", { email, password });
      const access = resp.data?.access;
      if (access) {
        sessionStorage.setItem("access", access);
      }
      router.push("/upload");
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            borderRadius: 2,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                mb: 0.5,
              }}
            >
              Welcome
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Sign in to manage your uploads
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              {error && (
                <Alert severity="error" sx={{ borderRadius: 1 }}>
                  {error}
                </Alert>
              )}

              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
                placeholder="demo@local.test"
                variant="outlined"
                size="medium"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1,
                    "&:hover fieldset": {
                      borderColor: "#667eea",
                    },
                  },
                }}
              />

              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                placeholder="••••••••"
                variant="outlined"
                size="medium"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1,
                    "&:hover fieldset": {
                      borderColor: "#667eea",
                    },
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  py: 1.5,
                  fontWeight: 600,
                  fontSize: "1rem",
                  textTransform: "none",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    boxShadow: "0 8px 20px rgba(102, 126, 234, 0.4)",
                    transform: "translateY(-2px)",
                  },
                  "&:disabled": {
                    background: "#ccc",
                  },
                }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </Stack>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Demo Credentials */}
          <Card
            elevation={0}
            sx={{
              background: "#f5f5f5",
              border: "1px solid #e0e0e0",
              borderRadius: 1,
            }}
          >
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Try it out:
              </Typography>
              <Stack spacing={0.5}>
                <Typography variant="caption">
                  📧 Email: <code style={{ fontWeight: 600 }}>demo@local.test</code>
                </Typography>
                <Typography variant="caption">
                  🔐 Password: <code style={{ fontWeight: 600 }}>Password123!</code>
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Paper>
      </Container>
    </Box>
  );
}
