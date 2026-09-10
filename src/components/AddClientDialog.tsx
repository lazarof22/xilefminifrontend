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
    Snackbar,
    Typography
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

// ─── Configuración ───────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Tipos ─────────────────────────────────────────────

interface TipoClienteOption {
    value: string;
    label: string;
}

export interface ClienteFormData {
    id_cliente: string;
    nombre_cliente: string;
    telefono_cliente: string;
    email_cliente: string;
    direccion_cliente: string;
    tipo_cliente: string;
}

interface ClienteErrors {
    id_cliente?: string;
    nombre_cliente?: string;
    telefono_cliente?: string;
    email_cliente?: string;
    direccion_cliente?: string;
    tipo_cliente?: string;
}

export interface DialogCrearClienteProps {
    open: boolean;
    onClose: () => void;
    onClienteCreado?: (cliente: ClienteFormData) => void;
}

// ─── Constantes ──────────────────────────────────────

const TIPOS_CLIENTE: TipoClienteOption[] = [
    { value: 'Persona Natural', label: 'Persona Natural' },
    { value: 'Persona Jurídica', label: 'Persona Jurídica' }
];

const initialCliente: ClienteFormData = {
    id_cliente: '',
    nombre_cliente: '',
    telefono_cliente: '',
    email_cliente: '',
    direccion_cliente: '',
    tipo_cliente: 'Persona Natural'
};

// ─── Componente ──────────────────────────────────────

export default function DialogCrearCliente({
    open,
    onClose,
    onClienteCreado
}: DialogCrearClienteProps): React.JSX.Element {
    const [newCliente, setNewCliente] = useState<ClienteFormData>(initialCliente);
    const [errors, setErrors] = useState<ClienteErrors>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({
        open: false,
        message: '',
        severity: 'success'
    });

    const handleChange = (field: keyof ClienteFormData, value: string): void => {
        setNewCliente(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validate = (): boolean => {
        const newErrors: ClienteErrors = {};

        if (!newCliente.id_cliente.trim()) {
            newErrors.id_cliente = 'El ID/CI es requerido';
        }
        if (!newCliente.nombre_cliente.trim()) {
            newErrors.nombre_cliente = 'El nombre es requerido';
        }
        if (!newCliente.telefono_cliente.trim()) {
            newErrors.telefono_cliente = 'El teléfono es requerido';
        }
        if (!newCliente.email_cliente.trim()) {
            newErrors.email_cliente = 'El email es requerido';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCliente.email_cliente)) {
            newErrors.email_cliente = 'Email inválido';
        }
        if (!newCliente.direccion_cliente.trim()) {
            newErrors.direccion_cliente = 'La dirección es requerida';
        }
        if (!newCliente.tipo_cliente.trim()) {
            newErrors.tipo_cliente = 'El tipo de cliente es requerido';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCreateCliente = async (): Promise<void> => {
        if (!validate()) return;

        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/cliente`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newCliente),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
            }

            const clienteCreado = await response.json();

            setSnackbar({
                open: true,
                message: 'Cliente creado exitosamente',
                severity: 'success'
            });

            // Callback para notificar al componente padre (punto de venta)
            onClienteCreado?.(clienteCreado);

            // Limpiar y cerrar
            setNewCliente(initialCliente);
            setErrors({});

            setTimeout(() => {
                onClose();
            }, 1000);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al crear el cliente';
            setSnackbar({
                open: true,
                message: errorMessage,
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = (): void => {
        setNewCliente(initialCliente);
        setErrors({});
        onClose();
    };

    const handleCloseSnackbar = (): void => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>
                    <Typography variant="h6"
                        sx={{
                            borderRadius: 1,
                            boxShadow: 2,
                            p: 1,
                            textAlign: "center",
                            background: "linear-gradient(135deg, rgba(0, 89, 255, 0.84), rgba(230, 21, 118, 0.9))",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}>
                        <span style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
                            <PersonAddIcon
                                sx={{
                                    fill: 'url(#iconGradient)',
                                    width: 24,
                                    height: 24
                                }}
                            />
                            <svg width="0" height="0">
                                <defs>
                                    <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="rgb(0, 174, 255)" />
                                        <stop offset="100%" stopColor="rgb(196, 45, 226)" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </span>
                        Nuevo Cliente
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Carnet de Identidad"
                        margin="normal"
                        value={newCliente.id_cliente}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            // Solo permite números y máximo 11 dígitos
                            const input = e.target.value;
                            const soloNumeros = input.replace(/\D/g, '').slice(0, 11);
                            handleChange("id_cliente", soloNumeros);
                        }}
                        error={!!errors.id_cliente || (newCliente.id_cliente.length > 0 && newCliente.id_cliente.length !== 11)}
                        helperText={
                            errors.id_cliente ||
                            (newCliente.id_cliente.length > 0 && newCliente.id_cliente.length !== 11
                                ? `Debe tener exactamente 11 dígitos (${newCliente.id_cliente.length}/11)`
                                : "Inserte el carnet de identidad")
                        }
                        disabled={loading}
                        slotProps={{
                            input: {           // ← Slot del InputBase
                                inputProps: {  // ← Props del <input> nativo HTML
                                    maxLength: 11,
                                    inputMode: 'numeric',
                                    pattern: '[0-9]*',
                                }
                            }
                        }}
                    />
                    <TextField
                        fullWidth
                        label="Nombre"
                        margin="normal"
                        value={newCliente.nombre_cliente}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleChange("nombre_cliente", e.target.value)
                        }
                        error={!!errors.nombre_cliente}
                        helperText={errors.nombre_cliente}
                        disabled={loading}
                    />
                    <TextField
                        fullWidth
                        label="Teléfono"
                        margin="normal"
                        value={newCliente.telefono_cliente}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleChange("telefono_cliente", e.target.value)
                        }
                        error={!!errors.telefono_cliente}
                        helperText={errors.telefono_cliente}
                        disabled={loading}
                    />
                    <TextField
                        fullWidth
                        label="Email"
                        margin="normal"
                        type="email"
                        value={newCliente.email_cliente}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleChange("email_cliente", e.target.value)
                        }
                        error={!!errors.email_cliente}
                        helperText={errors.email_cliente}
                        disabled={loading}
                    />
                    <TextField
                        fullWidth
                        label="Dirección"
                        margin="normal"
                        multiline
                        rows={2}
                        value={newCliente.direccion_cliente}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleChange("direccion_cliente", e.target.value)
                        }
                        error={!!errors.direccion_cliente}
                        helperText={errors.direccion_cliente}
                        disabled={loading}
                    />
                    <TextField
                        select
                        fullWidth
                        label="Tipo de Cliente"
                        margin="normal"
                        value={newCliente.tipo_cliente}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleChange("tipo_cliente", e.target.value)
                        }
                        error={!!errors.tipo_cliente}
                        helperText={errors.tipo_cliente}
                        disabled={loading}
                    >
                        {TIPOS_CLIENTE.map((tipo: TipoClienteOption) => (
                            <MenuItem key={tipo.value} value={tipo.value}>
                                {tipo.label}
                            </MenuItem>
                        ))}
                    </TextField>
                </DialogContent>
                <DialogActions
                    sx={{
                        display: "flex",
                        p: 2,
                        ml: 0,
                        gap: 2, // espacio entre botones
                        width: "100%"
                    }}
                >
                    <Button
                        onClick={handleClose}
                        disabled={loading}
                        fullWidth // ← ocupa todo el espacio disponible
                        startIcon={<CancelIcon />}
                        sx={{
                            flex: 1, // ← 50% del ancho
                            background: "linear-gradient(135deg, rgba(255,0,0,0.9), rgba(196, 45, 226, 0.9))",
                            boxShadow: "0 4px 19px rgba(0,0,0,0.2)",
                            color: "white",
                            "&:hover": {
                                background: "linear-gradient(135deg, rgba(255,0,0,0.9), rgba(226, 45, 187, 0.9))",
                                boxShadow: "0 4px 12px rgb(158, 6, 6)"
                            }
                        }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCreateCliente}
                        disabled={loading}
                        fullWidth // ← ocupa todo el espacio disponible
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                        sx={{
                            flex: 1, // ← 50% del ancho
                            background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                            boxShadow: "0 4px 19px rgba(0,0,0,0.2)",
                            "&:hover": {
                                background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                                boxShadow: "0 4px 12px rgba(13, 248, 5, 0.93)"
                            }
                        }}
                    >
                        {loading ? 'Guardando...' : 'Guardar'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}