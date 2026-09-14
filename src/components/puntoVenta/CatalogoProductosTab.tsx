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
import SearchIcon from '@mui/icons-material/Search';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';
import ProductCard from '../ProductCard';

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

    const productosFiltrados = useMemo(() => {
        const texto = search.toLowerCase();
        return productos.filter((producto) =>
            producto.nombre_producto.toLowerCase().includes(texto) ||
            producto.categoria_producto.toLowerCase().includes(texto) ||
            producto.precio_venta.toString().includes(texto) ||
            producto.codigo_producto.toLowerCase().includes(texto)
        );
    }, [productos, search]);

    return (
        <Card
            elevation={0}
            sx={{
                borderRadius: 3,
                border: `1px solid ${COLORS.border}`,
                bgcolor: COLORS.card,
                boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
                overflow: 'hidden',
                m: 1,
            }}
        >
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
                            color: COLORS.accent,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                        }}
                    >
                        <ShoppingBasketIcon sx={{ width: 24, height: 24, color: COLORS.accent }} />
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
                                        <SearchIcon sx={{ color: COLORS.textMuted, fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                            },
                        }}
                        sx={{
                            width: { xs: '100%', sm: 280 },
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2.5,
                                bgcolor: 'rgba(255,255,255,0.03)',
                                color: COLORS.textLight,
                                '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
                                '&:hover fieldset': { borderColor: 'rgba(0,229,160,0.4)' },
                                '&.Mui-focused fieldset': { borderColor: COLORS.accent },
                            },
                        }}
                    />
                </Box>

                <Divider sx={{ mb: 3, borderColor: COLORS.border }} />

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
                            <Alert
                                severity="error"
                                sx={{
                                    mb: 2,
                                    bgcolor: 'rgba(239,68,68,0.1)',
                                    color: COLORS.danger,
                                    border: `1px solid rgba(239,68,68,0.3)`,
                                    '& .MuiAlert-icon': { color: COLORS.danger },
                                }}
                            >
                                {error}
                            </Alert>
                            <Button
                                variant="outlined"
                                onClick={onRetry}
                                startIcon={<SearchIcon />}
                                sx={{
                                    color: COLORS.accent,
                                    borderColor: 'rgba(0,229,160,0.4)',
                                    '&:hover': {
                                        borderColor: COLORS.accent,
                                        bgcolor: COLORS.accentSoft,
                                    },
                                }}
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
                                    bgcolor: COLORS.accentSoft,
                                    color: COLORS.accent,
                                }}
                            >
                                <SearchIcon sx={{ fontSize: 32 }} />
                            </Avatar>
                            <Typography sx={{ color: COLORS.textLight, fontWeight: 500 }}>
                                {search ? 'No se encontraron productos' : 'No hay productos disponibles'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
                                {search ? 'Intenta con otro término de búsqueda' : 'La base de datos está vacía'}
                            </Typography>
                        </Box>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
}