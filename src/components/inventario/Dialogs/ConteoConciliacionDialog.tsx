import { useMemo, useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormHelperText,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { botonCancelarSx, botonGuardarSx, inputSx, paperSx, tituloSx, tituloTextoSx } from '../dialogEstilos';
import { useUbicaciones } from '../useUbicaciones';
import { ordenarUbicaciones, type FilaConciliacion, type UbicacionConteo } from '../../../service/existenciasApi';

interface Props {
    fila: FilaConciliacion;
    guardando: boolean;
    onCancelar: () => void;
    onConfirmar: (ubicaciones: UbicacionConteo[], observacion: string) => void;
}

/** Una ubicación del conteo. */
interface Linea {
    /** Identificador local, solo para las `key` de React. */
    clave: number;
    almacenId: string;
    contenedorId: string;
    cantidad: string;
    /** Ya existe en el producto: no se cambia ni se quita, solo se cuenta. */
    existente: boolean;
}

interface ErrorLinea {
    almacen?: string;
    contenedor?: string;
    cantidad?: string;
}

const redondear = (n: number): number => Number(n.toFixed(6));

function lineasIniciales(fila: FilaConciliacion): Linea[] {
    if (fila.ubicaciones.length > 0) {
        return ordenarUbicaciones(fila.ubicaciones).map((u, i) => ({
            clave: i,
            almacenId: u.almacenId,
            contenedorId: u.contenedorId,
            cantidad: String(u.cantidad),
            existente: true,
        }));
    }

    // Sin ubicaciones: se propone la del producto (si la tiene) con su stock.
    return [
        {
            clave: 0,
            almacenId: fila.ubicacionPorDefecto?.almacenId ?? '',
            contenedorId: fila.ubicacionPorDefecto?.contenedorId ?? '',
            cantidad: String(Math.max(0, fila.stockProducto)),
            existente: false,
        },
    ];
}

const idDe = (ref: string | { _id: string }): string => (typeof ref === 'string' ? ref : ref._id);

/**
 * Conteo físico de un producto que no concilia: se escribe la cantidad real
 * que hay en cada ubicación y el stock del producto pasa a ser la suma.
 * Se monta solo cuando hay un producto que contar.
 */
export default function ConteoConciliacionDialog({ fila, guardando, onCancelar, onConfirmar }: Props) {
    const { almacenes, contenedores, cargando } = useUbicaciones(true);

    const [lineas, setLineas] = useState<Linea[]>(() => lineasIniciales(fila));
    const [observacion, setObservacion] = useState('');
    const [intentado, setIntentado] = useState(false);

    const etiquetaExistente = (l: Linea): string => {
        const u = fila.ubicaciones.find((x) => x.almacenId === l.almacenId && x.contenedorId === l.contenedorId);
        return u ? `${u.almacenNombre} / ${u.contenedorNombre}` : '';
    };

    const actualizar = (clave: number, cambios: Partial<Linea>) =>
        setLineas((prev) => prev.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)));

    const agregar = () =>
        setLineas((prev) => [
            ...prev,
            {
                clave: prev.reduce((max, l) => Math.max(max, l.clave), -1) + 1,
                almacenId: '',
                contenedorId: '',
                cantidad: '',
                existente: false,
            },
        ]);

    const quitar = (clave: number) => setLineas((prev) => prev.filter((l) => l.clave !== clave));

    const errores = useMemo(() => {
        const porLinea = new Map<number, ErrorLinea>();
        const vistas = new Map<string, number>();

        for (const l of lineas) {
            const e: ErrorLinea = {};
            const n = Number(l.cantidad);

            if (!l.almacenId) e.almacen = 'Seleccione el almacén';
            if (!l.contenedorId) e.contenedor = 'Seleccione el contenedor';
            if (l.cantidad.trim() === '' || !Number.isFinite(n) || n < 0) {
                e.cantidad = 'Cantidad de 0 o más';
            }

            if (l.almacenId && l.contenedorId) {
                const clave = `${l.almacenId}|${l.contenedorId}`;
                if (vistas.has(clave)) {
                    e.contenedor = 'Ubicación repetida';
                    const primera = porLinea.get(vistas.get(clave)!) ?? {};
                    porLinea.set(vistas.get(clave)!, { ...primera, contenedor: 'Ubicación repetida' });
                } else {
                    vistas.set(clave, l.clave);
                }
            }

            porLinea.set(l.clave, { ...porLinea.get(l.clave), ...e });
        }

        const hayErrores = [...porLinea.values()].some((e) => Object.keys(e).length > 0);
        return { porLinea, hayErrores };
    }, [lineas]);

    const totalContado = redondear(lineas.reduce((suma, l) => suma + (Number(l.cantidad) || 0), 0));
    const cambioStock = redondear(totalContado - fila.stockProducto);

    const confirmar = () => {
        setIntentado(true);
        if (errores.hayErrores || lineas.length === 0) return;

        onConfirmar(
            lineas.map((l) => ({
                almacenId: l.almacenId,
                contenedorId: l.contenedorId,
                cantidad: Number(l.cantidad),
            })),
            observacion.trim(),
        );
    };

    return (
        <Dialog
            open
            onClose={() => {
                if (!guardando) onCancelar();
            }}
            maxWidth="md"
            fullWidth
            slotProps={{ paper: { sx: paperSx } }}
        >
            <DialogTitle sx={tituloSx}>
                <Typography variant="h6" component="span" sx={tituloTextoSx}>
                    <FactCheckIcon sx={{ color: '#00e5a0' }} />
                    Conteo físico por ubicación
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ pt: '20px !important', display: 'grid', gap: 2 }}>
                <Box>
                    <Typography sx={{ color: '#e8f5f0', fontWeight: 600 }}>
                        {fila.codigo} · {fila.nombre}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                        Escriba la cantidad real que hay en cada ubicación. El stock del producto pasará a ser la suma.
                        Queda registrado en el historial de conciliación (y en el Kardex si el stock cambia).
                    </Typography>
                </Box>

                {cargando ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <CircularProgress size={24} sx={{ color: '#00e5a0' }} />
                    </Box>
                ) : (
                    <Box sx={{ display: 'grid', gap: 1.5 }}>
                        {lineas.map((l) => {
                            const err = intentado ? errores.porLinea.get(l.clave) : undefined;
                            const contenedoresDelAlmacen = contenedores.filter((c) => idDe(c.almacen) === l.almacenId);

                            return (
                                <Box
                                    key={l.clave}
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 130px 40px' },
                                        gap: 1.5,
                                        alignItems: 'start',
                                    }}
                                >
                                    {l.existente ? (
                                        <Typography
                                            sx={{
                                                gridColumn: { sm: 'span 2' },
                                                color: '#e8f5f0',
                                                alignSelf: 'center',
                                            }}
                                        >
                                            {etiquetaExistente(l)}
                                        </Typography>
                                    ) : (
                                        <>
                                            <FormControl fullWidth size="small" error={!!err?.almacen} sx={inputSx}>
                                                <InputLabel id={`conteo-almacen-label-${l.clave}`}>Almacén</InputLabel>
                                                <Select
                                                    labelId={`conteo-almacen-label-${l.clave}`}
                                                    id={`conteo-almacen-${l.clave}`}
                                                    label="Almacén"
                                                    value={l.almacenId}
                                                    onChange={(ev) =>
                                                        actualizar(l.clave, {
                                                            almacenId: ev.target.value,
                                                            contenedorId: '',
                                                        })
                                                    }
                                                    disabled={guardando}
                                                >
                                                    {almacenes.map((a) => (
                                                        <MenuItem key={a._id} value={a._id}>
                                                            {a.nombreAlmacen}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                                {err?.almacen && <FormHelperText>{err.almacen}</FormHelperText>}
                                            </FormControl>

                                            <FormControl fullWidth size="small" error={!!err?.contenedor} sx={inputSx}>
                                                <InputLabel id={`conteo-contenedor-label-${l.clave}`}>Contenedor</InputLabel>
                                                <Select
                                                    labelId={`conteo-contenedor-label-${l.clave}`}
                                                    id={`conteo-contenedor-${l.clave}`}
                                                    label="Contenedor"
                                                    value={l.contenedorId}
                                                    onChange={(ev) => actualizar(l.clave, { contenedorId: ev.target.value })}
                                                    disabled={guardando || !l.almacenId}
                                                >
                                                    {contenedoresDelAlmacen.map((c) => (
                                                        <MenuItem key={c._id} value={c._id}>
                                                            {c.nombreContenedor}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                                {err?.contenedor && <FormHelperText>{err.contenedor}</FormHelperText>}
                                            </FormControl>
                                        </>
                                    )}

                                    <TextField
                                        size="small"
                                        type="number"
                                        label="Cantidad contada"
                                        value={l.cantidad}
                                        onChange={(ev) => actualizar(l.clave, { cantidad: ev.target.value })}
                                        error={!!err?.cantidad}
                                        helperText={err?.cantidad}
                                        disabled={guardando}
                                        slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                                        sx={inputSx}
                                    />

                                    {l.existente ? (
                                        <Box />
                                    ) : (
                                        <Tooltip title="Quitar esta ubicación">
                                            <span>
                                                <IconButton
                                                    aria-label="Quitar ubicación"
                                                    onClick={() => quitar(l.clave)}
                                                    disabled={guardando || lineas.length === 1}
                                                    sx={{ color: '#ef4444' }}
                                                >
                                                    <DeleteOutlineIcon />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    )}
                                </Box>
                            );
                        })}

                        <Box>
                            <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={agregar}
                                disabled={guardando}
                                sx={{ textTransform: 'none', color: '#00e5a0' }}
                            >
                                Agregar otra ubicación
                            </Button>
                        </Box>
                    </Box>
                )}

                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        px: 2,
                        py: 1.5,
                        borderRadius: 1,
                        bgcolor: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    <Box>
                        <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                            Stock actual del producto
                        </Typography>
                        <Typography sx={{ color: '#e8f5f0', fontWeight: 600 }}>{fila.stockProducto}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                            Quedará en (total contado)
                        </Typography>
                        <Typography
                            sx={{
                                fontWeight: 700,
                                color: cambioStock === 0 ? '#e8f5f0' : cambioStock > 0 ? '#00e5a0' : '#f59e0b',
                            }}
                        >
                            {totalContado}
                            {cambioStock !== 0 && ` (${cambioStock > 0 ? '+' : ''}${cambioStock})`}
                        </Typography>
                    </Box>
                </Box>

                <TextField
                    size="small"
                    label="Observación (opcional)"
                    value={observacion}
                    onChange={(ev) => setObservacion(ev.target.value)}
                    disabled={guardando}
                    slotProps={{ htmlInput: { maxLength: 300 } }}
                    sx={inputSx}
                />
            </DialogContent>

            <DialogActions sx={{ display: 'flex', p: 2, gap: 2, width: '100%' }}>
                <Button
                    onClick={onCancelar}
                    disabled={guardando}
                    fullWidth
                    variant="contained"
                    startIcon={<CancelIcon />}
                    sx={botonCancelarSx}
                >
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    onClick={confirmar}
                    disabled={guardando || cargando}
                    fullWidth
                    startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                    sx={botonGuardarSx}
                >
                    {guardando ? 'Guardando…' : 'Aplicar conteo'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
