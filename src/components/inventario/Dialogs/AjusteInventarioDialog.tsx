import { useCallback, useEffect, useMemo, useState } from 'react';
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
    InputLabel,
    MenuItem,
    Select,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import AssignmentAddIcon from '@mui/icons-material/AssignmentAdd';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutlined';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import SelectNomenclador from '../../nomencladores/SelectNomenclador';
import { useNotify } from '../../notificaciones/useNotify';
import { getErrorMessage } from '../../../utils/errorMessage';
import { apiRequest } from '../../../service/httpClient';
import {
    causasDisminucionApi,
    type OpcionNomenclador,
} from '../../../service/nomencladoresApi';

// ─── Tipos ─────────────────────────────────────────────

export interface ProductoAjuste {
    id: string;
    producto: string;
    stock: number;
}

type TipoAjuste = 'entrada' | 'salida';

export interface AjusteInventarioDialogProps {
    open: boolean;
    onClose: () => void;
    /** Productos entre los que se puede elegir (con su stock actual). */
    productos: ProductoAjuste[];
    /** Se llama después de registrar el ajuste, para que la página recargue productos y Kardex. */
    onAjustado: () => void | Promise<void>;
}

interface Errores {
    producto?: string;
    cantidad?: string;
    causa?: string;
}

const MOTIVO_ENTRADA = 'Ingreso de inventario';

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

const toggleSx = (color: string) => ({
    flex: 1,
    gap: 1,
    textTransform: 'none',
    fontWeight: 600,
    color: '#9ca3af',
    borderColor: 'rgba(255,255,255,0.08)',
    '&.Mui-selected, &.Mui-selected:hover': {
        color,
        bgcolor: `${color}1f`,
        borderColor: `${color}66`,
    },
});

// ─── Componente ────────────────────────────────────────

export default function AjusteInventarioDialog({
    open,
    onClose,
    productos,
    onAjustado,
}: AjusteInventarioDialogProps) {
    const notify = useNotify();

    const [productoId, setProductoId] = useState('');
    const [tipo, setTipo] = useState<TipoAjuste>('entrada');
    const [cantidad, setCantidad] = useState('');
    const [causa, setCausa] = useState('');
    const [errores, setErrores] = useState<Errores>({});
    const [guardando, setGuardando] = useState(false);

    const [causas, setCausas] = useState<OpcionNomenclador[]>([]);
    const [cargandoCausas, setCargandoCausas] = useState(false);

    const cargarCausas = useCallback(async () => {
        setCargandoCausas(true);
        try {
            setCausas(await causasDisminucionApi.listar());
        } catch (e) {
            notify.error(getErrorMessage(e, 'No se pudieron cargar las causas de disminución'));
        } finally {
            setCargandoCausas(false);
        }
    }, [notify]);

    // Las causas se piden cada vez que se abre el diálogo (pueden haberse agregado desde otro lugar).
    useEffect(() => {
        if (open) void cargarCausas();
    }, [open, cargarCausas]);

    const producto = useMemo(() => productos.find((p) => p.id === productoId), [productos, productoId]);

    const cantidadNum = Number(cantidad);
    const cantidadValida = cantidad !== '' && Number.isFinite(cantidadNum) && cantidadNum > 0;
    const stockResultante =
        producto && cantidadValida
            ? tipo === 'entrada'
                ? producto.stock + cantidadNum
                : producto.stock - cantidadNum
            : null;

    const limpiar = () => {
        setProductoId('');
        setTipo('entrada');
        setCantidad('');
        setCausa('');
        setErrores({});
    };

    const handleCerrar = () => {
        if (guardando) return;
        limpiar();
        onClose();
    };

    const validar = (): Errores => {
        const e: Errores = {};
        if (!producto) e.producto = 'Seleccione un producto';
        if (!cantidadValida) e.cantidad = 'Ingrese una cantidad mayor que 0';
        else if (producto && tipo === 'salida' && cantidadNum > producto.stock) {
            e.cantidad = `No puede disminuir más del stock actual (${producto.stock})`;
        }
        if (tipo === 'salida' && !causa) e.causa = 'Seleccione la causa de la disminución';
        return e;
    };

    const handleConfirmar = async () => {
        const e = validar();
        setErrores(e);
        if (Object.keys(e).length > 0) return;

        setGuardando(true);
        try {
            await apiRequest('/kardex', {
                method: 'POST',
                body: JSON.stringify({
                    productoId,
                    tipo,
                    cantidad: cantidadNum,
                    motivo: tipo === 'salida' ? causa : MOTIVO_ENTRADA,
                }),
            });
            notify.success('Ajuste de inventario realizado correctamente');
            limpiar();
            onClose();
            await onAjustado();
        } catch (err) {
            notify.error(`Error al ajustar el inventario: ${getErrorMessage(err)}`);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleCerrar}
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
                    <AssignmentAddIcon sx={{ color: '#00e5a0' }} />
                    Ajuste de Inventario
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ pt: '20px !important' }}>
                <Box
                    component="form"
                    noValidate
                    onSubmit={(ev) => {
                        ev.preventDefault();
                        void handleConfirmar();
                    }}
                    sx={{ display: 'grid', gap: 2 }}
                >
                    <FormControl fullWidth size="small" error={!!errores.producto} sx={inputSx}>
                        <InputLabel>Producto</InputLabel>
                        <Select
                            label="Producto"
                            value={productoId}
                            onChange={(ev) => {
                                setProductoId(ev.target.value);
                                setErrores((prev) => ({ ...prev, producto: undefined, cantidad: undefined }));
                            }}
                            disabled={guardando}
                        >
                            {productos.map((p) => (
                                <MenuItem key={p.id} value={p.id}>
                                    {p.producto} (Stock: {p.stock})
                                </MenuItem>
                            ))}
                        </Select>
                        {errores.producto && <FormHelperText>{errores.producto}</FormHelperText>}
                    </FormControl>

                    <ToggleButtonGroup
                        exclusive
                        fullWidth
                        size="small"
                        value={tipo}
                        onChange={(_, valor: TipoAjuste | null) => {
                            if (!valor) return;
                            setTipo(valor);
                            setErrores({});
                        }}
                        disabled={guardando}
                    >
                        <ToggleButton value="entrada" sx={toggleSx('#00e5a0')}>
                            <AddCircleOutlineIcon fontSize="small" />
                            Aumentar stock
                        </ToggleButton>
                        <ToggleButton value="salida" sx={toggleSx('#ef4444')}>
                            <RemoveCircleOutlineIcon fontSize="small" />
                            Disminuir stock
                        </ToggleButton>
                    </ToggleButtonGroup>

                    <TextField
                        size="small"
                        type="number"
                        label={tipo === 'entrada' ? 'Cantidad a aumentar' : 'Cantidad a disminuir'}
                        value={cantidad}
                        onChange={(ev) => {
                            setCantidad(ev.target.value);
                            setErrores((prev) => ({ ...prev, cantidad: undefined }));
                        }}
                        error={!!errores.cantidad}
                        helperText={errores.cantidad}
                        disabled={guardando}
                        slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                        sx={inputSx}
                    />

                    {tipo === 'salida' && (
                        <SelectNomenclador
                            label="Causa"
                            nombreNomenclador="causa de disminución"
                            value={causa}
                            opciones={causas}
                            onChange={(nombre) => {
                                setCausa(nombre);
                                setErrores((prev) => ({ ...prev, causa: undefined }));
                            }}
                            onCrear={causasDisminucionApi.crear}
                            onCreado={cargarCausas}
                            error={!!errores.causa}
                            helperText={errores.causa}
                            disabled={guardando || cargandoCausas}
                        />
                    )}

                    {producto && (
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                px: 2,
                                py: 1.5,
                                borderRadius: 1,
                                bgcolor: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.06)',
                            }}
                        >
                            <Box>
                                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                                    Stock actual
                                </Typography>
                                <Typography sx={{ color: '#e8f5f0', fontWeight: 600 }}>{producto.stock}</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                                    Stock resultante
                                </Typography>
                                <Typography
                                    sx={{
                                        fontWeight: 700,
                                        color:
                                            stockResultante === null
                                                ? '#9ca3af'
                                                : stockResultante < 0
                                                  ? '#ef4444'
                                                  : tipo === 'entrada'
                                                    ? '#00e5a0'
                                                    : '#f59e0b',
                                    }}
                                >
                                    {stockResultante ?? '—'}
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </Box>
            </DialogContent>

            <DialogActions sx={{ display: 'flex', p: 2, gap: 2, width: '100%' }}>
                <Button
                    onClick={handleCerrar}
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
                    onClick={() => void handleConfirmar()}
                    disabled={guardando}
                    fullWidth
                    startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                    sx={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #00e5a0, #00b87d)',
                        color: '#fff',
                        textTransform: 'none',
                        fontWeight: 600,
                        boxShadow: 'none',
                    }}
                >
                    {guardando ? 'Guardando…' : 'Confirmar ajuste'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
