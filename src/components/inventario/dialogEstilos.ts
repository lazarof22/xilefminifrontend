// Estilos compartidos por los dialogs de movimientos de inventario
// (mismo diseño que AñadirProveedorDialog / AjusteInventarioDialog).

export const paperSx = {
    bgcolor: '#151a19',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
    borderRadius: 2,
};

export const tituloSx = {
    background: 'linear-gradient(135deg, #0a0f0d 0%, #151a19 100%)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
};

export const tituloTextoSx = {
    textAlign: 'center',
    color: '#00e5a0',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
} as const;

export const inputSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 1,
        bgcolor: 'rgba(255,255,255,0.03)',
        color: '#e8f5f0',
        '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
        '&:hover fieldset': { borderColor: 'rgba(0,229,160,0.35)' },
        '&.Mui-focused fieldset': { borderColor: '#00e5a0' },
    },
};

export const botonCancelarSx = {
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
};

export const botonGuardarSx = {
    flex: 1,
    background: 'linear-gradient(135deg, #00e5a0, #00b87d)',
    color: '#fff',
    textTransform: 'none',
    fontWeight: 600,
    boxShadow: 'none',
} as const;
