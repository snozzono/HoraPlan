import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Planner from './Planner.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Planner />
  </StrictMode>,
)
