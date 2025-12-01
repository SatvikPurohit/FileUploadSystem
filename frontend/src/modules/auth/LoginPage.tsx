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
import { AuthContext } from "../../AuthConext";
import { login as loginClient } from "../../api/authClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const [error, setError] = useState<string>(
    ""
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let newError = "";

    if (!email) newError = "Email required";
    if (!password) newError = "Password required";

    setError(newError);

    try {
      setLoading(true);
      await loginClient(email, password);
      auth?.login?.();
      navigate("/upload");
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err.message || "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

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
            error={!!error}
            helperText={error}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            fullWidth
            label="Password"
            type="password"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!error}
            helperText={error}
            InputLabelProps={{ shrink: true }}
          />

          {error && (
            <Typography color="error" mt={1} textAlign="center">
              Login Request: {error}
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
