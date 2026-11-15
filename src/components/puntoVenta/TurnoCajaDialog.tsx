import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    TextField,
    Typography,
} from '@mui/material';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockClockIcon from '@mui/icons-material/LockClock';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNotify } from '../notificaciones/useNotify';
import { useAuth } from '../../context/authContext';
import { puedeGestionarTurnoCaja } from '../../utils/permisos';
import { getErrorMessage } from '../../utils/errorMessage';
import { monedaApi } from '../../service/tasaApi';
import {
    abrirTurnoCaja,
    cerrarTurnoCaja,
    EVENTO_TURNO_CAJA,
    formatearPorMoneda,
    obtenerTurnoAbierto,
    type MontosPorMoneda,
    type TurnoCaja,
} from '../../service/turnoCajaApi';
import {
    botonCancelarSx,
    botonGuardarSx,
    inputSx,
    paperSx,
    tituloSx,
    tituloTextoSx,
} from '../inventario/dialogEstilos';

const MONEDA_POR_DEFECTO = 'CUP';

interface FilaFondo {
    moneda: string;
    monto: string;
}

interface DialogProps {
    open: boolean;
    onClose: () => void;
    /** Turno abierto del usuario; `null` si no tiene ninguno. */
    turno: TurnoCaja | null;
    /** Se llama con el turno resultante (nuevo turno abierto o `null` tras cerrar). */
    onCambio: (turno: TurnoCaja | null) => void;
}

/** Diálogo para abrir el turno (fondo inicial por moneda) o cerrarlo. */
export function TurnoCajaDialog({ open, onClose, turno, onCambio }: DialogProps) {
    // El contenido se monta solo con el diálogo abierto: cada apertura empieza con el formulario limpio.
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: paperSx } }}>
            {open && <ContenidoTurno onClose={onClose} turno={turno} onCambio={onCambio} />}
        </Dialog>
    );
}

type ContenidoProps = Omit<DialogProps, 'open'>;

function ContenidoTurno({ onClose, turno, onCambio }: ContenidoProps) {
    const notify = useNotify();
    const [monedas, setMonedas] = useState<string[]>([MONEDA_POR_DEFECTO]);
    const [filas, setFilas] = useState<FilaFondo[]>([{ moneda: MONEDA_POR_DEFECTO, monto: '' }]);
    const [observaciones, setObservaciones] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (turno) return;
        let activo = true;
        monedaApi
            .getAll()
            .then((lista) => {
                const codigos = lista.map((m) => m.tipo_moneda).filter(Boolean);
                if (activo && codigos.length > 0) setMonedas(Array.from(new Set([MONEDA_POR_DEFECTO, ...codigos])));
            })
            .catch(() => {
                // Sin nomenclador de monedas se puede abrir el turno en CUP.
            });
        return () => {
            activo = false;
        };
    }, [turno]);

    const cambiarFila = (i: number, cambio: Partial<FilaFondo>) =>
        setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...cambio } : f)));

    const monedasLibres = (actual: string) => monedas.filter((m) => m === actual || !filas.some((f) => f.moneda === m));

    const abrir = async () => {
        const fondoInicial: MontosPorMoneda = {};
        for (const f of filas) {
            const monto = f.monto === '' ? 0 : Number(f.monto);
            if (!Number.isFinite(monto) || monto < 0) {
                setError(`El fondo inicial de ${f.moneda} debe ser un número mayor o igual que cero.`);
                return;
            }
            if (f.moneda in fondoInicial) {
                setError(`La moneda ${f.moneda} está repetida.`);
                return;
            }
            fondoInicial[f.moneda] = monto;
        }
        setGuardando(true);
        setError(null);
        try {
            const nuevo = await abrirTurnoCaja({ fondoInicial });
            notify.success('Turno abierto.');
            onCambio(nuevo);
            onClose();
        } catch (e) {
            setError(getErrorMessage(e, 'No se pudo abrir el turno.'));
        } finally {
            setGuardando(false);
        }
    };

    const cerrar = async () => {
        if (!turno) return;
        setGuardando(true);
        setError(null);
        try {
            await cerrarTurnoCaja(turno._id, observaciones.trim() || undefined);
            notify.success('Turno cerrado. Registre el arqueo y el depósito del efectivo.');
            onCambio(null);
            onClose();
        } catch (e) {
            setError(getErrorMessage(e, 'No se pudo cerrar el turno.'));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <>
            <DialogTitle sx={tituloSx}>
                <Typography component="span" sx={tituloTextoSx}>
                    {turno ? <LockClockIcon /> : <LockOpenIcon />}
                    {turno ? 'Cerrar turno de caja' : 'Abrir turno de caja'}
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ pt: 3, display: 'grid', gap: 2 }}>
                {turno ? (
                    <>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Turno abierto el {new Date(turno.fechaApertura).toLocaleString('es-CU')}
                            {turno.cajeroNombre ? ` por ${turno.cajeroNombre}` : ''}.
                        </Typography>
                        <Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                Fondo inicial
                            </Typography>
                            <Typography sx={{ fontWeight: 700 }}>{formatearPorMoneda(turno.fondoInicial)}</Typography>
                        </Box>
                        <TextField
                            label="Observaciones del cierre"
                            size="small"
                            multiline
                            minRows={2}
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            disabled={guardando}
                            sx={inputSx}
                        />
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Al cerrar, el cuadre se compara contra el efectivo esperado del turno y el arqueo formal
                            (SC-3-06) se registra desde Cuadre de Caja.
                        </Typography>
                    </>
                ) : (
                    <>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Indique el fondo inicial de cada moneda con la que abre la caja. Cada moneda se controla
                            por separado.
                        </Typography>
                        {filas.map((f, i) => (
                            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '110px 1fr auto', gap: 1 }}>
                                <TextField
                                    select
                                    size="small"
                                    label="Moneda"
                                    value={f.moneda}
                                    onChange={(e) => cambiarFila(i, { moneda: e.target.value })}
                                    disabled={guardando}
                                    sx={inputSx}
                                >
                                    {monedasLibres(f.moneda).map((m) => (
                                        <MenuItem key={m} value={m}>
                                            {m}
                                        </MenuItem>
                                    ))}
                                </TextField>
                                <TextField
                                    size="small"
                                    type="number"
                                    label="Fondo inicial"
                                    value={f.monto}
                                    onChange={(e) => cambiarFila(i, { monto: e.target.value })}
                                    disabled={guardando}
                                    slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                                    sx={inputSx}
                                />
                                <IconButton
                                    aria-label="Quitar moneda"
                                    onClick={() => setFilas((prev) => prev.filter((_, idx) => idx !== i))}
                                    disabled={guardando || filas.length === 1}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        ))}
                        <Box>
                            <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() =>
                                    setFilas((prev) => {
                                        const libre = monedas.find((m) => !prev.some((f) => f.moneda === m));
                                        return libre ? [...prev, { moneda: libre, monto: '' }] : prev;
                                    })
                                }
                                disabled={guardando || filas.length >= monedas.length}
                            >
                                Agregar otra moneda
                            </Button>
                        </Box>
                    </>
                )}
                {error && (
                    <Typography variant="body2" sx={{ color: 'error.main' }} role="alert">
                        {error}
                    </Typography>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, gap: 1 }}>
                <Button variant="contained" onClick={onClose} disabled={guardando} sx={botonCancelarSx}>
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    onClick={() => void (turno ? cerrar() : abrir())}
                    disabled={guardando}
                    startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : undefined}
                    sx={botonGuardarSx}
                >
                    {turno ? 'Cerrar turno' : 'Abrir turno'}
                </Button>
            </DialogActions>
        </>
    );
}

/**
 * Botón de la cabecera del Punto de Venta: muestra el estado del turno del
 * cajero y abre el diálogo para abrirlo o cerrarlo.
 */
export default function TurnoCajaBoton() {
    const notify = useNotify();
    const { usuario } = useAuth();
    // El servidor solo deja abrir y cerrar turno al cajero y al administrador.
    const puedeGestionar = puedeGestionarTurnoCaja(usuario?.rol);
    const [turno, setTurno] = useState<TurnoCaja | null>(null);
    const [cargando, setCargando] = useState(true);
    const [abierto, setAbierto] = useState(false);

    useEffect(() => {
        let activo = true;
        obtenerTurnoAbierto()
            .then((t) => {
                if (activo) setTurno(t);
            })
            .catch((e: unknown) => {
                if (activo) notify.error(getErrorMessage(e, 'No se pudo consultar el turno de caja.'));
            })
            .finally(() => {
                if (activo) setCargando(false);
            });
        return () => {
            activo = false;
        };
    }, [notify]);

    const alCambiar = useCallback((nuevo: TurnoCaja | null) => {
        setTurno(nuevo);
        window.dispatchEvent(new Event(EVENTO_TURNO_CAJA));
    }, []);

    const etiqueta = useMemo(
        () => (turno ? `Turno abierto · fondo ${formatearPorMoneda(turno.fondoInicial)}` : 'Sin turno abierto'),
        [turno],
    );

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {!cargando && (
                <Chip
                    size="small"
                    label={etiqueta}
                    color={turno ? 'primary' : 'default'}
                    variant="outlined"
                />
            )}
            {puedeGestionar && (
                <>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={turno ? <LockClockIcon /> : <LockOpenIcon />}
                        onClick={() => setAbierto(true)}
                        disabled={cargando}
                    >
                        {turno ? 'Cerrar turno' : 'Abrir turno'}
                    </Button>
                    <TurnoCajaDialog
                        open={abierto}
                        onClose={() => setAbierto(false)}
                        turno={turno}
                        onCambio={alCambiar}
                    />
                </>
            )}
        </Box>
    );
}
