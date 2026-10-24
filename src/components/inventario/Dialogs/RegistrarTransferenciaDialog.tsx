import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';

import { useNotify } from '../../notificaciones/useNotify';
import { getErrorMessage } from '../../../utils/errorMessage';
import SelectConAgregar from '../SelectConAgregar';
import { useUbicaciones } from '../useUbicaciones';
import NuevoAlmacenDialog from './NuevoAlmacenDialog';
import NuevoContenedorDialog from './NuevoContenedorDialog';
import {
    botonCancelarSx,
    botonGuardarSx,
    inputSx,
    paperSx,
    tituloSx,
    tituloTextoSx,
} from '../dialogEstilos';
import { movimientosApi, type ExistenciaBackend, type ProductoBackend } from '../../../service/movimientosApi';

/** Mongoose puede devolver una referencia como string o como objeto populado. */
const refId = (ref: string | { _id: string } | null | undefined): string =>
    typeof ref === 'string' ? ref : (ref?._id ?? '');

export interface RegistrarTransferenciaDialogProps {
    open: boolean;
    onClose: () => void;
    /** Se llama después de registrar la transferencia, para que la página recargue sus datos. */
    onCambio: () => void | Promise<void>;
}

export default function RegistrarTransferenciaDialog({ open, onClose, onCambio }: RegistrarTransferenciaDialogProps) {
    const notify = useNotify();
    const { almacenes, contenedores, cargando, crearAlmacen, crearContenedor } = useUbicaciones(open);

    const [productos, setProductos] = useState<ProductoBackend[]>([]);
    const [cargandoProductos, setCargandoProductos] = useState(true);

    const [producto, setProducto] = useState('');
    const [origenAlm, setOrigenAlm] = useState('');
    const [origenCont, setOrigenCont] = useState('');
    const [destinoAlm, setDestinoAlm] = useState('');
    const [destinoCont, setDestinoCont] = useState('');
    const [cantidad, setCantidad] = useState('');
    const [fecha, setFecha] = useState<Dayjs>(dayjs());
    const [existencias, setExistencias] = useState<ExistenciaBackend[]>([]);
    const [cargandoExistencias, setCargandoExistencias] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const [dialogAlmacen, setDialogAlmacen] = useState(false);
    const [dialogContenedor, setDialogContenedor] = useState(false);

    // Los productos se piden cada vez que se abre el dialog (la lista cambia con las compras).
    useEffect(() => {
        if (!open) return;
        let cancelado = false;
        movimientosApi
            .listarProductos()
            .then((data) => {
                if (!cancelado) setProductos(data);
            })
            .catch((error) => notify.error(getErrorMessage(error, 'No se pudieron cargar los productos')))
            .finally(() => {
                if (!cancelado) setCargandoProductos(false);
            });
        return () => {
            cancelado = true;
        };
    }, [open, notify]);

    // ─── Datos derivados ──────────────────────────────────────────
    /** Almacenes donde el producto seleccionado tiene stock. */
    const almacenesOrigen = useMemo(() => {
        const mapa = new Map<string, { _id: string; nombre: string; total: number }>();
        existencias.forEach((e) => {
            const id = refId(e.almacen);
            if (!id) return;
            const nombre =
                typeof e.almacen === 'string'
                    ? (almacenes.find((a) => a._id === id)?.nombreAlmacen ?? 'Almacén')
                    : (e.almacen?.nombreAlmacen ?? 'Almacén');
            const actual = mapa.get(id);
            mapa.set(id, { _id: id, nombre, total: (actual?.total ?? 0) + e.cantidad });
        });
        return Array.from(mapa.values());
    }, [existencias, almacenes]);

    /** Contenedores del almacén de origen elegido donde hay stock del producto. */
    const contenedoresOrigen = useMemo(
        () =>
            existencias
                .filter((e) => refId(e.almacen) === origenAlm)
                .map((e) => {
                    const id = refId(e.contenedor);
                    const nombre =
                        typeof e.contenedor === 'string'
                            ? (contenedores.find((c) => c._id === id)?.nombreContenedor ?? 'Contenedor')
                            : (e.contenedor?.nombreContenedor ?? 'Contenedor');
                    return { _id: id, nombre, cantidad: e.cantidad };
                }),
        [existencias, contenedores, origenAlm],
    );

    /** Existencia exacta (producto + almacén + contenedor) de la que se descuenta. */
    const existenciaOrigen = useMemo(
        () => existencias.find((e) => refId(e.almacen) === origenAlm && refId(e.contenedor) === origenCont),
        [existencias, origenAlm, origenCont],
    );
    const cantidadDisponible = existenciaOrigen?.cantidad ?? 0;

    /** Contenedores del almacén de destino (sin incluir el contenedor de origen). */
    const contenedoresDestino = useMemo(
        () =>
            contenedores.filter((c) => {
                if (refId(c.almacen) !== destinoAlm) return false;
                return !(destinoAlm === origenAlm && c._id === origenCont);
            }),
        [contenedores, destinoAlm, origenAlm, origenCont],
    );

    const errorCantidad = (() => {
        if (cantidad === '') return undefined;
        const n = Number(cantidad);
        if (!Number.isInteger(n) || n <= 0) return 'Ingrese un número entero mayor que cero';
        if (n > cantidadDisponible) return `No puede superar el stock del origen (${cantidadDisponible})`;
        return undefined;
    })();

    const lista =
        !!producto && !!origenAlm && !!origenCont && !!destinoAlm && !!destinoCont && cantidad !== '' && !errorCantidad;

    // ─── Manejadores ──────────────────────────────────────────────
    const limpiarDestinoSiCoincide = (almacenId: string, contenedorId: string) => {
        if (destinoAlm === almacenId && destinoCont === contenedorId) setDestinoCont('');
    };

    /** Fija el origen automáticamente cuando solo hay una opción. */
    const autoSeleccionarOrigen = (lista: ExistenciaBackend[], almacenId = '', contenedorId = '') => {
        let alm = almacenId;
        let cont = contenedorId;
        if (!alm) {
            const unicos = Array.from(new Set(lista.map((e) => refId(e.almacen))));
            if (unicos.length === 1) alm = unicos[0];
        }
        if (alm && !cont) {
            const delAlmacen = lista.filter((e) => refId(e.almacen) === alm);
            if (delAlmacen.length === 1) cont = refId(delAlmacen[0].contenedor);
        }
        setOrigenAlm(alm);
        setOrigenCont(cont);
        limpiarDestinoSiCoincide(alm, cont);
    };

    /** Al elegir un producto se consultan sus existencias: de ahí salen los orígenes disponibles. */
    const handleProductoChange = async (productoId: string) => {
        setProducto(productoId);
        setOrigenAlm('');
        setOrigenCont('');
        setCantidad('');
        setExistencias([]);
        if (!productoId) return;

        try {
            setCargandoExistencias(true);
            const data = await movimientosApi.listarExistenciasProducto(productoId);
            setExistencias(data);
            autoSeleccionarOrigen(data);
            if (data.length === 0) {
                notify.warning('Este producto no tiene stock en ningún almacén, por lo que no se puede transferir.');
            }
        } catch (error) {
            notify.error(getErrorMessage(error, 'No se pudieron cargar las existencias del producto'));
        } finally {
            setCargandoExistencias(false);
        }
    };

    const limpiar = () => {
        setProducto('');
        setOrigenAlm('');
        setOrigenCont('');
        setDestinoAlm('');
        setDestinoCont('');
        setCantidad('');
        setFecha(dayjs());
        setExistencias([]);
    };

    const handleCerrar = () => {
        if (guardando) return;
        limpiar();
        onClose();
    };

    const realizarTransferencia = async () => {
        if (!lista) return;
        const n = Number(cantidad);
        if (origenAlm === destinoAlm && origenCont === destinoCont) {
            notify.error('El origen y destino no pueden ser la misma ubicación.');
            return;
        }

        setGuardando(true);
        try {
            await movimientosApi.crearTransferencia({
                producto,
                almacen_origen: origenAlm,
                contenedor_origen: origenCont,
                almacen_destino: destinoAlm,
                contenedor_destino: destinoCont,
                cantidad: n,
                fecha: fecha.format('YYYY-MM-DD'),
            });
            notify.success('Transferencia registrada correctamente.');
            limpiar();
            onClose();
            await onCambio();
        } catch (error) {
            console.error('Error realizando transferencia:', error);
            notify.error(getErrorMessage(error, 'No se pudo realizar la transferencia.'));
        } finally {
            setGuardando(false);
        }
    };

    const ocupado = guardando || cargandoExistencias;

    return (
        <>
            <Dialog open={open} onClose={handleCerrar} maxWidth="md" fullWidth slotProps={{ paper: { sx: paperSx } }}>
                <DialogTitle sx={tituloSx}>
                    <Typography variant="h6" component="span" sx={tituloTextoSx}>
                        <SwapHorizIcon sx={{ color: '#00e5a0' }} />
                        Registrar Transferencia
                    </Typography>
                </DialogTitle>

                <DialogContent sx={{ pt: '20px !important' }}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Box
                            component="form"
                            noValidate
                            onSubmit={(ev) => {
                                ev.preventDefault();
                                void realizarTransferencia();
                            }}
                            sx={{ display: 'grid', gap: 2 }}
                        >
                            <FormControl fullWidth size="small" sx={inputSx}>
                                <InputLabel>Producto</InputLabel>
                                <Select
                                    label="Producto"
                                    value={producto}
                                    onChange={(e) => void handleProductoChange(e.target.value)}
                                    disabled={guardando || cargandoProductos}
                                >
                                    <MenuItem value="">-- Seleccione producto --</MenuItem>
                                    {productos.map((p) => (
                                        <MenuItem key={p._id} value={p._id}>
                                            {p.nombre_producto} ({p.codigo_producto})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <Typography variant="caption" sx={{ color: '#9ca3af', mb: -1 }}>
                                Origen (de donde sale el producto)
                            </Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                                <FormControl fullWidth size="small" sx={inputSx}>
                                    <InputLabel>Almacén de origen</InputLabel>
                                    <Select
                                        label="Almacén de origen"
                                        value={origenAlm}
                                        onChange={(e) => {
                                            setCantidad('');
                                            autoSeleccionarOrigen(existencias, e.target.value);
                                        }}
                                        disabled={!producto || ocupado || almacenesOrigen.length === 0}
                                    >
                                        <MenuItem value="">-- Seleccione --</MenuItem>
                                        {almacenesOrigen.map((a) => (
                                            <MenuItem key={a._id} value={a._id}>
                                                {a.nombre} — Stock: {a.total}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth size="small" sx={inputSx}>
                                    <InputLabel>Contenedor de origen</InputLabel>
                                    <Select
                                        label="Contenedor de origen"
                                        value={origenCont}
                                        onChange={(e) => {
                                            setOrigenCont(e.target.value);
                                            setCantidad('');
                                            limpiarDestinoSiCoincide(origenAlm, e.target.value);
                                        }}
                                        disabled={!origenAlm || ocupado}
                                    >
                                        <MenuItem value="">-- Seleccione --</MenuItem>
                                        {contenedoresOrigen.map((c) => (
                                            <MenuItem key={c._id} value={c._id}>
                                                {c.nombre} — Stock: {c.cantidad}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>

                            <Typography variant="caption" sx={{ color: '#9ca3af', mb: -1 }}>
                                Destino (a donde llega el producto)
                            </Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                                <SelectConAgregar
                                    label="Almacén de destino"
                                    value={destinoAlm}
                                    opciones={almacenes.map((a) => ({ value: a._id, label: a.nombreAlmacen }))}
                                    onChange={(v) => {
                                        setDestinoAlm(v);
                                        setDestinoCont('');
                                    }}
                                    onAgregar={() => setDialogAlmacen(true)}
                                    textoAgregar="Añadir almacén"
                                    disabled={guardando || cargando}
                                />
                                <SelectConAgregar
                                    label="Contenedor de destino"
                                    value={destinoCont}
                                    opciones={contenedoresDestino.map((c) => ({
                                        value: c._id,
                                        label: c.nombreContenedor,
                                    }))}
                                    onChange={setDestinoCont}
                                    onAgregar={() => setDialogContenedor(true)}
                                    textoAgregar="Añadir contenedor"
                                    disabled={guardando || cargando || !destinoAlm}
                                />
                            </Box>

                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                                <TextField
                                    size="small"
                                    type="number"
                                    label="Cantidad a transferir"
                                    value={cantidad}
                                    onChange={(e) => setCantidad(e.target.value)}
                                    error={!!errorCantidad}
                                    helperText={
                                        errorCantidad ??
                                        (existenciaOrigen
                                            ? `Disponible en origen: ${cantidadDisponible}`
                                            : 'Seleccione almacén y contenedor de origen')
                                    }
                                    disabled={!existenciaOrigen || ocupado}
                                    slotProps={{ htmlInput: { min: 1, max: cantidadDisponible, step: 1 } }}
                                    sx={inputSx}
                                />
                                <DatePicker
                                    label="Fecha"
                                    value={fecha}
                                    onChange={(value) => value && setFecha(value)}
                                    disabled={guardando}
                                    slotProps={{ textField: { fullWidth: true, size: 'small', sx: inputSx } }}
                                />
                            </Box>
                        </Box>
                    </LocalizationProvider>
                </DialogContent>

                <DialogActions sx={{ display: 'flex', p: 2, gap: 2, width: '100%' }}>
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
                        onClick={() => void realizarTransferencia()}
                        disabled={guardando || cargando || !lista}
                        fullWidth
                        startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                        sx={botonGuardarSx}
                    >
                        {guardando ? 'Guardando…' : 'Realizar transferencia'}
                    </Button>
                </DialogActions>
            </Dialog>

            <NuevoAlmacenDialog
                open={dialogAlmacen}
                onClose={() => setDialogAlmacen(false)}
                onAgregar={async (datos) => {
                    const creado = await crearAlmacen(datos);
                    setDestinoAlm(creado._id);
                    setDestinoCont('');
                }}
            />
            <NuevoContenedorDialog
                open={dialogContenedor}
                onClose={() => setDialogContenedor(false)}
                almacenes={almacenes.map((a) => ({ id: a._id, nombre: a.nombreAlmacen }))}
                almacenInicialId={destinoAlm}
                onAgregar={async (datos) => {
                    const creado = await crearContenedor(datos);
                    setDestinoAlm(datos.almacenId);
                    setDestinoCont(creado._id);
                }}
            />
        </>
    );
}
