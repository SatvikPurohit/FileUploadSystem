// Example ProtectedRoute
import React, { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import { AuthContext } from "../AuthConext";
import Navbar from "./Navbar";

export default function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const auth = useContext(AuthContext)!;

  if (auth.isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
