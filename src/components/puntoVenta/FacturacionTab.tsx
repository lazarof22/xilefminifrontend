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

    // Datos de la empresa
    const [empresaNombre, setEmpresaNombre] = useState('');
    const [empresaDireccion, setEmpresaDireccion] = useState('');
    const [empresaTelefono, setEmpresaTelefono] = useState('');
    const [empresaEmail, setEmpresaEmail] = useState('');
    const [empresaRucNit, setEmpresaRucNit] = useState('');
    const [empresaCiudad, setEmpresaCiudad] = useState('');
    const [empresaPais, setEmpresaPais] = useState('');

    // Datos del almacén
    const [almacenSeleccionado, setAlmacenSeleccionado] = useState('');
    const [almacenId, setAlmacenId] = useState('');
    const [almacenNombre, setAlmacenNombre] = useState('');

    // Responsables de la factura
    const [facturadoPorNombre, setFacturadoPorNombre] = useState('');
    const [facturadoPorCI, setFacturadoPorCI] = useState('');
    const [facturadoPorFecha, setFacturadoPorFecha] = useState('');
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

        setEmpresaNombre('');
        setEmpresaDireccion('');
        setEmpresaTelefono('');
        setEmpresaEmail('');
        setEmpresaRucNit('');
        setEmpresaCiudad('');
        setEmpresaPais('');

        setAlmacenSeleccionado('');
        setAlmacenId('');
        setAlmacenNombre('');

        setFacturadoPorNombre('');
        setFacturadoPorCI('');
        setFacturadoPorFecha('');
        setDespachadoPorNombre('');
        setDespachadoPorCI('');
        setDespachadoPorFecha('');
        setTransportadoPorNombre('');
        setTransportadoPorCI('');
        setTransportadoPorFecha('');
        setRecibidoPorNombre('');
        setRecibidoPorCI('');
        setRecibidoPorFecha('');
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
                    sx={{
                        mb: 2, borderRadius: 2,
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

            <Card
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
                            Nueva Factura
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
                                    <FormControl fullWidth size="small">
                                        <InputLabel sx={labelSx}>Cliente</InputLabel>
                                        <Select
                                            value={cliente}
                                            label="Cliente"
                                            onChange={(e: SelectChangeEvent) => setCliente(e.target.value)}
                                            sx={selectSx}
                                        >
                                            <MenuItem value="">
                                                <em>Seleccione un cliente</em>
                                            </MenuItem>
                                        </Select>
                                    </FormControl>
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

                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="Nombre"
                                        placeholder="Nombre"
                                        value={empresaNombre}
                                        onChange={(e) => setEmpresaNombre(e.target.value)}
                                        sx={fieldSx}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="Dirección"
                                        placeholder="Dirección"
                                        value={empresaDireccion}
                                        onChange={(e) => setEmpresaDireccion(e.target.value)}
                                        sx={fieldSx}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="Teléfono"
                                        placeholder="Teléfono"
                                        value={empresaTelefono}
                                        onChange={(e) => setEmpresaTelefono(e.target.value)}
                                        sx={fieldSx}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
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
                                        fullWidth size="small"
                                        label="RUC/NIT"
                                        placeholder="RUC/NIT"
                                        value={empresaRucNit}
                                        onChange={(e) => setEmpresaRucNit(e.target.value)}
                                        sx={fieldSx}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="Ciudad"
                                        placeholder="Ciudad"
                                        value={empresaCiudad}
                                        onChange={(e) => setEmpresaCiudad(e.target.value)}
                                        sx={fieldSx}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
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
                                            value={almacenSeleccionado}
                                            label="Almacén"
                                            onChange={(e: SelectChangeEvent) => setAlmacenSeleccionado(e.target.value)}
                                            sx={selectSx}
                                        >
                                            <MenuItem value="">
                                                <em>Seleccione un almacén</em>
                                            </MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="ID del Almacén"
                                        placeholder="ID del almacén"
                                        value={almacenId}
                                        onChange={(e) => setAlmacenId(e.target.value)}
                                        sx={fieldSx}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth size="small"
                                        label="Nombre del Almacén"
                                        placeholder="Nombre del almacén"
                                        value={almacenNombre}
                                        onChange={(e) => setAlmacenNombre(e.target.value)}
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
                                            htmlInput: { step: '0.01' },
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
                                                onChange={(e: SelectChangeEvent) => setMetodoPago(e.target.value)}
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
                                            fullWidth size="small"
                                            label="Nombre"
                                            value={facturadoPorNombre}
                                            onChange={(e) => setFacturadoPorNombre(e.target.value)}
                                            sx={fieldSx}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth size="small"
                                            label="CI"
                                            value={facturadoPorCI}
                                            onChange={(e) => setFacturadoPorCI(e.target.value)}
                                            sx={fieldSx}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth size="small"
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
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<SaveIcon />}
                            onClick={() => emitirFactura('factura_normal')}
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
                            onClick={() => emitirFactura('factura_normal')}
                            sx={{
                                flex: 1,
                                minWidth: 140,
                                background: "linear-gradient(135deg, rgba(218, 10, 10, 0.9), rgba(255, 94, 0, 0.9))",
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
                            Cancelar
                        </Button>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<SaveIcon />}
                            onClick={() => emitirFactura('factura_normal')}
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
                                setMetodoPago('efectivo');

                                setEmpresaNombre('');
                                setEmpresaDireccion('');
                                setEmpresaTelefono('');
                                setEmpresaEmail('');
                                setEmpresaRucNit('');
                                setEmpresaCiudad('');
                                setEmpresaPais('');

                                setAlmacenSeleccionado('');
                                setAlmacenId('');
                                setAlmacenNombre('');

                                setFacturadoPorNombre('');
                                setFacturadoPorCI('');
                                setFacturadoPorFecha('');
                                setDespachadoPorNombre('');
                                setDespachadoPorCI('');
                                setDespachadoPorFecha('');
                                setTransportadoPorNombre('');
                                setTransportadoPorCI('');
                                setTransportadoPorFecha('');
                                setRecibidoPorNombre('');
                                setRecibidoPorCI('');
                                setRecibidoPorFecha('');
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
                            label={`${facturas.filter(f => f.estado !== 'anulada').length} activas`}
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
                    <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.accent }}>
                        🧾 Factura {facturaActual?.id}
                    </Typography>
                    <IconButton onClick={() => setOpenFacturaModal(false)} sx={{ color: COLORS.textMuted, '&:hover': { color: 'white' } }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <Box id="factura-print-content" sx={{ p: 4, bgcolor: 'white' }}>
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
                <DialogActions sx={{ p: 2, gap: 2, borderTop: `1px solid ${COLORS.border}` }}>
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