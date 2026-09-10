// src/components/ReporteCajaTab.tsx
import React, { useState, useEffect } from 'react';
import {
    Card, CardContent, Typography, Box, Divider, Chip,
    Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Avatar, Grid, Alert,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import MoneyIcon from '@mui/icons-material/Money';
import PaymentIcon from '@mui/icons-material/Payment';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import LockClockIcon from '@mui/icons-material/LockClock';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CustomDataGridR, { type Column } from '../CustomDataGridR';

// ═══ MUI Date Pickers ═══
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';
import dayjs, { type Dayjs } from 'dayjs';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── INTERFACES ───────────────────────────────────────────────
type TipoCliente =
    | 'Cliente por efectivo o estandar'
    | 'Cliente por descuento'
    | 'Cliente por transferencia'
    | 'Cliente cuenta casa'
    | 'Cliente por credito';

interface RegistroCaja {
    id: string;
    tipoCliente: TipoCliente;
    ci: string;
    telefono: string;
    montoPagado: number;
    fecha: string;
}

// Tipos del turno cerrado desde Reporte Plus
interface TurnoCerrado {
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
    transacciones: any[];
    cerradoEn: string;
}

interface ReporteCajaTabProps {
    registrosExternos?: RegistroCaja[];
}

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────
export default function ReporteCajaTab({ registrosExternos }: ReporteCajaTabProps) {
    const [registros, setRegistros] = useState<RegistroCaja[]>([]);
    const [fechaFiltro, setFechaFiltro] = useState<Dayjs>(dayjs());
    const [turnosCerrados, setTurnosCerrados] = useState<TurnoCerrado[]>([]);
    const [turnoActual, setTurnoActual] = useState<TurnoCerrado | null>(null);

    // Cargar registros del localStorage o usar externos
    useEffect(() => {
        if (registrosExternos && registrosExternos.length > 0) {
            setRegistros(registrosExternos);
            return;
        }
        const saved = localStorage.getItem('reporte_caja_registros');
        if (saved) {
            try {
                setRegistros(JSON.parse(saved));
            } catch (e) {
                console.error('Error cargando registros de caja:', e);
            }
        }
    }, [registrosExternos]);

    // Cargar turnos cerrados desde Reporte Plus
    useEffect(() => {
        const turno = localStorage.getItem('reporte_caja_turno_actual');
        const historial = localStorage.getItem('reporte_caja_historial');
        if (turno) {
            try {
                setTurnoActual(JSON.parse(turno));
            } catch (e) {
                console.error('Error cargando turno actual:', e);
            }
        }
        if (historial) {
            try {
                setTurnosCerrados(JSON.parse(historial));
            } catch (e) {
                console.error('Error cargando historial de turnos:', e);
            }
        }
    }, []);

    const guardarRegistros = (nuevos: RegistroCaja[]) => {
        setRegistros(nuevos);
        localStorage.setItem('reporte_caja_registros', JSON.stringify(nuevos));
    };

    const agregarRegistro = (registro: Omit<RegistroCaja, 'id' | 'fecha'>) => {
        const nuevo: RegistroCaja = {
            ...registro,
            id: `CAJA-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            fecha: new Date().toISOString().split('T')[0]
        };
        guardarRegistros([nuevo, ...registros]);
    };

    const formatearCampo = (valor: string, tipoCliente: TipoCliente): string => {
        if (tipoCliente === 'Cliente por efectivo o estandar') {
            return '-';
        }
        return valor || '-';
    };

    const fechaString = fechaFiltro.format('YYYY-MM-DD');
    const registrosFiltrados = registros.filter(r => r.fecha === fechaString);

    const totalDia = registrosFiltrados.reduce((acc, r) => acc + r.montoPagado, 0);

    // Filtrar turnos cerrados por fecha
    const turnosFiltrados = turnosCerrados.filter(t => t.fecha === fechaString);
    const turnoHoy = turnoActual?.fecha === fechaString ? turnoActual : null;

    // Combinar totales: registros manuales + turnos cerrados
    const totalRegistros = totalDia;
    const totalTurnos = turnosFiltrados.reduce((acc, t) => acc + t.saldoNeto, 0)
        + (turnoHoy ? turnoHoy.saldoNeto : 0);
    const granTotal = totalRegistros + totalTurnos;

    const cajaColumns: Column<RegistroCaja>[] = [
        { field: 'tipoCliente', headerName: 'Tipo de Cliente' },
        { field: 'ci', headerName: 'CI' },
        { field: 'telefono', headerName: 'Telefono' },
        { field: 'montoPagado', headerName: 'Monto Pagado', numeric: true },
    ];

    const datosFormateados = registrosFiltrados.map(r => ({
        ...r,
        ci: formatearCampo(r.ci, r.tipoCliente),
        telefono: formatearCampo(r.telefono, r.tipoCliente),
    }));

    // ─── TARJETAS DE RESUMEN DEL TURNO ──────────────────────────
    const tarjetasTurno = turnoHoy ? [
        {
            label: 'Total Ventas',
            value: `${turnoHoy.totalVentas.toFixed(2)} CUP`,
            icon: <TrendingUpIcon sx={{ fontSize: 24, color: '#00e5a0' }} />,
            color: '#00e5a0',
        },
        {
            label: 'Total Extracciones',
            value: `${turnoHoy.totalExtracciones.toFixed(2)} CUP`,
            icon: <TrendingDownIcon sx={{ fontSize: 24, color: '#ef4444' }} />,
            color: '#ef4444',
        },
        {
            label: 'Saldo Neto',
            value: `${turnoHoy.saldoNeto.toFixed(2)} CUP`,
            icon: <AccountBalanceIcon sx={{ fontSize: 24, color: turnoHoy.saldoNeto >= 0 ? '#00e5a0' : '#ef4444' }} />,
            color: turnoHoy.saldoNeto >= 0 ? '#00e5a0' : '#ef4444',
        },
        {
            label: 'Transacciones',
            value: `${turnoHoy.cantidadTransacciones}`,
            icon: <PointOfSaleIcon sx={{ fontSize: 24, color: '#06b6d4' }} />,
            color: '#06b6d4',
        },
    ] : [];

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box>
                {/* ═══════════════════════════════════════════════════
                    CARD PRINCIPAL: REPORTE DE CAJA
                ═══════════════════════════════════════════════════ */}
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
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 3,
                            flexWrap: 'wrap',
                            gap: 2
                        }}>
                            <Typography variant="h6"
                                sx={{
                                    fontWeight: 700,
                                    color: '#00e5a0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
                                }}
                            >
                                <ReceiptLongIcon sx={{ color: '#00e5a0' }} />
                                Reporte de Caja
                            </Typography>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Chip
                                    label={`${registrosFiltrados.length} registros`}
                                    size="small"
                                    sx={{
                                        bgcolor: 'rgba(0,229,160,0.08)',
                                        color: '#00e5a0',
                                        fontWeight: 600,
                                        borderRadius: 2,
                                        border: '1px solid rgba(0,229,160,0.15)',
                                    }}
                                />
                                <Chip
                                    label={`Fecha: ${fechaString}`}
                                    size="small"
                                    sx={{
                                        bgcolor: 'rgba(6,182,212,0.08)',
                                        color: '#06b6d4',
                                        fontWeight: 600,
                                        borderRadius: 2,
                                        border: '1px solid rgba(6,182,212,0.15)',
                                    }}
                                />
                            </Box>
                        </Box>

                        <Divider sx={{ mb: 3, borderColor: 'rgba(255,255,255,0.06)' }} />

                        {/* ═══ Filtro de fecha con MobileDatePicker ═══ */}
                        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
                            <Card
                                variant="outlined"
                                sx={{
                                    borderRadius: 2,
                                    borderColor: 'rgba(255,255,255,0.06)',
                                    bgcolor: '#1a201e',
                                }}
                            >
                                <CardContent sx={{
                                    p: '8px 16px',
                                    '&:last-child': { pb: '8px' },
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2
                                }}>
                                    <Typography variant="body2" sx={{
                                        color: '#9ca3af',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        fontSize: '0.7rem',
                                        letterSpacing: '0.05em'
                                    }}>
                                        Filtrar por fecha
                                    </Typography>
                                    <MobileDatePicker
                                        value={fechaFiltro}
                                        onChange={(newValue) => {
                                            if (newValue) setFechaFiltro(newValue);
                                        }}
                                        slotProps={{
                                            textField: {
                                                size: 'small',
                                                sx: {
                                                    width: 160,
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 2,
                                                        bgcolor: 'rgba(255,255,255,0.03)',
                                                        '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
                                                        '&:hover fieldset': { borderColor: 'rgba(0,229,160,0.3)' },
                                                        '&.Mui-focused fieldset': { borderColor: '#00e5a0', borderWidth: 2 },
                                                    },
                                                    '& .MuiInputBase-input': {
                                                        fontSize: '0.9rem',
                                                        color: '#f0f0f0',
                                                        textAlign: 'center',
                                                        fontWeight: 600,
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                </CardContent>
                            </Card>
                        </Box>

                        {/* ═══ ALERTA: TURNO CERRADO DETECTADO ═══ */}
                        {turnoHoy && (
                            <Alert
                                severity="success"
                                icon={<LockClockIcon sx={{ color: '#00e5a0' }} />}
                                sx={{
                                    mb: 3,
                                    borderRadius: 2,
                                    bgcolor: 'rgba(0,229,160,0.08)',
                                    border: '1px solid rgba(0,229,160,0.2)',
                                    color: '#00e5a0',
                                    '& .MuiAlert-icon': { color: '#00e5a0' },
                                }}
                            >
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    Turno cerrado el {new Date(turnoHoy.cerradoEn).toLocaleString()}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                                    Saldo neto del turno: {turnoHoy.saldoNeto.toFixed(2)} CUP — {turnoHoy.cantidadTransacciones} transacciones
                                </Typography>
                            </Alert>
                        )}

                        {/* ═══ TARJETAS RESUMEN DEL TURNO ═══ */}
                        {turnoHoy && (
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                {tarjetasTurno.map((t, i) => (
                                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
                                        <Card
                                            sx={{
                                                borderRadius: 3,
                                                bgcolor: '#1a201e',
                                                border: '1px solid rgba(255,255,255,0.04)',
                                                boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
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
                                                        width: 44,
                                                        height: 44,
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
                                                    <Typography variant="h6" sx={{ fontWeight: 700, color: t.color, fontFamily: 'monospace', fontSize: '1.1rem' }}>
                                                        {t.value}
                                                    </Typography>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        )}

                        {/* ═══ DESGLOSE POR MÉTODO DEL TURNO ═══ */}
                        {turnoHoy && (
                            <Card
                                sx={{
                                    borderRadius: 3,
                                    bgcolor: '#1a201e',
                                    border: '1px solid rgba(255,255,255,0.04)',
                                    boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
                                    mb: 3,
                                }}
                            >
                                <CardContent sx={{ p: 2 }}>
                                    <Typography variant="subtitle1" sx={{ color: '#f0f0f0', fontWeight: 700, mb: 2 }}>
                                        Desglose por Método de Pago — Turno Cerrado
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                        {[
                                            { label: 'Efectivo', value: turnoHoy.porMetodo.efectivo, icon: <MoneyIcon />, color: '#00e5a0' },
                                            { label: 'Crédito', value: turnoHoy.porMetodo.credito, icon: <PaymentIcon />, color: '#f59e0b' },
                                            { label: 'Transferencia', value: turnoHoy.porMetodo.transferencia, icon: <PhoneAndroidIcon />, color: '#06b6d4' },
                                            { label: 'Factura', value: turnoHoy.porMetodo.factura, icon: <ReceiptLongIcon />, color: '#8b5cf6' },
                                        ].map((m, i) => (
                                            <Box
                                                key={i}
                                                sx={{
                                                    flex: '1 1 180px',
                                                    p: 2,
                                                    borderRadius: 2,
                                                    bgcolor: '#151a19',
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
                        )}

                        {/* Tabla principal con CustomDataGridR */}
                        {registrosFiltrados.length > 0 && (
                            <>
                                <Typography variant="subtitle1" sx={{ color: '#f0f0f0', fontWeight: 700, mb: 2, mt: 3 }}>
                                    Registros Manuales del Día
                                </Typography>
                                <CustomDataGridR<RegistroCaja>
                                    rows={datosFormateados}
                                    columns={cajaColumns}
                                    getRowId={(row) => row.id}
                                    title="Registros del Día"
                                    onEditRow={(row) => {
                                        console.log('Editar registro:', row);
                                    }}
                                    deleteConfig={{
                                        baseUrl: `${API_URL}/reporte-caja`,
                                        onSuccess: () => {
                                            console.log('Registro eliminado');
                                        }
                                    }}
                                    getRowAvatar={(row) => {
                                        const iniciales: Record<TipoCliente, string> = {
                                            'Cliente por efectivo o estandar': 'E',
                                            'Cliente por descuento': 'D',
                                            'Cliente por transferencia': 'T',
                                            'Cliente cuenta casa': 'C',
                                            'Cliente por credito': 'R'
                                        };
                                        return iniciales[row.tipoCliente] || '?';
                                    }}
                                />
                            </>
                        )}

                        {/* ═══════════════════════════════════════════════════
                            TABLA DE TOTALES DEL DIA
                        ═══════════════════════════════════════════════════ */}
                        <Box sx={{ mt: 3 }}>
                            <Card
                                variant="outlined"
                                sx={{
                                    borderRadius: 2,
                                    borderColor: 'rgba(255,255,255,0.06)',
                                    bgcolor: '#1a201e',
                                    boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
                                    overflow: 'hidden'
                                }}
                            >
                                <TableContainer component={Paper} sx={{ boxShadow: 'none', bgcolor: 'transparent' }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{
                                                bgcolor: '#0d1210',
                                            }}>
                                                <TableCell sx={{
                                                    pl: 3,
                                                    color: '#00e5a0',
                                                    fontWeight: 700,
                                                    fontSize: '0.9rem',
                                                    py: 1.5,
                                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                                }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <TrendingUpIcon sx={{ fontSize: 20, color: '#00e5a0' }} />
                                                        Concepto
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="right" sx={{
                                                    pr: 3,
                                                    color: '#00e5a0',
                                                    fontWeight: 700,
                                                    fontSize: '0.9rem',
                                                    py: 1.5,
                                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                                }}>
                                                    Monto (CUP)
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {registrosFiltrados.length > 0 && (
                                                <TableRow>
                                                    <TableCell sx={{ pl: 3, color: '#e5e7eb', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                        Registros manuales
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ pr: 3, color: '#00e5a0', fontWeight: 700, fontFamily: 'monospace', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                        +{totalRegistros.toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {turnoHoy && (
                                                <TableRow>
                                                    <TableCell sx={{ pl: 3, color: '#e5e7eb', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                        Turno cerrado (Reporte Plus)
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ pr: 3, color: '#00e5a0', fontWeight: 700, fontFamily: 'monospace', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                        +{turnoHoy.saldoNeto.toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {turnosFiltrados.length > 0 && turnosFiltrados.map((t, i) => (
                                                <TableRow key={i}>
                                                    <TableCell sx={{ pl: 3, color: '#9ca3af', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                        Turno anterior {new Date(t.cerradoEn).toLocaleTimeString()}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ pr: 3, color: '#9ca3af', fontFamily: 'monospace', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                        {t.saldoNeto.toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow sx={{ bgcolor: '#0d1210' }}>
                                                <TableCell sx={{ pl: 3, color: '#f0f0f0', fontWeight: 800, fontSize: '1rem', py: 2 }}>
                                                    TOTAL GENERAL
                                                </TableCell>
                                                <TableCell align="right" sx={{ pr: 3, color: '#00e5a0', fontWeight: 800, fontSize: '1.1rem', fontFamily: 'monospace', py: 2 }}>
                                                    {granTotal.toFixed(2)} CUP
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Card>
                        </Box>

                        {/* Mensaje cuando no hay registros ni turnos */}
                        {registrosFiltrados.length === 0 && !turnoHoy && (
                            <Box sx={{
                                textAlign: 'center',
                                py: 8,
                                mt: 2,
                                bgcolor: '#1a201e',
                                borderRadius: 2,
                                border: '1px dashed rgba(255,255,255,0.08)'
                            }}>
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
                                    No hay registros para la fecha seleccionada
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#4b5563', display: 'block', mt: 1 }}>
                                    Seleccione otra fecha o cierre un turno desde Reporte Plus
                                </Typography>
                            </Box>
                        )}
                    </CardContent>
                </Card>

                {/* ═══════════════════════════════════════════════════
                    CARD DE RESUMEN POR TIPO DE CLIENTE
                ═══════════════════════════════════════════════════ */}
                {registrosFiltrados.length > 0 && (
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: '1px solid rgba(255,255,255,0.04)',
                            bgcolor: '#151a19',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                            overflow: 'hidden',
                            mt: 2,
                        }}
                    >
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h6"
                                    sx={{
                                        fontWeight: 700,
                                        color: '#00e5a0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1
                                    }}
                                >
                                    <TrendingUpIcon sx={{ color: '#00e5a0' }} />
                                    Resumen por Tipo de Cliente
                                </Typography>
                            </Box>

                            <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.06)' }} />

                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                {([
                                    'Cliente por efectivo o estandar',
                                    'Cliente por descuento',
                                    'Cliente por transferencia',
                                    'Cliente cuenta casa',
                                    'Cliente por credito'
                                ] as TipoCliente[]).map(tipo => {
                                    const monto = registrosFiltrados
                                        .filter(r => r.tipoCliente === tipo)
                                        .reduce((acc, r) => acc + r.montoPagado, 0);
                                    const cantidad = registrosFiltrados.filter(r => r.tipoCliente === tipo).length;

                                    const tipoColors: Record<TipoCliente, string> = {
                                        'Cliente por efectivo o estandar': '#00e5a0',
                                        'Cliente por descuento': '#f59e0b',
                                        'Cliente por transferencia': '#06b6d4',
                                        'Cliente cuenta casa': '#8b5cf6',
                                        'Cliente por credito': '#ef4444',
                                    };
                                    const color = tipoColors[tipo];

                                    return (
                                        <Card
                                            key={tipo}
                                            variant="outlined"
                                            sx={{
                                                flex: 1,
                                                minWidth: 180,
                                                borderRadius: 2,
                                                borderColor: 'rgba(255,255,255,0.04)',
                                                bgcolor: '#1a201e',
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    boxShadow: `0 4px 12px ${color}20`,
                                                    transform: 'translateY(-2px)',
                                                    borderColor: `${color}30`,
                                                }
                                            }}
                                        >
                                            <CardContent sx={{ p: 2, textAlign: 'center' }}>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: '#9ca3af',
                                                        fontWeight: 600,
                                                        textTransform: 'uppercase',
                                                        fontSize: '0.65rem',
                                                        letterSpacing: '0.05em',
                                                        display: 'block',
                                                        mb: 1
                                                    }}
                                                >
                                                    {tipo.replace('Cliente por ', '').replace('Cliente ', '')}
                                                </Typography>
                                                <Typography
                                                    variant="h5"
                                                    sx={{
                                                        fontWeight: 800,
                                                        color: color,
                                                        fontFamily: 'monospace',
                                                    }}
                                                >
                                                    ${monto.toFixed(2)}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: '#6b7280', mt: 0.5, display: 'block' }}>
                                                    {cantidad} {cantidad === 1 ? 'registro' : 'registros'}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </Box>
                        </CardContent>
                    </Card>
                )}

                {/* ═══════════════════════════════════════════════════
                    HISTORIAL DE TURNOS CERRADOS
                ═══════════════════════════════════════════════════ */}
                {turnosCerrados.length > 0 && (
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: '1px solid rgba(255,255,255,0.04)',
                            bgcolor: '#151a19',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                            overflow: 'hidden',
                            mt: 2,
                        }}
                    >
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h6"
                                    sx={{
                                        fontWeight: 700,
                                        color: '#00e5a0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1
                                    }}
                                >
                                    <LockClockIcon sx={{ color: '#00e5a0' }} />
                                    Historial de Turnos Cerrados
                                </Typography>
                                <Chip
                                    label={`${turnosCerrados.length} turnos`}
                                    size="small"
                                    sx={{
                                        bgcolor: 'rgba(0,229,160,0.08)',
                                        color: '#00e5a0',
                                        fontWeight: 600,
                                        borderRadius: 2,
                                        border: '1px solid rgba(0,229,160,0.15)',
                                    }}
                                />
                            </Box>

                            <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.06)' }} />

                            <TableContainer component={Paper} sx={{ boxShadow: 'none', bgcolor: 'transparent' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#0d1210' }}>
                                            <TableCell sx={{ color: '#9ca3af', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Fecha</TableCell>
                                            <TableCell sx={{ color: '#9ca3af', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Cerrado en</TableCell>
                                            <TableCell align="right" sx={{ color: '#9ca3af', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Ventas</TableCell>
                                            <TableCell align="right" sx={{ color: '#9ca3af', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Extracciones</TableCell>
                                            <TableCell align="right" sx={{ color: '#9ca3af', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Saldo Neto</TableCell>
                                            <TableCell align="center" sx={{ color: '#9ca3af', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Trans.</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {turnosCerrados.map((t, i) => (
                                            <TableRow key={i} sx={{
                                                '&:hover': { bgcolor: 'rgba(0,229,160,0.02)' },
                                                transition: 'all 0.15s ease',
                                            }}>
                                                <TableCell sx={{ color: '#f0f0f0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    {t.fecha}
                                                </TableCell>
                                                <TableCell sx={{ color: '#9ca3af', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    {new Date(t.cerradoEn).toLocaleString()}
                                                </TableCell>
                                                <TableCell align="right" sx={{ color: '#00e5a0', fontFamily: 'monospace', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    +{t.totalVentas.toFixed(2)}
                                                </TableCell>
                                                <TableCell align="right" sx={{ color: '#ef4444', fontFamily: 'monospace', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    −{t.totalExtracciones.toFixed(2)}
                                                </TableCell>
                                                <TableCell align="right" sx={{
                                                    color: t.saldoNeto >= 0 ? '#00e5a0' : '#ef4444',
                                                    fontWeight: 700,
                                                    fontFamily: 'monospace',
                                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                }}>
                                                    {t.saldoNeto.toFixed(2)}
                                                </TableCell>
                                                <TableCell align="center" sx={{ color: '#9ca3af', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    {t.cantidadTransacciones}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                )}
            </Box>
        </LocalizationProvider>
    );
}