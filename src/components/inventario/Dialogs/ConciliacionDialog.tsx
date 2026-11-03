import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import LockOpenIcon from '@mui/icons-material/LockOpen';

import ConfirmacionConciliacionDialog from './ConfirmacionConciliacionDialog';
import ConteoConciliacionDialog from './ConteoConciliacionDialog';
import { botonCancelarSx, inputSx, paperSx, tituloSx, tituloTextoSx } from '../dialogEstilos';
import { useAuth } from '../../../context/authContext';
import { useNotify } from '../../notificaciones/useNotify';
import { getErrorMessage } from '../../../utils/errorMessage';
import {
    existenciasApi,
    ordenarUbicaciones,
    puedeActivarConciliacion,
    puedeResolverConciliacion,
    type FilaConciliacion,
    type ReporteConciliacion,
    type ResolverConciliacionDto,
    type UbicacionConteo,
} from '../../../service/existenciasApi';

export interface ConciliacionDialogProps {
    open: boolean;
    onClose: () => void;
    /** Se llama después de cambiar saldos o activar el modo unificado, para que la página se actualice. */
    onCambio: () => void | Promise<void>;
}

/** Lo que está esperando confirmación del usuario. */
type Pendiente =
    | { tipo: 'usar'; fila: FilaConciliacion; estrategia: 'stock_producto' | 'existencias' }
    | { tipo: 'conteo'; fila: FilaConciliacion }
    | { tipo: 'activar' };

const AMBAR = '#f59e0b';
const VERDE = '#00e5a0';

const celdaSx = { color: '#e8f5f0', borderColor: 'rgba(255,255,255,0.06)', py: 1 };
const cabeceraSx = { ...celdaSx, bgcolor: '#151a19', color: '#9ca3af', fontWeight: 600, whiteSpace: 'nowrap' };

const redondear = (n: number): number => Number(n.toFixed(6));
const conSigno = (n: number): string => `${n > 0 ? '+' : ''}${redondear(n)}`;
const nombreUbicacion = (u: { almacenNombre: string; contenedorNombre: string }): string =>
    `${u.almacenNombre} / ${u.contenedorNombre}`;

/** Por qué no se puede "usar el stock del producto" en esta fila (undefined = sí se puede). */
function razonSinStockProducto(fila: FilaConciliacion): string | undefined {
    if (fila.stockProducto < 0) {
        return 'El stock del producto es negativo: use las ubicaciones o haga un conteo.';
    }
    if (fila.ubicaciones.length > 1) {
        return 'Tiene varias ubicaciones: indique la cantidad real de cada una con «Contar».';
    }
    if (fila.ubicaciones.length === 0 && fila.stockProducto > 0 && !fila.ubicacionPorDefecto) {
        return 'No tiene ubicación: use «Contar» para indicar dónde está.';
    }
    return undefined;
}

function descripcionUsar(fila: FilaConciliacion, estrategia: 'stock_producto' | 'existencias') {
    if (estrategia === 'existencias') {
        return (
            <>
                La suma por ubicación (<b>{fila.sumaExistencias}</b>) se considera correcta. El stock de{' '}
                <b>{fila.nombre}</b> pasará de <b>{fila.stockProducto}</b> a <b>{fila.sumaExistencias}</b>.
            </>
        );
    }

    const destino = fila.ubicaciones[0] ?? fila.ubicacionPorDefecto;
    return (
        <>
            El stock de <b>{fila.nombre}</b> (<b>{fila.stockProducto}</b>) se considera correcto.{' '}
            {fila.ubicaciones.length === 1 ? (
                <>
                    La existencia en <b>{nombreUbicacion(fila.ubicaciones[0])}</b> pasará de{' '}
                    <b>{fila.ubicaciones[0].cantidad}</b> a <b>{fila.stockProducto}</b>.
                </>
            ) : destino ? (
                <>
                    Se creará la existencia en <b>{nombreUbicacion(destino)}</b> con <b>{fila.stockProducto}</b>.
                </>
            ) : null}
        </>
    );
}

/**
 * Conciliación de existencias (Fase 1): lista los productos cuyo stock no
 * coincide con la suma de sus ubicaciones, permite decidir el saldo correcto de
 * cada uno y, con 0 diferencias, activar el modo unificado.
 */
export default function ConciliacionDialog({ open, onClose, onCambio }: ConciliacionDialogProps) {
    const notify = useNotify();
    const { usuario } = useAuth();
    const puedeResolver = puedeResolverConciliacion(usuario?.rol);
    const puedeActivar = puedeActivarConciliacion(usuario?.rol);

    const [reporte, setReporte] = useState<ReporteConciliacion | null>(null);
    const [cargando, setCargando] = useState(false);
    const [errorCarga, setErrorCarga] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [pendiente, setPendiente] = useState<Pendiente | null>(null);
    const [procesando, setProcesando] = useState(false);

    const cargar = useCallback(async () => {
        setCargando(true);
        setErrorCarga(null);
        try {
            setReporte(await existenciasApi.reporteConciliacion());
        } catch (error) {
            setErrorCarga(getErrorMessage(error, 'No se pudo cargar el reporte de conciliación'));
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos al abrir el diálogo
        if (open) void cargar();
    }, [open, cargar]);

    const filas = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        const todas = reporte?.filas ?? [];
        if (!texto) return todas;
        return todas.filter((f) => f.codigo.toLowerCase().includes(texto) || f.nombre.toLowerCase().includes(texto));
    }, [reporte, busqueda]);

    const avisarCambio = async () => {
        try {
            await onCambio();
        } catch (error) {
            notify.error(getErrorMessage(error, 'No se pudo actualizar la pantalla de inventario'));
        }
    };

    const resolver = async (dto: ResolverConciliacionDto, nombre: string, cerrarSiFalla: boolean) => {
        setProcesando(true);
        try {
            await existenciasApi.resolverConciliacion(dto);
            notify.success(`"${nombre}" conciliado correctamente`);
            setPendiente(null);
            await Promise.all([cargar(), avisarCambio()]);
        } catch (error) {
            notify.error(`No se pudo conciliar "${nombre}": ${getErrorMessage(error)}`);
            if (cerrarSiFalla) setPendiente(null);
            // Si el producto cambió mientras tanto, la tabla debe mostrar los saldos de ahora.
            await cargar();
        } finally {
            setProcesando(false);
        }
    };

    const confirmarUsar = (
        fila: FilaConciliacion,
        estrategia: 'stock_producto' | 'existencias',
        observacion: string,
    ) =>
        resolver(
            { productoId: fila.productoId, estrategia, ...(observacion && { observacion }) },
            fila.nombre,
            true,
        );

    const confirmarConteo = (fila: FilaConciliacion, ubicaciones: UbicacionConteo[], observacion: string) =>
        resolver(
            { productoId: fila.productoId, estrategia: 'conteo', ubicaciones, ...(observacion && { observacion }) },
            fila.nombre,
            false,
        );

    const activar = async () => {
        setProcesando(true);
        try {
            setReporte(await existenciasApi.activarModoUnificado());
            setPendiente(null);
            notify.success('Modo unificado activado: el inventario ahora se lleva por ubicación');
            await avisarCambio();
        } catch (error) {
            notify.error(`No se pudo activar el modo unificado: ${getErrorMessage(error)}`);
            setPendiente(null);
            await cargar();
        } finally {
            setProcesando(false);
        }
    };

    const handleCerrar = () => {
        if (procesando) return;
        setPendiente(null);
        setBusqueda('');
        onClose();
    };

    const listoParaActivar = !!reporte && !reporte.unificado && reporte.conDiferencias === 0;
    const desde = reporte?.unificadoEn ? new Date(reporte.unificadoEn).toLocaleString() : null;

    return (
        <>
            <Dialog
                open={open}
                onClose={handleCerrar}
                maxWidth="xl"
                fullWidth
                slotProps={{ paper: { sx: paperSx } }}
            >
                <DialogTitle sx={tituloSx}>
                    <Typography variant="h6" component="span" sx={tituloTextoSx}>
                        <FactCheckIcon sx={{ color: VERDE }} />
                        Conciliación de existencias
                    </Typography>
                </DialogTitle>

                <DialogContent sx={{ pt: '20px !important', display: 'grid', gap: 2 }}>
                    {errorCarga && (
                        <Alert
                            severity="error"
                            action={
                                <Button color="inherit" size="small" onClick={() => void cargar()}>
                                    Reintentar
                                </Button>
                            }
                        >
                            {errorCarga}
                        </Alert>
                    )}

                    {!reporte && cargando && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress sx={{ color: VERDE }} />
                        </Box>
                    )}

                    {reporte && (
                        <>
                            {reporte.unificado ? (
                                <Alert severity="success" variant="outlined" sx={{ color: '#e8f5f0' }}>
                                    Modo unificado <b>activo</b>
                                    {desde && <> desde {desde}</>}. Las ventas, facturas y ajustes descuentan de la
                                    ubicación del producto, y el stock del producto es la suma de sus ubicaciones.
                                </Alert>
                            ) : (
                                <Alert
                                    severity={reporte.conDiferencias === 0 ? 'info' : 'warning'}
                                    variant="outlined"
                                    sx={{ color: '#e8f5f0' }}
                                >
                                    {reporte.conDiferencias === 0 ? (
                                        <>Todos los productos concilian. Ya puede activar el modo unificado.</>
                                    ) : (
                                        <>
                                            Hasta ahora el stock de cada producto (lo que mueven ventas, facturas y
                                            ajustes) y sus existencias por almacén y contenedor (lo que mueven las
                                            transferencias) se llevaban por separado. Decida cuál es el valor correcto de
                                            los <b>{reporte.conDiferencias}</b> producto(s) que no coinciden y active el
                                            modo unificado cuando no quede ninguno.
                                        </>
                                    )}
                                </Alert>
                            )}

                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                                {[
                                    { etiqueta: 'Productos', valor: reporte.totalProductos, color: '#e8f5f0' },
                                    { etiqueta: 'Conciliados', valor: reporte.conciliados, color: VERDE },
                                    {
                                        etiqueta: 'Con diferencias',
                                        valor: reporte.conDiferencias,
                                        color: reporte.conDiferencias > 0 ? AMBAR : '#e8f5f0',
                                    },
                                ].map((dato) => (
                                    <Box
                                        key={dato.etiqueta}
                                        sx={{
                                            px: 2,
                                            py: 1.5,
                                            borderRadius: 1,
                                            bgcolor: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                        }}
                                    >
                                        <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                                            {dato.etiqueta}
                                        </Typography>
                                        <Typography variant="h6" sx={{ color: dato.color, fontWeight: 700 }}>
                                            {dato.valor}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>

                            {reporte.filas.length > 0 && (
                                <>
                                    <TextField
                                        size="small"
                                        placeholder="Buscar por código o nombre"
                                        value={busqueda}
                                        onChange={(ev) => setBusqueda(ev.target.value)}
                                        sx={inputSx}
                                        slotProps={{
                                            input: {
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <SearchIcon sx={{ color: '#9ca3af' }} />
                                                    </InputAdornment>
                                                ),
                                            },
                                        }}
                                    />

                                    <TableContainer
                                        sx={{
                                            maxHeight: '45vh',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            borderRadius: 1,
                                        }}
                                    >
                                        <Table size="small" stickyHeader aria-label="Productos con diferencias">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={cabeceraSx}>Código</TableCell>
                                                    <TableCell sx={cabeceraSx}>Producto</TableCell>
                                                    <TableCell sx={cabeceraSx} align="right">
                                                        Stock del producto
                                                    </TableCell>
                                                    <TableCell sx={cabeceraSx} align="right">
                                                        Suma por ubicación
                                                    </TableCell>
                                                    <TableCell sx={cabeceraSx} align="right">
                                                        Diferencia
                                                    </TableCell>
                                                    <TableCell sx={cabeceraSx}>Ubicaciones</TableCell>
                                                    <TableCell sx={cabeceraSx}>Resolver</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {filas.map((fila) => {
                                                    const razon = razonSinStockProducto(fila);
                                                    return (
                                                        <TableRow key={fila.productoId} hover>
                                                            <TableCell sx={celdaSx}>{fila.codigo}</TableCell>
                                                            <TableCell sx={celdaSx}>{fila.nombre}</TableCell>
                                                            <TableCell sx={celdaSx} align="right">
                                                                {fila.stockProducto}
                                                            </TableCell>
                                                            <TableCell sx={celdaSx} align="right">
                                                                {fila.sumaExistencias}
                                                            </TableCell>
                                                            <TableCell
                                                                sx={{ ...celdaSx, color: AMBAR, fontWeight: 700 }}
                                                                align="right"
                                                            >
                                                                {conSigno(fila.diferencia)}
                                                            </TableCell>
                                                            <TableCell sx={celdaSx}>
                                                                {fila.ubicaciones.length === 0 ? (
                                                                    <Typography
                                                                        variant="caption"
                                                                        sx={{ color: '#9ca3af', fontStyle: 'italic' }}
                                                                    >
                                                                        Sin ubicación
                                                                        {fila.ubicacionPorDefecto &&
                                                                            ` (por defecto: ${nombreUbicacion(fila.ubicacionPorDefecto)})`}
                                                                    </Typography>
                                                                ) : (
                                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                        {ordenarUbicaciones(fila.ubicaciones).map((u) => (
                                                                            <Chip
                                                                                key={`${u.almacenId}|${u.contenedorId}`}
                                                                                size="small"
                                                                                label={`${nombreUbicacion(u)}: ${u.cantidad}`}
                                                                                sx={{
                                                                                    color: '#e8f5f0',
                                                                                    bgcolor: 'rgba(0,229,160,0.08)',
                                                                                    border: '1px solid rgba(0,229,160,0.2)',
                                                                                }}
                                                                            />
                                                                        ))}
                                                                    </Box>
                                                                )}
                                                            </TableCell>
                                                            <TableCell sx={{ ...celdaSx, whiteSpace: 'nowrap' }}>
                                                                {puedeResolver ? (
                                                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'nowrap' }}>
                                                                        <Tooltip
                                                                            title={
                                                                                razon ??
                                                                                'El stock del producto es el correcto: la existencia por ubicación se ajusta a él'
                                                                            }
                                                                        >
                                                                            <span>
                                                                                <Button
                                                                                    size="small"
                                                                                    variant="outlined"
                                                                                    disabled={!!razon || procesando}
                                                                                    onClick={() =>
                                                                                        setPendiente({
                                                                                            tipo: 'usar',
                                                                                            fila,
                                                                                            estrategia: 'stock_producto',
                                                                                        })
                                                                                    }
                                                                                    sx={{ textTransform: 'none', px: 1.25, minWidth: 0 }}
                                                                                >
                                                                                    Usar stock
                                                                                </Button>
                                                                            </span>
                                                                        </Tooltip>
                                                                        <Tooltip title="La suma por ubicación es la correcta: el stock del producto se ajusta a ella">
                                                                            <span>
                                                                                <Button
                                                                                    size="small"
                                                                                    variant="outlined"
                                                                                    disabled={procesando}
                                                                                    onClick={() =>
                                                                                        setPendiente({
                                                                                            tipo: 'usar',
                                                                                            fila,
                                                                                            estrategia: 'existencias',
                                                                                        })
                                                                                    }
                                                                                    sx={{ textTransform: 'none', px: 1.25, minWidth: 0 }}
                                                                                >
                                                                                    Usar ubicaciones
                                                                                </Button>
                                                                            </span>
                                                                        </Tooltip>
                                                                        <Tooltip title="Indicar la cantidad real contada en cada ubicación">
                                                                            <span>
                                                                                <Button
                                                                                    size="small"
                                                                                    variant="contained"
                                                                                    disabled={procesando}
                                                                                    onClick={() =>
                                                                                        setPendiente({ tipo: 'conteo', fila })
                                                                                    }
                                                                                    sx={{
                                                                                        textTransform: 'none',
                                                                                        boxShadow: 'none',
                                                                                        px: 1.25,
                                                                                        minWidth: 0,
                                                                                    }}
                                                                                >
                                                                                    Contar
                                                                                </Button>
                                                                            </span>
                                                                        </Tooltip>
                                                                    </Box>
                                                                ) : (
                                                                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                                                                        Solo lectura
                                                                    </Typography>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}

                                                {filas.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={7} sx={{ ...celdaSx, textAlign: 'center' }}>
                                                            Ningún producto coincide con la búsqueda.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>

                                    {!puedeResolver && (
                                        <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                                            Solo el administrador o el económico pueden resolver las diferencias.
                                        </Typography>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </DialogContent>

                <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', p: 2, gap: 2 }}>
                    <Button
                        onClick={() => void cargar()}
                        disabled={cargando || procesando}
                        startIcon={cargando ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                        sx={{ textTransform: 'none', color: '#9ca3af' }}
                    >
                        Actualizar
                    </Button>

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {reporte && !reporte.unificado && (
                            <Tooltip
                                title={
                                    !puedeActivar
                                        ? 'Solo el administrador puede activar el modo unificado'
                                        : !listoParaActivar
                                          ? 'Concilie todos los productos para poder activarlo'
                                          : ''
                                }
                            >
                                <span>
                                    <Button
                                        variant="contained"
                                        startIcon={<LockOpenIcon />}
                                        disabled={!puedeActivar || !listoParaActivar || procesando}
                                        onClick={() => setPendiente({ tipo: 'activar' })}
                                        sx={{
                                            background: `linear-gradient(135deg, ${VERDE}, #00b87d)`,
                                            color: '#fff',
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            boxShadow: 'none',
                                        }}
                                    >
                                        Activar modo unificado
                                    </Button>
                                </span>
                            </Tooltip>
                        )}
                        <Button
                            onClick={handleCerrar}
                            disabled={procesando}
                            variant="contained"
                            sx={{ ...botonCancelarSx, flex: 'none', minWidth: 110 }}
                        >
                            Cerrar
                        </Button>
                    </Box>
                </DialogActions>
            </Dialog>

            {pendiente?.tipo === 'usar' && (
                <ConfirmacionConciliacionDialog
                    titulo={pendiente.estrategia === 'stock_producto' ? 'Usar el stock del producto' : 'Usar las ubicaciones'}
                    textoConfirmar="Conciliar"
                    pedirObservacion
                    procesando={procesando}
                    onCancelar={() => setPendiente(null)}
                    onConfirmar={(observacion) => void confirmarUsar(pendiente.fila, pendiente.estrategia, observacion)}
                >
                    {descripcionUsar(pendiente.fila, pendiente.estrategia)}
                    <br />
                    <Typography component="span" variant="caption" sx={{ color: '#9ca3af' }}>
                        Queda registrado en el historial de conciliación (y en el Kardex si cambia el stock del producto).
                    </Typography>
                </ConfirmacionConciliacionDialog>
            )}

            {pendiente?.tipo === 'conteo' && (
                <ConteoConciliacionDialog
                    fila={pendiente.fila}
                    guardando={procesando}
                    onCancelar={() => setPendiente(null)}
                    onConfirmar={(ubicaciones, observacion) =>
                        void confirmarConteo(pendiente.fila, ubicaciones, observacion)
                    }
                />
            )}

            {pendiente?.tipo === 'activar' && (
                <ConfirmacionConciliacionDialog
                    titulo="Activar el modo unificado"
                    textoConfirmar="Activar"
                    tono="advertencia"
                    procesando={procesando}
                    onCancelar={() => setPendiente(null)}
                    onConfirmar={() => void activar()}
                >
                    Todos los productos concilian. Desde ahora las ventas, facturas y ajustes de inventario descontarán
                    de la ubicación del producto, y el stock del producto será siempre la suma de sus ubicaciones.
                    <br />
                    <br />
                    Conviene hacerlo en un momento tranquilo (sin ventas en curso). <b>Esta acción no se puede deshacer
                    desde la aplicación.</b>
                </ConfirmacionConciliacionDialog>
            )}
        </>
    );
}
