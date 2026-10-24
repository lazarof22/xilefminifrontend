import {
    Box,
    FormControl,
    FormHelperText,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { inputSx } from './dialogEstilos';

export interface OpcionSelect {
    value: string;
    label: string;
}

interface Props {
    label: string;
    value: string;
    opciones: OpcionSelect[];
    onChange: (value: string) => void;
    /** Abre el dialog para crear un registro nuevo (almacén, contenedor...). */
    onAgregar: () => void;
    /** Texto del tooltip y del aria-label del botón "+". */
    textoAgregar: string;
    error?: boolean;
    helperText?: string;
    disabled?: boolean;
    /** Deshabilita solo el botón "+". */
    disabledAgregar?: boolean;
}

/** Select con un botón "+" a su lado para crear el valor que falta sin salir del formulario. */
export default function SelectConAgregar({
    label,
    value,
    opciones,
    onChange,
    onAgregar,
    textoAgregar,
    error,
    helperText,
    disabled,
    disabledAgregar,
}: Props) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 0 }}>
            <FormControl fullWidth size="small" error={error} sx={inputSx}>
                <InputLabel>{label}</InputLabel>
                <Select label={label} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
                    <MenuItem value="">-- Seleccione --</MenuItem>
                    {opciones.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                            {o.label}
                        </MenuItem>
                    ))}
                </Select>
                {helperText && <FormHelperText>{helperText}</FormHelperText>}
            </FormControl>
            <Tooltip title={textoAgregar}>
                <span>
                    <IconButton
                        color="primary"
                        onClick={onAgregar}
                        disabled={disabled || disabledAgregar}
                        aria-label={textoAgregar}
                        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                    >
                        <AddIcon />
                    </IconButton>
                </span>
            </Tooltip>
        </Box>
    );
}
