// src/components/puntoVenta/CatalogoProductosTab.tsx
import React, { useMemo, useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    TextField,
    InputAdornment,
    Divider,
    Avatar,
    Stack,
    Alert,
    Button,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';
import ProductCard from '../ProductCard';

// ─── Tipos ─────────────────────────────────────────────
// Subconjunto de campos que este tab realmente necesita: cualquier
// producto que ya use la forma ProductoAPI de PuntoVentaPage encaja aquí.
export interface ProductoCatalogo {
    _id: string;
    codigo_producto: string;
    nombre_producto: string;
    categoria_producto: string;
    precio_venta: number;
    stock_inicial: number;
    stock_minimo: number;
}

export interface CatalogoProductosTabProps<T extends ProductoCatalogo = ProductoCatalogo> {
    productos: T[];
    loading?: boolean;
    error?: string | null;
    onRetry?: () => void;
    onAddToCart: (producto: T) => void;
}

// ─── Componente ──────────────────────────────────────

export default function CatalogoProductosTab<T extends ProductoCatalogo>({
    productos,
    loading = false,
    error = null,
    onRetry,
    onAddToCart,
}: CatalogoProductosTabProps<T>): React.JSX.Element {
    const [search, setSearch] = useState('');

    // Los productos sin precio de venta (0, vacío o no numérico) no se ofrecen en el catálogo.
    const productosConPrecio = useMemo(
        () => productos.filter((producto) => Number(producto.precio_venta) > 0),
        [productos]
    );

    const productosFiltrados = useMemo(() => {
        const texto = search.toLowerCase();
        return productosConPrecio.filter((producto) =>
            producto.nombre_producto.toLowerCase().includes(texto) ||
            producto.categoria_producto.toLowerCase().includes(texto) ||
            producto.precio_venta.toString().includes(texto) ||
            producto.codigo_producto.toLowerCase().includes(texto)
        );
    }, [productosConPrecio, search]);

    return (
        <Card sx={{ overflow: 'hidden', m: 1 }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                {/* ═══════════════════════════════════════════════
                    HEADER: Título + Buscador
                    ═══════════════════════════════════════════════ */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { xs: 'stretch', sm: 'center' },
                        mb: 3,
                        gap: 2,
                    }}
                >
                    <Typography
                        variant="h6"
                        sx={{
                            color: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                        }}
                    >
                        <ShoppingBasketIcon sx={{ width: 24, height: 24, color: 'primary.main' }} />
                        Catálogo de Productos
                    </Typography>

                    <TextField
                        placeholder="Buscar producto..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        size="small"
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                            },
                        }}
                        sx={{ width: { xs: '100%', sm: 280 } }}
                    />
                </Box>

                <Divider sx={{ mb: 3 }} />

                {/* ═══════════════════════════════════════════════
                    LISTA DE PRODUCTOS
                    ═══════════════════════════════════════════════ */}
                <Stack spacing={1.5}>
                    {loading ? (
                        // Skeletons de carga
                        <>
                            <ProductCard codigo="" nombre="" precio={0} stock={0} loading />
                            <ProductCard codigo="" nombre="" precio={0} stock={0} loading />
                            <ProductCard codigo="" nombre="" precio={0} stock={0} loading />
                            <ProductCard codigo="" nombre="" precio={0} stock={0} loading />
                            <ProductCard codigo="" nombre="" precio={0} stock={0} loading />
                            <ProductCard codigo="" nombre="" precio={0} stock={0} loading />
                        </>
                    ) : error ? (
                        // Error
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                            <Button
                                variant="outlined"
                                onClick={onRetry}
                                startIcon={<SearchIcon />}
                            >
                                Reintentar
                            </Button>
                        </Box>
                    ) : productosFiltrados.length > 0 ? (
                        // Productos reales de la base de datos
                        productosFiltrados.map((producto) => (
                            <ProductCard
                                key={producto._id}
                                codigo={producto.codigo_producto}
                                nombre={producto.nombre_producto}
                                precio={producto.precio_venta}
                                stock={producto.stock_inicial}
                                stockMinimo={producto.stock_minimo}
                                categoria={producto.categoria_producto}
                                onAddToCart={() => onAddToCart(producto)}
                            />
                        ))
                    ) : (
                        // Sin resultados
                        <Box
                            sx={{
                                width: '100%',
                                textAlign: 'center',
                                py: 6,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 2,
                            }}
                        >
                            <Avatar
                                sx={{
                                    width: 64,
                                    height: 64,
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                    color: 'primary.main',
                                }}
                            >
                                <SearchIcon sx={{ fontSize: 32 }} />
                            </Avatar>
                            <Typography sx={{ color: 'text.primary', fontWeight: 500 }}>
                                {search ? 'No se encontraron productos' : 'No hay productos disponibles'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {search
                                    ? 'Intenta con otro término de búsqueda'
                                    : productos.length > 0
                                        ? 'Los productos sin precio de venta no se muestran en el catálogo'
                                        : 'La base de datos está vacía'}
                            </Typography>
                        </Box>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
}