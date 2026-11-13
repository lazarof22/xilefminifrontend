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
    Autocomplete,
    Box
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DialogCrearCliente, { type ClienteFormData } from '../../../components/AddClientDialog';
import { CamposIdentidad, CamposTelefono } from '../../clientes/CamposCliente';
import { clienteIdValido, itemsDeCarrito } from '../../../service/ventaService';
import type { ProductoCarrito, RespuestaCheckout, TipoIdentidad } from '../../../types/venta.types';
import {
    CODIGO_PAIS_POR_DEFECTO,
    LONGITUD_CI,
    LONGITUD_MAXIMA_TELEFONO,
    codigoPaisValido,
    errorIdentidad,
    errorTelefono,
    limpiarNit,
    soloDigitos,
} from '../../../utils/identidadCliente';
import { textoVentaRegistrada, useCobroVenta } from '../useCobroVenta';
import AvisoCobroAlert from '../AvisoCobroAlert';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Tipos ─────────────────────────────────────────────

/** Lo que quedó registrado a crédito, para quien necesite el comprobante del pago. */
export interface PagoCreditoData {
    cliente: string;
    tipoIdentidad: TipoIdentidad;
    /** La CI (11 dígitos) o el NIT, según `tipoIdentidad`. */
    identidad: string;
    /** Teléfono sin el prefijo de país. */
    telefono_cliente: string;
    codigoPais: string;
    monto_pagar: number;
}

interface ClienteOption {
    /** La CI o, en un cliente con NIT, el mismo NIT. */
    id_cliente: string;
    nombre_cliente: string;
    telefono_cliente: string;
    email_cliente: string;
    direccion_cliente: string;
    tipo_cliente: string;
    tipoIdentidad?: TipoIdentidad;
    nit?: string;
    codigoPais?: string;
    _id?: string;
}

interface PagoCreditoErrors {
    cliente?: string;
    ci?: string;
    nit?: string;
    telefono_cliente?: string;
    monto_pagar?: string;
}

export interface PagoCreditoDialogProps {
    open: boolean;
    onClose: () => void;
    montoTotal: number;
    productosCarrito: ProductoCarrito[];
    subtotal: number;
    descuentoTotal: number;
    impuesto: number;
    onPagoCompletado?: (data: PagoCreditoData) => void;
    onVentaExitosa?: (ventaId: string, respuesta?: RespuestaCheckout) => void;
}

// ─── Componente ──────────────────────────────────────

export default function PagoCreditoDialog({
    open,
    onClose,
    montoTotal,
    productosCarrito,
    subtotal,
    descuentoTotal,
    impuesto,
    onPagoCompletado,
    onVentaExitosa,
}: PagoCreditoDialogProps): React.JSX.Element {
    const [cliente, setCliente] = useState<string>('');
    // Identidad: persona natural (CI) o empresa/mipyme (NIT). Solo está habilitada la elegida.
    const [tipoIdentidad, setTipoIdentidad] = useState<TipoIdentidad>('CI');
    const [ci, setCi] = useState<string>('');
    const [nit, setNit] = useState<string>('');
    const [telefono, setTelefono] = useState<string>('');
    const [codigoPais, setCodigoPais] = useState<string>(CODIGO_PAIS_POR_DEFECTO);
    const [montoPagar, setMontoPagar] = useState<string>(montoTotal.toFixed(2));
    const [clienteMongoId, setClienteMongoId] = useState<string>('');

    const [clientes, setClientes] = useState<ClienteOption[]>([]);
    const [loadingClientes, setLoadingClientes] = useState<boolean>(false);
    const [errors, setErrors] = useState<PagoCreditoErrors>({});
    const { cobrar, enviando: loading, aviso, descartar, hayPendiente } = useCobroVenta();

    const [openDialogCrear, setOpenDialogCrear] = useState<boolean>(false);

    const notify = useNotify();

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

    useEffect(() => {
        if (open) {
            fetchClientes();
            setMontoPagar(montoTotal.toFixed(2));
        }
    }, [open, montoTotal]);

    /** Rellena la identidad y el teléfono con los datos del cliente (o los vacía). */
    const aplicarCliente = (value: ClienteOption | null): void => {
        if (value) {
            const tipo: TipoIdentidad = value.tipoIdentidad === 'NIT' ? 'NIT' : 'CI';
            setCliente(value.nombre_cliente);
            setTipoIdentidad(tipo);
            setCi(tipo === 'CI' ? soloDigitos(value.id_cliente || '', LONGITUD_CI) : '');
            setNit(tipo === 'NIT' ? limpiarNit(value.nit || value.id_cliente || '') : '');
            setTelefono(soloDigitos(value.telefono_cliente || '', LONGITUD_MAXIMA_TELEFONO));
            setCodigoPais(codigoPaisValido(value.codigoPais));
            setClienteMongoId(value._id || '');
        } else {
            setCliente('');
            setTipoIdentidad('CI');
            setCi('');
            setNit('');
            setTelefono('');
            setCodigoPais(CODIGO_PAIS_POR_DEFECTO);
            setClienteMongoId('');
        }
    };

    const quitarError = (...campos: (keyof PagoCreditoErrors)[]): void => {
        if (campos.some((campo) => errors[campo])) {
            setErrors(prev => {
                const newErrors = { ...prev };
                campos.forEach((campo) => delete newErrors[campo]);
                return newErrors;
            });
        }
    };

    const handleClienteSeleccionado = (
        _event: React.SyntheticEvent,
        value: ClienteOption | null
    ): void => {
        aplicarCliente(value);
        // Otro cliente: sus datos se validan de nuevo.
        quitarError('cliente', 'ci', 'nit', 'telefono_cliente');
    };

    // Al cambiar entre CI y NIT el dato del otro tipo no se envía: se quita su error.
    const handleTipoIdentidad = (tipo: TipoIdentidad): void => {
        setTipoIdentidad(tipo);
        quitarError('ci', 'nit');
    };

    const validate = (): boolean => {
        const newErrors: PagoCreditoErrors = {};

        if (!cliente.trim()) {
            newErrors.cliente = 'El cliente es requerido';
        }
        // CI: exactamente 11 dígitos; NIT: de 5 a 20 letras, números o guiones (el servidor lo vuelve a comprobar).
        const errorId = errorIdentidad(tipoIdentidad, ci, nit);
        if (errorId) {
            if (tipoIdentidad === 'CI') newErrors.ci = errorId;
            else newErrors.nit = errorId;
        }
        const errorTel = errorTelefono(telefono);
        if (errorTel) {
            newErrors.telefono_cliente = errorTel;
        }
        if (!montoPagar.trim() || isNaN(Number(montoPagar)) || Number(montoPagar) <= 0) {
            newErrors.monto_pagar = 'El monto debe ser mayor a 0';
            notify.warning('Seleccione un producto del Stock');
        }

        if (productosCarrito.length === 0) {
            notify.warning('El carrito está vacío. Agregue productos para continuar.');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0 && productosCarrito.length > 0;
    };

    /** El error del servidor, en el campo al que corresponde (además del aviso). */
    const errorEnCampo = (codigo: string | undefined, mensaje: string): PagoCreditoErrors => {
        switch (codigo) {
            case 'CI_INVALIDA': return { ci: mensaje };
            case 'NIT_INVALIDO': return { nit: mensaje };
            case 'IDENTIDAD_REQUERIDA': return tipoIdentidad === 'CI' ? { ci: mensaje } : { nit: mensaje };
            case 'TELEFONO_INVALIDO': return { telefono_cliente: mensaje };
            default: return {};
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // HANDLE FINALIZAR PAGO — CRÉDITO
    // Una sola petición (POST /venta/checkout): el servidor calcula el total, descuenta el stock y
    // registra la venta a crédito del cliente. El monto no se envía: es el total de la venta.
    // ═══════════════════════════════════════════════════════════════
    const handleFinalizarPago = async (): Promise<void> => {
        if (!validate()) return;

        if (!clienteMongoId) {
            notify.error('Error: No se pudo obtener el ID del cliente. Seleccione el cliente nuevamente.');
            return;
        }

        const clienteId = clienteIdValido(clienteMongoId);
        if (!clienteId) {
            notify.error('El cliente seleccionado no tiene un identificador válido. Seleccione el cliente nuevamente.');
            return;
        }

        const resultado = await cobrar({
            clienteId,
            items: itemsDeCarrito(productosCarrito),
            pago: {
                tipo: 'credito',
                tipoIdentidad,
                ...(tipoIdentidad === 'CI' ? { ci: ci.trim() } : { nit: nit.trim() }),
                telefono: telefono.trim(),
                codigoPais,
            },
            // Lo que vio el cajero: solo informativo, el servidor cobra con sus propios totales.
            estimado: { subtotal, descuento: descuentoTotal, impuesto, total: montoTotal },
        });

        if (!resultado) return; // doble clic: el primer cobro sigue su curso

        if (!resultado.ok) {
            // Si no se sabe si quedó registrada, el aviso fijo del diálogo ya lo explica.
            if (!resultado.error.incierto && !resultado.error.bloqueado) {
                // La CI, el NIT o el teléfono que el servidor rechazó se marcan en su campo.
                setErrors(prev => ({ ...prev, ...errorEnCampo(resultado.error.codigo, resultado.error.message) }));
                notify.error(resultado.error.message);
            }
            return;
        }

        // ─── ÉXITO ────────────────────────────────────────────
        const { respuesta, repetida } = resultado;

        const pagoData: PagoCreditoData = {
            cliente: cliente,
            tipoIdentidad,
            identidad: tipoIdentidad === 'CI' ? ci.trim() : nit.trim(),
            telefono_cliente: telefono.trim(),
            codigoPais,
            monto_pagar: respuesta.venta.total,
        };

        notify.success(`${textoVentaRegistrada(respuesta, repetida)} a crédito de ${cliente}`);
        respuesta.advertencias.forEach((advertencia) => notify.warning(advertencia));

        onPagoCompletado?.(pagoData);
        onVentaExitosa?.(respuesta.venta._id, respuesta);

        setTimeout(() => {
            handleClose();
        }, 1500);
    };

    const handleClose = (): void => {
        // Con un cobro sin confirmar los datos se conservan: otro cliente sería otra venta (otra clave).
        if (!hayPendiente()) {
            aplicarCliente(null);
            setMontoPagar(montoTotal.toFixed(2));
            setErrors({});
        }
        onClose();
    };

    const handleClienteCreado = (nuevoCliente: ClienteFormData): void => {
        const creado: ClienteOption = {
            id_cliente: nuevoCliente.id_cliente,
            nombre_cliente: nuevoCliente.nombre_cliente,
            telefono_cliente: nuevoCliente.telefono_cliente,
            email_cliente: nuevoCliente.email_cliente,
            direccion_cliente: nuevoCliente.direccion_cliente,
            tipo_cliente: nuevoCliente.tipo_cliente,
            tipoIdentidad: nuevoCliente.tipoIdentidad,
            nit: nuevoCliente.nit,
            codigoPais: nuevoCliente.codigoPais,
            _id: nuevoCliente._id || '',
        };

        aplicarCliente(creado);
        setClientes(prev => [...prev, creado]);
    };

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
                    <PaymentIcon sx={{ width: 24, height: 24, color: 'primary.main' }} />
                    Pago por Crédito
                </DialogTitle>

                <DialogContent>
                    {/* Cobro que no se pudo confirmar: se reintenta con los mismos datos (misma clave) */}
                    <AvisoCobroAlert aviso={aviso} onDescartar={descartar} ocupado={loading} />

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mt: 1 }}>
                        <Box sx={{ width: '75%' }}>
                            <Autocomplete
                                options={clientes}
                                getOptionLabel={(option) => option.nombre_cliente}
                                loading={loadingClientes}
                                disabled={!!aviso}
                                onChange={handleClienteSeleccionado}
                                value={clientes.find(c => c.nombre_cliente === cliente) || null}
                                renderInput={(params) => (
                                    <TextField {...params} label="Cliente" size="small"
                                        error={!!errors.cliente} helperText={errors.cliente} />
                                )}
                            />
                        </Box>
                        <Button variant="contained" size="small"
                            startIcon={<PersonAddIcon sx={{ fontSize: "medium" }} />}
                            onClick={() => setOpenDialogCrear(true)}
                            disabled={!!aviso}
                            sx={{
                                width: '40%',
                                background: "linear-gradient(135deg, rgba(245, 6, 6, 0.9), rgba(10, 83, 218, 0.9))",
                                color: "#fff", textTransform: "none", fontWeight: 600,
                            }}>
                            Nuevo
                        </Button>
                    </Box>

                    <TextField fullWidth label="Nombre del Cliente" margin="normal" size="small"
                        value={cliente}
                        onChange={(e) => {
                            setCliente(e.target.value);
                            if (errors.cliente) {
                                setErrors(prev => { const n = { ...prev }; delete n.cliente; return n; });
                            }
                        }}
                        error={!!errors.cliente} helperText={errors.cliente}
                        disabled={loading || !!aviso}
                    />

                    {/* Identidad: persona natural (CI) o empresa/mipyme (NIT); solo se habilita la elegida */}
                    <CamposIdentidad
                        size="small"
                        tipo={tipoIdentidad}
                        ci={ci}
                        nit={nit}
                        onTipoChange={handleTipoIdentidad}
                        onCiChange={(valor) => { setCi(valor); quitarError('ci'); }}
                        onNitChange={(valor) => { setNit(valor); quitarError('nit'); }}
                        errorCi={errors.ci}
                        errorNit={errors.nit}
                        disabled={loading || !!aviso}
                    />

                    {/* Teléfono con el prefijo de país (+53 de siempre) */}
                    <CamposTelefono
                        size="small"
                        codigoPais={codigoPais}
                        telefono={telefono}
                        onCodigoPaisChange={setCodigoPais}
                        onTelefonoChange={(valor) => { setTelefono(valor); quitarError('telefono_cliente'); }}
                        error={errors.telefono_cliente}
                        disabled={loading || !!aviso}
                    />

                    <TextField fullWidth label="Monto a Pagar" margin="normal" size="small"
                        type="number" value={montoPagar}
                        error={!!errors.monto_pagar}
                        helperText={errors.monto_pagar || 'Es el total de la venta: lo calcula el servidor'}
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
                            boxShadow: "0 4px 19px rgba(0,0,0,0.2)", color: "white",
                            borderRadius: 2
                        }}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleFinalizarPago}
                        disabled={
                            loading ||
                            aviso?.tipo === 'bloqueado' ||
                            !clienteMongoId ||
                            !montoPagar || Number(montoPagar) <= 0 ||
                            productosCarrito.length === 0
                        }
                        fullWidth
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                        sx={{
                            flex: 1,
                            background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                            boxShadow: "0 4px 19px rgba(0,0,0,0.2)",
                            borderRadius: 2
                        }}>
                        {loading
                            ? 'Procesando...'
                            : aviso?.tipo === 'incierto'
                                ? 'Reintentar cobro'
                                : 'Finalizar Pago'}
                    </Button>
                </DialogActions>
            </Dialog>

            <DialogCrearCliente
                open={openDialogCrear}
                onClose={() => setOpenDialogCrear(false)}
                onClienteCreado={handleClienteCreado}
            />

        </>
    );
}