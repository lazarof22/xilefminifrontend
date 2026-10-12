import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    CircularProgress,
    Typography,
    Box
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNotify } from '../../notificaciones/useNotify';
import CancelIcon from '@mui/icons-material/Cancel';
import WarehouseIcon from '@mui/icons-material/Warehouse';

// ─── Tipos ─────────────────────────────────────────────

export interface NuevoAlmacenFormData {
    codigo: string;
    nombre: string;
}

export interface NuevoAlmacenDialogProps {
    open: boolean;
    onClose: () => void;
    // Debe lanzar un Error con el mensaje a mostrar si falla
    onAgregar: (data: NuevoAlmacenFormData) => Promise<void>;
}

const CODIGO_MAX_LENGTH = 20;

const initialForm: NuevoAlmacenFormData = {
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
    }
};

// ─── Componente ──────────────────────────────────────

export default function NuevoAlmacenDialog({
    open,
    onClose,
    onAgregar
}: NuevoAlmacenDialogProps): React.JSX.Element {
    const [form, setForm] = useState<NuevoAlmacenFormData>(initialForm);
    const notify = useNotify();
    const [loading, setLoading] = useState<boolean>(false);

    const handleChange = (field: keyof NuevoAlmacenFormData, value: string): void => {
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
        if (!form.codigo.trim()) return 'Ingrese un código para el almacén';
        if (!form.nombre.trim()) return 'Ingrese un nombre para el almacén';
        if (form.codigo.trim().length > CODIGO_MAX_LENGTH) {
            return `El código no puede tener más de ${CODIGO_MAX_LENGTH} caracteres`;
        }
        return null;
    };

    const handleAgregar = async (): Promise<void> => {
        const errorValidacion = validar();
        if (errorValidacion) {
            notify.error(errorValidacion);
            return;
        }

        setLoading(true);
        try {
            await onAgregar({
                codigo: form.codigo.trim(),
                nombre: form.nombre.trim()
            });
            limpiar();
            onClose();
        } catch (err) {
            notify.error(err instanceof Error ? err.message : 'No se pudo guardar el almacén');
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
                    <WarehouseIcon sx={{ color: '#00e5a0' }} />
                    Nuevo Almacén
                </Typography>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Código del almacén"
                        placeholder="Ej: ALM-0001"
                        value={form.codigo}
                        onChange={(e) => handleChange('codigo', e.target.value)}
                        disabled={loading}
                        slotProps={{ htmlInput: { maxLength: CODIGO_MAX_LENGTH } }}
                        sx={inputSx}
                    />
                    <TextField
                        fullWidth
                        size="small"
                        label="Nombre del almacén"
                        placeholder="Ej: Almacén Principal"
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