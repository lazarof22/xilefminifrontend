import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Autocomplete,
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
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useNotify } from '../notificaciones/useNotify';
import { useAuth } from '../../context/authContext';
import { getErrorMessage } from '../../utils/errorMessage';
import { mensajeSinPermiso, puedeEditarNomencladoresPago } from '../../utils/permisos';
import { bancoApi, normalizarPrefijo, PATRON_PREFIJO_TARJETA, type Banco } from '../../service/bancoApi';

const tarjetaSx = { borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'background.paper', mb: 2 };
const tituloSx = { color: 'primary.main', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 };
const celdaSx = { borderColor: 'divider', color: 'text.primary' };
const cabeceraSx = { borderColor: 'divider', color: 'text.secondary', fontWeight: 600 };

const CODIGO_VALIDO = /^[A-Z0-9_-]{2,20}$/;

/** Mensaje para el usuario de un error del servidor, con el 403 explicado en claro. */
const mensajeDe = (error: unknown, fallback: string): string => mensajeSinPermiso(getErrorMessage(error, fallback));

interface DialogProps {
    /** Banco que se edita, o `null` para crear uno nuevo. */
    banco: Banco | null;
    onClose: () => void;
    onGuardado: () => Promise<void>;
}

/** Alta y edición de un banco con sus prefijos de tarjeta. */
function BancoDialog({ banco, onClose, onGuardado }: DialogProps) {
    const notify = useNotify();
    const [codigo, setCodigo] = useState(banco?.codigo ?? '');
    const [nombre, setNombre] = useState(banco?.nombre ?? '');
    const [prefijos, setPrefijos] = useState<string[]>(banco?.prefijosTarjeta ?? []);
    const [activo, setActivo] = useState(banco?.activo ?? true);
    const [intento, setIntento] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const codigoLimpio = codigo.trim().toUpperCase();
    const prefijosInvalidos = prefijos.filter((p) => !PATRON_PREFIJO_TARJETA.test(p));
    const hayError = !CODIGO_VALIDO.test(codigoLimpio) || !nombre.trim() || prefijosInvalidos.length > 0;

    const guardar = async () => {
        setIntento(true);
        if (hayError) return;
        setGuardando(true);
        setError(null);
        try {
            const datos = { codigo: codigoLimpio, nombre: nombre.trim(), prefijosTarjeta: prefijos, activo };
            if (banco) await bancoApi.actualizar(banco._id, datos);
            else await bancoApi.crear(datos);
            notify.success(banco ? 'Banco actualizado' : 'Banco creado');
            await onGuardado();
            onClose();
        } catch (e) {
            setError(mensajeDe(e, 'No se pudo guardar el banco'));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Dialog open onClose={guardando ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{banco ? `Editar banco ${banco.codigo}` : 'Nuevo banco'}</DialogTitle>
            <DialogContent sx={{ display: 'grid', gap: 2, pt: '16px !important' }}>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField
                    size="small"
                    label="Código *"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    disabled={guardando}
                    error={intento && !CODIGO_VALIDO.test(codigoLimpio)}
                    helperText="De 2 a 20 letras, números, guiones o guion bajo (BPA, BANDEC, BM...)"
                />
                <TextField
                    size="small"
                    label="Nombre *"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    disabled={guardando}
                    error={intento && !nombre.trim()}
                />
                <Autocomplete
                    multiple
                    freeSolo
                    options={[] as string[]}
                    value={prefijos}
                    disabled={guardando}
                    onChange={(_, valores) => {
                        const normalizados = valores.map((v) => normalizarPrefijo(v)).filter((v) => v.length > 0);
                        setPrefijos(Array.from(new Set(normalizados)));
                    }}
                    renderValue={(valores, getItemProps) =>
                        valores.map((valor, index) => {
                            const { key, ...props } = getItemProps({ index });
                            return (
                                <Chip
                                    key={key}
                                    size="small"
                                    label={valor}
                                    color={PATRON_PREFIJO_TARJETA.test(valor) ? 'default' : 'error'}
                                    {...props}
                                />
                            );
                        })
                    }
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            size="small"
                            label="Prefijos de tarjeta"
                            error={prefijosInvalidos.length > 0}
                            helperText={
                                prefijosInvalidos.length > 0
                                    ? 'Cada prefijo lleva de 1 a 19 caracteres: dígitos o ? (cualquier dígito)'
                                    : 'Escriba un prefijo y pulse Enter. Ej.: 92250699 o ????0699. Solo generan un aviso al cobrar.'
                            }
                        />
                    )}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Switch checked={activo} onChange={(e) => setActivo(e.target.checked)} disabled={guardando} />
                    <Typography variant="body2">Activo (se puede elegir al cobrar)</Typography>
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

/** Nomenclador de bancos: lista, alta, edición y (des)activación con sus prefijos de tarjeta. */
export default function ConfiguracionBancosTab(): React.JSX.Element {
    const notify = useNotify();
    const { usuario } = useAuth();
    const puedeEditar = puedeEditarNomencladoresPago(usuario?.rol);

    const [cargando, setCargando] = useState(true);
    const [errorCarga, setErrorCarga] = useState<string | null>(null);
    const [bancos, setBancos] = useState<Banco[]>([]);
    const [editando, setEditando] = useState<Banco | null | undefined>(undefined);
    const [cambiandoId, setCambiandoId] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        try {
            const datos = await bancoApi.listar();
            setBancos([...datos].sort((a, b) => a.codigo.localeCompare(b.codigo, 'es')));
            setErrorCarga(null);
        } catch (e) {
            setErrorCarga(mensajeDe(e, 'No se pudieron cargar los bancos'));
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        // Se difiere a una microtarea para no actualizar el estado de forma síncrona dentro del efecto.
        void Promise.resolve().then(cargar);
    }, [cargar]);

    const alternarActivo = async (banco: Banco) => {
        setCambiandoId(banco._id);
        try {
            await bancoApi.actualizar(banco._id, { activo: !banco.activo });
            notify.success(banco.activo ? `${banco.codigo} desactivado` : `${banco.codigo} activado`);
            await cargar();
        } catch (e) {
            notify.error(mensajeDe(e, 'No se pudo cambiar el estado del banco'));
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
                        <AccountBalanceIcon /> Bancos
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, mb: 2 }}>
                        Bancos disponibles en los cobros por transferencia. Los prefijos de tarjeta solo generan un
                        aviso al cobrar, nunca bloquean.
                    </Typography>
                    {errorCarga && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {errorCarga}
                        </Alert>
                    )}
                    {!puedeEditar && (
                        <Typography variant="body2" sx={{ color: 'warning.main', mb: 2 }}>
                            Solo administrador y gerente pueden modificar los bancos.
                        </Typography>
                    )}
                    <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        disabled={!puedeEditar}
                        onClick={() => setEditando(null)}
                    >
                        Nuevo banco
                    </Button>

                    <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ mt: 2 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={cabeceraSx}>Código</TableCell>
                                    <TableCell sx={cabeceraSx}>Nombre</TableCell>
                                    <TableCell sx={cabeceraSx}>Prefijos de tarjeta</TableCell>
                                    <TableCell sx={cabeceraSx} align="center">
                                        Activo
                                    </TableCell>
                                    <TableCell sx={cabeceraSx} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {bancos.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} sx={{ ...celdaSx, color: 'text.secondary' }}>
                                            Sin bancos registrados.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {bancos.map((b) => (
                                    <TableRow key={b._id}>
                                        <TableCell sx={celdaSx}>{b.codigo}</TableCell>
                                        <TableCell sx={celdaSx}>{b.nombre}</TableCell>
                                        <TableCell sx={celdaSx}>
                                            {b.prefijosTarjeta.length === 0 ? (
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                    Sin prefijos (no se valida la tarjeta)
                                                </Typography>
                                            ) : (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    {b.prefijosTarjeta.map((p) => (
                                                        <Chip key={p} size="small" variant="outlined" label={p} />
                                                    ))}
                                                </Box>
                                            )}
                                        </TableCell>
                                        <TableCell sx={celdaSx} align="center">
                                            <Switch
                                                checked={b.activo}
                                                onChange={() => void alternarActivo(b)}
                                                disabled={!puedeEditar || cambiandoId === b._id}
                                            />
                                        </TableCell>
                                        <TableCell sx={celdaSx} align="right">
                                            <Tooltip title="Editar banco">
                                                <span>
                                                    <IconButton disabled={!puedeEditar} onClick={() => setEditando(b)}>
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
                <BancoDialog banco={editando} onClose={() => setEditando(undefined)} onGuardado={cargar} />
            )}
        </Box>
    );
}
