import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Planner from './Planner.jsx'
import './index.css'

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Planner />
  </StrictMode>,
)
