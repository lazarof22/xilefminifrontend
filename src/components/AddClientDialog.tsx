import React, { useState } from 'react';
import { useNotify } from './notificaciones/useNotify';
import { getErrorMessage } from '../utils/errorMessage';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    MenuItem,
    CircularProgress,
    Typography
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { CamposIdentidad, CamposTelefono } from './clientes/CamposCliente';
import type { TipoIdentidad } from '../types/venta.types';
import {
    CODIGO_PAIS_POR_DEFECTO,
    TIPOS_CLIENTE,
    errorIdentidad,
    errorTelefono,
} from '../utils/identidadCliente';

// ─── Configuración ───────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Tipos ─────────────────────────────────────────────

/** El cliente tal como lo devuelve el servidor al crearlo. */
export interface ClienteFormData {
    /** La CI (11 dígitos) o, en un cliente con NIT, el mismo NIT. */
    id_cliente: string;
    nombre_cliente: string;
    telefono_cliente: string;
    email_cliente: string;
    direccion_cliente: string;
    /** Condición comercial: cliente_estandar, cliente_descuento o cliente_cuenta_casa. */
    tipo_cliente: string;
    /** Con qué se identifica: CI (persona natural) o NIT (empresa o mipyme). */
    tipoIdentidad?: TipoIdentidad;
    nit?: string;
    /** Prefijo de país del teléfono (+53, +1...). */
    codigoPais?: string;
    _id?: string;
}

/** Lo que se escribe en el formulario. */
interface ClienteForm {
    tipoIdentidad: TipoIdentidad;
    ci: string;
    nit: string;
    nombre_cliente: string;
    telefono_cliente: string;
    codigoPais: string;
    email_cliente: string;
    direccion_cliente: string;
    tipo_cliente: string;
}

interface ClienteErrors {
    ci?: string;
    nit?: string;
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

const initialCliente: ClienteForm = {
    tipoIdentidad: 'CI',
    ci: '',
    nit: '',
    nombre_cliente: '',
    telefono_cliente: '',
    codigoPais: CODIGO_PAIS_POR_DEFECTO,
    email_cliente: '',
    direccion_cliente: '',
    tipo_cliente: 'cliente_estandar'
};

// ─── Componente ──────────────────────────────────────

export default function DialogCrearCliente({
    open,
    onClose,
    onClienteCreado
}: DialogCrearClienteProps): React.JSX.Element {
    const [newCliente, setNewCliente] = useState<ClienteForm>(initialCliente);
    const [errors, setErrors] = useState<ClienteErrors>({});
    const [loading, setLoading] = useState<boolean>(false);
    const notify = useNotify();

    const handleChange = <K extends keyof ClienteForm>(field: K, value: ClienteForm[K]): void => {
        setNewCliente(prev => ({ ...prev, [field]: value }));
        // El error de un dato se quita al corregirlo; al cambiar entre CI y NIT se quitan los dos.
        setErrors(prev => {
            const newErrors = { ...prev };
            if (field === 'tipoIdentidad') {
                delete newErrors.ci;
                delete newErrors.nit;
            } else {
                delete newErrors[field as keyof ClienteErrors];
            }
            return newErrors;
        });
    };

    const validate = (): boolean => {
        const newErrors: ClienteErrors = {};

        // Identidad: la CI (11 dígitos) o el NIT, según lo que se eligió
        const errorId = errorIdentidad(newCliente.tipoIdentidad, newCliente.ci, newCliente.nit);
        if (errorId) {
            if (newCliente.tipoIdentidad === 'CI') newErrors.ci = errorId;
            else newErrors.nit = errorId;
        }
        if (!newCliente.nombre_cliente.trim()) {
            newErrors.nombre_cliente = 'El nombre es requerido';
        }
        const errorTel = errorTelefono(newCliente.telefono_cliente);
        if (errorTel) {
            newErrors.telefono_cliente = errorTel;
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
            // Con CI va `id_cliente`; con NIT, `nit` (el servidor lo toma también como documento del cliente).
            const cuerpo = {
                tipoIdentidad: newCliente.tipoIdentidad,
                ...(newCliente.tipoIdentidad === 'CI'
                    ? { id_cliente: newCliente.ci.trim() }
                    : { nit: newCliente.nit.trim() }),
                nombre_cliente: newCliente.nombre_cliente.trim(),
                telefono_cliente: newCliente.telefono_cliente.trim(),
                codigoPais: newCliente.codigoPais,
                email_cliente: newCliente.email_cliente.trim(),
                direccion_cliente: newCliente.direccion_cliente.trim(),
                tipo_cliente: newCliente.tipo_cliente,
            };

            const response = await fetch(`${API_URL}/cliente`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(cuerpo),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const mensaje = Array.isArray(errorData.message) ? errorData.message.join('. ') : errorData.message;
                throw new Error(mensaje || `Error ${response.status}: ${response.statusText}`);
            }

            const clienteCreado: ClienteFormData = await response.json();

            notify.success('Cliente creado exitosamente');

            // Callback para notificar al componente padre (punto de venta)
            onClienteCreado?.(clienteCreado);

            // Limpiar y cerrar
            setNewCliente(initialCliente);
            setErrors({});

            setTimeout(() => {
                onClose();
            }, 1000);

        } catch (error) {
            notify.error(getErrorMessage(error, 'Error al crear el cliente'));
        } finally {
            setLoading(false);
        }
    };

    const handleClose = (): void => {
        setNewCliente(initialCliente);
        setErrors({});
        onClose();
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Typography variant="h6" component="span"
                        sx={{
                            display: "block",
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
                    {/* Identidad: persona natural (CI) o empresa/mipyme (NIT); solo se habilita la elegida */}
                    <CamposIdentidad
                        tipo={newCliente.tipoIdentidad}
                        ci={newCliente.ci}
                        nit={newCliente.nit}
                        onTipoChange={(tipo) => handleChange('tipoIdentidad', tipo)}
                        onCiChange={(ci) => handleChange('ci', ci)}
                        onNitChange={(nit) => handleChange('nit', nit)}
                        errorCi={errors.ci}
                        errorNit={errors.nit}
                        disabled={loading}
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
                    {/* Teléfono con el prefijo de país (+53 de siempre) */}
                    <CamposTelefono
                        codigoPais={newCliente.codigoPais}
                        telefono={newCliente.telefono_cliente}
                        onCodigoPaisChange={(codigoPais) => handleChange('codigoPais', codigoPais)}
                        onTelefonoChange={(telefono) => handleChange('telefono_cliente', telefono)}
                        error={errors.telefono_cliente}
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
                        {TIPOS_CLIENTE.map((tipo) => (
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

        </>
    );
}