import { ThemeProvider } from '@mui/material'
import BitcoinForecaster from './components/BitcoinForecaster'
import { theme } from './theme'
import './App.css'

function App() {
  return (
    <ThemeProvider theme={theme}>
      <div className="app">
        <BitcoinForecaster />
      </div>
    </ThemeProvider>
  )
}

export default App
