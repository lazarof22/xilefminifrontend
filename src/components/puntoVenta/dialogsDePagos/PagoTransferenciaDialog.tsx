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
    MenuItem,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import {
    CANALES_PAGO_RESPALDO,
    itemsDeCarrito,
    listarBancosActivos,
    listarCanalesPago,
} from '../../../service/ventaService';
import type {
    BancoPago,
    CanalPagoInfo,
    CanalTransferencia,
    ProductoCarrito,
    RespuestaCheckout,
    TipoCuentaTransferencia,
} from '../../../types/venta.types';
import { buscarMoneda, formatoImporte, importeEnMoneda, MONEDA_BASE, simboloMoneda } from '../../../utils/divisasVenta';
import { getErrorMessage } from '../../../utils/errorMessage';
import { textoVentaRegistrada, useCobroVenta } from '../useCobroVenta';
import { useMonedasCobro } from '../useMonedasCobro';
import AvisoCobroAlert from '../AvisoCobroAlert';
import { IMaskInput } from 'react-imask';

// ─── Tipos ─────────────────────────────────────────────

/** Lo que quedó registrado por transferencia, para quien necesite el comprobante del pago. */
export interface PagoTransferenciaData {
    canal: CanalTransferencia;
    /** Código del banco (solo en el canal `banco`; vacío en los demás). */
    banco: string;
    referencia: string;
    notas: string;
    /** Moneda de la transferencia. */
    moneda: string;
    /** Total de la venta, siempre en CUP. */
    monto_pagar: number;
    /** Lo transferido, en `moneda`. */
    monto_moneda: number;
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

// ═══════════════════════════════════════════════════════════════
// MAPA DE BANCOS A IMÁGENES (sustituir rutas ficticias por reales)
// ═══════════════════════════════════════════════════════════════
const bancoImagenes: Record<string, string> = {
    BPA: '/images/banco/BPA.png',          // ← Sustituir por ruta real
    BANDEC: '/images/banco/BANDEC.png',    // ← Sustituir por ruta real
    BM: '/images/banco/BM.png',            // ← Sustituir por ruta real
};

/** Cómo se llama lo que se escribe como referencia en cada canal. */
const etiquetaReferencia = (canal: CanalTransferencia, tipoCuenta: TipoCuentaTransferencia): string => {
    if (canal === 'banco') return tipoCuenta === 'tarjeta' ? 'Número de Tarjeta' : 'Número de Cuenta';
    return 'Número de Referencia';
};

const ayudaReferencia = (canal: CanalTransferencia, tipoCuenta: TipoCuentaTransferencia): string => {
    if (canal === 'banco') {
        return tipoCuenta === 'tarjeta' ? '16 dígitos de la tarjeta' : '16 dígitos de la cuenta bancaria';
    }
    if (canal === 'zelle') return 'Código de confirmación de la transferencia de Zelle';
    return 'Número de la operación o confirmación';
};

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
    const [codigoCanal, setCodigoCanal] = useState<CanalTransferencia>('banco');
    // Moneda elegida a mano; null = la del canal (Zelle: USD, los demás: CUP).
    const [codigoMoneda, setCodigoMoneda] = useState<string | null>(null);
    const [bancoId, setBancoId] = useState<string>('');
    const [tipoCuenta, setTipoCuenta] = useState<TipoCuentaTransferencia>('tarjeta');
    const [referencia, setReferencia] = useState<string>('');
    const [notas, setNotas] = useState<string>('');
    const [montoPagar, setMontoPagar] = useState<string>(montoTotal.toFixed(2));

    // Nomencladores: canales, bancos (con el aviso si no se pudieron leer) y monedas con su tasa.
    const [canales, setCanales] = useState<CanalPagoInfo[]>(CANALES_PAGO_RESPALDO);
    const [bancos, setBancos] = useState<BancoPago[] | null>(null);
    const [errorBancos, setErrorBancos] = useState<string | null>(null);
    const [intentoBancos, setIntentoBancos] = useState<number>(0);
    const { monedas, tipoTasa, cargando: cargandoMonedas, error: errorMonedas } = useMonedasCobro(open);

    const [errors, setErrors] = useState<PagoTransferenciaErrors>({});
    const { cobrar, enviando: loading, aviso, descartar, hayPendiente } = useCobroVenta();

    const notify = useNotify();

    useEffect(() => {
        // Con un cobro sin confirmar se conservan los datos: otros datos serían otra venta (otra clave).
        if (open && !hayPendiente()) {
            /* eslint-disable react-hooks/set-state-in-effect -- el formulario se reinicia al abrir el diálogo */
            setMontoPagar(montoTotal.toFixed(2));
            setCodigoCanal('banco');
            setCodigoMoneda(null);
            setBancoId('');
            setTipoCuenta('tarjeta');
            setReferencia('');
            setNotas('');
            setErrors({});
            /* eslint-enable react-hooks/set-state-in-effect */
        }
    }, [open, montoTotal, hayPendiente]);

    // Canales y bancos: se leen del servidor cada vez que se abre el diálogo.
    useEffect(() => {
        if (!open) return;
        let vigente = true;

        listarCanalesPago()
            .then((lista) => {
                if (vigente) setCanales(lista);
            })
            .catch(() => {
                /* se usan los canales de siempre */
            });

        listarBancosActivos()
            .then((lista) => {
                if (!vigente) return;
                setBancos(lista);
                setErrorBancos(null);
            })
            .catch((causa: unknown) => {
                if (vigente) setErrorBancos(getErrorMessage(causa, 'No se pudieron leer los bancos'));
            });

        return () => {
            vigente = false;
        };
    }, [open, intentoBancos]);

    const reintentarBancos = (): void => {
        setErrorBancos(null);
        setBancos(null);
        setIntentoBancos((n) => n + 1);
    };

    // ─── Lo elegido, ya resuelto contra lo que informa el servidor ───
    const canal = canales.find((c) => c.codigo === codigoCanal) ?? CANALES_PAGO_RESPALDO[0];
    const esBanco = canal.codigo === 'banco';

    // Zelle es un canal, no una moneda: lo que se transfiere por Zelle son dólares.
    const opcionesMoneda = canal.codigo === 'zelle' ? monedas.filter((m) => m.codigo === 'USD') : monedas;
    const codigoDeseado = codigoMoneda ?? canal.monedaPorDefecto;
    const monedaElegida = opcionesMoneda.find((m) => m.codigo === codigoDeseado);
    // Sin esa moneda (aún no se leyó, o no tiene tasa) no se puede calcular cuánto transferir: se avisa y no se cobra.
    const moneda = monedaElegida ?? buscarMoneda(monedas, MONEDA_BASE);
    const monedaLista = monedaElegida !== undefined;
    const esCUP = moneda.codigo === MONEDA_BASE;
    const importe = importeEnMoneda(montoTotal, moneda);
    const simbolo = simboloMoneda(moneda.codigo);

    const bancoActual = bancos?.find((b) => b._id === bancoId);
    const cargandoBancos = open && bancos === null && errorBancos === null;
    const imagenBanco = esBanco && bancoActual ? (bancoImagenes[bancoActual.codigo] ?? '') : '';

    const quitarError = (campo: keyof PagoTransferenciaErrors): void => {
        if (errors[campo]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[campo];
                return newErrors;
            });
        }
    };

    const handleCanalChange = (codigo: CanalTransferencia): void => {
        setCodigoCanal(codigo);
        setCodigoMoneda(null); // cada canal tiene su moneda por defecto
        setReferencia('');     // lo que se escribe como referencia es otra cosa en cada canal
        setErrors({});
    };

    const validate = (): boolean => {
        const newErrors: PagoTransferenciaErrors = {};

        if (!referencia.trim()) {
            newErrors.referencia = `${etiquetaReferencia(canal.codigo, tipoCuenta)} es requerido`;
        }
        if (canal.requiereBanco && !bancoActual) {
            newErrors.banco = 'Seleccione un banco';
        }
        if (!montoPagar.trim() || isNaN(Number(montoPagar)) || Number(montoPagar) <= 0) {
            newErrors.monto_pagar = 'El monto debe ser mayor a 0';
            notify.warning('El monto a pagar no es válido');
        }

        if (!monedaLista) {
            notify.warning(
                cargandoMonedas
                    ? 'Espere a que se lean las monedas y tasas'
                    : `No se puede cobrar en ${codigoDeseado}: no tiene tasa de cambio ni billetes configurados`,
            );
        }

        if (productosCarrito.length === 0) {
            notify.warning('El carrito está vacío. Agregue productos para continuar.');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0 && productosCarrito.length > 0 && monedaLista;
    };

    // ═══════════════════════════════════════════════════════════════
    // HANDLE FINALIZAR PAGO — TRANSFERENCIA
    // Una sola petición (POST /venta/checkout): el servidor calcula el total, descuenta el stock y
    // registra la venta con el pago por transferencia. El monto no se envía: es el total de la venta
    // (en otra moneda, el servidor lo convierte con la tasa vigente y la guarda).
    // ═══════════════════════════════════════════════════════════════
    const handleFinalizarPago = async (): Promise<void> => {
        if (!validate()) return;

        const resultado = await cobrar({
            items: itemsDeCarrito(productosCarrito),
            pago: {
                tipo: 'transferencia',
                canal: canal.codigo,
                ...(canal.requiereBanco && bancoActual ? { bancoId: bancoActual._id } : {}),
                ...(esBanco ? { tipoCuenta } : {}),
                numeroCuenta: referencia.trim(),
                moneda: moneda.codigo,
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
            canal: canal.codigo,
            banco: esBanco ? (bancoActual?.codigo ?? '') : '',
            referencia: referencia.trim(),
            notas: notas.trim(),
            moneda: respuesta.pago.moneda ?? moneda.codigo,
            monto_pagar: respuesta.venta.total,
            monto_moneda: respuesta.pago.montoAPagarMoneda ?? respuesta.venta.total,
        };

        notify.success(`${textoVentaRegistrada(respuesta, repetida)} por ${canal.nombre}`);
        // Avisos que no impidieron el cobro (por ejemplo, un número de tarjeta que no parece del banco).
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
            setCodigoCanal('banco');
            setCodigoMoneda(null);
            setBancoId('');
            setTipoCuenta('tarjeta');
            setReferencia('');
            setNotas('');
            setMontoPagar(montoTotal.toFixed(2));
            setErrors({});
        }
        onClose();
    };

    const bloqueado = loading || !!aviso;

    return (
        <>
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
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

                    {/* Canal: banco, Transfermóvil, EnZona o Zelle */}
                    <TextField
                        select
                        fullWidth
                        label="Canal de Pago"
                        margin="normal"
                        size="small"
                        value={canal.codigo}
                        onChange={(e) => handleCanalChange(e.target.value as CanalTransferencia)}
                        disabled={bloqueado}
                    >
                        {canales.map((c) => (
                            <MenuItem key={c.codigo} value={c.codigo}>{c.nombre}</MenuItem>
                        ))}
                    </TextField>

                    {/* Moneda de la transferencia (Zelle: dólares) */}
                    <TextField
                        select
                        fullWidth
                        label="Moneda"
                        margin="normal"
                        size="small"
                        value={monedaLista ? moneda.codigo : ''}
                        onChange={(e) => setCodigoMoneda(e.target.value)}
                        disabled={bloqueado || opcionesMoneda.length <= 1}
                        error={!monedaLista && !cargandoMonedas}
                        helperText={
                            errorMonedas
                                ? 'No se pudieron leer las monedas del servidor: por ahora solo se cobra en CUP.'
                                : cargandoMonedas
                                    ? 'Leyendo monedas y tasas…'
                                    : !monedaLista
                                        ? `No se puede cobrar en ${codigoDeseado}: no tiene tasa de cambio ni billetes configurados.`
                                        : canal.codigo === 'zelle'
                                            ? 'Zelle es un canal de pago: lo que se transfiere son dólares (USD).'
                                            : undefined
                        }
                    >
                        {opcionesMoneda.map((m) => (
                            <MenuItem key={m.codigo} value={m.codigo}>{m.codigo} - {m.nombre}</MenuItem>
                        ))}
                    </TextField>

                    {/* Monto a pagar (solo lectura): en la moneda elegida; el total de la venta está en CUP */}
                    <TextField
                        fullWidth
                        label={esCUP ? 'Monto a Pagar' : `Monto a Pagar (${moneda.codigo})`}
                        margin="normal"
                        size="small"
                        type="number"
                        value={importe.toFixed(2)}
                        error={!!errors.monto_pagar}
                        helperText={
                            errors.monto_pagar ||
                            (esCUP
                                ? undefined
                                : `Total de la venta: ${formatoImporte(montoTotal, MONEDA_BASE)}. Tasa${tipoTasa === 'tasaBancoCentral' ? ' (Banco Central)' : tipoTasa === 'tasaMercadoInformal' ? ' (mercado informal)' : ''}: 1 ${moneda.codigo} = ${moneda.cupPorUnidad.toFixed(2)} CUP`)
                        }
                        disabled={loading}
                        slotProps={{
                            input: {
                                readOnly: true,
                                startAdornment: (
                                    <Typography sx={{ mr: 1, color: 'text.secondary' }}>{simbolo}</Typography>
                                ),
                            }
                        }}
                    />

                    {/* Banco: solo en la transferencia bancaria (del nomenclador de bancos) */}
                    {canal.requiereBanco && (
                        <TextField
                            select
                            fullWidth
                            label="Banco"
                            margin="normal"
                            size="small"
                            value={bancoActual ? bancoActual._id : ''}
                            onChange={(e) => { setBancoId(e.target.value); quitarError('banco'); }}
                            error={!!errors.banco || !!errorBancos}
                            helperText={
                                errors.banco ||
                                (errorBancos
                                    ? `${errorBancos}. `
                                    : cargandoBancos
                                        ? 'Leyendo bancos…'
                                        : bancos && bancos.length === 0
                                            ? 'No hay bancos activos: regístrelos en el nomenclador de bancos.'
                                            : undefined)
                            }
                            disabled={bloqueado || cargandoBancos}
                            slotProps={{
                                input: {
                                    endAdornment: cargandoBancos
                                        ? <CircularProgress size={16} sx={{ mr: 3 }} />
                                        : errorBancos
                                            ? <Button size="small" onClick={reintentarBancos} sx={{ mr: 3, textTransform: 'none' }}>Reintentar</Button>
                                            : undefined,
                                },
                            }}
                        >
                            <MenuItem value="">
                                <em>-- Seleccionar banco --</em>
                            </MenuItem>
                            {(bancos ?? []).map((b) => (
                                <MenuItem key={b._id} value={b._id}>{b.nombre} ({b.codigo})</MenuItem>
                            ))}
                        </TextField>
                    )}

                    {/* Cuenta o tarjeta: con tarjeta, el servidor avisa si el número no parece del banco elegido */}
                    {esBanco && (
                        <ToggleButtonGroup
                            exclusive
                            fullWidth
                            size="small"
                            value={tipoCuenta}
                            onChange={(_evento, valor: TipoCuentaTransferencia | null) => {
                                if (valor) setTipoCuenta(valor);
                            }}
                            disabled={bloqueado}
                            aria-label="Tipo de número"
                            sx={{ mt: 1 }}
                        >
                            <ToggleButton value="tarjeta" sx={{ textTransform: 'none' }}>Tarjeta</ToggleButton>
                            <ToggleButton value="cuenta" sx={{ textTransform: 'none' }}>Cuenta</ToggleButton>
                        </ToggleButtonGroup>
                    )}

                    {/* Número de referencia */}
                    <TextField
                        fullWidth
                        label={etiquetaReferencia(canal.codigo, tipoCuenta)}
                        margin="normal"
                        size="small"
                        placeholder={esBanco ? 'XXXX XXXX XXXX XXXX' : undefined}
                        value={referencia}
                        onChange={(e) => { setReferencia(e.target.value); quitarError('referencia'); }}
                        error={!!errors.referencia}
                        helperText={errors.referencia || ayudaReferencia(canal.codigo, tipoCuenta)}
                        disabled={bloqueado}
                        slotProps={{
                            input: esBanco ? { inputComponent: MaskedInput as any } : {},
                        }}
                    />

                    {esBanco && (
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
                                    alt={`Tarjeta ${bancoActual?.codigo ?? ''}`}
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
                    )}
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
                            (canal.requiereBanco && !bancoActual) ||
                            !monedaLista ||
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
