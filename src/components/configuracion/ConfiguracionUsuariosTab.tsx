import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Card,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    InputAdornment,
    MenuItem,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

import ModulosUsuarioDialog from './ModulosUsuarioDialog';
import { useNotify } from '../notificaciones/useNotify';
import { useAuth } from '../../context/authContext';
import { getErrorMessage } from '../../utils/errorMessage';
import { usuariosApi } from '../../service/usuariosApi';
import {
    MODULOS,
    ROLES,
    ROL_ADMIN,
    etiquetaRol,
    type ModuloApp,
    type UsuarioBackend,
    type UsuarioRol,
} from '../../types/usuarios.types';

const CONTRASEÑA_MIN = 6;

/** Usuario cuyos módulos se están editando desde la lista. */
interface EdicionModulos {
    usuario: UsuarioBackend;
}

export default function ConfiguracionUsuariosTab(): React.JSX.Element {
    const notify = useNotify();
    const { usuario: sesion, refrescar } = useAuth();

    const [usuarios, setUsuarios] = useState<UsuarioBackend[]>([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    // ── Formulario ──
    const [nombre, setNombre] = useState('');
    const [contraseña, setContraseña] = useState('');
    const [confirmar, setConfirmar] = useState('');
    const [verContraseña, setVerContraseña] = useState(false);
    const [rol, setRol] = useState<UsuarioRol | ''>('');
    const [modulos, setModulos] = useState<ModuloApp[]>([]);
    const [dialogModulosNuevo, setDialogModulosNuevo] = useState(false);
    const [intento, setIntento] = useState(false);

    // ── Lista ──
    const [edicion, setEdicion] = useState<EdicionModulos | null>(null);
    const [aEliminar, setAEliminar] = useState<UsuarioBackend | null>(null);

    const cargarUsuarios = useCallback(async (): Promise<void> => {
        try {
            setUsuarios(await usuariosApi.getAll());
        } catch (error: unknown) {
            notify.error(getErrorMessage(error, 'No se pudieron cargar los usuarios'));
        } finally {
            setCargando(false);
        }
    }, [notify]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void cargarUsuarios();
    }, [cargarUsuarios]);

    const esAdminForm = rol === ROL_ADMIN;

    const errores = useMemo(() => {
        const e: { nombre?: string; contraseña?: string; confirmar?: string; rol?: string; modulos?: string } = {};
        if (nombre.trim().length < 2) e.nombre = 'Mínimo 2 caracteres';
        if (contraseña.length < CONTRASEÑA_MIN) e.contraseña = `Mínimo ${CONTRASEÑA_MIN} caracteres`;
        if (confirmar !== contraseña) e.confirmar = 'Las contraseñas no coinciden';
        if (!rol) e.rol = 'Seleccione un rol';
        if (rol && rol !== ROL_ADMIN && modulos.length === 0) {
            e.modulos = 'Asigne al menos un módulo';
        }
        return e;
    }, [nombre, contraseña, confirmar, rol, modulos]);

    const verError = (campo: keyof typeof errores): string | undefined => (intento ? errores[campo] : undefined);

    const limpiar = (): void => {
        setNombre('');
        setContraseña('');
        setConfirmar('');
        setRol('');
        setModulos([]);
        setIntento(false);
    };

    const crearUsuario = async (): Promise<void> => {
        setIntento(true);
        if (Object.keys(errores).length > 0) {
            notify.warning(errores.confirmar ?? 'Revise los campos marcados antes de crear el usuario.');
            return;
        }
        setGuardando(true);
        try {
            await usuariosApi.crear({
                nombre: nombre.trim(),
                contraseña,
                rol: rol as UsuarioRol,
                modulos: esAdminForm ? [] : modulos,
            });
            notify.success(`Usuario "${nombre.trim()}" creado correctamente.`);
            limpiar();
            await cargarUsuarios();
        } catch (error: unknown) {
            notify.error(getErrorMessage(error, 'No se pudo crear el usuario'));
        } finally {
            setGuardando(false);
        }
    };

    const guardarModulos = async (nuevos: ModuloApp[]): Promise<void> => {
        if (!edicion) return;
        setGuardando(true);
        try {
            await usuariosApi.actualizar(edicion.usuario._id, { modulos: nuevos });
            notify.success(`Accesos de "${edicion.usuario.nombre}" actualizados.`);
            if (sesion && sesion.id === edicion.usuario._id) await refrescar();
            setEdicion(null);
            await cargarUsuarios();
        } catch (error: unknown) {
            notify.error(getErrorMessage(error, 'No se pudieron actualizar los accesos'));
        } finally {
            setGuardando(false);
        }
    };

    const eliminar = async (): Promise<void> => {
        if (!aEliminar) return;
        setGuardando(true);
        try {
            await usuariosApi.eliminar(aEliminar._id);
            notify.success(`Usuario "${aEliminar.nombre}" eliminado.`);
            setAEliminar(null);
            await cargarUsuarios();
        } catch (error: unknown) {
            notify.error(getErrorMessage(error, 'No se pudo eliminar el usuario'));
        } finally {
            setGuardando(false);
        }
    };

    const textoModulos = esAdminForm
        ? 'Acceso total (administrador)'
        : modulos.length === 0
          ? 'Asignar acceso a módulos'
          : `Módulos asignados: ${modulos.length} de ${MODULOS.length}`;

    return (
        <Box sx={{ width: '100%', px: 2, pt: 2 }}>
            <Card sx={{ width: '100%', p: 2, borderRadius: 2 }}>
                {/* ── Cabecera ── */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 3 }}>
                    <PersonIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Usuarios
                    </Typography>
                    <Chip size="small" label={usuarios.length} color="primary" variant="outlined" />
                </Box>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: 'minmax(300px, 340px) minmax(320px, 520px)' },
                        justifyContent: 'center',
                        alignItems: 'start',
                        gap: { xs: 4, md: 5 },
                    }}
                >
                    {/* ── Formulario ── */}
                    <Box component="form" noValidate onSubmit={(e) => { e.preventDefault(); void crearUsuario(); }}>
                        <Typography sx={{ mb: 1.5, fontWeight: 600, textAlign: 'center' }}>Nuevo usuario</Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <TextField
                                size="small"
                                label="Nombre del usuario"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                autoComplete="off"
                                disabled={guardando}
                                error={!!verError('nombre')}
                                helperText={verError('nombre')}
                            />

                            <TextField
                                size="small"
                                label="Contraseña"
                                type={verContraseña ? 'text' : 'password'}
                                value={contraseña}
                                onChange={(e) => setContraseña(e.target.value)}
                                autoComplete="new-password"
                                disabled={guardando}
                                error={!!verError('contraseña')}
                                helperText={verError('contraseña')}
                                slotProps={{
                                    input: {
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    size="small"
                                                    edge="end"
                                                    onClick={() => setVerContraseña((v) => !v)}
                                                    aria-label="Mostrar u ocultar contraseña"
                                                >
                                                    {verContraseña ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                            />

                            <TextField
                                size="small"
                                label="Confirmar contraseña"
                                type={verContraseña ? 'text' : 'password'}
                                value={confirmar}
                                onChange={(e) => setConfirmar(e.target.value)}
                                autoComplete="new-password"
                                disabled={guardando}
                                error={!!verError('confirmar')}
                                helperText={verError('confirmar')}
                            />

                            <TextField
                                select
                                size="small"
                                label="Rol u ocupación"
                                value={rol}
                                onChange={(e) => setRol(e.target.value as UsuarioRol)}
                                disabled={guardando}
                                error={!!verError('rol')}
                                helperText={verError('rol')}
                            >
                                {ROLES.map((r) => (
                                    <MenuItem key={r.value} value={r.value}>
                                        {r.label}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <Box>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<LockOpenIcon />}
                                    onClick={() => setDialogModulosNuevo(true)}
                                    disabled={guardando || !rol}
                                    color={verError('modulos') ? 'error' : 'primary'}
                                    sx={{ textTransform: 'none' }}
                                >
                                    {textoModulos}
                                </Button>
                                <Typography
                                    variant="caption"
                                    color={verError('modulos') ? 'error' : 'text.secondary'}
                                    sx={{ display: 'block', mt: 0.5, px: 0.5 }}
                                >
                                    {verError('modulos') ??
                                        (rol
                                            ? 'Defina a qué módulos podrá entrar este usuario.'
                                            : 'Elija primero el rol del usuario.')}
                                </Typography>
                            </Box>

                            <Button
                                type="submit"
                                variant="contained"
                                disabled={guardando}
                                startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <PersonAddIcon />}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                {guardando ? 'Guardando…' : 'Crear usuario'}
                            </Button>
                        </Box>
                    </Box>

                    {/* ── Lista ── */}
                    <Box>
                        <Typography sx={{ mb: 1.5, fontWeight: 600, textAlign: 'center' }}>Usuarios registrados</Typography>

                        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                            {cargando ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                    <CircularProgress size={24} />
                                </Box>
                            ) : usuarios.length === 0 ? (
                                <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center', fontSize: '0.85rem' }}>
                                    No hay usuarios registrados.
                                </Typography>
                            ) : (
                                usuarios.map((u) => {
                                    const esYo = sesion?.id === u._id;
                                    return (
                                        <Box
                                            key={u._id}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                px: 1.5,
                                                py: 1,
                                                borderBottom: '1px solid',
                                                borderColor: 'divider',
                                                '&:last-child': { borderBottom: 'none' },
                                            }}
                                        >
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.88rem' }}>
                                                    {u.nombre}
                                                    {esYo ? ' (usted)' : ''}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {u.rol === ROL_ADMIN
                                                        ? 'Todos los módulos'
                                                        : `${u.modulos.length} de ${MODULOS.length} módulos`}
                                                </Typography>
                                            </Box>

                                            <Chip size="small" label={etiquetaRol(u.rol)} color={u.rol === ROL_ADMIN ? 'primary' : 'default'} />

                                            <Tooltip title={u.rol === ROL_ADMIN ? 'Ver accesos' : 'Editar accesos a módulos'}>
                                                <IconButton size="small" onClick={() => setEdicion({ usuario: u })} disabled={guardando}>
                                                    <LockOpenIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={esYo ? 'No puede eliminar su propia cuenta' : 'Eliminar usuario'}>
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => setAEliminar(u)}
                                                        disabled={guardando || esYo}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>
                                    );
                                })
                            )}
                        </Box>
                    </Box>
                </Box>
            </Card>

            {/* Módulos del usuario que se está creando */}
            <ModulosUsuarioDialog
                open={dialogModulosNuevo}
                onClose={() => setDialogModulosNuevo(false)}
                usuario={nombre.trim() || undefined}
                value={modulos}
                esAdministrador={esAdminForm}
                onAceptar={(seleccion) => {
                    setModulos(seleccion);
                    setDialogModulosNuevo(false);
                }}
            />

            {/* Módulos de un usuario ya creado */}
            <ModulosUsuarioDialog
                open={edicion !== null}
                onClose={() => setEdicion(null)}
                usuario={edicion?.usuario.nombre}
                value={edicion?.usuario.modulos ?? []}
                esAdministrador={edicion?.usuario.rol === ROL_ADMIN}
                guardando={guardando}
                onAceptar={(seleccion) => {
                    if (edicion?.usuario.rol === ROL_ADMIN) setEdicion(null);
                    else void guardarModulos(seleccion);
                }}
            />

            {/* Confirmar eliminación */}
            <Dialog open={aEliminar !== null} onClose={guardando ? undefined : () => setAEliminar(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Eliminar usuario</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Eliminar a <strong>{aEliminar?.nombre}</strong>? Esta acción no se puede deshacer.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setAEliminar(null)} disabled={guardando} sx={{ textTransform: 'none' }}>
                        Cancelar
                    </Button>
                    <Button color="error" variant="contained" onClick={() => void eliminar()} disabled={guardando} sx={{ textTransform: 'none' }}>
                        Eliminar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
