// src/components/ReporteInventarioTab.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    IconButton,
    Tooltip,
    Typography,
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import RefreshIcon from '@mui/icons-material/Refresh';
import CustomDataGridR, { type Column } from '../CustomDataGridR';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

export interface InventarioReporte {
    id: string;
    codigo_producto: string;
    nombre_producto: string;
    productos_disponibles: number;
    productos_reservados: number;
    inventario_total: number;
}

interface ApiInventarioItem {
    _id?: string;
    id?: string;
    codigo_producto?: string;
    nombre_producto?: string;
    productos_disponibles?: number;
    productos_reservados?: number;
}

interface ReporteInventarioTabProps {
    data?: InventarioReporte[];
}

export default function ReporteInventarioTab({
    data,
}: ReporteInventarioTabProps): React.JSX.Element {
    const [inventario, setInventario] = useState<InventarioReporte[]>(data ?? []);
    const [loading, setLoading] = useState<boolean>(!data);
    const [error, setError] = useState<string>('');

    const cargarInventario = useCallback(async (): Promise<void> => {
        try {
            setLoading(true);
            setError('');

            // Endpoint esperado: GET /inventario/reporte
            const response = await fetch(`${API_URL}/inventario/reporte`);

            if (!response.ok) {
                throw new Error(
                    `No se pudo cargar el reporte de inventario (${response.status})`
                );
            }

            const result: ApiInventarioItem[] = await response.json();

            const rows: InventarioReporte[] = result.map((item, index) => {
                const disponibles = Number(item.productos_disponibles ?? 0);
                const reservados = Number(item.productos_reservados ?? 0);

                return {
                    id: String(
                        item._id ??
                        item.id ??
                        item.codigo_producto ??
                        index
                    ),
                    codigo_producto: item.codigo_producto ?? '',
                    nombre_producto: item.nombre_producto ?? '',
                    productos_disponibles: disponibles,
                    productos_reservados: reservados,
                    // Regla solicitada:
                    // Inventario total = Disponibles - Reservados
                    inventario_total: disponibles - reservados,
                };
            });

            setInventario(rows);
        } catch (err) {
            console.error('Error al cargar el reporte de inventario:', err);
            setInventario([]);
            setError(
                err instanceof Error
                    ? err.message
                    : 'No se pudo cargar el reporte de inventario'
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!data) {
            void cargarInventario();
        }
    }, [data, cargarInventario]);

    useEffect(() => {
        if (data) {
            setInventario(data);
        }
    }, [data]);

    const inventarioColumns: Column<InventarioReporte>[] = [
        { field: 'codigo_producto', headerName: 'Código del producto' },
        { field: 'nombre_producto', headerName: 'Nombre del producto' },
        {
            field: 'productos_disponibles',
            headerName: 'Productos disponibles',
            numeric: true,
        },
        {
            field: 'productos_reservados',
            headerName: 'Productos reservados',
            numeric: true,
        },
        {
            field: 'inventario_total',
            headerName: 'Inventario total',
            numeric: true,
        },
    ];

    const totalDisponibles = inventario.reduce(
        (total, row) => total + row.productos_disponibles,
        0
    );

    const totalReservados = inventario.reduce(
        (total, row) => total + row.productos_reservados,
        0
    );

    const totalInventario = inventario.reduce(
        (total, row) => total + row.inventario_total,
        0
    );

    return (
        <Box>
            {error && (
                <Alert
                    severity="error"
                    onClose={() => setError('')}
                    sx={{
                        mb: 2,
                        borderRadius: 2,
                        bgcolor: 'rgba(239,68,68,0.1)',
                        color: COLORS.danger,
                        border: '1px solid rgba(239,68,68,0.3)',
                        '& .MuiAlert-icon': { color: COLORS.danger },
                    }}
                >
                    {error}
                </Alert>
            )}

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
                <CardContent sx={{ p: 3 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 2,
                            mb: 2,
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.25,
                            }}
                        >
                            <Inventory2Icon
                                sx={{ width: 24, height: 24, color: COLORS.accent }}
                            />
                            <Box>
                                <Typography
                                    variant="h6"
                                    sx={{ color: COLORS.textLight, fontWeight: 700 }}
                                >
                                    Reporte de Inventario
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{ color: COLORS.textMuted }}
                                >
                                    Existencias disponibles, reservadas e inventario total
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                                label={`${inventario.length} productos`}
                                size="small"
                                sx={{
                                    bgcolor: COLORS.accentSoft,
                                    color: COLORS.accent,
                                    fontWeight: 600,
                                    borderRadius: 2,
                                    border: '1px solid rgba(0,229,160,0.25)',
                                }}
                            />

                            <Tooltip title="Actualizar reporte">
                                <IconButton
                                    onClick={() => void cargarInventario()}
                                    disabled={loading}
                                    sx={{
                                        color: COLORS.textMuted,
                                        border: `1px solid ${COLORS.border}`,
                                        '&:hover': {
                                            color: COLORS.accent,
                                            bgcolor: COLORS.accentSoft,
                                        },
                                    }}
                                >
                                    {loading ? (
                                        <CircularProgress
                                            size={20}
                                            sx={{ color: COLORS.accent }}
                                        />
                                    ) : (
                                        <RefreshIcon />
                                    )}
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                sm: 'repeat(3, 1fr)',
                            },
                            gap: 1.5,
                            mb: 2,
                        }}
                    >
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: COLORS.cardAlt,
                                border: `1px solid ${COLORS.border}`,
                            }}
                        >
                            <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
                                Productos disponibles
                            </Typography>
                            <Typography
                                variant="h6"
                                sx={{ mt: 0.5, color: COLORS.textLight, fontWeight: 700 }}
                            >
                                {totalDisponibles}
                            </Typography>
                        </Box>

                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: COLORS.cardAlt,
                                border: `1px solid ${COLORS.border}`,
                            }}
                        >
                            <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
                                Productos reservados
                            </Typography>
                            <Typography
                                variant="h6"
                                sx={{ mt: 0.5, color: COLORS.textLight, fontWeight: 700 }}
                            >
                                {totalReservados}
                            </Typography>
                        </Box>

                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: COLORS.accentSoft,
                                border: '1px solid rgba(0,229,160,0.2)',
                            }}
                        >
                            <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
                                Inventario total
                            </Typography>
                            <Typography
                                variant="h6"
                                sx={{ mt: 0.5, color: COLORS.accent, fontWeight: 700 }}
                            >
                                {totalInventario}
                            </Typography>
                        </Box>
                    </Box>

                    <CustomDataGridR<InventarioReporte>
                        rows={inventario}
                        columns={inventarioColumns}
                        getRowId={(row) => row.id}
                        title="Reporte de Inventario"
                        getRowAvatar={(row) =>
                            row.nombre_producto
                                ? row.nombre_producto.charAt(0).toUpperCase()
                                : '#'
                        }
                    />
                </CardContent>
            </Card>
        </Box>
    );
}
