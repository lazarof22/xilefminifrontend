import type { ReactNode } from 'react';
import {
    Alert,
    Box,
    Card,
    CardContent,
    Chip,
    Divider,
    Grid,
    IconButton,
    LinearProgress,
    Skeleton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import type { EstadoPublico, EstadoUsuario, LicenciaAdmin } from '../../types/licencia.types';
import {
    DIAS_AVISO_VENCIMIENTO,
    MENSAJE_SIN_PERMISOS,
    describirEstado,
    estadoCompleto,
    esPerpetua,
    formatearFecha,
    porcentajeRestante,
    textoOGuion,
} from '../../utils/licencia';

// ═══ Campo de detalle ═══

interface CampoProps {
    etiqueta: string;
    children: ReactNode;
}

function Campo({ etiqueta, children }: CampoProps) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary" component="dt">
                {etiqueta}
            </Typography>
            <Typography variant="body2" component="dd" sx={{ m: 0, fontWeight: 600, wordBreak: 'break-all' }}>
                {children}
            </Typography>
        </Box>
    );
}

// ═══ Tarjeta de estado ═══

interface EstadoLicenciaCardProps {
    estado: EstadoUsuario | EstadoPublico | null;
    detalle: LicenciaAdmin | null;
    cargando: boolean;
    sinPermisos: boolean;
    error: string;
    onCopiar: (texto: string) => void;
}

export default function EstadoLicenciaCard({
    estado,
    detalle,
    cargando,
    sinPermisos,
    error,
    onCopiar,
}: EstadoLicenciaCardProps) {
    const descripcion = describirEstado(estado?.estado);
    const completo = estadoCompleto(estado, detalle);
    const perpetua = completo ? completo.perpetua || esPerpetua(completo.tipo, completo.fecha_vencimiento) : false;
    const dias = completo?.dias_restantes ?? null;
    const progreso = perpetua
        ? null
        : porcentajeRestante(detalle?.fecha_inicio, completo?.fecha_vencimiento, dias);
    const licenseId = detalle?.license_id ?? null;
    const colorProgreso = dias != null && dias <= 7 ? 'error' : dias != null && dias <= DIAS_AVISO_VENCIMIENTO ? 'warning' : 'success';

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
                    <Box>
                        <Typography variant="h6" component="h2">
                            Estado de la licencia
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Información verificada por el servidor
                        </Typography>
                    </Box>
                    {cargando ? (
                        <Skeleton variant="rounded" width={90} height={24} />
                    ) : (
                        estado && <Chip label={descripcion.etiqueta} color={descripcion.color} size="small" />
                    )}
                </Stack>

                {cargando ? (
                    <Stack spacing={1}>
                        <Skeleton height={28} />
                        <Skeleton height={28} />
                        <Skeleton height={28} />
                    </Stack>
                ) : (
                    <Stack spacing={2}>
                        {error && <Alert severity="error">{error}</Alert>}

                        {estado && (
                            <Alert severity={descripcion.severidad} variant="outlined">
                                {descripcion.descripcion}
                            </Alert>
                        )}

                        {sinPermisos && <Alert severity="info">{MENSAJE_SIN_PERMISOS}</Alert>}

                        {completo && completo.valida && (
                            <Box>
                                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {perpetua ? 'Licencia perpetua' : `Vence el ${formatearFecha(completo.fecha_vencimiento)}`}
                                    </Typography>
                                    {!perpetua && dias != null && (
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {dias} {dias === 1 ? 'día' : 'días'}
                                        </Typography>
                                    )}
                                </Stack>
                                {progreso != null && (
                                    <LinearProgress
                                        variant="determinate"
                                        value={progreso}
                                        color={colorProgreso}
                                        aria-label="Vigencia restante de la licencia"
                                        sx={{ height: 8, borderRadius: 4 }}
                                    />
                                )}
                            </Box>
                        )}

                        {detalle && (
                            <>
                                <Divider />
                                <Grid container spacing={2} component="dl" sx={{ m: 0 }}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Campo etiqueta="Tipo">{textoOGuion(detalle.tipo)}</Campo>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Campo etiqueta="Empresa">{textoOGuion(detalle.empresa_id)}</Campo>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Campo etiqueta="Inicio">{formatearFecha(detalle.fecha_inicio)}</Campo>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Campo etiqueta="Vencimiento">
                                            {perpetua ? 'Perpetua' : formatearFecha(detalle.fecha_vencimiento)}
                                        </Campo>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Campo etiqueta="Máx. usuarios">{textoOGuion(detalle.max_usuarios)}</Campo>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Campo etiqueta="Secuencia">{textoOGuion(detalle.secuencia)}</Campo>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Campo etiqueta="Emitida">{formatearFecha(detalle.emitida_en, true)}</Campo>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Campo etiqueta="Importada">{formatearFecha(detalle.importada_en, true)}</Campo>
                                    </Grid>
                                    <Grid size={12}>
                                        <Campo etiqueta="ID de licencia">
                                            <Box component="span" sx={{ fontFamily: 'monospace' }}>
                                                {textoOGuion(licenseId)}
                                            </Box>
                                            {licenseId && (
                                                <Tooltip title="Copiar ID">
                                                    <IconButton
                                                        size="small"
                                                        aria-label="Copiar ID de licencia"
                                                        onClick={() => onCopiar(licenseId)}
                                                        sx={{ ml: 0.5 }}
                                                    >
                                                        <ContentCopyIcon fontSize="inherit" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Campo>
                                    </Grid>
                                    {(detalle.revocada === true || detalle.activa === false) && (
                                        <Grid size={12}>
                                            <Alert severity="warning">
                                                {detalle.revocada === true ? 'Esta licencia está revocada.' : 'Esta licencia está inactiva.'}
                                            </Alert>
                                        </Grid>
                                    )}
                                </Grid>
                            </>
                        )}
                    </Stack>
                )}
            </CardContent>
        </Card>
    );
}
