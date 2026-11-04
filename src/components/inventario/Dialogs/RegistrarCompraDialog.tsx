import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    MenuItem,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';

import AppAlert from '../../notificaciones/AppAlert';
import { useNotify } from '../../notificaciones/useNotify';
import { getErrorMessage } from '../../../utils/errorMessage';
import SelectNomenclador from '../../nomencladores/SelectNomenclador';
import SelectConAgregar from '../SelectConAgregar';
import { useUbicaciones } from '../useUbicaciones';
import NuevoAlmacenDialog from './NuevoAlmacenDialog';
import NuevoContenedorDialog from './NuevoContenedorDialog';
import {
    botonCancelarSx,
    botonGuardarSx,
    inputSx,
    paperSx,
    tituloSx,
    tituloTextoSx,
} from '../dialogEstilos';
import {
    categoriasProductoApi,
    estadosProductoApi,
    type OpcionNomenclador,
} from '../../../service/nomencladoresApi';
import {
    movimientosApi,
    type CrearRegistroCompraDto,
    type ProductoBackend,
} from '../../../service/movimientosApi';
import { proveedorApi, type ProveedorBackend } from '../../../service/proveedorApi';
import {
    recepcionApi,
    type CrearRecepcionDto,
    type Recepcion,
    type TipoDocumentoOrigen,
} from '../../../service/recepcionApi';

interface ProductoForm {
    codigo_producto: string;
    nombre_producto: string;
    categoria_producto: string;
    estado: string;
    almacen: string;
    contenedor: string;
}

interface FormErrors {
    codigo_producto?: string;
    nombre_producto?: string;
    categoria_producto?: string;
    estado?: string;
    almacen?: string;
    contenedor?: string;
    cantidad?: string;
    precio_costo?: string;
}

const initialProduct: ProductoForm = {
    codigo_producto: '',
    nombre_producto: '',
    categoria_producto: '',
    estado: '',
    almacen: '',
    contenedor: '',
};

const refId = (ref: string | { _id: string } | null | undefined): string =>
    typeof ref === 'string' ? ref : (ref?._id ?? '');

export interface RegistrarCompraDialogProps {
    open: boolean;
    onClose: () => void;
    /** Se llama cuando cambió algo en el backend (producto creado y/o compra registrada). */
    onCambio: () => void | Promise<void>;
}

interface FormularioProps extends RegistrarCompraDialogProps {
    /** Selector entre los dos modos del dialog (informe de recepción / producto nuevo). */
    selectorModo?: ReactNode;
}

/**
 * Compra de un producto NUEVO: crea el producto con su stock y registra la
 * compra (flujo original de este dialog; se conserva tal cual).
 */
function CompraProductoNuevoDialog({ open, onClose, onCambio, selectorModo }: FormularioProps) {
    const notify = useNotify();
    const { almacenes, contenedores, cargando, crearAlmacen, crearContenedor } = useUbicaciones(open);

    const [categorias, setCategorias] = useState<OpcionNomenclador[]>([]);
    const [estados, setEstados] = useState<OpcionNomenclador[]>([]);
    const [cargandoNomencladores, setCargandoNomencladores] = useState(true);

    const [productoForm, setProductoForm] = useState<ProductoForm>(initialProduct);
    const [cantidad, setCantidad] = useState('');
    const [precioCosto, setPrecioCosto] = useState('');
    const [compraFecha, setCompraFecha] = useState<Dayjs>(dayjs());
    const [errors, setErrors] = useState<FormErrors>({});
    const [guardando, setGuardando] = useState(false);

    const [dialogAlmacen, setDialogAlmacen] = useState(false);
    const [dialogContenedor, setDialogContenedor] = useState(false);

    /**
     * Si el producto se creó (1ª petición) pero la compra no se pudo registrar
     * (2ª petición), se guarda aquí para reintentar solo la segunda: repetir la
     * primera daría error por código duplicado. Se conserva aunque se cierre el dialog.
     */
    const [compraPendiente, setCompraPendiente] = useState<{
        producto: ProductoBackend;
        compra: CrearRegistroCompraDto;
    } | null>(null);

    const cargarNomencladores = useCallback(async () => {
        try {
            const [c, e] = await Promise.all([categoriasProductoApi.listar(), estadosProductoApi.listar()]);
            setCategorias(c);
            setEstados(e);
        } catch (error) {
            notify.error(getErrorMessage(error, 'No se pudieron cargar las categorías y estados'));
        } finally {
            setCargandoNomencladores(false);
        }
    }, [notify]);

    useEffect(() => {
        if (!open) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos al abrir el dialog
        void cargarNomencladores();
    }, [open, cargarNomencladores]);

    const handleChange = (field: keyof ProductoForm, value: string) => {
        setProductoForm((prev) => ({
            ...prev,
            [field]: value,
            ...(field === 'almacen' ? { contenedor: '' } : {}),
        }));
        setErrors((prev) => ({ ...prev, [field]: undefined, ...(field === 'almacen' ? { contenedor: undefined } : {}) }));
    };

    const contenedoresDelAlmacen = useMemo(
        () => contenedores.filter((c) => refId(c.almacen) === productoForm.almacen),
        [contenedores, productoForm.almacen],
    );

    const reiniciarFormulario = () => {
        setCompraPendiente(null);
        setProductoForm(initialProduct);
        setCantidad('');
        setPrecioCosto('');
        setCompraFecha(dayjs());
        setErrors({});
    };

    const validar = (): boolean => {
        const e: FormErrors = {};
        const cantidadNumber = Number(cantidad);
        const costoNumber = Number(precioCosto);

        if (!productoForm.codigo_producto.trim()) e.codigo_producto = 'El código es obligatorio';
        if (!productoForm.nombre_producto.trim()) e.nombre_producto = 'El nombre es obligatorio';
        if (!productoForm.categoria_producto) e.categoria_producto = 'Seleccione una categoría';
        if (!productoForm.estado) e.estado = 'Seleccione un estado';
        if (!productoForm.almacen) e.almacen = 'Seleccione un almacén';
        if (!productoForm.contenedor) e.contenedor = 'Seleccione un contenedor';
        if (!cantidad || !Number.isInteger(cantidadNumber) || cantidadNumber < 1) {
            e.cantidad = 'Ingrese una cantidad entera de al menos 1';
        }
        if (!precioCosto || !Number.isFinite(costoNumber) || costoNumber < 0) {
            e.precio_costo = 'Ingrese un precio de costo válido';
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // Dos peticiones POST seguidas:
    //   1) /producto         → crea el producto (con su stock y existencia)
    //   2) /registro-compra  → guarda la compra y escribe el kardex (compra)
    const registrarCompra = async () => {
        let pendiente = compraPendiente;

        // En un reintento el producto ya existe: no se vuelve a validar ni crear.
        if (!pendiente && !validar()) return;

        setGuardando(true);
        try {
            if (!pendiente) {
                const creado = await movimientosApi.crearProducto({
                    codigo_producto: productoForm.codigo_producto.trim(),
                    nombre_producto: productoForm.nombre_producto.trim(),
                    categoria_producto: productoForm.categoria_producto,
                    precio_compra: Number(precioCosto),
                    precio_venta: 0,
                    stock_inicial: Number(cantidad),
                    stock_minimo: 0,
                    estado: productoForm.estado,
                    almacen: productoForm.almacen,
                    contenedor: productoForm.contenedor,
                });

                pendiente = {
                    producto: creado,
                    compra: {
                        producto: creado._id,
                        almacen: productoForm.almacen,
                        contenedor: productoForm.contenedor,
                        cantidad: Number(cantidad),
                        costo_unitario: Number(precioCosto),
                        fecha: compraFecha.format('YYYY-MM-DD'),
                    },
                };
                // Desde aquí el producto ya existe en la base de datos.
                setCompraPendiente(pendiente);
            }

            await movimientosApi.crearRegistroCompra(pendiente.compra);

            notify.success(`Compra de "${pendiente.producto.nombre_producto}" registrada correctamente.`);
            reiniciarFormulario();
            onClose();
            await onCambio();
        } catch (error) {
            console.error('Error registrando la compra:', error);
            notify.error(
                pendiente
                    ? `El producto "${pendiente.producto.nombre_producto}" se creó, pero no se pudo registrar la compra: ${getErrorMessage(error, 'error desconocido')}`
                    : getErrorMessage(error, 'No se pudo registrar el producto'),
            );
            // Si el producto ya se creó, la página debe verlo aunque falte la compra.
            if (pendiente) await onCambio();
        } finally {
            setGuardando(false);
        }
    };

    const handleCerrar = () => {
        if (guardando) return;
        onClose();
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={handleCerrar}
                maxWidth="sm"
                fullWidth
                slotProps={{ paper: { sx: paperSx } }}
            >
                <DialogTitle sx={tituloSx}>
                    <Typography variant="h6" component="span" sx={tituloTextoSx}>
                        <ShoppingCartIcon sx={{ color: '#00e5a0' }} />
                        Registrar compra de producto nuevo
                    </Typography>
                </DialogTitle>

                <DialogContent sx={{ pt: '20px !important' }}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Box
                            component="form"
                            noValidate
                            onSubmit={(ev) => {
                                ev.preventDefault();
                                void registrarCompra();
                            }}
                            sx={{ display: 'grid', gap: 2 }}
                        >
                            {selectorModo}
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr' }, gap: 2 }}>
                                <TextField
                                    size="small"
                                    label="Código del producto"
                                    value={productoForm.codigo_producto}
                                    onChange={(e) => handleChange('codigo_producto', e.target.value)}
                                    error={!!errors.codigo_producto}
                                    helperText={errors.codigo_producto}
                                    disabled={guardando || !!compraPendiente}
                                    sx={inputSx}
                                />
                                <TextField
                                    size="small"
                                    label="Nombre del producto"
                                    value={productoForm.nombre_producto}
                                    onChange={(e) => handleChange('nombre_producto', e.target.value)}
                                    error={!!errors.nombre_producto}
                                    helperText={errors.nombre_producto}
                                    disabled={guardando || !!compraPendiente}
                                    sx={inputSx}
                                />
                            </Box>

                            <SelectNomenclador
                                label="Categoría"
                                nombreNomenclador="categoría de producto"
                                value={productoForm.categoria_producto}
                                opciones={categorias}
                                onChange={(nombre) => handleChange('categoria_producto', nombre)}
                                onCrear={categoriasProductoApi.crear}
                                onCreado={async () => setCategorias(await categoriasProductoApi.listar())}
                                error={!!errors.categoria_producto}
                                helperText={errors.categoria_producto}
                                disabled={guardando || cargandoNomencladores || !!compraPendiente}
                            />

                            <SelectNomenclador
                                label="Estado"
                                nombreNomenclador="estado de producto"
                                value={productoForm.estado}
                                opciones={estados}
                                onChange={(nombre) => handleChange('estado', nombre)}
                                onCrear={estadosProductoApi.crear}
                                onCreado={async () => setEstados(await estadosProductoApi.listar())}
                                error={!!errors.estado}
                                helperText={errors.estado}
                                disabled={guardando || cargandoNomencladores || !!compraPendiente}
                            />

                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                                <SelectConAgregar
                                    label="Almacén"
                                    value={productoForm.almacen}
                                    opciones={almacenes.map((a) => ({ value: a._id, label: a.nombreAlmacen }))}
                                    onChange={(v) => handleChange('almacen', v)}
                                    onAgregar={() => setDialogAlmacen(true)}
                                    textoAgregar="Añadir almacén"
                                    error={!!errors.almacen}
                                    helperText={errors.almacen}
                                    disabled={guardando || cargando || !!compraPendiente}
                                />
                                <SelectConAgregar
                                    label="Contenedor"
                                    value={productoForm.contenedor}
                                    opciones={contenedoresDelAlmacen.map((c) => ({
                                        value: c._id,
                                        label: c.nombreContenedor,
                                    }))}
                                    onChange={(v) => handleChange('contenedor', v)}
                                    onAgregar={() => setDialogContenedor(true)}
                                    textoAgregar="Añadir contenedor"
                                    error={!!errors.contenedor}
                                    helperText={errors.contenedor}
                                    disabled={guardando || cargando || !!compraPendiente}
                                />
                            </Box>

                            <DatePicker
                                label="Fecha"
                                value={compraFecha}
                                onChange={(value) => value && setCompraFecha(value)}
                                slotProps={{ textField: { fullWidth: true, size: 'small', sx: inputSx } }}
                                disabled={guardando}
                            />

                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                                <TextField
                                    size="small"
                                    type="number"
                                    label="Cantidad"
                                    value={cantidad}
                                    onChange={(e) => {
                                        setCantidad(e.target.value);
                                        setErrors((p) => ({ ...p, cantidad: undefined }));
                                    }}
                                    error={!!errors.cantidad}
                                    helperText={errors.cantidad}
                                    disabled={guardando || !!compraPendiente}
                                    slotProps={{ htmlInput: { min: 1, step: 1 } }}
                                    sx={inputSx}
                                />
                                <TextField
                                    size="small"
                                    type="number"
                                    label="Costo Unitario"
                                    value={precioCosto}
                                    onChange={(e) => {
                                        setPrecioCosto(e.target.value);
                                        setErrors((p) => ({ ...p, precio_costo: undefined }));
                                    }}
                                    error={!!errors.precio_costo}
                                    helperText={errors.precio_costo}
                                    disabled={guardando || !!compraPendiente}
                                    slotProps={{
                                        htmlInput: { min: 0, step: '0.01' },
                                        input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
                                    }}
                                    sx={inputSx}
                                />
                            </Box>

                            {compraPendiente && (
                                <AppAlert
                                    severity="warning"
                                    action={
                                        <Button
                                            color="inherit"
                                            size="small"
                                            onClick={reiniciarFormulario}
                                            disabled={guardando}
                                        >
                                            Descartar
                                        </Button>
                                    }
                                    message={`El producto "${compraPendiente.producto.nombre_producto}" ya se creó, pero falta registrar la compra. Pulse "Reintentar" (se enviarán los datos ya confirmados).`}
                                />
                            )}
                        </Box>
                    </LocalizationProvider>
                </DialogContent>

                <DialogActions sx={{ display: 'flex', p: 2, gap: 2, width: '100%' }}>
                    <Button
                        onClick={handleCerrar}
                        disabled={guardando}
                        fullWidth
                        variant="contained"
                        startIcon={<CancelIcon />}
                        sx={botonCancelarSx}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => void registrarCompra()}
                        disabled={guardando || cargando}
                        fullWidth
                        startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                        sx={botonGuardarSx}
                    >
                        {guardando ? 'Guardando…' : compraPendiente ? 'Reintentar registro' : 'Registrar compra'}
                    </Button>
                </DialogActions>
            </Dialog>

            <NuevoAlmacenDialog
                open={dialogAlmacen}
                onClose={() => setDialogAlmacen(false)}
                onAgregar={async (datos) => {
                    const creado = await crearAlmacen(datos);
                    handleChange('almacen', creado._id);
                }}
            />
            <NuevoContenedorDialog
                open={dialogContenedor}
                onClose={() => setDialogContenedor(false)}
                almacenes={almacenes.map((a) => ({ id: a._id, nombre: a.nombreAlmacen }))}
                almacenInicialId={productoForm.almacen}
                onAgregar={async (datos) => {
                    const creado = await crearContenedor(datos);
                    // El contenedor puede haberse creado en otro almacén distinto al elegido.
                    setProductoForm((prev) => ({ ...prev, almacen: datos.almacenId, contenedor: creado._id }));
                    setErrors((prev) => ({ ...prev, almacen: undefined, contenedor: undefined }));
                }}
            />
        </>
    );
}

// ─── Informe de Recepción SC-2-04 ────────────────────────────────────

const TIPOS_DOCUMENTO_ORIGEN: { value: TipoDocumentoOrigen; label: string }[] = [
    { value: 'factura', label: 'Factura' },
    { value: 'conduce', label: 'Conduce' },
    { value: 'otro', label: 'Otro' },
];

interface LineaForm {
    clave: number;
    producto: string;
    contenedor: string;
    cantidad: string;
    costo: string;
}

interface LineaErrores {
    producto?: string;
    contenedor?: string;
    cantidad?: string;
    costo?: string;
}

interface ErroresRecepcion {
    proveedor?: string;
    almacen?: string;
    numeroDocumento?: string;
    responsable?: string;
    lineas?: string;
    porLinea: Record<number, LineaErrores>;
}

let claveLinea = 0;
const nuevaLinea = (): LineaForm => ({ clave: ++claveLinea, producto: '', contenedor: '', cantidad: '', costo: '' });

const formatoMoneda = (valor: number): string => valor.toFixed(2);

/**
 * Informe de Recepción: cabecera normativa + líneas de productos que ya
 * existen. Guardar el borrador NO mueve el inventario; el saldo se actualiza
 * cuando se registra la recepción (una sola vez).
 */
function InformeRecepcionDialog({ open, onClose, onCambio, selectorModo }: FormularioProps) {
    const notify = useNotify();
    const { almacenes, contenedores, cargando } = useUbicaciones(open);

    const [productos, setProductos] = useState<ProductoBackend[]>([]);
    const [proveedores, setProveedores] = useState<ProveedorBackend[]>([]);
    const [borradores, setBorradores] = useState<Recepcion[]>([]);

    const [recepcionId, setRecepcionId] = useState<string | null>(null);
    const [numero, setNumero] = useState('');
    const [fechaEmision, setFechaEmision] = useState<Dayjs>(dayjs());
    const [proveedor, setProveedor] = useState('');
    const [almacen, setAlmacen] = useState('');
    const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoOrigen>('factura');
    const [numeroDocumento, setNumeroDocumento] = useState('');
    const [fechaDocumento, setFechaDocumento] = useState<Dayjs>(dayjs());
    const [transportista, setTransportista] = useState('');
    const [responsable, setResponsable] = useState('');
    const [lineas, setLineas] = useState<LineaForm[]>(() => [nuevaLinea()]);
    const [errores, setErrores] = useState<ErroresRecepcion>({ porLinea: {} });
    const [operacion, setOperacion] = useState<'borrador' | 'registrar' | null>(null);

    const cargarDatos = useCallback(async () => {
        const avisar = (mensaje: string) => (error: unknown) => notify.error(getErrorMessage(error, mensaje));
        await Promise.all([
            movimientosApi.listarProductos().then(setProductos).catch(avisar('No se pudieron cargar los productos')),
            proveedorApi.getAll().then(setProveedores).catch(avisar('No se pudieron cargar los proveedores')),
            recepcionApi.listar('borrador').then(setBorradores).catch(avisar('No se pudieron cargar los borradores')),
        ]);
    }, [notify]);

    useEffect(() => {
        if (!open) return;
        void cargarDatos();
    }, [open, cargarDatos]);

    const contenedoresDelAlmacen = useMemo(
        () => contenedores.filter((c) => refId(c.almacen) === almacen),
        [contenedores, almacen],
    );

    const totalEstimado = useMemo(
        () => lineas.reduce((suma, l) => suma + (Number(l.cantidad) || 0) * (Number(l.costo) || 0), 0),
        [lineas],
    );

    const ocupado = operacion !== null;

    const reiniciar = () => {
        setRecepcionId(null);
        setNumero('');
        setFechaEmision(dayjs());
        setProveedor('');
        setAlmacen('');
        setTipoDocumento('factura');
        setNumeroDocumento('');
        setFechaDocumento(dayjs());
        setTransportista('');
        setResponsable('');
        setLineas([nuevaLinea()]);
        setErrores({ porLinea: {} });
    };

    const cargarBorrador = (id: string) => {
        const borrador = borradores.find((b) => b._id === id);
        if (!borrador) return;
        setRecepcionId(borrador._id);
        setNumero(borrador.numeroConsecutivo);
        setFechaEmision(dayjs(borrador.fechaEmision));
        setProveedor(borrador.proveedor);
        setAlmacen(borrador.almacenReceptor);
        setTipoDocumento(borrador.documentoOrigen.tipo);
        setNumeroDocumento(borrador.documentoOrigen.numero);
        setFechaDocumento(dayjs(borrador.documentoOrigen.fecha));
        setTransportista(borrador.transportista ?? '');
        setResponsable(borrador.responsableComprobacion);
        setLineas(
            borrador.lineas.map((l) => ({
                ...nuevaLinea(),
                producto: l.producto,
                contenedor: l.contenedor,
                cantidad: String(l.cantidad),
                costo: String(l.costo_unitario),
            })),
        );
        setErrores({ porLinea: {} });
    };

    const cambiarLinea = (clave: number, cambios: Partial<LineaForm>) => {
        setLineas((prev) => prev.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)));
        setErrores((prev) => ({ ...prev, lineas: undefined, porLinea: { ...prev.porLinea, [clave]: {} } }));
    };

    const validar = (): CrearRecepcionDto | null => {
        const e: ErroresRecepcion = { porLinea: {} };

        if (!proveedor) e.proveedor = 'Seleccione el proveedor';
        if (!almacen) e.almacen = 'Seleccione el almacén receptor';
        if (!numeroDocumento.trim()) e.numeroDocumento = 'Indique el número del documento de origen';
        if (!responsable.trim()) e.responsable = 'Indique quién comprueba la mercancía';
        if (lineas.length === 0) e.lineas = 'Agregue al menos una línea';

        for (const l of lineas) {
            const le: LineaErrores = {};
            const cantidad = Number(l.cantidad);
            const costo = Number(l.costo);
            if (!l.producto) le.producto = 'Seleccione el producto';
            if (!l.contenedor) le.contenedor = 'Seleccione el contenedor';
            if (!l.cantidad || !Number.isInteger(cantidad) || cantidad < 1) le.cantidad = 'Entero de al menos 1';
            if (l.costo === '' || !Number.isFinite(costo) || costo < 0) le.costo = 'Costo no válido';
            if (Object.keys(le).length > 0) e.porLinea[l.clave] = le;
        }

        setErrores(e);
        const hayErrores = Object.values({ ...e, porLinea: undefined }).some(Boolean) || Object.keys(e.porLinea).length > 0;
        if (hayErrores) return null;

        return {
            fechaEmision: fechaEmision.format('YYYY-MM-DD'),
            almacenReceptor: almacen,
            proveedor,
            documentoOrigen: {
                tipo: tipoDocumento,
                numero: numeroDocumento.trim(),
                fecha: fechaDocumento.format('YYYY-MM-DD'),
            },
            transportista: transportista.trim() || undefined,
            responsableComprobacion: responsable.trim(),
            lineas: lineas.map((l) => ({
                producto: l.producto,
                contenedor: l.contenedor,
                cantidad: Number(l.cantidad),
                costo_unitario: Number(l.costo),
            })),
        };
    };

    /** Crea el borrador o actualiza el que ya se guardó. Devuelve null si el formulario no es válido. */
    const guardar = async (): Promise<Recepcion | null> => {
        const dto = validar();
        if (!dto) return null;
        const guardada = recepcionId
            ? await recepcionApi.actualizar(recepcionId, dto)
            : await recepcionApi.crear(dto);
        setRecepcionId(guardada._id);
        setNumero(guardada.numeroConsecutivo);
        return guardada;
    };

    const handleGuardarBorrador = async () => {
        setOperacion('borrador');
        try {
            const guardada = await guardar();
            if (!guardada) return;
            notify.success(
                `Borrador ${guardada.numeroConsecutivo} guardado. El inventario no cambia hasta registrar la recepción.`,
            );
            setBorradores(await recepcionApi.listar('borrador'));
        } catch (error) {
            notify.error(getErrorMessage(error, 'No se pudo guardar el borrador'));
        } finally {
            setOperacion(null);
        }
    };

    const handleRegistrar = async () => {
        setOperacion('registrar');
        try {
            const guardada = await guardar();
            if (!guardada) return;
            const registrada = await recepcionApi.registrar(guardada._id);
            notify.success(`Recepción ${registrada.numeroConsecutivo} registrada: el inventario se actualizó.`);
            reiniciar();
            onClose();
            await onCambio();
        } catch (error) {
            // Si el borrador ya se guardó, queda seleccionado para reintentar el registro.
            notify.error(getErrorMessage(error, 'No se pudo registrar la recepción'));
            void recepcionApi.listar('borrador').then(setBorradores).catch(() => undefined);
        } finally {
            setOperacion(null);
        }
    };

    const handleCerrar = () => {
        if (ocupado) return;
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleCerrar} maxWidth="md" fullWidth slotProps={{ paper: { sx: paperSx } }}>
            <DialogTitle sx={tituloSx}>
                <Typography variant="h6" component="span" sx={tituloTextoSx}>
                    <ReceiptLongIcon sx={{ color: 'primary.main' }} />
                    Informe de Recepción (SC-2-04)
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ pt: '20px !important' }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Box
                        component="form"
                        noValidate
                        onSubmit={(ev) => {
                            ev.preventDefault();
                            void handleRegistrar();
                        }}
                        sx={{ display: 'grid', gap: 2 }}
                    >
                        {selectorModo}

                        {borradores.length > 0 && (
                            <TextField
                                select
                                size="small"
                                label="Continuar un borrador"
                                value={recepcionId ?? ''}
                                onChange={(ev) => cargarBorrador(ev.target.value)}
                                disabled={ocupado}
                                sx={inputSx}
                            >
                                {borradores.map((b) => (
                                    <MenuItem key={b._id} value={b._id}>
                                        {b.numeroConsecutivo} — {b.documentoOrigen.numero}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}

                        {numero && (
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                Borrador {numero}: el inventario no cambia hasta registrar la recepción.
                            </Typography>
                        )}

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                            <TextField
                                select
                                size="small"
                                label="Proveedor"
                                value={proveedor}
                                onChange={(ev) => {
                                    setProveedor(ev.target.value);
                                    setErrores((p) => ({ ...p, proveedor: undefined }));
                                }}
                                error={!!errores.proveedor}
                                helperText={errores.proveedor}
                                disabled={ocupado}
                                sx={inputSx}
                            >
                                {proveedores.map((p) => (
                                    <MenuItem key={p._id} value={p._id}>
                                        {p.nombre} ({p.codigo})
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                size="small"
                                label="Almacén receptor"
                                value={almacen}
                                onChange={(ev) => {
                                    setAlmacen(ev.target.value);
                                    setLineas((prev) => prev.map((l) => ({ ...l, contenedor: '' })));
                                    setErrores((p) => ({ ...p, almacen: undefined }));
                                }}
                                error={!!errores.almacen}
                                helperText={errores.almacen}
                                disabled={ocupado || cargando}
                                sx={inputSx}
                            >
                                {almacenes.map((a) => (
                                    <MenuItem key={a._id} value={a._id}>
                                        {a.nombreAlmacen}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Box>

                        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                            Documento de origen
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1.5fr 1fr' }, gap: 2 }}>
                            <TextField
                                select
                                size="small"
                                label="Tipo"
                                value={tipoDocumento}
                                onChange={(ev) => setTipoDocumento(ev.target.value as TipoDocumentoOrigen)}
                                disabled={ocupado}
                                sx={inputSx}
                            >
                                {TIPOS_DOCUMENTO_ORIGEN.map((t) => (
                                    <MenuItem key={t.value} value={t.value}>
                                        {t.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                size="small"
                                label="Número"
                                value={numeroDocumento}
                                onChange={(ev) => {
                                    setNumeroDocumento(ev.target.value);
                                    setErrores((p) => ({ ...p, numeroDocumento: undefined }));
                                }}
                                error={!!errores.numeroDocumento}
                                helperText={errores.numeroDocumento}
                                disabled={ocupado}
                                sx={inputSx}
                            />
                            <DatePicker
                                label="Fecha del documento"
                                value={fechaDocumento}
                                onChange={(valor) => valor && setFechaDocumento(valor)}
                                slotProps={{ textField: { fullWidth: true, size: 'small', sx: inputSx } }}
                                disabled={ocupado}
                            />
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                            <TextField
                                size="small"
                                label="Transportista"
                                value={transportista}
                                onChange={(ev) => setTransportista(ev.target.value)}
                                disabled={ocupado}
                                sx={inputSx}
                            />
                            <TextField
                                size="small"
                                label="Responsable de comprobación"
                                value={responsable}
                                onChange={(ev) => {
                                    setResponsable(ev.target.value);
                                    setErrores((p) => ({ ...p, responsable: undefined }));
                                }}
                                error={!!errores.responsable}
                                helperText={errores.responsable}
                                disabled={ocupado}
                                sx={inputSx}
                            />
                            <DatePicker
                                label="Fecha de emisión"
                                value={fechaEmision}
                                onChange={(valor) => valor && setFechaEmision(valor)}
                                slotProps={{ textField: { fullWidth: true, size: 'small', sx: inputSx } }}
                                disabled={ocupado}
                            />
                        </Box>

                        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                            Productos recibidos
                        </Typography>
                        {errores.lineas && (
                            <Typography variant="caption" sx={{ color: 'error.main' }}>
                                {errores.lineas}
                            </Typography>
                        )}
                        {lineas.map((l) => {
                            const le = errores.porLinea[l.clave] ?? {};
                            return (
                                <Box
                                    key={l.clave}
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', sm: '2fr 1.5fr 0.8fr 1fr auto' },
                                        gap: 1.5,
                                        alignItems: 'start',
                                    }}
                                >
                                    <TextField
                                        select
                                        size="small"
                                        label="Producto"
                                        value={l.producto}
                                        onChange={(ev) => cambiarLinea(l.clave, { producto: ev.target.value })}
                                        error={!!le.producto}
                                        helperText={le.producto}
                                        disabled={ocupado}
                                        sx={inputSx}
                                    >
                                        {productos.map((p) => (
                                            <MenuItem key={p._id} value={p._id}>
                                                {p.nombre_producto} ({p.codigo_producto})
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    <TextField
                                        select
                                        size="small"
                                        label="Contenedor"
                                        value={l.contenedor}
                                        onChange={(ev) => cambiarLinea(l.clave, { contenedor: ev.target.value })}
                                        error={!!le.contenedor}
                                        helperText={le.contenedor ?? (almacen ? undefined : 'Elija primero el almacén')}
                                        disabled={ocupado || !almacen}
                                        sx={inputSx}
                                    >
                                        {contenedoresDelAlmacen.map((c) => (
                                            <MenuItem key={c._id} value={c._id}>
                                                {c.nombreContenedor}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    <TextField
                                        size="small"
                                        type="number"
                                        label="Cantidad"
                                        value={l.cantidad}
                                        onChange={(ev) => cambiarLinea(l.clave, { cantidad: ev.target.value })}
                                        error={!!le.cantidad}
                                        helperText={le.cantidad}
                                        disabled={ocupado}
                                        slotProps={{ htmlInput: { min: 1, step: 1 } }}
                                        sx={inputSx}
                                    />
                                    <TextField
                                        size="small"
                                        type="number"
                                        label="Costo unitario"
                                        value={l.costo}
                                        onChange={(ev) => cambiarLinea(l.clave, { costo: ev.target.value })}
                                        error={!!le.costo}
                                        helperText={le.costo}
                                        disabled={ocupado}
                                        slotProps={{
                                            htmlInput: { min: 0, step: '0.01' },
                                            input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
                                        }}
                                        sx={inputSx}
                                    />
                                    <Tooltip title="Quitar línea">
                                        <span>
                                            <IconButton
                                                aria-label="Quitar línea"
                                                onClick={() => setLineas((prev) => prev.filter((x) => x.clave !== l.clave))}
                                                disabled={ocupado || lineas.length === 1}
                                                color="error"
                                            >
                                                <DeleteOutlineIcon />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </Box>
                            );
                        })}

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => setLineas((prev) => [...prev, nuevaLinea()])}
                                disabled={ocupado}
                            >
                                Agregar línea
                            </Button>
                            <Typography sx={{ fontWeight: 600 }}>
                                Total estimado: ${formatoMoneda(totalEstimado)}
                            </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            El total definitivo lo calcula el servidor al guardar.
                        </Typography>
                    </Box>
                </LocalizationProvider>
            </DialogContent>

            <DialogActions sx={{ display: 'flex', p: 2, gap: 2, width: '100%' }}>
                <Button
                    onClick={handleCerrar}
                    disabled={ocupado}
                    fullWidth
                    variant="contained"
                    startIcon={<CancelIcon />}
                    sx={botonCancelarSx}
                >
                    Cancelar
                </Button>
                <Button
                    onClick={() => void handleGuardarBorrador()}
                    disabled={ocupado || cargando}
                    fullWidth
                    variant="outlined"
                    startIcon={operacion === 'borrador' ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                >
                    {operacion === 'borrador' ? 'Guardando…' : 'Guardar borrador'}
                </Button>
                <Button
                    variant="contained"
                    onClick={() => void handleRegistrar()}
                    disabled={ocupado || cargando}
                    fullWidth
                    startIcon={operacion === 'registrar' ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                    sx={botonGuardarSx}
                >
                    {operacion === 'registrar' ? 'Registrando…' : 'Registrar recepción'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ─── Dialog público ──────────────────────────────────────────────────

type ModoCompra = 'recepcion' | 'productoNuevo';

/**
 * Registrar una entrada de mercancía. Por defecto es el Informe de Recepción
 * (productos existentes, con documento de origen); "Producto nuevo" conserva el
 * flujo anterior de crear el producto y su compra. Los dos formularios
 * permanecen montados para no perder un registro pendiente al cambiar de modo.
 */
export default function RegistrarCompraDialog(props: RegistrarCompraDialogProps) {
    const [modo, setModo] = useState<ModoCompra>('recepcion');

    const selectorModo = (
        <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={modo}
            onChange={(_, valor: ModoCompra | null) => valor && setModo(valor)}
        >
            <ToggleButton value="recepcion">Informe de recepción</ToggleButton>
            <ToggleButton value="productoNuevo">Producto nuevo</ToggleButton>
        </ToggleButtonGroup>
    );

    return (
        <>
            <InformeRecepcionDialog {...props} open={props.open && modo === 'recepcion'} selectorModo={selectorModo} />
            <CompraProductoNuevoDialog
                {...props}
                open={props.open && modo === 'productoNuevo'}
                selectorModo={selectorModo}
            />
        </>
    );
}
