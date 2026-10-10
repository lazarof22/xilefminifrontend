// src/components/ProductCard.tsx
import {
    Card,
    Typography,
    Button,
    Box,
    Avatar,
    Chip,
    Skeleton,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ImageIcon from "@mui/icons-material/Image";

interface ProductCardProps {
    codigo: string;
    nombre: string;
    precio: number;
    stock: number;
    stockMinimo?: number;
    categoria?: string;
    imagen?: string;
    onAddToCart?: () => void;
    loading?: boolean;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "CUP",
    }).format(value);
};

export default function ProductCard({
    codigo,
    nombre,
    precio,
    stock,
    stockMinimo,
    categoria,
    onAddToCart,
    loading = false,
}: ProductCardProps) {
    const sinStock = stock <= 0;
    const stockBajo = stockMinimo !== undefined && stock > 0 && stock <= stockMinimo;
    // Color semántico del chip de stock (tomado de la paleta del tema)
    const estadoStock = sinStock ? "error" : stockBajo ? "warning" : "success";

    if (loading) {
        return (
            <Card
                elevation={0}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    p: 2,
                    borderRadius: 3,
                }}
            >
                <Skeleton variant="rounded" width={80} height={80} sx={{ mr: 2.5, borderRadius: 2.5 }} />
                <Box sx={{ flex: 1 }}>
                    <Skeleton width="60%" height={24} />
                    <Skeleton width="40%" height={20} sx={{ mt: 0.5 }} />
                    <Skeleton width="30%" height={22} sx={{ mt: 1 }} />
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                    <Skeleton width={80} height={28} />
                    <Skeleton width={120} height={36} sx={{ borderRadius: 2 }} />
                </Box>
            </Card>
        );
    }

    return (
        <Card
            elevation={0}
            sx={{
                display: "flex",
                alignItems: "center",
                p: 2,
                borderRadius: 3,
                transition: "all 0.2s ease",
                width: "100%",
                maxWidth: "100%",
                "&:hover": {
                    borderColor: (theme) => alpha(theme.palette.primary.main, 0.25),
                    transform: "translateY(-1px)",
                },
            }}
        >
            {/* IMAGEN PLACEHOLDER */}
            <Avatar
                variant="rounded"
                sx={{
                    width: 80,
                    height: 80,
                    bgcolor: "action.hover",
                    color: "text.secondary",
                    mr: 2.5,
                    flexShrink: 0,
                    borderRadius: 2.5,
                }}
            >
                <ImageIcon sx={{ fontSize: 32 }} />
            </Avatar>

            {/* INFO DEL PRODUCTO */}
            <Box sx={{ flex: 1, minWidth: 0, mr: 2 }}>
                <Typography variant="button"
                    sx={{ color: "text.primary" }}
                >
                    Producto: {nombre}
                </Typography>

                <Typography
                    variant="body2"
                    sx={{
                        color: "text.secondary",
                        mb: 1,
                        fontSize: "0.8rem",
                        lineHeight: 1.4,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                    }}
                >
                    Categoria: {categoria || "Sin categoría"}
                </Typography>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    Stock:
                    <Chip
                        label={sinStock ? "Sin Stock" : stockBajo ? `¡Solo ${stock}!` : `${stock} disponibles`}
                        size="small"
                        sx={{
                            height: 22,
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            bgcolor: (theme) => alpha(theme.palette[estadoStock].main, 0.12),
                            color: `${estadoStock}.light`,
                            borderRadius: 1,
                        }}
                    />
                    {stockBajo && !sinStock && (
                        <Chip
                            label="Stock bajo"
                            size="small"
                            sx={{
                                height: 22,
                                fontSize: "0.65rem",
                                fontWeight: 600,
                                bgcolor: (theme) => alpha(theme.palette.warning.main, 0.12),
                                color: "warning.light",
                                borderRadius: 1,
                            }}
                        />
                    )}
                </Box>
            </Box>

            {/* PRECIO + BOTÓN */}
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 1,
                    flexShrink: 0,
                }}
            >
                <Typography
                    sx={{
                        fontWeight: 700,
                        fontSize: "1.1rem",
                        color: "primary.main",
                    }}
                >
                    Precio: {formatCurrency(precio)}
                </Typography>

                <Button
                    disabled={sinStock}
                    onClick={onAddToCart}
                    sx={{
                        minWidth: 140,
                        py: 0.8,
                        px: 2,
                        borderRadius: 2,
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        background: sinStock
                            ? "#e0e0e0"
                            : "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(196, 45, 226, 0.9))",
                        color: sinStock ? "#999" : "white",
                        boxShadow: sinStock
                            ? "none"
                            : "0 4px 12px rgba(10, 83, 218, 0.3)",
                        "&:hover": {
                            background: sinStock
                                ? "#e0e0e0"
                                : "linear-gradient(135deg, rgba(10, 83, 218, 1), rgba(196, 45, 226, 1))",
                            boxShadow: sinStock
                                ? "none"
                                : "0 6px 16px rgba(10, 83, 218, 0.4)",
                        },
                    }}
                    startIcon={<ShoppingCartIcon sx={{ fontSize: 18 }} />}
                >
                    {sinStock ? "Agotado" : "Agregar"}
                </Button>
            </Box>
        </Card>
    );
}