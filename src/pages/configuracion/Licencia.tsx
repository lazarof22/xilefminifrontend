import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Grid, Snackbar, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

import KpisLicencia from '../../components/licencia/KpisLicencia';
import EstadoLicenciaCard from '../../components/licencia/EstadoLicenciaCard';
import ActivacionLicencia from '../../components/licencia/ActivacionLicencia';
import { licenciaApi } from '../../service/licenciaApi';
import type {
    ArtefactoLicencia,
    EstadoPublico,
    EstadoUsuario,
    LicenciaAdmin,
    RespuestaActivacion,
} from '../../types/licencia.types';
import {
    descargarBlob,
    describirResultadoActivacion,
    elegirLicencia,
    esErrorDePermisos,
    mensajeDeError,
} from '../../utils/licencia';
import { payloadSesionActual } from '../../utils/auth';

// ═══ Tipos locales ═══

type Severidad = 'success' | 'info' | 'warning' | 'error';

interface DatosLicencia {
    estado: EstadoUsuario | EstadoPublico | null;
    detalle: LicenciaAdmin | null;
    sinPermisos: boolean;
    puedeGestionar: boolean;
    error: string;
}

const DATOS_INICIALES: DatosLicencia = {
    estado: null,
    detalle: null,
    sinPermisos: false,
    puedeGestionar: false,
    error: '',
};

// ═══ Carga de datos ═══
// El estado público siempre se consulta; el de usuario y el detalle de admin
// dependen del token y su ausencia no se considera un error.

/**
 * Detalle de admin: si el token trae `empresa_id` se pide esa licencia;
 * si no, se lista todo y se elige la que mostrar. El `empresa_id` se lee del
 * JWT sin verificar (solo enrutado); el servidor aplica la autorización.
 */
async function obtenerDetalle(signal: AbortSignal): Promise<LicenciaAdmin | null> {
    const empresaId = payloadSesionActual()?.empresa_id;
    if (empresaId) return licenciaApi.detalle(empresaId, signal);
    return elegirLicencia(await licenciaApi.listar(signal));
}

async function obtenerDatosLicencia(signal: AbortSignal): Promise<DatosLicencia> {
    const [publico, usuario, detalle] = await Promise.allSettled([
        licenciaApi.estadoPublico(signal),
        licenciaApi.estado(signal),
        obtenerDetalle(signal),
    ]);

    const estado =
        usuario.status === 'fulfilled' ? usuario.value : publico.status === 'fulfilled' ? publico.value : null;
    const sinPermisos = usuario.status === 'rejected' && esErrorDePermisos(usuario.reason);
    const detallePermitido = !(detalle.status === 'rejected' && esErrorDePermisos(detalle.reason));

    let error = '';
    if (!estado) {
        const motivo = publico.status === 'rejected' ? publico.reason : null;
        error = mensajeDeError(motivo, 'No se pudo consultar el estado de la licencia');
    }

    return {
        estado,
        detalle: detalle.status === 'fulfilled' ? detalle.value : null,
        sinPermisos,
        puedeGestionar: !sinPermisos && detallePermitido,
        error,
    };
}

// ═══ Página ═══

export default function LicenciaPage() {
    const [datos, setDatos] = useState<DatosLicencia>(DATOS_INICIALES);
    const [cargando, setCargando] = useState(true);
    const [notificacion, setNotificacion] = useState({
        open: false,
        mensaje: '',
        severity: 'success' as Severidad,
    });

    const showMessage = useCallback((mensaje: string, severity: Severidad) => {
        setNotificacion({ open: true, mensaje, severity });
    }, []);

    const cerrarNotificacion = () => setNotificacion((actual) => ({ ...actual, open: false }));

    // Solo la carga más reciente puede escribir estado: cada nueva carga aborta la anterior.
    const controladorRef = useRef<AbortController | null>(null);

    const cargar = useCallback(async () => {
        controladorRef.current?.abort();
        const controlador = new AbortController();
        controladorRef.current = controlador;
        const { signal } = controlador;
        try {
            const resultado = await obtenerDatosLicencia(signal);
            if (!signal.aborted) setDatos(resultado);
        } finally {
            if (!signal.aborted) setCargando(false);
        }
    }, []);

    useEffect(() => {
        const referencia = controladorRef;
        void cargar();
        return () => referencia.current?.abort();
    }, [cargar]);

    const actualizar = () => {
        setCargando(true);
        void cargar();
    };

    // ═══ Acciones ═══

    const descargarSolicitud = async () => {
        const { nombre, contenido } = await licenciaApi.descargarSolicitud();
        descargarBlob(contenido, nombre);
        showMessage(`Solicitud descargada: ${nombre}`, 'success');
    };

    const activar = async (artefacto: ArtefactoLicencia): Promise<RespuestaActivacion> => {
        const respuesta = await licenciaApi.activar(artefacto);
        const { mensaje, severidad } = describirResultadoActivacion(respuesta);
        showMessage(mensaje, severidad);
        actualizar();
        return respuesta;
    };

    const copiar = (texto: string) => {
        navigator.clipboard
            .writeText(texto)
            .then(() => showMessage('Copiado al portapapeles', 'success'))
            .catch(() => showMessage('No se pudo copiar al portapapeles', 'error'));
    };

    return (
        <Box sx={{ width: '100%', pb: 4 }}>
            {/* ENCABEZADO */}
            <Box
                sx={{
                    width: '100%',
                    minHeight: 70,
                    background: 'linear-gradient(135deg, #131817 0%, #043625 100%)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 2,
                    px: 2,
                    py: 1,
                }}
            >
                <Box>
                    <Typography variant="h5" component="h1" sx={{ color: 'text.primary' }}>
                        Licencia
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Estado y activación offline de la licencia del sistema
                    </Typography>
                </Box>

                <Button
                    variant="contained"
                    startIcon={<RefreshIcon />}
                    onClick={actualizar}
                    disabled={cargando}
                    sx={{ boxShadow: 'none', flexShrink: 0 }}
                >
                    Actualizar
                </Button>
            </Box>

            <Box sx={{ p: { xs: 2, md: 3 } }}>
                <KpisLicencia estado={datos.estado} detalle={datos.detalle} cargando={cargando} />

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <EstadoLicenciaCard
                            estado={datos.estado}
                            detalle={datos.detalle}
                            cargando={cargando}
                            sinPermisos={datos.sinPermisos}
                            error={datos.error}
                            onCopiar={copiar}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <ActivacionLicencia
                            puedeGestionar={datos.puedeGestionar}
                            onDescargarSolicitud={descargarSolicitud}
                            onActivar={activar}
                        />
                    </Grid>
                </Grid>
            </Box>

            <Snackbar
                open={notificacion.open}
                autoHideDuration={3500}
                onClose={cerrarNotificacion}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert severity={notificacion.severity} variant="filled" onClose={cerrarNotificacion}>
                    {notificacion.mensaje}
                </Alert>
            </Snackbar>
        </Box>
    );
}
