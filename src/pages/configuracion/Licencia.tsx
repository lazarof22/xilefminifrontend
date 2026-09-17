import {
    Box,
    Typography,
    Card,
    Snackbar,
    Alert,
    TextField,
    Button,
    InputAdornment,
    IconButton,
    Chip,
    Divider,
    CircularProgress,
    Paper,
} from '@mui/material';

import { useCallback, useEffect, useState } from 'react';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RefreshIcon from '@mui/icons-material/Refresh';
// import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import DevicesIcon from '@mui/icons-material/Devices';
import KeyIcon from '@mui/icons-material/Key';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
// import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';


// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════

const API_BASE_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:3000/api';


// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════

type TipoLicencia =
    | 'trial'
    | 'suscripcion_mensual'
    | 'suscripcion_anual'
    | 'perpetua';

interface LicFileData {
    clave_activacion: string;
    empresa_id: string;
    empresa_nombre?: string;
    tipo: TipoLicencia;
    fecha_inicio: string;
    fecha_vencimiento: string;
    max_usuarios?: number;
    firma_ed25519: string;
}

interface EstadoLicencia {
    valida: boolean;
    vigente: boolean;
    dias_restantes?: number;
    tipo?: TipoLicencia;
    empresa?: string;
    fecha_vencimiento?: string;
    max_usuarios?: number;
}

interface ValidacionClaveResponse {
    formato_valido: boolean;
}

interface EstadoPublicoResponse {
    valida: boolean;
    vigente: boolean;
}


// ═══════════════════════════════════════════════════════════════
// FETCH AUTENTICADO
// ═══════════════════════════════════════════════════════════════

const fetchWithAuth = async (
    url: string,
    options: RequestInit = {}
) => {
    const token = localStorage.getItem('token');

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token
            ? {
                  Authorization: `Bearer ${token}`,
              }
            : {}),
        ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
    });

    const contentType = response.headers.get('content-type') || '';

    let data: any = null;

    if (contentType.includes('application/json')) {
        data = await response.json().catch(() => null);
    } else {
        data = await response.text().catch(() => null);
    }

    if (!response.ok) {
        const error = new Error(
            data?.message ||
                `HTTP ${response.status}`
        );

        (error as any).status = response.status;

        throw error;
    }

    return data;
};


// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const CLAVE_REGEX =
    /^XILEF-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/;

const FIRMA_REGEX = /^[a-fA-F0-9]{128}$/;

const TIPOS_LICENCIA: TipoLicencia[] = [
    'trial',
    'suscripcion_mensual',
    'suscripcion_anual',
    'perpetua',
];


// ═══════════════════════════════════════════════════════════════
// SHA-256 → HEX
// ═══════════════════════════════════════════════════════════════

const bufferToHex = (buffer: ArrayBuffer): string => {
    return Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
};


const sha256 = async (value: string): Promise<string> => {
    const data = new TextEncoder().encode(value);

    const hash = await crypto.subtle.digest(
        'SHA-256',
        data
    );

    return bufferToHex(hash);
};


// ═══════════════════════════════════════════════════════════════
// HARDWARE ID
//
// Importante:
// El navegador no puede leer de forma fiable el serial físico
// de la máquina como lo haría Node/Electron.
//
// Por eso usamos una huella estable del dispositivo/navegador.
// El backend recibe únicamente el SHA-256 resultante.
// ═══════════════════════════════════════════════════════════════

const generarHardwareId = async (): Promise<string> => {
    const nav = window.navigator;
    const screenInfo = window.screen;

    const canvas = document.createElement('canvas');

    let canvasFingerprint = '';

    try {
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';

            ctx.fillRect(0, 0, 100, 30);

            ctx.fillStyle = '#069';
            ctx.fillText(
                'XILEF-License-Fingerprint',
                2,
                2
            );

            canvasFingerprint = canvas.toDataURL();
        }
    } catch {
        canvasFingerprint = '';
    }

    let webglFingerprint = '';

    try {
        const canvasWebgl = document.createElement('canvas');

        const gl =
            canvasWebgl.getContext('webgl') ||
            canvasWebgl.getContext(
                'experimental-webgl'
            );

        if (gl) {
            const debugInfo = gl.getExtension(
                'WEBGL_debug_renderer_info'
            );

            if (debugInfo) {
                const vendor = gl.getParameter(
                    debugInfo.UNMASKED_VENDOR_WEBGL
                );

                const renderer = gl.getParameter(
                    debugInfo.UNMASKED_RENDERER_WEBGL
                );

                webglFingerprint = `${vendor}|${renderer}`;
            } else {
                webglFingerprint = String(
                    gl.getParameter(gl.VENDOR)
                );
            }
        }
    } catch {
        webglFingerprint = '';
    }

    const timezone =
        Intl.DateTimeFormat().resolvedOptions()
            .timeZone || '';

    const languages =
        Array.isArray(nav.languages)
            ? nav.languages.join(',')
            : nav.language || '';

    const rawFingerprint = [
        'xilef-v1',
        nav.platform || '',
        nav.userAgent || '',
        nav.language || '',
        languages,
        timezone,
        String(nav.hardwareConcurrency || ''),
        String((nav as any).deviceMemory || ''),
        String(nav.maxTouchPoints || ''),
        String(screenInfo.width || ''),
        String(screenInfo.height || ''),
        String(screenInfo.colorDepth || ''),
        String(screenInfo.pixelDepth || ''),
        canvasFingerprint,
        webglFingerprint,
    ].join('|');

    return sha256(rawFingerprint);
};


// ═══════════════════════════════════════════════════════════════
// PARSEADOR DEL .LIC
//
// Soporta:
// 1. JSON:
// {
//   "clave_activacion": "...",
//   ...
// }
//
// 2. Archivo de texto con:
// clave_activacion=...
// empresa_id=...
// ...
// ═══════════════════════════════════════════════════════════════

const parseLicFile = (
    content: string
): LicFileData => {
    const cleanContent = content.trim();

    let parsed: any;

    try {
        parsed = JSON.parse(cleanContent);
    } catch {
        parsed = {};

        const lines = cleanContent.split(/\r?\n/);

        for (const line of lines) {
            const trimmed = line.trim();

            if (!trimmed || trimmed.startsWith('#')) {
                continue;
            }

            const separatorIndex =
                trimmed.indexOf('=');

            if (separatorIndex === -1) {
                continue;
            }

            const key = trimmed
                .slice(0, separatorIndex)
                .trim();

            const value = trimmed
                .slice(separatorIndex + 1)
                .trim();

            parsed[key] = value;
        }
    }

    const data: LicFileData = {
        clave_activacion:
            String(parsed.clave_activacion || '').trim(),

        empresa_id:
            String(parsed.empresa_id || '').trim(),

        empresa_nombre:
            parsed.empresa_nombre
                ? String(parsed.empresa_nombre).trim()
                : '',

        tipo:
            parsed.tipo as TipoLicencia,

        fecha_inicio:
            String(parsed.fecha_inicio || '').trim(),

        fecha_vencimiento:
            String(
                parsed.fecha_vencimiento || ''
            ).trim(),

        max_usuarios:
            parsed.max_usuarios !== undefined
                ? Number(parsed.max_usuarios)
                : 0,

        firma_ed25519:
            String(
                parsed.firma_ed25519 || ''
            ).trim(),
    };

    if (!data.clave_activacion) {
        throw new Error(
            'El archivo .lic no contiene clave_activacion'
        );
    }

    if (!data.empresa_id) {
        throw new Error(
            'El archivo .lic no contiene empresa_id'
        );
    }

    if (!data.tipo) {
        throw new Error(
            'El archivo .lic no contiene tipo'
        );
    }

    if (!TIPOS_LICENCIA.includes(data.tipo)) {
        throw new Error(
            'El tipo de licencia del archivo .lic no es válido'
        );
    }

    if (!data.fecha_inicio) {
        throw new Error(
            'El archivo .lic no contiene fecha_inicio'
        );
    }

    if (!data.fecha_vencimiento) {
        throw new Error(
            'El archivo .lic no contiene fecha_vencimiento'
        );
    }

    if (!data.firma_ed25519) {
        throw new Error(
            'El archivo .lic no contiene firma_ed25519'
        );
    }

    return data;
};


// ═══════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════

export default function LicenciaPage() {

    // ═══════════════════════════════════════════════════════════
    // ESTADOS GENERALES
    // ═══════════════════════════════════════════════════════════

    const [loading, setLoading] =
        useState(false);

    const [loadingEstado, setLoadingEstado] =
        useState(false);

    const [loadingValidacion, setLoadingValidacion] =
        useState(false);

    const [loadingArchivo, setLoadingArchivo] =
        useState(false);

    const [openSnackbar, setOpenSnackbar] =
        useState(false);

    const [snackbarMessage, setSnackbarMessage] =
        useState('');

    const [snackbarSeverity, setSnackbarSeverity] =
        useState<'success' | 'error'>('success');


    // ═══════════════════════════════════════════════════════════
    // LICENCIA
    // ═══════════════════════════════════════════════════════════

    const [licencia, setLicencia] =
        useState<LicFileData | null>(null);

    const [claveActivacion, setClaveActivacion] =
        useState('');

    const [hardwareId, setHardwareId] =
        useState('');

    const [nonce, setNonce] =
        useState('');

    const [archivoNombre, setArchivoNombre] =
        useState('');

    const [formatoValido, setFormatoValido] =
        useState<boolean | null>(null);

    const [estadoPublico, setEstadoPublico] =
        useState<EstadoPublicoResponse | null>(null);

    const [estadoLicencia, setEstadoLicencia] =
        useState<EstadoLicencia | null>(null);

    const [errors, setErrors] =
        useState<Record<string, string>>({});


    // ═══════════════════════════════════════════════════════════
    // MENSAJES
    // ═══════════════════════════════════════════════════════════

    const showMessage = (
        message: string,
        severity: 'success' | 'error' = 'success'
    ) => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setOpenSnackbar(true);
    };


    // ═══════════════════════════════════════════════════════════
    // ERROR BACKEND
    // ═══════════════════════════════════════════════════════════

    const getBackendErrorMessage = (
        error: any
    ): string => {
        const status = error?.status;

        if (status === 400) {
            return 'Licencia inválida';
        }

        if (status === 401) {
            return 'Sesión no autorizada. Inicie sesión nuevamente';
        }

        if (status === 429) {
            return 'Demasiados intentos, espere unos minutos';
        }

        return (
            error?.message ||
            'No se pudo completar la operación'
        );
    };


    // ═══════════════════════════════════════════════════════════
    // GENERAR NONCE
    // ═══════════════════════════════════════════════════════════

    const generarNonce = () => {
        if (
            typeof crypto !== 'undefined' &&
            typeof crypto.randomUUID === 'function'
        ) {
            setNonce(crypto.randomUUID());
            return;
        }

        // Fallback para navegadores antiguos.
        const randomBytes = new Uint8Array(16);
        crypto.getRandomValues(randomBytes);

        randomBytes[6] =
            (randomBytes[6] & 0x0f) | 0x40;

        randomBytes[8] =
            (randomBytes[8] & 0x3f) | 0x80;

        const hex = Array.from(randomBytes)
            .map((b) =>
                b.toString(16).padStart(2, '0')
            )
            .join('');

        setNonce(
            `${hex.substring(0, 8)}-${hex.substring(
                8,
                12
            )}-${hex.substring(12, 16)}-${hex.substring(
                16,
                20
            )}-${hex.substring(20)}`
        );
    };


    // ═══════════════════════════════════════════════════════════
    // INICIALIZACIÓN DEL HARDWARE ID
    // ═══════════════════════════════════════════════════════════

    useEffect(() => {
        const inicializarDispositivo =
            async () => {
                try {
                    const id =
                        await generarHardwareId();

                    setHardwareId(id);
                } catch {
                    showMessage(
                        'No se pudo generar la identificación del dispositivo',
                        'error'
                    );
                }

                generarNonce();
            };

        inicializarDispositivo();
    }, []);


    // ═══════════════════════════════════════════════════════════
    // GET /licencia/estado
    //
    // Solo se consulta si existe JWT.
    // ═══════════════════════════════════════════════════════════

    const cargarEstadoLicencia =
        useCallback(async () => {
            const token =
                localStorage.getItem('token');

            if (!token) {
                return;
            }

            try {
                setLoadingEstado(true);

                const data: EstadoLicencia =
                    await fetchWithAuth(
                        '/licencia/estado'
                    );

                setEstadoLicencia(data);
            } catch (error: any) {
                const status = error?.status;

                if (status === 401) {
                    setEstadoLicencia(null);
                    return;
                }

                if (status === 400) {
                    setEstadoLicencia(null);
                    return;
                }

                showMessage(
                    getBackendErrorMessage(error),
                    'error'
                );
            } finally {
                setLoadingEstado(false);
            }
        }, []);


    useEffect(() => {
        cargarEstadoLicencia();
    }, [cargarEstadoLicencia]);


    // ═══════════════════════════════════════════════════════════
    // POST /licencia/validar-clave
    // ═══════════════════════════════════════════════════════════

    const validarClaveFormato =
        async (
            clave: string = claveActivacion
        ) => {
            if (!clave) {
                setFormatoValido(null);
                return false;
            }

            try {
                setLoadingValidacion(true);

                const data: ValidacionClaveResponse =
                    await fetchWithAuth(
                        '/licencia/validar-clave',
                        {
                            method: 'POST',
                            body: JSON.stringify({
                                clave,
                            }),
                        }
                    );

                setFormatoValido(
                    data.formato_valido
                );

                if (!data.formato_valido) {
                    setErrors((prev) => ({
                        ...prev,
                        claveActivacion:
                            'Formato de clave inválido. Use XILEF-XXXX-XXXX-XXXX-XXXX',
                    }));

                    return false;
                }

                setErrors((prev) => ({
                    ...prev,
                    claveActivacion: '',
                }));

                return true;
            } catch (error: any) {
                showMessage(
                    getBackendErrorMessage(error),
                    'error'
                );

                return false;
            } finally {
                setLoadingValidacion(false);
            }
        };


    // ═══════════════════════════════════════════════════════════
    // GET /licencia/public/estado?clave=
    // ═══════════════════════════════════════════════════════════

    const consultarEstadoPublico =
        async (
            clave: string = claveActivacion
        ) => {
            if (!clave) {
                setEstadoPublico(null);
                return;
            }

            if (!CLAVE_REGEX.test(clave)) {
                setEstadoPublico({
                    valida: false,
                    vigente: false,
                });
                return;
            }

            try {
                const params = new URLSearchParams({
                    clave,
                });

                const data: EstadoPublicoResponse =
                    await fetchWithAuth(
                        `/licencia/public/estado?${params.toString()}`,
                        {
                            method: 'GET',
                        }
                    );

                setEstadoPublico(data);
            } catch (error: any) {
                showMessage(
                    getBackendErrorMessage(error),
                    'error'
                );
            }
        };


    // ═══════════════════════════════════════════════════════════
    // CARGAR .LIC
    // ═══════════════════════════════════════════════════════════

    const handleLicFile =
        async (
            event: React.ChangeEvent<HTMLInputElement>
        ) => {
            const file =
                event.target.files?.[0];

            if (!file) {
                return;
            }

            try {
                setLoadingArchivo(true);

                const content =
                    await file.text();

                const data =
                    parseLicFile(content);

                setLicencia(data);

                setArchivoNombre(file.name);

                setClaveActivacion(
                    data.clave_activacion
                );

                setFormatoValido(null);

                setEstadoPublico(null);

                setErrors({});

                // Validamos el formato inmediatamente
                // contra el endpoint oficial.
                await validarClaveFormato(
                    data.clave_activacion
                );

                // Consulta pública de estado.
                await consultarEstadoPublico(
                    data.clave_activacion
                );

                showMessage(
                    'Archivo de licencia cargado correctamente'
                );
            } catch (error: any) {
                setLicencia(null);
                setArchivoNombre('');
                setClaveActivacion('');
                setFormatoValido(null);
                setEstadoPublico(null);

                showMessage(
                    error?.message ||
                        'El archivo .lic no es válido',
                    'error'
                );
            } finally {
                setLoadingArchivo(false);

                event.target.value = '';
            }
        };


    // ═══════════════════════════════════════════════════════════
    // COPIAR HARDWARE ID
    // ═══════════════════════════════════════════════════════════

    const copiarHardwareId =
        async () => {
            if (!hardwareId) {
                return;
            }

            try {
                await navigator.clipboard.writeText(
                    hardwareId
                );

                showMessage(
                    'Hardware ID copiado al portapapeles'
                );
            } catch {
                showMessage(
                    'No se pudo copiar el Hardware ID',
                    'error'
                );
            }
        };


    // ═══════════════════════════════════════════════════════════
    // ACTIVAR LICENCIA
    // ═══════════════════════════════════════════════════════════

    const activarLicencia =
        async () => {
            const clave =
                claveActivacion.trim();

            const errorsActuales: Record<
                string,
                string
            > = {};

            if (!clave) {
                errorsActuales.claveActivacion =
                    'Ingrese o cargue una clave de activación';
            }

            if (
                clave &&
                !CLAVE_REGEX.test(clave)
            ) {
                errorsActuales.claveActivacion =
                    'Formato inválido. Use XILEF-XXXX-XXXX-XXXX-XXXX';
            }

            if (!licencia) {
                showMessage(
                    'Debe cargar el archivo .lic entregado por XILEF',
                    'error'
                );

                return;
            }

            if (
                licencia.clave_activacion !==
                clave
            ) {
                showMessage(
                    'La clave no coincide con la contenida en el archivo .lic',
                    'error'
                );

                return;
            }

            if (!hardwareId) {
                showMessage(
                    'No se pudo generar el identificador del dispositivo',
                    'error'
                );

                return;
            }

            if (
                !licencia.empresa_id ||
                licencia.empresa_id.length > 64
            ) {
                showMessage(
                    'El empresa_id de la licencia no es válido',
                    'error'
                );

                return;
            }

            if (
                !FIRMA_REGEX.test(
                    licencia.firma_ed25519
                )
            ) {
                showMessage(
                    'La firma Ed25519 del archivo .lic no es válida',
                    'error'
                );

                return;
            }

            if (
                !TIPOS_LICENCIA.includes(
                    licencia.tipo
                )
            ) {
                showMessage(
                    'El tipo de licencia no es válido',
                    'error'
                );

                return;
            }

            if (
                Number.isNaN(
                    Date.parse(
                        licencia.fecha_inicio
                    )
                ) ||
                Number.isNaN(
                    Date.parse(
                        licencia.fecha_vencimiento
                    )
                )
            ) {
                showMessage(
                    'Las fechas de la licencia no son válidas',
                    'error'
                );

                return;
            }

            if (
                Object.keys(errorsActuales).length
            ) {
                setErrors(errorsActuales);
                return;
            }

            try {
                setLoading(true);

                /*
                 * MUY IMPORTANTE:
                 * Cada activación obtiene un nonce nuevo.
                 * Nunca reutilizamos el anterior.
                 */
                const nuevoNonce =
                    crypto.randomUUID();

                setNonce(nuevoNonce);

                const payload = {
                    clave_activacion:
                        licencia.clave_activacion,

                    empresa_nombre:
                        licencia.empresa_nombre || '',

                    empresa_id:
                        licencia.empresa_id,

                    nonce: nuevoNonce,

                    hardware_id:
                        hardwareId,

                    tipo: licencia.tipo,

                    fecha_inicio:
                        licencia.fecha_inicio,

                    fecha_vencimiento:
                        licencia.fecha_vencimiento,

                    max_usuarios:
                        licencia.max_usuarios ?? 0,

                    firma_ed25519:
                        licencia.firma_ed25519,
                };

                const response =
                    await fetchWithAuth(
                        '/licencia/activar',
                        {
                            method: 'POST',
                            body: JSON.stringify(
                                payload
                            ),
                        }
                    );

                showMessage(
                    response?.mensaje ||
                        'Licencia activada correctamente'
                );

                // Generamos un nonce nuevo para
                // cualquier futura activación.
                generarNonce();

                // El estado JWT debe reflejar
                // inmediatamente la activación.
                await cargarEstadoLicencia();

                // También refrescamos el estado público.
                await consultarEstadoPublico(
                    licencia.clave_activacion
                );
            } catch (error: any) {
                showMessage(
                    getBackendErrorMessage(error),
                    'error'
                );

                /*
                 * Aunque falle una activación, el nonce
                 * utilizado no se vuelve a utilizar.
                 */
                generarNonce();
            } finally {
                setLoading(false);
            }
        };


    // ═══════════════════════════════════════════════════════════
    // FORMATO DE FECHA
    // ═══════════════════════════════════════════════════════════

    const formatDate =
        (date?: string) => {
            if (!date) {
                return '—';
            }

            const parsed =
                new Date(date);

            if (Number.isNaN(parsed.getTime())) {
                return date;
            }

            return parsed.toLocaleDateString(
                'es-ES',
                {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                }
            );
        };


    // ═══════════════════════════════════════════════════════════
    // ETIQUETA TIPO
    // ═══════════════════════════════════════════════════════════

    const getTipoLabel =
        (tipo?: TipoLicencia) => {
            switch (tipo) {
                case 'trial':
                    return 'Prueba';

                case 'suscripcion_mensual':
                    return 'Suscripción mensual';

                case 'suscripcion_anual':
                    return 'Suscripción anual';

                case 'perpetua':
                    return 'Perpetua';

                default:
                    return '—';
            }
        };


    // ═══════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════

    return (
        <Box>

            {/* ═══════════════════════════════════════════════════
                HEADER
            ═══════════════════════════════════════════════════ */}

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
                    justifyContent:
                        'space-between',
                    alignItems: 'center',
                    px: 2,
                }}
            >
                <Typography
                    variant="h5"
                    sx={{
                        ml: 2,
                        color: 'white',
                    }}
                >
                    Licencia
                </Typography>

                <Button
                    size="small"
                    onClick={cargarEstadoLicencia}
                    disabled={loadingEstado}
                    startIcon={
                        loadingEstado ? (
                            <CircularProgress
                                size={15}
                                sx={{
                                    color: 'white',
                                }}
                            />
                        ) : (
                            <RefreshIcon />
                        )
                    }
                    sx={{
                        color: 'white',
                        textTransform: 'none',
                        mr: 1,
                    }}
                >
                    Actualizar estado
                </Button>
            </Box>


            {/* ═══════════════════════════════════════════════════
                CONTENIDO
            ═══════════════════════════════════════════════════ */}

            <Box sx={{ m: 2 }}>

                {/* ═══════════════════════════════════════════════
                    ESTADO ACTUAL
                ═══════════════════════════════════════════════ */}

                {estadoLicencia && (
                    <Card
                        sx={{
                            width: '100%',
                            p: 2,
                            mb: 2,
                            borderLeft: estadoLicencia.vigente
                                ? '4px solid #2e7d32'
                                : '4px solid #d32f2f',
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent:
                                    'space-between',
                                flexWrap: 'wrap',
                                gap: 2,
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems:
                                        'center',
                                    gap: 1,
                                }}
                            >
                                {/* {estadoLicencia.vigente ? (
                                    <CheckCircleOutlineIcon
                                        sx={{
                                            color: '#2e7d32',
                                        }}
                                    />
                                ) : (
                                    <CancelOutlinedIcon
                                        sx={{
                                            color: '#d32f2f',
                                        }}
                                    />
                                )} */}

                                <Box>
                                    <Typography
                                        variant="subtitle1"
                                        sx={{
                                            fontWeight: 600,
                                        }}
                                    >
                                        Estado de la licencia
                                    </Typography>

                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: '#666',
                                        }}
                                    >
                                        {estadoLicencia.vigente
                                            ? 'Licencia vigente'
                                            : 'Licencia no vigente'}
                                    </Typography>
                                </Box>
                            </Box>

                            <Chip
                                label={
                                    estadoLicencia.valida &&
                                    estadoLicencia.vigente
                                        ? 'ACTIVA'
                                        : 'NO VIGENTE'
                                }
                                color={
                                    estadoLicencia.valida &&
                                    estadoLicencia.vigente
                                        ? 'success'
                                        : 'error'
                                }
                                size="small"
                            />
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Box
                            sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 2,
                            }}
                        >
                            <Paper
                                variant="outlined"
                                sx={{
                                    flex:
                                        '1 1 180px',
                                    p: 1.5,
                                }}
                            >
                                <Box
                                    sx={{
                                        display:
                                            'flex',
                                        alignItems:
                                            'center',
                                        gap: 1,
                                    }}
                                >
                                    <KeyIcon
                                        sx={{
                                            color:
                                                '#1976d2',
                                        }}
                                    />

                                    <Box>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color:
                                                    '#777',
                                            }}
                                        >
                                            Tipo
                                        </Typography>

                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight:
                                                    600,
                                            }}
                                        >
                                            {getTipoLabel(
                                                estadoLicencia.tipo
                                            )}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>

                            <Paper
                                variant="outlined"
                                sx={{
                                    flex:
                                        '1 1 180px',
                                    p: 1.5,
                                }}
                            >
                                <Box
                                    sx={{
                                        display:
                                            'flex',
                                        alignItems:
                                            'center',
                                        gap: 1,
                                    }}
                                >
                                    <CalendarMonthIcon
                                        sx={{
                                            color:
                                                '#1976d2',
                                        }}
                                    />

                                    <Box>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color:
                                                    '#777',
                                            }}
                                        >
                                            Vencimiento
                                        </Typography>

                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight:
                                                    600,
                                            }}
                                        >
                                            {formatDate(
                                                estadoLicencia.fecha_vencimiento
                                            )}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>

                            <Paper
                                variant="outlined"
                                sx={{
                                    flex:
                                        '1 1 180px',
                                    p: 1.5,
                                }}
                            >
                                <Box
                                    sx={{
                                        display:
                                            'flex',
                                        alignItems:
                                            'center',
                                        gap: 1,
                                    }}
                                >
                                    {/* <PeopleOutlineIcon
                                        sx={{
                                            color:
                                                '#1976d2',
                                        }}
                                    /> */}

                                    <Box>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color:
                                                    '#777',
                                            }}
                                        >
                                            Máximo usuarios
                                        </Typography>

                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight:
                                                    600,
                                            }}
                                        >
                                            {estadoLicencia.max_usuarios ===
                                            0
                                                ? 'Ilimitados'
                                                : estadoLicencia.max_usuarios ??
                                                  '—'}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>

                            <Paper
                                variant="outlined"
                                sx={{
                                    flex:
                                        '1 1 180px',
                                    p: 1.5,
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color:
                                            '#777',
                                    }}
                                >
                                    Días restantes
                                </Typography>

                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: 600,
                                    }}
                                >
                                    {estadoLicencia.dias_restantes ??
                                        '—'}
                                </Typography>
                            </Paper>
                        </Box>
                    </Card>
                )}


                {/* ═══════════════════════════════════════════════
                    GESTIÓN DE LICENCIA
                ═══════════════════════════════════════════════ */}

                <Card
                    sx={{
                        width: '100%',
                        p: 2,
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mb: 2,
                        }}
                    >
                        <FilterListIcon
                            sx={{
                                color: '#1976d2',
                                fontSize: 22,
                            }}
                        />

                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 600,
                                background:
                                    'linear-gradient(135deg, rgba(0, 89, 255, 0.84), rgba(230, 21, 118, 0.9))',
                                WebkitBackgroundClip:
                                    'text',
                                WebkitTextFillColor:
                                    'transparent',
                            }}
                        >
                            Gestión de Licencia
                        </Typography>
                    </Box>


                    {/* ═══════════════════════════════════════════
                        CARGA DEL .LIC
                    ═══════════════════════════════════════════ */}

                    <Box
                        sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 3,
                            p: 2,
                        }}
                    >
                        <Box
                            sx={{
                                flex:
                                    '1 1 300px',
                            }}
                        >
                            <Typography
                                sx={{
                                    mb: 1,
                                    fontWeight: 500,
                                    color: '#666',
                                }}
                            >
                                Archivo de Licencia
                            </Typography>

                            <Button
                                component="label"
                                fullWidth
                                variant="outlined"
                                disabled={
                                    loadingArchivo
                                }
                                startIcon={
                                    loadingArchivo ? (
                                        <CircularProgress
                                            size={17}
                                        />
                                    ) : (
                                        <CloudUploadIcon />
                                    )
                                }
                                sx={{
                                    height: 40,
                                    justifyContent:
                                        'flex-start',
                                    textTransform:
                                        'none',
                                    borderRadius: 1,
                                    borderColor:
                                        '#c7c7c7',
                                    color: '#555',
                                    backgroundColor:
                                        '#f8f9fa',
                                    '&:hover': {
                                        borderColor:
                                            '#1976d2',
                                        backgroundColor:
                                            '#f1f6ff',
                                    },
                                }}
                            >
                                {archivoNombre ||
                                    'Seleccionar archivo .lic'}

                                <input
                                    hidden
                                    type="file"
                                    accept=".lic,.json,text/plain,application/json"
                                    onChange={
                                        handleLicFile
                                    }
                                />
                            </Button>

                            <Typography
                                variant="caption"
                                sx={{
                                    display: 'block',
                                    mt: 0.7,
                                    color: '#888',
                                }}
                            >
                                Seleccione el archivo
                                firmado entregado por
                                XILEF.
                            </Typography>
                        </Box>


                        {/* ═══════════════════════════════════════
                            CLAVE
                        ═══════════════════════════════════════ */}

                        <Box
                            sx={{
                                flex:
                                    '1 1 300px',
                            }}
                        >
                            <Typography
                                sx={{
                                    mb: 1,
                                    fontWeight: 500,
                                    color: '#666',
                                }}
                            >
                                Clave de Activación
                            </Typography>

                            <TextField
                                fullWidth
                                size="small"
                                placeholder="XILEF-XXXX-XXXX-XXXX-XXXX"
                                value={
                                    claveActivacion
                                }
                                onChange={(e) => {
                                    const value =
                                        e.target.value
                                            .toUpperCase();

                                    setClaveActivacion(
                                        value
                                    );

                                    setLicencia(
                                        (prev) =>
                                            prev
                                                ? {
                                                      ...prev,
                                                      clave_activacion:
                                                          value,
                                                  }
                                                : prev
                                    );

                                    setFormatoValido(
                                        null
                                    );

                                    setEstadoPublico(
                                        null
                                    );

                                    if (
                                        errors.claveActivacion
                                    ) {
                                        setErrors(
                                            (prev) => ({
                                                ...prev,
                                                claveActivacion:
                                                    '',
                                            })
                                        );
                                    }
                                }}
                                onBlur={() =>
                                    validarClaveFormato()
                                }
                                error={
                                    !!errors.claveActivacion
                                }
                                helperText={
                                    errors.claveActivacion
                                }
                                InputProps={{
                                    endAdornment:
                                        loadingValidacion ? (
                                            <InputAdornment position="end">
                                                <CircularProgress
                                                    size={
                                                        17
                                                    }
                                                />
                                            </InputAdornment>
                                        ) : formatoValido !==
                                          null ? (
                                            <InputAdornment position="end">
                                                {/* {formatoValido ? (
                                                    <CheckCircleOutlineIcon
                                                        sx={{
                                                            color:
                                                                '#2e7d32',
                                                        }}
                                                    />
                                                ) : (
                                                    <CancelOutlinedIcon
                                                        sx={{
                                                            color:
                                                                '#d32f2f',
                                                        }}
                                                    />
                                                )} */}
                                            </InputAdornment>
                                        ) : undefined,
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root':
                                        {
                                            borderRadius: 1,
                                            backgroundColor:
                                                '#f8f9fa',
                                        },
                                }}
                            />
                        </Box>
                    </Box>


                    {/* ═══════════════════════════════════════════
                        INFORMACIÓN DE LICENCIA CARGADA
                    ═══════════════════════════════════════════ */}

                    {licencia && (
                        <Box
                            sx={{
                                px: 2,
                                pb: 2,
                            }}
                        >
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    backgroundColor:
                                        '#fafafa',
                                }}
                            >
                                <Box
                                    sx={{
                                        display:
                                            'flex',
                                        alignItems:
                                            'center',
                                        justifyContent:
                                            'space-between',
                                        mb: 1.5,
                                        flexWrap:
                                            'wrap',
                                        gap: 1,
                                    }}
                                >
                                    <Typography
                                        variant="subtitle2"
                                        sx={{
                                            fontWeight:
                                                600,
                                            color:
                                                '#555',
                                        }}
                                    >
                                        Datos del archivo
                                        firmado
                                    </Typography>

                                    <Chip
                                        size="small"
                                        // icon={
                                        //     <CheckCircleOutlineIcon />
                                        // }
                                        label="Firma recibida"
                                        color="success"
                                        variant="outlined"
                                    />
                                </Box>

                                <Divider
                                    sx={{
                                        mb: 2,
                                    }}
                                />

                                <Box
                                    sx={{
                                        display:
                                            'grid',
                                        gridTemplateColumns:
                                            'repeat(auto-fit, minmax(220px, 1fr))',
                                        gap: 2,
                                    }}
                                >
                                    <Box>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color:
                                                    '#888',
                                            }}
                                        >
                                            Empresa
                                        </Typography>

                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight:
                                                    500,
                                            }}
                                        >
                                            {licencia.empresa_nombre ||
                                                '—'}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color:
                                                    '#888',
                                            }}
                                        >
                                            Empresa ID
                                        </Typography>

                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight:
                                                    500,
                                                wordBreak:
                                                    'break-all',
                                            }}
                                        >
                                            {
                                                licencia.empresa_id
                                            }
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color:
                                                    '#888',
                                            }}
                                        >
                                            Tipo
                                        </Typography>

                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight:
                                                    500,
                                            }}
                                        >
                                            {getTipoLabel(
                                                licencia.tipo
                                            )}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color:
                                                    '#888',
                                            }}
                                        >
                                            Inicio
                                        </Typography>

                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight:
                                                    500,
                                            }}
                                        >
                                            {formatDate(
                                                licencia.fecha_inicio
                                            )}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color:
                                                    '#888',
                                            }}
                                        >
                                            Vencimiento
                                        </Typography>

                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight:
                                                    500,
                                            }}
                                        >
                                            {formatDate(
                                                licencia.fecha_vencimiento
                                            )}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color:
                                                    '#888',
                                            }}
                                        >
                                            Máximo usuarios
                                        </Typography>

                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight:
                                                    500,
                                            }}
                                        >
                                            {licencia.max_usuarios ===
                                            0
                                                ? 'Ilimitados'
                                                : licencia.max_usuarios ??
                                                  '—'}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>
                        </Box>
                    )}


                    {/* ═══════════════════════════════════════════
                        HARDWARE ID
                    ═══════════════════════════════════════════ */}

                    <Box
                        sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 3,
                            px: 2,
                            pb: 2,
                        }}
                    >
                        <Box
                            sx={{
                                flex:
                                    '1 1 300px',
                            }}
                        >
                            <Typography
                                sx={{
                                    mb: 1,
                                    fontWeight: 500,
                                    color: '#666',
                                }}
                            >
                                Identificador del dispositivo
                            </Typography>

                            <TextField
                                fullWidth
                                size="small"
                                value={
                                    hardwareId ||
                                    'Generando identificador...'
                                }
                                InputProps={{
                                    readOnly: true,
                                    startAdornment:
                                        (
                                            <InputAdornment position="start">
                                                <DevicesIcon
                                                    sx={{
                                                        fontSize:
                                                            19,
                                                        color:
                                                            '#1976d2',
                                                    }}
                                                />
                                            </InputAdornment>
                                        ),
                                    endAdornment:
                                        (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    size="small"
                                                    onClick={
                                                        copiarHardwareId
                                                    }
                                                    disabled={
                                                        !hardwareId
                                                    }
                                                    title="Copiar Hardware ID"
                                                    sx={{
                                                        color:
                                                            '#1976d2',
                                                    }}
                                                >
                                                    <ContentCopyIcon
                                                        sx={{
                                                            fontSize:
                                                                18,
                                                        }}
                                                    />
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root':
                                        {
                                            borderRadius: 1,
                                            backgroundColor:
                                                '#f8f9fa',
                                            color: '#666',
                                        },
                                }}
                            />

                            <Typography
                                variant="caption"
                                sx={{
                                    display: 'block',
                                    mt: 0.7,
                                    color: '#888',
                                }}
                            >
                                Identificador SHA-256 generado
                                localmente. No se obtiene del
                                backend.
                            </Typography>
                        </Box>


                        {/* ═══════════════════════════════════════
                            ESTADO PÚBLICO
                        ═══════════════════════════════════════ */}

                        {estadoPublico && (
                            <Box
                                sx={{
                                    flex:
                                        '1 1 300px',
                                }}
                            >
                                <Typography
                                    sx={{
                                        mb: 1,
                                        fontWeight:
                                            500,
                                        color: '#666',
                                    }}
                                >
                                    Estado público
                                </Typography>

                                <Paper
                                    variant="outlined"
                                    sx={{
                                        minHeight: 40,
                                        px: 1.5,
                                        display:
                                            'flex',
                                        alignItems:
                                            'center',
                                        justifyContent:
                                            'space-between',
                                        backgroundColor:
                                            '#f8f9fa',
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color:
                                                '#666',
                                        }}
                                    >
                                        {estadoPublico.valida &&
                                        estadoPublico.vigente
                                            ? 'Licencia válida y vigente'
                                            : 'Licencia no válida o no vigente'}
                                    </Typography>

                                    <Chip
                                        size="small"
                                        label={
                                            estadoPublico.valida &&
                                            estadoPublico.vigente
                                                ? 'VIGENTE'
                                                : 'NO VIGENTE'
                                        }
                                        color={
                                            estadoPublico.valida &&
                                            estadoPublico.vigente
                                                ? 'success'
                                                : 'error'
                                        }
                                    />
                                </Paper>

                                <Typography
                                    variant="caption"
                                    sx={{
                                        display:
                                            'block',
                                        mt: 0.7,
                                        color: '#888',
                                    }}
                                >
                                    Consulta realizada mediante
                                    el endpoint público de
                                    licencia.
                                </Typography>
                            </Box>
                        )}
                    </Box>


                    {/* ═══════════════════════════════════════════
                        BOTONES
                    ═══════════════════════════════════════════ */}

                    <Box
                        sx={{
                            display: 'flex',
                            gap: 2,
                            mt: 1,
                            px: 2,
                            pb: 2,
                            flexWrap: 'wrap',
                        }}
                    >
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={
                                loading ? (
                                    <CircularProgress
                                        size={16}
                                        sx={{
                                            color:
                                                'white',
                                        }}
                                    />
                                ) : (
                                    <FilterListIcon
                                        sx={{
                                            fontSize:
                                                16,
                                        }}
                                    />
                                )
                            }
                            onClick={
                                activarLicencia
                            }
                            disabled={
                                loading ||
                                !hardwareId
                            }
                            sx={{
                                textTransform:
                                    'none',
                                background:
                                    'linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))',
                                color: '#fff',
                                boxShadow:
                                    '0 4px 19px rgba(0,0,0,0.2)',
                                borderRadius: 1,
                                px: 3,
                                py: 0.8,
                                fontSize:
                                    '0.85rem',
                                fontWeight: 500,
                                '&:hover': {
                                    background:
                                        'linear-gradient(135deg, rgba(10, 83, 218, 1), rgba(10, 218, 20, 1))',
                                    boxShadow:
                                        '0 6px 16px rgba(9, 80, 212, 0.58)',
                                },
                            }}
                        >
                            {loading
                                ? 'Activando...'
                                : 'Activar Licencia'}
                        </Button>

                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={
                                <RefreshIcon
                                    sx={{
                                        fontSize:
                                            17,
                                    }}
                                />
                            }
                            onClick={() => {
                                cargarEstadoLicencia();

                                if (
                                    claveActivacion
                                ) {
                                    consultarEstadoPublico(
                                        claveActivacion
                                    );
                                }
                            }}
                            disabled={
                                loadingEstado
                            }
                            sx={{
                                textTransform:
                                    'none',
                                borderRadius: 1,
                                px: 2.5,
                                py: 0.8,
                                fontSize:
                                    '0.85rem',
                            }}
                        >
                            Consultar estado
                        </Button>
                    </Box>
                </Card>
            </Box>


            {/* ═══════════════════════════════════════════════════
                SNACKBAR
            ═══════════════════════════════════════════════════ */}

            <Snackbar
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={() =>
                    setOpenSnackbar(false)
                }
            >
                <Alert
                    severity={
                        snackbarSeverity
                    }
                    variant="filled"
                    onClose={() =>
                        setOpenSnackbar(false)
                    }
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
}