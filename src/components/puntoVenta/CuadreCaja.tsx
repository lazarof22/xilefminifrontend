// src/components/CuadreCajaTab.tsx
import React, { useState, useEffect } from 'react';
import {
    Card, CardContent, Typography, Box, IconButton, Button,
    TextField, Divider, Chip, Stack, Alert, Dialog,
    DialogTitle, DialogContent, DialogActions, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    FormControl, InputLabel, Select, type SelectChangeEvent,
    MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from "@mui/icons-material/Delete";
import CalculateIcon from '@mui/icons-material/Calculate';
import SaveIcon from '@mui/icons-material/Save';
import PrintIcon from '@mui/icons-material/Print';
import LockIcon from '@mui/icons-material/Lock';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CustomDataGridR, { type Column } from '../CustomDataGridR';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── INTERFACES ───────────────────────────────────────────────
interface ProductoAPI {
    _id: string;
    codigo_producto: string;
    nombre_producto: string;
    precio_venta: number;
    stock_inicial: number;
}

interface Factura {
    id: string;
    fecha: string;
    cliente: string;
    total: number;
    metodoPago: string;
    estado: string;
    tipo?: string;
    items?: any[];
}

interface OtroConcepto {
    id: string;
    concepto: string;
    monto: number;
    signo: '+' | '-';
}

interface Cuadre {
    id: string;
    fecha: string;
    cajera: string;
    ventas: number;
    efectivo: number;
    transferencias: number;
    descuentos: number;
    recargos: number;
    creditos: number;
    otros: OtroConcepto[];
    totalEsperado: number;
    diferencia: number;
}

interface EfectivoDesglose {
    billetes200: number;
    billetes100: number;
    billetes50: number;
    billetes20: number;
    billetes10: number;
    billetes5: number;
    billetes3: number;
    billetes1: number;
    monedas: number;
}

interface CuadreCajaTabProps {
    productos: ProductoAPI[];
    facturas: Factura[];
}

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────
export default function CuadreCajaTab({ productos, facturas }: CuadreCajaTabProps) {
    // Estados del formulario de cuadre
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [cajera, setCajera] = useState('');
    const [totalVentas, setTotalVentas] = useState('');
    const [efectivoReal, setEfectivoReal] = useState('');
    const [transferencias, setTransferencias] = useState('');
    const [descuentos, setDescuentos] = useState('');
    const [recargos, setRecargos] = useState('');
    const [creditos, setCreditos] = useState('');
    const [otrosConceptos, setOtrosConceptos] = useState<OtroConcepto[]>([]);

    // Estados de concepto temporal
    const [otroConcepto, setOtroConcepto] = useState('');
    const [otroMonto, setOtroMonto] = useState('');
    const [otroSigno, setOtroSigno] = useState<'+' | '-'>('+');

    // Estados de resultado
    const [resultado, setResultado] = useState<{
        ventas: number;
        efectivo: number;
        transferencias: number;
        descuentos: number;
        recargos: number;
        creditos: number;
        otrosTotal: number;
        totalEsperado: number;
        diferencia: number;
    } | null>(null);

    // Historial de cuadres
    const [cuadres, setCuadres] = useState<Cuadre[]>([]);
    const [cuadreCounter, setCuadreCounter] = useState(1);

    // Modal de desglose de efectivo
    const [openDesglose, setOpenDesglose] = useState(false);
    const [desglose, setDesglose] = useState<EfectivoDesglose>({
        billetes200: 0, billetes100: 0, billetes50: 0, billetes20: 0,
        billetes10: 0, billetes5: 0, billetes3: 0, billetes1: 0, monedas: 0
    });

    // Modal de cierre de turno
    const [openCierre, setOpenCierre] = useState(false);
    const [cierreData, setCierreData] = useState<{
        fecha: string;
        productos: Record<string, { nombre: string; cantidad: number; precio: number; total: number }>;
        totalGeneral: number;
        consolidadaId: number;
    } | null>(null);

    // Alert
    const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Cargar cuadres del localStorage
    useEffect(() => {
        const saved = localStorage.getItem('cuadres_historial');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setCuadres(parsed.cuadres || []);
                setCuadreCounter(parsed.counter || 1);
            } catch (e) {
                console.error('Error cargando cuadres:', e);
            }
        }
    }, []);

    // Guardar cuadres en localStorage
    const guardarCuadres = (nuevosCuadres: Cuadre[], nuevoCounter: number) => {
        localStorage.setItem('cuadres_historial', JSON.stringify({
            cuadres: nuevosCuadres,
            counter: nuevoCounter
        }));
    };

    // ─── CARGAR DATOS DEL DÍA ───────────────────────────────────
    const cargarDatosDia = () => {
        if (!fecha) {
            setAlert({ type: 'error', message: 'Seleccione una fecha' });
            return;
        }

        const ventasDia = facturas.filter(v => v.fecha === fecha && v.estado !== 'anulada');
        const totalV = ventasDia.reduce((s, v) => s + v.total, 0);
        const trans = ventasDia.filter(v => v.metodoPago === 'transferencia').reduce((s, v) => s + v.total, 0);
        const cred = ventasDia.filter(v => v.metodoPago === 'credito').reduce((s, v) => s + v.total, 0);
        const desc = ventasDia.reduce((s, v) => s + (v.items?.reduce((acc: number, item: any) => acc + (item.descuentoMonto || 0) + (item.precio * item.cantidad * (item.descuentoPct || 0) / 100), 0) || 0), 0);
        const rec = ventasDia.reduce((s, v) => s + (v.items?.reduce((acc: number, item: any) => acc + (item.recargo || 0), 0) || 0), 0);

        setTotalVentas(totalV.toFixed(2));
        setTransferencias(trans.toFixed(2));
        setCreditos(cred.toFixed(2));
        setDescuentos(desc.toFixed(2));
        setRecargos(rec.toFixed(2));
        setAlert(null);
    };

    // ─── CALCULAR DESGLOSE DE EFECTIVO ──────────────────────────
    const calcularEfectivoDesglose = () => {
        const d = desglose;
        const total =
            d.billetes200 * 200 +
            d.billetes100 * 100 +
            d.billetes50 * 50 +
            d.billetes20 * 20 +
            d.billetes10 * 10 +
            d.billetes5 * 5 +
            d.billetes3 * 3 +
            d.billetes1 * 1 +
            d.monedas;

        setEfectivoReal(total.toFixed(2));
        setOpenDesglose(false);
    };

    // ─── AGREGAR OTRO CONCEPTO ───────────────────────────────────
    const agregarOtroConcepto = () => {
        if (!otroConcepto.trim() || !otroMonto || isNaN(parseFloat(otroMonto))) {
            setAlert({ type: 'error', message: 'Complete concepto y monto' });
            return;
        }

        const nuevo: OtroConcepto = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            concepto: otroConcepto.trim(),
            monto: parseFloat(otroMonto),
            signo: otroSigno
        };

        setOtrosConceptos(prev => [...prev, nuevo]);
        setOtroConcepto('');
        setOtroMonto('');
        setAlert(null);
    };

    // ─── ELIMINAR OTRO CONCEPTO ─────────────────────────────────
    const eliminarOtro = (id: string) => {
        setOtrosConceptos(prev => prev.filter(o => o.id !== id));
    };

    // ─── CALCULAR CUADRE ────────────────────────────────────────
    const calcularCuadre = () => {
        const ventas = parseFloat(totalVentas) || 0;
        const efectivo = parseFloat(efectivoReal) || 0;
        const trans = parseFloat(transferencias) || 0;
        const desc = parseFloat(descuentos) || 0;
        const rec = parseFloat(recargos) || 0;
        const cred = parseFloat(creditos) || 0;

        let otrosTotal = 0;
        otrosConceptos.forEach(o => {
            if (o.signo === '+') otrosTotal += o.monto;
            else otrosTotal -= o.monto;
        });

        const totalEsperado = ventas - efectivo - trans - desc + rec - cred + otrosTotal;
        const diferencia = 0 - totalEsperado;

        setResultado({
            ventas, efectivo, transferencias: trans,
            descuentos: desc, recargos: rec, creditos: cred,
            otrosTotal, totalEsperado, diferencia
        });

        setAlert(null);
    };

    // ─── GUARDAR CUADRE ─────────────────────────────────────────
    const guardarCuadre = () => {
        if (!resultado) {
            setAlert({ type: 'error', message: 'Calcule primero el cuadre' });
            return;
        }

        const nuevoCuadre: Cuadre = {
            id: `CUA-${String(cuadreCounter).padStart(6, '0')}`,
            fecha,
            cajera: cajera || 'Sin asignar',
            ventas: resultado.ventas,
            efectivo: resultado.efectivo,
            transferencias: resultado.transferencias,
            descuentos: resultado.descuentos,
            recargos: resultado.recargos,
            creditos: resultado.creditos,
            otros: [...otrosConceptos],
            totalEsperado: resultado.totalEsperado,
            diferencia: resultado.diferencia
        };

        const nuevosCuadres = [nuevoCuadre, ...cuadres];
        const nuevoCounter = cuadreCounter + 1;

        setCuadres(nuevosCuadres);
        setCuadreCounter(nuevoCounter);
        guardarCuadres(nuevosCuadres, nuevoCounter);

        setAlert({ type: 'success', message: '✅ Cuadre guardado correctamente' });
        setTimeout(() => setAlert(null), 3000);
    };

    // ─── CERRAR TURNO ───────────────────────────────────────────
    const cerrarTurno = () => {
        const ventasDia = facturas.filter(v => v.fecha === fecha && v.estado !== 'anulada' && (!v.tipo || v.tipo === 'pos'));
        if (ventasDia.length === 0) {
            setAlert({ type: 'error', message: 'No hay ventas del POS en este día para cerrar turno' });
            return;
        }

        const productosConsolidados: Record<string, { nombre: string; cantidad: number; precio: number; total: number }> = {};
        let totalGeneral = 0;

        ventasDia.forEach(v => {
            v.items?.forEach((item: any) => {
                if (!productosConsolidados[item.productoId]) {
                    productosConsolidados[item.productoId] = {
                        nombre: item.productoNombre || 'Producto',
                        cantidad: 0,
                        precio: item.precio,
                        total: 0
                    };
                }
                productosConsolidados[item.productoId].cantidad += item.cantidad;
                productosConsolidados[item.productoId].total += item.total;
                totalGeneral += item.total;
            });
        });

        const consolidadaId = cuadreCounter;

        setCierreData({
            fecha,
            productos: productosConsolidados,
            totalGeneral,
            consolidadaId
        });
        setOpenCierre(true);

        setAlert({ type: 'success', message: `✅ Turno cerrado. Factura consolidada #CONS-${String(consolidadaId).padStart(6, '0')} generada.` });
        setTimeout(() => setAlert(null), 3000);
    };

    // ─── IMPRIMIR RESULTADO ─────────────────────────────────────
    const imprimirResultado = () => {
        if (!resultado) {
            setAlert({ type: 'error', message: 'Calcule primero el cuadre' });
            return;
        }

        const contenido = document.getElementById('cuadre-resultado-print');
        if (!contenido) return;

        const w = window.open('', '_blank', 'width=800,height=600');
        if (!w) { window.alert('Permita ventanas emergentes'); return; }

        w.document.write(`
            <html><head><title>Cuadre de Caja - ${fecha}</title>
            <style>
                * { box-sizing:border-box; margin:0; padding:0; }
                body { font-family:'Inter',sans-serif; background:white; padding:20px; }
                .container { max-width:700px; margin:0 auto; }
                .header { text-align:center; border-bottom:2px solid #1a3c44; padding-bottom:12px; margin-bottom:16px; }
                .header h2 { font-size:24px; font-weight:800; color:#1a3c44; }
                .header p { font-size:13px; color:#64748b; }
                .grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:16px; }
                .item { background:#f8fafc; padding:12px; border-radius:8px; }
                .item strong { display:block; color:#1e293b; font-size:12px; margin-bottom:4px; }
                .item span { color:#334155; font-size:14px; font-weight:600; }
                .resultado { background:#f1f5f9; padding:16px; border-radius:8px; margin-top:16px; }
                .resultado .linea { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #e2e8f0; }
                .resultado .linea.total { font-size:18px; font-weight:700; color:#1a3c44; border-top:2px solid #1a3c44; border-bottom:none; margin-top:8px; padding-top:12px; }
                .diferencia-cero { color:rgb(10, 218, 20); font-weight:700; }
                .diferencia-positiva { color:rgb(10, 83, 218); font-weight:700; }
                .diferencia-negativa { color:rgb(220, 20, 60); font-weight:700; }
                .footer { margin-top:20px; border-top:1px solid #e2e8f0; padding-top:12px; text-align:center; font-size:12px; color:#94a3b8; }
                @media print { body { padding:0; } }
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
    const cuadreColumns: Column<Cuadre>[] = [
        { field: 'id', headerName: 'N° Cuadre' },
        { field: 'fecha', headerName: 'Fecha' },
        { field: 'cajera', headerName: 'Cajera' },
        { field: 'ventas', headerName: 'Ventas', numeric: true },
        { field: 'efectivo', headerName: 'Efectivo', numeric: true },
        { field: 'transferencias', headerName: 'Transferencias', numeric: true },
        { field: 'descuentos', headerName: 'Descuentos', numeric: true },
        { field: 'recargos', headerName: 'Recargos', numeric: true },
        { field: 'creditos', headerName: 'Créditos', numeric: true },
        { field: 'totalEsperado', headerName: 'Total Esperado', numeric: true },
        { field: 'diferencia', headerName: 'Diferencia', numeric: true },
    ];

    // ─── RENDER ─────────────────────────────────────────────────
    return (
        <Box>
            {/* Alertas */}
            {alert && (
                <Alert
                    severity={alert.type}
                    sx={{ mb: 2, borderRadius: 2, mx: 1 }}
                    onClose={() => setAlert(null)}
                >
                    {alert.message}
                </Alert>
            )}

            {/* ═══════════════════════════════════════════════════
                CARD PRINCIPAL: CUADRE DE CAJA
            ═══════════════════════════════════════════════════ */}
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
                            <AccountBalanceWalletIcon sx={{ fill: 'url(#iconGradientCuadre)', width: 24, height: 24 }} />
                            <svg width="0" height="0">
                                <defs>
                                    <linearGradient id="iconGradientCuadre" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="rgba(0, 89, 255, 0.84)" />
                                        <stop offset="100%" stopColor="rgba(230, 21, 118, 0.9)" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            Cuadre de Caja
                        </Typography>
                        <Chip
                            label={`${cuadres.length} cuadres guardados`}
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

                    {/* ═══ FILA 1: Fecha, Cajera, Total Ventas ═══ */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                        <Card variant="outlined" sx={{ flex: 1, minWidth: 200, borderRadius: 2, borderColor: 'rgba(0,0,0,0.06)' }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                                    Fecha
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="date"
                                        value={fecha}
                                        onChange={(e) => setFecha(e.target.value)}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 1, bgcolor: '#f8f9fa',
                                                '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' },
                                                '&:hover fieldset': { borderColor: 'rgba(10, 83, 218, 0.3)' },
                                                '&.Mui-focused fieldset': { borderColor: 'rgb(10, 83, 218)' },
                                            }
                                        }}
                                    />
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={cargarDatosDia}
                                        sx={{
                                            background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                                            color: "#fff",
                                            textTransform: "none",
                                            fontWeight: 600,
                                            borderRadius: 1,
                                            px: 2,
                                            whiteSpace: 'nowrap',
                                            boxShadow: "0 4px 12px rgba(10, 83, 218, 0.3)",
                                            "&:hover": { boxShadow: "0 6px 16px rgba(10, 83, 218, 0.4)" }
                                        }}
                                    >
                                        📥 Cargar
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>

                        <Card variant="outlined" sx={{ flex: 1, minWidth: 200, borderRadius: 2, borderColor: 'rgba(0,0,0,0.06)' }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                                    Cajera
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Nombre de la cajera"
                                    value={cajera}
                                    onChange={(e) => setCajera(e.target.value)}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1, bgcolor: '#f8f9fa',
                                            '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' },
                                            '&:hover fieldset': { borderColor: 'rgba(10, 83, 218, 0.3)' },
                                            '&.Mui-focused fieldset': { borderColor: 'rgb(10, 83, 218)' },
                                        }
                                    }}
                                />
                            </CardContent>
                        </Card>

                        <Card variant="outlined" sx={{ flex: 1, minWidth: 200, borderRadius: 2, borderColor: 'rgba(0,0,0,0.06)', bgcolor: '#f1f5f9' }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                                    Total Ventas del Día
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="number"
                                    placeholder="0.00"
                                    value={totalVentas}
                                    onChange={(e) => setTotalVentas(e.target.value)}
                                    slotProps={{ input: { readOnly: true } }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1, bgcolor: '#e8ecf1',
                                            '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' },
                                            '& input': { fontWeight: 700, color: '#1a3c44' }
                                        }
                                    }}
                                />
                            </CardContent>
                        </Card>
                    </Box>

                    {/* ═══ FILA 2: CxC, Efectivo, Transferencias ═══ */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                        <Card variant="outlined" sx={{ flex: 1, minWidth: 200, borderRadius: 2, borderColor: 'rgba(0,0,0,0.06)', bgcolor: '#f1f5f9' }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                                    Cuentas por Cobrar (Créditos)
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="number"
                                    placeholder="0.00"
                                    value={creditos}
                                    onChange={(e) => setCreditos(e.target.value)}
                                    slotProps={{ input: { readOnly: true } }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1, bgcolor: '#e8ecf1',
                                            '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' },
                                            '& input': { fontWeight: 700, color: '#1a3c44' }
                                        }
                                    }}
                                />
                            </CardContent>
                        </Card>

                        <Card variant="outlined" sx={{ flex: 1, minWidth: 200, borderRadius: 2, borderColor: 'rgba(0,0,0,0.06)', bgcolor: '#f1f5f9' }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                                    Efectivo Real (Desglose)
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="number"
                                        placeholder="0.00"
                                        value={efectivoReal}
                                        onChange={(e) => setEfectivoReal(e.target.value)}
                                        slotProps={{ input: { readOnly: true } }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 1, bgcolor: '#e8ecf1',
                                                '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' },
                                                '& input': { fontWeight: 700, color: '#1a3c44' }
                                            }
                                        }}
                                    />
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={() => setOpenDesglose(true)}
                                        sx={{
                                            background: "linear-gradient(135deg, rgb(255, 238, 0), rgba(226, 64, 14, 0.9))",
                                            color: "#fff",
                                            textTransform: "none",
                                            fontWeight: 600,
                                            borderRadius: 1,
                                            px: 2,
                                            whiteSpace: 'nowrap',
                                            boxShadow: "0 4px 12px rgba(226, 64, 14, 0.3)",
                                            "&:hover": { boxShadow: "0 6px 16px rgba(226, 64, 14, 0.4)" }
                                        }}
                                    >
                                        💵 Desglosar
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>

                        <Card variant="outlined" sx={{ flex: 1, minWidth: 200, borderRadius: 2, borderColor: 'rgba(0,0,0,0.06)', bgcolor: '#f1f5f9' }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                                    Transferencias
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="number"
                                    placeholder="0.00"
                                    value={transferencias}
                                    onChange={(e) => setTransferencias(e.target.value)}
                                    slotProps={{ input: { readOnly: true } }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1, bgcolor: '#e8ecf1',
                                            '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' },
                                            '& input': { fontWeight: 700, color: '#1a3c44' }
                                        }
                                    }}
                                />
                            </CardContent>
                        </Card>
                    </Box>

                    {/* ═══ FILA 3: Descuentos, Recargos, Otros Motivos ═══ */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                        <Card variant="outlined" sx={{ flex: 1, minWidth: 200, borderRadius: 2, borderColor: 'rgba(0,0,0,0.06)', bgcolor: '#f1f5f9' }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                                    Descuentos
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="number"
                                    placeholder="0.00"
                                    value={descuentos}
                                    onChange={(e) => setDescuentos(e.target.value)}
                                    slotProps={{ input: { readOnly: true } }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1, bgcolor: '#e8ecf1',
                                            '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' },
                                            '& input': { fontWeight: 700, color: '#1a3c44' }
                                        }
                                    }}
                                />
                            </CardContent>
                        </Card>

                        <Card variant="outlined" sx={{ flex: 1, minWidth: 200, borderRadius: 2, borderColor: 'rgba(0,0,0,0.06)', bgcolor: '#f1f5f9' }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                                    Recargos
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="number"
                                    placeholder="0.00"
                                    value={recargos}
                                    onChange={(e) => setRecargos(e.target.value)}
                                    slotProps={{ input: { readOnly: true } }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1, bgcolor: '#e8ecf1',
                                            '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' },
                                            '& input': { fontWeight: 700, color: '#1a3c44' }
                                        }
                                    }}
                                />
                            </CardContent>
                        </Card>

                        <Card variant="outlined" sx={{ flex: 1, minWidth: 280, borderRadius: 2, borderColor: 'rgba(0,0,0,0.06)' }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                                    Otros Motivos
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                    <TextField
                                        size="small"
                                        placeholder="Concepto"
                                        value={otroConcepto}
                                        onChange={(e) => setOtroConcepto(e.target.value)}
                                        sx={{
                                            flex: 2,
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 1, bgcolor: '#f8f9fa',
                                                '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' },
                                            }
                                        }}
                                    />
                                    <TextField
                                        size="small"
                                        type="number"
                                        placeholder="Monto"
                                        value={otroMonto}
                                        onChange={(e) => setOtroMonto(e.target.value)}
                                        sx={{
                                            flex: 1,
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 1, bgcolor: '#f8f9fa',
                                                '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' },
                                            }
                                        }}
                                    />
                                    <FormControl size="small" sx={{ minWidth: 60 }}>
                                        <Select
                                            value={otroSigno}
                                            onChange={(e: SelectChangeEvent) => setOtroSigno(e.target.value as '+' | '-')}
                                            sx={{
                                                borderRadius: 1, bgcolor: '#f8f9fa',
                                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.06)' },
                                            }}
                                        >
                                            <MenuItem value="+">+</MenuItem>
                                            <MenuItem value="-">-</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={agregarOtroConcepto}
                                        sx={{
                                            minWidth: 40,
                                            background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                                            color: "#fff",
                                            borderRadius: 1,
                                            boxShadow: "0 4px 12px rgba(10, 83, 218, 0.3)",
                                        }}
                                    >
                                        <AddIcon sx={{ fontSize: 18 }} />
                                    </Button>
                                </Box>
                                {/* Lista de otros conceptos */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    {otrosConceptos.map((o) => (
                                        <Box
                                            key={o.id}
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                py: 0.5,
                                                px: 1,
                                                bgcolor: 'rgba(10, 83, 218, 0.04)',
                                                borderRadius: 1,
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ color: '#444' }}>
                                                {o.concepto}: <strong>{o.signo}${o.monto.toFixed(2)}</strong>
                                            </Typography>
                                            <IconButton
                                                size="small"
                                                onClick={() => eliminarOtro(o.id)}
                                                sx={{
                                                    width: 24,
                                                    height: 24,
                                                    bgcolor: 'rgb(220, 20, 60)',
                                                    color: 'white',
                                                    '&:hover': { bgcolor: 'rgb(200, 10, 40)' }
                                                }}
                                            >
                                                <DeleteIcon sx={{ fontSize: 12 }} />
                                            </IconButton>
                                        </Box>
                                    ))}
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* ═══ BOTONES DE ACCIÓN ═══ */}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<CalculateIcon />}
                            onClick={calcularCuadre}
                            sx={{
                                flex: 1,
                                minWidth: 140,
                                background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                                color: "#fff",
                                textTransform: "none",
                                fontWeight: 600,
                                borderRadius: 2,
                                boxShadow: "0 4px 12px rgba(10, 83, 218, 0.3)",
                                "&:hover": { boxShadow: "0 6px 16px rgba(10, 83, 218, 0.4)" }
                            }}
                        >
                            Calcular
                        </Button>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<SaveIcon />}
                            onClick={guardarCuadre}
                            sx={{
                                flex: 1,
                                minWidth: 140,
                                background: "linear-gradient(135deg, rgb(36, 236, 9), rgba(202, 183, 14, 0.9))",
                                color: "#fff",
                                textTransform: "none",
                                fontWeight: 600,
                                borderRadius: 2,
                                boxShadow: "0 4px 12px rgba(36, 236, 9, 0.3)",
                                "&:hover": { boxShadow: "0 6px 16px rgba(36, 236, 9, 0.4)" }
                            }}
                        >
                            Guardar
                        </Button>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<PrintIcon />}
                            onClick={imprimirResultado}
                            sx={{
                                flex: 1,
                                minWidth: 140,
                                background: "linear-gradient(135deg, rgb(255, 238, 0), rgba(226, 64, 14, 0.9))",
                                color: "#fff",
                                textTransform: "none",
                                fontWeight: 600,
                                borderRadius: 2,
                                boxShadow: "0 4px 12px rgba(226, 64, 14, 0.3)",
                                "&:hover": { boxShadow: "0 6px 16px rgba(226, 64, 14, 0.4)" }
                            }}
                        >
                            Imprimir
                        </Button>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<LockIcon />}
                            onClick={cerrarTurno}
                            sx={{
                                flex: 1,
                                minWidth: 140,
                                background: "linear-gradient(135deg, rgba(245, 6, 6, 0.9), rgba(10, 83, 218, 0.9))",
                                color: "#fff",
                                textTransform: "none",
                                fontWeight: 600,
                                borderRadius: 2,
                                boxShadow: "0 4px 12px rgba(245, 6, 6, 0.3)",
                                "&:hover": { boxShadow: "0 6px 16px rgba(245, 6, 6, 0.4)" }
                            }}
                        >
                            Cerrar Turno
                        </Button>
                    </Box>

                    {/* ═══ RESULTADO DEL CUADRE ═══ */}
                    <Card
                        variant="outlined"
                        sx={{
                            borderRadius: 2,
                            borderColor: 'rgba(0,0,0,0.06)',
                            bgcolor: '#f8f9fa',
                            display: resultado ? 'block' : 'none'
                        }}
                    >
                        <CardContent sx={{ p: 3 }} id="cuadre-resultado-print">
                            {resultado && (
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a3c44', mb: 2, textAlign: 'center' }}>
                                        Resultado del Cuadre
                                    </Typography>

                                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                                        <Card variant="outlined" sx={{ flex: 1, minWidth: 150, borderRadius: 2, borderColor: 'rgba(0,0,0,0.06)', bgcolor: '#fff' }}>
                                            <CardContent sx={{ p: 2, textAlign: 'center' }}>
                                                <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>Ventas</Typography>
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a3c44' }}>${resultado.ventas.toFixed(2)}</Typography>
                                            </CardContent>
                                        </Card>
                                        <Card variant="outlined" sx={{ flex: 1, minWidth: 150, borderRadius: 2, borderColor: 'rgba(0,0,0,0.06)', bgcolor: '#fff' }}>
                                            <CardContent sx={{ p: 2, textAlign: 'center' }}>
                                                <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>Efectivo Real</Typography>
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a3c44' }}>${resultado.efectivo.toFixed(2)}</Typography>
                                            </CardContent>
                                        </Card>
                                        <Card variant="outlined" sx={{ flex: 1, minWidth: 150, borderRadius: 2, borderColor: 'rgba(0,0,0,0.06)', bgcolor: '#fff' }}>
                                            <CardContent sx={{ p: 2, textAlign: 'center' }}>
                                                <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>Transferencias</Typography>
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a3c44' }}>${resultado.transferencias.toFixed(2)}</Typography>
                                            </CardContent>
                                        </Card>
                                        <Card variant="outlined" sx={{ flex: 1, minWidth: 150, borderRadius: 2, borderColor: 'rgba(0,0,0,0.06)', bgcolor: '#fff' }}>
                                            <CardContent sx={{ p: 2, textAlign: 'center' }}>
                                                <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>Descuentos</Typography>
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main' }}>-${resultado.descuentos.toFixed(2)}</Typography>
                                            </CardContent>
                                        </Card>
                                        <Card variant="outlined" sx={{ flex: 1, minWidth: 150, borderRadius: 2, borderColor: 'rgba(0,0,0,0.06)', bgcolor: '#fff' }}>
                                            <CardContent sx={{ p: 2, textAlign: 'center' }}>
                                                <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>Recargos</Typography>
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>+${resultado.recargos.toFixed(2)}</Typography>
                                            </CardContent>
                                        </Card>
                                        <Card variant="outlined" sx={{ flex: 1, minWidth: 150, borderRadius: 2, borderColor: 'rgba(0,0,0,0.06)', bgcolor: '#fff' }}>
                                            <CardContent sx={{ p: 2, textAlign: 'center' }}>
                                                <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>Créditos</Typography>
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a3c44' }}>${resultado.creditos.toFixed(2)}</Typography>
                                            </CardContent>
                                        </Card>
                                    </Box>

                                    <Divider sx={{ my: 2 }} />

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1a3c44' }}>
                                            Total a Cuadrar:
                                        </Typography>
                                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a3c44' }}>
                                            ${resultado.totalEsperado.toFixed(2)}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, mt: 1, pt: 1, borderTop: '2px solid #e0e0e0' }}>
                                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#1a3c44' }}>
                                            Diferencia:
                                        </Typography>
                                        <Typography
                                            variant="h4"
                                            sx={{
                                                fontWeight: 800,
                                                color: Math.abs(resultado.diferencia) < 0.01 ? 'rgb(10, 218, 20)' :
                                                    resultado.diferencia > 0 ? 'rgb(10, 83, 218)' : 'rgb(220, 20, 60)'
                                            }}
                                        >
                                            {resultado.diferencia >= 0 ? '+' : ''}${resultado.diferencia.toFixed(2)}
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════
                CARD DE HISTORIAL DE CUADRES
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
                    mt: 2
                }}
            >
                <CardContent sx={{ p: 3 }}>
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
                            <PictureAsPdfIcon sx={{ fill: 'url(#iconGradientHist)', width: 24, height: 24 }} />
                            <svg width="0" height="0">
                                <defs>
                                    <linearGradient id="iconGradientHist" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="rgba(0, 89, 255, 0.84)" />
                                        <stop offset="100%" stopColor="rgba(230, 21, 118, 0.9)" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            Historial de Cuadres
                        </Typography>
                        <Chip
                            label={`${cuadres.length} registros`}
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

                    <CustomDataGridR<Cuadre>
                        rows={cuadres}
                        columns={cuadreColumns}
                        getRowId={(row) => row.id}
                        title="Cuadres Realizados"
                        onEditRow={(row) => {
                            setFecha(row.fecha);
                            setCajera(row.cajera);
                            setTotalVentas(row.ventas.toString());
                            setEfectivoReal(row.efectivo.toString());
                            setTransferencias(row.transferencias.toString());
                            setDescuentos(row.descuentos.toString());
                            setRecargos(row.recargos.toString());
                            setCreditos(row.creditos.toString());
                            setOtrosConceptos([...row.otros]);
                        }}
                        deleteConfig={{
                            baseUrl: `${API_URL}/cuadres`,
                            onSuccess: () => {
                                setAlert({ type: 'success', message: 'Cuadre eliminado' });
                                setTimeout(() => setAlert(null), 3000);
                            }
                        }}
                        getRowAvatar={(row) => row.cajera.charAt(0).toUpperCase()}
                    />
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════
                MODAL DE DESGLOSE DE EFECTIVO
                ═══════════════════════════════════════════════════════ */}
            <Dialog
                open={openDesglose}
                onClose={() => setOpenDesglose(false)}
                maxWidth="sm"
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
                        💵 Desglose de Efectivo
                    </Typography>
                    <IconButton onClick={() => setOpenDesglose(false)} sx={{ color: 'white' }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 3 }}>
                    <Stack spacing={2}>
                        {[
                            { label: 'Billetes de $200', key: 'billetes200' as keyof EfectivoDesglose, valor: 200 },
                            { label: 'Billetes de $100', key: 'billetes100' as keyof EfectivoDesglose, valor: 100 },
                            { label: 'Billetes de $50', key: 'billetes50' as keyof EfectivoDesglose, valor: 50 },
                            { label: 'Billetes de $20', key: 'billetes20' as keyof EfectivoDesglose, valor: 20 },
                            { label: 'Billetes de $10', key: 'billetes10' as keyof EfectivoDesglose, valor: 10 },
                            { label: 'Billetes de $5', key: 'billetes5' as keyof EfectivoDesglose, valor: 5 },
                            { label: 'Billetes de $3', key: 'billetes3' as keyof EfectivoDesglose, valor: 3 },
                            { label: 'Billetes de $1', key: 'billetes1' as keyof EfectivoDesglose, valor: 1 },
                            { label: 'Monedas', key: 'monedas' as keyof EfectivoDesglose, valor: 1 },
                        ].map((item) => (
                            <Box key={item.key} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography sx={{ flex: 1, fontWeight: 600, color: '#1a1a2e' }}>
                                    {item.label}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Button
                                        size="small"
                                        onClick={() => setDesglose(prev => ({ ...prev, [item.key]: Math.max(0, (prev[item.key] || 0) - 1) }))}
                                        sx={{
                                            minWidth: 32,
                                            height: 32,
                                            p: 0,
                                            borderRadius: 1,
                                            bgcolor: 'rgba(255, 174, 0, 0.78)',
                                            color: 'white',
                                            '&:hover': { bgcolor: 'rgb(255, 166, 0)' }
                                        }}
                                    >
                                        <RemoveIcon sx={{ fontSize: 16 }} />
                                    </Button>
                                    <TextField
                                        size="small"
                                        type="number"
                                        value={desglose[item.key]}
                                        onChange={(e) => setDesglose(prev => ({ ...prev, [item.key]: parseInt(e.target.value) || 0 }))}
                                        slotProps={{
                                            htmlInput: { min: 0, style: { textAlign: 'center', width: 60 } }
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 1,
                                                bgcolor: '#f8f9fa',
                                                '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' },
                                            }
                                        }}
                                    />
                                    <Button
                                        size="small"
                                        onClick={() => setDesglose(prev => ({ ...prev, [item.key]: (prev[item.key] || 0) + 1 }))}
                                        sx={{
                                            minWidth: 32,
                                            height: 32,
                                            p: 0,
                                            borderRadius: 1,
                                            bgcolor: 'rgba(255, 174, 0, 0.78)',
                                            color: 'white',
                                            '&:hover': { bgcolor: 'rgb(255, 166, 0)' }
                                        }}
                                    >
                                        <AddIcon sx={{ fontSize: 16 }} />
                                    </Button>
                                </Box>
                                <Typography sx={{ minWidth: 80, textAlign: 'right', fontWeight: 600, color: '#666' }}>
                                    = ${((desglose[item.key] || 0) * item.valor).toFixed(2)}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#1a3c44' }}>
                            Total: ${
                                (desglose.billetes200 * 200 +
                                    desglose.billetes100 * 100 +
                                    desglose.billetes50 * 50 +
                                    desglose.billetes20 * 20 +
                                    desglose.billetes10 * 10 +
                                    desglose.billetes5 * 5 +
                                    desglose.billetes3 * 3 +
                                    desglose.billetes1 * 1 +
                                    desglose.monedas
                                ).toFixed(2)
                            }
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 2 }}>
                    <Button
                        onClick={() => setOpenDesglose(false)}
                        sx={{ textTransform: 'none', fontWeight: 600, color: '#666' }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={calcularEfectivoDesglose}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                            color: "#fff",
                            borderRadius: 2,
                            boxShadow: "0 4px 12px rgba(10, 83, 218, 0.3)",
                        }}
                    >
                        Aceptar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ═══════════════════════════════════════════════════════
                MODAL DE CIERRE DE TURNO
                ═══════════════════════════════════════════════════════ */}
            <Dialog
                open={openCierre}
                onClose={() => setOpenCierre(false)}
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
                    background: 'linear-gradient(135deg, rgba(245, 6, 6, 0.9), rgba(10, 83, 218, 0.9))',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 2
                }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                        🔒 Reporte de Cierre de Turno
                    </Typography>
                    <IconButton onClick={() => setOpenCierre(false)} sx={{ color: 'white' }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 4 }}>
                    {cierreData && (
                        <Box>
                            <Box sx={{ textAlign: 'center', mb: 3 }}>
                                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a3c44', mb: 1 }}>
                                    MI NEGOCIO
                                </Typography>
                                <Typography variant="body2" color="text.secondary">Sistema de Gestión ERP</Typography>
                                <Typography variant="body2" color="text.secondary">Dirección comercial</Typography>
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a3c44' }}>
                                    📊 Reporte de Cierre de Turno
                                </Typography>
                                <Typography variant="body1" sx={{ color: '#666' }}>
                                    Fecha: {cierreData.fecha}
                                </Typography>
                                <Typography variant="body1" sx={{ color: '#666' }}>
                                    Factura Consolidada: CONS-{String(cierreData.consolidadaId).padStart(6, '0')}
                                </Typography>
                            </Box>

                            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid rgba(0,0,0,0.06)' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                                            <TableCell sx={{ fontWeight: 600 }}>Producto</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 600 }}>Cantidad</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600 }}>Precio Unit.</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600 }}>Total</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Object.entries(cierreData.productos).map(([pid, p]) => (
                                            <TableRow key={pid}>
                                                <TableCell>{p.nombre}</TableCell>
                                                <TableCell align="center">{p.cantidad}</TableCell>
                                                <TableCell align="right">{p.precio.toFixed(2)}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600 }}>{p.total.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow sx={{ bgcolor: '#f1f5f9', fontWeight: 700 }}>
                                            <TableCell colSpan={3} sx={{ fontWeight: 700, color: '#1a3c44' }}>TOTAL GENERAL</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: '#1a3c44' }}>
                                                ${cierreData.totalGeneral.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Box sx={{ mt: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2, textAlign: 'center' }}>
                                <Typography variant="body1" sx={{ fontWeight: 600, color: '#1a3c44' }}>
                                    Total de ventas del día: ${cierreData.totalGeneral.toFixed(2)}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#888', mt: 1 }}>
                                    Se ha generado la factura consolidada #CONS-{String(cierreData.consolidadaId).padStart(6, '0')} en el módulo de Facturación.
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 2 }}>
                    <Button
                        onClick={() => setOpenCierre(false)}
                        sx={{ textTransform: 'none', fontWeight: 600, color: '#666' }}
                    >
                        Cerrar
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<PrintIcon />}
                        onClick={() => {
                            const contenido = document.getElementById('cierre-print-content');
                            if (!contenido) return;
                            const w = window.open('', '_blank', 'width=800,height=600');
                            if (!w) { window.alert('Permita ventanas emergentes'); return; }
                            w.document.write(`
                                <html><head><title>Cierre de Turno - ${cierreData?.fecha}</title>
                                <style>
                                    * { box-sizing:border-box; margin:0; padding:0; }
                                    body { font-family:'Inter',sans-serif; background:white; padding:20px; }
                                    .container { max-width:700px; margin:0 auto; }
                                    .header { text-align:center; border-bottom:2px solid #1a3c44; padding-bottom:12px; margin-bottom:16px; }
                                    .header h2 { font-size:24px; font-weight:800; color:#1a3c44; }
                                    table { width:100%; border-collapse:collapse; font-size:13px; margin-top:16px; }
                                    table th { background:#f1f5f9; color:#1e293b; font-weight:600; padding:10px 12px; border-bottom:2px solid #e2e8f0; text-align:left; }
                                    table td { padding:8px 12px; border-bottom:1px solid #f1f5f9; color:#334155; }
                                    .total { font-weight:700; background:#f1f5f9; }
                                    .footer { margin-top:20px; border-top:1px solid #e2e8f0; padding-top:12px; text-align:center; font-size:12px; color:#94a3b8; }
                                    @media print { body { padding:0; } }
                                </style>
                                </head><body>
                                    ${document.getElementById('cierre-print-content')?.innerHTML || ''}
                                <script>
                                    window.onload = function() { setTimeout(function() { window.print(); setTimeout(function(){ window.close(); }, 1500); }, 500); }
                                </script>
                                </body></html>
                            `);
                            w.document.close();
                        }}
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
        </Box>
    );
}