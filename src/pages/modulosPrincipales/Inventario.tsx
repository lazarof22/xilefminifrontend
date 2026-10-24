// src/pages/InventoryPage.tsx
import * as React from "react";
import {
    Card,
    CardContent,
    Typography,
    Box,
    Button,
    Tabs,
    Tab,
    CircularProgress,
} from '@mui/material';
import CustomDataGrid from "../../components/CustomDataGridR";
import AddIcon from '@mui/icons-material/Add';
import AssignmentAddIcon from '@mui/icons-material/AssignmentAdd';
import InventoryIcon from '@mui/icons-material/Inventory';
import HistoryIcon from '@mui/icons-material/History';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useEffect, useState } from 'react';
import AlmacenesTab from '../../components/inventario/AlmacenesTabs';
import MovimientosTab from '../../components/inventario/MovimientosTabs';
import ReporteInventarioTab from "../../components/inventario/ReporteInventarioTab";
import AjusteInventarioDialog from "../../components/inventario/Dialogs/AjusteInventarioDialog";
import RegistrarCompraDialog from "../../components/inventario/Dialogs/RegistrarCompraDialog";
import RegistrarTransferenciaDialog from "../../components/inventario/Dialogs/RegistrarTransferenciaDialog";
import { useNotify } from '../../components/notificaciones/useNotify';
import { getErrorMessage } from '../../utils/errorMessage';

interface EstadoBackend {
    _id: string;
    estado: string;
}

interface CategoriaBackend {
    _id: string;
    nombre_categoria: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function InventoryPage() {
    const notify = useNotify();
    const [tab, setTab] = useState(0);

    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [estadosBackend, setEstadosBackend] = useState<EstadoBackend[]>([]);
    const [categoriasBackend, setCategoriasBackend] = useState<CategoriaBackend[]>([]);

    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const [newProduct, setNewProduct] = useState({
        codigo_producto: "",
        nombre_producto: "",
        categoria_producto: "",
        precio_compra: "",
        precio_venta: "",
        stock_inicial: "",
        stock_minimo: "",
        estadoId: "",
        estadoNombre: "",
    });
    const [errors, setErrors] = useState<any>({});

    const [openAdjustDialog, setOpenAdjustDialog] = useState(false);
    const [openCompraDialog, setOpenCompraDialog] = useState(false);
    const [openTransferenciaDialog, setOpenTransferenciaDialog] = useState(false);
    // Cambia tras registrar una compra/transferencia para que el historial se recargue.
    const [movimientosVersion, setMovimientosVersion] = useState(0);
    const [kardex, setKardex] = useState<any[]>([]);
    const [kardexLoading, setKardexLoading] = useState(false);

    // ─── TABS CONFIG ───
    const tabsConfig = [
        { icon: <InventoryIcon />, label: 'Productos' },
        { icon: <HistoryIcon />, label: 'Kardex' },
        { icon: <WarehouseIcon />, label: 'Almacenes' },
        { icon: <SwapHorizIcon />, label: 'Movimientos' },
        { icon: <SwapHorizIcon />, label: 'Reportes' },
    ];

    const handleChangeTab = (_event: React.SyntheticEvent, newValue: number) => {
        setTab(newValue);
        if (newValue === 0) {
            fetchProductos();
        }
        if (newValue === 1) {
            fetchKardex();
        }
    };

    useEffect(() => {
        fetchProductos();
        fetchEstados();
        fetchCategorias();
    }, []);

    const fetchProductos = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/producto`);
            if (!response.ok) throw new Error('Error al cargar productos');
            const result = await response.json();
            const data = Array.isArray(result) ? result : result.data || [];
            const mappedData = data.map((p: any) => ({
                id: p._id,
                codigo: p.codigo_producto,
                producto: p.nombre_producto,
                categoria: typeof p.categoria_producto === 'object'
                    ? p.categoria_producto?.nombre_categoria
                    : p.categoria_producto,
                precioCompra: p.precio_compra,
                precioVenta: p.precio_venta,
                stock: p.stock_inicial,
                stockMinimo: p.stock_minimo,
                estado: typeof p.estado === 'object'
                    ? p.estado?.estado
                    : p.estado,
                _original: p
            }));
            setRows(mappedData);
        } catch (err: any) {
            notify.error(`Error al cargar los productos: ${getErrorMessage(err)}`);
        } finally {
            setLoading(false);
        }
    };

    const fetchKardex = async () => {
        setKardexLoading(true);
        try {
            const response = await fetch(`${API_URL}/kardex`);
            if (!response.ok) throw new Error('Error al cargar Kardex');
            const result = await response.json();
            const data = Array.isArray(result) ? result : result.data || [];
            const mappedData = data.map((k: any) => {
                const productoObj = k.productoId;
                const nombreProducto = typeof productoObj === 'object' && productoObj !== null
                    ? productoObj.nombre_producto || 'Sin nombre'
                    : 'Producto desconocido';
                return {
                    id: k._id,
                    fecha: new Date(k.fecha).toLocaleString(),
                    producto: nombreProducto,
                    tipo: k.tipo,
                    cantidad: k.cantidad,
                    motivo: k.motivo,
                    stockFinal: k.stock,
                };
            });
            setKardex(mappedData);
        } catch (err: any) {
            notify.error(`Error al cargar Kardex: ${getErrorMessage(err)}`);
        } finally {
            setKardexLoading(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        setNewProduct((prev) => {
            const updated = { ...prev, [field]: value };
            if (field === "estadoId") {
                const selectedEstado = estadosBackend.find(est => est._id === value);
                updated.estadoNombre = selectedEstado?.estado || "";
            }
            setTimeout(() => validateForm(updated), 0);
            return updated;
        });
    };

    const validateForm = (product = newProduct): boolean => {
        let tempErrors: any = {};
        const precioCompra = Number(product.precio_compra);
        const precioVenta = Number(product.precio_venta);
        const stock = Number(product.stock_inicial);
        const stockMinimo = Number(product.stock_minimo);

        if (!product.codigo_producto) tempErrors.codigo_producto = "El código es obligatorio";
        if (!product.nombre_producto) tempErrors.nombre_producto = "El producto es obligatorio";
        if (!product.categoria_producto) tempErrors.categoria_producto = "Seleccione una categoría";
        if (!product.precio_compra) tempErrors.precio_compra = "Precio requerido";
        if (!product.precio_venta) tempErrors.precio_venta = "Precio requerido";
        if (!product.stock_inicial) tempErrors.stock_inicial = "Stock requerido";
        if (!product.stock_minimo) tempErrors.stock_minimo = "Stock mínimo requerido";
        if (!product.estadoId) tempErrors.estadoId = "Seleccione un estado";
        if (precioVenta <= precioCompra) {
            tempErrors.precio_venta = "El precio de venta debe ser mayor que el precio de compra";
        }
        if (stockMinimo > stock) {
            tempErrors.stock_minimo = "El stock mínimo no puede ser mayor que el stock actual";
        }
        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleCreateProduct = async () => {
        if (!validateForm()) return;
        try {
            const productData = {
                codigo_producto: newProduct.codigo_producto,
                nombre_producto: newProduct.nombre_producto,
                categoria_producto: newProduct.categoria_producto,
                precio_compra: Number(newProduct.precio_compra),
                precio_venta: Number(newProduct.precio_venta),
                stock_inicial: Number(newProduct.stock_inicial),
                stock_minimo: Number(newProduct.stock_minimo),
                estado: newProduct.estadoId,
            };
            const response = await fetch(`${API_URL}/producto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al crear producto');
            }
            await fetchProductos();
            setOpenCreateDialog(false);
            notify.success('Producto creado exitosamente');
            setNewProduct({
                codigo_producto: "",
                nombre_producto: "",
                categoria_producto: "",
                precio_compra: "",
                precio_venta: "",
                stock_inicial: "",
                stock_minimo: "",
                estadoId: "",
                estadoNombre: "",
            });
            setErrors({});
        } catch (err: any) {
            notify.error(`Error al crear el producto: ${getErrorMessage(err)}`);
        }
    };

    const fetchCategorias = async () => {
        try {
            const response = await fetch(`${API_URL}/categoria`);
            if (!response.ok) throw new Error('Error al cargar categorías');
            const result = await response.json();
            const data = Array.isArray(result) ? result : result.data || [];
            setCategoriasBackend(data);
        } catch (err: any) {
            notify.error(`Error al cargar categorías: ${getErrorMessage(err)}`);
        }
    };

    const fetchEstados = async () => {
        try {
            const response = await fetch(`${API_URL}/estado`);
            if (!response.ok) throw new Error('Error al cargar estados');
            const result = await response.json();
            const data = Array.isArray(result) ? result : result.data || [];
            setEstadosBackend(data);
        } catch (err: any) {
            notify.error(`Error al cargar estados: ${getErrorMessage(err)}`);
        }
    };

    const recargarTrasMovimiento = async () => {
        setMovimientosVersion((v) => v + 1);
        await Promise.all([fetchProductos(), fetchKardex()]);
    };

    return (
        <Box>
            {/* ═══════════════════════════════════════════════════════════
                HEADER
                ═══════════════════════════════════════════════════════════ */}
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
                        Inventario
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                        Módulo de Gestión de Inventario
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="contained"
                        startIcon={<AssignmentAddIcon />}
                        onClick={() => setOpenAdjustDialog(true)}
                    >
                        Ajuste de Inventario
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<ShoppingCartIcon />}
                        onClick={() => setOpenCompraDialog(true)}
                    >
                        Registrar Compra
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<SwapHorizIcon />}
                        onClick={() => setOpenTransferenciaDialog(true)}
                    >
                        Registrar Transferencia
                    </Button>
                </Box>
            </Box>

            <Box sx={{ width: '100%', px: 2, pt: 2 }}>
                {/* ═══════════════════════════════════════════════════════════
                    TABS ESTILO PILL (como en la foto, adaptado a dark)
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

                {/* ================= TAB PRODUCTOS ================= */}
                {tab === 0 && (
                    <Card sx={{
                        width: '100%',
                        borderRadius: 3,
                        bgcolor: '#151a19',
                        border: '1px solid rgba(255,255,255,0.04)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                    }}>
                        <CardContent>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                    <CircularProgress sx={{ color: '#00e5a0' }} />
                                </Box>
                            ) : (
                                <CustomDataGrid
                                    title="Productos"
                                    rows={rows}
                                    getRowId={(row) => row.id}
                                    columns={[
                                        { field: "codigo", headerName: "Código", editable: false },
                                        { field: "producto", headerName: "Producto" },
                                        { field: "categoria", headerName: "Categoría", editable: false },
                                        { field: "precioCompra", headerName: "Precio Compra", numeric: true, editable: false },
                                        { field: "precioVenta", headerName: "Precio Venta", numeric: true },
                                        // El stock se cambia con "Ajustar inventario" (genera kardex), no editándolo aquí
                                        { field: "stock", headerName: "Stock", numeric: true, editable: false },
                                        { field: "stockMinimo", headerName: "Stock Mínimo", numeric: true },
                                        { field: "estado", headerName: "Estado", isStatusColumn: true, editable: false },
                                    ]}
                                    editConfig={{
                                        baseUrl: `${API_URL}/producto`,
                                        fieldMap: {
                                            producto: 'nombre_producto',
                                            precioVenta: 'precio_venta',
                                            stockMinimo: 'stock_minimo',
                                        },
                                        onSuccess: () => {
                                            fetchProductos();
                                            notify.success('Producto actualizado exitosamente');
                                        },
                                    }}
                                    deleteConfig={{
                                        baseUrl: `${API_URL}/producto`,
                                        onSuccess: () => {
                                            fetchProductos();
                                            notify.success('Producto eliminado exitosamente');
                                        },
                                        onError: (error) => {
                                            notify.error(`Error al eliminar: ${getErrorMessage(error)}`);
                                        },
                                    }}
                                />
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* ================= TAB KARDEX ================= */}
                {tab === 1 && (
                    <Card sx={{
                        width: '100%',
                        borderRadius: 3,
                        bgcolor: '#151a19',
                        border: '1px solid rgba(255,255,255,0.04)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                    }}>
                        <CardContent>
                            {kardexLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                    <CircularProgress sx={{ color: '#00e5a0' }} />
                                </Box>
                            ) : (
                                <CustomDataGrid
                                    title="Registro Kardex"
                                    rows={kardex}
                                    getRowId={(row) => row.id}
                                    columns={[
                                        { field: "fecha", headerName: "Fecha" },
                                        { field: "producto", headerName: "Producto" },
                                        { field: "tipo", headerName: "Tipo" },
                                        { field: "cantidad", headerName: "Cantidad", numeric: true },
                                        { field: "motivo", headerName: "Motivo" },
                                        { field: "stockFinal", headerName: "Stock Final", numeric: true },
                                    ]}
                                    deleteConfig={{
                                        baseUrl: `${API_URL}/kardex`,
                                        onSuccess: () => {
                                            fetchKardex();
                                            notify.success('Registro kardex eliminado exitosamente');
                                        },
                                        onError: (error) => {
                                            notify.error(`Error al eliminar: ${getErrorMessage(error)}`);
                                        },
                                    }}
                                />
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* ================= TAB ALMACENES ================= */}
                {tab === 2 && (
                    <Box>
                        <AlmacenesTab />
                    </Box>
                )}

                {/* ================= TAB MOVIMIENTOS ================= */}
                {tab === 3 && (
                    <Box>
                        <MovimientosTab refreshKey={movimientosVersion} />
                    </Box>
                )}
                {/* ================= TAB REPORTES ================= */}
                {tab === 4 && (
                    <Box>
                        <ReporteInventarioTab />
                    </Box>
                )}
            </Box>

            {/* ═══════════════════════════════════════════════════════════
                DIALOG AJUSTE DE INVENTARIO
                ═══════════════════════════════════════════════════════════ */}
            <AjusteInventarioDialog
                open={openAdjustDialog}
                onClose={() => setOpenAdjustDialog(false)}
                productos={rows.map((r) => ({ id: r.id, producto: r.producto, stock: r.stock }))}
                onAjustado={async () => {
                    await Promise.all([fetchProductos(), fetchKardex()]);
                }}
            />

            <RegistrarCompraDialog
                open={openCompraDialog}
                onClose={() => setOpenCompraDialog(false)}
                onCambio={recargarTrasMovimiento}
            />
            <RegistrarTransferenciaDialog
                open={openTransferenciaDialog}
                onClose={() => setOpenTransferenciaDialog(false)}
                onCambio={recargarTrasMovimiento}
            />
        </Box>
    );
}