import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from "./context/ThemeContext.tsx"
import { AuthProvider } from "./context/AuthContext.tsx"
import { AppWrapper } from "./components/common/PageMeta.tsx"
import { queryClient } from "./lib/queryClient.ts"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppWrapper>
            <App />
          </AppWrapper>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
    <Toaster
      position="top-center"
      toastOptions={{ duration: 2000 }}
      containerStyle={{ zIndex: 999999 }}
    />
  </StrictMode>,
)
