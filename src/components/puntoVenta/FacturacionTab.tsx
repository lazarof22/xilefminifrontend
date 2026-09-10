// src/components/FacturacionTab.tsx
import React, { useState, useEffect } from 'react';
import {
    Card, CardContent, Typography, Box, IconButton, Button,
    TextField, Divider, Chip, Avatar, Stack, Alert, Dialog,
    DialogTitle, DialogContent, DialogActions, Grid, MenuItem,
    Select, FormControl, InputLabel, type SelectChangeEvent, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from "@mui/icons-material/Delete";
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintIcon from '@mui/icons-material/Print';
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from '@mui/icons-material/Close';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import CustomDataGridR, { type Column } from '../CustomDataGridR';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

interface ItemFactura {
    id: string;
    productoId: string;
    productoNombre: string;
    cantidad: number;
    precio: number;
    costo: number;
    descuentoPct: number;
    descuentoMonto: number;
    recargo: number;
    total: number;
}

interface Factura {
    id: string;
    numero: number;
    fecha: string;
    cliente: string;
    nit: string;
    direccion: string;
    telefono: string;
    email: string;
    metodoPago: string;
    items: ItemFactura[];
    subtotal: number;
    descuentoTotal: number;
    recargoTotal: number;
    total: number;
    estado: 'confirmada' | 'ajustada' | 'anulada';
    tipo: 'factura_normal' | 'ajuste';
    impreso: boolean;
}

interface FacturacionTabProps {
    productos: ProductoAPI[];
    onFacturaEmitida?: (factura: Factura) => void;
}

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────
export default function FacturacionTab({ productos, onFacturaEmitida }: FacturacionTabProps) {
    // Estados del formulario de factura
    const [cliente, setCliente] = useState('');
    const [nit, setNit] = useState('');
    const [direccion, setDireccion] = useState('');
    const [telefono, setTelefono] = useState('');
    const [email, setEmail] = useState('');
    const [metodoPago, setMetodoPago] = useState('efectivo');

    // Estados de items
    const [items, setItems] = useState<ItemFactura[]>([]);
    const [productoSeleccionado, setProductoSeleccionado] = useState('');
    const [cantidad, setCantidad] = useState('');
    const [precioVenta, setPrecioVenta] = useState('');
    const [descuentoPct, setDescuentoPct] = useState('');
    const [descuentoMonto, setDescuentoMonto] = useState('');
    const [recargo, setRecargo] = useState('');

    // Estados de facturas
    const [facturas, setFacturas] = useState<Factura[]>([]);
    const [facturaCounter, setFacturaCounter] = useState(1);

    // Modal de vista de factura
    const [openFacturaModal, setOpenFacturaModal] = useState(false);
    const [facturaActual, setFacturaActual] = useState<Factura | null>(null);

    // Modal de ticket
    const [openTicketModal, setOpenTicketModal] = useState(false);
    const [ticketData, setTicketData] = useState<{ factura: Factura; duplicado: boolean } | null>(null);

    // Snackbar/Alert
    const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Cargar facturas del localStorage al iniciar
    useEffect(() => {
        const saved = localStorage.getItem('facturas_historial');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setFacturas(parsed.facturas || []);
                setFacturaCounter(parsed.counter || 1);
            } catch (e) {
                console.error('Error cargando facturas:', e);
            }
        }
    }, []);

    // Guardar facturas en localStorage
    const guardarFacturas = (nuevasFacturas: Factura[], nuevoCounter: number) => {
        localStorage.setItem('facturas_historial', JSON.stringify({
            facturas: nuevasFacturas,
            counter: nuevoCounter
        }));
    };

    // ─── AGREGAR ITEM A LA FACTURA ──────────────────────────────
    const agregarItem = () => {
        if (!productoSeleccionado || !cantidad || !precioVenta) {
            setAlert({ type: 'error', message: 'Complete los campos obligatorios: Producto, Cantidad y Precio' });
            return;
        }

        const prod = productos.find(p => p._id === productoSeleccionado);
        if (!prod) return;

        const qty = parseInt(cantidad);
        const price = parseFloat(precioVenta);
        const dPct = parseFloat(descuentoPct) || 0;
        const dMonto = parseFloat(descuentoMonto) || 0;
        const rec = parseFloat(recargo) || 0;

        if (qty > prod.stock_inicial) {
            setAlert({ type: 'error', message: `Stock insuficiente. Disponible: ${prod.stock_inicial}` });
            return;
        }

        const total = (price * qty) - dMonto - (price * qty * dPct / 100) + rec;

        const nuevoItem: ItemFactura = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            productoId: prod._id,
            productoNombre: prod.nombre_producto,
            cantidad: qty,
            precio: price,
            costo: prod.precio_compra,
            descuentoPct: dPct,
            descuentoMonto: dMonto,
            recargo: rec,
            total: Math.max(0, total)
        };

        setItems(prev => [...prev, nuevoItem]);

        // Limpiar campos
        setProductoSeleccionado('');
        setCantidad('');
        setPrecioVenta('');
        setDescuentoPct('');
        setDescuentoMonto('');
        setRecargo('');
        setAlert(null);
    };

    // ─── ELIMINAR ITEM ──────────────────────────────────────────
    const eliminarItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    // ─── CALCULAR TOTALES ───────────────────────────────────────
    const subtotal = items.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const descuentoTotal = items.reduce((acc, item) => acc + item.descuentoMonto + (item.precio * item.cantidad * item.descuentoPct / 100), 0);
    const recargoTotal = items.reduce((acc, item) => acc + item.recargo, 0);
    const totalFactura = items.reduce((acc, item) => acc + item.total, 0);

    // ─── EMITIR FACTURA ─────────────────────────────────────────
    const emitirFactura = (tipo: 'factura_normal' | 'ajuste' = 'factura_normal') => {
        if (items.length === 0) {
            setAlert({ type: 'error', message: 'Agregue al menos un producto' });
            return;
        }

        const fecha = new Date().toISOString().split('T')[0];
        const numero = facturaCounter;

        const nuevaFactura: Factura = {
            id: `FAC-${String(numero).padStart(6, '0')}`,
            numero,
            fecha,
            cliente: cliente.trim() || 'Venta al público',
            nit: nit.trim() || '—',
            direccion: direccion.trim(),
            telefono: telefono.trim(),
            email: email.trim(),
            metodoPago,
            items: [...items],
            subtotal,
            descuentoTotal,
            recargoTotal,
            total: totalFactura,
            estado: 'confirmada',
            tipo,
            impreso: false
        };

        const nuevasFacturas = [nuevaFactura, ...facturas];
        const nuevoCounter = numero + 1;

        setFacturas(nuevasFacturas);
        setFacturaCounter(nuevoCounter);
        guardarFacturas(nuevasFacturas, nuevoCounter);

        // Notificar al padre
        onFacturaEmitida?.(nuevaFactura);

        // Mostrar modal
        setFacturaActual(nuevaFactura);
        setOpenFacturaModal(true);

        // Limpiar formulario
        setItems([]);
        setCliente('');
        setNit('');
        setDireccion('');
        setTelefono('');
        setEmail('');
        setMetodoPago('efectivo');
        setAlert({ type: 'success', message: '✅ Factura emitida correctamente' });

        setTimeout(() => setAlert(null), 3000);
    };

    // ─── ANULAR FACTURA ─────────────────────────────────────────
    const anularFactura = (id: string) => {
        if (!confirm('¿Está seguro de anular esta factura?')) return;

        const nuevasFacturas = facturas.map(f =>
            f.id === id ? { ...f, estado: 'anulada' as const } : f
        );
        setFacturas(nuevasFacturas);
        guardarFacturas(nuevasFacturas, facturaCounter);
        setAlert({ type: 'success', message: 'Factura anulada' });
        setTimeout(() => setAlert(null), 3000);
    };

    // ─── VER FACTURA ────────────────────────────────────────────
    const verFactura = (factura: Factura) => {
        setFacturaActual(factura);
        setOpenFacturaModal(true);
    };

    // ─── GENERAR TICKET ─────────────────────────────────────────
    const generarTicket = (factura: Factura) => {
        const yaImpreso = factura.impreso;
        const nuevasFacturas = facturas.map(f =>
            f.id === factura.id ? { ...f, impreso: true } : f
        );
        setFacturas(nuevasFacturas);
        guardarFacturas(nuevasFacturas, facturaCounter);

        setTicketData({ factura, duplicado: yaImpreso });
        setOpenTicketModal(true);
    };

    // ─── IMPRIMIR FACTURA ───────────────────────────────────────
    const imprimirFactura = () => {
        if (!facturaActual) return;
        const contenido = document.getElementById('factura-print-content');
        if (!contenido) return;

        const w = window.open('', '_blank', 'width=800,height=600');
        if (!w) { window.alert('Permita ventanas emergentes'); return; }

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
    };

    // ─── IMPRIMIR TICKET ────────────────────────────────────────
    const imprimirTicket = () => {
        const contenido = document.getElementById('ticket-print-content');
        if (!contenido) return;

        const w = window.open('', '_blank', 'width=300,height=400');
        if (!w) { window.alert('Permita ventanas emergentes'); return; }

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
    const facturaColumns: Column<Factura>[] = [
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
            {/* Alertas */}
            {alert && (
                <Alert
                    severity={alert.type}
                    sx={{ mb: 2, borderRadius: 2 }}
                    onClose={() => setAlert(null)}
                >
                    {alert.message}
                </Alert>
            )}

            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid rgba(0,0,0,0.04)",
                    bgcolor: "#f8f9fa",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                    overflow: "hidden",
                    m: 1
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                        <Typography variant="h6"
                            sx={{
                                background: "linear-gradient(135deg, rgba(0, 89, 255, 0.84), rgba(230, 21, 118, 0.9))",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}>
                            <ReceiptLongIcon sx={{ fill: 'url(#iconGradient)', width: 24, height: 24 }} />
                            <svg width="0" height="0">
                                <defs>
                                    <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="rgba(0, 89, 255, 0.84)" />
                                        <stop offset="100%" stopColor="rgba(230, 21, 118, 0.9)" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            Nueva Factura
                        </Typography>
                        <Chip
                            label={`${items.length} items`}
                            size="small"
                            sx={{
                                bgcolor: 'rgba(10, 83, 218, 0.1)',
                                color: 'rgb(10, 83, 218)',
                                fontWeight: 600,
                                borderRadius: 2
                            }}
                        />
                    </Box>

                    <Divider sx={{ mb: 3 }} />

                    {/* Layout principal: dos columnas separadas por divider vertical */}
                    <Box sx={{ display: 'flex', gap: 0, mb: 3 }}>

                        {/* ── Columna izquierda: Datos del Cliente ── */}
                        <Box sx={{ flex: 1, pr: 3 }}>
                            <Typography variant="subtitle2" sx={{ color: '#888', fontWeight: 600, mb: 1.5, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                                Datos del Cliente
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="Razón Social / Cliente"
                                        placeholder="Nombre completo"
                                        value={cliente}
                                        onChange={(e) => setCliente(e.target.value)}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 1, bgcolor: '#f8f9fa',
                                                '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' },
                                                '&:hover fieldset': { borderColor: 'rgba(10, 83, 218, 0.3)' },
                                                '&.Mui-focused fieldset': { borderColor: 'rgb(10, 83, 218)' },
                                            }
                                        }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="NIT / Carnet Identidad"
                                        placeholder="NIT o CI"
                                        value={nit}
                                        onChange={(e) => setNit(e.target.value)}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 1, bgcolor: '#f8f9fa',
                                                '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' },
                                                '&:hover fieldset': { borderColor: 'rgba(10, 83, 218, 0.3)' },
                                                '&.Mui-focused fieldset': { borderColor: 'rgb(10, 83, 218)' },
                                            }
                                        }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="Dirección"
                                        placeholder="Dirección"
                                        value={direccion}
                                        onChange={(e) => setDireccion(e.target.value)}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 1, bgcolor: '#f8f9fa',
                                                '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' },
                                                '&:hover fieldset': { borderColor: 'rgba(10, 83, 218, 0.3)' },
                                                '&.Mui-focused fieldset': { borderColor: 'rgb(10, 83, 218)' },
                                            }
                                        }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="Teléfono"
                                        placeholder="Teléfono"
                                        value={telefono}
                                        onChange={(e) => setTelefono(e.target.value)}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 1, bgcolor: '#f8f9fa',
                                                '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' },
                                                '&:hover fieldset': { borderColor: 'rgba(10, 83, 218, 0.3)' },
                                                '&.Mui-focused fieldset': { borderColor: 'rgb(10, 83, 218)' },
                                            }
                                        }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="Email" type="email"
                                        placeholder="Email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 1, bgcolor: '#f8f9fa',
                                                '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' },
                                                '&:hover fieldset': { borderColor: 'rgba(10, 83, 218, 0.3)' },
                                                '&.Mui-focused fieldset': { borderColor: 'rgb(10, 83, 218)' },
                                            }
                                        }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Método de Pago</InputLabel>
                                        <Select
                                            value={metodoPago}
                                            label="Método de Pago"
                                            onChange={(e: SelectChangeEvent) => setMetodoPago(e.target.value)}
                                            sx={{
                                                borderRadius: 1, bgcolor: '#f8f9fa',
                                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.06)' },
                                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(10, 83, 218, 0.3)' },
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'rgb(10, 83, 218)' },
                                            }}
                                        >
                                            <MenuItem value="efectivo">Efectivo</MenuItem>
                                            <MenuItem value="transferencia">Transferencia</MenuItem>
                                            <MenuItem value="credito">Crédito</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>
                        </Box>

                        {/* ── Divider vertical ── */}
                        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                        {/* ── Columna derecha: Agregar Producto ── */}
                        <Box sx={{ flex: 1, pl: 3, display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="subtitle2" sx={{ color: '#888', fontWeight: 600, mb: 1.5, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                                Agregar Producto
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12 }}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Producto</InputLabel>
                                        <Select
                                            value={productoSeleccionado}
                                            label="Producto"
                                            onChange={(e: SelectChangeEvent) => {
                                                const prod = productos.find(p => p._id === e.target.value);
                                                setProductoSeleccionado(e.target.value);
                                                if (prod) setPrecioVenta(prod.precio_venta.toString());
                                            }}
                                            sx={{
                                                borderRadius: 1, bgcolor: '#f8f9fa',
                                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.06)' },
                                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(10, 83, 218, 0.3)' },
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'rgb(10, 83, 218)' },
                                            }}
                                        >
                                            <MenuItem value=""><em>Seleccione un producto</em></MenuItem>
                                            {productos.map(prod => (
                                                <MenuItem key={prod._id} value={prod._id}>
                                                    {prod.nombre_producto} (Stock: {prod.stock_inicial})
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="Cantidad" type="number" placeholder="0"
                                        value={cantidad}
                                        onChange={(e) => setCantidad(e.target.value)}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, bgcolor: '#f8f9fa', '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' } } }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="Precio Venta" type="number" placeholder="0.00"
                                        value={precioVenta}
                                        onChange={(e) => setPrecioVenta(e.target.value)}
                                        slotProps={{
                                            htmlInput: { step: '0.01' },
                                            input: {
                                                endAdornment: productoSeleccionado ? (
                                                    <Typography variant="caption" sx={{ color: '#888', mr: 1 }}>
                                                        Ref: {productos.find(p => p._id === productoSeleccionado)?.precio_venta.toFixed(2)}
                                                    </Typography>
                                                ) : null
                                            }
                                        }}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, bgcolor: '#f8f9fa', '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' } } }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="Descuento en %" type="number" placeholder="0"
                                        value={descuentoPct}
                                        onChange={(e) => setDescuentoPct(e.target.value)}
                                        slotProps={{ htmlInput: { step: '0.1' } }}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, bgcolor: '#f8f9fa', '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' } } }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="Descuento en $" type="number" placeholder="0.00"
                                        value={descuentoMonto}
                                        onChange={(e) => setDescuentoMonto(e.target.value)}
                                        slotProps={{ htmlInput: { step: '0.01' } }}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, bgcolor: '#f8f9fa', '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' } } }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="Recargo" type="number" placeholder="0.00"
                                        value={recargo}
                                        onChange={(e) => setRecargo(e.target.value)}
                                        slotProps={{ htmlInput: { step: '0.01' } }}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, bgcolor: '#f8f9fa', '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' } } }}
                                    />
                                </Grid>
                            </Grid>

                            {/* Botón al fondo de la columna derecha */}
                            <Box sx={{ mt: 'auto', pt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={agregarItem}
                                    sx={{
                                        background: "linear-gradient(135deg, rgb(36, 236, 9), rgba(202, 183, 14, 0.9))",
                                        color: "#fff",
                                        textTransform: "none",
                                        fontWeight: 600,
                                        borderRadius: 2,
                                        px: 3,
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
                        </Box>

                    </Box>

                    {/* Tabla de Items */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" sx={{ color: '#888', fontWeight: 600, mb: 1.5, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                            Detalle de la Factura
                        </Typography>

                        {items.length === 0 ? (
                            <Box sx={{
                                textAlign: 'center',
                                py: 4,
                                bgcolor: '#f8f9fa',
                                borderRadius: 2,
                                border: '1px dashed rgba(0,0,0,0.1)'
                            }}>
                                <ShoppingCartIcon sx={{ fontSize: 40, color: '#ddd', mb: 1 }} />
                                <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                                    No hay productos agregados
                                </Typography>
                            </Box>
                        ) : (
                            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid rgba(0,0,0,0.06)' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                            <TableCell sx={{ fontWeight: 600, color: '#888', fontSize: '0.75rem' }}>Producto</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 600, color: '#888', fontSize: '0.75rem' }}>Cant</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600, color: '#888', fontSize: '0.75rem' }}>Precio</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 600, color: '#888', fontSize: '0.75rem' }}>Dto%</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600, color: '#888', fontSize: '0.75rem' }}>Dto$</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600, color: '#888', fontSize: '0.75rem' }}>Recargo</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600, color: '#888', fontSize: '0.75rem' }}>Total</TableCell>
                                            <TableCell align="center" sx={{ width: 50 }}></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {items.map((item) => (
                                            <TableRow
                                                key={item.id}
                                                sx={{
                                                    '&:hover': { bgcolor: 'rgba(10, 83, 218, 0.02)' },
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <TableCell sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                                                    {item.productoNombre}
                                                </TableCell>
                                                <TableCell align="center">{item.cantidad}</TableCell>
                                                <TableCell align="right">{item.precio.toFixed(2)}</TableCell>
                                                <TableCell align="center">{item.descuentoPct}%</TableCell>
                                                <TableCell align="right">{item.descuentoMonto.toFixed(2)}</TableCell>
                                                <TableCell align="right">{item.recargo.toFixed(2)}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, color: '#1a1a2e' }}>
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
                        <Box sx={{ mt: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                                <Typography color="text.secondary" variant="body2">Subtotal</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{subtotal.toFixed(2)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                                <Typography color="text.secondary" variant="body2">Descuentos</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>-{descuentoTotal.toFixed(2)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                                <Typography color="text.secondary" variant="body2">Recargos</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>+{recargoTotal.toFixed(2)}</Typography>
                            </Box>
                            <Divider sx={{ my: 1 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1a1a2e' }}>
                                    TOTAL
                                </Typography>
                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontWeight: 800,
                                        background: 'linear-gradient(135deg, rgba(0, 89, 255, 0.84), rgba(230, 21, 118, 0.9))',
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}
                                >
                                    {totalFactura.toFixed(2)}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Botones de Acción */}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<SaveIcon />}
                            onClick={() => emitirFactura('factura_normal')}
                            sx={{
                                flex: 1,
                                minWidth: 140,
                                background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
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
                            Emitir Factura
                        </Button>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<ReceiptLongIcon />}
                            onClick={() => emitirFactura('ajuste')}
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
                            Venta Ajustada
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<CancelIcon />}
                            onClick={() => {
                                setItems([]);
                                setCliente('');
                                setNit('');
                                setDireccion('');
                                setTelefono('');
                                setEmail('');
                            }}
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
                    border: "1px solid rgba(0,0,0,0.04)",
                    bgcolor: "#f8f9fa",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                    overflow: "hidden",
                    m: 1,
                    p: 2
                }}
            >
                <CardContent sx={{ p: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6"
                            sx={{
                                background: "linear-gradient(135deg, rgba(0, 89, 255, 0.84), rgba(230, 21, 118, 0.9))",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}>
                            <PictureAsPdfIcon sx={{ fill: 'url(#iconGradient2)', width: 24, height: 24 }} />
                            <svg width="0" height="0">
                                <defs>
                                    <linearGradient id="iconGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="rgba(0, 89, 255, 0.84)" />
                                        <stop offset="100%" stopColor="rgba(230, 21, 118, 0.9)" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            Historial de Facturas
                        </Typography>
                        <Chip
                            label={`${facturas.filter(f => f.estado !== 'anulada').length} activas`}
                            size="small"
                            sx={{
                                bgcolor: 'rgba(10, 218, 20, 0.12)',
                                color: 'rgb(10, 218, 20)',
                                fontWeight: 600,
                                borderRadius: 2
                            }}
                        />
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <CustomDataGridR<Factura>
                        rows={facturas}
                        columns={facturaColumns}
                        getRowId={(row) => row.id}
                        title="Facturas Emitidas"
                        onEditRow={(row) => verFactura(row)}
                        deleteConfig={{
                            baseUrl: `${API_URL}/facturas`,
                            onSuccess: () => {
                                setAlert({ type: 'success', message: 'Factura eliminada' });
                                setTimeout(() => setAlert(null), 3000);
                            }
                        }}
                        getRowAvatar={(row) => row.cliente.charAt(0).toUpperCase()}
                    />
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
                            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                            overflow: 'hidden'
                        }
                    }
                }}
            >
                <DialogTitle sx={{
                    background: 'linear-gradient(135deg, rgba(0, 89, 255, 0.84), rgba(230, 21, 118, 0.9))',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 2
                }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                        🧾 Factura {facturaActual?.id}
                    </Typography>
                    <IconButton onClick={() => setOpenFacturaModal(false)} sx={{ color: 'white' }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <Box id="factura-print-content" sx={{ p: 4 }}>
                        {facturaActual && (
                            <Box className="factura-container">
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1a3c44', pb: 2, mb: 3 }}>
                                    <Box>
                                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1a3c44', mb: 0.5 }}>
                                            MI NEGOCIO
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">Sistema de Gestión ERP</Typography>
                                        <Typography variant="body2" color="text.secondary">Dirección comercial</Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a3c44' }}>
                                            FACTURA N° {String(facturaActual.numero).padStart(6, '0')}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">Fecha: {facturaActual.fecha}</Typography>
                                        <Typography variant="body2" color="text.secondary">Método: {facturaActual.metodoPago.toUpperCase()}</Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 2, mb: 3 }}>
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="body2"><strong>Cliente:</strong> {facturaActual.cliente}</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="body2"><strong>NIT/CI:</strong> {facturaActual.nit}</Typography>
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
                                    </Grid>
                                </Box>

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
                                                    <TableCell align="right">{(item.descuentoMonto + (item.precio * item.cantidad * item.descuentoPct / 100)).toFixed(2)}</TableCell>
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
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 4, py: 1, mt: 1, borderTop: '2px solid #1a3c44' }}>
                                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a3c44' }}>TOTAL</Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a3c44', minWidth: 100 }}>
                                            {facturaActual.total.toFixed(2)}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                                    <Typography variant="caption" color="text.secondary">
                                        ¡Gracias por su compra! • Este documento es una representación impresa de la factura electrónica.
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 2 }}>
                    <Button
                        onClick={() => setOpenFacturaModal(false)}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            color: '#666'
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
                            background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                            color: "#fff",
                            borderRadius: 2,
                            boxShadow: "0 4px 12px rgba(10, 83, 218, 0.3)",
                        }}
                    >
                        Imprimir
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
                            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        }
                    }
                }}
            >
                <DialogContent sx={{ p: 0 }}>
                    <Box id="ticket-print-content" sx={{ p: 3, fontFamily: '"Courier New", monospace', fontSize: '12px' }}>
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
                <DialogActions sx={{ p: 2, gap: 2 }}>
                    <Button
                        onClick={() => setOpenTicketModal(false)}
                        sx={{ textTransform: 'none', fontWeight: 600, color: '#666' }}
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
                            background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                            color: "#fff",
                            borderRadius: 2,
                        }}
                    >
                        Imprimir Ticket
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}