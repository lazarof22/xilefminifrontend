import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Typography,
} from '@mui/material';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckIcon from '@mui/icons-material/Check';
import { MODULOS, type ModuloApp } from '../../types/usuarios.types';

export interface ModulosUsuarioDialogProps {
    open: boolean;
    onClose: () => void;
    /** Nombre que se muestra en el título (vacío al crear un usuario nuevo). */
    usuario?: string;
    /** Módulos marcados al abrir. */
    value: ModuloApp[];
    /** El administrador siempre tiene todos los módulos: se muestran marcados y bloqueados. */
    esAdministrador?: boolean;
    /** Se llama con la selección final al pulsar "Aceptar". */
    onAceptar: (modulos: ModuloApp[]) => void;
    guardando?: boolean;
}

/** Diálogo para elegir a qué módulos puede entrar un usuario. */
export default function ModulosUsuarioDialog({
    open,
    onClose,
    usuario,
    value,
    esAdministrador = false,
    onAceptar,
    guardando = false,
}: ModulosUsuarioDialogProps): React.JSX.Element {
    const [seleccion, setSeleccion] = useState<Set<ModuloApp>>(new Set(value));

    // Cada vez que se abre, parte de los módulos actuales del usuario.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (open) setSeleccion(new Set(value));
    }, [open, value]);

    const marcados = esAdministrador ? new Set<ModuloApp>(MODULOS.map((m) => m.value)) : seleccion;

    const alternar = (modulo: ModuloApp): void => {
        setSeleccion((prev) => {
            const siguiente = new Set(prev);
            if (siguiente.has(modulo)) siguiente.delete(modulo);
            else siguiente.add(modulo);
            return siguiente;
        });
    };

    const aceptar = (): void => {
        // Se conserva el orden del catálogo de módulos.
        onAceptar(MODULOS.map((m) => m.value).filter((m) => marcados.has(m)));
    };

    return (
        <Dialog open={open} onClose={guardando ? undefined : onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LockOpenIcon color="primary" />
                <Box component="span">
                    Acceso a módulos{usuario ? ` — ${usuario}` : ''}
                </Box>
            </DialogTitle>

            <DialogContent dividers>
                {esAdministrador ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        El administrador tiene acceso a todos los módulos, sin restricción.
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Button
                            size="small"
                            onClick={() => setSeleccion(new Set(MODULOS.map((m) => m.value)))}
                            sx={{ textTransform: 'none' }}
                        >
                            Seleccionar todos
                        </Button>
                        <Button size="small" onClick={() => setSeleccion(new Set())} sx={{ textTransform: 'none' }}>
                            Ninguno
                        </Button>
                    </Box>
                )}

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 1 }}>
                    {MODULOS.map((m) => (
                        <FormControlLabel
                            key={m.value}
                            label={m.label}
                            control={
                                <Checkbox
                                    checked={marcados.has(m.value)}
                                    onChange={() => alternar(m.value)}
                                    disabled={esAdministrador || guardando}
                                />
                            }
                        />
                    ))}
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2, gap: 1 }}>
                <Button onClick={onClose} disabled={guardando} startIcon={<CancelIcon />} sx={{ textTransform: 'none' }}>
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    onClick={aceptar}
                    disabled={guardando}
                    startIcon={<CheckIcon />}
                    sx={{ textTransform: 'none' }}
                >
                    Aceptar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
