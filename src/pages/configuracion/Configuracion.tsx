import {
    Box,
    Typography,
    Tabs,
    Tab,
    Button,
    Tooltip,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import PublicIcon from '@mui/icons-material/Public';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import ConfiguracionEmpresaTab, { type TipoImportacion } from '../../components/configuracion/ConfiguracionEmpresaTab';
import ConfiguracionUsuariosTab from '../../components/configuracion/ConfiguracionUsuariosTab';
import AgregarPaisDialog, { type AgregarPaisFormData } from '../../components/configuracion/AgregarPaisDialog';
import AgregarCiudadDialog, { type AgregarCiudadFormData } from '../../components/configuracion/AgregarCiudadDialog';
import { useNotify } from '../../components/notificaciones/useNotify';
import { getErrorMessage } from '../../utils/errorMessage';
import {
    configuracionApi,
    type Ciudad,
    type EmpresaDatos,
    type Pais,
} from '../../service/configuracionApi';

const EMPRESA_VACIA: EmpresaDatos = {
    nombre: '',
    eslogan: '',
    direccion: '',
    telefono: '',
    email: '',
    ruc_nit: '',
    ciudad: '',
    pais: '',
};

const PLANTILLAS: Record<TipoImportacion, { archivo: string; columnas: string }> = {
    productos: {
        archivo: 'plantilla_productos.csv',
        columnas: 'codigo,nombre,precio_compra,precio_venta,stock_inicial,stock_minimo',
    },
    cuentas: {
        archivo: 'plantilla_cuentas.csv',
        columnas: 'codigo,nombre,naturaleza,moneda,grupo,elemento,partida,padre,descripcion',
    },
};

const headerButtonSx = {
    textTransform: 'none',
    fontWeight: 600,
    background: 'linear-gradient(135deg, #00e5a0, #00b87d)',
    color: '#fff',
    boxShadow: '0 4px 12px rgba(0,229,160,0.20)',
    '&.Mui-disabled': {
        background: 'rgba(255,255,255,0.06)',
        color: 'rgba(255,255,255,0.3)',
    },
};

const descargarArchivo = (contenido: string, tipo: string, nombre: string): void => {
    const url = window.URL.createObjectURL(new Blob([contenido], { type: tipo }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    window.URL.revokeObjectURL(url);
};

export default function ConfiguracionPage() {
    const notify = useNotify();
    const [tab, setTab] = useState(0);
    // Arrancan en true: la carga inicial se lanza desde el useEffect de montaje.
    const [loading, setLoading] = useState(true);

    const [datosEmpresa, setDatosEmpresa] = useState<EmpresaDatos>(EMPRESA_VACIA);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [paises, setPaises] = useState<Pais[]>([]);
    const [ciudades, setCiudades] = useState<Ciudad[]>([]);

    const [tipoImportacion, setTipoImportacion] = useState<TipoImportacion>('productos');
    const [csvContent, setCsvContent] = useState('');
    const [csvFileName, setCsvFileName] = useState<string | null>(null);
    const [respaldoFile, setRespaldoFile] = useState<File | null>(null);

    const [dialogPaisOpen, setDialogPaisOpen] = useState(false);
    const [dialogCiudadOpen, setDialogCiudadOpen] = useState(false);

    // ─── Carga de datos ───

    const cargarEmpresa = useCallback(async (mostrarCarga = true) => {
        try {
            if (mostrarCarga) setLoading(true);
            const data = await configuracionApi.obtenerEmpresa();
            if (data) {
                setDatosEmpresa({
                    nombre: data.nombre ?? '',
                    eslogan: data.eslogan ?? '',
                    direccion: data.direccion ?? '',
                    telefono: data.telefono ?? '',
                    email: data.email ?? '',
                    ruc_nit: data.ruc_nit ?? '',
                    ciudad: data.ciudad ?? '',
                    pais: data.pais ?? '',
                });
                setLogoPreview(data.logo || null);
            }
        } catch (error) {
            notify.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [notify]);

    const cargarPaises = useCallback(async () => {
        try {
            const data = await configuracionApi.listarPaises();
            setPaises([...data].sort((a, b) => a.nombrePais.localeCompare(b.nombrePais)));
        } catch (error) {
            notify.error(getErrorMessage(error, 'No se pudieron cargar los países'));
        }
    }, [notify]);

    const cargarCiudades = useCallback(async () => {
        try {
            setCiudades(await configuracionApi.listarCiudades());
        } catch (error) {
            notify.error(getErrorMessage(error, 'No se pudieron cargar las ciudades'));
        }
    }, [notify]);

    useEffect(() => {
        // Se difiere a una microtarea para no actualizar el estado de forma síncrona dentro del efecto.
        void Promise.resolve().then(() =>
            Promise.all([cargarEmpresa(false), cargarPaises(), cargarCiudades()]),
        );
    }, [cargarEmpresa, cargarPaises, cargarCiudades]);

    // ─── Empresa ───

    const handleChangeEmpresa = (campo: keyof EmpresaDatos, valor: string) => {
        setDatosEmpresa(prev => ({
            ...prev,
            [campo]: valor,
            // Al cambiar de país la ciudad anterior deja de ser válida.
            ...(campo === 'pais' && valor !== prev.pais ? { ciudad: '' } : {}),
        }));
    };

    const guardarEmpresa = async () => {
        if (!datosEmpresa.nombre.trim()) {
            notify.error('El nombre de la empresa es obligatorio');
            return;
        }
        // El backend valida email con @IsEmail y pais como ObjectId: no se envían vacíos.
        const { email, pais, ...resto } = datosEmpresa;
        const payload: Partial<EmpresaDatos> = {
            ...Object.fromEntries(Object.entries(resto).map(([k, v]) => [k, v.trim()])),
            ...(email.trim() ? { email: email.trim() } : {}),
            ...(pais ? { pais } : {}),
        };
        try {
            setLoading(true);
            await configuracionApi.guardarEmpresa(payload);
            notify.success('Datos de la empresa guardados correctamente');
        } catch (error) {
            notify.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const subirLogo = async (base64Logo: string) => {
        try {
            setLoading(true);
            const data = await configuracionApi.subirLogo(base64Logo);
            setLogoPreview(data.logo || base64Logo);
            notify.success('Logo actualizado correctamente');
        } catch (error) {
            notify.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const eliminarLogo = async () => {
        try {
            setLoading(true);
            await configuracionApi.guardarEmpresa({ logo: '' });
            setLogoPreview(null);
            notify.success('Logo eliminado');
        } catch (error) {
            notify.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    // ─── País y ciudad ───

    const agregarPais = async ({ nombrePais }: AgregarPaisFormData) => {
        const pais = await configuracionApi.crearPais(nombrePais);
        await cargarPaises();
        notify.success(`País "${pais.nombrePais}" agregado`);
    };

    const agregarCiudad = async ({ paisId, nombreCiudad }: AgregarCiudadFormData) => {
        const ciudad = await configuracionApi.crearCiudad(nombreCiudad, paisId);
        await cargarCiudades();
        notify.success(`Ciudad "${ciudad.nombreCiudad}" agregada`);
    };

    // ─── Importación / exportación ───

    const descargarPlantilla = () => {
        const { archivo, columnas } = PLANTILLAS[tipoImportacion];
        descargarArchivo(`${columnas}\n`, 'text/csv', archivo);
    };

    const importarCSV = async () => {
        if (!csvContent) {
            notify.error('Seleccione un archivo CSV primero');
            return;
        }
        try {
            setLoading(true);
            const data = tipoImportacion === 'cuentas'
                ? await configuracionApi.importarCuentasCsv(csvContent)
                : await configuracionApi.importarProductosCsv(csvContent);
            if (data.errors.length > 0) {
                notify.warning(`Importados: ${data.imported}. Errores: ${data.errors.length} (${data.errors.slice(0, 3).join(' | ')})`);
            } else {
                notify.success(`Importados: ${data.imported}`);
            }
            setCsvContent('');
            setCsvFileName(null);
        } catch (error) {
            notify.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const exportarRespaldo = async () => {
        try {
            setLoading(true);
            const data = await configuracionApi.exportarRespaldo();
            descargarArchivo(
                JSON.stringify(data, null, 2),
                'application/json',
                `respaldo_${new Date().toISOString().split('T')[0]}.json`,
            );
            notify.success('Respaldo exportado correctamente');
        } catch (error) {
            notify.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const importarRespaldo = async () => {
        if (!respaldoFile) {
            notify.error('Seleccione un archivo de respaldo');
            return;
        }
        let jsonData: Record<string, unknown[]>;
        try {
            jsonData = JSON.parse(await respaldoFile.text());
        } catch {
            notify.error('El archivo de respaldo no es un JSON válido');
            return;
        }
        try {
            setLoading(true);
            const data = await configuracionApi.importarRespaldo(jsonData);
            if (data.errors.length > 0) {
                notify.warning(`Importados: ${data.imported}. Errores: ${data.errors.length}`);
            } else {
                notify.success(`Importados: ${data.imported}`);
            }
            setRespaldoFile(null);
            await Promise.all([cargarEmpresa(), cargarPaises(), cargarCiudades()]);
        } catch (error) {
            notify.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handleCSVSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            setCsvContent((event.target?.result as string) ?? '');
            setCsvFileName(file.name);
        };
        reader.readAsText(file);
    };

    const handleRespaldoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (file) setRespaldoFile(file);
    };

    const handleChangeTab = (_event: React.SyntheticEvent, newValue: number) => {
        setTab(newValue);
    };

    return (
        <Box sx={{ width: '100%'}}>
            <Box
                sx={{
                    width: '100%',
                    height: 70,
                    background: "linear-gradient(135deg, #131817 0%, #043625 100%)",
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    alignContent: 'center',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 2,
                }}
            >
                <Box>
                    <Typography variant="h5" sx={{ color: '#f0f0f0', fontWeight: 700, letterSpacing: '-0.02em' }}>
                        Configuración
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                        Módulo de configuración de datos de la empresa y gestión de usuarios
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="contained"
                        startIcon={<PublicIcon />}
                        onClick={() => setDialogPaisOpen(true)}
                        sx={headerButtonSx}
                    >
                        Agregar País
                    </Button>
                    <Tooltip title={paises.length === 0 ? 'Primero agregue un país' : ''}>
                        <span>
                            <Button
                                variant="contained"
                                startIcon={<LocationCityIcon />}
                                onClick={() => setDialogCiudadOpen(true)}
                                disabled={paises.length === 0}
                                sx={headerButtonSx}
                            >
                                Agregar Ciudad
                            </Button>
                        </span>
                    </Tooltip>
                </Box>
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
                        paises={paises}
                        ciudades={ciudades}
                        loading={loading}
                        logoPreview={logoPreview}
                        guardarEmpresa={guardarEmpresa}
                        handleChangeEmpresa={handleChangeEmpresa}
                        subirLogo={subirLogo}
                        eliminarLogo={eliminarLogo}
                        tipoImportacion={tipoImportacion}
                        onTipoImportacionChange={setTipoImportacion}
                        descargarPlantilla={descargarPlantilla}
                        importarCSV={importarCSV}
                        exportarRespaldo={exportarRespaldo}
                        importarRespaldo={importarRespaldo}
                        csvFileName={csvFileName}
                        respaldoFile={respaldoFile}
                        onCSVSelect={handleCSVSelect}
                        onRespaldoSelect={handleRespaldoSelect}
                    />
                )}
                {tab === 1 && (
                    <ConfiguracionUsuariosTab />
                )}
            </Box>

            <AgregarPaisDialog
                open={dialogPaisOpen}
                onClose={() => setDialogPaisOpen(false)}
                onAgregar={agregarPais}
            />
            <AgregarCiudadDialog
                open={dialogCiudadOpen}
                onClose={() => setDialogCiudadOpen(false)}
                paises={paises}
                onAgregar={agregarCiudad}
            />
        </Box>
    );
}