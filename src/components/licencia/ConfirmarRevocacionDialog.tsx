import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

// ═══ Confirmación obligatoria antes de importar una revocación ═══

interface ConfirmarRevocacionDialogProps {
    open: boolean;
    onCancelar: () => void;
    onConfirmar: () => void;
}

export default function ConfirmarRevocacionDialog({ open, onCancelar, onConfirmar }: ConfirmarRevocacionDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onCancelar}
            aria-labelledby="titulo-confirmar-revocacion"
            aria-describedby="descripcion-confirmar-revocacion"
        >
            <DialogTitle id="titulo-confirmar-revocacion" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningAmberIcon color="error" aria-hidden />
                Importar revocación
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="descripcion-confirmar-revocacion">
                    Este archivo revoca la licencia instalada. El sistema dejará de estar licenciado en este equipo
                    hasta que importes una nueva licencia válida. ¿Deseas continuar?
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancelar} autoFocus>
                    Cancelar
                </Button>
                <Button onClick={onConfirmar} color="error" variant="contained">
                    Revocar licencia
                </Button>
            </DialogActions>
        </Dialog>
    );
}
