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

    const contenedoresOrigen = useMemo(
        () =>
            contenedores.filter((contenedor) => {
                const almacenId =
                    typeof contenedor.almacen === 'string'
                        ? contenedor.almacen
                        : contenedor.almacen?._id;
                return almacenId === transOrigenAlm;
            }),
        [contenedores, transOrigenAlm]
    );

    const contenedoresDestino = useMemo(
        () =>
            contenedores.filter((contenedor) => {
                const almacenId =
                    typeof contenedor.almacen === 'string'
                        ? contenedor.almacen
                        : contenedor.almacen?._id;
                return almacenId === transDestinoAlm;
            }),
        [contenedores, transDestinoAlm]
    );

    const validarProducto = (): boolean => {
        const nextErrors: FormErrors = {};
        const cantidadNumber = Number(cantidad);
        const costoNumber = Number(precioCosto);

        if (!productoForm.codigo_producto.trim()) nextErrors.codigo_producto = 'El código es obligatorio';
        if (!productoForm.nombre_producto.trim()) nextErrors.nombre_producto = 'El nombre es obligatorio';
        if (!productoForm.categoria_producto) nextErrors.categoria_producto = 'Seleccione una categoría';
        if (!productoForm.estado) nextErrors.estado = 'Seleccione un estado';
        if (!productoForm.almacen) nextErrors.almacen = 'Seleccione un almacén';
        if (!productoForm.contenedor) nextErrors.contenedor = 'Seleccione un contenedor';
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
    // de compras del backend, sin inventar un endpoint.
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
                                    onChange={(e) => handleProductChange('codigo_producto', e.target.value)}
                                    error={!!errors.codigo_producto}
                                    helperText={errors.codigo_producto}
                                    disabled={loadingCompra}
                                />

                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Nombre del producto"
                                    value={productoForm.nombre_producto}
                                    onChange={(e) => handleProductChange('nombre_producto', e.target.value)}
                                    error={!!errors.nombre_producto}
                                    helperText={errors.nombre_producto}
                                    disabled={loadingCompra}
                                />

                                <FormControl fullWidth size="small" error={!!errors.categoria_producto}>
                                    <InputLabel>Categoría</InputLabel>
                                    <Select
                                        label="Categoría"
                                        value={productoForm.categoria_producto}
                                        onChange={(e) => handleProductChange('categoria_producto', e.target.value)}
                                        disabled={loadingDatos || loadingCompra}
                                    >
                                        <MenuItem value="">-- Seleccione categoría --</MenuItem>
                                        {categorias.filter((c) => c.activo).map((categoria) => (
                                            <MenuItem key={categoria._id} value={categoria.codigo}>
                                                {categoria.nombre}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth size="small" error={!!errors.estado}>
                                    <InputLabel>Estado</InputLabel>
                                    <Select
                                        label="Estado"
                                        value={productoForm.estado}
                                        onChange={(e) => handleProductChange('estado', e.target.value)}
                                        disabled={loadingDatos || loadingCompra}
                                    >
                                        <MenuItem value="">-- Seleccione estado --</MenuItem>
                                        {estados.filter((e) => e.activo).map((estado) => (
                                            <MenuItem key={estado._id} value={estado.codigo}>
                                                {estado.nombre}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                    <FormControl fullWidth size="small" error={!!errors.almacen}>
                                        <InputLabel>Almacén</InputLabel>
                                        <Select
                                            label="Almacén"
                                            value={productoForm.almacen}
                                            onChange={(e) => handleProductChange('almacen', e.target.value)}
                                            disabled={loadingDatos || loadingCompra}
                                        >
                                            <MenuItem value="">-- Seleccione almacén --</MenuItem>
                                            {almacenes.map((almacen) => (
                                                <MenuItem key={almacen._id} value={almacen._id}>
                                                    {almacen.nombreAlmacen}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <FormControl fullWidth size="small" error={!!errors.contenedor}>
                                        <InputLabel>Contenedor</InputLabel>
                                        <Select
                                            label="Contenedor"
                                            value={productoForm.contenedor}
                                            onChange={(e) => handleProductChange('contenedor', e.target.value)}
                                            disabled={!productoForm.almacen || loadingDatos || loadingCompra}
                                        >
                                            <MenuItem value="">-- Seleccione contenedor --</MenuItem>
                                            {contenedoresProducto.map((contenedor) => (
                                                <MenuItem key={contenedor._id} value={contenedor._id}>
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
                                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                                    disabled={loadingCompra}
                                />

                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
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
                                        slotProps={{ htmlInput: { min: 0, step: 1 } }}
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
                                            htmlInput: { min: 0, step: '0.01' },
                                            input: {
                                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
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
                                        onChange={(e) => setTransProducto(e.target.value)}
                                        disabled={loadingDatos}
                                    >
                                        <MenuItem value="">-- Seleccione producto --</MenuItem>
                                        {productos.map((producto) => (
                                            <MenuItem key={producto._id} value={producto._id}>
                                                {producto.nombre_producto} ({producto.codigo_producto})
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Almacén de origen</InputLabel>
                                        <Select
                                            label="Almacén de origen"
                                            value={transOrigenAlm}
                                            onChange={(e) => {
                                                setTransOrigenAlm(e.target.value);
                                                setTransOrigenCont('');
                                            }}
                                            disabled={loadingDatos}
                                        >
                                            <MenuItem value="">-- Seleccione --</MenuItem>
                                            {almacenes.map((almacen) => (
                                                <MenuItem key={almacen._id} value={almacen._id}>
                                                    {almacen.nombreAlmacen}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <FormControl fullWidth size="small">
                                        <InputLabel>Contenedor de origen</InputLabel>
                                        <Select
                                            label="Contenedor de origen"
                                            value={transOrigenCont}
                                            onChange={(e) => setTransOrigenCont(e.target.value)}
                                            disabled={!transOrigenAlm || loadingDatos}
                                        >
                                            <MenuItem value="">-- Seleccione --</MenuItem>
                                            {contenedoresOrigen.map((contenedor) => (
                                                <MenuItem key={contenedor._id} value={contenedor._id}>
                                                    {contenedor.nombreContenedor}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>

                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
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
                                                <MenuItem key={almacen._id} value={almacen._id}>
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
                                            onChange={(e) => setTransDestinoCont(e.target.value)}
                                            disabled={!transDestinoAlm || loadingDatos}
                                        >
                                            <MenuItem value="">-- Seleccione --</MenuItem>
                                            {contenedoresDestino.map((contenedor) => (
                                                <MenuItem key={contenedor._id} value={contenedor._id}>
                                                    {contenedor.nombreContenedor}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>

                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="number"
                                        label="Cantidad"
                                        value={transCantidad}
                                        onChange={(e) => setTransCantidad(e.target.value)}
                                        slotProps={{ htmlInput: { min: 1, step: 1 } }}
                                    />
                                    <DatePicker
                                        label="Fecha"
                                        value={transFecha}
                                        onChange={(value) => value && setTransFecha(value)}
                                        slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                                    />
                                </Box>

                                <Alert severity="info">
                                    Los datos de transferencia ya se cargan desde MongoDB. La operación de transferencia se conectará cuando esté definido el endpoint correspondiente del backend.
                                </Alert>
                            </Stack>
                        </CardContent>
                    </Card>
                </Box>
            </Box>
        </LocalizationProvider>
    );
}
