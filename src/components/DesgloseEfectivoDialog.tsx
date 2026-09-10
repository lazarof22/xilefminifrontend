import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Typography,
    Box,
    Stack,
    Divider,
    IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════

export interface DesgloseData {
    [key: string]: number;
}

export interface BilleteConfig {
    key: string;
    label: string;
    valor: number;
}

interface DesgloseEfectivoDialogProps {
    open: boolean;
    onClose: () => void;
    moneda: 'CUP' | 'USD' | 'EUR';
    montoAPagar: number;
    onAceptar: (desglose: DesgloseData, totalDesglose: number) => void;
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE BILLETES POR MONEDA
// ═══════════════════════════════════════════════════════════════
// Nota: se mantienen las keys originales del servicio para compatibilidad
// (incluyendo el typo "billestes_5000" que espera el backend)

const billetesPorMoneda: Record<string, BilleteConfig[]> = {
    CUP: [
        { key: 'billestes_5000', label: 'Billetes de $5000', valor: 5000 },
        { key: 'billetes_2000',  label: 'Billetes de $2000',  valor: 2000 },
        { key: 'billetes_1000',  label: 'Billetes de $1000',  valor: 1000 },
        { key: 'billetes_500',   label: 'Billetes de $500',   valor: 500 },
        { key: 'billetes_200',   label: 'Billetes de $200',   valor: 200 },
        { key: 'billetes_100',   label: 'Billetes de $100',   valor: 100 },
        { key: 'billetes_50',    label: 'Billetes de $50',    valor: 50 },
        { key: 'billetes_20',    label: 'Billetes de $20',    valor: 20 },
        { key: 'billetes_10',    label: 'Billetes de $10',    valor: 10 },
        { key: 'billetes_5',     label: 'Billetes de $5',     valor: 5 },
        { key: 'billetes_3',     label: 'Billetes de $3',     valor: 3 },
        { key: 'billetes_1',     label: 'Billetes de $1',     valor: 1 },
    ],
    USD: [
        { key: 'billetes_100', label: 'Billetes de $100', valor: 100 },
        { key: 'billetes_50',  label: 'Billetes de $50',  valor: 50 },
        { key: 'billetes_20',  label: 'Billetes de $20',  valor: 20 },
        { key: 'billetes_10',  label: 'Billetes de $10',  valor: 10 },
        { key: 'billetes_5',   label: 'Billetes de $5',   valor: 5 },
        { key: 'billetes_1',   label: 'Billetes de $1',   valor: 1 },
    ],
    EUR: [
        { key: 'billetes_100', label: 'Billetes de €100', valor: 100 },
        { key: 'billetes_50',  label: 'Billetes de €50',  valor: 50 },
        { key: 'billetes_20',  label: 'Billetes de €20',  valor: 20 },
        { key: 'billetes_10',  label: 'Billetes de €10',  valor: 10 },
        { key: 'billetes_5',   label: 'Billetes de €5',   valor: 5 },
        { key: 'billetes_1',   label: 'Billetes de €1',   valor: 1 },
    ],
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════

export default function DesgloseEfectivoDialog({
    open,
    onClose,
    moneda,
    montoAPagar,
    onAceptar,
}: DesgloseEfectivoDialogProps): React.JSX.Element {
    const [desglose, setDesglose] = useState<DesgloseData>({});

    const billetes = useMemo(() => billetesPorMoneda[moneda] || billetesPorMoneda.CUP, [moneda]);

    // Inicializar desglose en 0 al abrir
    useEffect(() => {
        if (open) {
            const initial: DesgloseData = {};
            billetes.forEach(b => { initial[b.key] = 0; });
            setDesglose(initial);
        }
    }, [open, billetes]);

    const handleChange = (key: string, value: number): void => {
        setDesglose(prev => ({ ...prev, [key]: Math.max(0, value) }));
    };

    // Suma total en tiempo real
    const totalDesglose = useMemo(() => {
        return billetes.reduce((sum, b) => sum + (desglose[b.key] || 0) * b.valor, 0);
    }, [desglose, billetes]);

    const handleAceptar = (): void => {
        onAceptar(desglose, totalDesglose);
        onClose();
    };

    const simbolo = moneda === 'EUR' ? '€' : '$';
    const estaCuadrado = totalDesglose >= montoAPagar;
    const diferencia = totalDesglose - montoAPagar;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: 3,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        overflow: 'hidden'
                    }
                }
            }}
        >
            {/* ─── Header ─── */}
            <DialogTitle sx={{
                background: 'linear-gradient(135deg, rgba(0, 89, 255, 0.84), rgba(230, 21, 118, 0.9))',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 2
            }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                    💵 Desglose de Efectivo — {moneda}
                </Typography>
                <IconButton onClick={onClose} sx={{ color: 'white' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
                {/* ─── Monto a pagar ─── */}
                <Box sx={{
                    mb: 2.5,
                    p: 2,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, rgba(0,114,255,0.08), rgba(142,45,226,0.08))',
                    border: '1px solid rgba(0,114,255,0.15)',
                    textAlign: 'center'
                }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Monto a Pagar
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a3c44' }}>
                        {simbolo}{montoAPagar.toFixed(2)}
                    </Typography>
                </Box>

                {/* ─── Lista de billetes ─── */}
                <Stack spacing={2}>
                    {billetes.map((item) => (
                        <Box key={item.key} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography sx={{
                                flex: 1,
                                fontWeight: 600,
                                color: '#1a1a2e',
                                fontSize: '0.95rem'
                            }}>
                                {item.label}
                            </Typography>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {/* Botón menos */}
                                <Button
                                    size="small"
                                    onClick={() => handleChange(item.key, (desglose[item.key] || 0) - 1)}
                                    sx={{
                                        minWidth: 32,
                                        height: 32,
                                        p: 0,
                                        borderRadius: 1,
                                        bgcolor: 'rgba(255, 174, 0, 0.78)',
                                        color: 'white',
                                        '&:hover': { bgcolor: 'rgb(255, 166, 0)' }
                                    }}
                                >
                                    <RemoveIcon sx={{ fontSize: 16 }} />
                                </Button>

                                {/* Input cantidad */}
                                <TextField
                                    size="small"
                                    type="number"
                                    value={desglose[item.key] || 0}
                                    onChange={(e) => handleChange(item.key, parseInt(e.target.value) || 0)}
                                    slotProps={{
                                        htmlInput: {
                                            min: 0,
                                            style: { textAlign: 'center', width: 60 }
                                        }
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1,
                                            bgcolor: '#f8f9fa',
                                            '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' },
                                        }
                                    }}
                                />

                                {/* Botón más */}
                                <Button
                                    size="small"
                                    onClick={() => handleChange(item.key, (desglose[item.key] || 0) + 1)}
                                    sx={{
                                        minWidth: 32,
                                        height: 32,
                                        p: 0,
                                        borderRadius: 1,
                                        bgcolor: 'rgba(255, 174, 0, 0.78)',
                                        color: 'white',
                                        '&:hover': { bgcolor: 'rgb(255, 166, 0)' }
                                    }}
                                >
                                    <AddIcon sx={{ fontSize: 16 }} />
                                </Button>
                            </Box>

                            {/* Subtotal de la línea */}
                            <Typography sx={{
                                minWidth: 90,
                                textAlign: 'right',
                                fontWeight: 600,
                                color: '#666',
                                fontSize: '0.9rem'
                            }}>
                                = {simbolo}{((desglose[item.key] || 0) * item.valor).toFixed(2)}
                            </Typography>
                        </Box>
                    ))}
                </Stack>

                <Divider sx={{ my: 2.5 }} />

                {/* ─── Totales ─── */}
                <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body1" sx={{ color: '#666', mb: 0.5 }}>
                        Total Desglose:{" "}
                        <strong style={{ color: '#1a3c44', fontSize: '1.1rem' }}>
                            {simbolo}{totalDesglose.toFixed(2)}
                        </strong>
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: 700,
                            color: diferencia >= 0 ? '#2e7d32' : '#d32f2f',
                        }}
                    >
                        {diferencia >= 0
                            ? `✓ Cuadrado (Sobrante: ${simbolo}${diferencia.toFixed(2)})`
                            : `✗ Faltan: ${simbolo}${Math.abs(diferencia).toFixed(2)}`
                        }
                    </Typography>
                </Box>
            </DialogContent>

            {/* ─── Acciones ─── */}
            <DialogActions sx={{ p: 2.5, gap: 2 }}>
                <Button
                    onClick={onClose}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        color: '#666',
                        borderRadius: 2,
                        px: 3
                    }}
                >
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    onClick={handleAceptar}
                    disabled={!estaCuadrado}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 4,
                        background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                        color: "#fff",
                        borderRadius: 2,
                        boxShadow: "0 4px 12px rgba(10, 83, 218, 0.3)",
                        '&:hover': {
                            boxShadow: "0 4px 12px rgba(13, 248, 5, 0.93)"
                        },
                        '&:disabled': {
                            background: 'rgba(0,0,0,0.12)',
                            color: 'rgba(0,0,0,0.26)',
                            boxShadow: 'none'
                        }
                    }}
                >
                    Aceptar
                </Button>
            </DialogActions>
        </Dialog>
    );
}