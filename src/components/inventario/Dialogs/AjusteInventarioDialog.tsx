import { useCallback, useEffect, useMemo, useState } from 'react';
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
    InputLabel,
    MenuItem,
    Select,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import AssignmentAddIcon from '@mui/icons-material/AssignmentAdd';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutlined';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import SelectNomenclador from '../../nomencladores/SelectNomenclador';
import { useNotify } from '../../notificaciones/useNotify';
import { getErrorMessage } from '../../../utils/errorMessage';
import { useAuth } from '../../../context/authContext';
import { ajusteInventarioApi, type AjusteInventario } from '../../../service/ajusteInventarioApi';
import { existenciasApi } from '../../../service/existenciasApi';
import type { ExistenciaBackend } from '../../../service/movimientosApi';
import {
    causasDisminucionApi,
    type OpcionNomenclador,
} from '../../../service/nomencladoresApi';
import { useUbicaciones } from '../useUbicaciones';
import { botonCancelarSx, botonGuardarSx, inputSx, paperSx, tituloSx, tituloTextoSx } from '../dialogEstilos';

// ─── Tipos ─────────────────────────────────────────────

export interface ProductoAjuste {
    id: string;
    producto: string;
    stock: number;
}

type TipoAjuste = 'entrada' | 'salida';

export interface AjusteInventarioDialogProps {
    open: boolean;
    onClose: () => void;
    /** Productos entre los que se puede elegir (con su stock actual). */
    productos: ProductoAjuste[];
    /** Se llama después de registrar el ajuste, para que la página recargue productos y Kardex. */
    onAjustado: () => void | Promise<void>;
}

interface Errores {
    producto?: string;
    cantidad?: string;
    causa?: string;
    ubicacion?: string;
    autorizadoPor?: string;
    firmadoPor?: string;
}

const idDe = (ref: string | { _id: string }) => (typeof ref === 'string' ? ref : ref._id);

const etiquetaUbicacion = (e: ExistenciaBackend) => {
    const almacen = typeof e.almacen === 'string' ? 'Almacén' : e.almacen.nombreAlmacen;
    const contenedor = typeof e.contenedor === 'string' ? 'Contenedor' : e.contenedor.nombreContenedor;
    return `${almacen} / ${contenedor}`;
};

const toggleSx = (color: string) => ({
    flex: 1,
    gap: 1,
    textTransform: 'none',
    fontWeight: 600,
    color: '#9ca3af',
    borderColor: 'rgba(255,255,255,0.08)',
    '&.Mui-selected, &.Mui-selected:hover': {
        color,
        bgcolor: `${color}1f`,
        borderColor: `${color}66`,
    },
});

// ─── Componente ────────────────────────────────────────

/**
 * Ajuste de inventario SC-2-16: exige causa, autorización y firma. El servidor
 * lee el saldo antes y calcula el saldo después; el diálogo los muestra al
 * terminar y no los envía.
 */
export default function AjusteInventarioDialog({
    open,
    onClose,
    productos,
    onAjustado,
}: AjusteInventarioDialogProps) {
    const notify = useNotify();
    const { usuario } = useAuth();

    const [productoId, setProductoId] = useState('');
    const [tipo, setTipo] = useState<TipoAjuste>('entrada');
    const [cantidad, setCantidad] = useState('');
    const [causa, setCausa] = useState('');
    const [autorizadoPor, setAutorizadoPor] = useState('');
    // La firma parte del usuario que registra, pero se puede cambiar.
    const [firmadoPor, setFirmadoPor] = useState<string | null>(null);
    const [errores, setErrores] = useState<Errores>({});
    const [guardando, setGuardando] = useState(false);
    // Documento ya registrado: se muestra con los saldos que devolvió el servidor.
    const [registrado, setRegistrado] = useState<AjusteInventario | null>(null);

    const [causas, setCausas] = useState<OpcionNomenclador[]>([]);
    const [cargandoCausas, setCargandoCausas] = useState(false);

    const cargarCausas = useCallback(async () => {
        setCargandoCausas(true);
        try {
            setCausas(await causasDisminucionApi.listar());
        } catch (e) {
            notify.error(getErrorMessage(e, 'No se pudieron cargar las causas de disminución'));
        } finally {
            setCargandoCausas(false);
        }
    }, [notify]);

    // Las causas se piden cada vez que se abre el diálogo (pueden haberse agregado desde otro lugar).
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos al abrir el diálogo
        if (open) void cargarCausas();
    }, [open, cargarCausas]);

    // ─── Ubicación del ajuste (el documento SC-2-16 siempre la indica) ───
    // Con las existencias unificadas el saldo es el de la ubicación; antes de
    // unificar, el del producto (es lo que mueve el kardex en ese modo).
    const [unificado, setUnificado] = useState(false);
    const [ubicacionSalida, setUbicacionSalida] = useState('');
    const [almacenEntrada, setAlmacenEntrada] = useState('');
    const [contenedorEntrada, setContenedorEntrada] = useState('');
    // Ubicaciones con stock del producto elegido.
    const [ubicaciones, setUbicaciones] = useState<{ productoId: string; filas: ExistenciaBackend[] } | null>(null);

    // Si no se puede saber, se asume el modo anterior (saldo del producto).
    useEffect(() => {
        if (!open) return;
        let vigente = true;
        existenciasApi
            .estado()
            .then((estado) => {
                if (vigente) setUnificado(estado.unificado);
            })
            .catch(() => {
                if (vigente) setUnificado(false);
            });
        return () => {
            vigente = false;
        };
    }, [open]);

    useEffect(() => {
        if (!open || !productoId) return;
        let vigente = true;
        existenciasApi
            .listarPorProducto(productoId)
            .then((filas) => {
                if (vigente) setUbicaciones({ productoId, filas });
            })
            .catch((e) => {
                if (vigente) {
                    setUbicaciones({ productoId, filas: [] });
                    notify.error(getErrorMessage(e, 'No se pudieron cargar las ubicaciones del producto'));
                }
            });
        return () => {
            vigente = false;
        };
    }, [open, productoId, notify]);

    const { almacenes, contenedores, cargando: cargandoAlmacenes } = useUbicaciones(open);

    const producto = useMemo(() => productos.find((p) => p.id === productoId), [productos, productoId]);

    const filasUbicacion = useMemo(
        () => (ubicaciones && ubicaciones.productoId === productoId ? ubicaciones.filas : []),
        [ubicaciones, productoId],
    );
    const cargandoUbicaciones = !!productoId && ubicaciones?.productoId !== productoId;
    // Con una sola ubicación con stock no hace falta elegir.
    const ubicacionElegida =
        filasUbicacion.find((e) => e._id === ubicacionSalida) ??
        (filasUbicacion.length === 1 ? filasUbicacion[0] : undefined);
    const contenedoresEntrada = useMemo(
        () => contenedores.filter((c) => idDe(c.almacen) === almacenEntrada),
        [contenedores, almacenEntrada],
    );

    const cantidadNum = Number(cantidad);
    const cantidadValida = cantidad !== '' && Number.isFinite(cantidadNum) && cantidadNum > 0;

    // Ubicación (almacén + contenedor) a la que apunta el ajuste.
    const ubicacionDelAjuste =
        tipo === 'salida'
            ? ubicacionElegida
                ? { almacen: idDe(ubicacionElegida.almacen), contenedor: idDe(ubicacionElegida.contenedor) }
                : null
            : almacenEntrada && contenedorEntrada
              ? { almacen: almacenEntrada, contenedor: contenedorEntrada }
              : null;

    // Saldo que el servidor va a leer (estimado con lo que ve la pantalla).
    const saldoActual = (() => {
        if (!producto) return null;
        if (!unificado) return producto.stock;
        if (!ubicacionDelAjuste) return null;
        const fila = filasUbicacion.find(
            (e) =>
                idDe(e.almacen) === ubicacionDelAjuste.almacen && idDe(e.contenedor) === ubicacionDelAjuste.contenedor,
        );
        return fila ? fila.cantidad : 0;
    })();
    const saldoResultante =
        saldoActual !== null && cantidadValida
            ? tipo === 'entrada'
                ? saldoActual + cantidadNum
                : saldoActual - cantidadNum
            : null;

    const limpiar = () => {
        setProductoId('');
        setTipo('entrada');
        setCantidad('');
        setCausa('');
        setAutorizadoPor('');
        setFirmadoPor(null);
        setUbicacionSalida('');
        setAlmacenEntrada('');
        setContenedorEntrada('');
        setErrores({});
        setRegistrado(null);
    };

    const handleCerrar = () => {
        if (guardando) return;
        limpiar();
        onClose();
    };

    const firma = firmadoPor ?? usuario?.nombre ?? '';

    const validar = (): Errores => {
        const e: Errores = {};
        if (!producto) e.producto = 'Seleccione un producto';
        if (!cantidadValida) e.cantidad = 'Ingrese una cantidad mayor que 0';
        else if (tipo === 'salida' && saldoActual !== null && cantidadNum > saldoActual) {
            e.cantidad = `No puede disminuir más del saldo actual (${saldoActual})`;
        }
        if (!causa.trim()) {
            e.causa = tipo === 'salida' ? 'Seleccione la causa de la disminución' : 'Indique la causa del aumento';
        }
        if (!ubicacionDelAjuste) {
            e.ubicacion =
                tipo === 'salida'
                    ? 'Seleccione la ubicación de la que sale la mercancía'
                    : 'Seleccione el almacén y el contenedor donde entra la mercancía';
        }
        if (!autorizadoPor.trim()) e.autorizadoPor = 'Indique quién autoriza el ajuste';
        if (!firma.trim()) e.firmadoPor = 'La firma es obligatoria';
        return e;
    };

    const handleConfirmar = async () => {
        const e = validar();
        setErrores(e);
        if (Object.keys(e).length > 0 || !ubicacionDelAjuste) return;

        setGuardando(true);
        try {
            const ajuste = await ajusteInventarioApi.crear({
                causa: causa.trim(),
                autorizadoPor: autorizadoPor.trim(),
                firmadoPor: firma.trim(),
                lineas: [
                    {
                        producto: productoId,
                        almacen: ubicacionDelAjuste.almacen,
                        contenedor: ubicacionDelAjuste.contenedor,
                        ajuste: tipo === 'entrada' ? cantidadNum : -cantidadNum,
                    },
                ],
            });
            notify.success(`Ajuste ${ajuste.numeroConsecutivo} registrado correctamente`);
            setRegistrado(ajuste);
            await onAjustado();
        } catch (err) {
            notify.error(`Error al ajustar el inventario: ${getErrorMessage(err)}`);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleCerrar} maxWidth="sm" fullWidth slotProps={{ paper: { sx: paperSx } }}>
            <DialogTitle sx={tituloSx}>
                <Typography variant="h6" component="span" sx={tituloTextoSx}>
                    <AssignmentAddIcon sx={{ color: 'primary.main' }} />
                    Ajuste de Inventario (SC-2-16)
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ pt: '20px !important' }}>
                {registrado ? (
                    <Box sx={{ display: 'grid', gap: 2 }}>
                        <Typography sx={{ fontWeight: 700 }}>
                            Ajuste {registrado.numeroConsecutivo} registrado
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Causa: {registrado.causa} · Autorizó: {registrado.autorizadoPor} · Firmó:{' '}
                            {registrado.firmadoPor}
                        </Typography>
                        {registrado.lineas.map((l, i) => (
                            <Box
                                key={i}
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr',
                                    gap: 2,
                                    px: 2,
                                    py: 1.5,
                                    borderRadius: 1,
                                    border: 1,
                                    borderColor: 'divider',
                                }}
                            >
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        Saldo antes
                                    </Typography>
                                    <Typography sx={{ fontWeight: 600 }}>{l.saldoAntes}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        Ajuste
                                    </Typography>
                                    <Typography
                                        sx={{ fontWeight: 600, color: l.ajuste > 0 ? 'primary.main' : 'warning.main' }}
                                    >
                                        {l.ajuste > 0 ? `+${l.ajuste}` : l.ajuste}
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        Saldo después
                                    </Typography>
                                    <Typography sx={{ fontWeight: 700 }}>{l.saldoDespues}</Typography>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                ) : (
                    <Box
                        component="form"
                        noValidate
                        onSubmit={(ev) => {
                            ev.preventDefault();
                            void handleConfirmar();
                        }}
                        sx={{ display: 'grid', gap: 2 }}
                    >
                        <FormControl fullWidth size="small" error={!!errores.producto} sx={inputSx}>
                            <InputLabel>Producto</InputLabel>
                            <Select
                                label="Producto"
                                value={productoId}
                                onChange={(ev) => {
                                    setProductoId(ev.target.value);
                                    setUbicacionSalida('');
                                    setErrores((prev) => ({
                                        ...prev,
                                        producto: undefined,
                                        cantidad: undefined,
                                        ubicacion: undefined,
                                    }));
                                }}
                                disabled={guardando}
                            >
                                {productos.map((p) => (
                                    <MenuItem key={p.id} value={p.id}>
                                        {p.producto} (Stock: {p.stock})
                                    </MenuItem>
                                ))}
                            </Select>
                            {errores.producto && <FormHelperText>{errores.producto}</FormHelperText>}
                        </FormControl>

                        <ToggleButtonGroup
                            exclusive
                            fullWidth
                            size="small"
                            value={tipo}
                            onChange={(_, valor: TipoAjuste | null) => {
                                if (!valor) return;
                                setTipo(valor);
                                setCausa('');
                                setUbicacionSalida('');
                                setAlmacenEntrada('');
                                setContenedorEntrada('');
                                setErrores({});
                            }}
                            disabled={guardando}
                        >
                            <ToggleButton value="entrada" sx={toggleSx('#00e5a0')}>
                                <AddCircleOutlineIcon fontSize="small" />
                                Aumentar stock
                            </ToggleButton>
                            <ToggleButton value="salida" sx={toggleSx('#ef4444')}>
                                <RemoveCircleOutlineIcon fontSize="small" />
                                Disminuir stock
                            </ToggleButton>
                        </ToggleButtonGroup>

                        <TextField
                            size="small"
                            type="number"
                            label={tipo === 'entrada' ? 'Cantidad a aumentar' : 'Cantidad a disminuir'}
                            value={cantidad}
                            onChange={(ev) => {
                                setCantidad(ev.target.value);
                                setErrores((prev) => ({ ...prev, cantidad: undefined }));
                            }}
                            error={!!errores.cantidad}
                            helperText={errores.cantidad}
                            disabled={guardando}
                            slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                            sx={inputSx}
                        />

                        {producto && tipo === 'salida' && (
                            <FormControl fullWidth size="small" error={!!errores.ubicacion} sx={inputSx}>
                                <InputLabel id="ajuste-ubicacion-label">Ubicación</InputLabel>
                                <Select
                                    labelId="ajuste-ubicacion-label"
                                    id="ajuste-ubicacion"
                                    label="Ubicación"
                                    value={ubicacionElegida?._id ?? ''}
                                    onChange={(ev) => {
                                        setUbicacionSalida(ev.target.value);
                                        setErrores((prev) => ({ ...prev, cantidad: undefined, ubicacion: undefined }));
                                    }}
                                    disabled={guardando || cargandoUbicaciones}
                                >
                                    {filasUbicacion.map((u) => (
                                        <MenuItem key={u._id} value={u._id}>
                                            {etiquetaUbicacion(u)} (hay {u.cantidad})
                                        </MenuItem>
                                    ))}
                                </Select>
                                <FormHelperText>
                                    {cargandoUbicaciones
                                        ? 'Cargando ubicaciones…'
                                        : (errores.ubicacion ?? 'Ubicación de la que sale la mercancía.')}
                                </FormHelperText>
                            </FormControl>
                        )}

                        {producto && tipo === 'entrada' && (
                            <Box sx={{ display: 'grid', gap: 1 }}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                                    <FormControl fullWidth size="small" error={!!errores.ubicacion} sx={inputSx}>
                                        <InputLabel id="ajuste-almacen-label">Almacén</InputLabel>
                                        <Select
                                            labelId="ajuste-almacen-label"
                                            id="ajuste-almacen"
                                            label="Almacén"
                                            value={almacenEntrada}
                                            onChange={(ev) => {
                                                setAlmacenEntrada(ev.target.value);
                                                setContenedorEntrada('');
                                                setErrores((prev) => ({ ...prev, ubicacion: undefined }));
                                            }}
                                            disabled={guardando || cargandoAlmacenes}
                                        >
                                            {almacenes.map((a) => (
                                                <MenuItem key={a._id} value={a._id}>
                                                    {a.nombreAlmacen}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <FormControl fullWidth size="small" error={!!errores.ubicacion} sx={inputSx}>
                                        <InputLabel id="ajuste-contenedor-label">Contenedor</InputLabel>
                                        <Select
                                            labelId="ajuste-contenedor-label"
                                            id="ajuste-contenedor"
                                            label="Contenedor"
                                            value={contenedorEntrada}
                                            onChange={(ev) => {
                                                setContenedorEntrada(ev.target.value);
                                                setErrores((prev) => ({ ...prev, ubicacion: undefined }));
                                            }}
                                            disabled={guardando || cargandoAlmacenes || !almacenEntrada}
                                        >
                                            {contenedoresEntrada.map((c) => (
                                                <MenuItem key={c._id} value={c._id}>
                                                    {c.nombreContenedor}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                                <Typography
                                    variant="caption"
                                    sx={{ color: errores.ubicacion ? 'error.main' : 'text.secondary' }}
                                >
                                    {errores.ubicacion ?? 'Ubicación donde entra la mercancía.'}
                                </Typography>
                            </Box>
                        )}

                        {tipo === 'salida' ? (
                            <SelectNomenclador
                                label="Causa"
                                nombreNomenclador="causa de disminución"
                                value={causa}
                                opciones={causas}
                                onChange={(nombre) => {
                                    setCausa(nombre);
                                    setErrores((prev) => ({ ...prev, causa: undefined }));
                                }}
                                onCrear={causasDisminucionApi.crear}
                                onCreado={cargarCausas}
                                error={!!errores.causa}
                                helperText={errores.causa}
                                disabled={guardando || cargandoCausas}
                            />
                        ) : (
                            <TextField
                                size="small"
                                label="Causa del aumento"
                                value={causa}
                                onChange={(ev) => {
                                    setCausa(ev.target.value);
                                    setErrores((prev) => ({ ...prev, causa: undefined }));
                                }}
                                error={!!errores.causa}
                                helperText={errores.causa}
                                disabled={guardando}
                                sx={inputSx}
                            />
                        )}

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                            <TextField
                                size="small"
                                label="Autorizado por"
                                value={autorizadoPor}
                                onChange={(ev) => {
                                    setAutorizadoPor(ev.target.value);
                                    setErrores((prev) => ({ ...prev, autorizadoPor: undefined }));
                                }}
                                error={!!errores.autorizadoPor}
                                helperText={errores.autorizadoPor ?? 'Administrador o económico que autoriza'}
                                disabled={guardando}
                                sx={inputSx}
                            />
                            <TextField
                                size="small"
                                label="Firma"
                                value={firma}
                                onChange={(ev) => {
                                    setFirmadoPor(ev.target.value);
                                    setErrores((prev) => ({ ...prev, firmadoPor: undefined }));
                                }}
                                error={!!errores.firmadoPor}
                                helperText={errores.firmadoPor ?? 'Quien firma el documento'}
                                disabled={guardando}
                                sx={inputSx}
                            />
                        </Box>

                        {producto && (
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    px: 2,
                                    py: 1.5,
                                    borderRadius: 1,
                                    bgcolor: 'action.hover',
                                    border: 1,
                                    borderColor: 'divider',
                                }}
                            >
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        Saldo actual
                                    </Typography>
                                    <Typography sx={{ fontWeight: 600 }}>{saldoActual ?? '—'}</Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        Saldo resultante (el servidor lo confirma)
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontWeight: 700,
                                            color:
                                                saldoResultante === null
                                                    ? 'text.secondary'
                                                    : saldoResultante < 0
                                                      ? 'error.main'
                                                      : tipo === 'entrada'
                                                        ? 'primary.main'
                                                        : 'warning.main',
                                        }}
                                    >
                                        {saldoResultante ?? '—'}
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ display: 'flex', p: 2, gap: 2, width: '100%' }}>
                {registrado ? (
                    <Button
                        onClick={handleCerrar}
                        fullWidth
                        variant="contained"
                        startIcon={<CheckCircleIcon />}
                        sx={botonGuardarSx}
                    >
                        Cerrar
                    </Button>
                ) : (
                    <>
                        <Button
                            onClick={handleCerrar}
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
                            onClick={() => void handleConfirmar()}
                            disabled={guardando}
                            fullWidth
                            startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                            sx={botonGuardarSx}
                        >
                            {guardando ? 'Guardando…' : 'Confirmar ajuste'}
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
}
