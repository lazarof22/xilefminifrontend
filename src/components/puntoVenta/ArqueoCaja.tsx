import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import SaveIcon from '@mui/icons-material/Save';
import { useNotify } from '../notificaciones/useNotify';
import { getErrorMessage } from '../../utils/errorMessage';
import { payloadSesionActual } from '../../utils/auth';
import { inputSx } from '../inventario/dialogEstilos';
import { listarTurnosCaja, EVENTO_TURNO_CAJA, type TurnoCaja } from '../../service/turnoCajaApi';
import {
    crearArqueo,
    listarArqueos,
    obtenerEsperadoDelTurno,
    type ArqueoCaja,
    type EstadoDiferencia,
} from '../../service/arqueoCajaApi';

/** Roles con permiso para registrar el arqueo SC-3-06 (el servidor lo vuelve a validar). */
const ROLES_ARQUEO = ['administrador', 'economico', 'gerente'];

const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const monto = (n: number, moneda: string) =>
    `${n.toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda}`;

const colorDiferencia = (estado: EstadoDiferencia) =>
    estado === 'cuadrado' ? 'success.main' : estado === 'sobrante' ? 'warning.main' : 'error.main';

const estadoDe = (diferencia: number): EstadoDiferencia =>
    Math.abs(diferencia) < 0.01 ? 'cuadrado' : diferencia > 0 ? 'sobrante' : 'faltante';

const etiquetaEstado: Record<EstadoDiferencia, string> = {
    cuadrado: 'Cuadrado',
    sobrante: 'Sobrante',
    faltante: 'Faltante',
};

const etiquetaTurno = (t: TurnoCaja) =>
    `${new Date(t.fechaApertura).toLocaleString('es-CU')} · ${t.cajeroNombre ?? 'Cajero'} · ${
        t.estado === 'abierto' ? 'abierto' : 'cerrado'
    }`;

/** Arqueo formal SC-3-06: comprobación del efectivo, separada del cuadre operativo. */
export default function ArqueoCajaTab() {
    const notify = useNotify();
    const rol = useMemo(() => payloadSesionActual()?.rol, []);
    const autorizado = !!rol && ROLES_ARQUEO.includes(rol);

    const [turnos, setTurnos] = useState<TurnoCaja[]>([]);
    const [arqueos, setArqueos] = useState<ArqueoCaja[]>([]);
    const [turnoId, setTurnoId] = useState('');
    const [esperado, setEsperado] = useState<Record<string, number>>({});
    const [contados, setContados] = useState<Record<string, string>>({});
    const [responsableArqueo, setResponsableArqueo] = useState('');
    const [responsableCustodia, setResponsableCustodia] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [firmadoPor, setFirmadoPor] = useState('');
    const [cargando, setCargando] = useState(true);
    const [cargandoEsperado, setCargandoEsperado] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [refresco, setRefresco] = useState(0);
    const [ultimo, setUltimo] = useState<ArqueoCaja | null>(null);

    // Turnos y arqueos; se recargan cuando se abre o cierra un turno.
    useEffect(() => {
        const alCambiarTurno = () => setRefresco((r) => r + 1);
        window.addEventListener(EVENTO_TURNO_CAJA, alCambiarTurno);
        return () => window.removeEventListener(EVENTO_TURNO_CAJA, alCambiarTurno);
    }, []);

    useEffect(() => {
        if (!autorizado) return;
        let activo = true;
        Promise.all([listarTurnosCaja(), listarArqueos()])
            .then(([t, a]) => {
                if (!activo) return;
                setTurnos(t);
                setArqueos(a);
            })
            .catch((e: unknown) => {
                if (activo) notify.error(getErrorMessage(e, 'No se pudieron cargar los turnos y arqueos.'));
            })
            .finally(() => {
                if (activo) setCargando(false);
            });
        return () => {
            activo = false;
        };
    }, [autorizado, refresco, notify]);

    const turno = turnos.find((t) => t._id === turnoId);
    const yaArqueado = arqueos.some((a) => a.turnoCajaId === turnoId);

    const elegirTurno = (id: string) => {
        setTurnoId(id);
        setEsperado({});
        setContados({});
        if (!id) return;
        setCargandoEsperado(true);
        obtenerEsperadoDelTurno(id)
            .then((r) => {
                setEsperado(r.efectivoEsperado);
                setContados(Object.fromEntries(Object.keys(r.efectivoEsperado).map((m) => [m, ''])));
            })
            .catch((e: unknown) => notify.error(getErrorMessage(e, 'No se pudo calcular el efectivo esperado.')))
            .finally(() => setCargandoEsperado(false));
    };

    const monedas = Object.keys(esperado);
    const mismoQueCajero =
        !!turno?.cajeroNombre &&
        responsableArqueo.trim().toLocaleLowerCase('es') === turno.cajeroNombre.trim().toLocaleLowerCase('es');

    const faltaDato =
        !turnoId ||
        !responsableArqueo.trim() ||
        !responsableCustodia.trim() ||
        !observaciones.trim() ||
        !firmadoPor.trim() ||
        monedas.some((m) => contados[m] === '' || !Number.isFinite(Number(contados[m])) || Number(contados[m]) < 0);

    const guardar = async () => {
        setGuardando(true);
        try {
            const creado = await crearArqueo({
                turnoCajaId: turnoId,
                responsableArqueo: responsableArqueo.trim(),
                responsableCustodia: responsableCustodia.trim(),
                efectivoContado: Object.fromEntries(monedas.map((m) => [m, { contado: Number(contados[m]) }])),
                observaciones: observaciones.trim(),
                firmadoPor: firmadoPor.trim(),
            });
            setUltimo(creado);
            notify.success('Arqueo registrado.');
            if (creado.mismoResponsableQueCajero)
                notify.warning('Quien cuenta es el mismo cajero del turno; la norma puede exigir otra persona.');
            elegirTurno('');
            setObservaciones('');
            setRefresco((r) => r + 1);
        } catch (e) {
            notify.error(getErrorMessage(e, 'No se pudo registrar el arqueo.'));
        } finally {
            setGuardando(false);
        }
    };

    if (!autorizado)
        return (
            <Alert severity="info" sx={{ m: 1 }}>
                El arqueo de caja (SC-3-06) lo registran los roles administrador, económico y gerente.
            </Alert>
        );

    return (
        <Box sx={{ m: 1, display: 'grid', gap: 2 }}>
            <Card elevation={0} sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3 }}>
                <CardContent sx={{ p: 3, display: 'grid', gap: 2 }}>
                    <Box>
                        <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 700, display: 'flex', gap: 1 }}>
                            <FactCheckIcon />
                            Arqueo de caja (SC-3-06)
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Comprobación formal del efectivo de un turno. El efectivo esperado, el contado y la
                            diferencia se controlan por moneda; nunca se suman monedas distintas.
                        </Typography>
                    </Box>

                    <TextField
                        select
                        size="small"
                        label="Turno de caja"
                        value={turnoId}
                        onChange={(e) => elegirTurno(e.target.value)}
                        disabled={cargando || guardando}
                        sx={inputSx}
                    >
                        <MenuItem value="">Seleccione un turno</MenuItem>
                        {turnos.map((t) => (
                            <MenuItem key={t._id} value={t._id} disabled={arqueos.some((a) => a.turnoCajaId === t._id)}>
                                {etiquetaTurno(t)}
                                {arqueos.some((a) => a.turnoCajaId === t._id) ? ' (ya arqueado)' : ''}
                            </MenuItem>
                        ))}
                    </TextField>

                    {yaArqueado && <Alert severity="info">Este turno ya tiene un arqueo registrado.</Alert>}

                    {turnoId && (
                        <>
                            {cargandoEsperado ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                    <CircularProgress size={24} />
                                </Box>
                            ) : (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Moneda</TableCell>
                                                <TableCell align="right">Efectivo esperado</TableCell>
                                                <TableCell align="right">Efectivo contado</TableCell>
                                                <TableCell align="right">Diferencia</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {monedas.map((m) => {
                                                const contado = Number(contados[m]);
                                                const hayContado = contados[m] !== '' && Number.isFinite(contado);
                                                const dif = redondear(contado - esperado[m]);
                                                return (
                                                    <TableRow key={m}>
                                                        <TableCell sx={{ fontWeight: 700 }}>{m}</TableCell>
                                                        <TableCell align="right">{monto(esperado[m], m)}</TableCell>
                                                        <TableCell align="right" sx={{ width: 180 }}>
                                                            <TextField
                                                                size="small"
                                                                type="number"
                                                                value={contados[m] ?? ''}
                                                                onChange={(e) =>
                                                                    setContados((p) => ({ ...p, [m]: e.target.value }))
                                                                }
                                                                disabled={guardando || yaArqueado}
                                                                slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                                                                sx={inputSx}
                                                            />
                                                        </TableCell>
                                                        <TableCell
                                                            align="right"
                                                            sx={{
                                                                fontWeight: 700,
                                                                color: hayContado ? colorDiferencia(estadoDe(dif)) : undefined,
                                                            }}
                                                        >
                                                            {hayContado
                                                                ? `${monto(dif, m)} · ${etiquetaEstado[estadoDe(dif)]}`
                                                                : '—'}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}

                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                                <TextField
                                    size="small"
                                    label="Responsable del arqueo (quien cuenta)"
                                    value={responsableArqueo}
                                    onChange={(e) => setResponsableArqueo(e.target.value)}
                                    disabled={guardando || yaArqueado}
                                    sx={inputSx}
                                />
                                <TextField
                                    size="small"
                                    label="Responsable de custodia (jefe de caja)"
                                    value={responsableCustodia}
                                    onChange={(e) => setResponsableCustodia(e.target.value)}
                                    disabled={guardando || yaArqueado}
                                    sx={inputSx}
                                />
                            </Box>
                            {mismoQueCajero && (
                                <Alert severity="warning">
                                    Quien cuenta es el mismo cajero del turno ({turno?.cajeroNombre}). Se puede
                                    registrar, pero el documento quedará marcado; la norma puede exigir otra persona.
                                </Alert>
                            )}
                            <TextField
                                size="small"
                                label="Observaciones"
                                multiline
                                minRows={2}
                                value={observaciones}
                                onChange={(e) => setObservaciones(e.target.value)}
                                disabled={guardando || yaArqueado}
                                sx={inputSx}
                            />
                            <TextField
                                size="small"
                                label="Firmado por"
                                value={firmadoPor}
                                onChange={(e) => setFirmadoPor(e.target.value)}
                                disabled={guardando || yaArqueado}
                                sx={inputSx}
                            />
                            <Box>
                                <Button
                                    variant="contained"
                                    startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                                    onClick={() => void guardar()}
                                    disabled={guardando || faltaDato || yaArqueado || cargandoEsperado}
                                >
                                    Registrar arqueo
                                </Button>
                            </Box>
                        </>
                    )}

                    {ultimo?.mismoResponsableQueCajero && (
                        <Alert severity="warning">
                            El último arqueo registrado fue contado por el mismo cajero del turno.
                        </Alert>
                    )}
                </CardContent>
            </Card>

            <Card elevation={0} sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3 }}>
                <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                        Arqueos registrados
                    </Typography>
                    {cargando ? (
                        <CircularProgress size={24} />
                    ) : arqueos.length === 0 ? (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Todavía no hay arqueos.
                        </Typography>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Fecha</TableCell>
                                        <TableCell>Cuenta</TableCell>
                                        <TableCell>Custodia</TableCell>
                                        <TableCell>Diferencia por moneda</TableCell>
                                        <TableCell>Firmado por</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {arqueos.map((a) => (
                                        <TableRow key={a._id}>
                                            <TableCell>
                                                {a.createdAt ? new Date(a.createdAt).toLocaleString('es-CU') : '—'}
                                            </TableCell>
                                            <TableCell>
                                                {a.responsableArqueo}
                                                {a.mismoResponsableQueCajero && (
                                                    <Chip size="small" color="warning" label="= cajero" sx={{ ml: 1 }} />
                                                )}
                                            </TableCell>
                                            <TableCell>{a.responsableCustodia}</TableCell>
                                            <TableCell>
                                                {Object.entries(a.diferencia).map(([m, d]) => (
                                                    <Typography
                                                        key={m}
                                                        variant="body2"
                                                        sx={{ color: colorDiferencia(d.estado), fontWeight: 600 }}
                                                    >
                                                        {monto(d.monto, m)} · {etiquetaEstado[d.estado]}
                                                    </Typography>
                                                ))}
                                            </TableCell>
                                            <TableCell>{a.firmadoPor}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}
