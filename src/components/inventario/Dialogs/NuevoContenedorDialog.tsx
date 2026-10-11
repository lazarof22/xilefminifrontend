import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    MenuItem,
    CircularProgress,
    Alert,
    Typography,
    Box
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CancelIcon from '@mui/icons-material/Cancel';
import Inventory2Icon from '@mui/icons-material/Inventory2';
 
// ─── Tipos ─────────────────────────────────────────────
 
export interface AlmacenOption {
    id: string;
    nombre: string;
}
 
export interface NuevoContenedorFormData {
    almacenId: string;
    codigo: string;
    nombre: string;
}
 
export interface NuevoContenedorDialogProps {
    open: boolean;
    onClose: () => void;
    almacenes: AlmacenOption[];
    // Debe lanzar un Error con el mensaje a mostrar si falla
    onAgregar: (data: NuevoContenedorFormData) => Promise<void>;
}
 
const initialForm: NuevoContenedorFormData = {
    almacenId: '',
    codigo: '',
    nombre: ''
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
    '& .MuiSvgIcon-root': { color: '#00e5a0' }
};
 
// ─── Componente ──────────────────────────────────────
 
export default function NuevoContenedorDialog({
    open,
    onClose,
    almacenes,
    onAgregar
}: NuevoContenedorDialogProps): React.JSX.Element {
    const [form, setForm] = useState<NuevoContenedorFormData>(initialForm);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
 
    const handleChange = (field: keyof NuevoContenedorFormData, value: string): void => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (error) setError(null);
    };
 
    const limpiar = (): void => {
        setForm(initialForm);
        setError(null);
    };
 
    const handleCancelar = (): void => {
        if (loading) return;
        limpiar();
        onClose();
    };
 
    const handleAgregar = async (): Promise<void> => {
        if (!form.almacenId || !form.codigo.trim() || !form.nombre.trim()) {
            setError('Seleccione un almacén e ingrese código y nombre del contenedor');
            return;
        }
 
        setLoading(true);
        try {
            await onAgregar({
                almacenId: form.almacenId,
                codigo: form.codigo.trim(),
                nombre: form.nombre.trim()
            });
            limpiar();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo guardar el contenedor');
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
                <Typography variant="h6"
                    sx={{
                        textAlign: 'center',
                        color: '#00e5a0',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                    }}>
                    <Inventory2Icon sx={{ color: '#00e5a0' }} />
                    Nuevo Contenedor
                </Typography>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    {error && (
                        <Alert severity="error" onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}
                    <TextField
                        select
                        fullWidth
                        size="small"
                        value={form.almacenId}
                        onChange={(e) => handleChange('almacenId', e.target.value)}
                        disabled={loading}
                        sx={inputSx}
                        slotProps={{
                            select: {
                                displayEmpty: true,
                                MenuProps: {
                                    slotProps: {
                                        paper: {
                                            sx: {
                                                bgcolor: '#151a19',
                                                color: '#e8f5f0',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                '& .MuiMenuItem-root': {
                                                    '&:hover': { bgcolor: 'rgba(0,229,160,0.08)' },
                                                    '&.Mui-selected': {
                                                        bgcolor: 'rgba(0,229,160,0.12)',
                                                        '&:hover': { bgcolor: 'rgba(0,229,160,0.16)' }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }}
                    >
                        <MenuItem value="" disabled>
                            -- Seleccione Almacén --
                        </MenuItem>
                        {almacenes.map(a => (
                            <MenuItem key={a.id} value={a.id}>
                                {a.nombre}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Código del contenedor"
                        value={form.codigo}
                        onChange={(e) => handleChange('codigo', e.target.value)}
                        disabled={loading}
                        sx={inputSx}
                    />
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Nombre del contenedor"
                        value={form.nombre}
                        onChange={(e) => handleChange('nombre', e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAgregar()}
                        disabled={loading}
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