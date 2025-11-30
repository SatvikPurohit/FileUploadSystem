// src/pages/LoginPage.tsx
import React, { useContext, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import { AuthContext } from "../../AuthConext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    try {
      setLoading(true);
      const res = await axios.post(
        "/auth/login",
        { email, password },
        { withCredentials: true }
      );

      if (res.status === 200) {
        // update auth context so ProtectedRoute sees the user as logged in
        auth?.login?.();
        // if you want to re-verify from server: await auth?.verify?.();
        navigate("/upload");
      } else {
        setServerError("Login failed");
        console.error("login error", res.status, res.data);
      }
    } catch (err: any) {
      // prefer the message from server if present
      const message =
        err?.response?.data?.message || err.message || "Login failed";
      setServerError(message);
      console.error("login exception", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        width: "100%",
        height: "100vh",
        bgcolor: "#f5f5f5",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Paper elevation={4} sx={{ padding: 4, width: 400 }}>
        <Typography variant="h5" textAlign="center" mb={2}>
          Login
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!errors.email}
            helperText={errors.email}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            fullWidth
            label="Password"
            type="password"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!errors.password}
            helperText={errors.password}
            InputLabelProps={{ shrink: true }}
          />

          {serverError && (
            <Typography color="error" mt={1} textAlign="center">
              {serverError}
            </Typography>
          )}

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : "Login"}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
