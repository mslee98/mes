import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from "./context/ThemeContext.tsx"
import { AuthProvider } from "./context/AuthContext.tsx"
import { AppWrapper } from "./components/common/PageMeta.tsx"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <AppWrapper>
          <App />
        </AppWrapper>
      </AuthProvider>
    </ThemeProvider>
    <Toaster
      position="top-center"
      toastOptions={{ duration: 2000 }}
      containerStyle={{ zIndex: 999999 }}
    />
  </StrictMode>,
)
