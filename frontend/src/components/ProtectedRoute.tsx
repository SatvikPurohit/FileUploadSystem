// src/components/ProtectedRoute.tsx
import React from 'react'
import { Navigate } from 'react-router-dom'
import { getAccessToken } from '../api/auth'

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const token = getAccessToken()
  if (!token) {
    // ensure login page is shown if no token
    return <Navigate to="/login" replace />
  }
  return children
}
