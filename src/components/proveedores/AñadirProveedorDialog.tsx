import React, { useMemo, useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CancelIcon from '@mui/icons-material/Cancel';
import SaveIcon from '@mui/icons-material/Save';

import { useNotify } from '../notificaciones/useNotify';
import { getErrorMessage } from '../../utils/errorMessage';
import { proveedorApi } from '../../service/proveedorApi';

// ─── Tipos ─────────────────────────────────────────────

interface FormState {
    codigo: string;
    nombre: string;
    cuentaBancaria: string;
    direccion: string;
    telefono: string;
}

export interface AñadirProveedorDialogProps {
    open: boolean;
    onClose: () => void;
    /** Se llama después de guardar el proveedor en el backend. */
    onGuardado: () => void;
}

const FORM_VACIO: FormState = {
    codigo: '',
    nombre: '',
    cuentaBancaria: '',
    direccion: '',
    telefono: '',
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
};

// ─── Componente ────────────────────────────────────────

export default function AñadirProveedorDialog({
    open,
    onClose,
    onGuardado,
}: AñadirProveedorDialogProps): React.JSX.Element {
    const notify = useNotify();

    const [form, setForm] = useState<FormState>(FORM_VACIO);
    const [guardando, setGuardando] = useState(false);
    const [intentoGuardar, setIntentoGuardar] = useState(false);

    const set = (campo: keyof FormState, valor: string): void =>
        setForm((prev) => ({ ...prev, [campo]: valor }));

    const errores = useMemo(() => {
        const e: Partial<Record<keyof FormState, string>> = {};
        if (!form.codigo.trim()) e.codigo = 'Obligatorio';
        if (!form.nombre.trim()) e.nombre = 'Obligatorio';
        if (!form.cuentaBancaria.trim()) e.cuentaBancaria = 'Obligatorio';
        if (!form.direccion.trim()) e.direccion = 'Obligatorio';
        if (!form.telefono) e.telefono = 'Obligatorio';
        else if (form.telefono.length > 15) e.telefono = 'Máximo 15 dígitos';
        return e;
    }, [form]);

    const error = (campo: keyof FormState): string | undefined =>
        intentoGuardar ? errores[campo] : undefined;

    const limpiar = (): void => {
        setForm(FORM_VACIO);
        setIntentoGuardar(false);
    };

    const handleCancelar = (): void => {
        if (guardando) return;
        limpiar();
        onClose();
    };

    const handleGuardar = async (): Promise<void> => {
        setIntentoGuardar(true);
        if (Object.keys(errores).length > 0) {
            notify.warning('Revise los campos marcados antes de guardar el proveedor.');
            return;
        }

        setGuardando(true);
        try {
            await proveedorApi.crear({
                codigo: form.codigo.trim(),
                nombre: form.nombre.trim(),
                cuentaBancaria: form.cuentaBancaria.trim(),
                direccion: form.direccion.trim(),
                telefono: Number(form.telefono),
            });
            notify.success(`Proveedor "${form.nombre.trim()}" registrado correctamente.`);
            limpiar();
            onClose();
            onGuardado();
        } catch (e: unknown) {
            notify.error(getErrorMessage(e, 'No se pudo registrar el proveedor'));
        } finally {
            setGuardando(false);
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
                    },
                },
            }}
        >
            <DialogTitle
                sx={{
                    background: 'linear-gradient(135deg, #0a0f0d 0%, #151a19 100%)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
            >
                <Typography
                    variant="h6"
                    component="span"
                    sx={{
                        textAlign: 'center',
                        color: '#00e5a0',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                    }}
                >
                    <LocalShippingIcon sx={{ color: '#00e5a0' }} />
                    Añadir proveedor
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ pt: '20px !important' }}>
                <Box
                    component="form"
                    noValidate
                    onSubmit={(e) => {
                        e.preventDefault();
                        void handleGuardar();
                    }}
                    sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}
                >
                    <TextField
                        size="small"
                        label="Código"
                        value={form.codigo}
                        onChange={(e) => set('codigo', e.target.value)}
                        disabled={guardando}
                        error={!!error('codigo')}
                        helperText={error('codigo')}
                        sx={inputSx}
                    />

                    <TextField
                        size="small"
                        label="Nombre"
                        value={form.nombre}
                        onChange={(e) => set('nombre', e.target.value)}
                        disabled={guardando}
                        error={!!error('nombre')}
                        helperText={error('nombre')}
                        sx={inputSx}
                    />

                    <TextField
                        size="small"
                        label="Cuenta bancaria"
                        value={form.cuentaBancaria}
                        onChange={(e) => set('cuentaBancaria', e.target.value)}
                        disabled={guardando}
                        error={!!error('cuentaBancaria')}
                        helperText={error('cuentaBancaria')}
                        sx={inputSx}
                    />

                    <TextField
                        size="small"
                        label="Número de teléfono"
                        value={form.telefono}
                        // Solo dígitos: el teléfono se guarda como número.
                        onChange={(e) => set('telefono', e.target.value.replace(/\D/g, ''))}
                        disabled={guardando}
                        error={!!error('telefono')}
                        helperText={error('telefono') ?? 'Solo números'}
                        slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 15 } }}
                        sx={inputSx}
                    />

                    <TextField
                        size="small"
                        label="Dirección"
                        value={form.direccion}
                        onChange={(e) => set('direccion', e.target.value)}
                        disabled={guardando}
                        error={!!error('direccion')}
                        helperText={error('direccion')}
                        sx={{ ...inputSx, gridColumn: { sm: '1 / -1' } }}
                    />
                </Box>
            </DialogContent>

            <DialogActions sx={{ display: 'flex', p: 2, gap: 2, width: '100%' }}>
                <Button
                    onClick={handleCancelar}
                    disabled={guardando}
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
                        },
                    }}
                >
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    onClick={() => void handleGuardar()}
                    disabled={guardando}
                    fullWidth
                    startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    sx={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #00e5a0, #00b87d)',
                        color: '#fff',
                        textTransform: 'none',
                        fontWeight: 600,
                        boxShadow: 'none',
                    }}
                >
                    {guardando ? 'Guardando…' : 'Guardar proveedor'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
