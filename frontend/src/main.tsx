import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import stylisPluginRtl from 'stylis-plugin-rtl'
import CssBaseline from '@mui/material/CssBaseline'
import ThemeProvider from '@mui/material/styles/ThemeProvider'
import theme from './theme'
import App from './App'
import './mocks/browser'
import { AuthProvider } from './AuthConext'

const cacheRtl = createCache({ key: 'mui-rtl', stylisPlugins: [stylisPluginRtl] })
const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <CacheProvider value={cacheRtl}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </CacheProvider>
)
