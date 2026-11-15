import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    IconButton,
    MenuItem,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useNotify } from '../notificaciones/useNotify';
import { useAuth } from '../../context/authContext';
import { getErrorMessage } from '../../utils/errorMessage';
import { mensajeSinPermiso, puedeEditarNomencladoresPago } from '../../utils/permisos';
import {
    denominacionApi,
    ETIQUETA_TIPO_DENOMINACION,
    type Denominacion,
    type TipoDenominacion,
} from '../../service/denominacionApi';
import { monedaApi } from '../../service/tasaApi';

const tarjetaSx = { borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'background.paper', mb: 2 };
const tituloSx = { color: 'primary.main', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 };
const celdaSx = { borderColor: 'divider', color: 'text.primary' };
const cabeceraSx = { borderColor: 'divider', color: 'text.secondary', fontWeight: 600 };

const mensajeDe = (error: unknown, fallback: string): string => mensajeSinPermiso(getErrorMessage(error, fallback));

const aNumero = (texto: string): number => Number(texto.trim().replace(',', '.'));

/**
 * El servidor acepta de 0,01 a 1.000.000 con hasta 2 decimales. Se escribe sin separador de miles:
 * "1.000" se rechaza (Number lo leería como 1, no como mil).
 */
const valorValido = (texto: string): boolean => {
    if (!/^\d+([.,]\d{1,2})?$/.test(texto.trim())) return false;
    const n = aNumero(texto.trim());
    return Number.isFinite(n) && n >= 0.01 && n <= 1_000_000 && Math.round(n * 100) / 100 === n;
};

const formatearValor = (valor: number): string =>
    valor.toLocaleString('es-CU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

interface DialogProps {
    /** Denominación que se edita, o `null` para crear una nueva. */
    denominacion: Denominacion | null;
    monedas: string[];
    /** Moneda preseleccionada al crear. */
    monedaInicial: string;
    onClose: () => void;
    onGuardado: () => Promise<void>;
}

function DenominacionDialog({ denominacion, monedas, monedaInicial, onClose, onGuardado }: DialogProps) {
    const notify = useNotify();
    const [moneda, setMoneda] = useState(denominacion?.moneda ?? monedaInicial);
    const [valor, setValor] = useState(denominacion ? String(denominacion.valor) : '');
    const [tipo, setTipo] = useState<TipoDenominacion>(denominacion?.tipo ?? 'billete');
    const [activa, setActiva] = useState(denominacion?.activa ?? true);
    const [intento, setIntento] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hayError = !moneda || !valorValido(valor);

    const guardar = async () => {
        setIntento(true);
        if (hayError) return;
        setGuardando(true);
        setError(null);
        try {
            const datos = { moneda, valor: aNumero(valor), tipo, activa };
            if (denominacion) await denominacionApi.actualizar(denominacion._id, datos);
            else await denominacionApi.crear(datos);
            notify.success(denominacion ? 'Denominación actualizada' : 'Denominación creada');
            await onGuardado();
            onClose();
        } catch (e) {
            setError(mensajeDe(e, 'No se pudo guardar la denominación'));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Dialog open onClose={guardando ? undefined : onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{denominacion ? 'Editar denominación' : 'Nueva denominación'}</DialogTitle>
            <DialogContent sx={{ display: 'grid', gap: 2, pt: '16px !important' }}>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField
                    select
                    size="small"
                    label="Moneda *"
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value)}
                    disabled={guardando || !!denominacion}
                    error={intento && !moneda}
                >
                    {monedas.map((m) => (
                        <MenuItem key={m} value={m}>
                            {m}
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    size="small"
                    label="Valor *"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    disabled={guardando}
                    error={intento && !valorValido(valor)}
                    helperText="Entre 0,01 y 1000000, sin separador de miles y con hasta 2 decimales"
                    slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                />
                <TextField
                    select
                    size="small"
                    label="Tipo"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as TipoDenominacion)}
                    disabled={guardando}
                >
                    <MenuItem value="billete">{ETIQUETA_TIPO_DENOMINACION.billete}</MenuItem>
                    <MenuItem value="moneda">{ETIQUETA_TIPO_DENOMINACION.moneda}</MenuItem>
                </TextField>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Switch checked={activa} onChange={(e) => setActiva(e.target.checked)} disabled={guardando} />
                    <Typography variant="body2">Activa (se ofrece en los cobros nuevos)</Typography>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} disabled={guardando}>
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    onClick={() => void guardar()}
                    disabled={guardando}
                    startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    Guardar
                </Button>
            </DialogActions>
        </Dialog>
    );
}

/** Nomenclador de billetes y monedas por divisa: lista por moneda, alta, edición y (des)activación. */
export default function ConfiguracionDenominacionesTab(): React.JSX.Element {
    const notify = useNotify();
    const { usuario } = useAuth();
    const puedeEditar = puedeEditarNomencladoresPago(usuario?.rol);

    const [cargando, setCargando] = useState(true);
    const [errorCarga, setErrorCarga] = useState<string | null>(null);
    const [denominaciones, setDenominaciones] = useState<Denominacion[]>([]);
    const [codigosMoneda, setCodigosMoneda] = useState<string[]>([]);
    const [monedaFiltro, setMonedaFiltro] = useState('');
    const [editando, setEditando] = useState<Denominacion | null | undefined>(undefined);
    const [cambiandoId, setCambiandoId] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        try {
            const [datos, monedas] = await Promise.all([
                denominacionApi.listar(),
                // El listado de monedas es solo ayuda para el selector: si falla se usan las que ya tienen denominaciones.
                monedaApi.getAll().catch(() => []),
            ]);
            setDenominaciones(datos);
            setCodigosMoneda(monedas.map((m) => m.tipo_moneda.trim().toUpperCase()).filter(Boolean));
            setErrorCarga(null);
        } catch (e) {
            setErrorCarga(mensajeDe(e, 'No se pudieron cargar las denominaciones'));
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        // Se difiere a una microtarea para no actualizar el estado de forma síncrona dentro del efecto.
        void Promise.resolve().then(cargar);
    }, [cargar]);

    const monedas = useMemo(
        () =>
            Array.from(new Set([...denominaciones.map((d) => d.moneda), ...codigosMoneda])).sort((a, b) =>
                a.localeCompare(b, 'es'),
            ),
        [denominaciones, codigosMoneda],
    );

    const visibles = useMemo(
        () =>
            denominaciones
                .filter((d) => !monedaFiltro || d.moneda === monedaFiltro)
                .sort((a, b) => a.moneda.localeCompare(b.moneda, 'es') || b.valor - a.valor),
        [denominaciones, monedaFiltro],
    );

    const alternarActiva = async (d: Denominacion) => {
        setCambiandoId(d._id);
        try {
            await denominacionApi.actualizar(d._id, { activa: !d.activa });
            notify.success(
                d.activa
                    ? `${formatearValor(d.valor)} ${d.moneda} desactivada`
                    : `${formatearValor(d.valor)} ${d.moneda} activada`,
            );
            await cargar();
        } catch (e) {
            notify.error(mensajeDe(e, 'No se pudo cambiar el estado de la denominación'));
        } finally {
            setCambiandoId(null);
        }
    };

    if (cargando) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ m: 1 }}>
            <Card sx={tarjetaSx}>
                <CardContent>
                    <Typography variant="h6" sx={tituloSx}>
                        <PaymentsIcon /> Denominaciones por moneda
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, mb: 2 }}>
                        Billetes y monedas que se ofrecen y se aceptan al cobrar en efectivo. Desactivar una
                        denominación no cambia los pagos anteriores.
                    </Typography>
                    {errorCarga && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {errorCarga}
                        </Alert>
                    )}
                    {!puedeEditar && (
                        <Typography variant="body2" sx={{ color: 'warning.main', mb: 2 }}>
                            Solo administrador y gerente pueden modificar las denominaciones.
                        </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <TextField
                            select
                            size="small"
                            label="Moneda"
                            value={monedaFiltro}
                            onChange={(e) => setMonedaFiltro(e.target.value)}
                            sx={{ minWidth: 180 }}
                        >
                            <MenuItem value="">Todas</MenuItem>
                            {monedas.map((m) => (
                                <MenuItem key={m} value={m}>
                                    {m}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            disabled={!puedeEditar}
                            onClick={() => setEditando(null)}
                        >
                            Nueva denominación
                        </Button>
                    </Box>

                    <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ mt: 2 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={cabeceraSx}>Moneda</TableCell>
                                    <TableCell sx={cabeceraSx} align="right">
                                        Valor
                                    </TableCell>
                                    <TableCell sx={cabeceraSx}>Tipo</TableCell>
                                    <TableCell sx={cabeceraSx} align="center">
                                        Activa
                                    </TableCell>
                                    <TableCell sx={cabeceraSx} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {visibles.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} sx={{ ...celdaSx, color: 'text.secondary' }}>
                                            Sin denominaciones.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {visibles.map((d) => (
                                    <TableRow key={d._id}>
                                        <TableCell sx={celdaSx}>{d.moneda}</TableCell>
                                        <TableCell sx={celdaSx} align="right">
                                            {formatearValor(d.valor)}
                                        </TableCell>
                                        <TableCell sx={celdaSx}>
                                            <Chip
                                                size="small"
                                                variant="outlined"
                                                label={ETIQUETA_TIPO_DENOMINACION[d.tipo] ?? d.tipo}
                                            />
                                        </TableCell>
                                        <TableCell sx={celdaSx} align="center">
                                            <Switch
                                                checked={d.activa}
                                                onChange={() => void alternarActiva(d)}
                                                disabled={!puedeEditar || cambiandoId === d._id}
                                            />
                                        </TableCell>
                                        <TableCell sx={celdaSx} align="right">
                                            <Tooltip title="Editar denominación">
                                                <span>
                                                    <IconButton disabled={!puedeEditar} onClick={() => setEditando(d)}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                </CardContent>
            </Card>

            {editando !== undefined && (
                <DenominacionDialog
                    denominacion={editando}
                    monedas={monedas}
                    monedaInicial={monedaFiltro}
                    onClose={() => setEditando(undefined)}
                    onGuardado={cargar}
                />
            )}
        </Box>
    );
}
