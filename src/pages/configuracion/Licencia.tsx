import { Box, Typography, Card, Snackbar, Alert, TextField, Button, InputAdornment, IconButton } from '@mui/material';
import { useState, useEffect } from 'react'
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FilterListIcon from "@mui/icons-material/FilterList";

// ═══════════════════════════════════════════════════════
// CONFIGURACIÓN DE API
// ═══════════════════════════════════════════════════════
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string> || {})
    };

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
};

// ═══════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════
interface EmpresaData {
    _id?: string;
    nombre: string;
    eslogan: string;
    direccion: string;
    telefono: string;
    email: string;
    ruc_nit: string;
    ciudad: string;
    pais: string;
    logo?: string;
}

export default function LicenciaPage() {
    // ═══════════════════════════════════════════════════════
    // ESTADOS GENERALES
    // ═══════════════════════════════════════════════════════
    const [loading, setLoading] = useState(false);

    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");

    const showMessage = (message: string, severity: "success" | "error" = "success") => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setOpenSnackbar(true);
    };

    // ═══════════════════════════════════════════════════════
    // ESTADOS DATOS DE LA EMPRESA
    // ═══════════════════════════════════════════════════════
    const [datosEmpresa, setDatosEmpresa] = useState<EmpresaData>({
        nombre: "",
        eslogan: "",
        direccion: "",
        telefono: "",
        email: "",
        ruc_nit: "",
        ciudad: "",
        pais: ""
    });

    // ═══════════════════════════════════════════════════════
    // ESTADOS LICENCIA
    // ═══════════════════════════════════════════════════════
    const [codigoIdentificador, setCodigoIdentificador] = useState<string>('');
    const [claveActivacion, setClaveActivacion] = useState<string>('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    // ═══════════════════════════════════════════════════════
    // CARGA INICIAL: CÓDIGO IDENTIFICADOR DE LA MÁQUINA
    // ═══════════════════════════════════════════════════════
    useEffect(() => {
        cargarCodigoIdentificador();
    }, []);

    // ═══════════════════════════════════════════════════════
    // API: CÓDIGO IDENTIFICADOR
    // ═══════════════════════════════════════════════════════
    const cargarCodigoIdentificador = async () => {
        try {
            const data: { success: boolean; codigo: string } = await fetchWithAuth('/licencia/codigoid');
            if (data.success && data.codigo) {
                setCodigoIdentificador(data.codigo);
            } else {
                showMessage('No se pudo obtener el código identificador', 'error');
            }
        } catch (error: any) {
            showMessage(error.message || 'No conectado: fallo al obtener el código identificador', 'error');
        }
    };

    // ═══════════════════════════════════════════════════════
    // API: ACTIVAR LICENCIA
    // ═══════════════════════════════════════════════════════
    const activarLicencia = async () => {
        if (!claveActivacion) {
            setErrors({ claveActivacion: 'Ingrese la clave de activación' });
            showMessage("Ingrese la clave de activación", "error");
            return;
        }
        try {
            setLoading(true);
            await fetchWithAuth('/licencia/activar', {
                method: 'POST',
                body: JSON.stringify({
                    clave_activacion: claveActivacion,
                    empresa_nombre: datosEmpresa.nombre,
                    empresa_id: datosEmpresa.ruc_nit
                })
            });
            showMessage("Licencia activada correctamente");
        } catch (error: any) {
            showMessage(error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    // ═══════════════════════════════════════════════════════
    // COPIAR CÓDIGO IDENTIFICADOR AL PORTAPAPELES
    // ═══════════════════════════════════════════════════════
    const copiarCodigo = async () => {
        if (!codigoIdentificador) return;
        try {
            await navigator.clipboard.writeText(codigoIdentificador);
            showMessage('Código identificador copiado al portapapeles');
        } catch {
            showMessage('No se pudo copiar el código', 'error');
        }
    };

    // ═══════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════
    return (
        <Box>
            {/* Header */}
            <Box
                sx={{
                    width: '100%',
                    height: 60,
                    background:
                        "linear-gradient(135deg, rgba(0,114,255,0.9), rgba(142,45,226,0.9)), url('/images/login-bg.jpg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    alignContent: 'center',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 2,
                }}>
                <Typography variant="h5" sx={{ ml: 2, color: 'white' }}>
                    Licencia
                </Typography>
            </Box>

            {/* ═══════════════════════════════════════════════════════
                FORMULARIO GESTIÓN DE LICENCIA
                ═══════════════════════════════════════════════════════ */}
            <Box sx={{ m: 2 }}>
                <Card sx={{ width: '100%', p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <FilterListIcon sx={{ color: '#1976d2', fontSize: 22 }} />
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 600,
                                background: "linear-gradient(135deg, rgba(0, 89, 255, 0.84), rgba(230, 21, 118, 0.9))",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent"
                            }}
                        >
                            Gestión de Licencia
                        </Typography>
                    </Box>

                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, p: 2 }}>

                        {/* Generador de Código Identificador (solo lectura / copiable) */}
                        <Box sx={{ flex: '1 1 250px' }}>
                            <Typography sx={{ mb: 1, fontWeight: 500, color: '#666' }}>
                                Generador de Código Identificador
                            </Typography>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Cargando código..."
                                value={codigoIdentificador}
                                InputProps={{
                                    readOnly: true,
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                size="small"
                                                onClick={copiarCodigo}
                                                disabled={!codigoIdentificador}
                                                sx={{ color: '#1976d2' }}
                                                title="Copiar código"
                                            >
                                                <ContentCopyIcon sx={{ fontSize: 18 }} />
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 1,
                                        backgroundColor: '#f8f9fa',
                                        color: '#666'
                                    }
                                }}
                            />
                        </Box>

                        {/* Clave de Activación (se pega el código copiado) */}
                        <Box sx={{ flex: '1 1 250px' }}>
                            <Typography sx={{ mb: 1, fontWeight: 500, color: '#666' }}>
                                Clave de Activación
                            </Typography>
                            <TextField
                                fullWidth
                                type="password"
                                size="small"
                                placeholder="Ingrese la clave"
                                value={claveActivacion}
                                onChange={(e) => {
                                    setClaveActivacion(e.target.value);
                                    if (errors.claveActivacion) {
                                        setErrors(prev => ({ ...prev, claveActivacion: '' }));
                                    }
                                }}
                                error={!!errors.claveActivacion}
                                helperText={errors.claveActivacion}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 1,
                                        backgroundColor: '#f8f9fa',
                                        color: '#666'
                                    }
                                }}
                            />
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, mt: 2, px: 2, pb: 2 }}>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<FilterListIcon sx={{ fontSize: 16 }} />}
                            onClick={activarLicencia}
                            disabled={loading}
                            sx={{
                                textTransform: 'none',
                                background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                                color: "#fff",
                                boxShadow: "0 4px 19px rgba(0,0,0,0.2)",
                                borderRadius: 1,
                                px: 3,
                                py: 0.8,
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                "&:hover": {
                                    background: "linear-gradient(135deg, rgba(10, 83, 218, 1), rgba(10, 218, 20, 1))",
                                    boxShadow: "0 6px 16px rgba(9, 80, 212, 0.58)"
                                }
                            }}
                        >
                            Activar Licencia
                        </Button>
                    </Box>
                </Card>
            </Box>

            <Snackbar
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={() => setOpenSnackbar(false)}
            >
                <Alert
                    severity={snackbarSeverity}
                    variant="filled"
                    onClose={() => setOpenSnackbar(false)}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
}