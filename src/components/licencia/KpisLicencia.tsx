import type { ReactNode } from 'react';
import { Box, Card, CardContent, Grid, Skeleton, Stack, Typography } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import GppMaybeIcon from '@mui/icons-material/GppMaybe';
import GppBadIcon from '@mui/icons-material/GppBad';
import InfoIcon from '@mui/icons-material/Info';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import EventIcon from '@mui/icons-material/Event';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import GroupIcon from '@mui/icons-material/Group';

import type { EstadoPublico, EstadoUsuario, LicenciaAdmin, SeveridadLicencia } from '../../types/licencia.types';
import {
    describirEstado,
    estadoCompleto,
    formatearFecha,
    severidadVencimiento,
    textoMaxUsuarios,
    vigenciaLicencia,
} from '../../utils/licencia';

// ═══ Tarjeta KPI ═══

type ColorKpi = 'primary.main' | 'success.main' | 'warning.main' | 'error.main' | 'info.main' | 'text.secondary';

interface KpiProps {
    titulo: string;
    valor: string;
    icono: ReactNode;
    color: ColorKpi;
    cargando: boolean;
}

function Kpi({ titulo, valor, icono, color, cargando }: KpiProps) {
    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography color="text.secondary" variant="body2">
                            {titulo}
                        </Typography>
                        {cargando ? (
                            <Skeleton width={120} height={40} />
                        ) : (
                            <Typography variant="h5" noWrap sx={{ color }}>
                                {valor}
                            </Typography>
                        )}
                    </Box>
                    <Box aria-hidden sx={{ color, display: 'flex', '& svg': { fontSize: 40 } }}>
                        {icono}
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}

// ═══ Fila de KPIs ═══

const ICONOS_ESTADO: Record<SeveridadLicencia, ReactNode> = {
    success: <VerifiedUserIcon />,
    warning: <GppMaybeIcon />,
    error: <GppBadIcon />,
    info: <InfoIcon />,
};

interface KpisLicenciaProps {
    estado: EstadoUsuario | EstadoPublico | null;
    detalle: LicenciaAdmin | null;
    cargando: boolean;
}

export default function KpisLicencia({ estado, detalle, cargando }: KpisLicenciaProps) {
    const descripcion = describirEstado(estado?.estado);
    const completo = estadoCompleto(estado, detalle);
    const { perpetua, dias } = vigenciaLicencia(completo);

    // Mismo origen que la tarjeta de detalle: también muestra la fecha de una licencia expirada.
    const vencimiento = !completo
        ? '—'
        : perpetua
            ? 'Perpetua'
            : formatearFecha(completo.fecha_vencimiento);

    const severidadDias = severidadVencimiento(dias, perpetua);
    const colorDias: ColorKpi = severidadDias ? `${severidadDias}.main` : 'text.secondary';

    return (
        <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Kpi
                    titulo="Estado"
                    valor={estado ? descripcion.etiqueta : '—'}
                    icono={estado ? ICONOS_ESTADO[descripcion.severidad] : <ShieldOutlinedIcon />}
                    color={estado ? `${descripcion.color}.main` : 'text.secondary'}
                    cargando={cargando}
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Kpi titulo="Vencimiento" valor={vencimiento} icono={<EventIcon />} color="primary.main" cargando={cargando} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Kpi
                    titulo="Días restantes"
                    valor={perpetua ? '∞' : dias == null ? '—' : String(dias)}
                    icono={<HourglassBottomIcon />}
                    color={colorDias}
                    cargando={cargando}
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Kpi
                    titulo="Máx. usuarios"
                    valor={textoMaxUsuarios(detalle?.max_usuarios)}
                    icono={<GroupIcon />}
                    color="info.main"
                    cargando={cargando}
                />
            </Grid>
        </Grid>
    );
}
