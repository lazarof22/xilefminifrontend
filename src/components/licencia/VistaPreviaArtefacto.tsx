import { Alert, Box, Grid, Paper, Stack, Typography } from '@mui/material';

import type { PayloadLicencia } from '../../types/licencia.types';
import { esPerpetua, formatearFecha } from '../../utils/licencia';

// ═══ Resumen del contenido del archivo .lic antes de enviarlo ═══

interface VistaPreviaArtefactoProps {
    payload: PayloadLicencia;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">
                {etiqueta}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
                {valor}
            </Typography>
        </Box>
    );
}

export default function VistaPreviaArtefacto({ payload }: VistaPreviaArtefactoProps) {
    const perpetua = esPerpetua(payload.tipo, payload.fecha_vencimiento);

    return (
        <Paper variant="outlined" sx={{ p: 2 }} aria-label="Resumen del archivo de licencia">
            <Stack spacing={2}>
                <Typography variant="subtitle2">Contenido del archivo</Typography>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Dato etiqueta="Empresa" valor={payload.empresa_id} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Dato etiqueta="Tipo" valor={payload.tipo} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Dato etiqueta="Inicio" valor={formatearFecha(payload.fecha_inicio)} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Dato etiqueta="Vencimiento" valor={perpetua ? 'Perpetua' : formatearFecha(payload.fecha_vencimiento)} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Dato etiqueta="Máx. usuarios" valor={String(payload.max_usuarios)} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Dato etiqueta="Secuencia" valor={String(payload.secuencia)} />
                    </Grid>
                </Grid>
                {payload.revocada && (
                    <Alert severity="error">
                        Este archivo es una <strong>revocación</strong>: al importarlo la licencia de este equipo dejará de ser válida.
                    </Alert>
                )}
                {!payload.revocada && !payload.activa && (
                    <Alert severity="warning">Este archivo contiene una licencia inactiva.</Alert>
                )}
                <Typography variant="caption" color="text.secondary">
                    La firma, el equipo y la vigencia se verifican en el servidor al confirmar.
                </Typography>
            </Stack>
        </Paper>
    );
}
