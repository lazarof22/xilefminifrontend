import { useEffect, useState } from 'react';
import {
    Alert,
    AlertTitle,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    FormControlLabel,
    MenuItem,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SaveIcon from '@mui/icons-material/Save';
import { useNotify } from '../notificaciones/useNotify';
import { getErrorMessage } from '../../utils/errorMessage';
import { useAuth } from '../../context/authContext';
import { inputSx } from '../inventario/dialogEstilos';
import { fechaHoyLocal } from '../../service/httpClient';
import { EVENTO_TURNO_CAJA, listarTurnosCaja, type TurnoCaja } from '../../service/turnoCajaApi';
import {
    actualizarConfiguracionDeposito,
    crearDeposito,
    listarDepositos,
    obtenerAlertasDeposito,
    obtenerConfiguracionDeposito,
    type ConfiguracionDeposito,
    type DepositoBancario,
    type RespuestaAlertas,
} from '../../service/depositoBancarioApi';

const monto = (n: number, moneda: string) =>
    `${n.toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda}`;

const etiquetaTurno = (t: TurnoCaja) =>
    `${new Date(t.fechaApertura).toLocaleString('es-CU')} · ${t.cajeroNombre ?? 'Cajero'} · ${
        t.estado === 'abierto' ? 'abierto' : 'cerrado'
    }`;

/** Texto para el usuario cuando el servidor rechazó una de las consultas de la pestaña. */
const motivoDeRechazo = (error: unknown): string => {
    const mensaje = getErrorMessage(error, '');
    if (/forbidden|permiso|rol/i.test(mensaje)) return 'su rol no tiene permiso para consultarlo';
    return mensaje || 'error del servidor';
};

/** Depósitos bancarios del efectivo de los turnos, con alerta de plazo (si la norma está activada). */
export default function DepositosBancariosTab() {
    const notify = useNotify();
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === 'administrador';

    const [depositos, setDepositos] = useState<DepositoBancario[]>([]);
    const [turnos, setTurnos] = useState<TurnoCaja[]>([]);
    const [alertas, setAlertas] = useState<RespuestaAlertas | null>(null);
    const [config, setConfig] = useState<ConfiguracionDeposito | null>(null);
    const [cargando, setCargando] = useState(true);
    /** Partes de la pestaña que el servidor no devolvió (p. ej. 403 por rol); el resto se muestra igual. */
    const [avisosCarga, setAvisosCarga] = useState<string[]>([]);
    const [guardando, setGuardando] = useState(false);
    const [refresco, setRefresco] = useState(0);

    const [turnoId, setTurnoId] = useState('');
    const [importe, setImporte] = useState('');
    const [moneda, setMoneda] = useState('CUP');
    const [banco, setBanco] = useState('');
    const [referencia, setReferencia] = useState('');
    const [fecha, setFecha] = useState(fechaHoyLocal());

    useEffect(() => {
        const alCambiarTurno = () => setRefresco((r) => r + 1);
        window.addEventListener(EVENTO_TURNO_CAJA, alCambiarTurno);
        return () => window.removeEventListener(EVENTO_TURNO_CAJA, alCambiarTurno);
    }, []);

    useEffect(() => {
        let activo = true;
        // Cada consulta es independiente: si el servidor rechaza una (403), las demás se muestran igual.
        Promise.allSettled([
            listarDepositos(),
            listarTurnosCaja(),
            obtenerAlertasDeposito(),
            obtenerConfiguracionDeposito(),
        ]).then(([d, t, a, c]) => {
            if (!activo) return;
            const avisos: string[] = [];
            const falla = (parte: string, motivo: unknown) =>
                avisos.push(`No se pudo cargar ${parte}: ${motivoDeRechazo(motivo)}.`);

            if (d.status === 'fulfilled') setDepositos(d.value);
            else {
                setDepositos([]);
                falla('la lista de depósitos', d.reason);
            }
            if (t.status === 'fulfilled') setTurnos(t.value);
            else {
                setTurnos([]);
                falla('los turnos de caja', t.reason);
            }
            if (a.status === 'fulfilled') setAlertas(a.value);
            else {
                setAlertas(null);
                falla('las alertas de plazo', a.reason);
            }
            if (c.status === 'fulfilled') setConfig(c.value);
            else {
                setConfig(null);
                falla('la configuración de alertas', c.reason);
            }

            setAvisosCarga(avisos);
            setCargando(false);
        });
        return () => {
            activo = false;
        };
    }, [refresco]);

    const importeNumero = Number(importe);
    const faltaDato =
        !turnoId || !banco.trim() || !moneda.trim() || !Number.isFinite(importeNumero) || importeNumero <= 0;

    const guardar = async () => {
        setGuardando(true);
        try {
            await crearDeposito({
                turnoCajaId: turnoId,
                monto: importeNumero,
                moneda: moneda.trim().toUpperCase(),
                banco: banco.trim(),
                referencia: referencia.trim() || undefined,
                fecha: new Date(`${fecha}T12:00:00`).toISOString(),
            });
            notify.success('Depósito registrado.');
            setImporte('');
            setReferencia('');
            setRefresco((r) => r + 1);
        } catch (e) {
            notify.error(getErrorMessage(e, 'No se pudo registrar el depósito.'));
        } finally {
            setGuardando(false);
        }
    };

    const cambiarAlertas = async (activas: boolean) => {
        try {
            setConfig(await actualizarConfiguracionDeposito({ alertasActivas: activas }));
            setRefresco((r) => r + 1);
        } catch (e) {
            notify.error(getErrorMessage(e, 'No se pudo cambiar la configuración de alertas.'));
        }
    };

    const turnoDe = (id: string) => turnos.find((t) => t._id === id);

    return (
        <Box sx={{ m: 1, display: 'grid', gap: 2 }}>
            {avisosCarga.length > 0 && (
                <Alert severity="warning">
                    <AlertTitle>Información incompleta</AlertTitle>
                    {avisosCarga.map((aviso) => (
                        <Typography key={aviso} variant="body2">
                            {aviso}
                        </Typography>
                    ))}
                </Alert>
            )}

            {/* El aviso solo aparece si la norma está activada en la configuración. */}
            {alertas?.activas && alertas.alertas.length > 0 && (
                <Alert severity="warning">
                    <AlertTitle>Plazo de depósito bancario</AlertTitle>
                    {alertas.alertas.map((a, i) => (
                        <Typography key={`${a.tipo}-${i}`} variant="body2">
                            {a.mensaje}
                        </Typography>
                    ))}
                </Alert>
            )}

            <Card elevation={0} sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3 }}>
                <CardContent sx={{ p: 3, display: 'grid', gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                        <Box>
                            <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 700, display: 'flex', gap: 1 }}>
                                <AccountBalanceIcon />
                                Depósitos bancarios
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                Registro del efectivo depositado por turno. Es una salida física del efectivo esperado.
                            </Typography>
                        </Box>
                        {esAdmin && config && (
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={config.alertasActivas}
                                        onChange={(e) => void cambiarAlertas(e.target.checked)}
                                    />
                                }
                                label={
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        Alertas de plazo (activar tras confirmar la norma)
                                    </Typography>
                                }
                            />
                        )}
                    </Box>

                    <TextField
                        select
                        size="small"
                        label="Turno de caja"
                        value={turnoId}
                        onChange={(e) => setTurnoId(e.target.value)}
                        disabled={cargando || guardando}
                        sx={inputSx}
                    >
                        <MenuItem value="">Seleccione un turno</MenuItem>
                        {turnos.map((t) => (
                            <MenuItem key={t._id} value={t._id}>
                                {etiquetaTurno(t)}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                        <TextField
                            size="small"
                            type="number"
                            label="Monto"
                            value={importe}
                            onChange={(e) => setImporte(e.target.value)}
                            disabled={guardando}
                            slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                            sx={inputSx}
                        />
                        <TextField
                            size="small"
                            label="Moneda"
                            value={moneda}
                            onChange={(e) => setMoneda(e.target.value)}
                            disabled={guardando}
                            sx={inputSx}
                        />
                        <TextField
                            size="small"
                            type="date"
                            label="Fecha"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value || fechaHoyLocal())}
                            disabled={guardando}
                            slotProps={{ inputLabel: { shrink: true } }}
                            sx={inputSx}
                        />
                        <TextField
                            size="small"
                            label="Banco"
                            value={banco}
                            onChange={(e) => setBanco(e.target.value)}
                            disabled={guardando}
                            sx={inputSx}
                        />
                        <TextField
                            size="small"
                            label="Referencia / boleta"
                            value={referencia}
                            onChange={(e) => setReferencia(e.target.value)}
                            disabled={guardando}
                            sx={inputSx}
                        />
                    </Box>
                    <Box>
                        <Button
                            variant="contained"
                            startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                            onClick={() => void guardar()}
                            disabled={guardando || faltaDato}
                        >
                            Registrar depósito
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            <Card elevation={0} sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3 }}>
                <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                        Depósitos registrados
                    </Typography>
                    {cargando ? (
                        <CircularProgress size={24} />
                    ) : depositos.length === 0 ? (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Todavía no hay depósitos.
                        </Typography>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Fecha</TableCell>
                                        <TableCell>Turno</TableCell>
                                        <TableCell>Banco</TableCell>
                                        <TableCell>Referencia</TableCell>
                                        <TableCell align="right">Monto</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {depositos.map((d) => {
                                        const t = turnoDe(d.turnoCajaId);
                                        return (
                                            <TableRow key={d._id}>
                                                <TableCell>{new Date(d.fecha).toLocaleDateString('es-CU')}</TableCell>
                                                <TableCell>{t ? etiquetaTurno(t) : d.turnoCajaId}</TableCell>
                                                <TableCell>{d.banco}</TableCell>
                                                <TableCell>{d.referencia ?? '—'}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                    {monto(d.monto, d.moneda)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}
