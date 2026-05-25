import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { applyAppearanceSettings, loadAppearanceSettings } from './data/appearanceSettings'

applyAppearanceSettings(loadAppearanceSettings())

registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
