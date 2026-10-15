// src/components/puntoVenta/CuadreCaja.tsx
import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    IconButton,
    MenuItem,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PaymentsIcon from '@mui/icons-material/Payments';
import CustomDataGridR, { type Column } from '../CustomDataGridR';
import { useNotify } from '../notificaciones/useNotify';
import { payloadSesionActual } from '../../utils/auth';
import { fechaHoyLocal } from '../../service/httpClient';
import {
    CUADRE_CAJA_URL,
    DENOMINACIONES,
    calcularCuadre,
    crearCuadre,
    desgloseVacio,
    listarCuadres,
    obtenerResumenDiario,
    totalDesglose,
    type CuadreCajaBackend,
    type DesgloseBilletes,
    type OtroMotivo,
    type TipoMotivo,
} from '../../service/cuadreCajaApi';

// ─── COLORES (alineados con theme/MuiProvider.tsx) ─────────────
const COLORS = {
    card: '#151a19',
    cardAlt: '#1a201e',
    border: 'rgba(255,255,255,0.06)',
    accent: '#00e5a0',
    accentSoft: 'rgba(0,229,160,0.08)',
    textMuted: '#9ca3af',
    textLight: '#e5e7eb',
    danger: '#ef4444',
    dangerSoft: 'rgba(239,68,68,0.1)',
};

const cardSx = {
    borderRadius: 3,
    border: `1px solid ${COLORS.border}`,
    bgcolor: COLORS.card,
    boxShadow: '0 2px 12px rgba(0,0,0,.35)',
};

// ─── TIPOS ─────────────────────────────────────────────────────
interface CuadreRow {
    id: string;
    fecha: string;
    empleado: string;
    ventas: number;
    transferencias: number;
    creditos: number;
    extracciones: number;
    efectivoContado: number;
    efectivoEsperado: number;
    diferencia: number;
    estado: string;
    observaciones: string;
}

type CampoNumerico = 'ventas' | 'transferencias' | 'creditos' | 'extracciones' | 'recargos' | 'descuentos';

const camposVacios = (): Record<CampoNumerico, string> => ({
    ventas: '',
    transferencias: '',
    creditos: '',
    extracciones: '',
    recargos: '',
    descuentos: '',
});

// ─── UTILIDADES ────────────────────────────────────────────────
const num = (v: string | number | undefined): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const money = (n: number) =>
    `$${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatearFecha = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('es-ES');
};

const nombreEmpleado = (c: CuadreCajaBackend) =>
    (typeof c.empleado === 'object' && c.empleado?.nombre_empleado) || c.realizadoPor || '—';

const toRow = (c: CuadreCajaBackend): CuadreRow => ({
    id: c._id,
    fecha: formatearFecha(c.fecha),
    empleado: nombreEmpleado(c),
    ventas: c.total_ventas_dia,
    transferencias: c.valor_transferencias,
    creditos: c.creditos,
    extracciones: c.total_extracciones_dia,
    efectivoContado: c.total_efectivo,
    efectivoEsperado: c.efectivo_esperado,
    diferencia: c.diferencia,
    estado: c.estado === 'cuadrado' ? 'Completada' : 'Pendiente',
    observaciones: c.observaciones ?? '',
});

/** "fecha" del cuadre: hoy con la hora actual, o el día elegido a mediodía. */
const fechaCuadreIso = (fecha: string) => {
    if (fecha === fechaHoyLocal()) return new Date().toISOString();
    const [y, m, d] = fecha.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0).toISOString();
};

function imprimirCuadre(c: CuadreCajaBackend) {
    const filas: [string, string][] = [
        ['Fecha', formatearFecha(c.fecha)],
        ['Empleado', nombreEmpleado(c)],
        ['Ventas netas del día', money(c.total_ventas_dia)],
        ['Transferencias', money(c.valor_transferencias)],
        ['Créditos / cuenta casa', money(c.creditos)],
        ['Extracciones', money(c.total_extracciones_dia)],
        ['Recargos', money(c.recargos)],
        ['Descuentos (informativo)', money(c.descuentos)],
        ...c.otros_motivos.map(
            (m): [string, string] => [`${m.tipo === 'ingreso' ? '+' : '-'} ${m.concepto}`, money(m.monto)],
        ),
        ['Efectivo esperado', money(c.efectivo_esperado)],
        ['Efectivo contado', money(c.total_efectivo)],
        ['Diferencia', money(c.diferencia)],
        ['Estado', c.estado === 'cuadrado' ? 'Cuadrado' : 'Con diferencia'],
    ];
    const billetes = DENOMINACIONES.filter((d) => (c.desglose_billetes?.[d.key] || 0) > 0)
        .map((d) => `<tr><td>$${d.valor} x ${c.desglose_billetes[d.key]}</td><td>${money(d.valor * c.desglose_billetes[d.key])}</td></tr>`)
        .join('');
    const w = window.open('', '_blank', 'width=420,height=640');
    if (!w) return;
    w.document.write(`<html><head><title>Cuadre de caja</title>
        <style>body{font-family:Inter,Arial,sans-serif;padding:16px;font-size:13px}h2{margin:0 0 12px}
        table{width:100%;border-collapse:collapse;margin-bottom:12px}td{padding:4px 0;border-bottom:1px dashed #ccc}
        td:last-child{text-align:right;font-weight:600}</style></head><body>
        <h2>Cuadre de caja</h2>
        <table>${filas.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>
        ${billetes ? `<h3>Desglose de efectivo</h3><table>${billetes}</table>` : ''}
        ${c.observaciones ? `<p><b>Observaciones:</b> ${c.observaciones}</p>` : ''}
        </body></html>`);
    w.document.close();
    w.focus();
    w.print();
}

// ─── COMPONENTE ────────────────────────────────────────────────
export default function CuadreCajaTab() {
    const notify = useNotify();
    const sesion = useMemo(() => payloadSesionActual(), []);
    const empleadoId = sesion?.sub;

    const [fecha, setFecha] = useState(fechaHoyLocal());
    const [campos, setCampos] = useState(camposVacios);
    const [cantidadVentas, setCantidadVentas] = useState<number | null>(null);
    const [desglose, setDesglose] = useState<DesgloseBilletes>(desgloseVacio);
    const [otros, setOtros] = useState<OtroMotivo[]>([]);
    const [otroConcepto, setOtroConcepto] = useState('');
    const [otroMonto, setOtroMonto] = useState('');
    const [otroTipo, setOtroTipo] = useState<TipoMotivo>('ingreso');
    const [observaciones, setObservaciones] = useState('');

    const [openDesglose, setOpenDesglose] = useState(false);
    const [cargandoResumen, setCargandoResumen] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [ultimo, setUltimo] = useState<CuadreCajaBackend | null>(null);

    const [historial, setHistorial] = useState<CuadreCajaBackend[]>([]);
    const [verTodos, setVerTodos] = useState(false);
    const [cargandoHistorial, setCargandoHistorial] = useState(true);

    const efectivoContado = totalDesglose(desglose);
    const datos = {
        total_ventas_dia: num(campos.ventas),
        valor_transferencias: num(campos.transferencias),
        creditos: num(campos.creditos),
        total_extracciones_dia: num(campos.extracciones),
        recargos: num(campos.recargos),
        descuentos: num(campos.descuentos),
        otros_motivos: otros,
    };
    const calculo = calcularCuadre(datos, efectivoContado);

    const setCampo = (campo: CampoNumerico, valor: string) =>
        setCampos((prev) => ({ ...prev, [campo]: valor }));

    // ── Historial ──
    const [historialKey, setHistorialKey] = useState(0);

    useEffect(() => {
        let activo = true;
        listarCuadres(verTodos ? undefined : fecha)
            .then((data) => {
                if (activo) setHistorial(data);
            })
            .catch((error: unknown) => {
                if (activo) notify.error(error instanceof Error ? error.message : 'No se pudo cargar el historial.');
            })
            .finally(() => {
                if (activo) setCargandoHistorial(false);
            });
        return () => {
            activo = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fecha, verTodos, historialKey]);

    const recargarHistorial = () => {
        setCargandoHistorial(true);
        setHistorialKey((k) => k + 1);
    };

    // ── Resumen del día ──
    const [resumenKey, setResumenKey] = useState(0);

    useEffect(() => {
        let activo = true;
        obtenerResumenDiario(fecha)
            .then((r) => {
                if (!activo) return;
                setCampos((prev) => ({
                    ...prev,
                    ventas: String(r.total_ventas_dia),
                    transferencias: String(r.valor_transferencias),
                    creditos: String(r.total_creditos),
                    extracciones: String(r.total_extracciones_dia),
                    descuentos: String(r.descuentos),
                }));
                setCantidadVentas(r.cantidad_ventas);
            })
            .catch((error: unknown) => {
                if (activo) notify.error(error instanceof Error ? error.message : 'No se pudo cargar el resumen del día.');
            })
            .finally(() => {
                if (activo) setCargandoResumen(false);
            });
        return () => {
            activo = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fecha, resumenKey]);

    const recargarResumen = () => {
        setCargandoResumen(true);
        setResumenKey((k) => k + 1);
    };

    const cambiarFecha = (valor: string) => {
        setCargandoResumen(true);
        setCargandoHistorial(true);
        setFecha(valor || fechaHoyLocal());
    };

    const cambiarVerTodos = (valor: boolean) => {
        setCargandoHistorial(true);
        setVerTodos(valor);
    };

    // ── Otros motivos ──
    const agregarOtro = () => {
        const monto = num(otroMonto);
        if (!otroConcepto.trim() || monto <= 0) {
            notify.error('Indique un concepto y un monto mayor que 0.');
            return;
        }
        setOtros((prev) => [...prev, { concepto: otroConcepto.trim(), monto, tipo: otroTipo }]);
        setOtroConcepto('');
        setOtroMonto('');
    };

    // ── Guardar ──
    const guardar = async () => {
        if (!empleadoId) {
            notify.error('No hay una sesión válida. Inicie sesión para registrar el cuadre.');
            return;
        }
        setGuardando(true);
        try {
            const creado = await crearCuadre({
                ...datos,
                fecha: fechaCuadreIso(fecha),
                empleado: empleadoId,
                desglose_billetes: desglose,
                total_efectivo: efectivoContado,
                realizadoPor: sesion?.nombre_empleado,
                observaciones: observaciones.trim() || undefined,
            });
            setUltimo(creado);
            notify.success(
                creado.estado === 'cuadrado'
                    ? 'Cuadre guardado: la caja está cuadrada.'
                    : `Cuadre guardado con diferencia de ${money(creado.diferencia)}.`,
            );
            recargarHistorial();
        } catch (error) {
            notify.error(error instanceof Error ? error.message : 'No se pudo guardar el cuadre.');
        } finally {
            setGuardando(false);
        }
    };

    const columns: Column<CuadreRow>[] = [
        { field: 'fecha', headerName: 'Fecha', editable: false },
        { field: 'empleado', headerName: 'Empleado', editable: false },
        { field: 'ventas', headerName: 'Ventas', numeric: true, editable: false },
        { field: 'transferencias', headerName: 'Transferencias', numeric: true, editable: false },
        { field: 'creditos', headerName: 'Créditos', numeric: true, editable: false },
        { field: 'extracciones', headerName: 'Extracciones', numeric: true, editable: false },
        { field: 'efectivoEsperado', headerName: 'Efectivo esperado', numeric: true, editable: false },
        { field: 'efectivoContado', headerName: 'Efectivo contado', numeric: true, editable: false },
        { field: 'diferencia', headerName: 'Diferencia', numeric: true, editable: false },
        { field: 'estado', headerName: 'Estado', isStatusColumn: true, editable: false },
        { field: 'observaciones', headerName: 'Observaciones' },
    ];

    const filasResumen: { label: string; value: number; signo: '+' | '-' | '' }[] = [
        { label: 'Ventas netas', value: datos.total_ventas_dia, signo: '' },
        { label: 'Recargos', value: datos.recargos, signo: '+' },
        { label: 'Extracciones', value: datos.total_extracciones_dia, signo: '-' },
        { label: 'Transferencias', value: datos.valor_transferencias, signo: '-' },
        { label: 'Créditos', value: datos.creditos, signo: '-' },
        ...otros.map((m) => ({
            label: m.concepto,
            value: m.monto,
            signo: (m.tipo === 'ingreso' ? '+' : '-') as '+' | '-',
        })),
    ];

    const cuadrado = calculo.estado === 'cuadrado';

    return (
        <Box sx={{ width: '100%' }}>
            {!empleadoId && (
                <Alert severity="warning" sx={{ m: 1 }}>
                    No se encontró el empleado de la sesión. Inicie sesión para poder guardar cuadres.
                </Alert>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: 2, m: 1 }}>
                {/* ── FORMULARIO ── */}
                <Card elevation={0} sx={cardSx}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                            <Box>
                                <Typography
                                    variant="h6"
                                    sx={{ color: COLORS.accent, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}
                                >
                                    <AccountBalanceWalletIcon />
                                    Cuadre de Caja
                                </Typography>
                                <Typography variant="body2" sx={{ color: COLORS.textMuted, mt: 0.5 }}>
                                    Los totales se precargan desde las ventas y extracciones registradas del día.
                                </Typography>
                            </Box>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                <Chip
                                    label={sesion?.nombre_empleado ?? 'Sin sesión'}
                                    sx={{ bgcolor: COLORS.cardAlt, color: COLORS.textLight, fontWeight: 600 }}
                                />
                                {cantidadVentas !== null && (
                                    <Chip
                                        label={`${cantidadVentas} ventas`}
                                        sx={{ bgcolor: COLORS.accentSoft, color: COLORS.accent, fontWeight: 600 }}
                                    />
                                )}
                            </Stack>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 3 }}>
                            <TextField
                                label="Fecha"
                                type="date"
                                size="small"
                                value={fecha}
                                onChange={(e) => cambiarFecha(e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                            <Button
                                variant="outlined"
                                startIcon={cargandoResumen ? <CircularProgress size={16} color="inherit" /> : <CloudDownloadIcon />}
                                onClick={recargarResumen}
                                disabled={cargandoResumen}
                            >
                                Cargar datos del día
                            </Button>
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                            {(
                                [
                                    ['ventas', 'Ventas netas del día'],
                                    ['transferencias', 'Transferencias'],
                                    ['creditos', 'Créditos / cuenta casa'],
                                    ['extracciones', 'Extracciones'],
                                    ['recargos', 'Recargos'],
                                    ['descuentos', 'Descuentos (informativo)'],
                                ] as [CampoNumerico, string][]
                            ).map(([campo, label]) => (
                                <TextField
                                    key={campo}
                                    label={label}
                                    type="number"
                                    size="small"
                                    value={campos[campo]}
                                    onChange={(e) => setCampo(campo, e.target.value)}
                                    slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                                />
                            ))}
                        </Box>

                        <Divider sx={{ my: 3, borderColor: COLORS.border }} />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                            <Box>
                                <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
                                    Efectivo contado
                                </Typography>
                                <Typography variant="h5" sx={{ fontWeight: 700, color: COLORS.textLight }}>
                                    {money(efectivoContado)}
                                </Typography>
                            </Box>
                            <Button variant="contained" startIcon={<PaymentsIcon />} onClick={() => setOpenDesglose(true)}>
                                Desglose de efectivo
                            </Button>
                        </Box>

                        <Divider sx={{ my: 3, borderColor: COLORS.border }} />

                        <Typography variant="subtitle2" sx={{ color: COLORS.textLight, fontWeight: 600, mb: 1.5 }}>
                            Otros motivos
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr auto' }, gap: 1.5 }}>
                            <TextField
                                label="Concepto"
                                size="small"
                                value={otroConcepto}
                                onChange={(e) => setOtroConcepto(e.target.value)}
                            />
                            <TextField
                                label="Monto"
                                type="number"
                                size="small"
                                value={otroMonto}
                                onChange={(e) => setOtroMonto(e.target.value)}
                                slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                            />
                            <TextField
                                select
                                label="Tipo"
                                size="small"
                                value={otroTipo}
                                onChange={(e) => setOtroTipo(e.target.value as TipoMotivo)}
                            >
                                <MenuItem value="ingreso">Ingreso (+)</MenuItem>
                                <MenuItem value="egreso">Egreso (-)</MenuItem>
                            </TextField>
                            <Button variant="outlined" startIcon={<AddIcon />} onClick={agregarOtro}>
                                Agregar
                            </Button>
                        </Box>
                        {otros.length > 0 && (
                            <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1.5, flexWrap: 'wrap' }}>
                                {otros.map((m, i) => (
                                    <Chip
                                        key={`${m.concepto}-${i}`}
                                        label={`${m.tipo === 'ingreso' ? '+' : '-'} ${m.concepto}: ${money(m.monto)}`}
                                        onDelete={() => setOtros((prev) => prev.filter((_, idx) => idx !== i))}
                                        deleteIcon={<DeleteIcon />}
                                        sx={{
                                            bgcolor: m.tipo === 'ingreso' ? COLORS.accentSoft : COLORS.dangerSoft,
                                            color: m.tipo === 'ingreso' ? COLORS.accent : COLORS.danger,
                                        }}
                                    />
                                ))}
                            </Stack>
                        )}

                        <TextField
                            label="Observaciones"
                            size="small"
                            fullWidth
                            multiline
                            minRows={2}
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            sx={{ mt: 3 }}
                        />
                    </CardContent>
                </Card>

                {/* ── RESULTADO ── */}
                <Card elevation={0} sx={cardSx}>
                    <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Typography variant="subtitle1" sx={{ color: COLORS.textLight, fontWeight: 700, mb: 2 }}>
                            Resultado
                        </Typography>
                        <Stack spacing={1} sx={{ flex: 1 }}>
                            {filasResumen.map((f, i) => (
                                <Box key={`${f.label}-${i}`} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" sx={{ color: COLORS.textMuted }}>
                                        {f.signo && `${f.signo} `}
                                        {f.label}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: COLORS.textLight, fontWeight: 600 }}>
                                        {money(f.value)}
                                    </Typography>
                                </Box>
                            ))}
                            <Divider sx={{ borderColor: COLORS.border }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ color: COLORS.textLight, fontWeight: 600 }}>Efectivo esperado</Typography>
                                <Typography sx={{ color: COLORS.textLight, fontWeight: 700 }}>
                                    {money(calculo.efectivoEsperado)}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ color: COLORS.textLight, fontWeight: 600 }}>Efectivo contado</Typography>
                                <Typography sx={{ color: COLORS.textLight, fontWeight: 700 }}>
                                    {money(efectivoContado)}
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    mt: 1,
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: cuadrado ? COLORS.accentSoft : COLORS.dangerSoft,
                                    border: `1px solid ${cuadrado ? 'rgba(0,229,160,0.25)' : 'rgba(239,68,68,0.25)'}`,
                                    textAlign: 'center',
                                }}
                            >
                                <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
                                    Diferencia
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 800, color: cuadrado ? COLORS.accent : COLORS.danger }}>
                                    {money(calculo.diferencia)}
                                </Typography>
                                <Typography variant="body2" sx={{ color: cuadrado ? COLORS.accent : COLORS.danger, fontWeight: 600 }}>
                                    {cuadrado ? 'Caja cuadrada' : calculo.diferencia > 0 ? 'Sobrante en caja' : 'Faltante en caja'}
                                </Typography>
                            </Box>
                        </Stack>

                        <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
                            <Button
                                fullWidth
                                variant="contained"
                                startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                                onClick={() => void guardar()}
                                disabled={guardando || !empleadoId}
                            >
                                Guardar cuadre
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<PrintIcon />}
                                onClick={() => ultimo && imprimirCuadre(ultimo)}
                                disabled={!ultimo}
                            >
                                Imprimir
                            </Button>
                        </Stack>
                    </CardContent>
                </Card>
            </Box>

            {/* ── HISTORIAL ── */}
            <Box sx={{ m: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                    <FormControlLabel
                        control={<Switch checked={verTodos} onChange={(e) => cambiarVerTodos(e.target.checked)} />}
                        label={<Typography variant="body2" sx={{ color: COLORS.textMuted }}>Ver todos los días</Typography>}
                    />
                </Box>
                {cargandoHistorial ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress sx={{ color: COLORS.accent }} />
                    </Box>
                ) : (
                    <CustomDataGridR<CuadreRow>
                        rows={historial.map(toRow)}
                        columns={columns}
                        getRowId={(row) => row.id}
                        title={verTodos ? 'Historial de cuadres' : `Cuadres del ${fecha}`}
                        editConfig={{
                            baseUrl: CUADRE_CAJA_URL,
                            buildPayload: (changes) => ({ observaciones: changes.observaciones ?? '' }),
                            onSuccess: () => {
                                notify.success('Cuadre actualizado');
                                recargarHistorial();
                            },
                        }}
                        deleteConfig={{
                            baseUrl: CUADRE_CAJA_URL,
                            onSuccess: () => {
                                notify.success('Cuadre eliminado');
                                recargarHistorial();
                            },
                        }}
                    />
                )}
            </Box>

            {/* ── DIÁLOGO DESGLOSE ── */}
            <Dialog open={openDesglose} onClose={() => setOpenDesglose(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Desglose de efectivo
                    <IconButton onClick={() => setOpenDesglose(false)} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                        {DENOMINACIONES.map((d) => (
                            <Box
                                key={d.key}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    p: 1,
                                    borderRadius: 2,
                                    bgcolor: COLORS.cardAlt,
                                    border: `1px solid ${COLORS.border}`,
                                }}
                            >
                                <Typography sx={{ minWidth: 64, fontWeight: 700, color: COLORS.accent }}>${d.valor}</Typography>
                                <IconButton
                                    size="small"
                                    onClick={() => setDesglose((p) => ({ ...p, [d.key]: Math.max(0, p[d.key] - 1) }))}
                                >
                                    <RemoveIcon fontSize="small" />
                                </IconButton>
                                <TextField
                                    size="small"
                                    type="number"
                                    value={desglose[d.key]}
                                    onChange={(e) =>
                                        setDesglose((p) => ({ ...p, [d.key]: Math.max(0, Math.floor(num(e.target.value))) }))
                                    }
                                    slotProps={{ htmlInput: { min: 0, style: { textAlign: 'center' } } }}
                                    sx={{ width: 80 }}
                                />
                                <IconButton size="small" onClick={() => setDesglose((p) => ({ ...p, [d.key]: p[d.key] + 1 }))}>
                                    <AddIcon fontSize="small" />
                                </IconButton>
                                <Typography variant="body2" sx={{ ml: 'auto', color: COLORS.textMuted }}>
                                    {money(d.valor * desglose[d.key])}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between', px: 3 }}>
                    <Typography sx={{ fontWeight: 700 }}>Total: {money(efectivoContado)}</Typography>
                    <Stack direction="row" spacing={1}>
                        <Button onClick={() => setDesglose(desgloseVacio())}>Limpiar</Button>
                        <Button variant="contained" onClick={() => setOpenDesglose(false)}>
                            Aceptar
                        </Button>
                    </Stack>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
