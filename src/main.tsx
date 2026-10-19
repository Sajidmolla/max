import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './lib/auth'
import { configMissing } from './lib/supabase'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  configMissing ? (
    <div className="p-8 max-w-xl mx-auto"><h1 className="font-display text-4xl text-max">MAX</h1>
      <p className="mt-4">Missing configuration. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> (see README), then rebuild.</p></div>
  ) : (
    <React.StrictMode><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></React.StrictMode>
  )
)
