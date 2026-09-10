import { Box, Typography, Card, Snackbar, Alert, TextField, Button, CardContent, CircularProgress, MenuItem } from '@mui/material';
import CustomDataGrid from "../../components/CustomDataGrid";
import { useState, useEffect } from 'react'
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import FilterListIcon from "@mui/icons-material/FilterList";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';
import dayjs from 'dayjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
interface Licencia {
    _id?: string;
    clave_activacion: string;
    fecha_inicio: string;
    fecha_vencimiento: string;
    tipo: string;
    empresa: string;
    empresa_id: string;
    activa: boolean;
    revocada: boolean;
    dias_restantes: number;
    max_usuarios: number;
}

interface LicenciaRow {
    id: string;
    estado: string;
    fechaActivacion: string;
    fechaVencimiento: string;
    accion: string;
}

interface AccionesOption {
    value: string;
    label: string;
}



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

const ACCIONES: AccionesOption[] = [
    { value: 'Activar Licencia', label: 'Activar Licencia' },
    { value: 'Renovar Licencia', label: 'Renovar Licencia' }
];

const TIPOS_LICENCIA = [
    { value: 'trial', label: 'Trial' },
    { value: 'suscripcion_mensual', label: 'Suscripción Mensual' },
    { value: 'suscripcion_anual', label: 'Suscripción Anual' },
    { value: 'perpetua', label: 'Perpetua' }
];

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
    // ESTADOS LICENCIAS
    // ═══════════════════════════════════════════════════════
    const [licenciasActivas, setLicenciasActivas] = useState<LicenciaRow[]>([]);
    const [historialLicencias, setHistorialLicencias] = useState<LicenciaRow[]>([]);
    const [fechaInicio, setFechaInicio] = useState<dayjs.Dayjs | null>(null);
    const [fechaVencimiento, setFechaVencimiento] = useState<dayjs.Dayjs | null>(null);
    const [claveActivacion, setClaveActivacion] = useState<string>('');
    const [accionLicencia, setAccionLicencia] = useState<string>('');
    const [tipoLicencia, setTipoLicencia] = useState<string>('suscripcion_mensual');
    const [maxUsuarios, setMaxUsuarios] = useState<number>(10);

    const [errors, setErrors] = useState<Record<string, string>>({});

    // ═══════════════════════════════════════════════════════
    // CARGA INICIAL
    // ═══════════════════════════════════════════════════════
    useEffect(() => {
        cargarLicencias();
    }, []);



    // ═══════════════════════════════════════════════════════
    // API: LICENCIAS
    // ═══════════════════════════════════════════════════════
    const cargarLicencias = async () => {
        try {
            const data: Licencia[] = await fetchWithAuth('/licencia');
            const mapped = data.map(l => ({
                id: l._id || l.clave_activacion,
                estado: l.activa ? (l.revocada ? "Revocada" : "Activa") : "Inactiva",
                fechaActivacion: new Date(l.fecha_inicio).toLocaleDateString('es-ES'),
                fechaVencimiento: new Date(l.fecha_vencimiento).toLocaleDateString('es-ES'),
                accion: l.tipo
            }));
            setLicenciasActivas(mapped.filter(l => l.estado === "Activa"));
            setHistorialLicencias(mapped);
        } catch (error: any) {
            showMessage(error.message, "error");
        }
    };

    const generarLicencia = async () => {
        if (!fechaInicio || !fechaVencimiento) {
            showMessage("Las fechas son requeridas", "error");
            return;
        }
        try {
            setLoading(true);
            const data = await fetchWithAuth('/licencia/generar', {
                method: 'POST',
                body: JSON.stringify({
                    empresa_nombre: datosEmpresa.nombre,
                    empresa_id: datosEmpresa.ruc_nit,
                    tipo: tipoLicencia,
                    duracion_dias: fechaVencimiento.diff(fechaInicio, 'day'),
                    max_usuarios: maxUsuarios,
                    fecha_inicio: fechaInicio.format('YYYY-MM-DD'),
                    fecha_vencimiento: fechaVencimiento.format('YYYY-MM-DD')
                })
            });
            setClaveActivacion(data.licencia.clave);
            await cargarLicencias();
            showMessage(`Licencia generada: ${data.licencia.clave}`);
        } catch (error: any) {
            showMessage(error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const activarLicencia = async () => {
        if (!claveActivacion) {
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
            await cargarLicencias();
            showMessage("Licencia activada correctamente");
        } catch (error: any) {
            showMessage(error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const renovarLicencia = async () => {
        if (!claveActivacion) {
            showMessage("Ingrese la clave de activación", "error");
            return;
        }
        try {
            setLoading(true);
            await fetchWithAuth('/licencia/renovar', {
                method: 'POST',
                body: JSON.stringify({
                    clave_activacion: claveActivacion,
                    fecha_vencimiento: fechaVencimiento?.format('YYYY-MM-DD')
                })
            });
            await cargarLicencias();
            showMessage("Licencia renovada correctamente");
        } catch (error: any) {
            showMessage(error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAccionLicencia = () => {
        if (accionLicencia === 'Activar Licencia') {
            activarLicencia();
        } else if (accionLicencia === 'Renovar Licencia') {
            renovarLicencia();
        }
    };


    // ═══════════════════════════════════════════════════════
    // EXPORTAR PDF
    // ═══════════════════════════════════════════════════════
    const handleExportPDF = () => {
        const doc = new jsPDF();
        const title = "Historial de Licencias";

        doc.setFontSize(16);
        doc.text(title, 14, 15);

        const columns = [
            { field: "estado", headerName: "Estado" },
            { field: "fechaActivacion", headerName: "Fecha Activación" },
            { field: "fechaVencimiento", headerName: "Fecha Vencimiento" },
            { field: "accion", headerName: "Acción" }
        ];

        const tableColumn = columns.map((col) => col.headerName);
        const tableRows = historialLicencias.map((row) =>
            columns.map((col) => String(row[col.field as keyof LicenciaRow]))
        );

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 20,
        });

        doc.save(`${title}.pdf`);
    };

    // ═══════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
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
                    LICENCIAS ACTIVAS
                    ═══════════════════════════════════════════════════════ */}
                <Box sx={{ m: 2 }}>
                    <Card sx={{ width: '100%' }}>
                        <CardContent>
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
                                    Licencias Activas
                                </Typography>
                            </Box>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                    <CircularProgress />
                                </Box>
                            ) : (
                                <CustomDataGrid
                                    rows={licenciasActivas}
                                    getRowId={(row) => row.id}
                                    columns={[
                                        { field: "estado", headerName: "Estado" },
                                        { field: "fechaActivacion", headerName: "Fecha de Activación" },
                                        { field: "fechaVencimiento", headerName: "Fecha de Vencimiento" },
                                    ]}
                                />
                            )}
                        </CardContent>
                    </Card>
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
                            <Box sx={{ flex: '1 1 250px' }}>
                                <Typography sx={{ mb: 1, fontWeight: 500, color: '#666' }}>
                                    Fecha de Inicio
                                </Typography>
                                <MobileDatePicker
                                    value={fechaInicio}
                                    onChange={(newValue) => {
                                        setFechaInicio(newValue);
                                        if (errors.fechaInicio) {
                                            setErrors(prev => ({ ...prev, fechaInicio: '' }));
                                        }
                                    }}
                                    format="DD/MM/YYYY"
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            error: !!errors.fechaInicio,
                                            helperText: errors.fechaInicio,
                                            size: "small",
                                            sx: {
                                                '& .MuiOutlinedInput-root': {
                                                    backgroundColor: '#f8f9fa',
                                                }
                                            }
                                        }
                                    }}
                                />
                            </Box>

                            <Box sx={{ flex: '1 1 250px' }}>
                                <Typography sx={{ mb: 1, fontWeight: 500, color: '#666' }}>
                                    Fecha de Vencimiento
                                </Typography>
                                <MobileDatePicker
                                    value={fechaVencimiento}
                                    onChange={(newValue) => {
                                        setFechaVencimiento(newValue);
                                        if (errors.fechaVencimiento) {
                                            setErrors(prev => ({ ...prev, fechaVencimiento: '' }));
                                        }
                                    }}
                                    format="DD/MM/YYYY"
                                    minDate={fechaInicio || undefined}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            error: !!errors.fechaVencimiento,
                                            helperText: errors.fechaVencimiento,
                                            size: "small",
                                            sx: {
                                                '& .MuiOutlinedInput-root': {
                                                    backgroundColor: '#f8f9fa',
                                                }
                                            }
                                        }
                                    }}
                                />
                            </Box>

                            <Box sx={{ flex: '1 1 250px' }}>
                                <Typography sx={{ mb: 1, fontWeight: 500, color: '#666' }}>
                                    Tipo de Licencia
                                </Typography>
                                <TextField
                                    select
                                    fullWidth
                                    size="small"
                                    value={tipoLicencia}
                                    onChange={(e) => setTipoLicencia(e.target.value)}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1,
                                            backgroundColor: '#f8f9fa',
                                        }
                                    }}
                                >
                                    {TIPOS_LICENCIA.map((tipo) => (
                                        <MenuItem key={tipo.value} value={tipo.value}>
                                            {tipo.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Box>

                            <Box sx={{ flex: '1 1 250px' }}>
                                <Typography sx={{ mb: 1, fontWeight: 500, color: '#666' }}>
                                    Máx. Usuarios
                                </Typography>
                                <TextField
                                    fullWidth
                                    type="number"
                                    size="small"
                                    value={maxUsuarios}
                                    onChange={(e) => setMaxUsuarios(Number(e.target.value))}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1,
                                            backgroundColor: '#f8f9fa',
                                        }
                                    }}
                                />
                            </Box>

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
                                        }
                                    }}
                                />
                            </Box>

                            <Box sx={{ flex: '1 1 200px' }}>
                                <Typography sx={{ mb: 1, fontWeight: 500, color: '#666' }}>
                                    Acción
                                </Typography>
                                <TextField
                                    select
                                    fullWidth
                                    size="small"
                                    value={accionLicencia}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccionLicencia(e.target.value)}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1,
                                            backgroundColor: '#f8f9fa',
                                        }
                                    }}
                                    error={!!errors.accion}
                                    helperText={errors.accion}
                                    disabled={loading}
                                >
                                    {ACCIONES.map((tipo: AccionesOption) => (
                                        <MenuItem key={tipo.value} value={tipo.value}>
                                            {tipo.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2, mt: 2, px: 2, pb: 2 }}>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<FilterListIcon sx={{ fontSize: 16 }} />}
                                onClick={generarLicencia}
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
                                Generar Licencia
                            </Button>

                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<FilterListIcon sx={{ fontSize: 16 }} />}
                                onClick={handleAccionLicencia}
                                disabled={loading || !accionLicencia}
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
                                {accionLicencia || 'Ejecutar Acción'}
                            </Button>

                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<PictureAsPdfIcon sx={{ fontSize: 16 }} />}
                                onClick={handleExportPDF}
                                sx={{
                                    textTransform: 'none',
                                    background: "linear-gradient(135deg, rgba(255,0,0,0.9), rgba(196, 45, 226, 0.9))",
                                    boxShadow: "0 4px 19px rgba(0,0,0,0.2)",
                                    color: '#ffffff',
                                    borderRadius: 1,
                                    px: 3,
                                    py: 0.8,
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    "&:hover": {
                                        background: "linear-gradient(135deg, rgba(255,0,0,0.9), rgba(226, 45, 187, 0.9))",
                                        boxShadow: "0 4px 12px rgba(158, 6, 6, 0.62)"
                                    }
                                }}
                            >
                                Exportar PDF
                            </Button>
                        </Box>
                    </Card>
                </Box>

                {/* ═══════════════════════════════════════════════════════
                    HISTORIAL DE LICENCIAS
                    ═══════════════════════════════════════════════════════ */}
                <Box sx={{ m: 2 }}>
                    <Card sx={{ width: '100%', p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <PictureAsPdfIcon sx={{ color: '#1976d2', fontSize: 22 }} />
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 600,
                                    background: "linear-gradient(135deg, rgba(0, 89, 255, 0.84), rgba(230, 21, 118, 0.9))",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent"
                                }}
                            >
                                Historial de Licencias
                            </Typography>
                        </Box>
                        <Box>
                            <CustomDataGrid
                                rows={historialLicencias}
                                getRowId={(row) => row.id}
                                columns={[
                                    { field: "fechaActivacion", headerName: "Fecha Activación" },
                                    { field: "fechaVencimiento", headerName: "Fecha Vencimiento" },
                                    { field: "estado", headerName: "Estado" },
                                    { field: "accion", headerName: "Acción" },
                                ]}
                            />
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
        </LocalizationProvider>
    );
}