// src/pages/VentasPage.tsx
import React, { useState, useEffect } from 'react';
import {
    Card, CardContent, Typography, Box, Button,
    TextField,
    MenuItem,
    InputAdornment,
    CircularProgress,
    Alert,
    Chip,
    Avatar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CustomDataGrid from "../../components/CustomDataGridR";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import EuroIcon from "@mui/icons-material/Euro";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import ReceiptIcon from '@mui/icons-material/Receipt';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Interface para el DataGrid ───────────────────────────────

interface VentaRow {
    id: string;
    factura: string;
    cliente: string;
    fecha: string;
    metodoPago: string;
    moneda: number;
    subtotal: number;
    descuento: number;
    impuesto: number;
    total: number;
    estado: string;
    productosCount: number;
    cambio?: number;
}

// ─── Componente ───────────────────────────────────────────────

export default function VentasPage() {
    // ─── Estados de datos reales ──────────────────────────────
    const [rows, setRows] = useState<VentaRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ventasCrudas, setVentasCrudas] = useState<any[]>([]);

    // ─── Estados de filtros ───────────────────────────────────
    const [moneda, setMoneda] = useState("");
    const [tasaOficial, setTasaOficial] = useState("");
    const [tasaInformal, setTasaInformal] = useState("");
    const [cuentaContable, setCuentaContable] = useState("");
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");

    // ─── Cargar ventas al montar ──────────────────────────────
    useEffect(() => {
        fetchVentas();
    }, []);

    // ─── Función helper de mapeo (reutilizable) ─────────────────
    const mapearVenta = (v: any) => {
        // ─── CLIENTE ──────────────────────────────────────────────
        // La venta NO tiene clienteId ni clienteNombre directamente
        // El clienteId está DENTRO del pago (solo para crédito)
        let nombreCliente = 'Cliente no disponible';

        if (v.pago && typeof v.pago === 'object') {
            // Para pago crédito: clienteId está en pago.clienteId
            if (v.pago.clienteId && typeof v.pago.clienteId === 'string') {
                nombreCliente = `Cliente crédito (${v.pago.clienteId.slice(-6)})`;
            }
            // Para efectivo/transferencia: no hay cliente
            else if (v.pago.metodoPago === 'efectivo') {
                nombreCliente = 'Venta al contado';
            }
            else if (v.pago.metodoPago === 'transferencia') {
                nombreCliente = 'Transferencia';
            }
        }

        // ─── PAGO ───────────────────────────────────────────────
        let metodoPago = 'Desconocido';
        let montoPagado = 0;
        let cambio = 0;

        if (v.pago && typeof v.pago === 'object') {
            metodoPago = v.pago.metodoPago || 'Desconocido';
            montoPagado = Number(v.pago.monto_pagado) || 0;
            cambio = Number(v.pago.cambio) || 0;
        }

        // ─── FECHA ──────────────────────────────────────────────
        // La venta NO tiene createdAt/updatedAt (falta timestamps en schema)
        // Usamos la fecha del pago como fallback
        let fechaFormateada = 'Fecha no disponible';

        const fechaRaw = v.createdAt || v.updatedAt || (v.pago && v.pago.createdAt);

        if (fechaRaw) {
            try {
                const fecha = new Date(fechaRaw);
                if (!isNaN(fecha.getTime())) {
                    fechaFormateada = fecha.toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    });
                }
            } catch (e) {
                fechaFormateada = String(fechaRaw);
            }
        }

        // ─── TOTALES ────────────────────────────────────────────
        const subtotal = Number(v.subtotal_venta) || 0;
        const descuento = Number(v.descuento_total) || 0;
        const impuesto = Number(v.impuesto) || 0;
        const total = subtotal - descuento + impuesto;

        return {
            id: v._id,
            factura: `V-${(v._id || '').slice(-6).toUpperCase()}`,
            cliente: nombreCliente,
            fecha: fechaFormateada,
            metodoPago: metodoPago.charAt(0).toUpperCase() + metodoPago.slice(1),
            moneda: montoPagado,
            subtotal, descuento, impuesto, total,
            estado: 'Completada',
            productosCount: Array.isArray(v.productos) ? v.productos.length : 0,
            cambio,
        };
    };

    // ─── fetchVentas estilo Kardex ──────────────────────────────
    const fetchVentas = async (): Promise<void> => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/venta`);
            if (!response.ok) throw new Error('Error al cargar ventas');
            const result = await response.json();

            const data = Array.isArray(result) ? result : result.data || [];
            setVentasCrudas(data);  // Guardar datos crudos para filtrar después

            const mappedData = data.map(mapearVenta);
            setRows(mappedData);
        } catch (err: any) {
            setError('Error al cargar ventas: ' + err.message);
            console.error('Error fetching ventas:', err);
        } finally {
            setLoading(false);
        }
    };

    // ─── Filtrar por rango de fechas ──────────────────────────
    const filtrarPorFecha = (): void => {
        if (!fechaDesde && !fechaHasta) {
            // Sin filtros: mostrar todas
            const mappedData = ventasCrudas.map(mapearVenta);
            setRows(mappedData);
            return;
        }

        const desde = fechaDesde ? new Date(fechaDesde) : null;
        const hasta = fechaHasta ? new Date(fechaHasta) : null;
        if (hasta) hasta.setHours(23, 59, 59, 999);

        const filtradas = ventasCrudas.filter((v: any) => {
            if (!v.createdAt) return false;  // Si no tiene fecha, no pasa el filtro
            const fechaVenta = new Date(v.createdAt);
            if (isNaN(fechaVenta.getTime())) return false;
            if (desde && fechaVenta < desde) return false;
            if (hasta && fechaVenta > hasta) return false;
            return true;
        });

        const mappedData = filtradas.map(mapearVenta);
        setRows(mappedData);
    };

    useEffect(() => {
        filtrarPorFecha();
    }, [fechaDesde, fechaHasta]);

    // ─── Helpers ──────────────────────────────────────────────
    const getFlag = (currency: string) => {
        switch (currency) {
            case "CUP": return "https://flagcdn.com/w40/cu.png";
            case "USD": return "https://flagcdn.com/w40/us.png";
            case "EUR": return "https://flagcdn.com/w40/eu.png";
            default: return "";
        }
    };

    const formatNumber = (value: string) => {
        if (!value) return "";
        return new Intl.NumberFormat("es-ES").format(Number(value));
    };

    const calcularFluctuacion = () => {
        const oficial = parseFloat(tasaOficial);
        const informal = parseFloat(tasaInformal);
        if (!oficial || !informal || oficial === 0) return 0;
        return ((informal - oficial) / oficial) * 100;
    };

    const getMetodoPagoColor = (metodo: string): "success" | "warning" | "info" | "default" => {
        switch (metodo.toLowerCase()) {
            case 'efectivo': return 'success';
            case 'transferencia': return 'info';
            case 'credito': return 'warning';
            default: return 'default';
        }
    };

    // ─── Columnas del DataGrid adaptadas al backend ───────────
    const columns = [
        {
            field: "factura",
            headerName: "Factura",
            width: 120,
            renderCell: (params: any) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ReceiptIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {params.value}
                    </Typography>
                </Box>
            ),
        },
        {
            field: "cliente",
            headerName: "Cliente",
            width: 200,
            renderCell: (params: any) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.light', fontSize: 12 }}>
                        <PersonIcon sx={{ fontSize: 16 }} />
                    </Avatar>
                    <Typography variant="body2">
                        {params.value}
                    </Typography>
                </Box>
            ),
        },
        {
            field: "fecha",
            headerName: "Fecha",
            width: 160,
            renderCell: (params: any) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                        {params.value}
                    </Typography>
                </Box>
            ),
        },
        {
            field: "metodoPago",
            headerName: "Método de Pago",
            width: 140,
            renderCell: (params: any) => (
                <Chip
                    label={params.value}
                    size="small"
                    color={getMetodoPagoColor(params.value)}
                    variant="outlined"
                    sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                />
            ),
        },
        {
            field: "productosCount",
            headerName: "Productos",
            width: 100,
            type: 'number',
            align: 'center',
            headerAlign: 'center',
        },
        {
            field: "subtotal",
            headerName: "Subtotal",
            width: 120,
            type: 'number',
            valueFormatter: (params: any) =>
                params.value ? `$${Number(params.value).toFixed(2)}` : '$0.00',
        },
        {
            field: "descuento",
            headerName: "Descuento",
            width: 120,
            type: 'number',
            valueFormatter: (params: any) =>
                params.value ? `-$${Number(params.value).toFixed(2)}` : '$0.00',
        },
        {
            field: "impuesto",
            headerName: "Impuesto",
            width: 120,
            type: 'number',
            valueFormatter: (params: any) =>
                params.value ? `+$${Number(params.value).toFixed(2)}` : '$0.00',
        },
        {
            field: "total",
            headerName: "Total",
            width: 130,
            type: 'number',
            renderCell: (params: any) => (
                <Typography
                    variant="body2"
                    sx={{
                        background: 'linear-gradient(135deg, rgba(0, 89, 255, 0.84), rgba(230, 21, 118, 0.9))',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontWeight: 700,
                    }}
                >
                    ${Number(params.value).toFixed(2)}
                </Typography>
            ),
        },
        {
            field: "moneda",
            headerName: "Monto Pagado",
            width: 130,
            type: 'number',
            valueFormatter: (params: any) =>
                params.value ? `$${Number(params.value).toFixed(2)}` : '$0.00',
        },
        {
            field: "estado",
            headerName: "Estado",
            width: 120,
            renderCell: (params: any) => (
                <Chip
                    label={params.value}
                    size="small"
                    color="success"
                    sx={{
                        fontWeight: 600,
                        bgcolor: 'rgba(76, 175, 80, 0.1)',
                        color: '#2e7d32',
                    }}
                />
            ),
        },
    ];

    return (
        <Box>
            {/* Header */}
            <Box
                sx={{
                    width: '100%',
                    height: 60,
                    background:
                        "linear-gradient(135deg, rgba(0,114,255,0.9), rgba(142,45,226,0.9)), url('/images/login-bg.jpg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    alignContent: 'center',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 2,
                }}>
                <Typography variant="h5" sx={{ ml: 2, color: 'white' }}>
                    Gestión de Ventas y Facturación
                </Typography>
                <Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        sx={{
                            ml: 1,
                            background: "linear-gradient(135deg, rgb(0, 174, 255), rgba(196, 45, 226, 0.9))",
                            color: "#fff",
                            textTransform: "none",
                            fontWeight: 600,
                            boxShadow: "none",
                            "&:hover": {
                                background: "linear-gradient(135deg, rgb(0, 174, 255), rgb(196, 45, 226))",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                            }
                        }}
                    >
                        Nueva Venta
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<PictureAsPdfIcon sx={{ fontSize: "medium" }} />}
                        sx={{
                            ml: 1,
                            background: "linear-gradient(135deg, rgba(255,0,0,0.9), rgba(196, 45, 226, 0.9))",
                            color: "#fff",
                            textTransform: "none",
                            fontWeight: 600,
                            boxShadow: "none",
                            "&:hover": {
                                background: "linear-gradient(135deg, rgba(255,0,0,1), rgb(196, 45, 226))",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                            }
                        }}
                    >
                        Exportar PDF
                    </Button>
                </Box>
            </Box>

            <Card sx={{ width: '100%' }}>
                <CardContent>
                    {/* ─── Filtros y Configuración ────────────────────── */}
                    <Card sx={{ p: 1 }}>
                        <Typography variant="h6" sx={{ m: 1 }}>
                            Configuración de Moneda y del IVA
                        </Typography>
                        <CardContent>
                            <Card sx={{ p: 2 }}>
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 2,
                                    }}
                                >
                                    <Box sx={{ flex: { xs: "100%", md: "23%" } }}>
                                        <TextField
                                            select
                                            fullWidth
                                            label="Moneda"
                                            value={moneda}
                                            onChange={(e) => setMoneda(e.target.value)}
                                            slotProps={{
                                                input: {
                                                    startAdornment: moneda && (
                                                        <InputAdornment position="start">
                                                            <img
                                                                src={getFlag(moneda)}
                                                                alt="flag"
                                                                width={24}
                                                                style={{ borderRadius: 3 }}
                                                            />
                                                        </InputAdornment>
                                                    ),
                                                }
                                            }}
                                        >
                                            <MenuItem value="CUP">
                                                <CurrencyExchangeIcon sx={{ mr: 1 }} />
                                                CUP - Peso Cubano
                                            </MenuItem>
                                            <MenuItem value="USD">
                                                <AttachMoneyIcon sx={{ mr: 1 }} />
                                                USD - Dólar Americano
                                            </MenuItem>
                                            <MenuItem value="EUR">
                                                <EuroIcon sx={{ mr: 1 }} />
                                                EUR - Euro
                                            </MenuItem>
                                        </TextField>
                                    </Box>

                                    <Box sx={{ flex: { xs: "100%", md: "23%" } }}>
                                        <TextField
                                            fullWidth
                                            label="Tasa del Banco Central"
                                            value={formatNumber(tasaOficial)}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, "");
                                                setTasaOficial(value);
                                            }}
                                            slotProps={{
                                                input: {
                                                    startAdornment: (
                                                        <InputAdornment position="start"><CurrencyExchangeIcon sx={{ mr: 1 }} /></InputAdornment>
                                                    ),
                                                }
                                            }}
                                        />
                                    </Box>

                                    <Box sx={{ flex: { xs: "100%", md: "23%" } }}>
                                        <TextField
                                            fullWidth
                                            label="Tasa del Mercado Informal"
                                            value={formatNumber(tasaInformal)}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, "");
                                                setTasaInformal(value);
                                            }}
                                            slotProps={{
                                                input: {
                                                    startAdornment: (
                                                        <InputAdornment position="start"><CurrencyExchangeIcon sx={{ mr: 1 }} /></InputAdornment>
                                                    ),
                                                },
                                            }}
                                        />
                                    </Box>

                                    <Box sx={{ flex: { xs: "100%", md: "23%" } }}>
                                        <TextField
                                            fullWidth
                                            type="number"
                                            label="Porcentaje IVA"
                                        />
                                    </Box>

                                    <Box sx={{ flex: { xs: "100%", md: "23%" } }}>
                                        <TextField
                                            fullWidth
                                            label="Fluctuación"
                                            value={calcularFluctuacion().toFixed(2)}
                                            slotProps={{
                                                input: {
                                                    endAdornment: (
                                                        <InputAdornment position="end">%</InputAdornment>
                                                    ),
                                                }
                                            }}
                                            helperText={
                                                calcularFluctuacion() > 0
                                                    ? "El mercado informal está por encima"
                                                    : calcularFluctuacion() < 0
                                                        ? "El mercado informal está por debajo"
                                                        : "Sin diferencia"
                                            }
                                        />
                                    </Box>

                                    {/* Filtros de fecha */}
                                    <Box sx={{ flex: { xs: "100%", md: "23%" } }}>
                                        <TextField
                                            fullWidth
                                            type="date"
                                            label="Desde"
                                            value={fechaDesde}
                                            onChange={(e) => setFechaDesde(e.target.value)}
                                            slotProps={{
                                                input: {
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <CalendarTodayIcon sx={{ fontSize: 18 }} />
                                                        </InputAdornment>
                                                    )
                                                }
                                            }}
                                        />
                                    </Box>
                                    <Box sx={{ flex: { xs: "100%", md: "23%" } }}>
                                        <TextField
                                            fullWidth
                                            type="date"
                                            label="Hasta"
                                            value={fechaHasta}
                                            onChange={(e) => setFechaHasta(e.target.value)}
                                            slotProps={{
                                                input: {
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <CalendarTodayIcon sx={{ fontSize: 18 }} />
                                                        </InputAdornment>
                                                    )
                                                }
                                            }}
                                        />
                                    </Box>
                                </Box>
                            </Card>
                        </CardContent>
                    </Card>

                    {/* ─── Cuenta Contable ────────────────────────────── */}
                    <Card sx={{ p: 1, mt: 2 }}>
                        <Typography variant="h6" sx={{ m: 1 }}>
                            Cuenta Contable
                        </Typography>
                        <CardContent>
                            <Card sx={{ p: 2 }}>
                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                                    <Box sx={{ flex: { xs: "100%", md: "32%" } }}>
                                        <TextField
                                            select
                                            fullWidth
                                            label="Cuenta Contable"
                                            value={cuentaContable}
                                            onChange={(e) => setCuentaContable(e.target.value)}
                                        >
                                            <MenuItem value="VENTAS_NACIONALES">Ventas nacionales</MenuItem>
                                            <MenuItem value="VENTAS_EXPORTACION">Ventas de Exportación</MenuItem>
                                            <MenuItem value="VENTAS_CONTADO">Ventas al Contado</MenuItem>
                                        </TextField>
                                    </Box>
                                </Box>
                            </Card>
                        </CardContent>
                    </Card>

                    {/* ─── DataGrid con datos reales ──────────────────── */}
                    <Box sx={{ mt: 2 }}>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                <CircularProgress />
                            </Box>
                        ) : error ? (
                            <Alert
                                severity="error"
                                action={
                                    <Button color="inherit" size="small" onClick={fetchVentas} startIcon={<RefreshIcon />}>
                                        Reintentar
                                    </Button>
                                }
                            >
                                {error}
                            </Alert>
                        ) : rows.length === 0 ? (
                            <Alert severity="info" sx={{ display: 'flex', alignItems: 'center' }}>
                                No hay ventas registradas en la base de datos.
                                <Button size="small" onClick={fetchVentas} startIcon={<RefreshIcon />} sx={{ ml: 2 }}>
                                    Recargar
                                </Button>
                            </Alert>
                        ) : (
                            <CustomDataGrid
                                title={`Ventas registradas (${rows.length})`}
                                rows={rows}
                                getRowId={(row: any) => row.id}
                                columns={columns}
                            />
                        )}
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}