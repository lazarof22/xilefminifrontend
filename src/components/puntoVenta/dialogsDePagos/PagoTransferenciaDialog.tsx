// src/components/PagoTransferenciaDialog.tsx
import React, { useState, useEffect } from 'react';
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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'; // fallback
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import type { ProductoCarrito } from '../../../types/venta.types';
import { IMaskInput } from 'react-imask';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Tipos ─────────────────────────────────────────────

export interface PagoTransferenciaData {
    referencia: string;
    banco: string;
    notas: string;
    monto_pagar: number;
}

interface PagoTransferenciaErrors {
    referencia?: string;
    banco?: string;
    monto_pagar?: string;
}

export interface PagoTransferenciaDialogProps {
    open: boolean;
    onClose: () => void;
    montoTotal: number;
    productosCarrito: ProductoCarrito[];
    subtotal: number;
    descuentoTotal: number;
    impuesto: number;
    onPagoCompletado?: (data: PagoTransferenciaData) => void;
    onVentaExitosa?: (ventaId: string) => void;
}

const MaskedInput = React.forwardRef<HTMLInputElement, any>(function MaskedInput(props, ref) {
    const { onChange, ...other } = props;
    return (
        <IMaskInput
            {...other}
            mask="0000 0000 0000 0000"
            definitions={{ '0': /[0-9]/ }}
            inputRef={ref as any}
            onAccept={(value: string) => onChange({ target: { name: props.name, value } })}
            overwrite
            placeholder="XXXX XXXX XXXX XXXX"
        />
    );
});

// ─── Componente ──────────────────────────────────────

export default function PagoTransferenciaDialog({
    open,
    onClose,
    montoTotal,
    productosCarrito,
    subtotal,
    descuentoTotal,
    impuesto,
    onPagoCompletado,
    onVentaExitosa,
}: PagoTransferenciaDialogProps): React.JSX.Element {
    const [referencia, setReferencia] = useState<string>('');
    const [banco, setBanco] = useState<string>('');
    const [notas, setNotas] = useState<string>('');
    const [montoPagar, setMontoPagar] = useState<string>(montoTotal.toFixed(2));

    const [errors, setErrors] = useState<PagoTransferenciaErrors>({});
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

    useEffect(() => {
        if (open) {
            setMontoPagar(montoTotal.toFixed(2));
            setReferencia('');
            setBanco('');
            setNotas('');
            setImagenBanco('');
            setErrors({});
        }
    }, [open, montoTotal]);

    // ═══════════════════════════════════════════════════════════════
    // MAPA DE BANCOS A IMÁGENES (sustituir rutas ficticias por reales)
    // ═══════════════════════════════════════════════════════════════
    const bancoImagenes: Record<string, string> = {
        BPA: '/images/banco/BPA.png',          // ← Sustituir por ruta real
        BANDEC: '/images/banco/BANDEC.png',    // ← Sustituir por ruta real
        BM: '/images/banco/BM.png',            // ← Sustituir por ruta real
    };

    const [imagenBanco, setImagenBanco] = useState<string>('');

    const handleChange = (
        field: 'referencia' | 'banco' | 'notas' | 'monto_pagar',
        value: string
    ): void => {
        if (field === 'referencia') setReferencia(value);
        if (field === 'banco') {
            setBanco(value);
            setImagenBanco(bancoImagenes[value] || '');
        }
        if (field === 'notas') setNotas(value);
        if (field === 'monto_pagar') setMontoPagar(value);

        if (errors[field as keyof PagoTransferenciaErrors]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field as keyof PagoTransferenciaErrors];
                return newErrors;
            });
        }
    };

    const validate = (): boolean => {
        const newErrors: PagoTransferenciaErrors = {};

        if (!referencia.trim()) {
            newErrors.referencia = 'El número de referencia es requerido';
        }
        if (!banco.trim()) {
            newErrors.banco = 'Seleccione un banco';
        }
        if (!montoPagar.trim() || isNaN(Number(montoPagar)) || Number(montoPagar) <= 0) {
            newErrors.monto_pagar = 'El monto debe ser mayor a 0';
            setSnackbar({
                open: true,
                message: 'El monto a pagar no es válido',
                severity: 'warning'
            });
        }

        if (productosCarrito.length === 0) {
            setSnackbar({
                open: true,
                message: 'El carrito está vacío. Agregue productos para continuar.',
                severity: 'warning'
            });
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0 && productosCarrito.length > 0;
    };

    // ═══════════════════════════════════════════════════════════════
    // HANDLE FINALIZAR PAGO — TRANSFERENCIA
    // ═══════════════════════════════════════════════════════════════
    const handleFinalizarPago = async (): Promise<void> => {
        if (!validate()) return;

        const montoPagarNum = Number(montoPagar);
        setLoading(true);

        try {
            // ─── Construir payload de venta ─────────────────────────
            const ventaPayload = {
                productos: productosCarrito.map(p => ({
                    productoId: p.id,
                    cantidad: p.cantidad,
                    precioUnitario: p.precio,
                    descuento: p.descuento || 0,
                })),
                subtotal,
                descuentoTotal,
                impuesto,
                total: montoPagarNum,
                metodoPago: 'transferencia',
                detallePago: {
                    referencia: referencia.trim(),
                    banco: banco.trim(),
                    notas: notas.trim(),
                },
            };

            // ─── Llamada al backend ────────────────────────────────
            const response = await fetch(`${API_URL}/venta`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ventaPayload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Error ${response.status}: No se pudo procesar la venta`);
            }

            const resultado = await response.json();

            // ─── ÉXITO ────────────────────────────────────────────
            const pagoData: PagoTransferenciaData = {
                referencia: referencia.trim(),
                banco: banco.trim(),
                notas: notas.trim(),
                monto_pagar: montoPagarNum,
            };

            setSnackbar({
                open: true,
                message: `Venta por transferencia #${resultado._id?.slice(-6) || resultado.id?.slice(-6)} procesada exitosamente`,
                severity: 'success'
            });

            onPagoCompletado?.(pagoData);
            onVentaExitosa?.(resultado._id || resultado.id);

            setTimeout(() => {
                handleClose();
            }, 1500);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al procesar el pago';
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
        setReferencia('');
        setBanco('');
        setNotas('');
        setImagenBanco('');
        setMontoPagar(montoTotal.toFixed(2));
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
                    <Typography variant="h6" sx={{
                        borderRadius: 1,
                        boxShadow: 2,
                        p: 1,
                        textAlign: "center",
                        background: "linear-gradient(135deg, rgba(0, 89, 255, 0.84), rgba(230, 21, 118, 0.9))",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}>
                        <AccountBalanceOutlinedIcon sx={{ fill: 'url(#iconGradientTransf)', width: 24, height: 24, mr: 1, verticalAlign: 'middle' }} />
                        <svg width="0" height="0">
                            <defs>
                                <linearGradient id="iconGradientTransf" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="rgba(0, 89, 255, 0.84)" />
                                    <stop offset="100%" stopColor="rgba(230, 21, 118, 0.9)" />
                                </linearGradient>
                            </defs>
                        </svg>
                        Pago por Transferencia
                    </Typography>
                </DialogTitle>

                <DialogContent>
                    {/* Monto a pagar (solo lectura) */}
                    <TextField
                        fullWidth
                        label="Monto a Pagar"
                        margin="normal"
                        size="small"
                        type="number"
                        value={montoPagar}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleChange("monto_pagar", e.target.value)
                        }
                        error={!!errors.monto_pagar}
                        helperText={errors.monto_pagar}
                        disabled={loading}
                        slotProps={{
                            input: {
                                readOnly: true,
                                startAdornment: (
                                    <Typography sx={{ mr: 1, color: 'text.secondary' }}>$</Typography>
                                ),
                            }
                        }}
                    />

                    {/* Banco */}
                    <FormControl fullWidth margin="normal" size="small" error={!!errors.banco}>
                        <InputLabel>Banco</InputLabel>
                        <Select
                            value={banco}
                            label="Banco"
                            onChange={(e) => handleChange("banco", e.target.value)}
                            disabled={loading}
                        >
                            <MenuItem value="">
                                <em>-- Seleccionar banco --</em>
                            </MenuItem>
                            <MenuItem value="BPA">Banco Popular de Ahorro (BPA)</MenuItem>
                            <MenuItem value="BANDEC">Banco de Crédito y Comercio (BANDEC)</MenuItem>
                            <MenuItem value="BM">Banco Metropolitano (BM)</MenuItem>
                            <MenuItem value="BICSA">Banco Internacional de Comercio (BICSA)</MenuItem>
                            <MenuItem value="FR">Fincimex / Redsa</MenuItem>
                            <MenuItem value="Otro">Otro</MenuItem>
                        </Select>
                        {errors.banco && (
                            <Typography variant="caption" color="error" sx={{ ml: 1.5, mt: 0.5 }}>
                                {errors.banco}
                            </Typography>
                        )}
                    </FormControl>

                    {/* Número de referencia */}
                    <TextField
                        fullWidth
                        label="Número de Cuenta"
                        margin="normal"
                        size="small"
                        placeholder="XXXX XXXX XXXX XXXX"
                        value={referencia}
                        onChange={(e) => handleChange("referencia", e.target.value)}
                        error={!!errors.referencia}
                        helperText={errors.referencia || "16 dígitos de la cuenta bancaria"}
                        disabled={loading}
                        slotProps={{
                            input: {
                                inputComponent: MaskedInput as any,
                            }
                        }}
                    />

                    <Box
                        sx={{
                            mt: 2,
                            mb: 1,
                            width: '100%',
                            height: 180,
                            borderRadius: 2,
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: imagenBanco ? 'transparent' : 'rgba(0,0,0,0.03)',
                            border: '1px dashed rgba(0,0,0,0.15)',
                            transition: 'all 0.3s ease',
                        }}
                    >
                        {imagenBanco ? (
                            <Box
                                component="img"
                                src={imagenBanco}
                                alt={`Tarjeta ${banco}`}
                                sx={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'fill',
                                    borderRadius: 2,
                                }}
                                onError={(e: any) => {
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML = '<span style="color:#999;font-size:0.85rem">Imagen no disponible</span>';
                                }}
                            />
                        ) : (
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                Seleccione un banco para ver la referencia visual
                            </Typography>
                        )}
                    </Box>
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
                        onClick={handleFinalizarPago}
                        disabled={
                            loading ||
                            !referencia.trim() ||
                            !banco.trim() ||
                            !montoPagar || Number(montoPagar) <= 0 ||
                            productosCarrito.length === 0
                        }
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
                        {loading ? 'Procesando...' : 'Confirmar Pago'}
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