import {
    Box,
    Typography,
    Snackbar,
    Alert,
    Tabs,
    Tab,
} from '@mui/material';
import { useEffect, useState } from 'react';
import ConfiguracionEmpresaTab from '../../components/configuracion/ConfiguracionEmpresaTab';
import ConfiguracionUsuariosTab from '../../components/configuracion/ConfiguracionUsuariosTab';

export interface EmpresaData {
    nombre: string;
    eslogan: string;
    direccion: string;
    telefono: string;
    email: string;
    ruc_nit: string;
    ciudad: string;
    pais: string;
}

export interface UsuarioBackend {
    _id: string;
    ci_empleado: string;
    nombre_empleado: string;
    correo_empleado: string;
    departamento: string;
    cargo: string;
    salario: number;
    rol: string;
    createdAt: string;
}

export interface UsuarioRow {
    id: number;
    usuario: string;
    accion: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string> || {}),
    };

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
};

export default function ConfiguracionPage() {
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(false);

    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

    const [datosEmpresa, setDatosEmpresa] = useState<EmpresaData>({
        nombre: '',
        eslogan: '',
        direccion: '',
        telefono: '',
        email: '',
        ruc_nit: '',
        ciudad: '',
        pais: '',
    });

    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
    const [csvContent, setCsvContent] = useState('');
    const [respaldoFile, setRespaldoFile] = useState<File | null>(null);

    const showMessage = (message: string, severity: 'success' | 'error' = 'success') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setOpenSnackbar(true);
    };

    const cargarEmpresa = async () => {
        try {
            setLoading(true);
            const data = await fetchWithAuth('/empresa');

            if (data) {
                setDatosEmpresa({
                    nombre: data.nombre || '',
                    eslogan: data.eslogan || '',
                    direccion: data.direccion || '',
                    telefono: data.telefono || '',
                    email: data.email || '',
                    ruc_nit: data.ruc_nit || '',
                    ciudad: data.ciudad || '',
                    pais: data.pais || '',
                });

                if (data.logo) setLogoPreview(data.logo);
            }
        } catch (error: any) {
            showMessage(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const cargarUsuarios = async () => {
        try {
            const data: UsuarioBackend[] = await fetchWithAuth('/usuarios');

            setUsuarios(data.map((u, index) => ({
                id: index + 1,
                usuario: u.nombre_empleado.toUpperCase(),
                accion: u.rol,
            })));
        } catch (error: any) {
            showMessage(error.message, 'error');
        }
    };

    useEffect(() => {
        void cargarEmpresa();
        void cargarUsuarios();
    }, []);

    const guardarEmpresa = async () => {
        try {
            setLoading(true);

            await fetchWithAuth('/empresa', {
                method: 'PUT',
                body: JSON.stringify(datosEmpresa),
            });

            showMessage('Datos de la empresa guardados correctamente');
        } catch (error: any) {
            showMessage(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChangeEmpresa = (campo: keyof EmpresaData, valor: string) => {
        setDatosEmpresa(prev => ({ ...prev, [campo]: valor }));
    };

    const subirLogo = async (base64Logo: string) => {
        try {
            setLoading(true);

            const data = await fetchWithAuth('/empresa/logo', {
                method: 'POST',
                body: JSON.stringify({ logo: base64Logo }),
            });

            setLogoPreview(data.logo);
            showMessage('Logo actualizado correctamente');
        } catch (error: any) {
            showMessage(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const eliminarLogo = async () => {
        try {
            setLoading(true);

            await fetchWithAuth('/empresa', {
                method: 'PUT',
                body: JSON.stringify({ logo: '' }),
            });

            setLogoPreview(null);
            showMessage('Logo eliminado');
        } catch (error: any) {
            showMessage(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const agregarUsuario = async (datos: {
        nombre: string;
        contrasena: string;
        correo: string;
        ci: string;
        departamento: string;
        cargo: string;
        salario: string;
    }) => {
        if (!datos.nombre.trim() || !datos.contrasena.trim()) {
            showMessage('Usuario y contraseña son requeridos', 'error');
            return;
        }

        try {
            setLoading(true);

            await fetchWithAuth('/usuarios', {
                method: 'POST',
                body: JSON.stringify({
                    ci_empleado: datos.ci || '00000000000',
                    nombre_empleado: datos.nombre,
                    correo_empleado: datos.correo || `${datos.nombre.toLowerCase().replace(/\s/g, '')}@xilef.com`,
                    contraseña: datos.contrasena,
                    departamento: datos.departamento || '60d5f9f8e3b3c8b0f4e4d3a1',
                    cargo: datos.cargo || '60d5f9f8e3b3c8b0f4e4d3a2',
                    salario: Number(datos.salario) || 2500,
                    rol: 'empleado',
                }),
            });

            await cargarUsuarios();
            showMessage('Usuario creado correctamente');
        } catch (error: any) {
            showMessage(error.message, 'error');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const eliminarUsuario = async (_id: number) => {
        showMessage('Funcionalidad de eliminar requiere ID real del backend', 'error');
    };

    const descargarPlantilla = () => {
        const csv = 'codigo,nombre,precio_compra,precio_venta,stock_inicial,stock_minimo\n';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_productos.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const importarCSV = async () => {
        if (!csvContent) {
            showMessage('Seleccione un archivo CSV primero', 'error');
            return;
        }

        try {
            setLoading(true);

            const data = await fetchWithAuth('/importar/csv', {
                method: 'POST',
                body: JSON.stringify({ csv: csvContent }),
            });

            showMessage(`Importados: ${data.imported}, Errores: ${data.errors.length}`);
        } catch (error: any) {
            showMessage(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const exportarRespaldo = async () => {
        try {
            setLoading(true);

            const data = await fetchWithAuth('/respaldo/exportar');
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `respaldo_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            window.URL.revokeObjectURL(url);

            showMessage('Respaldo exportado correctamente');
        } catch (error: any) {
            showMessage(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const importarRespaldo = async () => {
        if (!respaldoFile) {
            showMessage('Seleccione un archivo de respaldo', 'error');
            return;
        }

        try {
            setLoading(true);

            const content = await respaldoFile.text();
            const jsonData = JSON.parse(content);

            const data = await fetchWithAuth('/respaldo/importar', {
                method: 'POST',
                body: JSON.stringify(jsonData),
            });

            showMessage(`Importados: ${data.imported}, Errores: ${data.errors.length}`);
        } catch (error: any) {
            showMessage(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCSVSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setCsvContent(event.target?.result as string);
        };
        reader.readAsText(file);
    };

    const handleRespaldoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setRespaldoFile(file);
    };

    const handleChangeTab = (_event: React.SyntheticEvent, newValue: number) => {
        setTab(newValue);
    };

    return (
        <Box sx={{ width: '100%', px: 2, pt: 2 }}>
            <Box
                sx={{
                    width: '100%',
                    height: 60,
                    background:
                        "linear-gradient(135deg, rgba(0,114,255,0.9), rgba(142,45,226,0.9)), url('/images/login-bg.jpg')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    alignContent: 'center',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 2,
                }}
            >
                <Typography variant="h5" sx={{ ml: 2, color: 'white' }}>
                    Configuración
                </Typography>
            </Box>
            

            <Box sx={{ width: '100%', px: 2, pt: 2 }}>
                <Box sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        mb: 2,
                    }}>
                    <Tabs
                         value={tab}
                         onChange={handleChangeTab}
                         variant="scrollable"
                         scrollButtons="auto"
                         allowScrollButtonsMobile
                         slotProps={{
                             indicator: { sx: { display: 'none' } }
                         }}
                         sx={{
                            background: '#151a19',
                            borderRadius: 50,
                            border: '1px solid rgba(255,255,255,0.06)',
                            p: 0.5,
                            minHeight: 'auto',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                            '& .MuiTabs-flexContainer': {
                                gap: 0.5,
                            },
                            '& .MuiTabs-scrollButtons': {
                                color: '#9ca3af',
                                borderRadius: '50%',
                                width: 32,
                                height: 32,
                                m: 0.5,
                                '&:hover': {
                                    backgroundColor: 'rgba(0,229,160,0.08)',
                                    color: '#00e5a0',
                                },
                                '&.Mui-disabled': {
                                    opacity: 0.2,
                                },
                            },
                        }}
                                        >
                        {[
                            { label: 'Empresa' },
                            { label: 'Usuarios' },
                        ].map((t, idx) => (
                            <Tab
                                key={idx}
                                label={t.label}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    borderRadius: 50,
                                    minHeight: 40,
                                    px: 2.5,
                                    py: 0.8,
                                    color: '#9ca3af',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&:hover': {
                                        color: '#f0f0f0',
                                        backgroundColor: 'rgba(255,255,255,0.04)',
                                    },
                                    '&.Mui-selected': {
                                        color: '#0a0f0d',
                                        backgroundColor: '#00e5a0',
                                        fontWeight: 700,
                                        boxShadow: '0 2px 12px rgba(0,229,160,0.35)',
                                        '&:hover': {
                                            backgroundColor: '#5cffc8',
                                            boxShadow: '0 4px 20px rgba(0,229,160,0.45)',
                                        },
                                    },
                                }}
                            />
                        ))}
                    </Tabs>
                </Box>

                {tab === 0 && (
                    <ConfiguracionEmpresaTab
                        datosEmpresa={datosEmpresa}
                        loading={loading}
                        logoPreview={logoPreview}
                        guardarEmpresa={guardarEmpresa}
                        handleChangeEmpresa={handleChangeEmpresa}
                        subirLogo={subirLogo}
                        eliminarLogo={eliminarLogo}
                        descargarPlantilla={descargarPlantilla}
                        importarCSV={importarCSV}
                        exportarRespaldo={exportarRespaldo}
                        importarRespaldo={importarRespaldo}
                        csvContent={csvContent}
                        respaldoFile={respaldoFile}
                        onCSVSelect={handleCSVSelect}
                        onRespaldoSelect={handleRespaldoSelect}
                    />
                )}

                {tab === 1 && (
                    <ConfiguracionUsuariosTab
                        usuarios={usuarios}
                        loading={loading}
                        agregarUsuario={agregarUsuario}
                        eliminarUsuario={eliminarUsuario}
                    />
                )}
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
