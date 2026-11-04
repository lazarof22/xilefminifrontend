import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    MenuItem,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getErrorMessage } from '../../utils/errorMessage';
import {
    ETIQUETA_FORMA_DEVOLUCION,
    listarDevoluciones,
    type Devolucion,
    type FormaDevolucionDinero,
} from '../../service/devolucionApi';

const COLOR_FORMA: Record<FormaDevolucionDinero, 'success' | 'info' | 'warning'> = {
    efectivo: 'success',
    nota_credito: 'info',
    descuenta_deuda: 'warning',
};

const FILAS_POR_PAGINA = 10;

interface Props {
    /** Cambiar este valor recarga el listado (por ejemplo tras registrar una devolución). */
    refreshKey?: number;
}

/** Listado de vales de devolución, con filtro por forma de dinero y fechas (útil para el cuadre de caja). */
export default function DevolucionesTab({ refreshKey = 0 }: Props) {
    const [forma, setForma] = useState<FormaDevolucionDinero | ''>('');
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');
    const [pagina, setPagina] = useState(0);
    const [recarga, setRecarga] = useState(0);
    const [resultado, setResultado] = useState<{
        clave: string;
        datos: Devolucion[];
        total: number;
        error: string | null;
    } | null>(null);

    // Cada combinación de filtros/recarga tiene su clave; mientras no llegue su
    // respuesta se muestra "cargando" sin necesidad de marcarlo en el efecto.
    const clave = JSON.stringify([forma, desde, hasta, pagina, refreshKey, recarga]);
    const cargando = resultado?.clave !== clave;
    const datos = resultado?.datos ?? [];
    const total = resultado?.total ?? 0;
    const error = resultado?.error ?? null;

    useEffect(() => {
        let activo = true;
        listarDevoluciones({
            formaDevolucionDinero: forma || undefined,
            desde: desde || undefined,
            hasta: hasta || undefined,
            pagina: pagina + 1,
            limite: FILAS_POR_PAGINA,
        })
            .then((res) => {
                if (activo) setResultado({ clave, datos: res.datos, total: res.total, error: null });
            })
            .catch((e: unknown) => {
                if (activo) {
                    setResultado({
                        clave,
                        datos: [],
                        total: 0,
                        error: getErrorMessage(e, 'No se pudieron cargar las devoluciones.'),
                    });
                }
            });
        return () => {
            activo = false;
        };
    }, [clave, forma, desde, hasta, pagina]);

    return (
        <Card sx={{ width: '100%', mt: 2 }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">Devoluciones registradas ({total})</Typography>
                    <Button size="small" onClick={() => setRecarga((n) => n + 1)} startIcon={<RefreshIcon />}>
                        Recargar
                    </Button>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                    <TextField
                        select
                        size="small"
                        label="Forma de devolución del dinero"
                        value={forma}
                        onChange={(e) => {
                            setForma(e.target.value as FormaDevolucionDinero | '');
                            setPagina(0);
                        }}
                        sx={{ minWidth: 240 }}
                    >
                        <MenuItem value="">Todas</MenuItem>
                        {(Object.keys(ETIQUETA_FORMA_DEVOLUCION) as FormaDevolucionDinero[]).map((f) => (
                            <MenuItem key={f} value={f}>
                                {ETIQUETA_FORMA_DEVOLUCION[f]}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        size="small"
                        type="date"
                        label="Desde"
                        value={desde}
                        onChange={(e) => {
                            setDesde(e.target.value);
                            setPagina(0);
                        }}
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <TextField
                        size="small"
                        type="date"
                        label="Hasta"
                        value={hasta}
                        onChange={(e) => {
                            setHasta(e.target.value);
                            setPagina(0);
                        }}
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {cargando ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress />
                    </Box>
                ) : datos.length === 0 && !error ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}>
                        No hay devoluciones para el filtro seleccionado.
                    </Typography>
                ) : (
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Vale</TableCell>
                                    <TableCell>Fecha</TableCell>
                                    <TableCell>Tipo</TableCell>
                                    <TableCell>Origen</TableCell>
                                    <TableCell>Motivo</TableCell>
                                    <TableCell>Dinero</TableCell>
                                    <TableCell align="right">Importe</TableCell>
                                    <TableCell>Autorizado por</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {datos.map((d) => (
                                    <TableRow key={d._id} hover>
                                        <TableCell sx={{ fontWeight: 600 }}>{d.numeroConsecutivo}</TableCell>
                                        <TableCell>{new Date(d.fecha).toLocaleString('es-CU')}</TableCell>
                                        <TableCell>{d.tipo === 'venta' ? 'De venta' : 'A proveedor'}</TableCell>
                                        <TableCell>
                                            {d.origenTipo.replace('_', ' ')} {d.origenRef.slice(-6).toUpperCase()}
                                        </TableCell>
                                        <TableCell>{d.motivo}</TableCell>
                                        <TableCell>
                                            {d.formaDevolucionDinero ? (
                                                <Chip
                                                    size="small"
                                                    variant="outlined"
                                                    color={COLOR_FORMA[d.formaDevolucionDinero]}
                                                    label={ETIQUETA_FORMA_DEVOLUCION[d.formaDevolucionDinero]}
                                                />
                                            ) : (
                                                '—'
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            {d.montoDevuelto.toFixed(2)} {d.moneda}
                                        </TableCell>
                                        <TableCell>{d.autorizadoPor}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <TablePagination
                            component="div"
                            count={total}
                            page={pagina}
                            rowsPerPage={FILAS_POR_PAGINA}
                            rowsPerPageOptions={[FILAS_POR_PAGINA]}
                            onPageChange={(_, p) => setPagina(p)}
                            labelRowsPerPage="Filas"
                        />
                    </TableContainer>
                )}
            </CardContent>
        </Card>
    );
}
