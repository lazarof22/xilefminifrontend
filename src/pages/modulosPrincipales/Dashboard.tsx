// src/pages/DashboardPage.tsx
import { Card, CardContent, Typography, Box, Button, Stack, Chip, Avatar, LinearProgress } from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import InventoryIcon from '@mui/icons-material/Inventory';
import SupervisedUserCircleIcon from '@mui/icons-material/SupervisedUserCircle';
import WcIcon from '@mui/icons-material/Wc';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CustomDataGrid from "../../components/CustomDataGridR";

const rows = [
    { id: 1, factura: "F-002", cliente: "Cliente A", total: 305, fecha: "2024-01-15", estado: "Completada" },
    { id: 2, factura: "F-001", cliente: "Cliente B", total: 452, fecha: "2024-01-14", estado: "Pendiente" },
    { id: 3, factura: "F-003", cliente: "Cliente C", total: 1280, fecha: "2024-01-13", estado: "Completada" },
    { id: 4, factura: "F-004", cliente: "Cliente D", total: 890, fecha: "2024-01-12", estado: "Completada" },
];

const monthlyData = [
    { month: 'Ene', ventas: 1200, gastos: 800 },
    { month: 'Feb', ventas: 1900, gastos: 1100 },
    { month: 'Mar', ventas: 1500, gastos: 900 },
    { month: 'Abr', ventas: 2200, gastos: 1300 },
    { month: 'May', ventas: 1800, gastos: 1000 },
    { month: 'Jun', ventas: 2500, gastos: 1400 },
];

export default function DashboardPage() {
    return (
        <Box sx={{ width: '100%', minHeight: '100vh', background: '#0a0f0d' }}>
            {/* ═══════════════════════════════════════════════════════════
                HEADER
                ═══════════════════════════════════════════════════════════ */}
            <Box
                sx={{
                    width: '100%',
                    height: 70,
                    background: "linear-gradient(135deg, #131817 0%, #043625 100%)",
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 3,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                }}>
                <Box>
                    <Typography variant="h5" sx={{
                        color: '#f0f0f0',
                        fontWeight: 700,
                        letterSpacing: '-0.02em'
                    }}>
                        Dashboard General
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                        Resumen de actividad del sistema
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<RestartAltIcon sx={{ transition: 'transform 0.3s ease' }} />}
                    sx={{
                        background: "linear-gradient(135deg, #00e5a0 0%, #00c896 100%)",
                        color: '#0a0f0d',
                        textTransform: 'none',
                        borderRadius: 2,
                        px: 2.5,
                        py: 1,
                        fontWeight: 600,
                        boxShadow: '0 4px 16px rgba(0, 229, 160, 0.25)',
                        '&:hover': {
                            background: "linear-gradient(135deg, #5cffc8 0%, #00e5a0 100%)",
                            boxShadow: '0 4px 24px rgba(0, 229, 160, 0.4)',
                            '& .MuiSvgIcon-root': {
                                transform: 'rotate(180deg)',
                            }
                        }
                    }}
                >
                    Actualizar
                </Button>
            </Box>

            <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>

                {/* ═══════════════════════════════════════════════════════
                    FILA 1: TARJETAS PRINCIPALES
                    ═══════════════════════════════════════════════════════ */}
                <Stack direction="row" spacing={2.5} sx={{ mb: 3, flexWrap: 'wrap' }}>

                    {/* Tarjeta 1: Balance Total */}
                    <Card sx={{
                        flex: '1 1 280px',
                        borderRadius: 3,
                        bgcolor: '#151a19',
                        border: '1px solid rgba(255,255,255,0.04)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                        overflow: 'hidden'
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                <Box>
                                    <Typography variant="caption" sx={{
                                        color: '#9ca3af',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.08em',
                                        fontSize: '0.65rem'
                                    }}>
                                        Balance Total
                                    </Typography>
                                    <Typography variant="h4" sx={{
                                        fontWeight: 700,
                                        color: '#f0f0f0',
                                        mt: 0.5,
                                        letterSpacing: '-0.02em'
                                    }}>
                                        $12,450.00
                                    </Typography>
                                </Box>
                                <Avatar sx={{
                                    bgcolor: 'rgba(0, 229, 160, 0.1)',
                                    color: '#00e5a0',
                                    width: 48,
                                    height: 48
                                }}>
                                    <MonetizationOnIcon />
                                </Avatar>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                    icon={<TrendingUpIcon sx={{ fontSize: 14 }} />}
                                    label="+12.5%"
                                    size="small"
                                    sx={{
                                        bgcolor: 'rgba(0, 229, 160, 0.1)',
                                        color: '#00e5a0',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        border: '1px solid rgba(0, 229, 160, 0.15)'
                                    }}
                                />
                                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                    vs mes anterior
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Tarjeta 2: Total Ingresos (destacada con gradiente) */}
                    <Card sx={{
                        flex: '1 1 280px',
                        borderRadius: 3,
                        border: '1px solid rgba(255,255,255,0.04)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                        overflow: 'hidden',
                        background: "linear-gradient(135deg, rgba(0, 229, 160, 0.15) 0%, rgba(0, 229, 160, 0.05) 100%)",
                        position: 'relative',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 2,
                            background: 'linear-gradient(90deg, #00e5a0, #5cffc8)',
                        }
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                <Box>
                                    <Typography variant="caption" sx={{
                                        color: '#9ca3af',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.08em',
                                        fontSize: '0.65rem'
                                    }}>
                                        Total Ingresos
                                    </Typography>
                                    <Typography variant="h4" sx={{
                                        fontWeight: 700,
                                        color: '#f0f0f0',
                                        mt: 0.5,
                                        letterSpacing: '-0.02em'
                                    }}>
                                        $8,950.00
                                    </Typography>
                                </Box>
                                <Avatar sx={{
                                    bgcolor: 'rgba(0, 229, 160, 0.15)',
                                    color: '#00e5a0',
                                    width: 48,
                                    height: 48
                                }}>
                                    <TrendingUpIcon />
                                </Avatar>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                    icon={<TrendingUpIcon sx={{ fontSize: 14 }} />}
                                    label="+7.2%"
                                    size="small"
                                    sx={{
                                        bgcolor: 'rgba(0, 229, 160, 0.12)',
                                        color: '#00e5a0',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        border: '1px solid rgba(0, 229, 160, 0.2)'
                                    }}
                                />
                                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                    este mes
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Tarjeta 3: Total Gastos */}
                    <Card sx={{
                        flex: '1 1 280px',
                        borderRadius: 3,
                        bgcolor: '#151a19',
                        border: '1px solid rgba(255,255,255,0.04)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                        overflow: 'hidden'
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                <Box>
                                    <Typography variant="caption" sx={{
                                        color: '#9ca3af',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.08em',
                                        fontSize: '0.65rem'
                                    }}>
                                        Total Gastos
                                    </Typography>
                                    <Typography variant="h4" sx={{
                                        fontWeight: 700,
                                        color: '#f0f0f0',
                                        mt: 0.5,
                                        letterSpacing: '-0.02em'
                                    }}>
                                        $3,500.00
                                    </Typography>
                                </Box>
                                <Avatar sx={{
                                    bgcolor: 'rgba(239, 68, 68, 0.1)',
                                    color: '#ef4444',
                                    width: 48,
                                    height: 48
                                }}>
                                    <TrendingDownIcon />
                                </Avatar>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                    icon={<TrendingDownIcon sx={{ fontSize: 14 }} />}
                                    label="-2.1%"
                                    size="small"
                                    sx={{
                                        bgcolor: 'rgba(239, 68, 68, 0.1)',
                                        color: '#ef4444',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        border: '1px solid rgba(239, 68, 68, 0.15)'
                                    }}
                                />
                                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                    vs mes anterior
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Tarjeta 4: Productos en Stock */}
                    <Card sx={{
                        flex: '1 1 280px',
                        borderRadius: 3,
                        bgcolor: '#151a19',
                        border: '1px solid rgba(255,255,255,0.04)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                        overflow: 'hidden'
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                <Box>
                                    <Typography variant="caption" sx={{
                                        color: '#9ca3af',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.08em',
                                        fontSize: '0.65rem'
                                    }}>
                                        Productos en Stock
                                    </Typography>
                                    <Typography variant="h4" sx={{
                                        fontWeight: 700,
                                        color: '#f0f0f0',
                                        mt: 0.5,
                                        letterSpacing: '-0.02em'
                                    }}>
                                        320
                                    </Typography>
                                </Box>
                                <Avatar sx={{
                                    bgcolor: 'rgba(6, 182, 212, 0.1)',
                                    color: '#06b6d4',
                                    width: 48,
                                    height: 48
                                }}>
                                    <InventoryIcon />
                                </Avatar>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                    icon={<TrendingUpIcon sx={{ fontSize: 14 }} />}
                                    label="+15"
                                    size="small"
                                    sx={{
                                        bgcolor: 'rgba(6, 182, 212, 0.1)',
                                        color: '#06b6d4',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        border: '1px solid rgba(6, 182, 212, 0.15)'
                                    }}
                                />
                                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                    nuevos este mes
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Stack>

                {/* ═══════════════════════════════════════════════════════
                    FILA 2: GRÁFICO + TABLA DE ACTIVIDADES
                    ═══════════════════════════════════════════════════════ */}
                <Stack direction="row" spacing={2.5} sx={{ mb: 3, flexWrap: 'wrap' }}>

                    {/* Gráfico de Barras Simple */}
                    <Card sx={{
                        flex: '1 1 400px',
                        borderRadius: 3,
                        bgcolor: '#151a19',
                        border: '1px solid rgba(255,255,255,0.04)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                <Box>
                                    <Typography variant="h6" sx={{
                                        fontWeight: 600,
                                        color: '#f0f0f0'
                                    }}>
                                        Ingresos vs Gastos
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                        Últimos 6 meses
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: '#00e5a0' }} />
                                        <Typography variant="caption" sx={{ color: '#9ca3af' }}>Ingresos</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: '#374151' }} />
                                        <Typography variant="caption" sx={{ color: '#9ca3af' }}>Gastos</Typography>
                                    </Box>
                                </Box>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 200, gap: 2, px: 1 }}>
                                {monthlyData.map((data) => (
                                    <Box key={data.month} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 160, width: '100%', justifyContent: 'center' }}>
                                            {/* Barra Ingresos */}
                                            <Box sx={{
                                                width: '45%',
                                                bgcolor: '#00e5a0',
                                                borderRadius: '4px 4px 0 0',
                                                height: `${(data.ventas / 2500) * 100}%`,
                                                minHeight: 4,
                                                transition: 'height 0.3s ease',
                                                '&:hover': { opacity: 0.8, filter: 'brightness(1.2)' }
                                            }} />
                                            {/* Barra Gastos */}
                                            <Box sx={{
                                                width: '45%',
                                                bgcolor: '#374151',
                                                borderRadius: '4px 4px 0 0',
                                                height: `${(data.gastos / 2500) * 100}%`,
                                                minHeight: 4,
                                                transition: 'height 0.3s ease',
                                                '&:hover': { opacity: 0.8 }
                                            }} />
                                        </Box>
                                        <Typography variant="caption" sx={{
                                            color: '#6b7280',
                                            fontWeight: 500,
                                            fontSize: '0.7rem'
                                        }}>
                                            {data.month}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Métricas secundarias + Progress */}
                    <Card sx={{
                        flex: '1 1 300px',
                        borderRadius: 3,
                        bgcolor: '#151a19',
                        border: '1px solid rgba(255,255,255,0.04)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{
                                fontWeight: 600,
                                color: '#f0f0f0',
                                mb: 3
                            }}>
                                Resumen del Sistema
                            </Typography>

                            <Stack spacing={3}>
                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2" sx={{
                                            color: '#9ca3af',
                                            fontWeight: 500,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.5
                                        }}>
                                            <SupervisedUserCircleIcon sx={{ fontSize: 16, color: '#00e5a0' }} />
                                            Clientes Activos
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#f0f0f0' }}>45</Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={75}
                                        sx={{
                                            height: 6,
                                            borderRadius: 3,
                                            bgcolor: 'rgba(0, 229, 160, 0.08)',
                                            '& .MuiLinearProgress-bar': {
                                                bgcolor: '#00e5a0',
                                                borderRadius: 3
                                            }
                                        }}
                                    />
                                </Box>

                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2" sx={{
                                            color: '#9ca3af',
                                            fontWeight: 500,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.5
                                        }}>
                                            <WcIcon sx={{ fontSize: 16, color: '#a855f7' }} />
                                            Empleados
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#f0f0f0' }}>12</Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={60}
                                        sx={{
                                            height: 6,
                                            borderRadius: 3,
                                            bgcolor: 'rgba(168, 85, 247, 0.08)',
                                            '& .MuiLinearProgress-bar': {
                                                bgcolor: '#a855f7',
                                                borderRadius: 3
                                            }
                                        }}
                                    />
                                </Box>

                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2" sx={{
                                            color: '#9ca3af',
                                            fontWeight: 500,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.5
                                        }}>
                                            <ShoppingCartIcon sx={{ fontSize: 16, color: '#06b6d4' }} />
                                            Órdenes Completadas
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#f0f0f0' }}>89%</Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={89}
                                        sx={{
                                            height: 6,
                                            borderRadius: 3,
                                            bgcolor: 'rgba(6, 182, 212, 0.08)',
                                            '& .MuiLinearProgress-bar': {
                                                bgcolor: '#06b6d4',
                                                borderRadius: 3
                                            }
                                        }}
                                    />
                                </Box>

                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2" sx={{
                                            color: '#9ca3af',
                                            fontWeight: 500,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.5
                                        }}>
                                            <CreditCardIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                                            Facturas Pendientes
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#f0f0f0' }}>23%</Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={23}
                                        sx={{
                                            height: 6,
                                            borderRadius: 3,
                                            bgcolor: 'rgba(245, 158, 11, 0.08)',
                                            '& .MuiLinearProgress-bar': {
                                                bgcolor: '#f59e0b',
                                                borderRadius: 3
                                            }
                                        }}
                                    />
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Stack>

                {/* ═══════════════════════════════════════════════════════
                    FILA 3: TABLA DE VENTAS RECIENTES
                    ═══════════════════════════════════════════════════════ */}
                <Card sx={{
                    borderRadius: 3,
                    bgcolor: '#151a19',
                    border: '1px solid rgba(255,255,255,0.04)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                    overflow: 'hidden'
                }}>
                    <CardContent sx={{ p: 0 }}>
                        <CustomDataGrid
                            title="Ventas Recientes"
                            rows={rows}
                            getRowId={(row) => row.id}
                            columns={[
                                { field: "factura", headerName: "Factura" },
                                { field: "cliente", headerName: "Cliente" },
                                { field: "total", headerName: "Total", numeric: true },
                                { field: "fecha", headerName: "Fecha" },
                                { field: "estado", headerName: "Estado", isStatusColumn: true },
                            ]}
                        />
                    </CardContent>
                </Card>

            </Box>
        </Box>
    );
}