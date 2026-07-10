import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import DxfStudio from './components/DxfStudio/DxfStudio.jsx'

const isDxfMode = window.location.pathname === '/dxf';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isDxfMode ? <DxfStudio /> : <App />}
  </StrictMode>,
)
