import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import V2App from './app/V2App.tsx'
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter><V2App /></BrowserRouter>
  </StrictMode>,
)
