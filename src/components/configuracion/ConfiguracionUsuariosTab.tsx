import { useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    TextField,
    MenuItem,
    Button,
    Chip,
    IconButton,
    Tooltip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useNotify } from '../notificaciones/useNotify';
import { getErrorMessage } from '../../utils/errorMessage';
import type { CrearUsuarioDto, UsuarioBackend, UsuarioRol } from '../../service/configuracionApi';

// ─── Tipos ─────────────────────────────────────────────

interface ConfiguracionUsuariosTabProps {
    usuarios: UsuarioBackend[];
    loading: boolean;
    // Deben lanzar un Error con el mensaje a mostrar si fallan
    agregarUsuario: (dto: CrearUsuarioDto) => Promise<void>;
    eliminarUsuario: (id: string) => Promise<void>;
}

interface UsuarioForm {
    nombre: string;
    correo: string;
    ci: string;
    departamento: string;
    cargo: string;
    salario: string;
    rol: UsuarioRol;
    contrasena: string;
}

const ROLES: { value: UsuarioRol; label: string }[] = [
    { value: 'administrador', label: 'Administrador' },
    { value: 'jefe', label: 'Jefe' },
    { value: 'facturador', label: 'Facturador' },
    { value: 'cajero', label: 'Cajero' },
    { value: 'empleado', label: 'Empleado' },
];

const initialForm: UsuarioForm = {
    nombre: '',
    correo: '',
    ci: '',
    departamento: '',
    cargo: '',
    salario: '',
    rol: 'empleado',
    contrasena: '',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Estilos ───────────────────────────────────────────

const cardSx = {
    borderRadius: 3,
    border: '1px solid rgba(255,255,255,0.04)',
    bgcolor: '#151a19',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
    overflow: 'hidden',
    m: 1,
    mb: 2,
};

const inputSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 1,
        bgcolor: 'rgba(255,255,255,0.03)',
        color: '#e8f5f0',
        '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
        '&:hover fieldset': { borderColor: 'rgba(0,229,160,0.35)' },
        '&.Mui-focused fieldset': { borderColor: '#00e5a0' },
    },
    '& .MuiInputLabel-root': { color: '#9ca3af' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#00e5a0' },
    '& .MuiSelect-icon': { color: '#9ca3af' },
};

const menuProps = {
    slotProps: { paper: { sx: { bgcolor: '#151a19', color: '#e8f5f0' } } },
};

const greenButtonSx = {
    background: 'linear-gradient(135deg, #00e5a0, #00b87d)',
    color: '#fff',
    textTransform: 'none',
    fontWeight: 600,
    boxShadow: '0 4px 12px rgba(0,229,160,0.20)',
};

const redButtonSx = {
    flex: 1,
    background: 'linear-gradient(135deg, #f80000 0%, #ec0163 100%)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#b8b9bb',
    boxShadow: 'none',
    '&:hover': {
        background: 'linear-gradient(135deg, #f80000 0%, #ec0163 100%)',
        color: '#faf7f7',
        boxShadow: 'none',
    },
};

const headCellSx = {
    color: '#9ca3af',
    fontWeight: 700,
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    bgcolor: '#0f1312',
};

const bodyCellSx = {
    color: '#e8f5f0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
};

// ─── Componente ──────────────────────────────────────

export default function ConfiguracionUsuariosTab({
    usuarios,
    loading,
    agregarUsuario,
    eliminarUsuario,
}: ConfiguracionUsuariosTabProps) {
    const notify = useNotify();
    const [form, setForm] = useState<UsuarioForm>(initialForm);
    const [guardando, setGuardando] = useState(false);
    const [usuarioAEliminar, setUsuarioAEliminar] = useState<UsuarioBackend | null>(null);
    const [eliminando, setEliminando] = useState(false);

    const handleChange = (campo: keyof UsuarioForm, valor: string): void => {
        setForm(prev => ({ ...prev, [campo]: valor }));
    };

    const validar = (): string | null => {
        if (form.nombre.trim().length < 2) return 'Ingrese el nombre completo (mínimo 2 caracteres)';
        if (!EMAIL_REGEX.test(form.correo.trim())) return 'Ingrese un correo electrónico válido';
        if (!/^\d{11}$/.test(form.ci.trim())) return 'La cédula debe tener exactamente 11 dígitos';
        if (!form.departamento.trim()) return 'Ingrese el departamento';
        if (!form.cargo.trim()) return 'Ingrese el cargo';
        const salario = Number(form.salario);
        if (!form.salario || Number.isNaN(salario) || salario <= 0) return 'Ingrese un salario mayor que 0';
        if (form.contrasena.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
        return null;
    };

    const handleAgregar = async (): Promise<void> => {
        if (guardando) return;
        const error = validar();
        if (error) {
            notify.error(error);
            return;
        }
        setGuardando(true);
        try {
            await agregarUsuario({
                nombre_empleado: form.nombre.trim(),
                correo_empleado: form.correo.trim().toLowerCase(),
                ci_empleado: form.ci.trim(),
                departamento: form.departamento.trim(),
                cargo: form.cargo.trim(),
                salario: Number(form.salario),
                rol: form.rol,
                contraseña: form.contrasena,
            });
            setForm(initialForm);
        } catch (err) {
            notify.error(getErrorMessage(err, 'No se pudo crear el usuario'));
        } finally {
            setGuardando(false);
        }
    };

    const confirmarEliminar = async (): Promise<void> => {
        if (!usuarioAEliminar) return;
        setEliminando(true);
        try {
            await eliminarUsuario(usuarioAEliminar._id);
            setUsuarioAEliminar(null);
        } catch (err) {
            notify.error(getErrorMessage(err, 'No se pudo eliminar el usuario'));
        } finally {
            setEliminando(false);
        }
    };

    const deshabilitado = loading || guardando;

    return (
        <Box>
            {/* ─── Nuevo usuario ─── */}
            <Card elevation={0} sx={cardSx}>
                <CardContent sx={{ px: 3, py: 2 }}>
                    <Typography variant="h6" sx={{ color: '#00e5a0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <PersonAddIcon sx={{ color: '#00e5a0', width: 24, height: 24 }} />
                        Nuevo Usuario
                    </Typography>

                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
                        gap: 2,
                    }}>
                        <TextField size="small" label="Nombre completo" value={form.nombre}
                            onChange={(e) => handleChange('nombre', e.target.value)}
                            disabled={deshabilitado} sx={inputSx}
                            slotProps={{ htmlInput: { maxLength: 200 } }} />
                        <TextField size="small" label="Correo electrónico" type="email" value={form.correo}
                            onChange={(e) => handleChange('correo', e.target.value)}
                            disabled={deshabilitado} sx={inputSx}
                            slotProps={{ htmlInput: { maxLength: 200 } }} />
                        <TextField size="small" label="Cédula de identidad" placeholder="11 dígitos" value={form.ci}
                            onChange={(e) => handleChange('ci', e.target.value.replace(/\D/g, ''))}
                            disabled={deshabilitado} sx={inputSx}
                            slotProps={{ htmlInput: { maxLength: 11, inputMode: 'numeric' } }} />
                        <TextField size="small" select label="Rol" value={form.rol}
                            onChange={(e) => handleChange('rol', e.target.value)}
                            disabled={deshabilitado} sx={inputSx}
                            slotProps={{ select: { MenuProps: menuProps } }}>
                            {ROLES.map(r => (
                                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                            ))}
                        </TextField>
                        <TextField size="small" label="Departamento" value={form.departamento}
                            onChange={(e) => handleChange('departamento', e.target.value)}
                            disabled={deshabilitado} sx={inputSx} />
                        <TextField size="small" label="Cargo" value={form.cargo}
                            onChange={(e) => handleChange('cargo', e.target.value)}
                            disabled={deshabilitado} sx={inputSx} />
                        <TextField size="small" label="Salario" type="number" value={form.salario}
                            onChange={(e) => handleChange('salario', e.target.value)}
                            disabled={deshabilitado} sx={inputSx}
                            slotProps={{ htmlInput: { min: 0, step: '0.01' } }} />
                        <TextField size="small" label="Contraseña" type="password" value={form.contrasena}
                            onChange={(e) => handleChange('contrasena', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAgregar()}
                            disabled={deshabilitado} sx={inputSx}
                            autoComplete="new-password" />
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                        <Button
                            variant="contained"
                            onClick={handleAgregar}
                            disabled={deshabilitado}
                            startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <PersonAddIcon />}
                            sx={greenButtonSx}
                        >
                            {guardando ? 'Guardando...' : 'Agregar Usuario'}
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            {/* ─── Usuarios registrados ─── */}
            <Card elevation={0} sx={cardSx}>
                <CardContent sx={{ px: 3, py: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ color: '#00e5a0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PeopleIcon sx={{ color: '#00e5a0', width: 24, height: 24 }} />
                            Usuarios registrados
                        </Typography>
                        <Chip
                            label={`${usuarios.length} registrados`}
                            color="primary"
                            size="medium"
                            sx={{ p: 2, ml: 'auto' }}
                        />
                    </Box>

                    <TableContainer sx={{ borderRadius: 2, border: '1px solid rgba(255,255,255,0.04)' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={headCellSx}>Nombre</TableCell>
                                    <TableCell sx={headCellSx}>Correo</TableCell>
                                    <TableCell sx={headCellSx}>Cédula</TableCell>
                                    <TableCell sx={headCellSx}>Rol</TableCell>
                                    <TableCell sx={headCellSx} align="center">Acciones</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {usuarios.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ ...bodyCellSx, color: '#9ca3af', py: 4 }}>
                                            {loading ? 'Cargando usuarios...' : 'No hay usuarios registrados'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    usuarios.map(u => (
                                        <TableRow key={u._id} hover sx={{ '&:hover': { bgcolor: 'rgba(0,229,160,0.04) !important' } }}>
                                            <TableCell sx={{ ...bodyCellSx, fontWeight: 600 }}>{u.nombre_empleado}</TableCell>
                                            <TableCell sx={bodyCellSx}>{u.correo_empleado}</TableCell>
                                            <TableCell sx={bodyCellSx}>{u.ci_empleado}</TableCell>
                                            <TableCell sx={bodyCellSx}>
                                                <Chip
                                                    size="small"
                                                    label={ROLES.find(r => r.value === u.rol)?.label ?? u.rol}
                                                    sx={{
                                                        bgcolor: u.rol === 'administrador' ? 'rgba(0,229,160,0.15)' : 'rgba(255,255,255,0.06)',
                                                        color: u.rol === 'administrador' ? '#00e5a0' : '#e8f5f0',
                                                        fontWeight: 600,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={bodyCellSx} align="center">
                                                <Tooltip title="Eliminar usuario">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => setUsuarioAEliminar(u)}
                                                            disabled={loading}
                                                            sx={{ color: '#ff4d6d', '&:hover': { bgcolor: 'rgba(255,77,109,0.1)' } }}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* ─── Confirmar eliminación ─── */}
            <Dialog
                open={usuarioAEliminar !== null}
                onClose={() => !eliminando && setUsuarioAEliminar(null)}
                maxWidth="xs"
                fullWidth
                slotProps={{
                    paper: {
                        sx: {
                            bgcolor: '#151a19',
                            border: '1px solid rgba(255,255,255,0.06)',
                            boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                            borderRadius: 2,
                        }
                    }
                }}
            >
                <DialogTitle sx={{
                    background: 'linear-gradient(135deg, #0a0f0d 0%, #151a19 100%)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    color: '#ff4d6d',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                }}>
                    <WarningAmberIcon />
                    Eliminar usuario
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: '#e8f5f0', mt: 2, textAlign: 'center' }}>
                        ¿Seguro que desea eliminar a <strong>{usuarioAEliminar?.nombre_empleado}</strong>?
                        Esta acción no se puede deshacer.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ display: 'flex', p: 2, gap: 2, width: '100%' }}>
                    <Button
                        variant="contained"
                        startIcon={<CancelIcon />}
                        onClick={() => setUsuarioAEliminar(null)}
                        disabled={eliminando}
                        sx={redButtonSx}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={confirmarEliminar}
                        disabled={eliminando}
                        startIcon={eliminando ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
                        sx={{ ...greenButtonSx, flex: 1 }}
                    >
                        {eliminando ? 'Eliminando...' : 'Eliminar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
