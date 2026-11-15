import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    TextField,
    Typography,
} from '@mui/material';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import { useNotify } from '../notificaciones/useNotify';
import { getErrorMessage } from '../../utils/errorMessage';
import { mensajeSinPermiso } from '../../utils/permisos';
import {
    crearDevolucion,
    etiquetaCompra,
    etiquetaFactura,
    ETIQUETA_FORMA_DEVOLUCION,
    formaPorMetodoPago,
    listarComprasDevolvibles,
    listarDevoluciones,
    listarFacturasDevolvibles,
    origenDeCompra,
    origenDeFactura,
    type CompraParaDevolucion,
    type Devolucion,
    type FacturaParaDevolucion,
    type LineaOrigenDevolucion,
    type OrigenDevolucion,
} from '../../service/devolucionApi';
import {
    botonCancelarSx,
    botonGuardarSx,
    inputSx,
    paperSx,
    tituloSx,
    tituloTextoSx,
} from '../inventario/dialogEstilos';

interface DialogProps {
    open: boolean;
    onClose: () => void;
    origen: OrigenDevolucion | null;
    /**
     * Sin `origen`, abre el paso previo para elegir el documento del que se devuelve: una factura
     * (devolución de venta) o una compra (devolución a proveedor).
     */
    elegirOrigen?: boolean;
    /** Se llama con el vale registrado. */
    onRegistrada?: (devolucion: Devolucion) => void;
}

interface FilaCantidad {
    solicitada: string;
    entregada: string;
}

const formatearMonto = (monto: number, moneda: string) =>
    `${monto.toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda}`;

/** Vale de Entrega o Devolución (SC-2-08): cantidades por línea, motivo, autorización y firma. */
export function DevolucionDialog({ open, onClose, origen, elegirOrigen = false, onRegistrada }: DialogProps) {
    // El contenido se monta solo con el diálogo abierto: cada apertura empieza con el formulario limpio.
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: paperSx } }}>
            {open && origen && <ContenidoDevolucion origen={origen} onClose={onClose} onRegistrada={onRegistrada} />}
            {open && !origen && elegirOrigen && <SelectorOrigen onClose={onClose} onRegistrada={onRegistrada} />}
        </Dialog>
    );
}

type TipoOrigenElegible = 'factura' | 'compra';

interface ListadoOrigenes {
    tipo: TipoOrigenElegible;
    facturas: FacturaParaDevolucion[];
    compras: CompraParaDevolucion[];
    error: string | null;
}

interface SelectorProps {
    onClose: () => void;
    onRegistrada?: (devolucion: Devolucion) => void;
}

type OpcionOrigen = { origen: OrigenDevolucion; texto: string };

/** Paso previo: elegir si el vale parte de una factura o de una compra a proveedor y cuál. */
function SelectorOrigen({ onClose, onRegistrada }: SelectorProps) {
    const [tipo, setTipo] = useState<TipoOrigenElegible>('factura');
    const [listado, setListado] = useState<ListadoOrigenes | null>(null);
    const [opcion, setOpcion] = useState<OpcionOrigen | null>(null);
    const [elegido, setElegido] = useState<OrigenDevolucion | null>(null);

    useEffect(() => {
        let activo = true;
        const carga =
            tipo === 'factura'
                ? listarFacturasDevolvibles().then((facturas) => ({ facturas, compras: [] as CompraParaDevolucion[] }))
                : listarComprasDevolvibles().then((compras) => ({ facturas: [] as FacturaParaDevolucion[], compras }));
        carga
            .then((datos) => {
                if (activo) setListado({ tipo, ...datos, error: null });
            })
            .catch((e: unknown) => {
                if (!activo) return;
                const mensaje = getErrorMessage(e, 'No se pudo cargar el listado de documentos.');
                setListado({
                    tipo,
                    facturas: [],
                    compras: [],
                    error: mensajeSinPermiso(mensaje),
                });
            });
        return () => {
            activo = false;
        };
    }, [tipo]);

    // Mientras no llegue la respuesta del tipo elegido se muestra "cargando".
    const cargando = listado?.tipo !== tipo;
    const opciones = useMemo<OpcionOrigen[]>(() => {
        if (!listado || listado.tipo !== tipo) return [];
        return tipo === 'factura'
            ? listado.facturas.map((f) => ({
                  origen: origenDeFactura(f),
                  texto: `${etiquetaFactura(f)} · ${f.fecha ?? ''} · ${f.cliente ?? ''}`,
              }))
            : listado.compras
                  .filter((c) => c.producto)
                  .map((c) => ({
                      origen: origenDeCompra(c),
                      texto: `${etiquetaCompra(c)} · ${c.cantidad} u.${c.fecha ? ` · ${c.fecha.slice(0, 10)}` : ''}`,
                  }));
    }, [listado, tipo]);

    if (elegido) return <ContenidoDevolucion origen={elegido} onClose={onClose} onRegistrada={onRegistrada} />;

    return (
        <>
            <DialogTitle sx={tituloSx}>
                <Typography component="span" sx={tituloTextoSx}>
                    <AssignmentReturnIcon />
                    Devolución de factura o a proveedor
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ pt: 3, display: 'grid', gap: 2 }}>
                {listado?.error && <Alert severity="error">{listado.error}</Alert>}
                <TextField
                    select
                    label="Tipo de devolución"
                    value={tipo}
                    onChange={(e) => {
                        setTipo(e.target.value as TipoOrigenElegible);
                        setOpcion(null);
                    }}
                    sx={{ ...inputSx, mt: 1 }}
                >
                    <MenuItem value="factura">Devolución de una factura (cliente)</MenuItem>
                    <MenuItem value="compra">Devolución a proveedor (compra registrada)</MenuItem>
                </TextField>
                <Autocomplete
                    options={opciones}
                    value={opcion}
                    loading={cargando}
                    onChange={(_, valor) => setOpcion(valor)}
                    getOptionLabel={(o) => o.texto}
                    isOptionEqualToValue={(a, b) => a.origen.origenRef === b.origen.origenRef}
                    noOptionsText={
                        tipo === 'factura'
                            ? 'No hay facturas confirmadas con inventario descontado.'
                            : 'No hay compras registradas.'
                    }
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={tipo === 'factura' ? 'Factura' : 'Compra'}
                            helperText={
                                tipo === 'factura'
                                    ? 'Solo se devuelve mercancía de facturas confirmadas.'
                                    : 'La mercancía sale del almacén donde quedó la compra.'
                            }
                            sx={inputSx}
                        />
                    )}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Para devolver una venta del punto de venta, elíjala en la tabla de ventas.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2, gap: 1 }}>
                <Button variant="contained" onClick={onClose} sx={botonCancelarSx}>
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    disabled={!opcion}
                    onClick={() => opcion && setElegido(opcion.origen)}
                    sx={botonGuardarSx}
                >
                    Continuar
                </Button>
            </DialogActions>
        </>
    );
}

interface ContenidoProps {
    origen: OrigenDevolucion;
    onClose: () => void;
    onRegistrada?: (devolucion: Devolucion) => void;
}

function ContenidoDevolucion({ origen, onClose, onRegistrada }: ContenidoProps) {
    const notify = useNotify();
    const [filas, setFilas] = useState<Record<string, FilaCantidad>>({});
    const [yaDevuelto, setYaDevuelto] = useState<Record<string, number>>({});
    const [cargando, setCargando] = useState(true);
    const [motivo, setMotivo] = useState('');
    const [autorizadoPor, setAutorizadoPor] = useState('');
    const [recibidoPor, setRecibidoPor] = useState('');
    const [firma, setFirma] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [registrada, setRegistrada] = useState<Devolucion | null>(null);

    // Lo ya devuelto de este origen limita lo que aún se puede devolver.
    useEffect(() => {
        let activo = true;
        listarDevoluciones({ origenRef: origen.origenRef, limite: 500 })
            .then(({ datos }) => {
                if (!activo) return;
                const acumulado: Record<string, number> = {};
                for (const d of datos) {
                    for (const l of d.lineas) {
                        acumulado[l.producto] = (acumulado[l.producto] ?? 0) + l.cantidadEntregada;
                    }
                }
                setYaDevuelto(acumulado);
            })
            .catch(() => {
                // Sin el historial el servidor igual rechaza lo que exceda lo vendido.
            })
            .finally(() => {
                if (activo) setCargando(false);
            });
        return () => {
            activo = false;
        };
    }, [origen.origenRef]);

    const restante = (l: LineaOrigenDevolucion) =>
        Math.max(0, Math.round((l.cantidad - (yaDevuelto[l.productoId] ?? 0)) * 1e6) / 1e6);

    const cambiar = (productoId: string, cambio: Partial<FilaCantidad>) =>
        setFilas((prev) => ({
            ...prev,
            [productoId]: { ...(prev[productoId] ?? { solicitada: '', entregada: '' }), ...cambio },
        }));

    const formaEsperada = useMemo(() => formaPorMetodoPago(origen.metodoPago), [origen.metodoPago]);

    const registrar = async () => {
        const lineas = [];
        for (const l of origen.lineas) {
            const fila = filas[l.productoId];
            const solicitada = fila?.solicitada === '' || !fila ? 0 : Number(fila.solicitada);
            const entregada = fila?.entregada === '' || !fila ? 0 : Number(fila.entregada);
            if (!Number.isFinite(solicitada) || !Number.isFinite(entregada) || solicitada < 0 || entregada < 0) {
                setError(`Las cantidades de "${l.nombre}" deben ser números mayores o iguales que cero.`);
                return;
            }
            if (solicitada === 0 && entregada === 0) continue;
            if (entregada > solicitada) {
                setError(`En "${l.nombre}" la cantidad entregada no puede superar la solicitada.`);
                return;
            }
            if (entregada > restante(l)) {
                setError(`En "${l.nombre}" solo se pueden devolver ${restante(l)} unidades más.`);
                return;
            }
            lineas.push({ producto: l.productoId, cantidadSolicitada: solicitada, cantidadEntregada: entregada });
        }
        if (!lineas.some((l) => l.cantidadEntregada > 0)) {
            setError('Indique la cantidad entregada de al menos un producto.');
            return;
        }
        if (!motivo.trim() || !autorizadoPor.trim() || !recibidoPor.trim() || !firma.trim()) {
            setError('El motivo, quién autoriza, quién recibe y la firma son obligatorios.');
            return;
        }

        setGuardando(true);
        setError(null);
        try {
            const vale = await crearDevolucion({
                tipo: origen.tipo,
                origenTipo: origen.origenTipo,
                origenRef: origen.origenRef,
                motivo: motivo.trim(),
                lineas,
                autorizadoPor: autorizadoPor.trim(),
                recibidoPor: recibidoPor.trim(),
                firma: firma.trim(),
            });
            notify.success(`Devolución ${vale.numeroConsecutivo} registrada.`);
            setRegistrada(vale);
            onRegistrada?.(vale);
        } catch (e) {
            setError(getErrorMessage(e, 'No se pudo registrar la devolución.'));
        } finally {
            setGuardando(false);
        }
    };

    if (registrada) {
        return (
            <>
                <DialogTitle sx={tituloSx}>
                    <Typography component="span" sx={tituloTextoSx}>
                        <AssignmentReturnIcon />
                        Devolución {registrada.numeroConsecutivo}
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: 3, display: 'grid', gap: 1.5 }}>
                    <Alert severity="success">El stock se repuso y el vale quedó registrado.</Alert>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Importe devuelto: <strong>{formatearMonto(registrada.montoDevuelto, registrada.moneda)}</strong>
                    </Typography>
                    {registrada.formaDevolucionDinero && (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Forma de devolución del dinero:{' '}
                            <strong>{ETIQUETA_FORMA_DEVOLUCION[registrada.formaDevolucionDinero]}</strong>
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button variant="contained" onClick={onClose} sx={botonGuardarSx}>
                        Cerrar
                    </Button>
                </DialogActions>
            </>
        );
    }

    return (
        <>
            <DialogTitle sx={tituloSx}>
                <Typography component="span" sx={tituloTextoSx}>
                    <AssignmentReturnIcon />
                    Devolver mercancía de {origen.etiqueta}
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ pt: 3, display: 'grid', gap: 2 }}>
                {error && <Alert severity="error">{error}</Alert>}

                {origen.tipo === 'proveedor' && (
                    <Alert severity="info">
                        Devolución a proveedor: la mercancía sale del almacén donde quedó la compra y no lleva forma de
                        devolución de dinero.
                    </Alert>
                )}

                {formaEsperada && (
                    <Alert severity="info">
                        Según el pago original, el dinero se devuelve como{' '}
                        <strong>{ETIQUETA_FORMA_DEVOLUCION[formaEsperada]}</strong>. El importe y la forma definitiva
                        los calcula el servidor.
                    </Alert>
                )}

                <Box sx={{ display: 'grid', gap: 1 }}>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr 1fr', sm: '2fr 1fr 1fr 1fr' },
                            gap: 1,
                            color: 'text.secondary',
                        }}
                    >
                        <Typography variant="caption">Producto</Typography>
                        <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'block' } }}>
                            Se puede devolver
                        </Typography>
                        <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'block' } }}>
                            Solicitada
                        </Typography>
                        <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'block' } }}>
                            Entregada
                        </Typography>
                    </Box>

                    {cargando ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : (
                        origen.lineas.map((l) => {
                            const fila = filas[l.productoId] ?? { solicitada: '', entregada: '' };
                            const tope = restante(l);
                            return (
                                <Box
                                    key={l.productoId}
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr 1fr', sm: '2fr 1fr 1fr 1fr' },
                                        gap: 1,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Typography variant="body2">{l.nombre}</Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        {tope} de {l.cantidad}
                                    </Typography>
                                    <TextField
                                        size="small"
                                        type="number"
                                        label="Solicitada"
                                        value={fila.solicitada}
                                        disabled={tope === 0}
                                        onChange={(e) => cambiar(l.productoId, { solicitada: e.target.value })}
                                        slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                                        sx={inputSx}
                                    />
                                    <TextField
                                        size="small"
                                        type="number"
                                        label="Entregada"
                                        value={fila.entregada}
                                        disabled={tope === 0}
                                        onChange={(e) => cambiar(l.productoId, { entregada: e.target.value })}
                                        slotProps={{ htmlInput: { min: 0, max: tope, step: 'any' } }}
                                        sx={inputSx}
                                    />
                                </Box>
                            );
                        })
                    )}
                </Box>

                <TextField
                    label="Motivo de la devolución"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    required
                    fullWidth
                    multiline
                    minRows={2}
                    sx={inputSx}
                />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField
                        label="Autorizado por"
                        value={autorizadoPor}
                        onChange={(e) => setAutorizadoPor(e.target.value)}
                        required
                        sx={inputSx}
                    />
                    <TextField
                        label="Recibido por"
                        value={recibidoPor}
                        onChange={(e) => setRecibidoPor(e.target.value)}
                        required
                        sx={inputSx}
                    />
                </Box>
                <TextField
                    label="Firma (nombre de quien acepta el vale)"
                    value={firma}
                    onChange={(e) => setFirma(e.target.value)}
                    required
                    fullWidth
                    sx={inputSx}
                />
            </DialogContent>

            <DialogActions sx={{ p: 2, gap: 1 }}>
                <Button variant="contained" onClick={onClose} disabled={guardando} sx={botonCancelarSx}>
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    onClick={() => void registrar()}
                    disabled={guardando || cargando}
                    startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : undefined}
                    sx={botonGuardarSx}
                >
                    Registrar devolución
                </Button>
            </DialogActions>
        </>
    );
}
