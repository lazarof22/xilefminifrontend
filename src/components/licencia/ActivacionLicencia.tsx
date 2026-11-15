import { useRef, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Stack,
    Step,
    StepButton,
    StepContent,
    Stepper,
    TextField,
    Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import SendIcon from '@mui/icons-material/Send';

import type { ArtefactoLicencia, RespuestaActivacion } from '../../types/licencia.types';
import {
    MENSAJES_SIN_PERMISOS,
    describirResultadoActivacion,
    leerArtefactoLic,
    mensajeDeError,
    type MotivoSinPermisos,
} from '../../utils/licencia';
import AppAlert from '../notificaciones/AppAlert';
import { useNotify } from '../notificaciones/useNotify';
import ZonaArchivoLicencia from './ZonaArchivoLicencia';
import VistaPreviaArtefacto from './VistaPreviaArtefacto';
import ConfirmarRevocacionDialog from './ConfirmarRevocacionDialog';

// ═══ Flujo de activación offline en 3 pasos ═══

const PASOS = ['Generar solicitud', 'Enviar a XILEF', 'Importar licencia'] as const;

/** Largo máximo del identificador de empresa que acepta el servidor. */
const EMPRESA_ID_MAX = 64;
const CLAVE_EMPRESA = 'xilef.licencia.empresaId';

// El navegador puede negar el acceso al almacenamiento: es solo una comodidad.
const leerEmpresaGuardada = (): string => {
    try {
        return localStorage.getItem(CLAVE_EMPRESA) ?? '';
    } catch {
        return '';
    }
};
const guardarEmpresa = (valor: string): void => {
    try {
        localStorage.setItem(CLAVE_EMPRESA, valor);
    } catch {
        /* sin almacenamiento: se vuelve a escribir la próxima vez */
    }
};

interface ActivacionLicenciaProps {
    puedeGestionar: boolean;
    /** Motivo a mostrar cuando no se puede gestionar; null mientras carga o con permisos. */
    sinPermisos: MotivoSinPermisos | null;
    onDescargarSolicitud: (empresaId: string) => Promise<void>;
    onActivar: (artefacto: ArtefactoLicencia) => Promise<RespuestaActivacion>;
}

export default function ActivacionLicencia({
    puedeGestionar,
    sinPermisos,
    onDescargarSolicitud,
    onActivar,
}: ActivacionLicenciaProps) {
    const notify = useNotify();
    const [pasoActivo, setPasoActivo] = useState(0);
    const [descargando, setDescargando] = useState(false);
    const [empresaId, setEmpresaId] = useState(leerEmpresaGuardada);
    const empresaIdValida = empresaId.trim().length > 0 && empresaId.trim().length <= EMPRESA_ID_MAX;

    const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
    const [artefacto, setArtefacto] = useState<ArtefactoLicencia | null>(null);
    const [enviando, setEnviando] = useState(false);
    const [confirmarRevocacion, setConfirmarRevocacion] = useState(false);
    const [resultado, setResultado] = useState<RespuestaActivacion | null>(null);

    // ═══ Paso 1 ═══

    const descargar = async () => {
        setDescargando(true);
        try {
            await onDescargarSolicitud(empresaId.trim());
            guardarEmpresa(empresaId.trim());
            setPasoActivo(1);
        } catch (e) {
            notify.error(mensajeDeError(e, 'No se pudo generar la solicitud'));
        } finally {
            setDescargando(false);
        }
    };

    // ═══ Paso 3 ═══

    // Cada selección invalida las lecturas anteriores aún en curso.
    const lecturaRef = useRef(0);

    const seleccionarArchivo = async (archivo: File) => {
        const lectura = ++lecturaRef.current;
        setNombreArchivo(archivo.name);
        setArtefacto(null);
        setResultado(null);
        try {
            const leido = await leerArtefactoLic(archivo);
            if (lectura === lecturaRef.current) setArtefacto(leido);
        } catch (e) {
            if (lectura === lecturaRef.current) notify.error(mensajeDeError(e, 'No se pudo leer el archivo'));
        }
    };

    const enviar = async () => {
        if (!artefacto) return;
        setConfirmarRevocacion(false);
        setEnviando(true);
        try {
            setResultado(await onActivar(artefacto));
            setArtefacto(null);
            setNombreArchivo(null);
        } catch (e) {
            notify.error(mensajeDeError(e, 'No se pudo activar la licencia'));
        } finally {
            setEnviando(false);
        }
    };

    const solicitarEnvio = () => {
        if (artefacto?.payload.revocada) setConfirmarRevocacion(true);
        else void enviar();
    };

    const infoResultado = resultado ? describirResultadoActivacion(resultado) : null;

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Typography variant="h6" component="h2">
                    Activación offline
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Activa o renueva la licencia sin conexión a internet.
                </Typography>

                {sinPermisos && (
                    <Box sx={{ mb: 2 }}>
                        <AppAlert severity="info" message={MENSAJES_SIN_PERMISOS[sinPermisos]} />
                    </Box>
                )}

                <Stepper nonLinear activeStep={pasoActivo} orientation="vertical">
                    {/* PASO 1 */}
                    <Step completed={pasoActivo > 0}>
                        <StepButton onClick={() => setPasoActivo(0)}>{PASOS[0]}</StepButton>
                        <StepContent>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Descarga el archivo de solicitud (.req). El identificador de este equipo lo calcula el
                                servidor; solo indica el identificador de tu empresa (el que XILEF te asignó).
                            </Typography>
                            <TextField
                                size="small"
                                label="Identificador de la empresa"
                                value={empresaId}
                                onChange={(e) => setEmpresaId(e.target.value)}
                                disabled={!puedeGestionar || descargando}
                                error={empresaId !== '' && !empresaIdValida}
                                helperText={`Hasta ${EMPRESA_ID_MAX} caracteres`}
                                slotProps={{ htmlInput: { maxLength: EMPRESA_ID_MAX } }}
                                sx={{ mb: 2, maxWidth: 360 }}
                                fullWidth
                            />
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                <Button
                                    variant="contained"
                                    startIcon={descargando ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
                                    onClick={() => void descargar()}
                                    disabled={!puedeGestionar || descargando || !empresaIdValida}
                                >
                                    Descargar solicitud
                                </Button>
                                <Button onClick={() => setPasoActivo(1)}>Ya tengo la solicitud</Button>
                            </Stack>
                        </StepContent>
                    </Step>

                    {/* PASO 2 */}
                    <Step completed={pasoActivo > 1}>
                        <StepButton onClick={() => setPasoActivo(1)}>{PASOS[1]}</StepButton>
                        <StepContent>
                            <Box component="ol" sx={{ pl: 2.5, my: 0, color: 'text.secondary', typography: 'body2' }}>
                                <li>Envía el archivo .req a XILEF por el canal acordado (correo, memoria USB, etc.).</li>
                                <li>XILEF generará y firmará tu licencia para este equipo.</li>
                                <li>Recibirás un archivo .lic que deberás importar en el siguiente paso.</li>
                            </Box>
                            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                <Button variant="contained" startIcon={<SendIcon />} onClick={() => setPasoActivo(2)}>
                                    Ya recibí la licencia
                                </Button>
                                <Button onClick={() => setPasoActivo(0)}>Atrás</Button>
                            </Stack>
                        </StepContent>
                    </Step>

                    {/* PASO 3 */}
                    <Step completed={resultado !== null}>
                        <StepButton onClick={() => setPasoActivo(2)}>{PASOS[2]}</StepButton>
                        <StepContent>
                            <Stack spacing={2}>
                                <ZonaArchivoLicencia
                                    nombreArchivo={nombreArchivo}
                                    deshabilitada={!puedeGestionar || enviando}
                                    onArchivo={(archivo) => void seleccionarArchivo(archivo)}
                                />


                                {artefacto && <VistaPreviaArtefacto payload={artefacto.payload} />}

                                {infoResultado && resultado && (
                                    <AppAlert severity={infoResultado.severidad} message={infoResultado.mensaje} />
                                )}

                                <Stack direction="row" spacing={1}>
                                    <Button
                                        variant="contained"
                                        color={artefacto?.payload.revocada ? 'error' : 'primary'}
                                        startIcon={enviando ? <CircularProgress size={18} color="inherit" /> : undefined}
                                        disabled={!puedeGestionar || !artefacto || enviando}
                                        onClick={solicitarEnvio}
                                    >
                                        {artefacto?.payload.revocada ? 'Importar revocación' : 'Activar licencia'}
                                    </Button>
                                    <Button onClick={() => setPasoActivo(1)}>Atrás</Button>
                                </Stack>
                            </Stack>
                        </StepContent>
                    </Step>
                </Stepper>
            </CardContent>

            <ConfirmarRevocacionDialog
                open={confirmarRevocacion}
                onCancelar={() => setConfirmarRevocacion(false)}
                onConfirmar={() => void enviar()}
            />
        </Card>
    );
}
