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
    Card,
    InputAdornment,
    MenuItem,
    Autocomplete,
    Stack,
    Divider,
} from '@mui/material';
import MoneyIcon from '@mui/icons-material/Money';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import {
    procesarVentaEfectivo,
    convertirDesgloseBilletes,
    calcularTotalDesglose,
} from '../../../service/ventaService';
import type { ProductoCarrito } from '../../../types/venta.types';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EuroIcon from '@mui/icons-material/Euro';
import DesgloseEfectivoDialog, { type DesgloseData } from '../../DesgloseEfectivoDialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Tipos ─────────────────────────────────────────────

export interface PagoEfectivoData {
    monto_a_pagar: string;
    monto_pagado: string;
    cambio: string;
    billestes_5000: string;
    billetes_2000: string;
    billetes_1000: string;
    billetes_500: string;
    billetes_200: string;
    billetes_100: string;
    billetes_50: string;
    billetes_20: string;
    billetes_10: string;
    billetes_5: string;
    billetes_3: string;
    billetes_1: string;
    [key: string]: string;
}

interface PagoErrors {
    cliente?: string;
    id_cliente?: string;
    telefono_cliente?: string;
    monto_pagado?: string;
}

export interface DialogPagoEfectivoProps {
    open: boolean;
    onClose: () => void;
    montoTotal: number;
    clienteId: string;
    productosCarrito: ProductoCarrito[];
    subtotal: number;
    descuentoTotal: number;
    impuesto: number;
    onPagoCompletado?: (data: PagoEfectivoData) => void;
    onVentaExitosa?: (ventaId: string) => void;
}

// ─── Constantes ──────────────────────────────────────

const initialPago: PagoEfectivoData = {
    monto_a_pagar: '',
    monto_pagado: '',
    cambio: '0.00',
    billestes_5000: '',
    billetes_2000: '',
    billetes_1000: '',
    billetes_500: '',
    billetes_200: '',
    billetes_100: '',
    billetes_50: '',
    billetes_20: '',
    billetes_10: '',
    billetes_5: '',
    billetes_3: '',
    billetes_1: '',
};

interface ClienteOption {
    id_cliente: string;
    nombre_cliente: string;
    telefono_cliente: string;
    email_cliente: string;
    direccion_cliente: string;
    tipo_cliente: string;
    _id?: string;
}

// ─── Componente ──────────────────────────────────────

export default function DialogPagoEfectivo({
    open,
    onClose,
    montoTotal,
    clienteId,
    productosCarrito,
    subtotal,
    descuentoTotal,
    impuesto,
    onPagoCompletado,
    onVentaExitosa,
}: DialogPagoEfectivoProps): React.JSX.Element {
    const [pagoData, setPagoData] = useState<PagoEfectivoData>(initialPago);
    const [errors, setErrors] = useState<PagoErrors>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [moneda, setMoneda] = useState("");
    const [clientes, setClientes] = useState<ClienteOption[]>([]);
    const [loadingClientes, setLoadingClientes] = useState<boolean>(false);
    const [cliente, setCliente] = useState<string>('');
    const [idCliente, setIdCliente] = useState<string>('');
    const [telefono, setTelefono] = useState<string>('');
    const [clienteMongoId, setClienteMongoId] = useState<string>('');

    // ═══ Estados para el Desglose Reutilizable ═══
    const [openDesglose, setOpenDesglose] = useState(false);
    const [desgloseGuardado, setDesgloseGuardado] = useState<DesgloseData | null>(null);
    const [totalDesglose, setTotalDesglose] = useState(0);

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
            setPagoData({
                ...initialPago,
                monto_a_pagar: montoTotal.toFixed(2)
            });
            setErrors({});
            setDesgloseGuardado(null);
            setTotalDesglose(0);
        }
    }, [open, montoTotal]);

    const handleChange = (field: keyof PagoEfectivoData, value: string): void => {
        const cleanValue = value.replace(/[^0-9.]/g, '');

        setPagoData(prev => {
            const newData = { ...prev, [field]: cleanValue };

            if (field === 'monto_pagado') {
                const pagado = parseFloat(cleanValue) || 0;
                const aPagar = parseFloat(prev.monto_a_pagar) || 0;
                const cambio = pagado - aPagar;
                newData.cambio = cambio >= 0 ? cambio.toFixed(2) : '0.00';
            }

            return newData;
        });

        if (errors.monto_pagado && field === 'monto_pagado') {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.monto_pagado;
                return newErrors;
            });
        }
    };

    // ═══ Handler del Desglose Reutilizable ═══
    const handleDesgloseAceptar = (desglose: DesgloseData, total: number): void => {
        setDesgloseGuardado(desglose);
        setTotalDesglose(total);

        // Actualizar pagoData con los valores del desglose
        const desgloseStrings: Record<string, string> = {};
        Object.entries(desglose).forEach(([key, val]) => {
            desgloseStrings[key] = String(val);
        });

        const aPagar = parseFloat(pagoData.monto_a_pagar) || 0;
        const cambio = total - aPagar;

        setPagoData(prev => ({
            ...prev,
            ...desgloseStrings,
            monto_pagado: total.toFixed(2),
            cambio: cambio >= 0 ? cambio.toFixed(2) : '0.00',
        }));

        if (errors.monto_pagado) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.monto_pagado;
                return newErrors;
            });
        }
    };

    const calcularTotalBilletes = (): number => {
        return totalDesglose;
    };

    const validate = (): boolean => {
        const newErrors: PagoErrors = {};

        const montoPagado = parseFloat(pagoData.monto_pagado);
        const montoAPagar = parseFloat(pagoData.monto_a_pagar);

        if (!pagoData.monto_pagado || montoPagado <= 0) {
            newErrors.monto_pagado = 'Ingrese el monto pagado';
        } else if (montoPagado < montoAPagar) {
            newErrors.monto_pagado = 'El monto pagado debe ser mayor o igual al monto a pagar';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ═══════════════════════════════════════════════════════════════
    // HANDLE FINALIZAR PAGO — EFECTIVO
    // ═══════════════════════════════════════════════════════════════
    const handleFinalizarPago = async (): Promise<void> => {
        const totalBilletes = calcularTotalBilletes();
        const montoPagado = parseFloat(pagoData.monto_pagado);
        const montoAPagar = parseFloat(pagoData.monto_a_pagar);
        const cambio = parseFloat(pagoData.cambio);

        // ─── Validaciones previas ─────────────────────────────
        if (totalBilletes > montoPagado) {
            setSnackbar({
                open: true,
                message: 'El Total en Billetes no coincide con el Monto Pagado, inserte un monto mayor',
                severity: 'error'
            });
            return;
        }

        if (montoAPagar === 0) {
            setSnackbar({
                open: true,
                message: 'Seleccione un producto del Stock',
                severity: 'warning'
            });
            return;
        }

        if (productosCarrito.length === 0) {
            setSnackbar({
                open: true,
                message: 'El carrito está vacío',
                severity: 'warning'
            });
            return;
        }

        if (!validate()) return;

        setLoading(true);

        try {
            // ─── PASO 1: Convertir desglose ──────────────────────
            const desglose = convertirDesgloseBilletes(pagoData);

            const totalDesgloseCalculado = calcularTotalDesglose(desglose);
            if (totalDesgloseCalculado !== montoPagado) {
                setSnackbar({
                    open: true,
                    message: `El desglose (${totalDesgloseCalculado.toFixed(2)}) no coincide con el monto pagado (${montoPagado.toFixed(2)})`,
                    severity: 'error'
                });
                setLoading(false);
                return;
            }

            // ─── PASO 2: Llamar a procesarVentaEfectivo ────────────
            const resultado = await procesarVentaEfectivo({
                desglose: desglose,
                montoPagado: totalDesgloseCalculado,
                montoPagar: montoAPagar,
                cambio: cambio,
                clienteIdVenta: clienteId,
                productosCarrito: productosCarrito,
                subtotal: subtotal,
                descuentoTotal: descuentoTotal,
                impuesto: impuesto,
            });

            if (!resultado.exito) {
                setSnackbar({
                    open: true,
                    message: resultado.mensaje,
                    severity: 'error'
                });
                setLoading(false);
                return;
            }

            // ─── ÉXITO ────────────────────────────────────────────
            setSnackbar({
                open: true,
                message: `Venta #${resultado.venta?._id.slice(-6)} procesada exitosamente. Cambio: ${cambio.toFixed(2)}`,
                severity: 'success'
            });

            onPagoCompletado?.(pagoData);
            onVentaExitosa?.(resultado.venta!._id);

            setPagoData(initialPago);
            setErrors({});
            setDesgloseGuardado(null);
            setTotalDesglose(0);

            setTimeout(() => {
                onClose();
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
        setPagoData(initialPago);
        setErrors({});
        setDesgloseGuardado(null);
        setTotalDesglose(0);
        onClose();
    };

    const handleCloseSnackbar = (): void => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const getFlag = (currency: string) => {
        switch (currency) {
            case "CUP": return "https://flagcdn.com/w40/cu.png";
            case "USD": return "https://flagcdn.com/w40/us.png";
            case "EUR": return "https://flagcdn.com/w40/eu.png";
            default: return "";
        }
    };

    const fetchClientes = async (): Promise<void> => {
        setLoadingClientes(true);
        try {
            const response = await fetch(`${API_URL}/cliente`);
            if (!response.ok) throw new Error('Error al cargar clientes');
            const data = await response.json();
            const mappedClientes = data.map((c: any) => ({
                ...c,
                id_cliente: c.id_cliente || c.carnet_identidad || c.ci || '',
                _id: c._id || c.id,
            }));
            setClientes(mappedClientes);
        } catch (error) {
            console.error('Error cargando clientes:', error);
            setSnackbar({
                open: true,
                message: 'Error al cargar clientes',
                severity: 'error'
            });
        } finally {
            setLoadingClientes(false);
        }
    };

    const handleClienteSeleccionado = (
        _event: React.SyntheticEvent,
        value: ClienteOption | null
    ): void => {
        if (value) {
            setCliente(value.nombre_cliente);
            setIdCliente(value.id_cliente);
            setTelefono(value.telefono_cliente || '');
            setClienteMongoId(value._id || '');
        } else {
            setCliente('');
            setIdCliente('');
            setTelefono('');
            setClienteMongoId('');
        }

        if (errors.cliente) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.cliente;
                return newErrors;
            });
        }
    };

    const simboloMoneda = moneda === 'EUR' ? '€' : '$';
    const puedeAbrirDesglose = moneda && parseFloat(pagoData.monto_a_pagar || '0') > 0;

    return (
        <>
            <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Typography variant="h6" sx={{
                        borderRadius: 1, boxShadow: 2, p: 1, textAlign: "center",
                        background: "linear-gradient(135deg, rgba(0, 89, 255, 0.84), rgba(230, 21, 118, 0.9))",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    }}>
                        <MoneyIcon sx={{ fill: 'url(#moneyIconGradient)', width: 24, height: 24, mr: 1 }} />
                        Pago en Efectivo
                    </Typography>
                </DialogTitle>

                <DialogContent>
                    <Box sx={{ display: "flex", gap: 3, flexDirection: { xs: "column", md: "row" } }}>
                        {/* ═══ COLUMNA IZQUIERDA ═══ */}
                        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
                            {/* Moneda */}
                            <TextField
                                select
                                fullWidth
                                label="Moneda"
                                value={moneda}
                                onChange={(e) => {
                                    setMoneda(e.target.value);
                                    setDesgloseGuardado(null);
                                    setTotalDesglose(0);
                                }}
                                slotProps={{
                                    input: {
                                        startAdornment: moneda && (
                                            <InputAdornment position="start">
                                                <img
                                                    src={getFlag(moneda)}
                                                    alt="flag"
                                                    width={24}
                                                    style={{ borderRadius: 3 }}
                                                />
                                            </InputAdornment>
                                        ),
                                    }
                                }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, bgcolor: '#f8f9fa', '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' } } }}
                            >
                                <MenuItem value="CUP">
                                    <CurrencyExchangeIcon sx={{ mr: 1 }} />
                                    CUP - Peso Cubano
                                </MenuItem>
                                <MenuItem value="USD">
                                    <AttachMoneyIcon sx={{ mr: 1 }} />
                                    USD - Dólar Americano
                                </MenuItem>
                                <MenuItem value="EUR">
                                    <EuroIcon sx={{ mr: 1 }} />
                                    EUR - Euro
                                </MenuItem>
                            </TextField>

                            {/* Cliente */}
                            <Autocomplete
                                options={clientes}
                                getOptionLabel={(option) => option.nombre_cliente}
                                loading={loadingClientes}
                                onChange={handleClienteSeleccionado}
                                onOpen={fetchClientes}
                                value={clientes.find(c => c.nombre_cliente === cliente) || null}
                                renderInput={(params) => (
                                    <TextField {...params} label="Cliente"
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, bgcolor: '#f8f9fa', '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' } } }}
                                        error={!!errors.cliente} helperText={errors.cliente}
                                    />
                                )}
                            />

                            {/* Monto a Pagar */}
                            <TextField fullWidth label="Monto a Pagar"
                                value={pagoData.monto_a_pagar} disabled
                                slotProps={{ input: { readOnly: true } }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, bgcolor: '#f8f9fa', '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' } } }}
                            />

                            {/* ─── Botón Desglose de Billetes ─── */}
                            <Button
                                variant="outlined"
                                fullWidth
                                startIcon={<ReceiptLongIcon />}
                                onClick={() => setOpenDesglose(true)}
                                disabled={!puedeAbrirDesglose}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    borderRadius: 2,
                                    py: 1.2,
                                    borderColor: 'rgba(0,89,255,0.3)',
                                    color: 'rgba(0,89,255,0.9)',
                                    '&:hover': {
                                        borderColor: 'rgba(0,89,255,0.6)',
                                        bgcolor: 'rgba(0,89,255,0.04)'
                                    },
                                    '&:disabled': {
                                        borderColor: 'rgba(0,0,0,0.12)',
                                        color: 'rgba(0,0,0,0.26)'
                                    }
                                }}
                            >
                                {desgloseGuardado
                                    ? '✓ Desglose Completado'
                                    : '💵 Desglose de Billetes'
                                }
                            </Button>

                            {/* ─── Resumen del desglose ─── */}
                            {desgloseGuardado && (
                                <Card sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: 'rgba(0,89,255,0.03)',
                                    border: '1px solid rgba(0,89,255,0.12)',
                                }}>
                                    <Stack spacing={1}>
                                        <Typography variant="body2" color="text.secondary">
                                            Total en billetes:{" "}
                                            <strong style={{ color: '#1a3c44' }}>
                                                {simboloMoneda}{totalDesglose.toFixed(2)}
                                            </strong>
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Monto pagado:{" "}
                                            <strong style={{ color: '#1a3c44' }}>
                                                {simboloMoneda}{parseFloat(pagoData.monto_pagado || '0').toFixed(2)}
                                            </strong>
                                        </Typography>
                                        {totalDesglose >= parseFloat(pagoData.monto_a_pagar || '0') && (
                                            <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 700 }}>
                                                ✓ Desglose cuadrado
                                            </Typography>
                                        )}
                                        {totalDesglose < parseFloat(pagoData.monto_a_pagar || '0') && (
                                            <Typography variant="caption" sx={{ color: '#d32f2f', fontWeight: 700 }}>
                                                ✗ Faltan: {simboloMoneda}{Math.abs(totalDesglose - parseFloat(pagoData.monto_a_pagar || '0')).toFixed(2)}
                                            </Typography>
                                        )}
                                    </Stack>
                                </Card>
                            )}

                            {/* Cambio */}
                            <TextField fullWidth label="Cambio"
                                value={pagoData.cambio} disabled
                                slotProps={{ input: { readOnly: true } }}
                                sx={{
                                    "& .MuiInputBase-input": {
                                        color: parseFloat(pagoData.cambio) > 0 ? "#2e7d32" : "inherit",
                                        fontWeight: 600,
                                    },
                                    '& .MuiOutlinedInput-root': { borderRadius: 1, bgcolor: '#f8f9fa', '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' } }
                                }}
                            />
                        </Box>

                        {/* ═══ COLUMNA DERECHA — Resumen de pago ═══ */}
                        <Box sx={{
                            flex: 1,
                            backgroundColor: "rgba(0, 0, 0, 0.04)",
                            borderRadius: 2,
                            p: 3,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            gap: 2,
                        }}>
                            <Typography variant="h6" sx={{
                                fontWeight: 700,
                                textAlign: 'center',
                                background: "linear-gradient(135deg, rgba(0, 89, 255, 0.84), rgba(230, 21, 118, 0.9))",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}>
                                Resumen de Pago
                            </Typography>

                            <Stack spacing={2}>
                                <Box sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    p: 1.5,
                                    borderRadius: 1,
                                    bgcolor: 'rgba(255,255,255,0.7)',
                                }}>
                                    <Typography color="text.secondary">Subtotal</Typography>
                                    <Typography sx={{ fontWeight: 600 }}>{simboloMoneda}{subtotal.toFixed(2)}</Typography>
                                </Box>
                                <Box sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    p: 1.5,
                                    borderRadius: 1,
                                    bgcolor: 'rgba(255,255,255,0.7)',
                                }}>
                                    <Typography color="text.secondary">Descuento</Typography>
                                    <Typography sx={{ fontWeight: 600 }} color="error">-{simboloMoneda}{descuentoTotal.toFixed(2)}</Typography>
                                </Box>
                                <Box sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    p: 1.5,
                                    borderRadius: 1,
                                    bgcolor: 'rgba(255,255,255,0.7)',
                                }}>
                                    <Typography color="text.secondary">Impuesto</Typography>
                                    <Typography sx={{ fontWeight: 600 }}>{simboloMoneda}{impuesto.toFixed(2)}</Typography>
                                </Box>
                                <Divider />
                                <Box sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    p: 1.5,
                                    borderRadius: 1,
                                    bgcolor: 'linear-gradient(135deg, rgba(0,114,255,0.08), rgba(142,45,226,0.08))',
                                    border: '1px solid rgba(0,114,255,0.15)',
                                }}>
                                    <Typography sx={{ fontWeight: 700 }}>Total a Pagar</Typography>
                                    <Typography sx={{ fontWeight: 800, fontSize: '1.2rem' }}>{simboloMoneda}{montoTotal.toFixed(2)}</Typography>
                                </Box>
                                {parseFloat(pagoData.cambio) > 0 && (
                                    <Box sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        p: 1.5,
                                        borderRadius: 1,
                                        bgcolor: 'rgba(46, 125, 50, 0.08)',
                                        border: '1px solid rgba(46, 125, 50, 0.2)',
                                    }}>
                                        <Typography sx={{ fontWeight: 700, color: 'success.main' }}>Cambio</Typography>
                                        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: 'success.main' }}>
                                            {simboloMoneda}{parseFloat(pagoData.cambio).toFixed(2)}
                                        </Typography>
                                    </Box>
                                )}
                            </Stack>
                        </Box>
                    </Box>
                </DialogContent>

                <DialogActions sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    p: 2,
                    gap: 2,
                    width: "100%",
                }}>
                    <Button
                        onClick={handleClose}
                        disabled={loading}
                        startIcon={<CancelIcon />}
                        sx={{
                            minWidth: 200,
                            background: "linear-gradient(135deg, rgba(255,0,0,0.9), rgba(196, 45, 226, 0.9))",
                            borderRadius: 2,
                            boxShadow: "0 4px 19px rgba(0,0,0,0.2)", color: "white",
                            "&:hover": { background: "linear-gradient(135deg, rgba(255,0,0,0.9), rgba(226, 45, 187, 0.9))" }
                        }}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleFinalizarPago}
                        disabled={
                            loading ||
                            !desgloseGuardado ||
                            totalDesglose < parseFloat(pagoData.monto_a_pagar || "0") ||
                            parseFloat(pagoData.monto_a_pagar || "0") === 0 ||
                            productosCarrito.length === 0
                        }
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                        sx={{
                            minWidth: 200,
                            background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                            borderRadius: 2,
                            boxShadow: "0 4px 19px rgba(0,0,0,0.2)",
                            "&:hover": { boxShadow: "0 4px 12px rgba(13, 248, 5, 0.93)" }
                        }}>
                        {loading ? 'Procesando...' : 'Finalizar Pago'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Dialog de Desglose Reutilizable ═══ */}
            <DesgloseEfectivoDialog
                open={openDesglose}
                onClose={() => setOpenDesglose(false)}
                moneda={moneda as 'CUP' | 'USD' | 'EUR'}
                montoAPagar={parseFloat(pagoData.monto_a_pagar) || 0}
                onAceptar={handleDesgloseAceptar}
            />

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}