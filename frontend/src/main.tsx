import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import { ToastProvider } from './components/Toast'
import './index.css'
import { initPWA } from './utils/pwa'

// Instalación como app en el celular (botón "Instalar en tu celular")
initPWA()

// 1.6.9 (DT-25): "data router" para poder avisar de cambios sin guardar (useBlocker). Toda la app vive
// en una sola ruta "*": las rutas de siempre siguen definidas dentro de App.
const router = createBrowserRouter([
  {
    path: '*',
    element: (
      <ToastProvider>
        <App />
      </ToastProvider>
    )
  }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
