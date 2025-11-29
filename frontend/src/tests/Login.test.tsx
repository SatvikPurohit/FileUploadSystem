import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '../modules/auth/LoginPage'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { worker } from '../mocks/browser'

beforeAll(() => worker.start())
afterAll(() => worker.stop())

test('renders login and performs login flow', async () => {
  const qc = new QueryClient()
  render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    </QueryClientProvider>
  )

  const email = screen.getByLabelText(/Email/i)
  const pass = screen.getByLabelText(/Password/i)
  fireEvent.change(email, { target: { value: 'demo@local.test' } })
  fireEvent.change(pass, { target: { value: 'password' } })
  fireEvent.click(screen.getByRole('button', { name: /login/i }))
  await waitFor(() => expect(window.location.pathname).toBe('/upload'))
})
