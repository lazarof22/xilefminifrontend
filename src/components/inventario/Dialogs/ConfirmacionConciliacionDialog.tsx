import { useState, type ReactNode } from 'react';
import {
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { botonCancelarSx, botonGuardarSx, inputSx, paperSx, tituloSx, tituloTextoSx } from '../dialogEstilos';

interface Props {
    titulo: string;
    /** Qué va a pasar exactamente si se confirma. */
    children: ReactNode;
    textoConfirmar: string;
    /** `advertencia` (ámbar) para lo que no se puede deshacer desde la aplicación. */
    tono?: 'normal' | 'advertencia';
    /** Muestra el campo "Observación (opcional)", que queda en el historial de la conciliación. */
    pedirObservacion?: boolean;
    procesando: boolean;
    onCancelar: () => void;
    onConfirmar: (observacion: string) => void;
}

const AMBAR = '#f59e0b';

/**
 * Confirmación antes de cambiar saldos de inventario. Se monta solo cuando hay
 * algo que confirmar (así el campo de observación empieza vacío cada vez).
 */
export default function ConfirmacionConciliacionDialog({
    titulo,
    children,
    textoConfirmar,
    tono = 'normal',
    pedirObservacion = false,
    procesando,
    onCancelar,
    onConfirmar,
}: Props) {
    const [observacion, setObservacion] = useState('');
    const color = tono === 'advertencia' ? AMBAR : '#00e5a0';

    return (
        <Dialog
            open
            onClose={() => {
                if (!procesando) onCancelar();
            }}
            maxWidth="xs"
            fullWidth
            slotProps={{ paper: { sx: paperSx } }}
        >
            <DialogTitle sx={tituloSx}>
                <Typography variant="h6" component="span" sx={{ ...tituloTextoSx, color }}>
                    {tono === 'advertencia' && <WarningAmberIcon sx={{ color }} />}
                    {titulo}
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ pt: '20px !important', display: 'grid', gap: 2 }}>
                <Typography component="div" variant="body2" sx={{ color: '#e8f5f0', lineHeight: 1.6 }}>
                    {children}
                </Typography>

                {pedirObservacion && (
                    <TextField
                        size="small"
                        label="Observación (opcional)"
                        value={observacion}
                        onChange={(ev) => setObservacion(ev.target.value)}
                        disabled={procesando}
                        multiline
                        minRows={2}
                        slotProps={{ htmlInput: { maxLength: 300 } }}
                        sx={inputSx}
                    />
                )}
            </DialogContent>

            <DialogActions sx={{ display: 'flex', p: 2, gap: 2, width: '100%' }}>
                <Button
                    onClick={onCancelar}
                    disabled={procesando}
                    fullWidth
                    variant="contained"
                    startIcon={<CancelIcon />}
                    sx={botonCancelarSx}
                >
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    onClick={() => onConfirmar(observacion.trim())}
                    disabled={procesando}
                    fullWidth
                    startIcon={procesando ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                    sx={{
                        ...botonGuardarSx,
                        ...(tono === 'advertencia' && { background: `linear-gradient(135deg, ${AMBAR}, #d97706)` }),
                    }}
                >
                    {procesando ? 'Procesando…' : textoConfirmar}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
