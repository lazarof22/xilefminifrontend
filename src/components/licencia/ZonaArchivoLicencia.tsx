import { useId, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import UploadFileIcon from '@mui/icons-material/UploadFile';

// ═══ Zona para soltar o seleccionar el archivo .lic ═══

interface ZonaArchivoLicenciaProps {
    nombreArchivo: string | null;
    deshabilitada: boolean;
    onArchivo: (archivo: File) => void;
}

export default function ZonaArchivoLicencia({ nombreArchivo, deshabilitada, onArchivo }: ZonaArchivoLicenciaProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const ayudaId = useId();
    const [arrastrando, setArrastrando] = useState(false);

    const abrirSelector = () => {
        if (!deshabilitada) inputRef.current?.click();
    };

    const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            abrirSelector();
        }
    };

    const alSoltar = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setArrastrando(false);
        if (deshabilitada) return;
        const archivo = e.dataTransfer.files.item(0);
        if (archivo) onArchivo(archivo);
    };

    return (
        <Box
            role="button"
            tabIndex={deshabilitada ? -1 : 0}
            aria-disabled={deshabilitada}
            aria-describedby={ayudaId}
            aria-label="Seleccionar archivo de licencia"
            onClick={abrirSelector}
            onKeyDown={alTeclear}
            onDragOver={(e) => {
                e.preventDefault();
                if (!deshabilitada) setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={alSoltar}
            sx={(theme) => ({
                border: '2px dashed',
                borderColor: arrastrando ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: deshabilitada ? 'not-allowed' : 'pointer',
                opacity: deshabilitada ? 0.5 : 1,
                bgcolor: arrastrando ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                transition: 'border-color .2s, background-color .2s',
                '&:hover, &:focus-visible': deshabilitada
                    ? {}
                    : { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.04) },
                '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
            })}
        >
            <UploadFileIcon aria-hidden sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography sx={{ fontWeight: 600 }}>
                {nombreArchivo ?? 'Arrastra aquí el archivo .lic o haz clic para seleccionarlo'}
            </Typography>
            <Typography id={ayudaId} variant="caption" color="text.secondary">
                Formatos aceptados: .lic o .json
            </Typography>
            <input
                ref={inputRef}
                type="file"
                accept=".lic,.json,application/json"
                hidden
                tabIndex={-1}
                onChange={(e) => {
                    const archivo = e.target.files?.item(0);
                    if (archivo) onArchivo(archivo);
                    // Permite volver a elegir el mismo archivo.
                    e.target.value = '';
                }}
            />
        </Box>
    );
}
