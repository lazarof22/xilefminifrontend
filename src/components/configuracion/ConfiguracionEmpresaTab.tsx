import { useCallback, useMemo, useRef, useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    TextField,
    MenuItem,
    Button,
    Avatar,
    Paper,
    CircularProgress,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import SaveIcon from '@mui/icons-material/Save';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import BackupIcon from '@mui/icons-material/Backup';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import RestoreIcon from '@mui/icons-material/Restore';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { idPaisDeCiudad, type Ciudad, type EmpresaDatos, type Pais } from '../../service/configuracionApi';

// ─── Tipos ─────────────────────────────────────────────

export type TipoImportacion = 'productos' | 'cuentas';

interface ConfiguracionEmpresaTabProps {
    datosEmpresa: EmpresaDatos;
    paises: Pais[];
    ciudades: Ciudad[];
    loading: boolean;
    logoPreview: string | null;
    guardarEmpresa: () => Promise<void>;
    handleChangeEmpresa: (campo: keyof EmpresaDatos, valor: string) => void;
    subirLogo: (base64Logo: string) => Promise<void>;
    eliminarLogo: () => Promise<void>;
    tipoImportacion: TipoImportacion;
    onTipoImportacionChange: (tipo: TipoImportacion) => void;
    descargarPlantilla: () => void;
    importarCSV: () => Promise<void>;
    exportarRespaldo: () => Promise<void>;
    importarRespaldo: () => Promise<void>;
    csvFileName: string | null;
    respaldoFile: File | null;
    onCSVSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRespaldoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// ─── Estilos ───────────────────────────────────────────

const cardSx = {
    borderRadius: 3,
    border: '1px solid rgba(255,255,255,0.04)',
    bgcolor: '#151a19',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
    overflow: 'hidden',
    m: 1,
    mb: 2,
};

const cardTitleSx = {
    color: '#00e5a0',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: 1,
};

const inputSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 1,
        bgcolor: 'rgba(255,255,255,0.03)',
        color: '#e8f5f0',
        '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
        '&:hover fieldset': { borderColor: 'rgba(0,229,160,0.35)' },
        '&.Mui-focused fieldset': { borderColor: '#00e5a0' },
        '&.Mui-disabled': { opacity: 0.6 },
    },
    '& .MuiInputLabel-root': { color: '#9ca3af' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#00e5a0' },
    '& .MuiSelect-icon': { color: '#9ca3af' },
    '& .MuiFormHelperText-root': { color: '#6b7280' },
};

const menuProps = {
    slotProps: { paper: { sx: { bgcolor: '#151a19', color: '#e8f5f0' } } },
};

const greenButtonSx = {
    background: 'linear-gradient(135deg, #00e5a0, #00b87d)',
    color: '#fff',
    textTransform: 'none',
    fontWeight: 600,
    boxShadow: '0 4px 12px rgba(0,229,160,0.20)',
};

const redButtonSx = {
    background: 'linear-gradient(135deg, #f80000 0%, #ec0163 100%)',
    color: '#fff',
    textTransform: 'none',
    fontWeight: 600,
    boxShadow: 'none',
};

const outlinedButtonSx = {
    textTransform: 'none',
    fontWeight: 600,
    color: '#00e5a0',
    borderColor: 'rgba(0,229,160,0.35)',
    '&:hover': { borderColor: '#00e5a0', bgcolor: 'rgba(0,229,160,0.06)' },
};

const panelSx = {
    flex: 1,
    p: 2,
    borderRadius: 2,
    bgcolor: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: 1.5,
};

const panelTitleSx = {
    color: '#e8f5f0',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 1,
};

const CAMPOS_TEXTO: { campo: keyof EmpresaDatos; label: string; placeholder: string; type?: string }[] = [
    { campo: 'nombre', label: 'Nombre de la empresa *', placeholder: 'Ej: Mi Empresa S.A.' },
    { campo: 'eslogan', label: 'Eslogan', placeholder: 'Ej: Innovación y calidad' },
    { campo: 'direccion', label: 'Dirección', placeholder: 'Ej: Av. Principal 123' },
    { campo: 'telefono', label: 'Teléfono', placeholder: 'Ej: +53 7 555 0000' },
    { campo: 'email', label: 'Email', placeholder: 'contacto@miempresa.com', type: 'email' },
    { campo: 'ruc_nit', label: 'RUC / NIT', placeholder: 'Ej: J-123456789-0' },
];

// ─── Componente ──────────────────────────────────────

export default function ConfiguracionEmpresaTab({
    datosEmpresa,
    paises,
    ciudades,
    loading,
    logoPreview,
    guardarEmpresa,
    handleChangeEmpresa,
    subirLogo,
    eliminarLogo,
    tipoImportacion,
    onTipoImportacionChange,
    descargarPlantilla,
    importarCSV,
    exportarRespaldo,
    importarRespaldo,
    csvFileName,
    respaldoFile,
    onCSVSelect,
    onRespaldoSelect,
}: ConfiguracionEmpresaTabProps) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const paisSeleccionado = paises.some(p => p._id === datosEmpresa.pais) ? datosEmpresa.pais : '';

    const ciudadesDelPais = useMemo(
        () => ciudades.filter(c => idPaisDeCiudad(c) === paisSeleccionado),
        [ciudades, paisSeleccionado],
    );

    // La empresa guarda la ciudad como texto: si el valor guardado no está en el
    // nomenclador se muestra igual para no perderlo.
    const ciudadFueraDeLista =
        !!datosEmpresa.ciudad && !ciudadesDelPais.some(c => c.nombreCiudad === datosEmpresa.ciudad);

    const helperCiudad = !paisSeleccionado
        ? 'Seleccione primero un país'
        : ciudadesDelPais.length === 0
            ? 'Este país no tiene ciudades. Use "Agregar Ciudad"'
            : undefined;

    // ─── Logo ───
    const processLogoFile = useCallback(
        (file: File) => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onloadend = () => {
                void subirLogo(reader.result as string);
            };
            reader.readAsDataURL(file);
        },
        [subirLogo],
    );

    const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processLogoFile(file);
        e.target.value = '';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processLogoFile(file);
    };

    return (
        <Box>
            {/* ─── Datos de la empresa ─── */}
            <Card elevation={0} sx={cardSx}>
                <CardContent sx={{ px: 3, py: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={cardTitleSx}>
                            <BusinessIcon sx={{ color: '#00e5a0', width: 24, height: 24 }} />
                            Datos de la Empresa
                        </Typography>
                        <Button
                            variant="contained"
                            size="small"
                            onClick={() => void guardarEmpresa()}
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                            sx={{ ...greenButtonSx, ml: 'auto' }}
                        >
                            Guardar
                        </Button>
                    </Box>

                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 280px' },
                        gap: 2,
                        alignItems: 'start',
                    }}>
                        {/* Columna 1 y 2: campos */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {CAMPOS_TEXTO.slice(0, 4).map(({ campo, label, placeholder, type }) => (
                                <TextField
                                    key={campo}
                                    fullWidth
                                    size="small"
                                    type={type ?? 'text'}
                                    label={label}
                                    placeholder={placeholder}
                                    value={datosEmpresa[campo]}
                                    onChange={(e) => handleChangeEmpresa(campo, e.target.value)}
                                    disabled={loading}
                                    sx={inputSx}
                                />
                            ))}
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {CAMPOS_TEXTO.slice(4).map(({ campo, label, placeholder, type }) => (
                                <TextField
                                    key={campo}
                                    fullWidth
                                    size="small"
                                    type={type ?? 'text'}
                                    label={label}
                                    placeholder={placeholder}
                                    value={datosEmpresa[campo]}
                                    onChange={(e) => handleChangeEmpresa(campo, e.target.value)}
                                    disabled={loading}
                                    sx={inputSx}
                                />
                            ))}

                            <TextField
                                select
                                fullWidth
                                size="small"
                                label="País"
                                value={paisSeleccionado}
                                onChange={(e) => handleChangeEmpresa('pais', e.target.value)}
                                disabled={loading || paises.length === 0}
                                helperText={paises.length === 0 ? 'No hay países. Use "Agregar País"' : undefined}
                                sx={inputSx}
                                slotProps={{ select: { MenuProps: menuProps } }}
                            >
                                {paises.map(p => (
                                    <MenuItem key={p._id} value={p._id}>{p.nombrePais}</MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                select
                                fullWidth
                                size="small"
                                label="Ciudad"
                                value={datosEmpresa.ciudad}
                                onChange={(e) => handleChangeEmpresa('ciudad', e.target.value)}
                                disabled={loading || !paisSeleccionado || (ciudadesDelPais.length === 0 && !ciudadFueraDeLista)}
                                helperText={helperCiudad}
                                sx={inputSx}
                                slotProps={{ select: { MenuProps: menuProps } }}
                            >
                                {ciudadFueraDeLista && (
                                    <MenuItem value={datosEmpresa.ciudad}>{datosEmpresa.ciudad}</MenuItem>
                                )}
                                {ciudadesDelPais.map(c => (
                                    <MenuItem key={c._id} value={c.nombreCiudad}>{c.nombreCiudad}</MenuItem>
                                ))}
                            </TextField>
                        </Box>

                        {/* Columna 3: logo */}
                        <Paper
                            elevation={0}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                            onDrop={handleDrop}
                            onClick={() => !loading && fileInputRef.current?.click()}
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                cursor: loading ? 'default' : 'pointer',
                                bgcolor: isDragging ? 'rgba(0,229,160,0.08)' : 'rgba(255,255,255,0.02)',
                                border: `1px dashed ${isDragging ? '#00e5a0' : 'rgba(255,255,255,0.12)'}`,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 1.5,
                                transition: 'all 0.2s',
                                '&:hover': { borderColor: 'rgba(0,229,160,0.5)' },
                            }}
                        >
                            <Typography sx={panelTitleSx}>
                                <ImageIcon sx={{ color: '#00e5a0' }} fontSize="small" />
                                Logo
                            </Typography>
                            <Avatar
                                src={logoPreview ?? undefined}
                                variant="rounded"
                                sx={{
                                    width: 120,
                                    height: 120,
                                    bgcolor: 'rgba(255,255,255,0.04)',
                                    color: '#6b7280',
                                    fontSize: '0.8rem',
                                    '& img': { objectFit: 'contain' },
                                }}
                            >
                                Sin logo
                            </Avatar>
                            <Typography variant="caption" sx={{ color: '#9ca3af', textAlign: 'center' }}>
                                Arrastre una imagen o haga clic para seleccionarla
                            </Typography>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={handleLogoSelect}
                            />
                            {logoPreview && (
                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<DeleteIcon />}
                                    disabled={loading}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        void eliminarLogo();
                                    }}
                                    sx={redButtonSx}
                                >
                                    Eliminar logo
                                </Button>
                            )}
                        </Paper>
                    </Box>
                </CardContent>
            </Card>

            {/* ─── Importar / Exportar ─── */}
            <Card elevation={0} sx={cardSx}>
                <CardContent sx={{ px: 3, py: 2 }}>
                    <Typography variant="h6" sx={{ ...cardTitleSx, mb: 2 }}>
                        <ImportExportIcon sx={{ color: '#00e5a0', width: 24, height: 24 }} />
                        Importar / Exportar
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                        {/* Importación CSV */}
                        <Box sx={panelSx}>
                            <Typography sx={panelTitleSx}>
                                <UploadFileIcon sx={{ color: '#00e5a0' }} fontSize="small" />
                                Importar desde CSV
                            </Typography>
                            <TextField
                                select
                                size="small"
                                label="Tipo de datos"
                                value={tipoImportacion}
                                onChange={(e) => onTipoImportacionChange(e.target.value as TipoImportacion)}
                                disabled={loading}
                                sx={inputSx}
                                slotProps={{ select: { MenuProps: menuProps } }}
                            >
                                <MenuItem value="productos">Productos</MenuItem>
                                <MenuItem value="cuentas">Cuentas contables</MenuItem>
                            </TextField>
                            <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                                {csvFileName ? `Archivo: ${csvFileName}` : 'Ningún archivo seleccionado'}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Button size="small" variant="outlined" startIcon={<DownloadIcon />}
                                    onClick={descargarPlantilla} sx={outlinedButtonSx}>
                                    Plantilla
                                </Button>
                                <Button size="small" variant="outlined" component="label" startIcon={<UploadIcon />}
                                    disabled={loading} sx={outlinedButtonSx}>
                                    Seleccionar
                                    <input type="file" accept=".csv,text/csv" hidden onChange={onCSVSelect} />
                                </Button>
                                <Button size="small" variant="contained" startIcon={<UploadFileIcon />}
                                    onClick={() => void importarCSV()} disabled={loading || !csvFileName}
                                    sx={greenButtonSx}>
                                    Importar
                                </Button>
                            </Box>
                        </Box>

                        {/* Respaldo */}
                        <Box sx={panelSx}>
                            <Typography sx={panelTitleSx}>
                                <BackupIcon sx={{ color: '#00e5a0' }} fontSize="small" />
                                Respaldo
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', color: '#fbbf24' }}>
                                <WarningAmberIcon fontSize="small" />
                                <Typography variant="caption">
                                    Restaurar un respaldo importa todos los registros del archivo JSON en la base de datos.
                                </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                                {respaldoFile ? `Archivo: ${respaldoFile.name}` : 'Ningún respaldo seleccionado'}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Button size="small" variant="contained" startIcon={<DownloadIcon />}
                                    onClick={() => void exportarRespaldo()} disabled={loading} sx={greenButtonSx}>
                                    Exportar
                                </Button>
                                <Button size="small" variant="outlined" component="label" startIcon={<UploadIcon />}
                                    disabled={loading} sx={outlinedButtonSx}>
                                    Seleccionar
                                    <input type="file" accept=".json,application/json" hidden onChange={onRespaldoSelect} />
                                </Button>
                                <Button size="small" variant="contained" startIcon={<RestoreIcon />}
                                    onClick={() => void importarRespaldo()} disabled={loading || !respaldoFile}
                                    sx={redButtonSx}>
                                    Restaurar
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}
