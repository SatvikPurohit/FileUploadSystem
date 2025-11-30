import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./modules/auth/LoginPage";
import UploadPage from "./modules/uploads/UploadPage";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <UploadPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/upload" replace />} />
      </Routes>
    </AppLayout>
  );
}
