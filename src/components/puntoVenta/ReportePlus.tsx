import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material';
import LockClockIcon from '@mui/icons-material/LockClock';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import MoneyIcon from '@mui/icons-material/Money';
import PaymentIcon from '@mui/icons-material/Payment';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CustomDataGridR, { type Column } from '../CustomDataGridR';
import { useNotify } from '../notificaciones/useNotify';
import { getErrorMessage } from '../../utils/errorMessage';
import {
    cerrarTurno,
    listarReportePlus,
    obtenerResumenReportePlus,
    type FilaReportePlus,
    type MetodoPagoReporte,
    type ResumenReportePlus,
} from '../../service/reportePlusApi';

const COLORS = {
    card: '#151a19',
    border: 'rgba(255,255,255,0.06)',
    accent: '#00e5a0',
    textMuted: '#9ca3af',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#06b6d4',
    violet: '#8b5cf6',
};

const METODOS: { key: MetodoPagoReporte; label: string; color: string; icon: React.ReactNode }[] = [
    { key: 'efectivo', label: 'Efectivo', color: COLORS.accent, icon: <MoneyIcon /> },
    { key: 'credito', label: 'Crédito', color: COLORS.warning, icon: <PaymentIcon /> },
    { key: 'transferencia', label: 'Transferencia', color: COLORS.info, icon: <SwapHorizIcon /> },
    { key: 'factura', label: 'Factura', color: COLORS.violet, icon: <ReceiptLongIcon /> },
];

const ETIQUETA_METODO = Object.fromEntries(METODOS.map((m) => [m.key, m.label]));

interface FilaGrid {
    id: string;
    n: number;
    fecha: string;
    codigo: string;
    producto: string;
    cantidadVendida: number;
    stockFinal: number;
    metodoPago: string;
    total: number;
    descuento: number;
    impuesto: number;
}

const columns: Column<FilaGrid>[] = [
    // El grid ordena por la primera columna: "#" mantiene lo más reciente arriba.
    { field: 'n', headerName: '#', numeric: true },
    { field: 'fecha', headerName: 'Fecha', type: 'date' },
    { field: 'codigo', headerName: 'Código' },
    { field: 'producto', headerName: 'Producto' },
    { field: 'cantidadVendida', headerName: 'Cantidad Vendida', numeric: true },
    { field: 'stockFinal', headerName: 'Stock Final', numeric: true },
    { field: 'metodoPago', headerName: 'Método de Pago' },
    { field: 'total', headerName: 'Total', numeric: true },
    { field: 'descuento', headerName: 'Descuento', numeric: true },
    { field: 'impuesto', headerName: 'Impuesto', numeric: true },
];

const dosDecimales = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const formatearFecha = (iso: string) => {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

interface Props {
    moneda?: string;
}

function Tarjeta(props: {
    titulo: string;
    valor: string;
    color: string;
    icono: React.ReactNode;
    detalle?: string;
}) {
    return (
        <Card sx={{ flex: '1 1 220px', bgcolor: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                    sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        display: 'grid',
                        placeItems: 'center',
                        color: props.color,
                        bgcolor: `${props.color}1a`,
                    }}
                >
                    {props.icono}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
                        {props.titulo}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: props.color }}>
                        {props.valor}
                    </Typography>
                    {props.detalle && (
                        <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
                            {props.detalle}
                        </Typography>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
}

export default function ReportePlusTab({ moneda = 'CUP' }: Props) {
    const notify = useNotify();
    const [filas, setFilas] = useState<FilaReportePlus[]>([]);
    const [resumen, setResumen] = useState<ResumenReportePlus | null>(null);
    const [cargando, setCargando] = useState(true);
    const [confirmar, setConfirmar] = useState(false);
    const [cerrando, setCerrando] = useState(false);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const [lista, totales] = await Promise.all([listarReportePlus(), obtenerResumenReportePlus()]);
            setFilas(lista);
            setResumen(totales);
        } catch (error) {
            notify.error(getErrorMessage(error, 'No se pudo cargar el Reporte Plus'));
        } finally {
            setCargando(false);
        }
    }, [notify]);

    useEffect(() => {
        void cargar();
    }, [cargar]);

    const dinero = (n: number) =>
        `${n.toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda}`;

    const filasGrid = useMemo<FilaGrid[]>(
        () =>
            filas.map((f, i) => ({
                id: f._id,
                n: i + 1,
                fecha: formatearFecha(f.fecha),
                codigo: f.producto?.codigo ?? '',
                producto: f.producto?.nombre ?? '',
                cantidadVendida: f.cantidadVendida,
                stockFinal: f.stockFinal,
                metodoPago: ETIQUETA_METODO[f.metodoPago] ?? f.metodoPago,
                total: dosDecimales(f.total),
                descuento: dosDecimales(f.descuento),
                impuesto: dosDecimales(f.impuesto),
            })),
        [filas],
    );

    const handleCerrarTurno = async () => {
        setCerrando(true);
        try {
            const r = await cerrarTurno();
            guardarParaReporteCaja(r.resumen);
            setConfirmar(false);
            notify.success(r.mensaje);
            await cargar();
        } catch (error) {
            notify.error(getErrorMessage(error, 'No se pudo cerrar el turno'));
        } finally {
            setCerrando(false);
        }
    };

    const sinVentas = filas.length === 0;

    return (
        <Box sx={{ width: '100%' }}>
            {/* Encabezado + Cerrar Turno (esquina superior derecha) */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 2,
                    p: 3,
                    mb: 2,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #131817 0%, #043625 100%)',
                    border: `1px solid ${COLORS.border}`,
                }}
            >
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        Reporte Plus
                    </Typography>
                    <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
                        Ventas del turno actual
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => void cargar()}
                        disabled={cargando || cerrando}
                    >
                        Actualizar
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<LockClockIcon />}
                        onClick={() => setConfirmar(true)}
                        disabled={cargando || cerrando || sinVentas}
                    >
                        Cerrar Turno
                    </Button>
                </Box>
            </Box>

            {/* Totales */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <Tarjeta
                    titulo="Total en ventas"
                    valor={dinero(resumen?.totalVentas ?? 0)}
                    color={COLORS.accent}
                    icono={<TrendingUpIcon />}
                />
                <Tarjeta
                    titulo="Total en extracciones"
                    valor={dinero(resumen?.totalExtracciones ?? 0)}
                    color={COLORS.danger}
                    icono={<TrendingDownIcon />}
                />
                <Tarjeta
                    titulo="Saldo neto"
                    valor={dinero(resumen?.saldoNeto ?? 0)}
                    color={(resumen?.saldoNeto ?? 0) < 0 ? COLORS.danger : COLORS.accent}
                    icono={<AccountBalanceWalletIcon />}
                    detalle="Ventas − extracciones"
                />
                <Tarjeta
                    titulo="Transferencias del día"
                    valor={String(resumen?.cantidadTransferencias ?? 0)}
                    color={COLORS.info}
                    icono={<SwapHorizIcon />}
                    detalle="Pagos por transferencia"
                />
            </Box>

            {/* Saldos desglosados por método de pago */}
            <Typography variant="subtitle2" sx={{ color: COLORS.textMuted, mb: 1 }}>
                Saldos por método de pago
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                {METODOS.map((m) => (
                    <Tarjeta
                        key={m.key}
                        titulo={m.label}
                        valor={dinero(resumen?.porMetodo[m.key] ?? 0)}
                        color={m.color}
                        icono={m.icon}
                    />
                ))}
            </Box>

            <Card sx={{ bgcolor: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                <CardContent>
                    {cargando && filas.length === 0 ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <CustomDataGridR<FilaGrid>
                            rows={filasGrid}
                            columns={columns}
                            getRowId={(r) => r.id}
                            title="Reporte Plus"
                        />
                    )}
                </CardContent>
            </Card>

            <Dialog
                open={confirmar}
                onClose={() => !cerrando && setConfirmar(false)}
                slotProps={{ paper: { sx: { bgcolor: COLORS.card, backgroundImage: 'none' } } }}
            >
                <DialogTitle>Cerrar turno</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: COLORS.textMuted }}>
                        Se registrarán los {filas.length} movimientos en el Kardex y después se limpiará el Reporte
                        Plus. El resumen del turno queda guardado. Esta acción no se puede deshacer.
                    </Typography>
                    <Typography sx={{ mt: 2, fontWeight: 600 }}>
                        Saldo neto del turno: {dinero(resumen?.saldoNeto ?? 0)}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setConfirmar(false)} disabled={cerrando}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => void handleCerrarTurno()}
                        disabled={cerrando}
                        startIcon={cerrando ? <CircularProgress size={16} color="inherit" /> : <LockClockIcon />}
                    >
                        {cerrando ? 'Cerrando...' : 'Cerrar turno'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

/** Reporte de Caja lee el último turno cerrado desde localStorage. */
function guardarParaReporteCaja(resumen: ResumenReportePlus) {
    try {
        const cierre = new Date();
        const p = (n: number) => String(n).padStart(2, '0');
        const turno = {
            fecha: `${cierre.getFullYear()}-${p(cierre.getMonth() + 1)}-${p(cierre.getDate())}`,
            totalVentas: resumen.totalVentas,
            totalExtracciones: resumen.totalExtracciones,
            saldoNeto: resumen.saldoNeto,
            porMetodo: resumen.porMetodo,
            cantidadTransacciones: resumen.movimientos,
            transacciones: [],
            cerradoEn: cierre.toISOString(),
        };
        const historial: unknown[] = JSON.parse(localStorage.getItem('reporte_caja_historial') || '[]');
        historial.push(turno);
        localStorage.setItem('reporte_caja_historial', JSON.stringify(historial));
        localStorage.setItem('reporte_caja_turno_actual', JSON.stringify(turno));
    } catch {
        // localStorage no disponible: el cierre ya quedó guardado en el backend.
    }
}
