// src/components/LogoutButton.tsx
import React from 'react'
import { Button } from '@mui/material'
import { logout } from '../hooks/useAuth'

export default function LogoutButton() {
  return <Button color="error" onClick={() => logout()}>Logout</Button>
}
