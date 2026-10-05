// src/components/MovimientosTabs.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Divider,
    FormControl,
    InputAdornment,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SaveIcon from '@mui/icons-material/Save';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';
import { nomencladoresApi } from '../../service/nomencladoresApi';
import {
    movimientosApi,
    type ProductoBackend,
    type AlmacenBackend,
    type ContenedorBackend,
    type ExistenciaBackend,
} from '../../service/movimientosApi';

interface NomencladorValorOption {
    _id: string;
    codigo: string;
    nombre: string;
    activo: boolean;
    orden: number;
}

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

const getErrorMessage = (error: any, fallback: string): string => {
    const message = error?.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
    return fallback;
};

/** Mongoose puede devolver una referencia como string o como objeto populado. */
const refId = (ref: string | { _id: string } | null | undefined): string =>
    typeof ref === 'string' ? ref : ref?._id ?? '';

export default function MovimientosTabs(): React.JSX.Element {
    // ─── Datos provenientes del backend ───────────────────────────
    const [productos, setProductos] = useState<ProductoBackend[]>([]);
    const [almacenes, setAlmacenes] = useState<AlmacenBackend[]>([]);
    const [contenedores, setContenedores] = useState<ContenedorBackend[]>([]);
    const [categorias, setCategorias] = useState<NomencladorValorOption[]>([]);
    const [estados, setEstados] = useState<NomencladorValorOption[]>([]);

    const [loadingDatos, setLoadingDatos] = useState(true);
    const [loadingCompra, setLoadingCompra] = useState(false);
    const [alert, setAlert] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    // ─── Registrar compra / producto ─────────────────────────────
    const [productoForm, setProductoForm] = useState<ProductoForm>(initialProduct);
    const [cantidad, setCantidad] = useState('');
    const [precioCosto, setPrecioCosto] = useState('');
    const [compraFecha, setCompraFecha] = useState<Dayjs>(dayjs());
    const [errors, setErrors] = useState<FormErrors>({});

    // ─── Transferencia ────────────────────────────────────────────
    const [transProducto, setTransProducto] = useState('');
    const [transOrigenAlm, setTransOrigenAlm] = useState('');
    const [transOrigenCont, setTransOrigenCont] = useState('');
    const [transDestinoAlm, setTransDestinoAlm] = useState('');
    const [transDestinoCont, setTransDestinoCont] = useState('');
    const [transCantidad, setTransCantidad] = useState('');
    const [transFecha, setTransFecha] = useState<Dayjs>(dayjs());
    const [existenciasProducto, setExistenciasProducto] = useState<ExistenciaBackend[]>([]);
    const [loadingExistencias, setLoadingExistencias] = useState(false);
    const [loadingTransferencia, setLoadingTransferencia] = useState(false);

    const cargarDatos = useCallback(async () => {
        try {
            setLoadingDatos(true);

            const [productosData, almacenesData, contenedoresData, nomencladores] =
                await Promise.all([
                    movimientosApi.listarProductos(),
                    movimientosApi.listarAlmacenes(),
                    movimientosApi.listarContenedores(),
                    nomencladoresApi.listar(),
                ]);

            const nomencladorCategorias = nomencladores.find((n) =>
                n.nombre.toLowerCase().includes('categor')
            );

            const nomencladorEstados = nomencladores.find((n) =>
                n.nombre.toLowerCase().includes('estado')
            );

            const [categoriasData, estadosData] = await Promise.all([
                nomencladorCategorias
                    ? nomencladoresApi.listarValores(nomencladorCategorias.codigo, false)
                    : Promise.resolve([]),
                nomencladorEstados
                    ? nomencladoresApi.listarValores(nomencladorEstados.codigo, false)
                    : Promise.resolve([]),
            ]);

            setProductos(productosData);
            setAlmacenes(almacenesData);
            setContenedores(contenedoresData);
            setCategorias(categoriasData);
            setEstados(estadosData);
        } catch (error) {
            console.error('Error cargando datos de movimientos:', error);
            setAlert({
                type: 'error',
                message: getErrorMessage(error, 'No se pudieron cargar los datos del módulo'),
            });
        } finally {
            setLoadingDatos(false);
        }
    }, []);

    useEffect(() => {
        void cargarDatos();
    }, [cargarDatos]);

    const handleProductChange = (field: keyof ProductoForm, value: string) => {
        setProductoForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));

        if (field === 'almacen') {
            setProductoForm((prev) => ({ ...prev, almacen: value, contenedor: '' }));
            setErrors((prev) => ({ ...prev, almacen: undefined, contenedor: undefined }));
        }
    };

    const contenedoresProducto = useMemo(
        () =>
            contenedores.filter((contenedor) => {
                const almacenId =
                    typeof contenedor.almacen === 'string'
                        ? contenedor.almacen
                        : contenedor.almacen?._id;

                return almacenId === productoForm.almacen;
            }),
        [contenedores, productoForm.almacen]
    );

    // ─── Datos derivados de la transferencia ──────────────────────
    /** Almacenes donde el producto seleccionado tiene stock. */
    const almacenesOrigen = useMemo(() => {
        const mapa = new Map<string, { _id: string; nombre: string; total: number }>();

        existenciasProducto.forEach((existencia) => {
            const id = refId(existencia.almacen);
            if (!id) return;

            const nombre =
                typeof existencia.almacen === 'string'
                    ? almacenes.find((a) => a._id === id)?.nombreAlmacen ?? 'Almacén'
                    : existencia.almacen?.nombreAlmacen ?? 'Almacén';

            const actual = mapa.get(id);
            mapa.set(id, {
                _id: id,
                nombre,
                total: (actual?.total ?? 0) + existencia.cantidad,
            });
        });

        return Array.from(mapa.values());
    }, [existenciasProducto, almacenes]);

    /** Contenedores del almacén de origen elegido donde hay stock del producto. */
    const contenedoresOrigen = useMemo(
        () =>
            existenciasProducto
                .filter((existencia) => refId(existencia.almacen) === transOrigenAlm)
                .map((existencia) => {
                    const id = refId(existencia.contenedor);

                    const nombre =
                        typeof existencia.contenedor === 'string'
                            ? contenedores.find((c) => c._id === id)?.nombreContenedor ??
                              'Contenedor'
                            : existencia.contenedor?.nombreContenedor ?? 'Contenedor';

                    return { _id: id, nombre, cantidad: existencia.cantidad };
                }),
        [existenciasProducto, contenedores, transOrigenAlm]
    );

    /** Existencia exacta (producto + almacén + contenedor) de la que se descuenta. */
    const existenciaOrigen = useMemo(
        () =>
            existenciasProducto.find(
                (existencia) =>
                    refId(existencia.almacen) === transOrigenAlm &&
                    refId(existencia.contenedor) === transOrigenCont
            ),
        [existenciasProducto, transOrigenAlm, transOrigenCont]
    );

    const cantidadDisponible = existenciaOrigen?.cantidad ?? 0;

    /** Contenedores del almacén de destino (sin incluir el contenedor de origen). */
    const contenedoresDestino = useMemo(
        () =>
            contenedores.filter((contenedor) => {
                if (refId(contenedor.almacen) !== transDestinoAlm) return false;

                const esElOrigen =
                    transDestinoAlm === transOrigenAlm &&
                    contenedor._id === transOrigenCont;

                return !esElOrigen;
            }),
        [contenedores, transDestinoAlm, transOrigenAlm, transOrigenCont]
    );

    /** Validación de la cantidad frente al stock del origen. */
    const errorCantidad = (() => {
        if (transCantidad === '') return undefined;

        const n = Number(transCantidad);

        if (!Number.isInteger(n) || n <= 0) {
            return 'Ingrese un número entero mayor que cero';
        }

        if (n > cantidadDisponible) {
            return `No puede superar el stock del origen (${cantidadDisponible})`;
        }

        return undefined;
    })();

    /** Si el destino quedó igual al origen, se limpia el contenedor de destino. */
    const limpiarDestinoSiCoincide = (almacenId: string, contenedorId: string) => {
        if (transDestinoAlm === almacenId && transDestinoCont === contenedorId) {
            setTransDestinoCont('');
        }
    };

    /**
     * Fija el origen de forma automática cuando solo hay una opción:
     * un único almacén con stock y, dentro de él, un único contenedor.
     */
    const autoSeleccionarOrigen = (
        existencias: ExistenciaBackend[],
        almacenId = '',
        contenedorId = ''
    ) => {
        let alm = almacenId;
        let cont = contenedorId;

        if (!alm) {
            const unicos = Array.from(new Set(existencias.map((e) => refId(e.almacen))));
            if (unicos.length === 1) alm = unicos[0];
        }

        if (alm && !cont) {
            const delAlmacen = existencias.filter((e) => refId(e.almacen) === alm);
            if (delAlmacen.length === 1) cont = refId(delAlmacen[0].contenedor);
        }

        setTransOrigenAlm(alm);
        setTransOrigenCont(cont);
        limpiarDestinoSiCoincide(alm, cont);
    };

    /**
     * Al elegir un producto se consultan sus existencias: de ahí salen los
     * almacenes y contenedores de origen disponibles para transferir.
     */
    const handleTransferProductChange = async (productoId: string) => {
        setTransProducto(productoId);
        setTransOrigenAlm('');
        setTransOrigenCont('');
        setTransCantidad('');
        setExistenciasProducto([]);

        if (!productoId) return;

        try {
            setLoadingExistencias(true);

            const existencias = await movimientosApi.listarExistenciasProducto(productoId);

            setExistenciasProducto(existencias);
            autoSeleccionarOrigen(existencias);
        } catch (error) {
            console.error('Error cargando existencias del producto:', error);
            setAlert({
                type: 'error',
                message: getErrorMessage(
                    error,
                    'No se pudieron cargar las existencias del producto'
                ),
            });
        } finally {
            setLoadingExistencias(false);
        }
    };

    const handleOrigenAlmacenChange = (almacenId: string) => {
        setTransCantidad('');
        autoSeleccionarOrigen(existenciasProducto, almacenId);
    };

    const handleOrigenContenedorChange = (contenedorId: string) => {
        setTransOrigenCont(contenedorId);
        setTransCantidad('');
        limpiarDestinoSiCoincide(transOrigenAlm, contenedorId);
    };

    const validarProducto = (): boolean => {
        const nextErrors: FormErrors = {};
        const cantidadNumber = Number(cantidad);
        const costoNumber = Number(precioCosto);

        if (!productoForm.codigo_producto.trim()) {
            nextErrors.codigo_producto = 'El código es obligatorio';
        }

        if (!productoForm.nombre_producto.trim()) {
            nextErrors.nombre_producto = 'El nombre es obligatorio';
        }

        if (!productoForm.categoria_producto) {
            nextErrors.categoria_producto = 'Seleccione una categoría';
        }

        if (!productoForm.estado) {
            nextErrors.estado = 'Seleccione un estado';
        }

        if (!productoForm.almacen) {
            nextErrors.almacen = 'Seleccione un almacén';
        }

        if (!productoForm.contenedor) {
            nextErrors.contenedor = 'Seleccione un contenedor';
        }

        if (!cantidad || !Number.isInteger(cantidadNumber) || cantidadNumber < 0) {
            nextErrors.cantidad = 'Ingrese una cantidad válida';
        }

        if (!precioCosto || !Number.isFinite(costoNumber) || costoNumber < 0) {
            nextErrors.precio_costo = 'Ingrese un precio de costo válido';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    // ─── REGISTRAR COMPRA ────────────────────────────────────────
    // Por ahora esta acción registra el PRODUCTO mediante POST /producto.
    // La segunda petición de compra se agregará cuando se conecte el módulo
    // de compras del backend, sin inventar un endpoint correspondiente.
    const registrarCompra = async () => {
        if (!validarProducto()) return;

        try {
            setLoadingCompra(true);

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

            setProductos((prev) => [creado, ...prev]);
            setProductoForm(initialProduct);
            setCantidad('');
            setPrecioCosto('');
            setCompraFecha(dayjs());
            setErrors({});

            setAlert({
                type: 'success',
                message: `Producto "${creado.nombre_producto}" registrado correctamente.`,
            });
        } catch (error) {
            console.error('Error registrando producto:', error);
            setAlert({
                type: 'error',
                message: getErrorMessage(error, 'No se pudo registrar el producto'),
            });
        } finally {
            setLoadingCompra(false);
        }
    };

    const realizarTransferencia = async () => {
        const mostrarError = (message: string) =>
            setAlert({ type: 'error', message });

        if (!transProducto) return mostrarError('Seleccione un producto.');
        if (!transOrigenAlm) return mostrarError('Seleccione el almacén de origen.');
        if (!transOrigenCont) return mostrarError('Seleccione el contenedor de origen.');
        if (!transDestinoAlm) return mostrarError('Seleccione el almacén de destino.');
        if (!transDestinoCont) return mostrarError('Seleccione el contenedor de destino.');

        const cantidadNumber = Number(transCantidad);

        if (!Number.isInteger(cantidadNumber) || cantidadNumber <= 0) {
            return mostrarError('La cantidad debe ser un número entero mayor que cero.');
        }

        if (cantidadNumber > cantidadDisponible) {
            return mostrarError(
                `La cantidad solicitada supera el stock disponible en el origen (${cantidadDisponible}).`
            );
        }

        if (transOrigenAlm === transDestinoAlm && transOrigenCont === transDestinoCont) {
            return mostrarError('El origen y destino no pueden ser la misma ubicación.');
        }

        try {
            setLoadingTransferencia(true);

            await movimientosApi.crearTransferencia({
                producto: transProducto,
                almacen_origen: transOrigenAlm,
                contenedor_origen: transOrigenCont,
                almacen_destino: transDestinoAlm,
                contenedor_destino: transDestinoCont,
                cantidad: cantidadNumber,
                fecha: transFecha.format('YYYY-MM-DD'),
            });

            setAlert({
                type: 'success',
                message: 'Transferencia registrada correctamente.',
            });

            // El stock de origen y destino cambió: se vuelve a consultar.
            const actualizadas = await movimientosApi.listarExistenciasProducto(transProducto);
            setExistenciasProducto(actualizadas);

            // Se conserva el origen mientras conserve stock; si no, se reajusta.
            const origenSigue = actualizadas.some(
                (e) =>
                    refId(e.almacen) === transOrigenAlm &&
                    refId(e.contenedor) === transOrigenCont
            );
            const almacenSigue = actualizadas.some((e) => refId(e.almacen) === transOrigenAlm);

            if (!origenSigue) {
                autoSeleccionarOrigen(actualizadas, almacenSigue ? transOrigenAlm : '');
            }

            setTransCantidad('');
            setTransDestinoAlm('');
            setTransDestinoCont('');
            setTransFecha(dayjs());
        } catch (error) {
            console.error('Error realizando transferencia:', error);
            mostrarError(getErrorMessage(error, 'No se pudo realizar la transferencia.'));
        } finally {
            setLoadingTransferencia(false);
        }
    };

    const transferenciaLista =
        !!transProducto &&
        !!transOrigenAlm &&
        !!transOrigenCont &&
        !!transDestinoAlm &&
        !!transDestinoCont &&
        transCantidad !== '' &&
        !errorCantidad;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ p: 1 }}>
                {alert && (
                    <Alert
                        severity={alert.type}
                        onClose={() => setAlert(null)}
                        sx={{ mb: 2 }}
                    >
                        {alert.message}
                    </Alert>
                )}

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
                        gap: 2,
                    }}
                >
                    {/* ───────────────── REGISTRAR COMPRA ───────────────── */}
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <ShoppingCartIcon color="primary" />
                                <Typography variant="h6">Registrar Compra</Typography>
                            </Box>
                            <Divider sx={{ mb: 2 }} />

                            <Stack spacing={2}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Código del producto"
                                    value={productoForm.codigo_producto}
                                    onChange={(e) =>
                                        handleProductChange('codigo_producto', e.target.value)
                                    }
                                    error={!!errors.codigo_producto}
                                    helperText={errors.codigo_producto}
                                    disabled={loadingCompra}
                                />

                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Nombre del producto"
                                    value={productoForm.nombre_producto}
                                    onChange={(e) =>
                                        handleProductChange('nombre_producto', e.target.value)
                                    }
                                    error={!!errors.nombre_producto}
                                    helperText={errors.nombre_producto}
                                    disabled={loadingCompra}
                                />

                                <FormControl
                                    fullWidth
                                    size="small"
                                    error={!!errors.categoria_producto}
                                >
                                    <InputLabel>Categoría</InputLabel>
                                    <Select
                                        label="Categoría"
                                        value={productoForm.categoria_producto}
                                        onChange={(e) =>
                                            handleProductChange(
                                                'categoria_producto',
                                                e.target.value
                                            )
                                        }
                                        disabled={loadingDatos || loadingCompra}
                                    >
                                        <MenuItem value="">-- Seleccione categoría --</MenuItem>
                                        {categorias
                                            .filter((c) => c.activo)
                                            .map((categoria) => (
                                                <MenuItem
                                                    key={categoria._id}
                                                    value={categoria.codigo}
                                                >
                                                    {categoria.nombre}
                                                </MenuItem>
                                            ))}
                                    </Select>
                                </FormControl>

                                <FormControl
                                    fullWidth
                                    size="small"
                                    error={!!errors.estado}
                                >
                                    <InputLabel>Estado</InputLabel>
                                    <Select
                                        label="Estado"
                                        value={productoForm.estado}
                                        onChange={(e) =>
                                            handleProductChange('estado', e.target.value)
                                        }
                                        disabled={loadingDatos || loadingCompra}
                                    >
                                        <MenuItem value="">-- Seleccione estado --</MenuItem>
                                        {estados
                                            .filter((e) => e.activo)
                                            .map((estado) => (
                                                <MenuItem
                                                    key={estado._id}
                                                    value={estado.codigo}
                                                >
                                                    {estado.nombre}
                                                </MenuItem>
                                            ))}
                                    </Select>
                                </FormControl>

                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 1,
                                    }}
                                >
                                    <FormControl
                                        fullWidth
                                        size="small"
                                        error={!!errors.almacen}
                                    >
                                        <InputLabel>Almacén</InputLabel>
                                        <Select
                                            label="Almacén"
                                            value={productoForm.almacen}
                                            onChange={(e) =>
                                                handleProductChange(
                                                    'almacen',
                                                    e.target.value
                                                )
                                            }
                                            disabled={loadingDatos || loadingCompra}
                                        >
                                            <MenuItem value="">-- Seleccione almacén --</MenuItem>
                                            {almacenes.map((almacen) => (
                                                <MenuItem
                                                    key={almacen._id}
                                                    value={almacen._id}
                                                >
                                                    {almacen.nombreAlmacen}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <FormControl
                                        fullWidth
                                        size="small"
                                        error={!!errors.contenedor}
                                    >
                                        <InputLabel>Contenedor</InputLabel>
                                        <Select
                                            label="Contenedor"
                                            value={productoForm.contenedor}
                                            onChange={(e) =>
                                                handleProductChange(
                                                    'contenedor',
                                                    e.target.value
                                                )
                                            }
                                            disabled={
                                                !productoForm.almacen ||
                                                loadingDatos ||
                                                loadingCompra
                                            }
                                        >
                                            <MenuItem value="">
                                                -- Seleccione contenedor --
                                            </MenuItem>
                                            {contenedoresProducto.map((contenedor) => (
                                                <MenuItem
                                                    key={contenedor._id}
                                                    value={contenedor._id}
                                                >
                                                    {contenedor.nombreContenedor}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>

                                <DatePicker
                                    label="Fecha"
                                    value={compraFecha}
                                    onChange={(value) => value && setCompraFecha(value)}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            size: 'small',
                                        },
                                    }}
                                    disabled={loadingCompra}
                                />

                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 1,
                                    }}
                                >
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="number"
                                        label="Cantidad"
                                        value={cantidad}
                                        onChange={(e) => setCantidad(e.target.value)}
                                        error={!!errors.cantidad}
                                        helperText={errors.cantidad}
                                        disabled={loadingCompra}
                                        slotProps={{
                                            htmlInput: {
                                                min: 0,
                                                step: 1,
                                            },
                                        }}
                                    />

                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="number"
                                        label="Costo Unitario"
                                        value={precioCosto}
                                        onChange={(e) => setPrecioCosto(e.target.value)}
                                        error={!!errors.precio_costo}
                                        helperText={errors.precio_costo}
                                        disabled={loadingCompra}
                                        slotProps={{
                                            htmlInput: {
                                                min: 0,
                                                step: '0.01',
                                            },
                                            input: {
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        $
                                                    </InputAdornment>
                                                ),
                                            },
                                        }}
                                    />
                                </Box>

                                <Button
                                    variant="contained"
                                    fullWidth
                                    startIcon={<SaveIcon />}
                                    onClick={registrarCompra}
                                    disabled={loadingCompra || loadingDatos}
                                >
                                    {loadingCompra ? 'Guardando...' : 'Registrar Compra'}
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>

                    {/* ───────────────── TRANSFERENCIA ──────────────────── */}
                    <Card>
                        <CardContent>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    mb: 2,
                                }}
                            >
                                <SwapHorizIcon color="primary" />
                                <Typography variant="h6">Transferencia</Typography>
                            </Box>
                            <Divider sx={{ mb: 2 }} />

                            <Stack spacing={2}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Producto</InputLabel>
                                    <Select
                                        label="Producto"
                                        value={transProducto}
                                        onChange={(e) =>
                                            handleTransferProductChange(e.target.value)
                                        }
                                        disabled={loadingDatos}
                                    >
                                        <MenuItem value="">
                                            -- Seleccione producto --
                                        </MenuItem>

                                        {productos.map((producto) => (
                                            <MenuItem
                                                key={producto._id}
                                                value={producto._id}
                                            >
                                                {producto.nombre_producto} (
                                                {producto.codigo_producto})
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                {!loadingExistencias &&
                                    !!transProducto &&
                                    existenciasProducto.length === 0 && (
                                        <Alert severity="warning">
                                            Este producto no tiene stock en ningún almacén,
                                            por lo que no se puede transferir.
                                        </Alert>
                                    )}

                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 1,
                                    }}
                                >
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Almacén de origen</InputLabel>
                                        <Select
                                            label="Almacén de origen"
                                            value={transOrigenAlm}
                                            onChange={(e) =>
                                                handleOrigenAlmacenChange(e.target.value)
                                            }
                                            disabled={
                                                !transProducto ||
                                                loadingExistencias ||
                                                loadingTransferencia ||
                                                almacenesOrigen.length === 0
                                            }
                                        >
                                            <MenuItem value="">-- Seleccione --</MenuItem>

                                            {almacenesOrigen.map((almacen) => (
                                                <MenuItem key={almacen._id} value={almacen._id}>
                                                    {almacen.nombre} — Stock: {almacen.total}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <FormControl fullWidth size="small">
                                        <InputLabel>Contenedor de origen</InputLabel>
                                        <Select
                                            label="Contenedor de origen"
                                            value={transOrigenCont}
                                            onChange={(e) =>
                                                handleOrigenContenedorChange(e.target.value)
                                            }
                                            disabled={
                                                !transOrigenAlm ||
                                                loadingExistencias ||
                                                loadingTransferencia
                                            }
                                        >
                                            <MenuItem value="">-- Seleccione --</MenuItem>

                                            {contenedoresOrigen.map((contenedor) => (
                                                <MenuItem
                                                    key={contenedor._id}
                                                    value={contenedor._id}
                                                >
                                                    {contenedor.nombre} — Stock: {contenedor.cantidad}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 1,
                                    }}
                                >
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Almacén de destino</InputLabel>
                                        <Select
                                            label="Almacén de destino"
                                            value={transDestinoAlm}
                                            onChange={(e) => {
                                                setTransDestinoAlm(e.target.value);
                                                setTransDestinoCont('');
                                            }}
                                            disabled={loadingDatos}
                                        >
                                            <MenuItem value="">-- Seleccione --</MenuItem>

                                            {almacenes.map((almacen) => (
                                                <MenuItem
                                                    key={almacen._id}
                                                    value={almacen._id}
                                                >
                                                    {almacen.nombreAlmacen}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <FormControl fullWidth size="small">
                                        <InputLabel>Contenedor de destino</InputLabel>
                                        <Select
                                            label="Contenedor de destino"
                                            value={transDestinoCont}
                                            onChange={(e) =>
                                                setTransDestinoCont(e.target.value)
                                            }
                                            disabled={
                                                !transDestinoAlm ||
                                                loadingDatos
                                            }
                                        >
                                            <MenuItem value="">-- Seleccione --</MenuItem>

                                            {contenedoresDestino.map((contenedor) => (
                                                <MenuItem
                                                    key={contenedor._id}
                                                    value={contenedor._id}
                                                >
                                                    {contenedor.nombreContenedor}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>

                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 1,
                                    }}
                                >
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="number"
                                        label="Cantidad a transferir"
                                        value={transCantidad}
                                        onChange={(e) => setTransCantidad(e.target.value)}
                                        error={!!errorCantidad}
                                        slotProps={{
                                            htmlInput: {
                                                min: 1,
                                                max: cantidadDisponible,
                                                step: 1,
                                            },
                                        }}
                                        helperText={
                                            errorCantidad ??
                                            (existenciaOrigen
                                                ? `Disponible en origen: ${cantidadDisponible}`
                                                : 'Seleccione almacén y contenedor de origen')
                                        }
                                        disabled={
                                            !existenciaOrigen ||
                                            loadingExistencias ||
                                            loadingTransferencia
                                        }
                                    />

                                    <DatePicker
                                        label="Fecha"
                                        value={transFecha}
                                        onChange={(value) =>
                                            value && setTransFecha(value)
                                        }
                                        slotProps={{
                                            textField: {
                                                fullWidth: true,
                                                size: 'small',
                                            },
                                        }}
                                    />
                                </Box>

                                <Button
                                    variant="contained"
                                    fullWidth
                                    startIcon={<SaveIcon />}
                                    onClick={realizarTransferencia}
                                    disabled={
                                        loadingTransferencia ||
                                        loadingDatos ||
                                        !transferenciaLista
                                    }
                                >
                                    {loadingTransferencia ? 'Guardando...' : 'Realizar Transferencia'}
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Box>
            </Box>
        </LocalizationProvider>
    );
}