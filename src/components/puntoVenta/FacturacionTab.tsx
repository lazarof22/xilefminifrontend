// src/components/FacturacionTab.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Card, CardContent, Typography, Box, IconButton, Button,
    TextField, Divider, Chip, Dialog,
    DialogTitle, DialogContent, DialogActions, Grid, MenuItem,
    Select, FormControl, InputLabel, type SelectChangeEvent, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from "@mui/icons-material/Delete";
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import UndoIcon from '@mui/icons-material/Undo';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import CustomDataGridR, { type Column } from '../CustomDataGridR';
import { useNotify } from '../notificaciones/useNotify';
import { FacturaApi, mensajeErrorFactura } from '../../service/facturaApi';
import { AlmacenApi, type Almacen } from '../../service/almacenApi';
import { fechaHoyLocal } from '../../service/httpClient';
import { obtenerParametrosVenta } from '../../service/ventaService';
import type { ImpuestoFactura } from '../../types/factura.types';
import { payloadSesionActual } from '../../utils/auth';
import { puedeAnularFactura, puedeEditarFactura, puedeModificarPrecioFactura } from '../../utils/permisos';
import {
    MOTIVO_ANULACION_MAX,
    MOTIVO_ANULACION_MIN,
    type CrearFacturaDto,
    type EstadoFactura,
    type Factura,
    type ItemFactura,
    type MetodoPagoFactura,
    type ParticipanteFactura,
} from '../../types/factura.types';

// ─── PALETA (consistente con el resto del módulo Punto de Venta) ──
const COLORS = {
    bg: '#0a0f0d',
    card: '#151a19',
    cardAlt: '#1a201e',
    border: 'rgba(255,255,255,0.06)',
    accent: '#00e5a0',
    accentSoft: 'rgba(0,229,160,0.08)',
    textMuted: '#9ca3af',
    textLight: '#e5e7eb',
    danger: '#ef4444',
};

// ─── ESTILOS REUTILIZABLES ──────────────────────────────────────
const fieldSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 1.5,
        bgcolor: 'rgba(255,255,255,0.03)',
        color: COLORS.textLight,
        '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
        '&:hover fieldset': { borderColor: 'rgba(0,229,160,0.4)' },
        '&.Mui-focused fieldset': { borderColor: COLORS.accent },
    },
    '& .MuiInputLabel-root': { color: COLORS.textMuted },
    '& .MuiInputLabel-root.Mui-focused': { color: COLORS.accent },
    '& .MuiSvgIcon-root': { color: COLORS.textMuted },
};

const selectSx = {
    borderRadius: 1.5,
    bgcolor: 'rgba(255,255,255,0.03)',
    color: COLORS.textLight,
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.08)' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,229,160,0.4)' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.accent },
    '& .MuiSvgIcon-root': { color: COLORS.textMuted },
};

const labelSx = {
    color: COLORS.textMuted,
    '&.Mui-focused': { color: COLORS.accent },
};

const sectionTitleSx = {
    color: COLORS.accent,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: 1,
};

const subtitleSx = {
    color: COLORS.textMuted,
    fontWeight: 600,
    mb: 1.5,
    textTransform: 'uppercase' as const,
    fontSize: '0.75rem',
    letterSpacing: '0.05em',
};

// ─── INTERFACES ───────────────────────────────────────────────
interface ProductoAPI {
    _id: string;
    codigo_producto: string;
    nombre_producto: string;
    categoria_producto: string;
    precio_compra: number;
    precio_venta: number;
    stock_inicial: number;
    stock_minimo: number;
    estado: string;
}

interface FacturacionTabProps {
    productos: ProductoAPI[];
    /** Se llama cuando el servidor deja confirmada una factura. */
    onFacturaEmitida?: (factura: Factura) => void;
}

/** Fila del historial: `estado` y `nit` ya vienen listos para mostrar. */
type FilaFactura = Omit<Factura, 'estado' | 'nit'> & { estado: string; nit: string };

type ModoGuardado = 'borrador' | 'terminar' | 'confirmar';
type TransicionFactura = 'terminar' | 'volverAEdicion' | 'confirmar';
type TipoAnulacion = 'anular' | 'cancelar';

const FACTURAS_POR_PAGINA = 100;
/** Nombre que el servidor asigna cuando no se indica cliente. */
const CLIENTE_POR_DEFECTO = 'Venta al público';

const ETIQUETA_ESTADO: Record<EstadoFactura, string> = {
    edicion: 'En edición',
    terminada: 'Terminada',
    confirmada: 'Confirmada',
    cancelada: 'Cancelada',
    anulada: 'Anulada',
};

const COLOR_ESTADO: Record<EstadoFactura, 'info' | 'warning' | 'success' | 'error' | 'default'> = {
    edicion: 'info',
    terminada: 'warning',
    confirmada: 'success',
    cancelada: 'error',
    anulada: 'default',
};

const MENSAJE_TRANSICION: Record<TransicionFactura, string> = {
    terminar: 'Factura terminada',
    volverAEdicion: 'Factura devuelta a edición',
    confirmar: 'Factura confirmada: el servidor descontó el stock',
};

const redondear = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

type LineaCalculable = Pick<ItemFactura, 'precio' | 'cantidad' | 'descuentoMonto' | 'descuentoPct' | 'recargo'>;

/** Descuento efectivo de la línea: igual que el servidor, nunca supera bruto + recargo. */
function descuentoLinea(linea: LineaCalculable): number {
    const bruto = redondear(linea.precio * linea.cantidad);
    return Math.min(redondear(linea.descuentoMonto + (bruto * linea.descuentoPct) / 100), redondear(bruto + linea.recargo));
}

/** Total de la línea (vista previa: el servidor lo recalcula al guardar). */
function totalLinea(linea: LineaCalculable): number {
    const bruto = redondear(linea.precio * linea.cantidad);
    return redondear(Math.max(0, bruto - descuentoLinea(linea) + linea.recargo));
}

function formatearFechaHora(iso?: string): string {
    if (!iso) return '';
    const fecha = new Date(iso);
    return Number.isNaN(fecha.getTime()) ? iso : fecha.toLocaleString('es');
}

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────
export default function FacturacionTab({ productos, onFacturaEmitida }: FacturacionTabProps) {
    const notify = useNotify();
    // Los roles solo sirven para ocultar botones: la autorización real la decide el servidor.
    const sesion = useMemo(() => payloadSesionActual(), []);
    const puedeEditar = puedeEditarFactura(sesion?.rol);
    const puedeAnular = puedeAnularFactura(sesion?.rol);
    const puedeCambiarPrecio = puedeModificarPrecioFactura(sesion?.rol);
    const formularioRef = useRef<HTMLDivElement>(null);

    // Estados del formulario de factura
    const [cliente, setCliente] = useState('');
    const [nit, setNit] = useState('');
    const [direccion, setDireccion] = useState('');
    const [telefono, setTelefono] = useState('');
    const [email, setEmail] = useState('');
    const [metodoPago, setMetodoPago] = useState<MetodoPagoFactura>('efectivo');
    /** Factura en edición que el formulario está modificando (null = factura nueva). */
    const [facturaEnEdicionId, setFacturaEnEdicionId] = useState<string | null>(null);

    // Datos de la empresa (los asigna el servidor; solo se muestran al abrir una factura)
    const [empresaNombre, setEmpresaNombre] = useState('');
    const [empresaDireccion, setEmpresaDireccion] = useState('');
    const [empresaTelefono, setEmpresaTelefono] = useState('');
    const [empresaEmail, setEmpresaEmail] = useState('');
    const [empresaRucNit, setEmpresaRucNit] = useState('');
    const [empresaCiudad, setEmpresaCiudad] = useState('');
    const [empresaPais, setEmpresaPais] = useState('');

    // Almacén desde el que se factura
    const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
    const [almacenId, setAlmacenId] = useState('');
    const almacenElegido = almacenes.find((a) => a._id === almacenId);

    // Responsables de la factura ("Facturado por" lo fija el servidor con el usuario de la sesión)
    const [facturadoPorNombre, setFacturadoPorNombre] = useState(sesion?.nombre ?? '');
    const [facturadoPorCI, setFacturadoPorCI] = useState('');
    const [facturadoPorFecha, setFacturadoPorFecha] = useState(fechaHoyLocal());
    const [despachadoPorNombre, setDespachadoPorNombre] = useState('');
    const [despachadoPorCI, setDespachadoPorCI] = useState('');
    const [despachadoPorFecha, setDespachadoPorFecha] = useState('');
    const [transportadoPorNombre, setTransportadoPorNombre] = useState('');
    const [transportadoPorCI, setTransportadoPorCI] = useState('');
    const [transportadoPorFecha, setTransportadoPorFecha] = useState('');
    const [recibidoPorNombre, setRecibidoPorNombre] = useState('');
    const [recibidoPorCI, setRecibidoPorCI] = useState('');
    const [recibidoPorFecha, setRecibidoPorFecha] = useState('');

    // Estados de items
    const [items, setItems] = useState<ItemFactura[]>([]);
    const [productoSeleccionado, setProductoSeleccionado] = useState('');
    const [cantidad, setCantidad] = useState('');
    const [precioVenta, setPrecioVenta] = useState('');
    const [descuentoPct, setDescuentoPct] = useState('');
    const [descuentoMonto, setDescuentoMonto] = useState('');
    const [recargo, setRecargo] = useState('');

    // Historial de facturas (siempre lo que está guardado en el servidor)
    const [facturas, setFacturas] = useState<Factura[]>([]);
    const [cargandoFacturas, setCargandoFacturas] = useState(false);
    const [errorFacturas, setErrorFacturas] = useState<string | null>(null);
    const [paginaCargada, setPaginaCargada] = useState(0);
    const [hayMasFacturas, setHayMasFacturas] = useState(false);

    /** Una acción contra el servidor está en curso: bloquea los botones para no duplicarla. */
    const [procesando, setProcesando] = useState(false);
    /** Último error del servidor sobre la factura abierta (stock insuficiente, estado, rol...). */
    const [errorAccion, setErrorAccion] = useState<string | null>(null);

    // Modal de vista de factura
    const [openFacturaModal, setOpenFacturaModal] = useState(false);
    const [facturaActual, setFacturaActual] = useState<Factura | null>(null);

    // Diálogo del motivo de cancelación / anulación
    const [anulacion, setAnulacion] = useState<{ factura: Factura; tipo: TipoAnulacion } | null>(null);
    const [motivo, setMotivo] = useState('');
    const [errorAnulacion, setErrorAnulacion] = useState<string | null>(null);

    // Modal de ticket
    const [openTicketModal, setOpenTicketModal] = useState(false);
    const [ticketData, setTicketData] = useState<{ factura: Factura; duplicado: boolean } | null>(null);

    // ─── CARGA DE DATOS DEL SERVIDOR ────────────────────────────
    const cargarPagina = useCallback(async (pagina: number) => {
        setCargandoFacturas(true);
        setErrorFacturas(null);
        try {
            const lote = await FacturaApi.listar(pagina, FACTURAS_POR_PAGINA);
            setFacturas((prev) => {
                if (pagina === 1) return lote;
                const conocidos = new Set(prev.map((f) => f.id));
                return [...prev, ...lote.filter((f) => !conocidos.has(f.id))];
            });
            setPaginaCargada(pagina);
            setHayMasFacturas(lote.length === FACTURAS_POR_PAGINA);
        } catch (error) {
            setErrorFacturas(mensajeErrorFactura(error));
        } finally {
            setCargandoFacturas(false);
        }
    }, []);

    useEffect(() => {
        void cargarPagina(1);
    }, [cargarPagina]);

    // Impuesto sobre ventas vigente: cada factura lleva el suyo (los renglones exentos los excluye el servidor).
    const [impuestoPct, setImpuestoPct] = useState(0);
    // Impuesto de la factura que se edita: se conserva el que ya tiene.
    const [impuestoDeLaFactura, setImpuestoDeLaFactura] = useState<ImpuestoFactura | undefined>(undefined);

    useEffect(() => {
        let activo = true;
        obtenerParametrosVenta()
            .then((p) => { if (activo) setImpuestoPct(p.impuestoPorciento); })
            .catch(() => { /* sin parámetros la factura se emite sin impuesto, como antes */ });
        return () => { activo = false; };
    }, []);

    useEffect(() => {
        let activo = true;
        AlmacenApi.listar()
            .then((lista) => { if (activo) setAlmacenes(lista); })
            .catch((error: unknown) => {
                if (activo) notify.error(`No se pudieron cargar los almacenes: ${mensajeErrorFactura(error)}`);
            });
        return () => { activo = false; };
    }, [notify]);

    /** Recarga una factura del servidor y la deja actualizada en el historial y en el detalle abierto. */
    const refrescarFactura = useCallback(async (id: string): Promise<Factura | null> => {
        try {
            const actual = await FacturaApi.obtener(id);
            setFacturas((prev) =>
                prev.some((f) => f.id === actual.id) ? prev.map((f) => (f.id === actual.id ? actual : f)) : [actual, ...prev]
            );
            setFacturaActual((prev) => (prev && prev.id === actual.id ? actual : prev));
            return actual;
        } catch (error) {
            notify.error(`No se pudo recargar la factura ${id}: ${mensajeErrorFactura(error)}`);
            return null;
        }
    }, [notify]);

    // ─── LIMPIAR FORMULARIO ─────────────────────────────────────
    const limpiarFormulario = () => {
        setItems([]);
        setCliente('');
        setNit('');
        setDireccion('');
        setTelefono('');
        setEmail('');
        setMetodoPago('efectivo');
        setFacturaEnEdicionId(null);
        setImpuestoDeLaFactura(undefined);

        setProductoSeleccionado('');
        setCantidad('');
        setPrecioVenta('');
        setDescuentoPct('');
        setDescuentoMonto('');
        setRecargo('');

        setEmpresaNombre('');
        setEmpresaDireccion('');
        setEmpresaTelefono('');
        setEmpresaEmail('');
        setEmpresaRucNit('');
        setEmpresaCiudad('');
        setEmpresaPais('');

        setAlmacenId('');

        setFacturadoPorNombre(sesion?.nombre ?? '');
        setFacturadoPorCI('');
        setFacturadoPorFecha(fechaHoyLocal());
        setDespachadoPorNombre('');
        setDespachadoPorCI('');
        setDespachadoPorFecha('');
        setTransportadoPorNombre('');
        setTransportadoPorCI('');
        setTransportadoPorFecha('');
        setRecibidoPorNombre('');
        setRecibidoPorCI('');
        setRecibidoPorFecha('');
    };

    // ─── AGREGAR ITEM A LA FACTURA ──────────────────────────────
    const agregarItem = () => {
        if (!productoSeleccionado || !cantidad || !precioVenta) {
            notify.error('Complete los campos obligatorios: Producto, Cantidad y Precio');
            return;
        }

        const prod = productos.find(p => p._id === productoSeleccionado);
        if (!prod) return;

        const qty = parseInt(cantidad);
        // Sin permiso para cambiar el precio, la línea siempre usa el precio de venta del producto.
        const price = puedeCambiarPrecio ? parseFloat(precioVenta) : prod.precio_venta;
        const dPct = parseFloat(descuentoPct) || 0;
        const dMonto = parseFloat(descuentoMonto) || 0;
        const rec = parseFloat(recargo) || 0;

        if (!Number.isFinite(qty) || qty <= 0) {
            notify.error('La cantidad debe ser mayor que cero');
            return;
        }
        if (!Number.isFinite(price) || price < 0) {
            notify.error('El precio no es válido');
            return;
        }
        if (dPct < 0 || dPct > 100) {
            notify.error('El descuento debe estar entre 0 y 100 %');
            return;
        }
        if (dMonto < 0 || rec < 0) {
            notify.error('El descuento y el recargo no pueden ser negativos');
            return;
        }
        if (qty > prod.stock_inicial) {
            // Solo aviso: el stock real lo valida el servidor al confirmar la factura.
            notify.warning(`La cantidad supera el stock registrado (${prod.stock_inicial}); el servidor lo validará al confirmar`);
        }

        const linea: LineaCalculable = { precio: price, cantidad: qty, descuentoPct: dPct, descuentoMonto: dMonto, recargo: rec };
        const nuevoItem: ItemFactura = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
            productoId: prod._id,
            productoNombre: prod.nombre_producto,
            costo: prod.precio_compra,
            ...linea,
            total: totalLinea(linea),
        };

        setItems(prev => [...prev, nuevoItem]);

        // Limpiar campos
        setProductoSeleccionado('');
        setCantidad('');
        setPrecioVenta('');
        setDescuentoPct('');
        setDescuentoMonto('');
        setRecargo('');
    };

    // ─── ELIMINAR ITEM ──────────────────────────────────────────
    const eliminarItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    // ─── CALCULAR TOTALES (vista previa: el servidor los recalcula) ──
    const subtotal = items.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const descuentoTotal = items.reduce((acc, item) => acc + descuentoLinea(item), 0);
    const recargoTotal = items.reduce((acc, item) => acc + item.recargo, 0);
    const totalFactura = items.reduce((acc, item) => acc + totalLinea(item), 0);

    // ─── ARMAR EL CUERPO PARA EL SERVIDOR ───────────────────────
    /** undefined: no se indicó; null: datos incompletos (ya se avisó); objeto: completo. */
    const armarParticipante = (
        etiqueta: string, nombre: string, ci: string, fecha: string
    ): ParticipanteFactura | null | undefined => {
        const n = nombre.trim();
        const c = ci.trim();
        if (!n && !c && !fecha) return undefined;
        if (!n || !c || !fecha) {
            notify.error(`${etiqueta}: complete nombre, CI y fecha, o deje los tres campos vacíos`);
            return null;
        }
        return { nombre: n, ci: c, fecha };
    };

    const construirDto = (): CrearFacturaDto | null => {
        if (items.length === 0) {
            notify.error('Agregue al menos un producto');
            return null;
        }
        if (!almacenId) {
            notify.error('Seleccione el almacén desde el que se factura');
            return null;
        }
        const despachadoPor = armarParticipante('Despachado por', despachadoPorNombre, despachadoPorCI, despachadoPorFecha);
        const transportadoPor = armarParticipante('Transportado por', transportadoPorNombre, transportadoPorCI, transportadoPorFecha);
        const recibidoPor = armarParticipante('Recibido por', recibidoPorNombre, recibidoPorCI, recibidoPorFecha);
        if (despachadoPor === null || transportadoPor === null || recibidoPor === null) return null;

        return {
            cliente: cliente.trim(),
            nit: nit.trim(),
            direccion: direccion.trim(),
            telefono: telefono.trim(),
            email: email.trim(),
            almacenId,
            metodoPago,
            // El servidor recalcula `total` y rechaza campos que no conoce: se envía solo lo permitido.
            items: items.map((item) => ({
                id: item.id,
                productoId: item.productoId,
                productoNombre: item.productoNombre,
                ...(item.unidadMedida ? { unidadMedida: item.unidadMedida } : {}),
                cantidad: item.cantidad,
                precio: item.precio,
                costo: item.costo,
                descuentoPct: item.descuentoPct,
                descuentoMonto: item.descuentoMonto,
                recargo: item.recargo,
            })),
            ...(impuestoDeLaFactura
                ? { impuesto: impuestoDeLaFactura }
                : impuestoPct > 0
                    ? { impuesto: { tipo: 'Impuesto sobre ventas', porciento: impuestoPct } }
                    : {}),
            ...(despachadoPor ? { despachadoPor } : {}),
            ...(transportadoPor ? { transportadoPor } : {}),
            ...(recibidoPor ? { recibidoPor } : {}),
        };
    };

    // ─── DETALLE DE FACTURA ─────────────────────────────────────
    const abrirDetalle = (factura: Factura) => {
        setFacturaActual(factura);
        setOpenFacturaModal(true);
    };

    // ─── GUARDAR / TERMINAR / CONFIRMAR DESDE EL FORMULARIO ─────
    const procesarFormulario = async (modo: ModoGuardado) => {
        const dto = construirDto();
        if (!dto) return;

        setProcesando(true);
        setErrorAccion(null);
        let id = facturaEnEdicionId;
        try {
            const guardada = id ? await FacturaApi.actualizar(id, dto) : await FacturaApi.crear(dto);
            id = guardada.id;
            // Desde aquí la factura existe en el servidor: un reintento la modifica, no crea otra.
            setFacturaEnEdicionId(id);
            if (modo !== 'borrador') await FacturaApi.terminar(id);
            if (modo === 'confirmar') await FacturaApi.confirmar(id);
        } catch (error) {
            const mensaje = mensajeErrorFactura(error);
            notify.error(mensaje);
            const actual = id ? await refrescarFactura(id) : null;
            if (actual && actual.estado !== 'edicion') {
                // La factura ya avanzó en el servidor (p. ej. quedó terminada y no hubo stock):
                // se muestra tal como quedó, con el motivo del rechazo.
                limpiarFormulario();
                setErrorAccion(mensaje);
                abrirDetalle(actual);
            }
            setProcesando(false);
            return;
        }

        const guardadaFinal = await refrescarFactura(id);
        limpiarFormulario();
        if (guardadaFinal) {
            abrirDetalle(guardadaFinal);
            if (guardadaFinal.estado === 'confirmada') onFacturaEmitida?.(guardadaFinal);
        }
        notify.success(
            modo === 'confirmar' ? MENSAJE_TRANSICION.confirmar
                : modo === 'terminar' ? MENSAJE_TRANSICION.terminar
                    : 'Borrador guardado'
        );
        setProcesando(false);
    };

    // ─── TRANSICIONES DE ESTADO DESDE EL DETALLE ────────────────
    const transicionar = async (factura: Factura, accion: TransicionFactura) => {
        setProcesando(true);
        setErrorAccion(null);
        try {
            await FacturaApi[accion](factura.id);
            notify.success(MENSAJE_TRANSICION[accion]);
        } catch (error) {
            const mensaje = mensajeErrorFactura(error);
            setErrorAccion(mensaje);
            notify.error(mensaje);
        }
        // Se recarga siempre: la pantalla muestra lo guardado, haya salido bien o mal la acción.
        const actual = await refrescarFactura(factura.id);
        if (actual?.estado === 'confirmada' && factura.estado !== 'confirmada') onFacturaEmitida?.(actual);
        setProcesando(false);
    };

    // ─── EDITAR UNA FACTURA EN EDICIÓN ──────────────────────────
    const editarFactura = (factura: Factura) => {
        setItems(factura.items.map((item) => ({ ...item })));
        setCliente(factura.cliente === CLIENTE_POR_DEFECTO ? '' : factura.cliente);
        setNit(factura.nit ?? '');
        setDireccion(factura.direccion ?? '');
        setTelefono(factura.telefono ?? '');
        setEmail(factura.email ?? '');
        setMetodoPago(factura.metodoPago as MetodoPagoFactura);
        setAlmacenId(factura.almacenId ?? '');
        setFacturaEnEdicionId(factura.id);
        setImpuestoDeLaFactura(factura.impuesto);

        setEmpresaNombre(factura.emisor?.nombre ?? '');
        setEmpresaDireccion(factura.emisor?.direccion ?? '');
        setEmpresaTelefono(factura.emisor?.telefono ?? '');
        setEmpresaEmail(factura.emisor?.email ?? '');
        setEmpresaRucNit(factura.emisor?.nit ?? '');
        setEmpresaCiudad(factura.emisor?.ciudad ?? '');
        setEmpresaPais(factura.emisor?.pais ?? '');

        setFacturadoPorNombre(factura.facturadoPor?.nombre ?? '');
        setFacturadoPorCI(factura.facturadoPor?.ci ?? '');
        setFacturadoPorFecha(factura.facturadoPor?.fecha ?? '');
        setDespachadoPorNombre(factura.despachadoPor?.nombre ?? '');
        setDespachadoPorCI(factura.despachadoPor?.ci ?? '');
        setDespachadoPorFecha(factura.despachadoPor?.fecha ?? '');
        setTransportadoPorNombre(factura.transportadoPor?.nombre ?? '');
        setTransportadoPorCI(factura.transportadoPor?.ci ?? '');
        setTransportadoPorFecha(factura.transportadoPor?.fecha ?? '');
        setRecibidoPorNombre(factura.recibidoPor?.nombre ?? '');
        setRecibidoPorCI(factura.recibidoPor?.ci ?? '');
        setRecibidoPorFecha(factura.recibidoPor?.fecha ?? '');

        setOpenFacturaModal(false);
        formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // ─── CANCELAR / ANULAR CON MOTIVO ───────────────────────────
    const motivoLimpio = motivo.trim();
    const motivoInvalido = motivoLimpio.length < MOTIVO_ANULACION_MIN;

    const abrirAnulacion = (factura: Factura, tipo: TipoAnulacion) => {
        setMotivo('');
        setErrorAnulacion(null);
        setAnulacion({ factura, tipo });
    };

    const confirmarAnulacion = async () => {
        if (!anulacion || motivoInvalido) return;
        const { factura, tipo } = anulacion;

        setProcesando(true);
        setErrorAnulacion(null);
        try {
            if (tipo === 'cancelar') await FacturaApi.cancelar(factura.id, motivoLimpio);
            else await FacturaApi.anular(factura.id, motivoLimpio);
            notify.success(tipo === 'cancelar' ? 'Factura cancelada: el servidor revirtió el stock' : 'Factura anulada');
            setAnulacion(null);
            if (factura.id === facturaEnEdicionId) limpiarFormulario();
            const actual = await refrescarFactura(factura.id);
            if (actual) abrirDetalle(actual);
        } catch (error) {
            const mensaje = mensajeErrorFactura(error);
            setErrorAnulacion(mensaje);
            notify.error(mensaje);
            await refrescarFactura(factura.id);
        } finally {
            setProcesando(false);
        }
    };

    // ─── VER FACTURA ────────────────────────────────────────────
    const verFactura = (fila: { id: string }) => {
        // Siempre se muestra lo guardado en el servidor, nunca lo que se haya tecleado en el diálogo de la tabla.
        const factura = facturas.find((f) => f.id === fila.id);
        if (!factura) return;
        setErrorAccion(null);
        abrirDetalle(factura);
        void refrescarFactura(factura.id);
    };

    const abrirTicket = (factura: Factura) => {
        setTicketData({ factura, duplicado: factura.impreso });
        setOpenTicketModal(true);
    };

    // ─── IMPRIMIR FACTURA ───────────────────────────────────────
    const imprimirFactura = () => {
        if (!facturaActual) return;
        const contenido = document.getElementById('factura-print-content');
        if (!contenido) return;

        const w = window.open('', '_blank', 'width=800,height=600');
        if (!w) { notify.warning('Permita ventanas emergentes'); return; }

        w.document.write(`
            <html><head><title>Factura ${facturaActual.id}</title>
            <style>
                * { box-sizing:border-box; margin:0; padding:0; }
                body { font-family:'Inter',sans-serif; background:white; padding:20px; }
                .factura-container { max-width:700px; margin:0 auto; }
                .factura-header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #1a3c44; padding-bottom:12px; margin-bottom:16px; }
                .factura-header .empresa-info { flex:1; }
                .factura-header .empresa-info h2 { font-size:24px; font-weight:800; color:#1a3c44; margin-bottom:4px; }
                .factura-header .empresa-info p { font-size:13px; color:#64748b; margin:2px 0; }
                .factura-header .factura-numero { text-align:right; }
                .factura-header .factura-numero .num { font-size:20px; font-weight:700; color:#1a3c44; }
                .factura-header .factura-numero .fecha { font-size:13px; color:#64748b; }
                .factura-cliente { background:#f8fafc; padding:12px 16px; border-radius:8px; margin-bottom:16px; display:flex; flex-wrap:wrap; justify-content:space-between; font-size:14px; }
                .factura-cliente .cliente-label { font-weight:600; color:#1e293b; }
                .factura-cliente .cliente-dato { color:#334155; }
                .factura-tabla table { width:100%; border-collapse:collapse; font-size:13px; }
                .factura-tabla th { background:#f1f5f9; color:#1e293b; font-weight:600; padding:10px 12px; border-bottom:2px solid #e2e8f0; text-align:left; }
                .factura-tabla td { padding:8px 12px; border-bottom:1px solid #f1f5f9; color:#334155; }
                .factura-totales { margin-top:16px; text-align:right; font-size:14px; }
                .factura-totales .linea { display:flex; justify-content:flex-end; gap:40px; padding:4px 0; }
                .factura-totales .linea.total { font-size:18px; font-weight:700; color:#1a3c44; border-top:2px solid #1a3c44; padding-top:8px; margin-top:8px; }
                .factura-footer { margin-top:20px; border-top:1px solid #e2e8f0; padding-top:12px; text-align:center; font-size:12px; color:#94a3b8; }
                @media print { body { padding:0; } .factura-container { border:none; box-shadow:none; } }
            </style>
            </head><body>
                ${contenido.innerHTML}
            <script>
                window.onload = function() { setTimeout(function() { window.print(); setTimeout(function(){ window.close(); }, 1500); }, 500); }
            </script>
            </body></html>
        `);
        w.document.close();

        // Deja constancia en el servidor de que ya se imprimió (admitido en todos los estados salvo anulada).
        const impresa = facturaActual;
        if (puedeEditar && !impresa.impreso && impresa.estado !== 'anulada') {
            FacturaApi.actualizar(impresa.id, { impreso: true })
                .then(() => refrescarFactura(impresa.id))
                .catch(() => undefined); // marca informativa: si falla, la impresión ya salió y no se interrumpe
        }
    };

    // ─── IMPRIMIR TICKET ────────────────────────────────────────
    const imprimirTicket = () => {
        const contenido = document.getElementById('ticket-print-content');
        if (!contenido) return;

        const w = window.open('', '_blank', 'width=300,height=400');
        if (!w) { notify.warning('Permita ventanas emergentes'); return; }

        w.document.write(`
            <html><head><title>Ticket</title>
            <style>
                body { margin:0; padding:0; font-family: 'Courier New', monospace; font-size:12px; }
                .ticket { width:80mm; padding:8px; margin:0 auto; }
                .center { text-align:center; }
                .title { font-size:16px; font-weight:700; }
                .sub { font-size:12px; color:#555; }
                .divider { border-top:1px dashed #333; margin:4px 0; }
                table { width:100%; border-collapse:collapse; }
                table th { background:none; padding:2px 0; border-bottom:1px solid #333; font-size:11px; }
                table td { padding:2px 0; border-bottom:1px solid #eee; }
                .total-line { font-weight:700; font-size:14px; }
                .footer { font-size:10px; color:#888; margin-top:4px; }
                .duplicado-label { color:red; font-weight:bold; font-size:16px; border:2px solid red; padding:4px 8px; display:inline-block; }
            </style>
            </head><body>
                ${contenido.innerHTML}
            <script>
                window.onload = function() { setTimeout(function() { window.print(); setTimeout(function(){ window.close(); }, 1500); }, 500); }
            </script>
            </body></html>
        `);
        w.document.close();
    };

    // ─── COLUMNAS PARA CUSTOMDATAGRIDR ──────────────────────────
    const filasFactura = useMemo<FilaFactura[]>(
        () => facturas.map((f) => ({ ...f, estado: ETIQUETA_ESTADO[f.estado] ?? f.estado, nit: f.nit || '—' })),
        [facturas]
    );

    const facturaColumns: Column<FilaFactura>[] = [
        { field: 'id', headerName: 'N° Factura' },
        { field: 'fecha', headerName: 'Fecha' },
        { field: 'cliente', headerName: 'Cliente' },
        { field: 'nit', headerName: 'NIT/CI' },
        { field: 'metodoPago', headerName: 'Método Pago' },
        { field: 'total', headerName: 'Total', numeric: true },
        { field: 'estado', headerName: 'Estado', isStatusColumn: true },
    ];

    // ─── RENDER ─────────────────────────────────────────────────
    return (
        <Box>
            <Card
                ref={formularioRef}
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: `1px solid ${COLORS.border}`,
                    bgcolor: COLORS.card,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
                    overflow: "hidden",
                    m: 1
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                        <Typography variant="h6" sx={sectionTitleSx}>
                            <ReceiptLongIcon sx={{ width: 24, height: 24, color: COLORS.accent }} />
                            {facturaEnEdicionId ? `Editando factura ${facturaEnEdicionId}` : 'Nueva Factura'}
                        </Typography>
                        <Chip
                            label={`${items.length} items`}
                            size="small"
                            sx={{
                                bgcolor: COLORS.accentSoft,
                                color: COLORS.accent,
                                fontWeight: 600,
                                borderRadius: 2,
                                border: '1px solid rgba(0,229,160,0.25)',
                            }}
                        />
                    </Box>

                    <Divider sx={{ mb: 3, borderColor: COLORS.border }} />

                    {/* Layout principal: cuatro columnas de datos de la factura */}
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
                        gap: 0,
                        mb: 3,
                    }}>

                        {/* ── Columna 1: Datos del Cliente ── */}
                        <Box sx={{
                            minWidth: 0,
                            pr: { xs: 0, md: 2 },
                            pb: { xs: 2, md: 0 },
                            borderRight: { xs: 'none', md: `1px solid ${COLORS.border}` },
                        }}>
                            <Typography variant="subtitle2" sx={subtitleSx}>
                                Datos del Cliente
                            </Typography>

                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="Cliente"
                                        placeholder={CLIENTE_POR_DEFECTO}
                                        value={cliente}
                                        onChange={(e) => setCliente(e.target.value)}
                                        sx={fieldSx}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="CI"
                                        placeholder="CI"
                                        value={nit}
                                        onChange={(e) => setNit(e.target.value)}
                                        sx={fieldSx}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="Dirección"
                                        placeholder="Dirección"
                                        value={direccion}
                                        onChange={(e) => setDireccion(e.target.value)}
                                        sx={fieldSx}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="Teléfono"
                                        placeholder="Teléfono"
                                        value={telefono}
                                        onChange={(e) => setTelefono(e.target.value)}
                                        sx={fieldSx}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="Email"
                                        type="email"
                                        placeholder="Email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        sx={fieldSx}
                                    />
                                </Grid>
                            </Grid>
                        </Box>

                        {/* ── Columna 2: Datos de la Empresa ── */}
                        <Box sx={{
                            minWidth: 0,
                            px: { xs: 0, md: 2 },
                            pb: { xs: 2, md: 0 },
                            borderRight: { xs: 'none', md: `1px solid ${COLORS.border}` },
                        }}>
                            <Typography variant="subtitle2" sx={subtitleSx}>
                                Datos de la Empresa
                            </Typography>
                            <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block', mb: 1.5 }}>
                                Los asigna el servidor desde la configuración de la empresa.
                            </Typography>

                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small" disabled
                                        label="Nombre"
                                        placeholder="Nombre"
                                        value={empresaNombre}
                                        onChange={(e) => setEmpresaNombre(e.target.value)}
                                        sx={fieldSx}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small" disabled
                                        label="Dirección"
                                        placeholder="Dirección"
                                        value={empresaDireccion}
                                        onChange={(e) => setEmpresaDireccion(e.target.value)}
                                        sx={fieldSx}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small" disabled
                                        label="Teléfono"
                                        placeholder="Teléfono"
                                        value={empresaTelefono}
                                        onChange={(e) => setEmpresaTelefono(e.target.value)}
                                        sx={fieldSx}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small" disabled
                                        label="Email"
                                        type="email"
                                        placeholder="Email"
                                        value={empresaEmail}
                                        onChange={(e) => setEmpresaEmail(e.target.value)}
                                        sx={fieldSx}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small" disabled
                                        label="RUC/NIT"
                                        placeholder="RUC/NIT"
                                        value={empresaRucNit}
                                        onChange={(e) => setEmpresaRucNit(e.target.value)}
                                        sx={fieldSx}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small" disabled
                                        label="Ciudad"
                                        placeholder="Ciudad"
                                        value={empresaCiudad}
                                        onChange={(e) => setEmpresaCiudad(e.target.value)}
                                        sx={fieldSx}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small" disabled
                                        label="País"
                                        placeholder="País"
                                        value={empresaPais}
                                        onChange={(e) => setEmpresaPais(e.target.value)}
                                        sx={fieldSx}
                                    />
                                </Grid>
                            </Grid>
                        </Box>

                        {/* ── Columna 3: Datos del Almacén ── */}
                        <Box sx={{
                            minWidth: 0,
                            px: { xs: 0, md: 2 },
                            pb: { xs: 2, md: 0 },
                            borderRight: { xs: 'none', md: `1px solid ${COLORS.border}` },
                        }}>
                            <Typography variant="subtitle2" sx={subtitleSx}>
                                Datos del Almacén
                            </Typography>

                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12 }}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel sx={labelSx}>Almacén</InputLabel>
                                        <Select
                                            value={almacenId}
                                            label="Almacén"
                                            onChange={(e: SelectChangeEvent) => setAlmacenId(e.target.value)}
                                            sx={selectSx}
                                        >
                                            <MenuItem value="">
                                                <em>Seleccione un almacén</em>
                                            </MenuItem>
                                            {almacenes.map((a) => (
                                                <MenuItem key={a._id ?? a.codigoAlmacen} value={a._id ?? ''}>
                                                    {a.nombreAlmacen}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        disabled
                                        label="Código del Almacén"
                                        placeholder="Código del almacén"
                                        value={almacenElegido?.codigoAlmacen ?? ''}
                                        sx={fieldSx}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        disabled
                                        label="Nombre del Almacén"
                                        placeholder="Nombre del almacén"
                                        value={almacenElegido?.nombreAlmacen ?? ''}
                                        sx={fieldSx}
                                    />
                                </Grid>
                            </Grid>
                        </Box>

                        {/* ── Columna 4: Datos del Producto ── */}
                        <Box sx={{
                            minWidth: 0,
                            pl: { xs: 0, md: 2 },
                        }}>
                            <Typography variant="subtitle2" sx={subtitleSx}>
                                Datos del Producto
                            </Typography>

                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12 }}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel sx={labelSx}>Producto</InputLabel>
                                        <Select
                                            value={productoSeleccionado}
                                            label="Producto"
                                            onChange={(e: SelectChangeEvent) => {
                                                const prod = productos.find(p => p._id === e.target.value);
                                                setProductoSeleccionado(e.target.value);
                                                if (prod) setPrecioVenta(prod.precio_venta.toString());
                                            }}
                                            sx={selectSx}
                                        >
                                            <MenuItem value="">
                                                <em>Seleccione un producto</em>
                                            </MenuItem>

                                            {productos.map(prod => (
                                                <MenuItem key={prod._id} value={prod._id}>
                                                    {prod.nombre_producto} (Stock: {prod.stock_inicial})
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="Precio de Venta"
                                        type="number"
                                        placeholder="0.00"
                                        value={precioVenta}
                                        onChange={(e) => setPrecioVenta(e.target.value)}
                                        slotProps={{
                                            htmlInput: { step: '0.01', readOnly: !puedeCambiarPrecio },
                                            input: {
                                                endAdornment: productoSeleccionado ? (
                                                    <Typography variant="caption" sx={{ color: COLORS.textMuted, mr: 1 }}>
                                                        Ref: {productos.find(p => p._id === productoSeleccionado)?.precio_venta.toFixed(2)}
                                                    </Typography>
                                                ) : null
                                            }
                                        }}
                                        sx={fieldSx}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="Cantidad"
                                        type="number"
                                        placeholder="0"
                                        value={cantidad}
                                        onChange={(e) => setCantidad(e.target.value)}
                                        sx={fieldSx}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="Descuento %"
                                        type="number"
                                        placeholder="0"
                                        value={descuentoPct}
                                        onChange={(e) => setDescuentoPct(e.target.value)}
                                        disabled={!puedeCambiarPrecio}
                                        helperText={puedeCambiarPrecio ? undefined : 'Solo Administrador o Gerente'}
                                        slotProps={{ htmlInput: { step: '0.1' } }}
                                        sx={fieldSx}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="Recargo"
                                        type="number"
                                        placeholder="0.00"
                                        value={recargo}
                                        onChange={(e) => setRecargo(e.target.value)}
                                        slotProps={{ htmlInput: { step: '0.01' } }}
                                        sx={fieldSx}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <Box sx={{ display: 'grid', gap: 1 }}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel sx={labelSx}>Método de Pago</InputLabel>
                                            <Select
                                                value={metodoPago}
                                                label="Método de Pago"
                                                onChange={(e: SelectChangeEvent) => setMetodoPago(e.target.value as MetodoPagoFactura)}
                                                sx={selectSx}
                                            >
                                                <MenuItem value="efectivo">Efectivo</MenuItem>
                                                <MenuItem value="transferencia">Transferencia</MenuItem>
                                                <MenuItem value="credito">Crédito</MenuItem>
                                            </Select>
                                        </FormControl>

                                        <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={<AddIcon />}
                                            onClick={agregarItem}
                                            sx={{
                                                minWidth: 160,
                                                background: "linear-gradient(135deg, rgb(36, 236, 9), rgba(202, 183, 14, 0.9))",
                                                color: "#fff",
                                                textTransform: "none",
                                                fontWeight: 600,
                                                borderRadius: 2,
                                                px: 2,
                                                boxShadow: "0 4px 12px rgba(36, 236, 9, 0.3)",
                                                "&:hover": {
                                                    background: "linear-gradient(135deg, rgb(30, 200, 8), rgba(180, 160, 12, 0.9))",
                                                    boxShadow: "0 6px 16px rgba(36, 236, 9, 0.4)"
                                                }
                                            }}
                                        >
                                            Agregar Producto
                                        </Button>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>
                    </Box>

                    {/* ── Responsables de la factura ── */}
                    <Box sx={{
                        borderTop: `1px solid ${COLORS.border}`,
                        pt: 2,
                        mb: 3,
                    }}>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="subtitle2" sx={subtitleSx}>
                                    Facturado Por
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth size="small" disabled
                                            label="Nombre"
                                            value={facturadoPorNombre}
                                            onChange={(e) => setFacturadoPorNombre(e.target.value)}
                                            sx={fieldSx}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth size="small" disabled
                                            label="CI"
                                            value={facturadoPorCI}
                                            onChange={(e) => setFacturadoPorCI(e.target.value)}
                                            sx={fieldSx}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth size="small" disabled
                                            label="Fecha"
                                            type="date"
                                            value={facturadoPorFecha}
                                            onChange={(e) => setFacturadoPorFecha(e.target.value)}
                                            slotProps={{ inputLabel: { shrink: true } }}
                                            sx={fieldSx}
                                        />
                                    </Grid>
                                </Grid>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="subtitle2" sx={subtitleSx}>
                                    Despachado Por
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth size="small"
                                            label="Nombre"
                                            value={despachadoPorNombre}
                                            onChange={(e) => setDespachadoPorNombre(e.target.value)}
                                            sx={fieldSx}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth size="small"
                                            label="CI"
                                            value={despachadoPorCI}
                                            onChange={(e) => setDespachadoPorCI(e.target.value)}
                                            sx={fieldSx}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth size="small"
                                            label="Fecha"
                                            type="date"
                                            value={despachadoPorFecha}
                                            onChange={(e) => setDespachadoPorFecha(e.target.value)}
                                            slotProps={{ inputLabel: { shrink: true } }}
                                            sx={fieldSx}
                                        />
                                    </Grid>
                                </Grid>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="subtitle2" sx={subtitleSx}>
                                    Transportado Por
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth size="small"
                                            label="Nombre"
                                            value={transportadoPorNombre}
                                            onChange={(e) => setTransportadoPorNombre(e.target.value)}
                                            sx={fieldSx}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth size="small"
                                            label="CI"
                                            value={transportadoPorCI}
                                            onChange={(e) => setTransportadoPorCI(e.target.value)}
                                            sx={fieldSx}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth size="small"
                                            label="Fecha"
                                            type="date"
                                            value={transportadoPorFecha}
                                            onChange={(e) => setTransportadoPorFecha(e.target.value)}
                                            slotProps={{ inputLabel: { shrink: true } }}
                                            sx={fieldSx}
                                        />
                                    </Grid>
                                </Grid>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="subtitle2" sx={subtitleSx}>
                                    Recibido Por
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth size="small"
                                            label="Nombre"
                                            value={recibidoPorNombre}
                                            onChange={(e) => setRecibidoPorNombre(e.target.value)}
                                            sx={fieldSx}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth size="small"
                                            label="CI"
                                            value={recibidoPorCI}
                                            onChange={(e) => setRecibidoPorCI(e.target.value)}
                                            sx={fieldSx}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth size="small"
                                            label="Fecha"
                                            type="date"
                                            value={recibidoPorFecha}
                                            onChange={(e) => setRecibidoPorFecha(e.target.value)}
                                            slotProps={{ inputLabel: { shrink: true } }}
                                            sx={fieldSx}
                                        />
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Tabla de Items */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" sx={subtitleSx}>
                            Detalle de la Factura
                        </Typography>

                        {items.length === 0 ? (
                            <Box sx={{
                                textAlign: 'center',
                                py: 4,
                                bgcolor: COLORS.cardAlt,
                                borderRadius: 2,
                                border: `1px dashed ${COLORS.border}`
                            }}>
                                <ShoppingCartIcon sx={{ fontSize: 40, color: COLORS.textMuted, mb: 1 }} />
                                <Typography sx={{ color: COLORS.textMuted, fontWeight: 500 }}>
                                    No hay productos agregados
                                </Typography>
                            </Box>
                        ) : (
                            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 'none', bgcolor: COLORS.cardAlt, border: `1px solid ${COLORS.border}` }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.03)' }}>
                                            <TableCell sx={{ fontWeight: 600, color: COLORS.textMuted, fontSize: '0.75rem', borderBottomColor: COLORS.border }}>Producto</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 600, color: COLORS.textMuted, fontSize: '0.75rem', borderBottomColor: COLORS.border }}>Cant</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600, color: COLORS.textMuted, fontSize: '0.75rem', borderBottomColor: COLORS.border }}>Precio</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 600, color: COLORS.textMuted, fontSize: '0.75rem', borderBottomColor: COLORS.border }}>Dto%</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600, color: COLORS.textMuted, fontSize: '0.75rem', borderBottomColor: COLORS.border }}>Dto$</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600, color: COLORS.textMuted, fontSize: '0.75rem', borderBottomColor: COLORS.border }}>Recargo</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600, color: COLORS.textMuted, fontSize: '0.75rem', borderBottomColor: COLORS.border }}>Total</TableCell>
                                            <TableCell align="center" sx={{ width: 50, borderBottomColor: COLORS.border }}></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {items.map((item) => (
                                            <TableRow
                                                key={item.id}
                                                sx={{
                                                    '&:hover': { bgcolor: 'rgba(0,229,160,0.04)' },
                                                    transition: 'all 0.2s',
                                                    '& .MuiTableCell-root': { color: COLORS.textLight, borderBottomColor: COLORS.border },
                                                }}
                                            >
                                                <TableCell sx={{ fontWeight: 600 }}>
                                                    {item.productoNombre}
                                                </TableCell>
                                                <TableCell align="center">{item.cantidad}</TableCell>
                                                <TableCell align="right">{item.precio.toFixed(2)}</TableCell>
                                                <TableCell align="center">{item.descuentoPct}%</TableCell>
                                                <TableCell align="right">{item.descuentoMonto.toFixed(2)}</TableCell>
                                                <TableCell align="right">{item.recargo.toFixed(2)}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                    {item.total.toFixed(2)}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => eliminarItem(item.id)}
                                                        sx={{
                                                            bgcolor: 'rgb(220, 20, 60)',
                                                            color: 'white',
                                                            width: 28,
                                                            height: 28,
                                                            '&:hover': { bgcolor: 'rgb(200, 10, 40)', transform: 'scale(1.05)' }
                                                        }}
                                                    >
                                                        <DeleteIcon sx={{ fontSize: 14 }} />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}

                        {/* Totales */}
                        <Box sx={{ mt: 2, p: 2, bgcolor: COLORS.cardAlt, borderRadius: 2, border: `1px solid ${COLORS.border}` }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                                <Typography variant="body2" sx={{ color: COLORS.textMuted }}>Subtotal</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: COLORS.textLight }}>{subtotal.toFixed(2)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                                <Typography variant="body2" sx={{ color: COLORS.textMuted }}>Descuentos</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: COLORS.danger }}>-{descuentoTotal.toFixed(2)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                                <Typography variant="body2" sx={{ color: COLORS.textMuted }}>Recargos</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: COLORS.accent }}>+{recargoTotal.toFixed(2)}</Typography>
                            </Box>
                            <Divider sx={{ my: 1, borderColor: COLORS.border }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: COLORS.textLight }}>
                                    TOTAL
                                </Typography>
                                <Typography
                                    variant="h5"
                                    sx={{ fontWeight: 800, color: COLORS.accent }}
                                >
                                    {totalFactura.toFixed(2)}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Botones de Acción */}
                    {!puedeEditar && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Su rol no puede crear ni modificar facturas; solo consultarlas.
                        </Alert>
                    )}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        {puedeEditar && (<>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<SaveIcon />}
                            disabled={procesando}
                            onClick={() => void procesarFormulario('confirmar')}
                            sx={{
                                flex: 1,
                                minWidth: 140,
                                background: "linear-gradient(135deg, rgb(21, 0, 214), rgb(0, 255, 13))",
                                color: "#fff",
                                textTransform: "none",
                                fontWeight: 600,
                                borderRadius: 2,
                                boxShadow: "0 4px 12px rgba(10, 83, 218, 0.3)",
                                "&:hover": {
                                    boxShadow: "0 6px 16px rgba(10, 83, 218, 0.4)"
                                }
                            }}
                        >
                            Confirmar
                        </Button>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<SaveIcon />}
                            disabled={procesando}
                            onClick={() => void procesarFormulario('borrador')}
                            color="info"
                            sx={{
                                flex: 1,
                                minWidth: 140,
                                textTransform: "none",
                                fontWeight: 600,
                                borderRadius: 2,
                                boxShadow: "none",
                            }}
                        >
                            Guardar borrador
                        </Button>
                        {puedeAnular && facturaEnEdicionId && (
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<BlockIcon />}
                            disabled={procesando}
                            onClick={() => {
                                const guardada = facturas.find((f) => f.id === facturaEnEdicionId);
                                if (guardada) abrirAnulacion(guardada, 'anular');
                            }}
                            sx={{
                                flex: 1,
                                minWidth: 140,
                                background: "linear-gradient(135deg, rgb(255, 0, 0), rgba(255, 2, 57, 0.9))",
                                color: "#fff",
                                textTransform: "none",
                                fontWeight: 600,
                                borderRadius: 2,
                                boxShadow: "0 4px 12px rgba(10, 83, 218, 0.3)",
                                "&:hover": {
                                    boxShadow: "0 6px 16px rgba(10, 83, 218, 0.4)"
                                }
                            }}
                        >
                            Anular
                        </Button>
                        )}
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<ReceiptLongIcon />}
                            disabled={procesando}
                            onClick={() => void procesarFormulario('terminar')}
                            sx={{
                                flex: 1,
                                minWidth: 140,
                                background: "linear-gradient(135deg, rgb(255, 238, 0), rgba(226, 64, 14, 0.9))",
                                color: "#fff",
                                textTransform: "none",
                                fontWeight: 600,
                                borderRadius: 2,
                                boxShadow: "0 4px 12px rgba(226, 64, 14, 0.3)",
                                "&:hover": {
                                    boxShadow: "0 6px 16px rgba(226, 64, 14, 0.4)"
                                }
                            }}
                        >
                            Terminada
                        </Button>
                        </>)}
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<CancelIcon />}
                            disabled={procesando}
                            onClick={limpiarFormulario}
                            sx={{
                                textTransform: "none",
                                fontWeight: 600,
                                borderRadius: 2,
                                borderColor: 'rgba(220, 20, 60, 0.3)',
                                color: 'rgb(220, 20, 60)',
                                '&:hover': {
                                    borderColor: 'rgb(220, 20, 60)',
                                    bgcolor: 'rgba(220, 20, 60, 0.04)'
                                }
                            }}
                        >
                            Limpiar
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════
                    PANEL DERECHO: HISTORIAL DE FACTURAS
            ═══════════════════════════════════════════════════ */}
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: `1px solid ${COLORS.border}`,
                    bgcolor: COLORS.card,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
                    overflow: "hidden",
                    m: 1,
                    p: 2
                }}
            >
                <CardContent sx={{ p: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" sx={sectionTitleSx}>
                            <PictureAsPdfIcon sx={{ width: 24, height: 24, color: COLORS.accent }} />
                            Historial de Facturas
                        </Typography>
                        <Chip
                            label={`${facturas.filter(f => f.estado !== 'anulada' && f.estado !== 'cancelada').length} activas`}
                            size="small"
                            sx={{
                                bgcolor: COLORS.accentSoft,
                                color: COLORS.accent,
                                fontWeight: 600,
                                borderRadius: 2,
                                border: '1px solid rgba(0,229,160,0.25)',
                            }}
                        />
                    </Box>

                    <Divider sx={{ mb: 2, borderColor: COLORS.border }} />

                    {errorFacturas && (
                        <Alert
                            severity="error"
                            sx={{ mb: 2 }}
                            action={
                                <Button color="inherit" size="small" onClick={() => void cargarPagina(1)}>
                                    Reintentar
                                </Button>
                            }
                        >
                            No se pudieron cargar las facturas: {errorFacturas}
                        </Alert>
                    )}

                    {/* Anular o cancelar no se hace desde la tabla (su "Eliminar" no envía motivo): se hace desde el detalle. */}
                    <CustomDataGridR<FilaFactura>
                        rows={filasFactura}
                        columns={facturaColumns}
                        getRowId={(row) => row.id}
                        title="Facturas Emitidas"
                        onOpenRow={(row) => verFactura(row)}
                        openRowLabel="Ver detalle"
                        getRowAvatar={(row) => row.cliente.charAt(0).toUpperCase()}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 1 }}>
                        <Button
                            size="small"
                            disabled={cargandoFacturas}
                            onClick={() => void cargarPagina(1)}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                            {cargandoFacturas ? 'Cargando...' : 'Actualizar'}
                        </Button>
                        {hayMasFacturas && (
                            <Button
                                size="small"
                                disabled={cargandoFacturas}
                                onClick={() => void cargarPagina(paginaCargada + 1)}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                Cargar más facturas
                            </Button>
                        )}
                    </Box>
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════
                MODAL DE VISTA DE FACTURA
                ═══════════════════════════════════════════════════════ */}
            <Dialog
                open={openFacturaModal}
                onClose={() => setOpenFacturaModal(false)}
                maxWidth="md"
                fullWidth
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: 3,
                            bgcolor: COLORS.card,
                            border: `1px solid ${COLORS.border}`,
                            boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                            overflow: 'hidden'
                        }
                    }
                }}
            >
                <DialogTitle sx={{
                    background: 'linear-gradient(135deg, #131817 0%, #043625 100%)',
                    borderBottom: `1px solid ${COLORS.border}`,
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 2
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="h6" component="span" sx={{ fontWeight: 700, color: COLORS.accent }}>
                            🧾 Factura {facturaActual?.id}
                        </Typography>
                        {facturaActual && (
                            <Chip
                                size="small"
                                label={ETIQUETA_ESTADO[facturaActual.estado] ?? facturaActual.estado}
                                color={COLOR_ESTADO[facturaActual.estado] ?? 'default'}
                            />
                        )}
                    </Box>
                    <IconButton onClick={() => setOpenFacturaModal(false)} sx={{ color: COLORS.textMuted, '&:hover': { color: 'white' } }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {errorAccion && (
                        <Alert severity="error" onClose={() => setErrorAccion(null)} sx={{ borderRadius: 0 }}>
                            {errorAccion}
                        </Alert>
                    )}
                    <Box id="factura-print-content" sx={{ p: 4, bgcolor: 'common.white', color: 'common.black', '& .MuiTableCell-root': { color: 'inherit', borderColor: 'grey.300' } }}>
                        {facturaActual && (
                            <Box className="factura-container">
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1a3c44', pb: 2, mb: 3 }}>
                                    <Box>
                                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1a3c44', mb: 0.5 }}>
                                            {facturaActual.emisor?.nombre || 'MI NEGOCIO'}
                                        </Typography>
                                        {facturaActual.emisor?.nit && (
                                            <Typography variant="body2" sx={{ color: 'grey.700' }}>NIT: {facturaActual.emisor.nit}</Typography>
                                        )}
                                        <Typography variant="body2" sx={{ color: 'grey.700' }}>
                                            {facturaActual.emisor?.direccion || 'Sistema de Gestión ERP'}
                                        </Typography>
                                        {facturaActual.emisor?.telefono && (
                                            <Typography variant="body2" sx={{ color: 'grey.700' }}>Tel.: {facturaActual.emisor.telefono}</Typography>
                                        )}
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a3c44' }}>
                                            FACTURA N° {String(facturaActual.numero).padStart(6, '0')}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'grey.700' }}>Fecha: {facturaActual.fecha}</Typography>
                                        <Typography variant="body2" sx={{ color: 'grey.700' }}>Método: {facturaActual.metodoPago.toUpperCase()}</Typography>
                                        <Typography variant="body2" sx={{ color: 'grey.700' }}>Estado: {ETIQUETA_ESTADO[facturaActual.estado] ?? facturaActual.estado}</Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 2, mb: 3 }}>
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="body2"><strong>Cliente:</strong> {facturaActual.cliente}</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="body2"><strong>NIT/CI:</strong> {facturaActual.nit || '—'}</Typography>
                                        </Grid>
                                        {facturaActual.direccion && (
                                            <Grid size={{ xs: 6 }}>
                                                <Typography variant="body2"><strong>Dirección:</strong> {facturaActual.direccion}</Typography>
                                            </Grid>
                                        )}
                                        {facturaActual.telefono && (
                                            <Grid size={{ xs: 6 }}>
                                                <Typography variant="body2"><strong>Teléfono:</strong> {facturaActual.telefono}</Typography>
                                            </Grid>
                                        )}
                                        {facturaActual.email && (
                                            <Grid size={{ xs: 6 }}>
                                                <Typography variant="body2"><strong>Email:</strong> {facturaActual.email}</Typography>
                                            </Grid>
                                        )}
                                        {facturaActual.facturadoPor?.nombre && (
                                            <Grid size={{ xs: 6 }}>
                                                <Typography variant="body2"><strong>Facturado por:</strong> {facturaActual.facturadoPor.nombre}</Typography>
                                            </Grid>
                                        )}
                                        {facturaActual.almacenCodigo && (
                                            <Grid size={{ xs: 6 }}>
                                                <Typography variant="body2"><strong>Almacén:</strong> {facturaActual.almacenCodigo}</Typography>
                                            </Grid>
                                        )}
                                    </Grid>
                                </Box>

                                {(facturaActual.estado === 'cancelada' || facturaActual.estado === 'anulada') && (
                                    <Alert severity="error" icon={false} sx={{ mb: 3 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                            FACTURA {facturaActual.estado === 'cancelada' ? 'CANCELADA' : 'ANULADA'}
                                        </Typography>
                                        <Typography variant="body2">
                                            <strong>Motivo:</strong> {facturaActual.motivoAnulacion || 'No registrado'}
                                        </Typography>
                                        <Typography variant="body2">
                                            <strong>Autorizado por:</strong> {facturaActual.anuladaPor?.nombre || 'No registrado'}
                                        </Typography>
                                        {facturaActual.fechaAnulacion && (
                                            <Typography variant="body2">
                                                <strong>Fecha:</strong> {formatearFechaHora(facturaActual.fechaAnulacion)}
                                            </Typography>
                                        )}
                                    </Alert>
                                )}

                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                                                <TableCell sx={{ fontWeight: 600 }}>Cant.</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Descripción</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600 }}>Precio Unit.</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600 }}>Descuento</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600 }}>Recargo</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600 }}>Total</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {facturaActual.items.map((item, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell>{item.cantidad}</TableCell>
                                                    <TableCell>{item.productoNombre}</TableCell>
                                                    <TableCell align="right">{item.precio.toFixed(2)}</TableCell>
                                                    <TableCell align="right">{descuentoLinea(item).toFixed(2)}</TableCell>
                                                    <TableCell align="right">{item.recargo.toFixed(2)}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 600 }}>{item.total.toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                <Box sx={{ mt: 3, textAlign: 'right' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 4, py: 0.5 }}>
                                        <Typography>Subtotal</Typography>
                                        <Typography sx={{ minWidth: 100 }}>{facturaActual.subtotal.toFixed(2)}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 4, py: 0.5 }}>
                                        <Typography>Descuentos</Typography>
                                        <Typography sx={{ minWidth: 100 }}>{facturaActual.descuentoTotal.toFixed(2)}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 4, py: 0.5 }}>
                                        <Typography>Recargos</Typography>
                                        <Typography sx={{ minWidth: 100 }}>{facturaActual.recargoTotal.toFixed(2)}</Typography>
                                    </Box>
                                    {facturaActual.impuesto?.importe !== undefined && (
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 4, py: 0.5 }}>
                                            <Typography>
                                                {facturaActual.impuesto.tipo || 'Impuesto'}
                                                {facturaActual.impuesto.porciento !== undefined ? ` (${facturaActual.impuesto.porciento}%)` : ''}
                                            </Typography>
                                            <Typography sx={{ minWidth: 100 }}>{facturaActual.impuesto.importe.toFixed(2)}</Typography>
                                        </Box>
                                    )}
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 4, py: 1, mt: 1, borderTop: '2px solid #1a3c44' }}>
                                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a3c44' }}>TOTAL</Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a3c44', minWidth: 100 }}>
                                            {facturaActual.total.toFixed(2)}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                                    <Typography variant="caption" sx={{ color: 'grey.700' }}>
                                        ¡Gracias por su compra! • Este documento es una representación impresa de la factura electrónica.
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 2, borderTop: `1px solid ${COLORS.border}`, flexWrap: 'wrap' }}>
                    {facturaActual && puedeEditar && facturaActual.estado === 'edicion' && (
                        <>
                            <Button
                                startIcon={<EditIcon />}
                                disabled={procesando}
                                onClick={() => editarFactura(facturaActual)}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                Editar
                            </Button>
                            <Button
                                variant="outlined"
                                color="warning"
                                startIcon={<ReceiptLongIcon />}
                                disabled={procesando}
                                onClick={() => void transicionar(facturaActual, 'terminar')}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                Terminar
                            </Button>
                        </>
                    )}
                    {facturaActual && puedeEditar && facturaActual.estado === 'terminada' && (
                        <>
                            <Button
                                startIcon={<UndoIcon />}
                                disabled={procesando}
                                onClick={() => void transicionar(facturaActual, 'volverAEdicion')}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                Volver a edición
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircleIcon />}
                                disabled={procesando}
                                onClick={() => void transicionar(facturaActual, 'confirmar')}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                Confirmar
                            </Button>
                        </>
                    )}
                    {facturaActual && puedeAnular && (facturaActual.estado === 'edicion' || facturaActual.estado === 'terminada') && (
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<BlockIcon />}
                            disabled={procesando}
                            onClick={() => abrirAnulacion(facturaActual, 'anular')}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                            Anular
                        </Button>
                    )}
                    {facturaActual && puedeAnular && facturaActual.estado === 'confirmada' && (
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<CancelIcon />}
                            disabled={procesando}
                            onClick={() => abrirAnulacion(facturaActual, 'cancelar')}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                            Cancelar factura
                        </Button>
                    )}
                    <Button
                        onClick={() => setOpenFacturaModal(false)}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            color: COLORS.textMuted,
                            '&:hover': { color: COLORS.textLight, bgcolor: 'rgba(255,255,255,0.04)' }
                        }}
                    >
                        Cerrar
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<PrintIcon />}
                        onClick={imprimirFactura}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            bgcolor: COLORS.accent,
                            color: '#0a0f0d',
                            borderRadius: 2,
                            boxShadow: 'none',
                            '&:hover': { bgcolor: '#00c98c', boxShadow: 'none' },
                        }}
                    >
                        Imprimir
                    </Button>
                    <Button
                        startIcon={<ReceiptLongIcon />}
                        disabled={!facturaActual}
                        onClick={() => facturaActual && abrirTicket(facturaActual)}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        Ticket
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ═══════════════════════════════════════════════════════
                DIÁLOGO DE MOTIVO (cancelar / anular)
                ═══════════════════════════════════════════════════════ */}
            <Dialog
                open={anulacion !== null}
                onClose={() => { if (!procesando) setAnulacion(null); }}
                maxWidth="sm"
                fullWidth
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: 3,
                            bgcolor: COLORS.card,
                            border: `1px solid ${COLORS.border}`,
                            boxShadow: 24,
                        }
                    }
                }}
            >
                <DialogTitle sx={{ color: COLORS.textLight, fontWeight: 700 }}>
                    {anulacion?.tipo === 'cancelar' ? 'Cancelar' : 'Anular'} factura {anulacion?.factura.id}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: COLORS.textMuted, mb: 2 }}>
                        {anulacion?.tipo === 'cancelar'
                            ? 'La factura quedará cancelada y el servidor devolverá al inventario las cantidades facturadas.'
                            : 'La factura quedará anulada: se conserva el registro, pero ya no se podrá modificar ni confirmar.'}
                        {' '}Indique el motivo; quedará registrado junto con su nombre como autorizante.
                    </Typography>
                    {errorAnulacion && (
                        <Alert severity="error" sx={{ mb: 2 }}>{errorAnulacion}</Alert>
                    )}
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        minRows={3}
                        label="Motivo"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        disabled={procesando}
                        error={motivo.length > 0 && motivoInvalido}
                        helperText={
                            `${motivo.length}/${MOTIVO_ANULACION_MAX} · ` +
                            (motivo.length > 0 && motivoInvalido
                                ? `El motivo debe tener al menos ${MOTIVO_ANULACION_MIN} caracteres`
                                : `Obligatorio, de ${MOTIVO_ANULACION_MIN} a ${MOTIVO_ANULACION_MAX} caracteres`)
                        }
                        slotProps={{ htmlInput: { maxLength: MOTIVO_ANULACION_MAX } }}
                        sx={fieldSx}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1, borderTop: `1px solid ${COLORS.border}` }}>
                    <Button
                        disabled={procesando}
                        onClick={() => setAnulacion(null)}
                        sx={{ textTransform: 'none', fontWeight: 600, color: COLORS.textMuted }}
                    >
                        Volver
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        disabled={procesando || motivoInvalido}
                        onClick={() => void confirmarAnulacion()}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        {anulacion?.tipo === 'cancelar' ? 'Cancelar factura' : 'Anular factura'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ═══════════════════════════════════════════════════════
                MODAL DE TICKET
                ═══════════════════════════════════════════════════════ */}
            <Dialog
                open={openTicketModal}
                onClose={() => setOpenTicketModal(false)}
                maxWidth="xs"
                fullWidth
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: 2,
                            bgcolor: COLORS.card,
                            border: `1px solid ${COLORS.border}`,
                            boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                        }
                    }
                }}
            >
                <DialogContent sx={{ p: 0 }}>
                    <Box id="ticket-print-content" sx={{ p: 3, bgcolor: 'white', fontFamily: '"Courier New", monospace', fontSize: '12px' }}>
                        {ticketData && (
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography sx={{ fontSize: '16px', fontWeight: 700, mb: 0.5 }}>MI NEGOCIO</Typography>
                                <Typography sx={{ fontSize: '12px', color: '#555', mb: 0.5 }}>Sistema de Gestión ERP</Typography>
                                <Typography sx={{ fontSize: '12px', color: '#555', mb: 1 }}>Dirección comercial</Typography>

                                <Box sx={{ borderTop: '1px dashed #333', my: 1 }} />

                                <Typography sx={{ fontSize: '11px' }}>{new Date().toLocaleString()}</Typography>
                                <Typography sx={{ fontSize: '11px' }}>Cliente: {ticketData.factura.cliente}</Typography>
                                <Typography sx={{ fontSize: '11px' }}>Factura N°: {String(ticketData.factura.numero).padStart(6, '0')}</Typography>

                                {ticketData.duplicado && (
                                    <Box sx={{ border: '2px solid red', color: 'red', fontWeight: 'bold', fontSize: '16px', p: 0.5, my: 1, display: 'inline-block' }}>
                                        DUPLICADO
                                    </Box>
                                )}

                                <Box sx={{ borderTop: '1px dashed #333', my: 1 }} />

                                <Table size="small" sx={{ '& td, & th': { fontSize: '11px', p: '2px 0', borderBottom: '1px solid #eee' } }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 600, borderBottom: '1px solid #333' }}>Cant</TableCell>
                                            <TableCell sx={{ fontWeight: 600, borderBottom: '1px solid #333' }}>Producto</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600, borderBottom: '1px solid #333' }}>Precio</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600, borderBottom: '1px solid #333' }}>Total</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {ticketData.factura.items.map((item, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>{item.cantidad}</TableCell>
                                                <TableCell>{item.productoNombre}</TableCell>
                                                <TableCell align="right">{item.precio.toFixed(2)}</TableCell>
                                                <TableCell align="right">{(item.precio * item.cantidad).toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                <Box sx={{ borderTop: '1px dashed #333', my: 1 }} />

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                                    <span>Subtotal:</span>
                                    <span>{ticketData.factura.subtotal.toFixed(2)}</span>
                                </Box>
                                <Box sx={{ fontWeight: 700, fontSize: '14px', display: 'flex', justifyContent: 'space-between', py: 1, borderTop: '1px dashed #333', mt: 1 }}>
                                    <span>TOTAL:</span>
                                    <span>{ticketData.factura.total.toFixed(2)}</span>
                                </Box>

                                <Box sx={{ borderTop: '1px dashed #333', my: 1 }} />
                                <Typography sx={{ fontSize: '10px', color: '#888', mt: 1 }}>
                                    ¡Gracias por su compra!
                                </Typography>
                                <Typography sx={{ fontSize: '10px', color: '#888' }}>
                                    Documento generado por ERP
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 2, borderTop: `1px solid ${COLORS.border}` }}>
                    <Button
                        onClick={() => setOpenTicketModal(false)}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            color: COLORS.textMuted,
                            '&:hover': { color: COLORS.textLight, bgcolor: 'rgba(255,255,255,0.04)' }
                        }}
                    >
                        Cerrar
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<PrintIcon />}
                        onClick={imprimirTicket}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            bgcolor: COLORS.accent,
                            color: '#0a0f0d',
                            borderRadius: 2,
                            boxShadow: 'none',
                            '&:hover': { bgcolor: '#00c98c', boxShadow: 'none' },
                        }}
                    >
                        Imprimir Ticket
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}