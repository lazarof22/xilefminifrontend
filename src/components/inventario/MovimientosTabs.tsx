// src/components/MovimientosTab.tsx
import React, { useState, useEffect } from 'react';
import {
    Card, CardContent, Typography, Box, Divider, Chip, TextField, Button, Stack, Alert,
    FormControl, InputLabel, Select, MenuItem, InputAdornment,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SaveIcon from '@mui/icons-material/Save';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AddIcon from '@mui/icons-material/Add';
import CustomDataGridR, { type Column } from '../CustomDataGridR';
import NuevoProductoDialog, {
    type CategoriaOption,
    type EstadoOption,
    type ProductoCreado,
} from './Dialogs/NuevoProductoDialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── PALETA ────────────────────────────────────────────────────
const COLORS = {
    bg: '#0a0f0d',
    card: '#151a19',
    cardAlt: '#1a201e',
    border: 'rgba(255,255,255,0.04)',
    accent: '#00e5a0',
    accentSoft: 'rgba(0,229,160,0.08)',
    textMuted: '#9ca3af',
    textLight: '#e5e7eb',
    danger: '#ef4444',
};

// ─── INTERFACES ───────────────────────────────────────────────
interface Producto {
    id: string;
    nombre: string;
    stock: number;
    unidad: string;
    costo: number;
    almacenId: string;
    contenedorId: string;
}

interface Almacen {
    id: string;
    nombre: string;
}

interface Contenedor {
    id: string;
    nombre: string;
    almacenId: string;
}

interface Compra {
    id: string;
    fecha: string;
    productoId: string;
    productoNombre: string;
    cantidad: number;
    costoUnitario: number;
    total: number;
}

interface Transferencia {
    id: string;
    fecha: string;
    productoId: string;
    productoNombre: string;
    cantidad: number;
    origenAlmacen: string;
    origenContenedor: string;
    destinoAlmacen: string;
    destinoContenedor: string;
}

interface Ajuste {
    id: string;
    fecha: string;
    productoId: string;
    productoNombre: string;
    cantidad: number;
    tipo: 'entrada' | 'salida';
    motivo: string;
}

interface MovimientosTabProps {
    productos?: Producto[];
    almacenes?: Almacen[];
    contenedores?: Contenedor[];
}

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

const menuProps = {
    PaperProps: {
        sx: {
            bgcolor: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            '& .MuiMenuItem-root': { color: COLORS.textLight },
            '& .MuiMenuItem-root:hover': { bgcolor: 'rgba(0,229,160,0.08)' },
            '& .MuiMenuItem-root.Mui-selected': { bgcolor: 'rgba(0,229,160,0.14)' },
        },
    },
} as const;

const sectionTitleSx = {
    color: COLORS.accent,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: 1,
};

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────
export default function MovimientosTab({ productos: productosExt, almacenes: almacenesExt, contenedores: contenedoresExt }: MovimientosTabProps) {
    // Estados de datos
    const [productos, setProductos] = useState<Producto[]>([]);
    const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
    const [contenedores, setContenedores] = useState<Contenedor[]>([]);
    const [compras, setCompras] = useState<Compra[]>([]);
    const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
    const [ajustes, setAjustes] = useState<Ajuste[]>([]);
    const [movimientoCounter, setMovimientoCounter] = useState(1);
    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const [categorias, setCategorias] = useState<CategoriaOption[]>([]);
    const [estados, setEstados] = useState<EstadoOption[]>([]);

    // Formulario Compra
    const [compraProducto, setCompraProducto] = useState('');
    const [compraFecha, setCompraFecha] = useState<Dayjs>(dayjs());
    const [compraCantidad, setCompraCantidad] = useState('');
    const [compraCosto, setCompraCosto] = useState('');

    // Formulario Transferencia
    const [transProducto, setTransProducto] = useState('');
    const [transOrigenAlm, setTransOrigenAlm] = useState('');
    const [transOrigenCont, setTransOrigenCont] = useState('');
    const [transDestinoAlm, setTransDestinoAlm] = useState('');
    const [transDestinoCont, setTransDestinoCont] = useState('');
    const [transCantidad, setTransCantidad] = useState('');
    const [transFecha, setTransFecha] = useState<Dayjs>(dayjs());

    // Alert
    const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Cargar datos
    useEffect(() => {
        // Datos externos o localStorage
        const saved = localStorage.getItem('movimientos_data');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setCompras(parsed.compras || []);
                setTransferencias(parsed.transferencias || []);
                setAjustes(parsed.ajustes || []);
                setMovimientoCounter(parsed.counter || 1);
            } catch (e) { console.error(e); }
        }

        const savedProd = localStorage.getItem('productos_data');
        if (savedProd) {
            try { setProductos(JSON.parse(savedProd)); }
            catch (e) { console.error(e); }
        }

        const savedAlm = localStorage.getItem('almacenes_data');
        if (savedAlm) {
            try {
                const parsed = JSON.parse(savedAlm);
                setAlmacenes(parsed.almacenes || []);
                setContenedores(parsed.contenedores || []);
            } catch (e) { console.error(e); }
        }

        if (productosExt) setProductos(productosExt);
        if (almacenesExt) setAlmacenes(almacenesExt);
        if (contenedoresExt) setContenedores(contenedoresExt);
    }, [productosExt, almacenesExt, contenedoresExt]);

    // Cargar categorías y estados para el formulario de Nuevo Producto
    // NOTA: ajusta las rutas ('/categoria', '/estado') a los endpoints reales de tu API
    useEffect(() => {
        const cargarCatalogos = async () => {
            try {
                const [resCategorias, resEstados] = await Promise.all([
                    fetch(`${API_URL}/categoria`),
                    fetch(`${API_URL}/estado`),
                ]);
                if (resCategorias.ok) {
                    setCategorias(await resCategorias.json());
                }
                if (resEstados.ok) {
                    setEstados(await resEstados.json());
                }
            } catch (e) {
                console.error('No se pudieron cargar categorías/estados', e);
            }
        };
        cargarCatalogos();
    }, []);

    // ─── PRODUCTO CREADO DESDE EL DIALOG ─────────────────────────
    const handleProductoCreado = (producto: ProductoCreado) => {
        const nuevoProducto: Producto = {
            id: producto._id,
            nombre: producto.nombre_producto,
            stock: 0,
            unidad: '',
            costo: 0,
            almacenId: '',
            contenedorId: '',
        };

        const nuevosProductos = [...productos, nuevoProducto];
        setProductos(nuevosProductos);
        localStorage.setItem('productos_data', JSON.stringify(nuevosProductos));

        setAlert({ type: 'success', message: `Producto "${producto.nombre_producto}" agregado` });
        setTimeout(() => setAlert(null), 3000);
    };

    // Guardar
    const guardarDatos = (comps: Compra[], trans: Transferencia[], ajus: Ajuste[], counter: number) => {
        localStorage.setItem('movimientos_data', JSON.stringify({
            compras: comps,
            transferencias: trans,
            ajustes: ajus,
            counter
        }));
    };

    // ─── REGISTRAR COMPRA ───────────────────────────────────────
    const registrarCompra = () => {
        if (!compraProducto || !compraCantidad || !compraCosto || !compraFecha) {
            setAlert({ type: 'error', message: 'Complete todos los campos de la compra' });
            return;
        }

        const prod = productos.find(p => p.id === compraProducto);
        if (!prod) return;

        const cant = parseInt(compraCantidad);
        const costo = parseFloat(compraCosto);
        const total = cant * costo;
        const fechaStr = compraFecha.format('YYYY-MM-DD');

        const nuevaCompra: Compra = {
            id: `COMP-${String(movimientoCounter).padStart(6, '0')}`,
            fecha: fechaStr,
            productoId: compraProducto,
            productoNombre: prod.nombre,
            cantidad: cant,
            costoUnitario: costo,
            total
        };

        // Actualizar stock y costo del producto
        const nuevosProductos = productos.map(p =>
            p.id === compraProducto
                ? { ...p, stock: p.stock + cant, costo: costo }
                : p
        );

        // Registrar ajuste de entrada
        const nuevoAjuste: Ajuste = {
            id: `AJU-${String(movimientoCounter).padStart(6, '0')}`,
            fecha: fechaStr,
            productoId: compraProducto,
            productoNombre: prod.nombre,
            cantidad: cant,
            tipo: 'entrada',
            motivo: `Compra a $${costo.toFixed(2)} c/u`
        };

        const newCounter = movimientoCounter + 1;
        const nuevasCompras = [nuevaCompra, ...compras];
        const nuevosAjustes = [nuevoAjuste, ...ajustes];

        setCompras(nuevasCompras);
        setAjustes(nuevosAjustes);
        setProductos(nuevosProductos);
        setMovimientoCounter(newCounter);
        guardarDatos(nuevasCompras, transferencias, nuevosAjustes, newCounter);
        localStorage.setItem('productos_data', JSON.stringify(nuevosProductos));

        setCompraCantidad('');
        setCompraCosto('');
        setAlert({ type: 'success', message: `Compra registrada: ${cant} ${prod.unidad || 'unidades'} de ${prod.nombre}` });
        setTimeout(() => setAlert(null), 3000);
    };

    // ─── REALIZAR TRANSFERENCIA ─────────────────────────────────
    const realizarTransferencia = () => {
        if (!transProducto || !transOrigenAlm || !transOrigenCont || !transDestinoAlm || !transDestinoCont || !transCantidad || !transFecha) {
            setAlert({ type: 'error', message: 'Complete todos los campos de la transferencia' });
            return;
        }

        const prod = productos.find(p => p.id === transProducto);
        if (!prod) return;

        const cant = parseInt(transCantidad);
        if (prod.stock < cant) {
            setAlert({ type: 'error', message: `Stock insuficiente. Disponible: ${prod.stock}` });
            return;
        }

        const origenAlm = almacenes.find(a => a.id === transOrigenAlm);
        const origenCont = contenedores.find(c => c.id === transOrigenCont);
        const destinoAlm = almacenes.find(a => a.id === transDestinoAlm);
        const destinoCont = contenedores.find(c => c.id === transDestinoCont);
        const fechaStr = transFecha.format('YYYY-MM-DD');

        const nuevaTransferencia: Transferencia = {
            id: `TRANS-${String(movimientoCounter).padStart(6, '0')}`,
            fecha: fechaStr,
            productoId: transProducto,
            productoNombre: prod.nombre,
            cantidad: cant,
            origenAlmacen: origenAlm?.nombre || transOrigenAlm,
            origenContenedor: origenCont?.nombre || transOrigenCont,
            destinoAlmacen: destinoAlm?.nombre || transDestinoAlm,
            destinoContenedor: destinoCont?.nombre || transDestinoCont
        };

        // Actualizar stock y ubicación del producto
        const nuevosProductos = productos.map(p =>
            p.id === transProducto
                ? { ...p, stock: p.stock - cant, almacenId: transDestinoAlm, contenedorId: transDestinoCont }
                : p
        );

        // Ajustes de salida y entrada
        const ajusteSalida: Ajuste = {
            id: `AJU-S-${String(movimientoCounter).padStart(6, '0')}`,
            fecha: fechaStr,
            productoId: transProducto,
            productoNombre: prod.nombre,
            cantidad: cant,
            tipo: 'salida',
            motivo: `Transferencia desde ${origenAlm?.nombre || ''} - ${origenCont?.nombre || ''}`
        };

        const ajusteEntrada: Ajuste = {
            id: `AJU-E-${String(movimientoCounter + 1).padStart(6, '0')}`,
            fecha: fechaStr,
            productoId: transProducto,
            productoNombre: prod.nombre,
            cantidad: cant,
            tipo: 'entrada',
            motivo: `Transferencia a ${destinoAlm?.nombre || ''} - ${destinoCont?.nombre || ''}`
        };

        const newCounter = movimientoCounter + 2;
        const nuevasTransferencias = [nuevaTransferencia, ...transferencias];
        const nuevosAjustes = [ajusteSalida, ajusteEntrada, ...ajustes];

        setTransferencias(nuevasTransferencias);
        setAjustes(nuevosAjustes);
        setProductos(nuevosProductos);
        setMovimientoCounter(newCounter);
        guardarDatos(compras, nuevasTransferencias, nuevosAjustes, newCounter);
        localStorage.setItem('productos_data', JSON.stringify(nuevosProductos));

        setTransCantidad('');
        setAlert({ type: 'success', message: `Transferencia realizada: ${cant} ${prod.unidad || 'unidades'} de ${prod.nombre}` });
        setTimeout(() => setAlert(null), 3000);
    };

    // ─── COLUMNAS ───────────────────────────────────────────────
    const ajusteColumns: Column<Ajuste>[] = [
        { field: 'fecha', headerName: 'Fecha' },
        { field: 'productoNombre', headerName: 'Producto' },
        { field: 'cantidad', headerName: 'Cantidad', numeric: true },
        { field: 'tipo', headerName: 'Tipo', isStatusColumn: true },
        { field: 'motivo', headerName: 'Motivo' },
    ];

    // Contenedores filtrados por almacén
    const contenedoresOrigen = contenedores.filter(c => c.almacenId === transOrigenAlm);
    const contenedoresDestino = contenedores.filter(c => c.almacenId === transDestinoAlm);

    // ─── RENDER ─────────────────────────────────────────────────
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box>
                {/* Alertas */}
                {alert && (
                    <Alert
                        severity={alert.type}
                        sx={{
                            mb: 2, borderRadius: 2, mx: 1,
                            bgcolor: alert.type === 'success' ? 'rgba(0,229,160,0.1)' : 'rgba(239,68,68,0.1)',
                            color: alert.type === 'success' ? COLORS.accent : COLORS.danger,
                            border: `1px solid ${alert.type === 'success' ? 'rgba(0,229,160,0.3)' : 'rgba(239,68,68,0.3)'}`,
                            '& .MuiAlert-icon': { color: alert.type === 'success' ? COLORS.accent : COLORS.danger },
                        }}
                        onClose={() => setAlert(null)}
                    >
                        {alert.message}
                    </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', lg: 'row' }, mb: 2 }}>
                    {/* ═══════════════════════════════════════════════════
                        CARD IZQUIERDO: REGISTRAR COMPRA
                    ═══════════════════════════════════════════════════ */}
                    <Card
                        elevation={0}
                        sx={{
                            flex: 1,
                            borderRadius: 3,
                            border: `1px solid ${COLORS.border}`,
                            bgcolor: COLORS.card,
                            boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
                            overflow: 'hidden',
                        }}
                    >
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h6" sx={sectionTitleSx}>
                                    <ShoppingCartIcon sx={{ width: 24, height: 24, color: COLORS.accent }} />
                                    Registrar Compra
                                </Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => setOpenCreateDialog(true)}
                                >
                                    Nuevo Producto
                                </Button>

                                <NuevoProductoDialog
                                    open={openCreateDialog}
                                    onClose={() => setOpenCreateDialog(false)}
                                    categoriasBackend={categorias}          // ← NUEVO
                                    estadosBackend={estados}                // ← NUEVO
                                    onProductoCreado={handleProductoCreado} // ← NUEVO
                                />
                            </Box>

                            <Divider sx={{ mb: 2, borderColor: COLORS.border }} />

                            <Stack spacing={2}>
                                <FormControl fullWidth size="small" sx={{ '& .MuiInputLabel-root': { color: COLORS.textMuted }, '& .MuiInputLabel-root.Mui-focused': { color: COLORS.accent } }}>
                                    <InputLabel>Producto</InputLabel>
                                    <Select
                                        label="Producto"
                                        value={compraProducto}
                                        onChange={(e) => setCompraProducto(e.target.value)}
                                        sx={selectSx}
                                        MenuProps={menuProps}
                                    >
                                        <MenuItem value="">-- Seleccione Producto --</MenuItem>
                                        {productos.map(p => (
                                            <MenuItem key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock})</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <DatePicker
                                    label="Fecha"
                                    value={compraFecha}
                                    onChange={(newValue) => newValue && setCompraFecha(newValue)}
                                    slotProps={{
                                        textField: { fullWidth: true, size: 'small', sx: fieldSx },
                                    }}
                                />

                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="number"
                                        label="Cantidad"
                                        placeholder="0"
                                        value={compraCantidad}
                                        onChange={(e) => setCompraCantidad(e.target.value)}
                                        sx={fieldSx}
                                    />
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="number"
                                        label="Costo Unitario"
                                        placeholder="0.00"
                                        value={compraCosto}
                                        onChange={(e) => setCompraCosto(e.target.value)}
                                        sx={fieldSx}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start" sx={{ color: COLORS.textMuted }}>$</InputAdornment>,
                                        }}
                                    />
                                </Box>

                                <Button
                                    variant="contained"
                                    fullWidth
                                    startIcon={<SaveIcon />}
                                    onClick={registrarCompra}
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        borderRadius: 2,
                                        py: 1,
                                    }}
                                >
                                    Registrar Compra
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>

                    {/* ═══════════════════════════════════════════════════
                        CARD DERECHO: TRANSFERENCIA
                    ═══════════════════════════════════════════════════ */}
                    <Card
                        elevation={0}
                        sx={{
                            flex: 1,
                            borderRadius: 3,
                            border: `1px solid ${COLORS.border}`,
                            bgcolor: COLORS.card,
                            boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
                            overflow: 'hidden',
                        }}
                    >
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" sx={sectionTitleSx}>
                                    <SwapHorizIcon sx={{ width: 24, height: 24, color: COLORS.accent }} />
                                    Transferencia
                                </Typography>
                            </Box>

                            <Divider sx={{ mb: 2, borderColor: COLORS.border }} />

                            <Stack spacing={2}>
                                <FormControl fullWidth size="small" sx={{ '& .MuiInputLabel-root': { color: COLORS.textMuted }, '& .MuiInputLabel-root.Mui-focused': { color: COLORS.accent } }}>
                                    <InputLabel>Producto</InputLabel>
                                    <Select
                                        label="Producto"
                                        value={transProducto}
                                        onChange={(e) => setTransProducto(e.target.value)}
                                        sx={selectSx}
                                        MenuProps={menuProps}
                                    >
                                        <MenuItem value="">-- Seleccione Producto --</MenuItem>
                                        {productos.map(p => (
                                            <MenuItem key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock})</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <FormControl fullWidth size="small" sx={{ '& .MuiInputLabel-root': { color: COLORS.textMuted }, '& .MuiInputLabel-root.Mui-focused': { color: COLORS.accent } }}>
                                        <InputLabel>Origen Almacén</InputLabel>
                                        <Select
                                            label="Origen Almacén"
                                            value={transOrigenAlm}
                                            onChange={(e) => { setTransOrigenAlm(e.target.value); setTransOrigenCont(''); }}
                                            sx={selectSx}
                                            MenuProps={menuProps}
                                        >
                                            <MenuItem value="">-- Origen Almacén --</MenuItem>
                                            {almacenes.map(a => (
                                                <MenuItem key={a.id} value={a.id}>{a.nombre}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <FormControl fullWidth size="small" sx={{ '& .MuiInputLabel-root': { color: COLORS.textMuted }, '& .MuiInputLabel-root.Mui-focused': { color: COLORS.accent } }}>
                                        <InputLabel>Origen Contenedor</InputLabel>
                                        <Select
                                            label="Origen Contenedor"
                                            value={transOrigenCont}
                                            onChange={(e) => setTransOrigenCont(e.target.value)}
                                            sx={selectSx}
                                            MenuProps={menuProps}
                                        >
                                            <MenuItem value="">-- Origen Contenedor --</MenuItem>
                                            {contenedoresOrigen.map(c => (
                                                <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>

                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <FormControl fullWidth size="small" sx={{ '& .MuiInputLabel-root': { color: COLORS.textMuted }, '& .MuiInputLabel-root.Mui-focused': { color: COLORS.accent } }}>
                                        <InputLabel>Destino Almacén</InputLabel>
                                        <Select
                                            label="Destino Almacén"
                                            value={transDestinoAlm}
                                            onChange={(e) => { setTransDestinoAlm(e.target.value); setTransDestinoCont(''); }}
                                            sx={selectSx}
                                            MenuProps={menuProps}
                                        >
                                            <MenuItem value="">-- Destino Almacén --</MenuItem>
                                            {almacenes.map(a => (
                                                <MenuItem key={a.id} value={a.id}>{a.nombre}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <FormControl fullWidth size="small" sx={{ '& .MuiInputLabel-root': { color: COLORS.textMuted }, '& .MuiInputLabel-root.Mui-focused': { color: COLORS.accent } }}>
                                        <InputLabel>Destino Contenedor</InputLabel>
                                        <Select
                                            label="Destino Contenedor"
                                            value={transDestinoCont}
                                            onChange={(e) => setTransDestinoCont(e.target.value)}
                                            sx={selectSx}
                                            MenuProps={menuProps}
                                        >
                                            <MenuItem value="">-- Destino Contenedor --</MenuItem>
                                            {contenedoresDestino.map(c => (
                                                <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>

                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="number"
                                        label="Cantidad"
                                        placeholder="0"
                                        value={transCantidad}
                                        onChange={(e) => setTransCantidad(e.target.value)}
                                        sx={fieldSx}
                                    />
                                    <DatePicker
                                        label="Fecha"
                                        value={transFecha}
                                        onChange={(newValue) => newValue && setTransFecha(newValue)}
                                        slotProps={{
                                            textField: { fullWidth: true, size: 'small', sx: fieldSx },
                                        }}
                                    />
                                </Box>

                                <Button
                                    variant="contained"
                                    fullWidth
                                    startIcon={<SwapHorizIcon />}
                                    onClick={realizarTransferencia}
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        borderRadius: 2,
                                        py: 1,
                                    }}
                                >
                                    Transferir
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Box>

                {/* ═══════════════════════════════════════════════════
                    CARD INFERIOR: HISTORIAL DE AJUSTES
                ═══════════════════════════════════════════════════ */}
                <Card
                    elevation={0}
                    sx={{
                        borderRadius: 3,
                        border: `1px solid ${COLORS.border}`,
                        bgcolor: COLORS.card,
                        boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
                        overflow: 'hidden',
                        m: 1
                    }}
                >
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h6" sx={sectionTitleSx}>
                                <ReceiptLongIcon sx={{ width: 24, height: 24, color: COLORS.accent }} />
                                Historial de Ajustes
                            </Typography>
                            <Chip
                                label={`${ajustes.length} registros`}
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

                        <CustomDataGridR<Ajuste>
                            rows={ajustes}
                            columns={ajusteColumns}
                            getRowId={(row) => row.id}
                            title="Movimientos de Inventario"
                            deleteConfig={{
                                baseUrl: `${API_URL}/ajustes`,
                                onSuccess: () => {
                                    setAlert({ type: 'success', message: 'Ajuste eliminado' });
                                    setTimeout(() => setAlert(null), 3000);
                                }
                            }}
                            getRowAvatar={(row) => row.tipo === 'entrada' ? '+' : '-'}
                        />
                    </CardContent>
                </Card>
            </Box>
        </LocalizationProvider>
    );
}