// src/components/ExtraccionDialog.tsx
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
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
    import CheckCircleIcon from '@mui/icons-material/CheckCircle';
    import CancelIcon from '@mui/icons-material/Cancel';

// ─── Tipos ─────────────────────────────────────────────

export interface ExtraccionData {
    monto: number;
    causa: string;
    fecha: string;
}

interface ExtraccionErrors {
    monto?: string;
    causa?: string;
}

export interface ExtraccionDialogProps {
    open: boolean;
    onClose: () => void;
    saldoDisponible?: number; // Saldo actual de caja (opcional)
    onExtraccionCompletada?: (data: ExtraccionData) => void;
}

// ─── Componente ──────────────────────────────────────

export default function ExtraccionDialog({
    open,
    onClose,
    saldoDisponible,
    onExtraccionCompletada,
}: ExtraccionDialogProps): React.JSX.Element {
    const [monto, setMonto] = useState<string>('');
    const [causa, setCausa] = useState<string>('');

    const [errors, setErrors] = useState<ExtraccionErrors>({});
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

    const handleChangeMonto = (value: string): void => {
        setMonto(value);
        if (errors.monto) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.monto;
                return newErrors;
            });
        }
    };

    const handleChangeCausa = (value: string): void => {
        setCausa(value);
        if (errors.causa) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.causa;
                return newErrors;
            });
        }
    };

    const validate = (): boolean => {
        const newErrors: ExtraccionErrors = {};
        const montoNum = Number(monto);

        if (!monto.trim() || isNaN(montoNum) || montoNum <= 0) {
            newErrors.monto = 'El monto debe ser mayor a 0';
        }
        if (saldoDisponible !== undefined && montoNum > saldoDisponible) {
            newErrors.monto = `El monto excede el saldo disponible (${saldoDisponible.toFixed(2)} CUP)`;
        }
        if (!causa.trim()) {
            newErrors.causa = 'La causa de la extracción es requerida';
        }
        if (causa.trim().length < 5) {
            newErrors.causa = 'La causa debe tener al menos 5 caracteres';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ═══════════════════════════════════════════════════════════════
    // HANDLE EXTRAER
    // ═══════════════════════════════════════════════════════════════
    const handleExtraer = async (): Promise<void> => {
        if (!validate()) return;

        const montoNum = Number(monto);
        setLoading(true);

        try {
            // ─── Simulación / Procesamiento ────────────────────────
            // Aquí puedes reemplazar por tu endpoint real
            // Ejemplo: await fetch(`${API_URL}/caja/extraccion`, { method: 'POST', ... })
            await new Promise(resolve => setTimeout(resolve, 600));

            // Guardar en localStorage como historial de extracciones
            const extraccionesGuardadas = localStorage.getItem('caja_extracciones');
            const extracciones = extraccionesGuardadas ? JSON.parse(extraccionesGuardadas) : [];

            const nuevaExtraccion: ExtraccionData = {
                monto: montoNum,
                causa: causa.trim(),
                fecha: new Date().toISOString(),
            };

            extracciones.push(nuevaExtraccion);
            localStorage.setItem('caja_extracciones', JSON.stringify(extracciones));

            // ─── ÉXITO ────────────────────────────────────────────
            setSnackbar({
                open: true,
                message: `Extracción de ${montoNum.toFixed(2)} CUP registrada correctamente`,
                severity: 'success'
            });

            onExtraccionCompletada?.(nuevaExtraccion);

            setTimeout(() => {
                handleClose();
            }, 1200);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al procesar la extracción';
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
        setMonto('');
        setCausa('');
        setErrors({});
        onClose();
    };

    const handleCloseSnackbar = (): void => {
        setSnackbar(prev => ({ ...prev, open: false }));
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
                        <AccountBalanceWalletIcon
                            sx={{
                                fill: 'url(#iconGradientExt)',
                                width: 24,
                                height: 24,
                                mr: 1,
                                verticalAlign: 'middle'
                            }}
                        />
                        <svg width="0" height="0">
                            <defs>
                                <linearGradient id="iconGradientExt" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="rgba(0, 89, 255, 0.84)" />
                                    <stop offset="100%" stopColor="rgba(230, 21, 118, 0.9)" />
                                </linearGradient>
                            </defs>
                        </svg>
                        Extracción de Caja
                    </Typography>
                </DialogTitle>

                <DialogContent>
                    {saldoDisponible !== undefined && (
                        <Box
                            sx={{
                                textAlign: 'center',
                                mb: 2,
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: 'rgba(10, 83, 218, 0.04)',
                                border: '1px solid rgba(10, 83, 218, 0.1)',
                            }}
                        >
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                Saldo Disponible en Caja
                            </Typography>
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 700,
                                    color: 'rgb(10, 83, 218)',
                                }}
                            >
                                {saldoDisponible.toFixed(2)} CUP
                            </Typography>
                        </Box>
                    )}

                    {/* Monto a extraer */}
                    <TextField
                        fullWidth
                        label="Monto a Extraer"
                        margin="normal"
                        size="small"
                        type="number"
                        placeholder="0.00"
                        value={monto}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleChangeMonto(e.target.value)
                        }
                        error={!!errors.monto}
                        helperText={errors.monto}
                        disabled={loading}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <Typography sx={{ mr: 1, color: 'text.secondary' }}>$</Typography>
                                ),
                            }
                        }}
                    />

                    {/* Causa de la extracción */}
                    <TextField
                        fullWidth
                        label="Causa de la Extracción"
                        margin="normal"
                        size="small"
                        placeholder="Describa el motivo de la extracción..."
                        multiline
                        rows={4}
                        value={causa}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleChangeCausa(e.target.value)
                        }
                        error={!!errors.causa}
                        helperText={errors.causa || "Mínimo 5 caracteres"}
                        disabled={loading}
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
                        onClick={handleExtraer}
                        disabled={loading || !monto.trim() || !causa.trim()}
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
                        {loading ? 'Procesando...' : 'Extraer'}
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