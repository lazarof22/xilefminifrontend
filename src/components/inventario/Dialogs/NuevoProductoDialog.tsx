import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    MenuItem,
    CircularProgress,
    Alert,
    Snackbar,
    Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

// ─── Configuración ───────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Tipos ─────────────────────────────────────────────

export interface CategoriaOption {
    _id: string;
    nombre_categoria: string;
}

export interface EstadoOption {
    _id: string;
    estado: string;
}

export interface ProductoFormData {
    codigo_producto: string;
    nombre_producto: string;
    categoria_producto: string;
    precio_compra: string;
    precio_venta: string;
    stock_inicial: string;
    stock_minimo: string;
    estadoId: string;
}

interface ProductoErrors {
    codigo_producto?: string;
    nombre_producto?: string;
    categoria_producto?: string;
    precio_compra?: string;
    precio_venta?: string;
    stock_inicial?: string;
    stock_minimo?: string;
    estadoId?: string;
}

// Forma del producto ya creado, tal como responde el backend
export interface ProductoCreado {
    _id: string;
    codigo_producto: string;
    nombre_producto: string;
    categoria_producto: string;
    precio_compra: number;
    precio_venta: number;
    stock_inicial: number;
    stock_minimo: number;
    estadoId: string;
    [key: string]: unknown;
}

export interface NuevoProductoDialogProps {
    open: boolean;
    onClose: () => void;
    categoriasBackend: CategoriaOption[];
    estadosBackend: EstadoOption[];
    onProductoCreado?: (producto: ProductoCreado) => void;
}

// ─── Constantes ──────────────────────────────────────

const initialProduct: ProductoFormData = {
    codigo_producto: '',
    nombre_producto: '',
    categoria_producto: '',
    precio_compra: '',
    precio_venta: '',
    stock_inicial: '',
    stock_minimo: '',
    estadoId: ''
};

// ─── Componente ──────────────────────────────────────

export default function NuevoProductoDialog({
    open,
    onClose,
    categoriasBackend,
    estadosBackend,
    onProductoCreado
}: NuevoProductoDialogProps): React.JSX.Element {
    const [newProduct, setNewProduct] = useState<ProductoFormData>(initialProduct);
    const [errors, setErrors] = useState<ProductoErrors>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({
        open: false,
        message: '',
        severity: 'success'
    });

    const handleChange = (field: keyof ProductoFormData, value: string): void => {
        setNewProduct(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validate = (): boolean => {
        const newErrors: ProductoErrors = {};

        if (!newProduct.codigo_producto.trim()) {
            newErrors.codigo_producto = 'El código es requerido';
        }
        if (!newProduct.nombre_producto.trim()) {
            newErrors.nombre_producto = 'El nombre del producto es requerido';
        }
        if (!newProduct.categoria_producto.trim()) {
            newErrors.categoria_producto = 'La categoría es requerida';
        }
        if (!newProduct.precio_compra.trim()) {
            newErrors.precio_compra = 'El precio de compra es requerido';
        } else if (isNaN(Number(newProduct.precio_compra)) || Number(newProduct.precio_compra) <= 0) {
            newErrors.precio_compra = 'Debe ser un número mayor a 0';
        }
        if (!newProduct.precio_venta.trim()) {
            newErrors.precio_venta = 'El precio de venta es requerido';
        } else if (isNaN(Number(newProduct.precio_venta)) || Number(newProduct.precio_venta) <= 0) {
            newErrors.precio_venta = 'Debe ser un número mayor a 0';
        } else if (
            newProduct.precio_compra.trim() &&
            !isNaN(Number(newProduct.precio_compra)) &&
            Number(newProduct.precio_venta) < Number(newProduct.precio_compra)
        ) {
            newErrors.precio_venta = 'No puede ser menor al precio de compra';
        }
        if (!newProduct.stock_inicial.trim()) {
            newErrors.stock_inicial = 'El stock inicial es requerido';
        } else if (isNaN(Number(newProduct.stock_inicial)) || Number(newProduct.stock_inicial) < 0) {
            newErrors.stock_inicial = 'Debe ser un número válido';
        }
        if (!newProduct.stock_minimo.trim()) {
            newErrors.stock_minimo = 'El stock mínimo es requerido';
        } else if (isNaN(Number(newProduct.stock_minimo)) || Number(newProduct.stock_minimo) < 0) {
            newErrors.stock_minimo = 'Debe ser un número válido';
        }
        if (!newProduct.estadoId.trim()) {
            newErrors.estadoId = 'El estado es requerido';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCreateProduct = async (): Promise<void> => {
        if (!validate()) return;

        setLoading(true);

        try {
            const payload = {
                codigo_producto: newProduct.codigo_producto.trim(),
                nombre_producto: newProduct.nombre_producto.trim(),
                categoria_producto: newProduct.categoria_producto,
                precio_compra: Number(newProduct.precio_compra),
                precio_venta: Number(newProduct.precio_venta),
                stock_inicial: Number(newProduct.stock_inicial),
                stock_minimo: Number(newProduct.stock_minimo),
                estadoId: newProduct.estadoId
            };

            const response = await fetch(`${API_URL}/producto`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
            }

            const productoCreado = await response.json();

            setSnackbar({
                open: true,
                message: 'Producto creado exitosamente',
                severity: 'success'
            });

            // Callback para notificar al componente padre (MovimientosTab)
            onProductoCreado?.(productoCreado);

            // Limpiar y cerrar
            setNewProduct(initialProduct);
            setErrors({});

            setTimeout(() => {
                onClose();
            }, 1000);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al crear el producto';
            setSnackbar({
                open: true,
                message: errorMessage,
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = (): void => {
        setNewProduct(initialProduct);
        setErrors({});
        onClose();
    };

    const handleCloseSnackbar = (): void => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
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
                        <AddIcon sx={{ color: '#00e5a0' }} />
                        Nuevo Producto
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ mt: 1 }}>
                    <TextField
                        fullWidth
                        label="Código"
                        margin="normal"
                        value={newProduct.codigo_producto}
                        onChange={(e) => handleChange("codigo_producto", e.target.value)}
                        error={!!errors.codigo_producto}
                        helperText={errors.codigo_producto}
                        variant="outlined"
                        disabled={loading}
                    />
                    <TextField
                        fullWidth
                        label="Producto"
                        margin="normal"
                        value={newProduct.nombre_producto}
                        onChange={(e) => handleChange("nombre_producto", e.target.value)}
                        error={!!errors.nombre_producto}
                        helperText={errors.nombre_producto}
                        variant="outlined"
                        disabled={loading}
                    />
                    <TextField
                        select
                        fullWidth
                        label="Categoría"
                        margin="normal"
                        value={newProduct.categoria_producto}
                        onChange={(e) => handleChange("categoria_producto", e.target.value)}
                        error={!!errors.categoria_producto}
                        helperText={errors.categoria_producto}
                        variant="outlined"
                        disabled={loading}
                    >
                        {categoriasBackend.map((cat) => (
                            <MenuItem key={cat._id} value={cat._id}>
                                {cat.nombre_categoria}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth
                        type="number"
                        label="Precio Compra"
                        margin="normal"
                        value={newProduct.precio_compra}
                        onChange={(e) => handleChange("precio_compra", e.target.value)}
                        error={!!errors.precio_compra}
                        helperText={errors.precio_compra}
                        variant="outlined"
                        disabled={loading}
                    />
                    <TextField
                        fullWidth
                        type="number"
                        label="Precio Venta"
                        margin="normal"
                        value={newProduct.precio_venta}
                        onChange={(e) => handleChange("precio_venta", e.target.value)}
                        error={!!errors.precio_venta}
                        helperText={errors.precio_venta}
                        variant="outlined"
                        disabled={loading}
                    />
                    <TextField
                        fullWidth
                        type="number"
                        label="Stock"
                        margin="normal"
                        value={newProduct.stock_inicial}
                        onChange={(e) => handleChange("stock_inicial", e.target.value)}
                        error={!!errors.stock_inicial}
                        helperText={errors.stock_inicial}
                        variant="outlined"
                        disabled={loading}
                    />
                    <TextField
                        fullWidth
                        type="number"
                        label="Stock Mínimo"
                        margin="normal"
                        value={newProduct.stock_minimo}
                        onChange={(e) => handleChange("stock_minimo", e.target.value)}
                        error={!!errors.stock_minimo}
                        helperText={errors.stock_minimo}
                        variant="outlined"
                        disabled={loading}
                    />
                    <TextField
                        select
                        fullWidth
                        label="Estado"
                        margin="normal"
                        value={newProduct.estadoId}
                        onChange={(e) => handleChange("estadoId", e.target.value)}
                        error={!!errors.estadoId}
                        helperText={errors.estadoId}
                        variant="outlined"
                        disabled={loading}
                    >
                        {estadosBackend.map((est) => (
                            <MenuItem key={est._id} value={est._id}>
                                {est.estado}
                            </MenuItem>
                        ))}
                    </TextField>
                </DialogContent>
                <DialogActions sx={{ display: "flex", p: 2, gap: 2, width: "100%" }}>
                    <Button
                        onClick={handleClose}
                        disabled={loading}
                        fullWidth
                        variant="contained"
                        startIcon={<CancelIcon />}
                        sx={{
                            flex: 1,
                            bgcolor: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#9ca3af',
                            boxShadow: 'none',
                            '&:hover': {
                                borderColor: '#ef4444',
                                color: '#ef4444',
                                bgcolor: 'rgba(239,68,68,0.08)',
                                boxShadow: 'none',
                            }
                        }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCreateProduct}
                        disabled={loading || Object.keys(errors).length > 0}
                        fullWidth
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                        sx={{
                            flex: 1,
                            bgcolor: '#00e5a0',
                            color: '#0a0f0d',
                            fontWeight: 700,
                            boxShadow: 'none',
                            '&:hover': {
                                bgcolor: '#00c98c',
                                boxShadow: 'none',
                            }
                        }}
                    >
                        {loading ? 'Guardando...' : 'Guardar'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}