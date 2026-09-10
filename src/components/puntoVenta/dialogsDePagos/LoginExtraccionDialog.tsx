// src/components/LoginExtraccionDialog.tsx
import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    CircularProgress,
    Alert,
    Snackbar,
    Typography,
    Box,
    IconButton,
    InputAdornment,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

// ─── Tipos ─────────────────────────────────────────────

export interface LoginExtraccionDialogProps {
    open: boolean;
    onClose: () => void;
    onLoginSuccess: () => void;
}

interface LoginErrors {
    usuario?: string;
    password?: string;
}

// ─── Componente ──────────────────────────────────────

export default function LoginExtraccionDialog({
    open,
    onClose,
    onLoginSuccess,
}: LoginExtraccionDialogProps): React.JSX.Element {
    const [usuario, setUsuario] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);

    const [errors, setErrors] = useState<LoginErrors>({});
    const [loading, setLoading] = useState<boolean>(false);

    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'warning';
    }>({
        open: false,
        message: '',
        severity: 'success'
    });

    const handleChange = (
        field: 'usuario' | 'password',
        value: string
    ): void => {
        if (field === 'usuario') setUsuario(value);
        if (field === 'password') setPassword(value);

        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validate = (): boolean => {
        const newErrors: LoginErrors = {};

        if (!usuario.trim()) {
            newErrors.usuario = 'El usuario es requerido';
        }
        if (!password.trim()) {
            newErrors.password = 'La contraseña es requerida';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ═══════════════════════════════════════════════════════════════
    // HANDLE LOGIN
    // ═══════════════════════════════════════════════════════════════
    const handleLogin = async (): Promise<void> => {
        if (!validate()) return;

        setLoading(true);

        try {
            // ─── Simulación de autenticación ───────────────────────
            // Aquí puedes reemplazar por tu endpoint real de login
            // Ejemplo: const response = await fetch(`${API_URL}/auth/login`, ...)
            await new Promise(resolve => setTimeout(resolve, 800));

            // Validación simple de demo (reemplazar por lógica real)
            const usuarioValido = usuario.trim().length >= 3;
            const passwordValida = password.trim().length >= 4;

            if (!usuarioValido || !passwordValida) {
                setSnackbar({
                    open: true,
                    message: 'Usuario o contraseña incorrectos',
                    severity: 'error'
                });
                setLoading(false);
                return;
            }

            // ─── ÉXITO ────────────────────────────────────────────
            setSnackbar({
                open: true,
                message: 'Inicio de sesión exitoso',
                severity: 'success'
            });

            setTimeout(() => {
                handleClose();
                onLoginSuccess();
            }, 600);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al iniciar sesión';
            setSnackbar({
                open: true,
                message: errorMessage,
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = (): void => {
        setUsuario('');
        setPassword('');
        setShowPassword(false);
        setErrors({});
        onClose();
    };

    const handleCloseSnackbar = (): void => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const handleKeyDown = (e: React.KeyboardEvent): void => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    return (
        <>
            <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
                <DialogTitle>
                    <Typography
                        variant="h6"
                        sx={{
                            borderRadius: 1,
                            boxShadow: 2,
                            p: 1,
                            textAlign: "center",
                            background: "linear-gradient(135deg, rgba(0, 89, 255, 0.84), rgba(230, 21, 118, 0.9))",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        <LockIcon
                            sx={{
                                fill: 'url(#iconGradientLogin)',
                                width: 24,
                                height: 24,
                                mr: 1,
                                verticalAlign: 'middle'
                            }}
                        />
                        <svg width="0" height="0">
                            <defs>
                                <linearGradient id="iconGradientLogin" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="rgba(0, 89, 255, 0.84)" />
                                    <stop offset="100%" stopColor="rgba(230, 21, 118, 0.9)" />
                                </linearGradient>
                            </defs>
                        </svg>
                        Autenticación Requerida
                    </Typography>
                </DialogTitle>

                <DialogContent>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ textAlign: 'center', mb: 2, mt: 1 }}
                    >
                        Inicie sesión para autorizar la extracción de caja
                    </Typography>

                    {/* Usuario */}
                    <TextField
                        fullWidth
                        label="Usuario"
                        margin="normal"
                        size="small"
                        placeholder="Nombre de usuario"
                        value={usuario}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleChange("usuario", e.target.value)
                        }
                        onKeyDown={handleKeyDown}
                        error={!!errors.usuario}
                        helperText={errors.usuario}
                        disabled={loading}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>👤</Typography>
                                    </InputAdornment>
                                ),
                            }
                        }}
                    />

                    {/* Contraseña */}
                    <TextField
                        fullWidth
                        label="Contraseña"
                        margin="normal"
                        size="small"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleChange("password", e.target.value)
                        }
                        onKeyDown={handleKeyDown}
                        error={!!errors.password}
                        helperText={errors.password}
                        disabled={loading}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            size="small"
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                            sx={{ color: '#999' }}
                                        >
                                            {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }
                        }}
                    />
                </DialogContent>

                <DialogActions sx={{ display: "flex", p: 2, ml: 0, gap: 2, width: "100%" }}>
                    <Button
                        onClick={handleClose}
                        disabled={loading}
                        fullWidth
                        startIcon={<CancelIcon />}
                        sx={{
                            flex: 1,
                            background: "linear-gradient(135deg, rgba(255,0,0,0.9), rgba(196, 45, 226, 0.9))",
                            boxShadow: "0 4px 19px rgba(0,0,0,0.2)",
                            color: "white",
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                            "&:hover": {
                                background: "linear-gradient(135deg, rgba(255,0,0,0.9), rgba(226, 45, 187, 0.9))",
                                boxShadow: "0 4px 12px rgb(158, 6, 6)"
                            }
                        }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleLogin}
                        disabled={loading || !usuario.trim() || !password.trim()}
                        fullWidth
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                        sx={{
                            flex: 1,
                            background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                            boxShadow: "0 4px 19px rgba(0,0,0,0.2)",
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                            "&:hover": {
                                background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                                boxShadow: "0 4px 12px rgba(13, 248, 5, 0.93)"
                            }
                        }}
                    >
                        {loading ? 'Verificando...' : 'Iniciar Sesión'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}