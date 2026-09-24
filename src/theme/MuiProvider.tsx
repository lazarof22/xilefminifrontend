import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#00e5a0',        // Verde menta brillante (acento principal de la imagen)
            light: '#5cffc8',       // Verde menta más claro
            dark: '#00b37d',        // Verde menta oscuro
            contrastText: '#0a0f0d',
        },
        secondary: {
            main: '#1f2937',        // Gris oscuro azulado para superficies secundarias
            light: '#374151',
            dark: '#111827',
            contrastText: '#f0f0f0',
        },
        success: {
            main: '#10b981',        // Verde éxito
            light: '#34d399',
            dark: '#059669',
            contrastText: '#0a0f0d',
        },
        warning: {
            main: '#f59e0b',        // Naranja ámbar
            light: '#fbbf24',
            dark: '#d97706',
            contrastText: '#0a0f0d',
        },
        error: {
            main: '#ef4444',        // Rojo coral
            light: '#f87171',
            dark: '#dc2626',
            contrastText: '#ffffff',
        },
        info: {
            main: '#06b6d4',        // Cyan turquesa
            light: '#22d3ee',
            dark: '#0891b2',
            contrastText: '#0a0f0d',
        },
        background: {
            default: '#0a0f0d',     // Fondo casi negro con tinte verde oscuro
            paper: '#151a19',       // Superficie de cards (gris oscuro verdoso)
        },
        text: {
            primary: '#f0f0f0',     // Blanco suave
            secondary: '#9ca3af',   // Gris medio
            disabled: '#4b5563',
        },
        divider: 'rgba(0, 229, 160, 0.08)',
    },

    shape: {
        borderRadius: 8,           // Bordes más redondeados, estilo moderno
    },

    typography: {
        fontFamily: `'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif`,
        h5: {
            fontWeight: 700,
            letterSpacing: '-0.02em',
        },
        h6: {
            fontWeight: 600,
            letterSpacing: '-0.01em',
        },
        button: {
            textTransform: 'none',
            fontWeight: 600,
            letterSpacing: '0.01em',
        },
        body1: {
            fontSize: '0.95rem',
            letterSpacing: '0.01em',
        },
        body2: {
            fontSize: '0.875rem',
            letterSpacing: '0.01em',
        },
    },

    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    padding: '10px 24px',
                    boxShadow: 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 20px rgba(0, 229, 160, 0.25)',
                    },
                },
                contained: {
                    background: 'linear-gradient(135deg, #00e5a0 0%, #00c896 100%)',
                    color: '#0a0f0d',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #5cffc8 0%, #00e5a0 100%)',
                        boxShadow: '0 4px 24px rgba(0, 229, 160, 0.35)',
                    },
                },
                outlined: {
                    borderColor: 'rgba(0, 229, 160, 0.4)',
                    color: '#00e5a0',
                    '&:hover': {
                        borderColor: '#00e5a0',
                        backgroundColor: 'rgba(0, 229, 160, 0.08)',
                    },
                },
            },
        },

        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    backgroundColor: '#151a19',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
                    backdropFilter: 'blur(12px)',
                },
            },
        },

        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    backgroundImage: 'none',
                },
                elevation1: {
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
                    backgroundColor: '#151a19',
                },
                elevation2: {
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    backgroundColor: '#1a201e',
                },
            },
        },

        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                    },
                    '&:hover fieldset': {
                        borderColor: 'rgba(0, 229, 160, 0.3)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#00e5a0',
                        borderWidth: 2,
                        boxShadow: '0 0 0 3px rgba(0, 229, 160, 0.1)',
                    },
                },
            },
        },

        MuiInputLabel: {
            styleOverrides: {
                root: {
                    color: '#9ca3af',
                    '&.Mui-focused': {
                        color: '#00e5a0',
                    },
                },
            },
        },

        MuiTableHead: {
            styleOverrides: {
                root: {
                    backgroundColor: '#1a201e',
                    '& .MuiTableCell-root': {
                        color: '#9ca3af',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    },
                },
            },
        },

        MuiTableBody: {
            styleOverrides: {
                root: {
                    '& .MuiTableCell-root': {
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        color: '#e5e7eb',
                    },
                    '& .MuiTableRow-root:hover': {
                        backgroundColor: 'rgba(0, 229, 160, 0.03)',
                    },
                },
            },
        },

        MuiAppBar: {
            styleOverrides: {
                root: {
                    borderRadius: 0,
                    background: 'linear-gradient(100deg, #0a0f0d 0%, #151a19 100%)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    boxShadow: 'none',
                },
            },
        },

        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#0d1210',
                    color: '#f0f0f0',
                    borderRadius: 0,
                    borderRight: '1px solid rgba(255, 255, 255, 0.04)',
                },
            },
        },

        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: '0.75rem',
                },
                colorPrimary: {
                    backgroundColor: 'rgba(0, 229, 160, 0.12)',
                    color: '#00e5a0',
                    border: '1px solid rgba(0, 229, 160, 0.2)',
                },
                colorSuccess: {
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                },
                colorError: {
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                },
            },
        },

        MuiDialog: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#151a19',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
                },
            },
        },

        MuiDialogTitle: {
            styleOverrides: {
                root: {
                    background: 'linear-gradient(135deg, #0a0f0d 0%, #151a19 100%)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                },
            },
        },

        MuiIconButton: {
            styleOverrides: {
                root: {
                    color: '#9ca3af',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        color: '#00e5a0',
                        backgroundColor: 'rgba(0, 229, 160, 0.08)',
                    },
                },
            },
        },

        MuiDivider: {
            styleOverrides: {
                root: {
                    borderColor: 'rgba(255, 255, 255, 0.06)',
                },
            },
        },

        MuiSelect: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                },
            },
        },

        MuiMenu: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#1a201e',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                },
            },
        },

        MuiLinearProgress: {
            styleOverrides: {
                root: {
                    borderRadius: 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                },
                bar: {
                    borderRadius: 4,
                    backgroundColor: '#00e5a0',
                },
            },
        },

        MuiSwitch: {
            styleOverrides: {
                root: {
                    '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#00e5a0',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: 'rgba(0, 229, 160, 0.3)',
                    },
                },
            },
        },
    },
});

export default function MuiProvider({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box
                sx={{
                    minHeight: '100vh',
                    background: 'linear-gradient(135deg, rgba(16, 20, 20, 0.84), rgba(13, 138, 107, 0.85)), url(\'/images/login/imagenLogin.jpg\')',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                {children}
            </Box>
        </ThemeProvider>
    );
}