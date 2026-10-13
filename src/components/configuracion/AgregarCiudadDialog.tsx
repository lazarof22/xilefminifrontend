import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Button,
    CircularProgress,
    Typography,
    Box
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CancelIcon from '@mui/icons-material/Cancel';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import { useNotify } from '../notificaciones/useNotify';
import { getErrorMessage } from '../../utils/errorMessage';
import type { Pais } from '../../service/configuracionApi';

// ─── Tipos ─────────────────────────────────────────────

export interface AgregarCiudadFormData {
    paisId: string;
    nombreCiudad: string;
}

export interface AgregarCiudadDialogProps {
    open: boolean;
    onClose: () => void;
    paises: Pais[];
    // Debe lanzar un Error con el mensaje a mostrar si falla
    onAgregar: (data: AgregarCiudadFormData) => Promise<void>;
}

const NOMBRE_MAX_LENGTH = 100;

const initialForm: AgregarCiudadFormData = {
    paisId: '',
    nombreCiudad: ''
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
};

// ─── Componente ──────────────────────────────────────

export default function AgregarCiudadDialog({
    open,
    onClose,
    paises,
    onAgregar
}: AgregarCiudadDialogProps): React.JSX.Element {
    const [form, setForm] = useState<AgregarCiudadFormData>(initialForm);
    const notify = useNotify();
    const [loading, setLoading] = useState<boolean>(false);

    const handleChange = (field: keyof AgregarCiudadFormData, value: string): void => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const limpiar = (): void => {
        setForm(initialForm);
    };

    const handleCancelar = (): void => {
        if (loading) return;
        limpiar();
        onClose();
    };

    const validar = (): string | null => {
        const nombre = form.nombreCiudad.trim();
        if (!form.paisId) return 'Seleccione el país de la ciudad';
        if (!paises.some(p => p._id === form.paisId)) return 'El país seleccionado no existe';
        if (!nombre) return 'Ingrese el nombre de la ciudad';
        if (nombre.length < 2) return 'El nombre de la ciudad debe tener al menos 2 caracteres';
        if (nombre.length > NOMBRE_MAX_LENGTH) {
            return `El nombre no puede tener más de ${NOMBRE_MAX_LENGTH} caracteres`;
        }
        return null;
    };

    const handleAgregar = async (): Promise<void> => {
        if (loading) return;
        const errorValidacion = validar();
        if (errorValidacion) {
            notify.error(errorValidacion);
            return;
        }
        setLoading(true);
        try {
            await onAgregar({ paisId: form.paisId, nombreCiudad: form.nombreCiudad.trim() });
            limpiar();
            onClose();
        } catch (err) {
            notify.error(getErrorMessage(err, 'No se pudo guardar la ciudad'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleCancelar}
            maxWidth="sm"
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
            }}>
                <Typography variant="h6" component="span"
                    sx={{
                        textAlign: 'center',
                        color: '#00e5a0',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                    }}>
                    <LocationCityIcon sx={{ color: '#00e5a0' }} />
                    Agregar Ciudad
                </Typography>
            </DialogTitle>

            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    <TextField
                        select
                        fullWidth
                        size="small"
                        label="País"
                        value={form.paisId}
                        onChange={(e) => handleChange('paisId', e.target.value)}
                        disabled={loading || paises.length === 0}
                        helperText={paises.length === 0 ? 'Primero agregue un país' : undefined}
                        sx={inputSx}
                        slotProps={{
                            select: {
                                MenuProps: {
                                    slotProps: {
                                        paper: { sx: { bgcolor: '#151a19', color: '#e8f5f0' } }
                                    }
                                }
                            }
                        }}
                    >
                        {paises.map(p => (
                            <MenuItem key={p._id} value={p._id}>
                                {p.nombrePais}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth
                        size="small"
                        label="Nombre de la ciudad"
                        placeholder="Ej: La Habana"
                        value={form.nombreCiudad}
                        onChange={(e) => handleChange('nombreCiudad', e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAgregar()}
                        disabled={loading}
                        slotProps={{ htmlInput: { maxLength: NOMBRE_MAX_LENGTH } }}
                        sx={inputSx}
                    />
                </Box>
            </DialogContent>

            <DialogActions sx={{ display: 'flex', p: 2, gap: 2, width: '100%' }}>
                <Button
                    onClick={handleCancelar}
                    disabled={loading}
                    fullWidth
                    variant="contained"
                    startIcon={<CancelIcon />}
                    sx={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #f80000 0%, #ec0163 100%)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#b8b9bb',
                        boxShadow: 'none',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #f80000 0%, #ec0163 100%)',
                            color: '#faf7f7',
                            boxShadow: 'none',
                        }
                    }}
                >
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    onClick={handleAgregar}
                    disabled={loading}
                    fullWidth
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
                    sx={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #00e5a0, #00b87d)',
                        color: '#fff',
                        textTransform: 'none',
                        fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(0,229,160,0.20)',
                    }}
                >
                    {loading ? 'Guardando...' : 'Agregar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
