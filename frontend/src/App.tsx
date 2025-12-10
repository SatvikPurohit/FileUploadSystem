import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { CircularProgress, Box } from "@mui/material";
import LoginPage from "./modules/auth/LoginPage";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";

const UploadPage = lazy(() => import("./modules/uploads/UploadPage"));

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Suspense
                fallback={
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    height="100vh"
                  >
                    <CircularProgress />
                  </Box>
                }
              >
                <UploadPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/upload" replace />} />
      </Routes>
    </AppLayout>
  );
}
