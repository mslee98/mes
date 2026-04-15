import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from "./context/ThemeContext.tsx"
import { KeycloakProvider } from "./context/KeycloakProvider.tsx"
import { AuthProvider } from "./context/AuthContext.tsx"
import { AppWrapper } from "./components/common/PageMeta.tsx"
import { queryClient } from "./lib/queryClient.ts"
import { isKeycloakAuthEnabled } from "./config/keycloakEnv.ts"

export function AppWithAuth() {
  const keycloakOn = isKeycloakAuthEnabled();
  return keycloakOn ? (
    <AppWrapper>
      <App />
    </AppWrapper>
  ) : (
    <AuthProvider>
      <AppWrapper>
        <App />
      </AppWrapper>
    </AuthProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <KeycloakProvider>
          <AppWithAuth />
        </KeycloakProvider>
      </ThemeProvider>
    </QueryClientProvider>
    <Toaster
      position="top-center"
      toastOptions={{ duration: 2000 }}
      containerStyle={{ zIndex: 999999 }}
    />
  </StrictMode>,
)
