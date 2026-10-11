// src/pages/PuntoVentaPage.tsx
import React, { useState, useEffect } from 'react';
import {
    Typography, Box,
    Tabs,
    Tab,
    Badge,
} from '@mui/material';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import jsPDF from "jspdf";
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { type ClienteFormData } from '../../components/AddClientDialog';
import { type Column } from '../../components/CustomDataGridR';
import FacturacionTab from '../../components/puntoVenta/FacturacionTab';
import CatalogoProductosTab from '../../components/puntoVenta/CatalogoProductosTab';
import CarritoTab, { type CarritoItem } from '../../components/puntoVenta/Carrito';
import CuadreCajaTab from '../../components/puntoVenta/CuadreCaja';
import ReporteCajaTab from '../../components/puntoVenta/ReporteCajaTab';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReportePlusTab, { type TransaccionDia, type ResumenTurno } from '../../components/puntoVenta/ReportePlus';
import IPVTab from '../../components/puntoVenta/IPVTab';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
interface ProductoAPI {
    _id: string;
    codigo_producto: string;
    nombre_producto: string;
    categoria_producto: string; // ObjectId como string
    precio_compra: number;
    precio_venta: number;
    stock_inicial: number;
    stock_minimo: number;
    estado: string; // ObjectId como string
    createdAt?: string;
    updatedAt?: string;
}

interface VentaHistorial {
    id: string;
    fecha: string;          // Fecha sin hora
    producto: string;       // Nombre del producto
    cantidadVendida: number;
    stockFinal: number;
    descuento: number;
    impuesto: number;
    totalPagado: number;
}

export default function PuntoVentaPage() {
    // ─── ESTADOS DE PRODUCTOS (REEMPLAZA EL ARRAY ESTÁTICO) ──────────
    const [productos, setProductos] = useState<ProductoAPI[]>([]);
    const [loadingProductos, setLoadingProductos] = useState(false);
    const [errorProductos, setErrorProductos] = useState<string | null>(null);
    const [ventasHistorial, setVentasHistorial] = useState<VentaHistorial[]>([]);
    const [openDialog, setOpenDialog] = useState<boolean>(false);
    const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteFormData | null>(null);
    const [carrito, setCarrito] = React.useState<CarritoItem[]>([]);
    const [animateId, setAnimateId] = React.useState<string | null>(null);
    // 💳 Pago mixto
    const [transferencia, setTransferencia] = React.useState("");
    // 📊 Impuesto dinámico
    const [impuesto, setImpuesto] = React.useState(0);
    // 🧾 Datos de facturación
    const [cliente, setCliente] = React.useState("");
    const [nit, setNit] = React.useState("");
    const [tab, setTab] = React.useState(0);

    const reportePlusColumns: Column<VentaHistorial>[] = [
        { field: 'fecha', headerName: 'Fecha' },
        { field: 'producto', headerName: 'Producto' },
        { field: 'cantidadVendida', headerName: 'Cantidad Vendida', numeric: true },
        { field: 'stockFinal', headerName: 'Stock Final', numeric: true },
        { field: 'descuento', headerName: 'Descuento (%)', numeric: true },
        { field: 'impuesto', headerName: 'Impuesto (%)', numeric: true },
        { field: 'totalPagado', headerName: 'Total Pagado', numeric: true },
    ];

    // Cargar productos desde la API al montar
    useEffect(() => {
        fetchProductos();
    }, []);

    const fetchProductos = async () => {
        setLoadingProductos(true);
        setErrorProductos(null);
        try {
            const response = await fetch(`${API_URL}/producto`);
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            const result = await response.json();

            const data = Array.isArray(result) ? result : result.data || [];

            const mappedData = data.map((p: any) => ({
                _id: p._id,
                codigo_producto: p.codigo_producto,
                nombre_producto: p.nombre_producto,
                categoria_producto: typeof p.categoria_producto === 'object'
                    ? p.categoria_producto?.nombre_categoria
                    : p.categoria_producto,
                precio_compra: p.precio_compra,
                precio_venta: p.precio_venta,
                stock_inicial: p.stock_inicial,
                stock_minimo: p.stock_minimo,
                estado: typeof p.estado === 'object'
                    ? p.estado?.estado
                    : p.estado,
            }));

            setProductos(mappedData);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error al cargar productos';
            setErrorProductos(msg);
            console.error('Error fetching productos:', error);
        } finally {
            setLoadingProductos(false);
        }
    };

    // Filtrado de productos ahora vive dentro de CatalogoProductosTab

    const handleChangeTab = (_event: React.SyntheticEvent, newValue: number) => {
        setTab(newValue);
    };

    const agregarAlCarrito = (producto: ProductoAPI) => {
        setAnimateId(producto._id);

        setCarrito((prev) => {
            const existe = prev.find((p) => p.id === producto._id);

            if (existe) {
                return prev.map((p) =>
                    p.id === producto._id
                        ? { ...p, cantidad: p.cantidad + 1 }
                        : p
                );
            }

            // Mapear ProductoAPI al formato del carrito
            return [...prev, {
                id: producto._id,
                codigo: producto.codigo_producto,
                nombre: producto.nombre_producto,
                precio: producto.precio_venta, // ← Usamos precio_venta
                stock: producto.stock_inicial,
                categoria: producto.categoria_producto,
                cantidad: 1,
                descuento: 0
            }];
        });

        setTimeout(() => setAnimateId(null), 300);
    };

    const total = carrito.reduce(
        (acc, item) => acc + item.precio * item.cantidad,
        0
    );

    // Subtotal
    const subtotal = carrito.reduce(
        (acc, item) => acc + item.precio * item.cantidad,
        0
    );

    const descuento = carrito.reduce(
        (acc, item) => acc + item.descuento,
        0
    )

    // Descuento aplicado
    const montoDescuento = subtotal * (descuento / 100);

    // Base imponible
    const base = subtotal - montoDescuento;

    // Impuesto aplicado
    const montoImpuesto = base * (impuesto / 100);

    // Total final
    const totalFinal = base + montoImpuesto;

    const totalItems = carrito.reduce(
        (acc, item) => acc + item.cantidad,
        0
    );

    const [moneda, setMoneda] = React.useState("CUP");
    const [tasa, setTasa] = React.useState(1);

    const convertirPrecio = (precioCUP: number) => {
        if (moneda === "CUP") return precioCUP;
        return precioCUP / tasa;
    };

    const totalConvertido = convertirPrecio(total);

    const [efectivo, setEfectivo] = React.useState("");

    const totalPagado =
        Number(efectivo || 0) + Number(transferencia || 0);

    const cambio =
        totalPagado > totalFinal
            ? totalPagado - totalFinal
            : 0;

    const [productosStock, setProductosStock] = React.useState([...productos]);

    const finalizarVenta = () => {
        const nuevosProductos = productosStock.map(prod => {
            const item = carrito.find(p => p.id === prod._id);
            if (item) {
                return {
                    ...prod,
                    stock: prod.stock_inicial - item.cantidad
                };
            }
            return prod;
        });

        setProductosStock(nuevosProductos);
        setCarrito([]);
        setEfectivo("");
    };

    const generarTicket = () => {
        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: [80, 200]
        });

        doc.setFontSize(10);
        doc.text("MI NEGOCIO", 10, 10);

        let y = 20;

        carrito.forEach((item) => {
            doc.text(
                `${item.nombre} x${item.cantidad}`,
                5,
                y
            );
            doc.text(
                `${(item.precio * item.cantidad).toFixed(2)}`,
                60,
                y
            );
            y += 6;
        });

        doc.text("------------------------", 5, y);
        y += 6;

        doc.text(`TOTAL: ${totalConvertido.toFixed(2)} ${moneda}`, 5, y);
        y += 6;

        doc.text(`EFECTIVO: ${Number(efectivo).toFixed(2)}`, 5, y);
        y += 6;

        doc.text(`CAMBIO: ${cambio.toFixed(2)}`, 5, y);

        doc.text(`Cliente: ${cliente}`, 10, y);
        doc.text(`NIT: ${nit}`, 10, y);

        doc.text(`Subtotal: ${subtotal}`, 10, y);
        doc.text(`Descuento: ${montoDescuento}`, 10, y);
        doc.text(`Impuesto: ${montoImpuesto}`, 10, y);
        doc.text(`Total: ${totalFinal}`, 10, y);

        doc.save("ticket.pdf");
    };

    const handleClienteCreado = (cliente: ClienteFormData) => {
        // El cliente recién creado ya está disponible para usar en la venta
        setClienteSeleccionado(cliente);
    };

    const handleVentaExitosa = (ventaId: string): void => {
        // Generar registro para el historial de cada producto vendido
        const fechaActual = new Date().toISOString().split('T')[0]; // Solo fecha YYYY-MM-DD

        const nuevasVentas = carrito.map(item => ({
            id: `${ventaId}-${item.id}`,
            fecha: fechaActual,
            producto: item.nombre,
            cantidadVendida: item.cantidad,
            stockFinal: Math.max(0, item.stock - item.cantidad),
            descuento: item.descuento,
            impuesto: impuesto,
            totalPagado: (item.cantidad * item.precio * (1 - item.descuento / 100)) * (1 + impuesto / 100)
        }));

        setVentasHistorial(prev => [...nuevasVentas, ...prev]);

        // ✅ Limpiar todo después de venta exitosa
        setCarrito([]);
        setEfectivo("");
        setTransferencia("");
        setClienteSeleccionado(null);
        setCliente("");
        setNit("");
    };

    // ─── TRANSACCIONES DEL DÍA (para Reporte Plus) ───
    const [transaccionesDia, setTransaccionesDia] = useState<TransaccionDia[]>(() => {
        const saved = localStorage.getItem('pv_transacciones_dia');
        if (saved) return JSON.parse(saved);
        return [];
    });

    // Persistir transacciones del día
    useEffect(() => {
        localStorage.setItem('pv_transacciones_dia', JSON.stringify(transaccionesDia));
    }, [transaccionesDia]);

    const agregarTransaccion = (tx: Omit<TransaccionDia, 'id' | 'fecha' | 'hora'>) => {
        const ahora = new Date();
        const nueva: TransaccionDia = {
            ...tx,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fecha: ahora.toISOString().split('T')[0],
            hora: ahora.toTimeString().split(' ')[0],
        };
        setTransaccionesDia((prev) => [...prev, nueva]);
    };

    // ─── CERRAR TURNO → REPORTE DE CAJA ───
    const handleCerrarTurno = (resumen: ResumenTurno): void => {
        // Guardar en localStorage para que ReporteCajaTab pueda leerlo
        const historialCaja = JSON.parse(localStorage.getItem('reporte_caja_historial') || '[]');
        historialCaja.push({
            ...resumen,
            cerradoEn: new Date().toISOString(),
        });
        localStorage.setItem('reporte_caja_historial', JSON.stringify(historialCaja));

        // También guardar el turno actual para el reporte de caja
        localStorage.setItem('reporte_caja_turno_actual', JSON.stringify(resumen));

        console.log('Turno cerrado y enviado a Reporte de Caja:', resumen);

        // Opcional: limpiar transacciones del día si se desea empezar nuevo turno
        // setTransaccionesDia([]);
    };

    // ─── TABS CONFIG ───
    const tabsConfig = [
        { icon: <ShoppingBasketIcon />, label: 'Productos' },
        { icon: <ReceiptLongIcon />, label: 'Facturación' },
        {
            icon: (
                <Badge
                    badgeContent={carrito.reduce((acc, item) => acc + item.cantidad, 0)}
                    color="error"
                    overlap="circular"
                >
                    <ShoppingCartIcon />
                </Badge>
            ),
            label: 'Carrito'
        },
        { icon: <AssessmentIcon />, label: 'Reporte Plus' },
        { icon: <TrendingUpIcon />, label: 'Reporte de Caja' },
        { icon: <AccountBalanceIcon />, label: 'Cuadre de Caja' },
        { icon: <AssessmentIcon />, label: 'IPV' }, 
    ];


    return (
        <Box>
            <Box
                sx={{
                    width: '100%',
                    height: 70,
                    background: "linear-gradient(135deg, #131817 0%, #043625 100%)",
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    alignContent: 'center',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 2,
                }}
            >
                <Box>
                    <Typography variant="h5" sx={{ color: '#f0f0f0', fontWeight: 700, letterSpacing: '-0.02em' }}>
                        Punto de Venta
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                        Módulo de Gestión de Venta de Productos
                    </Typography>
                </Box>
            </Box>
            <Box
                sx={{
                    display: "flex",
                    gap: 2,
                    width: "100%",
                    flexDirection: { xs: "column", md: "row" },
                }}
            >
                <Box sx={{ width: "100%" }}>
                    {/* 🔵 Tabs */}
                    <Box sx={{ width: '100%', px: 2, pt: 2 }}>
                        {/* ═══════════════════════════════════════════════════════════
                    TABS ESTILO PILL
                    ═══════════════════════════════════════════════════════════ */}
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                mb: 2,
                            }}
                        >
                            <Tabs
                                value={tab}
                                onChange={handleChangeTab}
                                variant="scrollable"
                                scrollButtons="auto"
                                allowScrollButtonsMobile
                                slotProps={{
                                    indicator: { sx: { display: 'none' } }
                                }}
                                sx={{
                                    background: '#151a19',
                                    borderRadius: 50,
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    p: 0.5,
                                    minHeight: 'auto',
                                    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                                    '& .MuiTabs-flexContainer': {
                                        gap: 0.5,
                                    },
                                    '& .MuiTabs-scrollButtons': {
                                        color: '#9ca3af',
                                        borderRadius: '50%',
                                        width: 32,
                                        height: 32,
                                        m: 0.5,
                                        '&:hover': {
                                            backgroundColor: 'rgba(0,229,160,0.08)',
                                            color: '#00e5a0',
                                        },
                                        '&.Mui-disabled': {
                                            opacity: 0.2,
                                        },
                                    },
                                }}
                            >
                                {tabsConfig.map((t, idx) => (
                                    <Tab
                                        key={idx}
                                        icon={t.icon}
                                        iconPosition="start"
                                        label={t.label}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            fontSize: '0.85rem',
                                            borderRadius: 50,
                                            minHeight: 40,
                                            px: 2.5,
                                            py: 0.8,
                                            color: '#9ca3af',
                                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                            '& .MuiTab-iconWrapper': {
                                                fontSize: '1.1rem',
                                                mr: 0.8,
                                            },
                                            '&:hover': {
                                                color: '#f0f0f0',
                                                backgroundColor: 'rgba(255,255,255,0.04)',
                                            },
                                            '&.Mui-selected': {
                                                color: '#0a0f0d',
                                                backgroundColor: '#00e5a0',
                                                fontWeight: 700,
                                                boxShadow: '0 2px 12px rgba(0,229,160,0.35)',
                                                '&:hover': {
                                                    backgroundColor: '#5cffc8',
                                                    boxShadow: '0 4px 20px rgba(0,229,160,0.45)',
                                                },
                                            },
                                        }}
                                    />
                                ))}
                            </Tabs>
                        </Box>
                    </Box>

                    {/* ================= TAB PRODUCTOS ================= */}
                    {tab === 0 && (
                        <CatalogoProductosTab
                            productos={productos}
                            loading={loadingProductos}
                            error={errorProductos}
                            onRetry={fetchProductos}
                            onAddToCart={agregarAlCarrito}
                        />
                    )}

                    {/* ================= TAB FACTURACIÓN ================= */}
                    {tab === 1 && (
                        <FacturacionTab
                            productos={productos}
                            onFacturaEmitida={(factura) => {
                                // Opcional: sincronizar con el carrito o reportes
                                console.log('Factura emitida:', factura);
                            }}
                        />
                    )}

                    {/* ================= TAB CARRITO ================= */}
                    {tab === 2 && (
                        <CarritoTab
                            carrito={carrito}
                            onCarritoChange={setCarrito}
                            moneda={moneda}
                            impuesto={impuesto}
                            clienteId={clienteSeleccionado?.id_cliente}
                            onVentaExitosa={handleVentaExitosa}
                        />
                    )}

                    {/* ================= TAB REPORTE PLUS ================= */}
                    {tab === 3 && (
                        <ReportePlusTab
                            transacciones={transaccionesDia}
                            onCerrarTurno={handleCerrarTurno}
                        />
                    )}

                    {/*Reporte Caja*/}
                    {tab === 4 && (
                        <ReporteCajaTab />
                    )}

                    {/* ================= TAB CUADRE DE CAJA ================= */}
                    {tab === 5 && (
                        <CuadreCajaTab
                            productos={productos}
                            facturas={[]}
                        />
                    )}

                    {/* ================= TAB IPV ================= */}
                    {tab === 6 && (
                        <IPVTab
                            productos={productos}
                        />
                    )}
                </Box>
            </Box>
        </Box >
    );
}