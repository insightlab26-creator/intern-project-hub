import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import V2App from './app/V2App.tsx'
import { BrowserRouter } from 'react-router-dom'

const rootApp = window.location.pathname.startsWith('/v2') ? <V2App /> : <App />

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>{rootApp}</BrowserRouter>
  </StrictMode>,
)
