import React, { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    IconButton,
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
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import GavelIcon from '@mui/icons-material/Gavel';
import { useNotify } from '../notificaciones/useNotify';
import { useAuth } from '../../context/authContext';
import { getErrorMessage } from '../../utils/errorMessage';
import { fechaHoyLocal } from '../../service/httpClient';
import {
    tributariaApi,
    type BonificacionTributaria,
    type ConfiguracionTributaria,
} from '../../service/tributariaApi';

/** Roles con permiso de escritura (espejo de ConfiguracionTributariaController). */
const ROLES_ESCRITURA = ['administrador', 'gerente', 'economico'];

/** Fila de bonificación mientras se edita: los números se mantienen como texto. */
interface FilaBonificacion {
    programa: string;
    sector: string;
    impuestoVentasPct: string;
    activa: boolean;
}

const FILA_VACIA: FilaBonificacion = { programa: '', sector: '', impuestoVentasPct: '', activa: true };

const esPorcentaje = (valor: string): boolean => {
    if (!valor.trim()) return false;
    const n = Number(valor.replace(',', '.'));
    return Number.isFinite(n) && n >= 0 && n <= 100;
};

const aNumero = (valor: string): number => Number(valor.replace(',', '.'));

const formatearFecha = (iso: string): string => {
    const fecha = new Date(iso);
    return Number.isNaN(fecha.getTime()) ? iso : fecha.toLocaleDateString('es');
};

const aFila = (b: BonificacionTributaria): FilaBonificacion => ({
    programa: b.programa,
    sector: b.sector ?? '',
    impuestoVentasPct: String(b.impuestoVentasPct),
    activa: b.activa,
});

const tarjetaSx = { borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'background.paper', mb: 2 };
const tituloSx = { color: 'primary.main', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 };
const celdaSx = { borderColor: 'divider', color: 'text.primary' };
const cabeceraSx = { borderColor: 'divider', color: 'text.secondary', fontWeight: 600 };

export default function ConfiguracionTributariaTab(): React.JSX.Element {
    const notify = useNotify();
    const { usuario } = useAuth();
    const puedeEditar = !!usuario && ROLES_ESCRITURA.includes(usuario.rol);

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [activa, setActiva] = useState<ConfiguracionTributaria | null>(null);
    const [historial, setHistorial] = useState<ConfiguracionTributaria[]>([]);

    const [impuesto, setImpuesto] = useState('');
    const [vigenteDesde, setVigenteDesde] = useState(fechaHoyLocal());
    const [bonificaciones, setBonificaciones] = useState<FilaBonificacion[]>([]);
    const [intentoGuardar, setIntentoGuardar] = useState(false);

    const cargar = useCallback(async () => {
        try {
            const [vigente, anteriores] = await Promise.all([
                tributariaApi.obtenerActiva(),
                tributariaApi.historial(),
            ]);
            setActiva(vigente);
            setHistorial(anteriores);
            if (vigente) {
                setImpuesto(String(vigente.impuestoVentasPct));
                setBonificaciones((vigente.bonificaciones ?? []).map(aFila));
            }
        } catch (error) {
            notify.error(getErrorMessage(error, 'No se pudo cargar la configuración tributaria'));
        } finally {
            setCargando(false);
        }
    }, [notify]);

    useEffect(() => {
        // Se difiere a una microtarea para no actualizar el estado de forma síncrona dentro del efecto.
        void Promise.resolve().then(cargar);
    }, [cargar]);

    const cambiarFila = (indice: number, cambios: Partial<FilaBonificacion>) =>
        setBonificaciones((prev) => prev.map((f, i) => (i === indice ? { ...f, ...cambios } : f)));

    const filaInvalida = (f: FilaBonificacion): boolean => !f.programa.trim() || !esPorcentaje(f.impuestoVentasPct);

    const impuestoInvalido = !esPorcentaje(impuesto);
    const hayError = impuestoInvalido || !vigenteDesde || bonificaciones.some(filaInvalida);

    const guardar = async () => {
        setIntentoGuardar(true);
        if (hayError) {
            notify.error('Revise los campos marcados: los porcentajes deben estar entre 0 y 100');
            return;
        }
        setGuardando(true);
        try {
            await tributariaApi.guardar({
                impuestoVentasPct: aNumero(impuesto),
                vigenteDesde,
                bonificaciones: bonificaciones.map((f) => ({
                    programa: f.programa.trim(),
                    ...(f.sector.trim() ? { sector: f.sector.trim() } : {}),
                    impuestoVentasPct: aNumero(f.impuestoVentasPct),
                    activa: f.activa,
                })),
            });
            notify.success('Configuración tributaria guardada');
            setIntentoGuardar(false);
            await cargar();
        } catch (error) {
            notify.error(getErrorMessage(error, 'No se pudo guardar la configuración tributaria'));
        } finally {
            setGuardando(false);
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
                        <GavelIcon /> Configuración tributaria
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, mb: 2 }}>
                        {activa
                            ? `Vigente desde ${formatearFecha(activa.vigenteDesde)}: ${activa.impuestoVentasPct} % de impuesto sobre ventas.`
                            : 'Sin configurar: todavía no se definió el impuesto sobre ventas.'}
                    </Typography>
                    {!puedeEditar && (
                        <Typography variant="body2" sx={{ color: 'warning.main', mb: 2 }}>
                            Solo administrador, gerente y económico pueden modificar esta configuración.
                        </Typography>
                    )}

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, maxWidth: 640 }}>
                        <TextField
                            size="small"
                            label="Impuesto sobre ventas (%) *"
                            value={impuesto}
                            onChange={(e) => setImpuesto(e.target.value)}
                            disabled={!puedeEditar || guardando}
                            error={intentoGuardar && impuestoInvalido}
                            helperText={intentoGuardar && impuestoInvalido ? 'Ingrese un valor entre 0 y 100' : undefined}
                            slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                        />
                        <TextField
                            size="small"
                            type="date"
                            label="Vigente desde *"
                            value={vigenteDesde}
                            onChange={(e) => setVigenteDesde(e.target.value)}
                            disabled={!puedeEditar || guardando}
                            error={intentoGuardar && !vigenteDesde}
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                    </Box>

                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 0.5 }}>
                        Bonificaciones por programa o sector
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Porcentaje del impuesto sobre ventas que se aplica con cada bonificación (Res. 161/2026).
                    </Typography>

                    <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ mt: 1 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={cabeceraSx}>Programa *</TableCell>
                                    <TableCell sx={cabeceraSx}>Sector</TableCell>
                                    <TableCell sx={cabeceraSx} align="right">Impuesto (%) *</TableCell>
                                    <TableCell sx={cabeceraSx} align="center">Activa</TableCell>
                                    <TableCell sx={cabeceraSx} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {bonificaciones.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} sx={{ ...celdaSx, color: 'text.secondary' }}>
                                            Sin bonificaciones.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {bonificaciones.map((fila, i) => (
                                    <TableRow key={i}>
                                        <TableCell sx={celdaSx}>
                                            <TextField
                                                size="small"
                                                fullWidth
                                                value={fila.programa}
                                                onChange={(e) => cambiarFila(i, { programa: e.target.value })}
                                                disabled={!puedeEditar || guardando}
                                                error={intentoGuardar && !fila.programa.trim()}
                                            />
                                        </TableCell>
                                        <TableCell sx={celdaSx}>
                                            <TextField
                                                size="small"
                                                fullWidth
                                                value={fila.sector}
                                                onChange={(e) => cambiarFila(i, { sector: e.target.value })}
                                                disabled={!puedeEditar || guardando}
                                            />
                                        </TableCell>
                                        <TableCell sx={celdaSx} align="right">
                                            <TextField
                                                size="small"
                                                value={fila.impuestoVentasPct}
                                                onChange={(e) => cambiarFila(i, { impuestoVentasPct: e.target.value })}
                                                disabled={!puedeEditar || guardando}
                                                error={intentoGuardar && !esPorcentaje(fila.impuestoVentasPct)}
                                                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                                                sx={{ width: 110 }}
                                            />
                                        </TableCell>
                                        <TableCell sx={celdaSx} align="center">
                                            <Switch
                                                checked={fila.activa}
                                                onChange={(e) => cambiarFila(i, { activa: e.target.checked })}
                                                disabled={!puedeEditar || guardando}
                                            />
                                        </TableCell>
                                        <TableCell sx={celdaSx} align="right">
                                            <Tooltip title="Quitar bonificación">
                                                <span>
                                                    <IconButton
                                                        color="error"
                                                        disabled={!puedeEditar || guardando}
                                                        onClick={() => setBonificaciones((prev) => prev.filter((_, j) => j !== i))}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5, mt: 2, flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            disabled={!puedeEditar || guardando}
                            onClick={() => setBonificaciones((prev) => [...prev, { ...FILA_VACIA }])}
                        >
                            Agregar bonificación
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={guardando ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                            disabled={!puedeEditar || guardando}
                            onClick={() => void guardar()}
                        >
                            Guardar configuración
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            <Card sx={tarjetaSx}>
                <CardContent>
                    <Typography variant="h6" sx={tituloSx}>Historial</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Cada guardado crea un registro nuevo; los anteriores se conservan para auditoría.
                    </Typography>
                    <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ mt: 1 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={cabeceraSx}>Vigente desde</TableCell>
                                    <TableCell sx={cabeceraSx} align="right">Impuesto (%)</TableCell>
                                    <TableCell sx={cabeceraSx}>Bonificaciones</TableCell>
                                    <TableCell sx={cabeceraSx}>Estado</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {historial.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} sx={{ ...celdaSx, color: 'text.secondary' }}>
                                            Todavía no hay configuraciones guardadas.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {historial.map((h) => (
                                    <TableRow key={h._id}>
                                        <TableCell sx={celdaSx}>{formatearFecha(h.vigenteDesde)}</TableCell>
                                        <TableCell sx={celdaSx} align="right">{h.impuestoVentasPct}</TableCell>
                                        <TableCell sx={celdaSx}>
                                            {(h.bonificaciones ?? []).length === 0
                                                ? '—'
                                                : h.bonificaciones
                                                      .map((b) => `${b.programa}${b.sector ? ` / ${b.sector}` : ''}: ${b.impuestoVentasPct} %`)
                                                      .join('; ')}
                                        </TableCell>
                                        <TableCell sx={celdaSx}>
                                            <Chip
                                                size="small"
                                                label={h.activa ? 'Vigente' : 'Anterior'}
                                                color={h.activa ? 'primary' : 'default'}
                                                variant={h.activa ? 'filled' : 'outlined'}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}
