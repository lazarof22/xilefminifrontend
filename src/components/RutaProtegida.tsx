import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { rutaInicio } from '../utils/auth';

function Cargando(): React.JSX.Element {
    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress />
        </Box>
    );
}

/** Exige sesión iniciada; si no, manda al login recordando a dónde iba. */
export function RutaPrivada(): React.JSX.Element {
    const { usuario, cargando } = useAuth();
    const ubicacion = useLocation();

    if (cargando) return <Cargando />;
    if (!usuario) return <Navigate to="/" replace state={{ desde: ubicacion.pathname }} />;
    return <Outlet />;
}

/** Exige acceso al módulo; si no lo tiene, lo manda a su primer módulo permitido. */
export function RutaModulo({
    modulo,
    children,
}: {
    modulo: string;
    children: React.ReactNode;
}): React.JSX.Element {
    const { usuario, tieneAcceso } = useAuth();
    if (tieneAcceso(modulo)) return <>{children}</>;
    const inicio = usuario ? rutaInicio(usuario.modulos) : null;
    return <Navigate to={inicio ?? '/'} replace />;
}
