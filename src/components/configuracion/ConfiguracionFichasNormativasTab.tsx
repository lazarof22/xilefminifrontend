import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { getErrorMessage } from '../../utils/errorMessage';
import { mensajeSinPermiso } from '../../utils/permisos';
import { fichasNormativasApi, type FichaNormativa } from '../../service/fichasNormativasApi';

const tarjetaSx = { borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'background.paper', mb: 2 };
const tituloSx = { color: 'primary.main', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 };
const celdaSx = { borderColor: 'divider', color: 'text.primary', verticalAlign: 'top' };
const cabeceraSx = { borderColor: 'divider', color: 'text.secondary', fontWeight: 600 };

const ListaChips = ({ valores }: { valores: string[] }) =>
    valores.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            —
        </Typography>
    ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {valores.map((v) => (
                <Chip key={v} size="small" variant="outlined" label={v} />
            ))}
        </Box>
    );

/** Vista de solo lectura de las fichas normativas de los documentos que produce el sistema. */
export default function ConfiguracionFichasNormativasTab(): React.JSX.Element {
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fichas, setFichas] = useState<FichaNormativa[]>([]);

    const cargar = useCallback(async () => {
        try {
            setFichas(await fichasNormativasApi.listar());
            setError(null);
        } catch (e) {
            setError(mensajeSinPermiso(getErrorMessage(e, 'No se pudieron cargar las fichas normativas')));
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        // Se difiere a una microtarea para no actualizar el estado de forma síncrona dentro del efecto.
        void Promise.resolve().then(cargar);
    }, [cargar]);

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
                        <FactCheckIcon /> Fichas normativas
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, mb: 2 }}>
                        Norma, regla de numeración, campos obligatorios y firmas de cada documento. Solo lectura.
                    </Typography>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={cabeceraSx}>Código</TableCell>
                                    <TableCell sx={cabeceraSx}>Documento</TableCell>
                                    <TableCell sx={cabeceraSx}>Norma</TableCell>
                                    <TableCell sx={cabeceraSx}>Numeración</TableCell>
                                    <TableCell sx={cabeceraSx}>Campos obligatorios</TableCell>
                                    <TableCell sx={cabeceraSx}>Firmas</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {fichas.length === 0 && !error && (
                                    <TableRow>
                                        <TableCell colSpan={6} sx={{ ...celdaSx, color: 'text.secondary' }}>
                                            No hay fichas normativas.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {fichas.map((f) => (
                                    <TableRow key={f.codigo}>
                                        <TableCell sx={celdaSx}>{f.codigo}</TableCell>
                                        <TableCell sx={celdaSx}>{f.nombre}</TableCell>
                                        <TableCell sx={celdaSx}>{f.norma}</TableCell>
                                        <TableCell sx={celdaSx}>
                                            <Typography variant="body2">{f.numeracion.formato}</Typography>
                                            {f.numeracion.ejemplo && (
                                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                    Ej.: {f.numeracion.ejemplo}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell sx={celdaSx}>
                                            <ListaChips valores={f.camposObligatorios} />
                                        </TableCell>
                                        <TableCell sx={celdaSx}>
                                            <ListaChips valores={f.firmas} />
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
