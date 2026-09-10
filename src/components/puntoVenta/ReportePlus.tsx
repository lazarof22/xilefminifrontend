// src/components/ReportePlusTab.tsx
import React, { useState, useMemo } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Button,
    Chip,
    Divider,
    Avatar,
    Grid,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import MoneyIcon from '@mui/icons-material/Money';
import PaymentIcon from '@mui/icons-material/Payment';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import LockClockIcon from '@mui/icons-material/LockClock';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CustomDataGridR from '../CustomDataGridR';

// ==================== TIPOS ====================
export type TipoTransaccion = 'factura' | 'efectivo' | 'credito' | 'transferencia' | 'extraccion';

export interface TransaccionDia {
    id: string;
    fecha: string;        // YYYY-MM-DD
    hora: string;         // HH:mm:ss
    tipo: TipoTransaccion;
    concepto: string;
    monto: number;
    moneda: string;
    metodoPago?: string;
    cliente?: string;
    estado: 'completada' | 'pendiente' | 'cancelada';
    detalle?: string;     // JSON string con info extra si se necesita
}

export interface ResumenTurno {
    fecha: string;
    totalVentas: number;
    totalExtracciones: number;
    saldoNeto: number;
    porMetodo: {
        efectivo: number;
        credito: number;
        transferencia: number;
        factura: number;
    };
    cantidadTransacciones: number;
    transacciones: TransaccionDia[];
}

interface ReportePlusTabProps {
    transacciones: TransaccionDia[];
    onCerrarTurno: (resumen: ResumenTurno) => void;
    fechaTurno?: string; // YYYY-MM-DD, por defecto hoy
}

// ==================== COMPONENTE ====================
export default function ReportePlusTab({
    transacciones,
    onCerrarTurno,
    fechaTurno,
}: ReportePlusTabProps) {
    const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
    const [mensajeExito, setMensajeExito] = useState<string | null>(null);

    const fechaHoy = fechaTurno || new Date().toISOString().split('T')[0];

    // Filtrar solo transacciones del día
    const transaccionesHoy = useMemo(() => {
        return transacciones.filter((t) => t.fecha === fechaHoy);
    }, [transacciones, fechaHoy]);

    // Calcular resumen
    const resumen = useMemo<ResumenTurno>(() => {
        const ventas = transaccionesHoy.filter((t) => t.tipo !== 'extraccion');
        const extracciones = transaccionesHoy.filter((t) => t.tipo === 'extraccion');

        const totalVentas = ventas.reduce((acc, t) => acc + t.monto, 0);
        const totalExtracciones = extracciones.reduce((acc, t) => acc + t.monto, 0);

        return {
            fecha: fechaHoy,
            totalVentas,
            totalExtracciones,
            saldoNeto: totalVentas - totalExtracciones,
            porMetodo: {
                efectivo: ventas.filter((t) => t.tipo === 'efectivo').reduce((a, t) => a + t.monto, 0),
                credito: ventas.filter((t) => t.tipo === 'credito').reduce((a, t) => a + t.monto, 0),
                transferencia: ventas.filter((t) => t.tipo === 'transferencia').reduce((a, t) => a + t.monto, 0),
                factura: ventas.filter((t) => t.tipo === 'factura').reduce((a, t) => a + t.monto, 0),
            },
            cantidadTransacciones: transaccionesHoy.length,
            transacciones: transaccionesHoy,
        };
    }, [transaccionesHoy, fechaHoy]);

    // Columnas para el grid
    const columns = [
        {
            field: 'hora',
            headerName: 'Hora',
            width: 90,
            renderCell: (params: any) => (
                <Typography variant="caption" sx={{ color: '#9ca3af', fontFamily: 'monospace' }}>
                    {params.value}
                </Typography>
            ),
        },
        {
            field: 'tipo',
            headerName: 'Tipo',
            width: 130,
            renderCell: (params: any) => {
                const config: Record<TipoTransaccion, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
                    efectivo: { label: 'Efectivo', color: '#00e5a0', bg: 'rgba(0,229,160,0.08)', icon: <MoneyIcon sx={{ fontSize: 14 }} /> },
                    credito: { label: 'Crédito', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: <PaymentIcon sx={{ fontSize: 14 }} /> },
                    transferencia: { label: 'Transferencia', color: '#06b6d4', bg: 'rgba(6,182,212,0.08)', icon: <PhoneAndroidIcon sx={{ fontSize: 14 }} /> },
                    factura: { label: 'Factura', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', icon: <ReceiptLongIcon sx={{ fontSize: 14 }} /> },
                    extraccion: { label: 'Extracción', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: <AccountBalanceIcon sx={{ fontSize: 14 }} /> },
                };
                const c = config[params.value as TipoTransaccion] || config.efectivo;
                return (
                    <Chip
                        size="small"
                        label={c.label}
                        icon={c.icon as any}
                        sx={{
                            bgcolor: c.bg,
                            color: c.color,
                            border: `1px solid ${c.color}33`,
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            '& .MuiChip-icon': { color: c.color },
                        }}
                    />
                );
            },
        },
        { field: 'concepto', headerName: 'Concepto', flex: 1 },
        {
            field: 'monto',
            headerName: 'Monto',
            width: 120,
            align: 'right',
            headerAlign: 'right',
            renderCell: (params: any) => {
                const isExtraccion = params.row.tipo === 'extraccion';
                return (
                    <Typography
                        sx={{
                            fontWeight: 700,
                            color: isExtraccion ? '#ef4444' : '#00e5a0',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                        }}
                    >
                        {isExtraccion ? '-' : '+'}{params.value.toFixed(2)} {params.row.moneda}
                    </Typography>
                );
            },
        },
        {
            field: 'cliente',
            headerName: 'Cliente',
            width: 150,
            renderCell: (params: any) => (
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                    {params.value || '—'}
                </Typography>
            ),
        },
        {
            field: 'estado',
            headerName: 'Estado',
            width: 110,
            renderCell: (params: any) => {
                const colors: Record<string, { color: string; bg: string }> = {
                    completada: { color: '#00e5a0', bg: 'rgba(0,229,160,0.08)' },
                    pendiente: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
                    cancelada: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
                };
                const c = colors[params.value] || colors.completada;
                return (
                    <Chip
                        size="small"
                        label={params.value}
                        sx={{
                            bgcolor: c.bg,
                            color: c.color,
                            border: `1px solid ${c.color}33`,
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            textTransform: 'capitalize',
                        }}
                    />
                );
            },
        },
    ];

    const handleCerrarTurno = () => {
        setOpenConfirmDialog(true);
    };

    const confirmarCerrarTurno = () => {
        onCerrarTurno(resumen);
        setOpenConfirmDialog(false);
        setMensajeExito('Turno cerrado exitosamente. Datos enviados a Reporte de Caja.');
        setTimeout(() => setMensajeExito(null), 4000);
    };

    // Tarjetas de resumen
    const tarjetasResumen = [
        {
            label: 'Total Ventas',
            value: `${resumen.totalVentas.toFixed(2)} CUP`,
            icon: <TrendingUpIcon sx={{ fontSize: 28, color: '#00e5a0' }} />,
            color: '#00e5a0',
        },
        {
            label: 'Total Extracciones',
            value: `${resumen.totalExtracciones.toFixed(2)} CUP`,
            icon: <TrendingDownIcon sx={{ fontSize: 28, color: '#ef4444' }} />,
            color: '#ef4444',
        },
        {
            label: 'Saldo Neto',
            value: `${resumen.saldoNeto.toFixed(2)} CUP`,
            icon: <AccountBalanceIcon sx={{ fontSize: 28, color: resumen.saldoNeto >= 0 ? '#00e5a0' : '#ef4444' }} />,
            color: resumen.saldoNeto >= 0 ? '#00e5a0' : '#ef4444',
        },
        {
            label: 'Transacciones',
            value: `${resumen.cantidadTransacciones}`,
            icon: <PointOfSaleIcon sx={{ fontSize: 28, color: '#06b6d4' }} />,
            color: '#06b6d4',
        },
    ];

    return (
        <Box>
            {/* Mensaje de éxito */}
            {mensajeExito && (
                <Alert
                    severity="success"
                    sx={{
                        mb: 2,
                        borderRadius: 2,
                        bgcolor: 'rgba(0,229,160,0.08)',
                        border: '1px solid rgba(0,229,160,0.2)',
                        color: '#00e5a0',
                        '& .MuiAlert-icon': { color: '#00e5a0' },
                    }}
                    onClose={() => setMensajeExito(null)}
                >
                    {mensajeExito}
                </Alert>
            )}

            {/* Tarjetas de resumen */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {tarjetasResumen.map((t, i) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
                        <Card
                            sx={{
                                borderRadius: 3,
                                bgcolor: '#151a19',
                                border: '1px solid rgba(255,255,255,0.04)',
                                boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: `0 8px 32px ${t.color}20`,
                                },
                            }}
                        >
                            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
                                <Avatar
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        bgcolor: `${t.color}15`,
                                        color: t.color,
                                    }}
                                >
                                    {t.icon}
                                </Avatar>
                                <Box>
                                    <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {t.label}
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: t.color, fontFamily: 'monospace' }}>
                                        {t.value}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Detalle por método de pago */}
            <Card
                sx={{
                    borderRadius: 3,
                    bgcolor: '#151a19',
                    border: '1px solid rgba(255,255,255,0.04)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                    mb: 3,
                }}
            >
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Typography variant="subtitle1" sx={{ color: '#f0f0f0', fontWeight: 700, mb: 2 }}>
                        Desglose por Método de Pago
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {[
                            { label: 'Efectivo', value: resumen.porMetodo.efectivo, icon: <MoneyIcon />, color: '#00e5a0' },
                            { label: 'Crédito', value: resumen.porMetodo.credito, icon: <PaymentIcon />, color: '#f59e0b' },
                            { label: 'Transferencia', value: resumen.porMetodo.transferencia, icon: <PhoneAndroidIcon />, color: '#06b6d4' },
                            { label: 'Factura', value: resumen.porMetodo.factura, icon: <ReceiptLongIcon />, color: '#8b5cf6' },
                        ].map((m, i) => (
                            <Box
                                key={i}
                                sx={{
                                    flex: '1 1 200px',
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: '#1a201e',
                                    border: '1px solid rgba(255,255,255,0.04)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                }}
                            >
                                <Box sx={{ color: m.color }}>{m.icon}</Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>{m.label}</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 700, color: m.color, fontFamily: 'monospace' }}>
                                        {m.value.toFixed(2)} CUP
                                    </Typography>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                </CardContent>
            </Card>

            {/* Tabla de transacciones */}
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: '1px solid rgba(255,255,255,0.04)',
                    bgcolor: '#151a19',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                    overflow: 'hidden',
                }}
            >
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    {/* Header */}
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
                        <Typography variant="h6"
                            sx={{
                                fontWeight: 700,
                                color: '#00e5a0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                            }}
                        >
                            <ReceiptLongIcon sx={{ color: '#00e5a0' }} />
                            Reporte Plus — Historial del Día ({fechaHoy})
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Chip
                                label={`${resumen.cantidadTransacciones} transacciones`}
                                size="medium"
                                sx={{
                                    bgcolor: 'rgba(0,229,160,0.08)',
                                    color: '#00e5a0',
                                    fontWeight: 600,
                                    borderRadius: 2,
                                    border: '1px solid rgba(0,229,160,0.15)',
                                }}
                            />
                            <Button
                                variant="contained"
                                startIcon={<LockClockIcon />}
                                onClick={handleCerrarTurno}
                                disabled={resumen.cantidadTransacciones === 0}
                                sx={{
                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                    color: '#fff',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    borderRadius: 2,
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
                                        boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
                                    },
                                    '&.Mui-disabled': {
                                        background: 'rgba(255,255,255,0.06)',
                                        color: '#4b5563',
                                    },
                                }}
                            >
                                Cerrar Turno
                            </Button>
                        </Box>
                    </Box>

                    <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.06)' }} />

                    {transaccionesHoy.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                            <Avatar
                                sx={{
                                    width: 80,
                                    height: 80,
                                    bgcolor: 'rgba(0,229,160,0.08)',
                                    color: '#00e5a0',
                                    mx: 'auto',
                                    mb: 2,
                                }}
                            >
                                <ReceiptLongIcon sx={{ fontSize: 40 }} />
                            </Avatar>
                            <Typography sx={{ color: '#9ca3af', fontWeight: 500 }}>
                                No hay transacciones registradas hoy
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#4b5563' }}>
                                Las ventas y extracciones realizadas aparecerán aquí
                            </Typography>
                        </Box>
                    ) : (
                        <CustomDataGridR
                            rows={transaccionesHoy}
                            columns={columns as any}
                            getRowId={(row: any) => row.id}
                            title="Transacciones del Día"
                        />
                    )}
                </CardContent>
            </Card>

            {/* Dialog de confirmación Cerrar Turno */}
            <Dialog
                open={openConfirmDialog}
                onClose={() => setOpenConfirmDialog(false)}
                maxWidth="sm"
                fullWidth
                slotProps={{
                    paper: {
                        sx: {
                            bgcolor: '#151a19',
                            border: '1px solid rgba(255,255,255,0.06)',
                            boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                            borderRadius: 3,
                        },
                    },
                }}
            >
                <DialogTitle sx={{
                    background: 'linear-gradient(135deg, #0a0f0d 0%, #151a19 100%)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>
                    <Typography variant="h6"
                        sx={{
                            textAlign: 'center',
                            color: '#ef4444',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1,
                        }}
                    >
                        <LockClockIcon sx={{ color: '#ef4444' }} />
                        Confirmar Cierre de Turno
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Typography sx={{ color: '#e5e7eb', mb: 2 }}>
                        Estás a punto de cerrar el turno del día <strong style={{ color: '#00e5a0' }}>{fechaHoy}</strong>. 
                        Esta acción enviará todos los datos al módulo de <strong>Reporte de Caja</strong>.
                    </Typography>

                    <Box sx={{ bgcolor: '#1a201e', borderRadius: 2, p: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                            <Typography sx={{ color: '#9ca3af' }}>Total Ventas:</Typography>
                            <Typography sx={{ color: '#00e5a0', fontWeight: 700, fontFamily: 'monospace' }}>
                                +{resumen.totalVentas.toFixed(2)} CUP
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                            <Typography sx={{ color: '#9ca3af' }}>Total Extracciones:</Typography>
                            <Typography sx={{ color: '#ef4444', fontWeight: 700, fontFamily: 'monospace' }}>
                                −{resumen.totalExtracciones.toFixed(2)} CUP
                            </Typography>
                        </Box>
                        <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.06)' }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                            <Typography sx={{ color: '#f0f0f0', fontWeight: 700 }}>Saldo Neto:</Typography>
                            <Typography sx={{ color: resumen.saldoNeto >= 0 ? '#00e5a0' : '#ef4444', fontWeight: 700, fontFamily: 'monospace' }}>
                                {resumen.saldoNeto.toFixed(2)} CUP
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                            <Typography sx={{ color: '#9ca3af' }}>Transacciones:</Typography>
                            <Typography sx={{ color: '#f0f0f0', fontWeight: 600 }}>
                                {resumen.cantidadTransacciones}
                            </Typography>
                        </Box>
                    </Box>

                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                        ⚠️ Esta acción no se puede deshacer. Asegúrate de que todos los datos sean correctos.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ display: 'flex', p: 2, gap: 2, width: '100%' }}>
                    <Button
                        onClick={() => setOpenConfirmDialog(false)}
                        fullWidth
                        variant="outlined"
                        sx={{
                            flex: 1,
                            borderColor: 'rgba(255,255,255,0.1)',
                            color: '#9ca3af',
                            '&:hover': {
                                borderColor: '#9ca3af',
                                bgcolor: 'rgba(255,255,255,0.04)',
                            }
                        }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={confirmarCerrarTurno}
                        fullWidth
                        startIcon={<LockClockIcon />}
                        sx={{
                            flex: 1,
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: '#fff',
                            fontWeight: 700,
                            '&:hover': {
                                background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
                                boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
                            },
                        }}
                    >
                        Sí, Cerrar Turno
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}