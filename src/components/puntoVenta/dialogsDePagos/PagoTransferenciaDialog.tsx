// src/components/PagoTransferenciaDialog.tsx
import React, { useState, useEffect } from 'react';
import { useNotify } from '../../notificaciones/useNotify';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    CircularProgress,
    Typography,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { itemsDeCarrito } from '../../../service/ventaService';
import type { ProductoCarrito, RespuestaCheckout } from '../../../types/venta.types';
import { textoVentaRegistrada, useCobroVenta } from '../useCobroVenta';
import AvisoCobroAlert from '../AvisoCobroAlert';
import { IMaskInput } from 'react-imask';

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
    onVentaExitosa?: (ventaId: string, respuesta?: RespuestaCheckout) => void;
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
    const [imagenBanco, setImagenBanco] = useState<string>('');

    const [errors, setErrors] = useState<PagoTransferenciaErrors>({});
    const { cobrar, enviando: loading, aviso, descartar, hayPendiente } = useCobroVenta();

    const notify = useNotify();

    useEffect(() => {
        // Con un cobro sin confirmar se conservan los datos: otros datos serían otra venta (otra clave).
        if (open && !hayPendiente()) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- el formulario se reinicia al abrir el diálogo
            setMontoPagar(montoTotal.toFixed(2));
            setReferencia('');
            setBanco('');
            setNotas('');
            setImagenBanco('');
            setErrors({});
        }
    }, [open, montoTotal, hayPendiente]);

    // ═══════════════════════════════════════════════════════════════
    // MAPA DE BANCOS A IMÁGENES (sustituir rutas ficticias por reales)
    // ═══════════════════════════════════════════════════════════════
    const bancoImagenes: Record<string, string> = {
        BPA: '/images/banco/BPA.png',          // ← Sustituir por ruta real
        BANDEC: '/images/banco/BANDEC.png',    // ← Sustituir por ruta real
        BM: '/images/banco/BM.png',            // ← Sustituir por ruta real
    };

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
            notify.warning('El monto a pagar no es válido');
        }

        if (productosCarrito.length === 0) {
            notify.warning('El carrito está vacío. Agregue productos para continuar.');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0 && productosCarrito.length > 0;
    };

    // ═══════════════════════════════════════════════════════════════
    // HANDLE FINALIZAR PAGO — TRANSFERENCIA
    // Una sola petición (POST /venta/checkout): el servidor calcula el total, descuenta el stock y
    // registra la venta con el pago por transferencia. El monto no se envía: es el total de la venta.
    // ═══════════════════════════════════════════════════════════════
    const handleFinalizarPago = async (): Promise<void> => {
        if (!validate()) return;

        const resultado = await cobrar({
            items: itemsDeCarrito(productosCarrito),
            pago: {
                tipo: 'transferencia',
                numeroCuenta: referencia.trim(),
                banco: banco.trim(),
                ...(notas.trim() ? { notas: notas.trim() } : {}),
            },
            // Lo que vio el cajero: solo informativo, el servidor cobra con sus propios totales.
            estimado: { subtotal, descuento: descuentoTotal, impuesto, total: montoTotal },
        });

        if (!resultado) return; // doble clic: el primer cobro sigue su curso

        if (!resultado.ok) {
            // Si no se sabe si quedó registrada, el aviso fijo del diálogo ya lo explica.
            if (!resultado.error.incierto && !resultado.error.bloqueado) {
                notify.error(resultado.error.message);
            }
            return;
        }

        // ─── ÉXITO ────────────────────────────────────────────
        const { respuesta, repetida } = resultado;

        const pagoData: PagoTransferenciaData = {
            referencia: referencia.trim(),
            banco: banco.trim(),
            notas: notas.trim(),
            monto_pagar: respuesta.venta.total,
        };

        notify.success(`${textoVentaRegistrada(respuesta, repetida)} por transferencia`);
        respuesta.advertencias.forEach((advertencia) => notify.warning(advertencia));

        onPagoCompletado?.(pagoData);
        onVentaExitosa?.(respuesta.venta._id, respuesta);

        setTimeout(() => {
            handleClose();
        }, 1500);
    };

    const handleClose = (): void => {
        // Con un cobro sin confirmar los datos se conservan: otros datos serían otra venta (otra clave).
        if (!hayPendiente()) {
            setReferencia('');
            setBanco('');
            setNotas('');
            setImagenBanco('');
            setMontoPagar(montoTotal.toFixed(2));
            setErrors({});
        }
        onClose();
    };

    return (
        <>
            <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
                <DialogTitle
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        color: 'primary.main',
                    }}
                >
                    <AccountBalanceOutlinedIcon sx={{ width: 24, height: 24, color: 'primary.main' }} />
                    Pago por Transferencia
                </DialogTitle>

                <DialogContent>
                    {/* Cobro que no se pudo confirmar: se reintenta con los mismos datos (misma clave) */}
                    <AvisoCobroAlert aviso={aviso} onDescartar={descartar} ocupado={loading} />

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
                            disabled={loading || !!aviso}
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
                        disabled={loading || !!aviso}
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
                            bgcolor: imagenBanco ? 'transparent' : 'action.hover',
                            border: '1px dashed',
                            borderColor: 'text.disabled',
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
                                    e.target.parentElement.innerHTML = '<span style="color:#9ca3af;font-size:0.85rem">Imagen no disponible</span>';
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
                            aviso?.tipo === 'bloqueado' ||
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
                        {loading
                            ? 'Procesando...'
                            : aviso?.tipo === 'incierto'
                                ? 'Reintentar cobro'
                                : 'Confirmar Pago'}
                    </Button>
                </DialogActions>
            </Dialog>

        </>
    );
}