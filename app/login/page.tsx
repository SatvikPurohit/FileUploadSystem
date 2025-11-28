"use client";

import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Box, Container, TextField, Button, Typography, Alert, Stack } from "@mui/material";

export default function LoginPage() {
  const [email, setEmail] = useState("demo@local.test");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const validate = () => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      setError(err?.response?.data?.message || err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f5f5f5", py: 4 }}>
      <Container maxWidth="sm">
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Login
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ backgroundColor: "#fff", p: 3, borderRadius: 1, border: "1px solid #ddd" }}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth size="small" />
            <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth size="small" />
            <Button type="submit" variant="contained" fullWidth disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
