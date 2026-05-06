import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './style.css'
import { GameScreen } from './ui/GameScreen'

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <GameScreen />
  </StrictMode>,
)
