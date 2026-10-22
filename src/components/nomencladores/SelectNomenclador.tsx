import { useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormHelperText,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNotify } from '../notificaciones/useNotify';
import { getErrorMessage } from '../../utils/errorMessage';
import type { NomencladorApi, OpcionNomenclador } from '../../service/nomencladoresApi';

interface Props {
    /** Etiqueta del select, p. ej. "Categoría". */
    label: string;
    /** Nombre del nomenclador en minúsculas para los textos, p. ej. "categoría de producto". */
    nombreNomenclador: string;
    /** Valor seleccionado: el `nombre` de la opción. */
    value: string;
    opciones: OpcionNomenclador[];
    onChange: (nombre: string) => void;
    /** Crea el valor en el backend. Debe devolver el valor creado. */
    onCrear: NomencladorApi['crear'];
    /** Se llama después de crear, para que el padre recargue su lista. */
    onCreado?: (creado: OpcionNomenclador) => void | Promise<void>;
    error?: boolean;
    helperText?: string;
    disabled?: boolean;
}

/**
 * Select de un nomenclador con un botón "+" al lado que permite agregar un
 * valor nuevo sin salir del formulario (y sin pasar por Configuración).
 * Al crearlo queda seleccionado.
 */
export default function SelectNomenclador({
    label,
    nombreNomenclador,
    value,
    opciones,
    onChange,
    onCrear,
    onCreado,
    error,
    helperText,
    disabled,
}: Props) {
    const notify = useNotify();
    const [abierto, setAbierto] = useState(false);
    const [nombre, setNombre] = useState('');
    const [errorNombre, setErrorNombre] = useState('');
    const [guardando, setGuardando] = useState(false);

    const cerrar = () => {
        if (guardando) return;
        setAbierto(false);
        setNombre('');
        setErrorNombre('');
    };

    const guardar = async () => {
        const limpio = nombre.trim();
        if (!limpio) {
            setErrorNombre('El nombre es obligatorio');
            return;
        }
        setGuardando(true);
        try {
            const creado = await onCrear(limpio);
            // Primero se recarga la lista y después se selecciona, para que el
            // valor nuevo ya exista como opción cuando el select lo muestre.
            await onCreado?.(creado);
            onChange(creado.nombre);
            notify.success(`Se agregó "${creado.nombre}" a ${nombreNomenclador}`);
            setAbierto(false);
            setNombre('');
            setErrorNombre('');
        } catch (e) {
            setErrorNombre(getErrorMessage(e, `No se pudo agregar la ${nombreNomenclador}`));
        } finally {
            setGuardando(false);
        }
    };

    // Un valor guardado que ya no está en la lista (p. ej. renombrado) se sigue mostrando.
    const sinOpcion = value !== '' && !opciones.some((o) => o.nombre === value);

    return (
        <>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <FormControl fullWidth size="small" error={error}>
                    <InputLabel>{label}</InputLabel>
                    <Select
                        label={label}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                    >
                        <MenuItem value="">-- Seleccione {label.toLowerCase()} --</MenuItem>
                        {sinOpcion && <MenuItem value={value}>{value}</MenuItem>}
                        {opciones.map((o) => (
                            <MenuItem key={o._id} value={o.nombre}>
                                {o.nombre}
                            </MenuItem>
                        ))}
                    </Select>
                    {helperText && <FormHelperText>{helperText}</FormHelperText>}
                </FormControl>
                <Tooltip title={`Agregar ${nombreNomenclador}`}>
                    <span>
                        <IconButton
                            color="primary"
                            onClick={() => setAbierto(true)}
                            disabled={disabled}
                            aria-label={`Agregar ${nombreNomenclador}`}
                            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                        >
                            <AddIcon />
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>

            <Dialog
                open={abierto}
                onClose={cerrar}
                fullWidth
                maxWidth="xs"
                slotProps={{ paper: { sx: { bgcolor: '#151a19', backgroundImage: 'none' } } }}
            >
                <DialogTitle>Agregar {nombreNomenclador}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        margin="dense"
                        label="Nombre"
                        value={nombre}
                        onChange={(e) => {
                            setNombre(e.target.value);
                            setErrorNombre('');
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                void guardar();
                            }
                        }}
                        error={!!errorNombre}
                        helperText={errorNombre}
                        disabled={guardando}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={cerrar} disabled={guardando}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => void guardar()}
                        disabled={guardando}
                        startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
                    >
                        {guardando ? 'Guardando...' : 'Agregar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
