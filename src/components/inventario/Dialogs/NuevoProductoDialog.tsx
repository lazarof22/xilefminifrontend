import React, { useEffect, useState } from 'react';
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
import { nomencladoresApi } from "../../../service/nomencladoresApi";

// ─── Configuración ───────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Tipos ─────────────────────────────────────────────

export interface NomencladorValorOption {
    _id: string;
    nomencladorId: string;
    codigo: string;
    nombre: string;
    descripcion?: string;
    activo: boolean;
    orden: number;
}

export interface ProductoFormData {
    codigo_producto: string;
    nombre_producto: string;
    categoria_producto: string;
    contenedor: string;
    estadoId: string;
}

interface ProductoErrors {
    codigo_producto?: string;
    nombre_producto?: string;
    categoria_producto?: string;
    contenedor?: string;
    estadoId?: string;
}

// Forma del producto ya creado, tal como responde el backend
export interface ProductoCreado {
    _id: string;
    codigo_producto: string;
    nombre_producto: string;
    categoria_producto: string;
    contenedor: string;
    estadoId: string;
    [key: string]: unknown;
}

export interface NuevoProductoDialogProps {
    open: boolean;
    onClose: () => void;
    onProductoCreado?: (producto: ProductoCreado) => void;
}

// ─── Constantes ──────────────────────────────────────

const initialProduct: ProductoFormData = {
    codigo_producto: '',
    nombre_producto: '',
    categoria_producto: '',
    contenedor: '',
    estadoId: ''
};

// ─── Componente ──────────────────────────────────────

export default function NuevoProductoDialog({
    open,
    onClose,
    onProductoCreado
}: NuevoProductoDialogProps): React.JSX.Element {
    const [newProduct, setNewProduct] = useState<ProductoFormData>(initialProduct);
    const [errors, setErrors] = useState<ProductoErrors>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [categoriasProducto, setCategoriasProducto] = useState<
        NomencladorValorOption[]
    >([]);

    const [estadosProducto, setEstadosProducto] = useState<
        NomencladorValorOption[]
    >([]);

    const [loadingNomencladores, setLoadingNomencladores] =
        useState<boolean>(false);
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
        if (!newProduct.contenedor.trim()) {
            newErrors.contenedor = 'El contenedor es requerido';
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
                contenedor: newProduct.contenedor.trim(),
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

    const cargarNomencladores = async (): Promise<void> => {
        try {
            setLoadingNomencladores(true);

            const nomencladores = await nomencladoresApi.listar();

            const nomencladorCategorias = nomencladores.find(
                (nomenclador) =>
                    nomenclador.nombre
                        .toLowerCase()
                        .includes("categor")
            );

            const nomencladorEstados = nomencladores.find(
                (nomenclador) =>
                    nomenclador.nombre
                        .toLowerCase()
                        .includes("estado")
            );

            const [categorias, estados] = await Promise.all([
                nomencladorCategorias
                    ? nomencladoresApi.listarValores(
                        nomencladorCategorias.codigo,
                        false,
                    )
                    : Promise.resolve([]),

                nomencladorEstados
                    ? nomencladoresApi.listarValores(
                        nomencladorEstados.codigo,
                        false,
                    )
                    : Promise.resolve([]),
            ]);

            setCategoriasProducto(categorias);
            setEstadosProducto(estados);
        } catch (error) {
            console.error(
                "Error al cargar los nomencladores de productos:",
                error,
            );

            setCategoriasProducto([]);
            setEstadosProducto([]);

            setSnackbar({
                open: true,
                message:
                    "No se pudieron cargar las categorías y los estados",
                severity: "error",
            });
        } finally {
            setLoadingNomencladores(false);
        }
    };

    useEffect(() => {
        if (open) {
            cargarNomencladores();
        }
    }, [open]);

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
                            borderRadius: 2,
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
                        label="Nombre del producto"
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
                        onChange={(e) =>
                            handleChange("categoria_producto", e.target.value)
                        }
                        error={!!errors.categoria_producto}
                        helperText={errors.categoria_producto}
                        variant="outlined"
                        disabled={loading || loadingNomencladores}
                    >
                        <MenuItem value="">
                            <em>
                                {loadingNomencladores
                                    ? "Cargando categorías..."
                                    : "Seleccionar categoría"}
                            </em>
                        </MenuItem>

                        {categoriasProducto.map((cat) => (
                            <MenuItem key={cat._id} value={cat._id}>
                                {cat.nombre}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        select
                        fullWidth
                        label="Estado"
                        margin="normal"
                        value={newProduct.estadoId}
                        onChange={(e) =>
                            handleChange("estadoId", e.target.value)
                        }
                        error={!!errors.estadoId}
                        helperText={errors.estadoId}
                        variant="outlined"
                        disabled={loading || loadingNomencladores}
                    >
                        <MenuItem value="">
                            <em>
                                {loadingNomencladores
                                    ? "Cargando estados..."
                                    : "Seleccionar estado"}
                            </em>
                        </MenuItem>

                        {estadosProducto.map((est) => (
                            <MenuItem key={est._id} value={est._id}>
                                {est.nombre}
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
                            background: 'linear-gradient(135deg, #f80000 0%, #ec0163 100%)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#b8b9bb',
                            boxShadow: 'none',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #f80000 0%, #ec0163 100%)',
                                color: '#faf7f7',
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