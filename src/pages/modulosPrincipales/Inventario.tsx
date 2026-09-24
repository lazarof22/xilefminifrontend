// src/pages/InventoryPage.tsx
import * as React from "react";
import {
    Card,
    CardContent,
    Typography,
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Snackbar,
    Alert,
    Checkbox,
    FormControlLabel,
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
import { useEffect, useState } from 'react';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AlmacenesTab from '../../components/inventario/AlmacenesTabs';
import MovimientosTab from '../../components/inventario/MovimientosTabs';
import ReporteInventarioTab from "../../components/inventario/ReporteInventarioTab";

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
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [increaseChecked, setIncreaseChecked] = useState(false);
    const [decreaseChecked, setDecreaseChecked] = useState(false);
    const [increaseAmount, setIncreaseAmount] = useState("");
    const [decreaseAmount, setDecreaseAmount] = useState("");
    const [decreaseReason, setDecreaseReason] = useState("");

    const [kardex, setKardex] = useState<any[]>([]);
    const [kardexLoading, setKardexLoading] = useState(false);

    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");

    const decreaseReasons = ["Producto dañado", "Venta manual", "Pérdida", "Ajuste administrativo"];

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
            setSnackbarMessage('Error al cargar los productos: ' + err.message);
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
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
            setSnackbarMessage('Error al cargar Kardex: ' + err.message);
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
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
            setSnackbarMessage('Producto creado exitosamente');
            setSnackbarSeverity('success');
            setOpenSnackbar(true);
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
            setSnackbarMessage('Error al crear el producto: ' + err.message);
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
        }
    };

    const handleIncreaseCheck = (checked: boolean) => {
        setIncreaseChecked(checked);
        if (checked) {
            setDecreaseChecked(false);
            setDecreaseAmount("");
            setDecreaseReason("");
        }
    };

    const handleDecreaseCheck = (checked: boolean) => {
        setDecreaseChecked(checked);
        if (checked) {
            setIncreaseChecked(false);
            setIncreaseAmount("");
        }
    };

    const handleConfirmAdjustment = async () => {
        if (!selectedProductId) return;
        const selectedProduct = rows.find(r => r.id === selectedProductId);
        if (!selectedProduct) return;

        let movementType: "entrada" | "salida" = "entrada";
        let quantity = 0;
        let newStock = selectedProduct.stock;

        if (increaseChecked) {
            quantity = Number(increaseAmount);
            movementType = "entrada";
            newStock += quantity;
        }
        if (decreaseChecked) {
            quantity = Number(decreaseAmount);
            movementType = "salida";
            newStock -= quantity;
            if (newStock < 0) newStock = 0;
        }

        try {
            const kardexData = {
                productoId: selectedProductId,
                tipo: movementType,
                cantidad: quantity,
                motivo: decreaseChecked ? decreaseReason : "Ingreso de inventario",
            };
            const kardexResponse = await fetch(`${API_URL}/kardex`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(kardexData),
            });
            if (!kardexResponse.ok) {
                const errorData = await kardexResponse.json();
                throw new Error(errorData.message || JSON.stringify(errorData) || 'Error al registrar en Kardex');
            }
            setRows((prev) =>
                prev.map((row) =>
                    row.id === selectedProductId ? { ...row, stock: newStock } : row
                )
            );
            await fetchKardex();
            setOpenAdjustDialog(false);
            setSelectedProductId("");
            setIncreaseChecked(false);
            setDecreaseChecked(false);
            setIncreaseAmount("");
            setDecreaseAmount("");
            setDecreaseReason("");
            setSnackbarMessage('Ajuste de inventario realizado correctamente');
            setSnackbarSeverity('success');
            setOpenSnackbar(true);
        } catch (err: any) {
            setSnackbarMessage('Error al ajustar el inventario: ' + err.message);
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
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
            setSnackbarMessage('Error al cargar categorías: ' + err.message);
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
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
            setSnackbarMessage('Error al cargar estados: ' + err.message);
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
        }
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
                                        { field: "codigo", headerName: "Código" },
                                        { field: "producto", headerName: "Producto" },
                                        { field: "categoria", headerName: "Categoría" },
                                        { field: "precioCompra", headerName: "Precio Compra", numeric: true },
                                        { field: "precioVenta", headerName: "Precio Venta", numeric: true },
                                        { field: "stock", headerName: "Stock", numeric: true },
                                        { field: "stockMinimo", headerName: "Stock Mínimo", numeric: true },
                                        { field: "estado", headerName: "Estado", isStatusColumn: true },
                                    ]}
                                    deleteConfig={{
                                        baseUrl: `${API_URL}/producto`,
                                        onSuccess: () => {
                                            fetchProductos();
                                            setSnackbarMessage('Producto eliminado exitosamente');
                                            setSnackbarSeverity('success');
                                            setOpenSnackbar(true);
                                        },
                                        onError: (error) => {
                                            setSnackbarMessage('Error al eliminar: ' + error.message);
                                            setSnackbarSeverity('error');
                                            setOpenSnackbar(true);
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
                                            setSnackbarMessage('Registro kardex eliminado exitosamente');
                                            setSnackbarSeverity('success');
                                            setOpenSnackbar(true);
                                        },
                                        onError: (error) => {
                                            setSnackbarMessage('Error al eliminar: ' + error.message);
                                            setSnackbarSeverity('error');
                                            setOpenSnackbar(true);
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
                        <MovimientosTab />
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
            <Dialog
                open={openAdjustDialog}
                onClose={() => setOpenAdjustDialog(false)}
                maxWidth="sm"
                fullWidth
                slotProps={{
                    paper: {
                        sx: {
                            bgcolor: '#151a19',
                            border: '1px solid rgba(255,255,255,0.06)',
                            boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                            borderRadius: 3,
                        }
                    }
                }}
            >
                <DialogTitle sx={{
                    background: 'linear-gradient(135deg, #0a0f0d 0%, #151a19 100%)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>
                    <Typography variant="h6"
                        sx={{
                            textAlign: "center",
                            color: '#00e5a0',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1,
                        }}>
                        <AssignmentAddIcon sx={{ color: '#00e5a0' }} />
                        Ajuste de Inventario
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ mt: 1 }}>
                    <TextField
                        select
                        fullWidth
                        label="Producto"
                        margin="normal"
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        variant="outlined"
                    >
                        {rows.map((row) => (
                            <MenuItem key={row.id} value={row.id}>
                                {row.producto} (Stock: {row.stock})
                            </MenuItem>
                        ))}
                    </TextField>

                    <Box sx={{ mt: 2 }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={increaseChecked}
                                    onChange={(e) => handleIncreaseCheck(e.target.checked)}
                                    sx={{
                                        color: 'rgba(255,255,255,0.3)',
                                        '&.Mui-checked': { color: '#00e5a0' },
                                    }}
                                />
                            }
                            label={<Typography sx={{ color: '#e5e7eb' }}>Aumentar Stock</Typography>}
                        />
                    </Box>
                    {increaseChecked && (
                        <TextField
                            fullWidth
                            type="number"
                            label="Cantidad a aumentar"
                            margin="normal"
                            value={increaseAmount}
                            onChange={(e) => setIncreaseAmount(e.target.value)}
                            variant="outlined"
                        />
                    )}

                    <Box sx={{ mt: 2 }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={decreaseChecked}
                                    onChange={(e) => handleDecreaseCheck(e.target.checked)}
                                    sx={{
                                        color: 'rgba(255,255,255,0.3)',
                                        '&.Mui-checked': { color: '#00e5a0' },
                                    }}
                                />
                            }
                            label={<Typography sx={{ color: '#e5e7eb' }}>Disminuir Stock</Typography>}
                        />
                    </Box>
                    {decreaseChecked && (
                        <>
                            <TextField
                                fullWidth
                                type="number"
                                label="Cantidad a disminuir"
                                margin="normal"
                                value={decreaseAmount}
                                onChange={(e) => setDecreaseAmount(e.target.value)}
                                variant="outlined"
                            />
                            <TextField
                                select
                                fullWidth
                                label="Motivo"
                                margin="normal"
                                value={decreaseReason}
                                onChange={(e) => setDecreaseReason(e.target.value)}
                                variant="outlined"
                            >
                                {decreaseReasons.map((reason) => (
                                    <MenuItem key={reason} value={reason}>
                                        {reason}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ display: "flex", p: 2, gap: 2, width: "100%" }}>
                    <Button
                        onClick={() => setOpenAdjustDialog(false)}
                        disabled={loading}
                        fullWidth
                        variant="outlined"
                        startIcon={<CancelIcon />}
                        sx={{
                            flex: 1,
                            borderColor: 'rgba(255,255,255,0.1)',
                            color: '#9ca3af',
                            '&:hover': {
                                borderColor: '#ef4444',
                                color: '#ef4444',
                                bgcolor: 'rgba(239,68,68,0.08)',
                            }
                        }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleConfirmAdjustment}
                        disabled={
                            !selectedProductId ||
                            (!increaseChecked && !decreaseChecked) ||
                            (increaseChecked && !increaseAmount) ||
                            (decreaseChecked && (!decreaseAmount || !decreaseReason))
                        }
                        fullWidth
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                    >
                        {loading ? 'Guardando...' : 'Confirmar'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ═══════════════════════════════════════════════════════════
                SNACKBAR
                ═══════════════════════════════════════════════════════════ */}
            <Snackbar
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={() => setOpenSnackbar(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity={snackbarSeverity}
                    variant="outlined"
                    onClose={() => setOpenSnackbar(false)}
                    sx={{
                        width: '100%',
                        bgcolor: snackbarSeverity === 'success' ? 'rgba(0,229,160,0.08)' : 'rgba(239,68,68,0.08)',
                        borderColor: snackbarSeverity === 'success' ? 'rgba(0,229,160,0.2)' : 'rgba(239,68,68,0.2)',
                        color: snackbarSeverity === 'success' ? '#00e5a0' : '#f87171',
                    }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
}