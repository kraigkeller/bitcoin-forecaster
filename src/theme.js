import { createTheme } from '@mui/material';

const getDesignTokens = (mode) => ({
  palette: {
    mode,
    ...(mode === 'dark' ? {
      primary: {
        main: '#A1A1AA',
        light: '#D4D4D8',
        dark: '#71717A',
      },
      background: {
        default: '#222222',
        paper: '#2A2A2A',
      },
      text: {
        primary: '#FAFAFA',
        secondary: '#A1A1AA',
      },
    } : {
      primary: {
        main: '#71717A',
        light: '#A1A1AA',
        dark: '#52525B',
      },
      background: {
        default: '#FAFAFA',
        paper: '#FFFFFF',
      },
      text: {
        primary: '#18181B',
        secondary: '#52525B',
      },
    }),
    success: {
      main: '#22c55e',
      light: '#4ade80',
      dark: '#15803d',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    warning: {
      main: '#eab308',
      light: '#facc15',
      dark: '#ca8a04',
    },
    stroke: {
      main: mode === 'dark' ? 'rgba(161, 161, 170, 0.6)' : 'rgba(82, 82, 91, 0.6)',
      grid: mode === 'dark' ? 'rgba(161, 161, 170, 0.08)' : 'rgba(82, 82, 91, 0.08)',
      border: mode === 'dark' ? 'rgba(24, 24, 27, 0.6)' : 'rgba(244, 244, 245, 0.6)',
    },
  },
  typography: {
    fontFamily: "'Inter', -apple-system, sans-serif",
    h4: {
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 500,
      letterSpacing: '-0.01em',
    },
    stats: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '1.125rem',
      fontWeight: 500,
      letterSpacing: '-0.02em',
    },
    chartLabel: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '0.875rem',
      fontWeight: 400,
    },
    signal: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '3rem',
      fontWeight: 600,
      letterSpacing: '0.1em',
    }
  },
  opacity: {
    primary: 0.95, 
    secondary: 0.7, 
    highlight: 0.85,
    tertiary: 0.8, 
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 16,
          border: `1px solid ${mode === 'dark' ? 'rgba(24, 24, 27, 0.6)' : 'rgba(244, 244, 245, 0.6)'}`,
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          letterSpacing: '-0.01em',
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-input': {
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 500,
          }
        }
      }
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundImage: 'none'
        }
      }
    }
  }
});


export const theme = createTheme(getDesignTokens(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
