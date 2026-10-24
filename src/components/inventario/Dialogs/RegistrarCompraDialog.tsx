import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    InputAdornment,
    TextField,
    Typography,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
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

export default function RegistrarCompraDialog({ open, onClose, onCambio }: RegistrarCompraDialogProps) {
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
                        Registrar Compra
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
