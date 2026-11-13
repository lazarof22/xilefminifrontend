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
    Card,
    InputAdornment,
    MenuItem,
    Autocomplete,
    Stack,
    Divider,
} from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import MoneyIcon from '@mui/icons-material/Money';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { clienteIdValido, itemsDeCarrito } from '../../../service/ventaService';
import type { ProductoCarrito, RespuestaCheckout, TipoTasa } from '../../../types/venta.types';
import {
    buscarMoneda,
    calcularCobroEfectivo,
    desgloseParaServidor,
    formatoImporte,
    MONEDA_BASE,
    simboloMoneda,
    totalDeDesglose,
    type DesgloseDenominaciones,
} from '../../../utils/divisasVenta';
import { textoVentaRegistrada, useCobroVenta } from '../useCobroVenta';
import { useMonedasCobro } from '../useMonedasCobro';
import AvisoCobroAlert from '../AvisoCobroAlert';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EuroIcon from '@mui/icons-material/Euro';
import DesgloseEfectivoDialog from '../../DesgloseEfectivoDialog';

// Estilos compartidos (colores tomados del tema, como en Carrito.tsx)
const filaResumenSx = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    p: 1.5,
    borderRadius: 1,
    bgcolor: 'background.paper',
    border: '1px solid',
    borderColor: 'divider',
} as const;

// Los campos de solo lectura usan `disabled`; en el tema oscuro su texto quedaría casi invisible.
const textoDeshabilitadoLegible = {
    '& .MuiInputBase-input.Mui-disabled': {
        WebkitTextFillColor: (theme: Theme) => theme.palette.text.primary,
    },
    '& .MuiInputLabel-root.Mui-disabled': {
        color: 'text.secondary',
    },
} as const;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/** Cómo se llama cada tasa en pantalla. */
const NOMBRE_TASA: Record<TipoTasa, string> = {
    tasaBancoCentral: 'Banco Central',
    tasaMercadoInformal: 'mercado informal',
};

// ─── Tipos ─────────────────────────────────────────────

/** Lo que quedó cobrado, para quien necesite el comprobante del pago (importes con 2 decimales). */
export interface PagoEfectivoData {
    /** Moneda en la que entregó el dinero el cliente. */
    moneda: string;
    /** Moneda en la que se devolvió el cambio. */
    monedaCambio: string;
    /** Lo que había que cobrar, en `moneda`. */
    monto_a_pagar: string;
    /** El efectivo recibido, en `moneda`. */
    monto_pagado: string;
    /** El cambio, en `moneda`. */
    cambio: string;
    /** El cambio en `monedaCambio` (solo si es otra moneda). */
    cambio_convertido?: string;
    /** Billetes y monedas recibidos: valor → cantidad. */
    desglose: DesgloseDenominaciones;
}

interface PagoErrors {
    cliente?: string;
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
    onVentaExitosa?: (ventaId: string, respuesta?: RespuestaCheckout) => void;
}

interface ClienteOption {
    id_cliente: string;
    nombre_cliente: string;
    telefono_cliente: string;
    email_cliente: string;
    direccion_cliente: string;
    tipo_cliente: string;
    _id?: string;
}

/** El desglose que se contó y la moneda en la que se contó (si cambia la moneda, deja de valer). */
interface DesgloseGuardado {
    moneda: string;
    desglose: DesgloseDenominaciones;
}

// ─── Monedas en pantalla ─────────────────────────────────

const getFlag = (currency: string): string => {
    switch (currency) {
        case "CUP": return "https://flagcdn.com/w40/cu.png";
        case "USD": return "https://flagcdn.com/w40/us.png";
        case "EUR": return "https://flagcdn.com/w40/eu.png";
        default: return "";
    }
};

const iconoMoneda = (codigo: string): React.JSX.Element => {
    switch (codigo) {
        case 'USD': return <AttachMoneyIcon sx={{ mr: 1 }} />;
        case 'EUR': return <EuroIcon sx={{ mr: 1 }} />;
        default: return <CurrencyExchangeIcon sx={{ mr: 1 }} />;
    }
};

const banderaMoneda = (codigo: string): React.JSX.Element | undefined => {
    const bandera = getFlag(codigo);
    if (!bandera) return undefined;
    return (
        <InputAdornment position="start">
            <img src={bandera} alt="flag" width={24} style={{ borderRadius: 3 }} />
        </InputAdornment>
    );
};

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
    const [errors, setErrors] = useState<PagoErrors>({});
    const { cobrar, enviando: loading, aviso, descartar, hayPendiente } = useCobroVenta();
    // Monedas con las que se puede cobrar y su tasa vigente (las informa el servidor al abrir el diálogo).
    const { monedas, tipoTasa, cargando: cargandoMonedas, error: errorMonedas } = useMonedasCobro(open);
    const [codigoMoneda, setCodigoMoneda] = useState<string>(MONEDA_BASE);
    // Moneda en la que se devuelve el cambio; null = la misma en la que paga el cliente.
    const [codigoCambio, setCodigoCambio] = useState<string | null>(null);
    const [clientes, setClientes] = useState<ClienteOption[]>([]);
    const [loadingClientes, setLoadingClientes] = useState<boolean>(false);
    const [cliente, setCliente] = useState<string>('');
    const [clienteMongoId, setClienteMongoId] = useState<string>('');

    // ═══ Estados para el Desglose Reutilizable ═══
    const [openDesglose, setOpenDesglose] = useState(false);
    const [desgloseGuardado, setDesgloseGuardado] = useState<DesgloseGuardado | null>(null);

    const notify = useNotify();

    // Si una moneda dejó de estar disponible (cambió la configuración) se cae al CUP, nunca a un valor inválido.
    const moneda = buscarMoneda(monedas, codigoMoneda);
    const monedaCambio = codigoCambio ? buscarMoneda(monedas, codigoCambio) : moneda;
    const esCUP = moneda.codigo === MONEDA_BASE;

    // El desglose solo vale para la moneda en la que se contó.
    const desgloseVigente = desgloseGuardado?.moneda === moneda.codigo ? desgloseGuardado.desglose : null;
    const totalDesglose = desgloseVigente ? totalDeDesglose(desgloseVigente) : 0;

    // Lo que hay que cobrar, lo recibido y el cambio, en las monedas elegidas. Es un estimado: al cobrar,
    // el servidor recalcula con la tasa vigente y sus importes son los que quedan registrados.
    const cobro = calcularCobroEfectivo(montoTotal, moneda, monedaCambio, totalDesglose);
    const simbolo = simboloMoneda(moneda.codigo);

    useEffect(() => {
        // Con un cobro sin confirmar se conservan los datos: otros datos serían otra venta (otra clave).
        if (open && !hayPendiente()) {
            /* eslint-disable react-hooks/set-state-in-effect -- el formulario se reinicia al abrir el diálogo */
            setCodigoMoneda(MONEDA_BASE);
            setCodigoCambio(null);
            setErrors({});
            setDesgloseGuardado(null);
            /* eslint-enable react-hooks/set-state-in-effect */
        }
    }, [open, hayPendiente]);

    // ═══ Handler del Desglose Reutilizable ═══
    const handleDesgloseAceptar = (desglose: DesgloseDenominaciones): void => {
        setDesgloseGuardado({ moneda: moneda.codigo, desglose });

        if (errors.monto_pagado) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.monto_pagado;
                return newErrors;
            });
        }
    };

    // Otra moneda de pago: el desglose contado en la anterior ya no sirve.
    const handleMonedaChange = (codigo: string): void => {
        setCodigoMoneda(codigo);
        setDesgloseGuardado(null);
        setErrors({});
    };

    // ═══════════════════════════════════════════════════════════════
    // HANDLE FINALIZAR PAGO — EFECTIVO
    // Una sola petición (POST /venta/checkout): el servidor calcula los totales, descuenta el stock,
    // registra pago, venta y Kardex, y devuelve el comprobante y el cambio. Si se paga en otra moneda
    // convierte con la tasa vigente y guarda la tasa usada.
    // ═══════════════════════════════════════════════════════════════
    const handleFinalizarPago = async (): Promise<void> => {
        // ─── Validaciones previas ─────────────────────────────
        if (productosCarrito.length === 0) {
            notify.warning('El carrito está vacío');
            return;
        }

        if (cobro.aPagar === 0) {
            notify.warning('Seleccione un producto del Stock');
            return;
        }

        if (!desgloseVigente || totalDesglose <= 0) {
            setErrors({ monto_pagado: 'Complete el desglose de billetes' });
            notify.warning('Complete el desglose de billetes');
            return;
        }

        if (cobro.falta > 0) {
            const mensaje = `El efectivo recibido es menor que el total: faltan ${formatoImporte(cobro.falta, moneda.codigo)}`;
            setErrors({ monto_pagado: mensaje });
            notify.error(mensaje);
            return;
        }

        // Al servidor solo van las cantidades de billetes y las monedas, nunca un importe.
        const resultado = await cobrar({
            clienteId: clienteIdValido(clienteMongoId) ?? clienteIdValido(clienteId),
            items: itemsDeCarrito(productosCarrito),
            pago: {
                tipo: 'efectivo',
                moneda: moneda.codigo,
                ...(monedaCambio.codigo !== moneda.codigo ? { monedaCambio: monedaCambio.codigo } : {}),
                ...desgloseParaServidor(moneda, desgloseVigente),
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
        notify.success(textoVentaRegistrada(respuesta, repetida));
        respuesta.advertencias.forEach((advertencia) => notify.warning(advertencia));

        // Los importes registrados son los del servidor.
        const monedaPago = respuesta.pago.moneda ?? MONEDA_BASE;
        onPagoCompletado?.({
            moneda: monedaPago,
            monedaCambio: respuesta.pago.monedaCambio ?? monedaPago,
            monto_a_pagar: (respuesta.pago.montoAPagarMoneda ?? respuesta.venta.total).toFixed(2),
            monto_pagado: respuesta.pago.montoRecibido.toFixed(2),
            cambio: respuesta.pago.cambio.toFixed(2),
            ...(respuesta.cambioConvertido !== undefined
                ? { cambio_convertido: respuesta.cambioConvertido.toFixed(2) }
                : {}),
            desglose: respuesta.pago.desgloseValidado ?? desgloseVigente,
        });
        onVentaExitosa?.(respuesta.venta._id, respuesta);

        setErrors({});
        setDesgloseGuardado(null);

        setTimeout(() => {
            onClose();
        }, 1500);
    };

    // Descartar el cobro sin confirmar: la próxima venta empieza limpia, con clave nueva.
    const handleDescartar = (): void => {
        descartar();
        setCodigoMoneda(MONEDA_BASE);
        setCodigoCambio(null);
        setErrors({});
        setDesgloseGuardado(null);
    };

    const handleClose = (): void => {
        // Con un cobro sin confirmar los datos se conservan: otros datos serían otra venta (otra clave).
        if (!hayPendiente()) {
            setCodigoMoneda(MONEDA_BASE);
            setCodigoCambio(null);
            setErrors({});
            setDesgloseGuardado(null);
        }
        onClose();
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
            notify.error('Error al cargar clientes');
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
            setClienteMongoId(value._id || '');
        } else {
            setCliente('');
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

    const puedeAbrirDesglose = cobro.aPagar > 0;
    // Con una sola moneda disponible no hay nada que elegir para el cambio.
    const puedeElegirMonedaCambio = monedas.length > 1;
    const hayCambio = cobro.cambio > 0;
    const { cambioConvertido } = cobro;
    const textoTasa = `Tasa${tipoTasa ? ` (${NOMBRE_TASA[tipoTasa]})` : ''}: 1 ${moneda.codigo} = ${moneda.cupPorUnidad.toFixed(2)} CUP`;

    return (
        <>
            <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
                <DialogTitle
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        color: 'primary.main',
                    }}
                >
                    <MoneyIcon sx={{ width: 24, height: 24, color: 'primary.main' }} />
                    Pago en Efectivo
                </DialogTitle>

                <DialogContent>
                    {/* Cobro que no se pudo confirmar: se reintenta con los mismos datos (misma clave) */}
                    <AvisoCobroAlert aviso={aviso} onDescartar={handleDescartar} ocupado={loading} />

                    <Box sx={{ display: "flex", gap: 3, flexDirection: { xs: "column", md: "row" } }}>
                        {/* ═══ COLUMNA IZQUIERDA ═══ */}
                        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
                            {/* Moneda: las que informa el servidor (CUP siempre; USD y EUR si tienen tasa y billetes) */}
                            <TextField
                                select
                                fullWidth
                                label="Moneda"
                                value={moneda.codigo}
                                disabled={!!aviso || loading}
                                onChange={(e) => handleMonedaChange(e.target.value)}
                                helperText={
                                    errorMonedas
                                        ? 'No se pudieron leer las monedas del servidor: por ahora solo se cobra en CUP.'
                                        : cargandoMonedas
                                            ? 'Leyendo monedas y tasas…'
                                            : undefined
                                }
                                slotProps={{
                                    input: {
                                        startAdornment: banderaMoneda(moneda.codigo),
                                        endAdornment: cargandoMonedas
                                            ? <CircularProgress size={16} sx={{ mr: 3 }} />
                                            : undefined,
                                    }
                                }}
                            >
                                {monedas.map((m) => (
                                    <MenuItem key={m.codigo} value={m.codigo}>
                                        {iconoMoneda(m.codigo)}
                                        {m.codigo} - {m.nombre}
                                    </MenuItem>
                                ))}
                            </TextField>

                            {/* Cliente */}
                            <Autocomplete
                                options={clientes}
                                getOptionLabel={(option) => option.nombre_cliente}
                                loading={loadingClientes}
                                disabled={!!aviso}
                                onChange={handleClienteSeleccionado}
                                onOpen={fetchClientes}
                                value={clientes.find(c => c.nombre_cliente === cliente) || null}
                                renderInput={(params) => (
                                    <TextField {...params} label="Cliente"
                                        error={!!errors.cliente} helperText={errors.cliente}
                                    />
                                )}
                            />

                            {/* Monto a Pagar: en la moneda elegida (el total de la venta está en CUP) */}
                            <TextField fullWidth label={esCUP ? 'Monto a Pagar' : `Monto a Pagar (${moneda.codigo})`}
                                value={cobro.aPagar.toFixed(2)} disabled
                                helperText={esCUP ? undefined : `Total de la venta: ${formatoImporte(montoTotal, MONEDA_BASE)}. ${textoTasa}`}
                                slotProps={{ input: { readOnly: true } }}
                                sx={textoDeshabilitadoLegible}
                            />

                            {/* ─── Botón Desglose de Billetes ─── */}
                            <Button
                                variant="outlined"
                                fullWidth
                                startIcon={<ReceiptLongIcon />}
                                onClick={() => setOpenDesglose(true)}
                                disabled={!puedeAbrirDesglose || !!aviso}
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
                                    '&.Mui-disabled': {
                                        borderColor: 'action.disabledBackground',
                                        color: 'action.disabled'
                                    }
                                }}
                            >
                                {desgloseVigente
                                    ? '✓ Desglose Completado'
                                    : '💵 Desglose de Billetes'
                                }
                            </Button>
                            {errors.monto_pagado && (
                                <Typography variant="caption" sx={{ color: 'error.main', mt: -1.5, ml: 1.5 }}>
                                    {errors.monto_pagado}
                                </Typography>
                            )}

                            {/* ─── Resumen del desglose ─── */}
                            {desgloseVigente && (
                                <Card sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                                    border: '1px solid',
                                    borderColor: (theme) => alpha(theme.palette.primary.main, 0.25),
                                }}>
                                    <Stack spacing={1}>
                                        <Typography variant="body2" color="text.secondary">
                                            Total en billetes:{" "}
                                            <Box component="strong" sx={{ color: 'text.primary' }}>
                                                {simbolo}{totalDesglose.toFixed(2)}
                                            </Box>
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Monto pagado:{" "}
                                            <Box component="strong" sx={{ color: 'text.primary' }}>
                                                {simbolo}{cobro.recibido.toFixed(2)}
                                            </Box>
                                        </Typography>
                                        {cobro.falta === 0 && (
                                            <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700 }}>
                                                ✓ Desglose cuadrado
                                            </Typography>
                                        )}
                                        {cobro.falta > 0 && (
                                            <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700 }}>
                                                ✗ Faltan: {simbolo}{cobro.falta.toFixed(2)}
                                            </Typography>
                                        )}
                                    </Stack>
                                </Card>
                            )}

                            {/* Cambio, en la moneda en la que pagó el cliente */}
                            <TextField fullWidth label={esCUP ? 'Cambio' : `Cambio (${moneda.codigo})`}
                                value={cobro.cambio.toFixed(2)} disabled
                                slotProps={{ input: { readOnly: true } }}
                                sx={{
                                    ...textoDeshabilitadoLegible,
                                    "& .MuiInputBase-input.Mui-disabled": {
                                        WebkitTextFillColor: (theme: Theme) =>
                                            hayCambio
                                                ? theme.palette.success.main
                                                : theme.palette.text.primary,
                                        fontWeight: 600,
                                    },
                                }}
                            />

                            {/* Moneda en la que se devuelve el cambio y el cambio ya convertido */}
                            {puedeElegirMonedaCambio && (
                                <TextField
                                    select
                                    fullWidth
                                    label="Moneda del cambio"
                                    value={monedaCambio.codigo}
                                    disabled={!!aviso || loading}
                                    onChange={(e) => setCodigoCambio(e.target.value === moneda.codigo ? null : e.target.value)}
                                    slotProps={{ input: { startAdornment: banderaMoneda(monedaCambio.codigo) } }}
                                >
                                    {monedas.map((m) => (
                                        <MenuItem key={m.codigo} value={m.codigo}>
                                            {iconoMoneda(m.codigo)}
                                            {m.codigo} - {m.nombre}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                            {cambioConvertido !== undefined && (
                                <TextField fullWidth label={`Cambio convertido (${monedaCambio.codigo})`}
                                    value={cambioConvertido.toFixed(2)} disabled
                                    helperText={`${cobro.cambio.toFixed(2)} ${moneda.codigo} × ${moneda.cupPorUnidad.toFixed(2)} ÷ ${monedaCambio.cupPorUnidad.toFixed(2)}`}
                                    slotProps={{ input: { readOnly: true } }}
                                    sx={{
                                        ...textoDeshabilitadoLegible,
                                        "& .MuiInputBase-input.Mui-disabled": {
                                            WebkitTextFillColor: (theme: Theme) =>
                                                cambioConvertido > 0
                                                    ? theme.palette.success.main
                                                    : theme.palette.text.primary,
                                            fontWeight: 600,
                                        },
                                    }}
                                />
                            )}
                        </Box>

                        {/* ═══ COLUMNA DERECHA — Resumen de pago ═══ */}
                        <Box sx={{
                            flex: 1,
                            bgcolor: 'background.default',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            p: 3,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            gap: 2,
                        }}>
                            <Typography variant="h6" sx={{
                                textAlign: 'center',
                                color: 'primary.main',
                            }}>
                                Resumen de Pago
                            </Typography>

                            <Stack spacing={2}>
                                {/* Subtotal, descuento, impuesto y total de la venta: siempre en CUP */}
                                <Box sx={filaResumenSx}>
                                    <Typography color="text.secondary">Subtotal</Typography>
                                    <Typography sx={{ fontWeight: 600 }}>${subtotal.toFixed(2)}</Typography>
                                </Box>
                                <Box sx={filaResumenSx}>
                                    <Typography color="text.secondary">Descuento</Typography>
                                    <Typography sx={{ fontWeight: 600 }} color="error.main">-${descuentoTotal.toFixed(2)}</Typography>
                                </Box>
                                <Box sx={filaResumenSx}>
                                    <Typography color="text.secondary">Impuesto</Typography>
                                    <Typography sx={{ fontWeight: 600 }}>${impuesto.toFixed(2)}</Typography>
                                </Box>
                                <Divider />
                                <Box sx={{
                                    ...filaResumenSx,
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                    borderColor: (theme) => alpha(theme.palette.primary.main, 0.25),
                                }}>
                                    <Typography sx={{ fontWeight: 700 }}>{esCUP ? 'Total a Pagar' : 'Total a Pagar (CUP)'}</Typography>
                                    <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: 'primary.main' }}>${montoTotal.toFixed(2)}</Typography>
                                </Box>

                                {/* En otra moneda: lo que hay que cobrar y con qué tasa */}
                                {!esCUP && (
                                    <>
                                        <Box sx={{
                                            ...filaResumenSx,
                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                            borderColor: (theme) => alpha(theme.palette.primary.main, 0.25),
                                        }}>
                                            <Typography sx={{ fontWeight: 700 }}>A cobrar en {moneda.codigo}</Typography>
                                            <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: 'primary.main' }}>
                                                {simbolo}{cobro.aPagar.toFixed(2)}
                                            </Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', mt: -1 }}>
                                            {textoTasa}
                                        </Typography>
                                    </>
                                )}

                                {hayCambio && (
                                    <Box sx={{
                                        ...filaResumenSx,
                                        bgcolor: (theme) => alpha(theme.palette.success.main, 0.08),
                                        borderColor: (theme) => alpha(theme.palette.success.main, 0.25),
                                    }}>
                                        <Typography sx={{ fontWeight: 700, color: 'success.main' }}>Cambio</Typography>
                                        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: 'success.main' }}>
                                            {simbolo}{cobro.cambio.toFixed(2)}
                                        </Typography>
                                    </Box>
                                )}
                                {hayCambio && cambioConvertido !== undefined && (
                                    <Box sx={{
                                        ...filaResumenSx,
                                        bgcolor: (theme) => alpha(theme.palette.success.main, 0.08),
                                        borderColor: (theme) => alpha(theme.palette.success.main, 0.25),
                                    }}>
                                        <Typography sx={{ fontWeight: 700, color: 'success.main' }}>Cambio en {monedaCambio.codigo}</Typography>
                                        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: 'success.main' }}>
                                            {simboloMoneda(monedaCambio.codigo)}{cambioConvertido.toFixed(2)}
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
                            // En pantallas angostas los dos botones se reparten el ancho (con 200 px fijos se cortaban)
                            minWidth: { xs: 0, sm: 200 },
                            flex: { xs: 1, sm: 'none' },
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
                            aviso?.tipo === 'bloqueado' ||
                            !desgloseVigente ||
                            cobro.falta > 0 ||
                            cobro.aPagar === 0 ||
                            productosCarrito.length === 0
                        }
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                        sx={{
                            minWidth: { xs: 0, sm: 200 },
                            flex: { xs: 1, sm: 'none' },
                            background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                            borderRadius: 2,
                            boxShadow: "0 4px 19px rgba(0,0,0,0.2)",
                            "&:hover": { boxShadow: "0 4px 12px rgba(13, 248, 5, 0.93)" }
                        }}>
                        {loading
                            ? 'Procesando...'
                            : aviso?.tipo === 'incierto'
                                ? 'Reintentar cobro'
                                : 'Finalizar Pago'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Dialog de Desglose Reutilizable ═══ */}
            <DesgloseEfectivoDialog
                open={openDesglose}
                onClose={() => setOpenDesglose(false)}
                moneda={moneda}
                montoAPagar={cobro.aPagar}
                onAceptar={handleDesgloseAceptar}
            />

        </>
    );
}
