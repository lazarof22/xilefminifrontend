import {
    Box,
    Typography,
    Card,
    TextField,
    Button,
    Avatar,
    Paper,
} from '@mui/material';
import { useCallback, useRef, useState } from 'react';

import BusinessIcon from '@mui/icons-material/Business';
import SaveIcon from '@mui/icons-material/Save';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import BackupIcon from '@mui/icons-material/Backup';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export interface EmpresaData {
    nombre: string;
    eslogan: string;
    direccion: string;
    telefono: string;
    email: string;
    ruc_nit: string;
    ciudad: string;
    pais: string;
}

interface ConfiguracionEmpresaTabProps {
    datosEmpresa: EmpresaData;
    loading: boolean;
    logoPreview: string | null;
    guardarEmpresa: () => Promise<void>;
    handleChangeEmpresa: (
        campo: keyof EmpresaData,
        valor: string
    ) => void;
    subirLogo: (base64Logo: string) => Promise<void>;
    eliminarLogo: () => Promise<void>;
    descargarPlantilla: () => void;
    importarCSV: () => Promise<void>;
    exportarRespaldo: () => Promise<void>;
    importarRespaldo: () => Promise<void>;
    csvContent: string;
    respaldoFile: File | null;
    onCSVSelect: (
        e: React.ChangeEvent<HTMLInputElement>
    ) => void;
    onRespaldoSelect: (
        e: React.ChangeEvent<HTMLInputElement>
    ) => void;
}

/* =========================================================
   ESTILOS
========================================================= */

const inputSx = {
    width: '100%',
    maxWidth: 300,

    '& .MuiOutlinedInput-root': {
        backgroundColor: '#f8f9fa',
        minHeight: 38,
        fontSize: '0.82rem',
    },

    '& .MuiInputBase-input': {
        py: 0.8,
        px: 1.3,
    },

    '& .MuiInputBase-input::placeholder': {
        fontSize: '0.78rem',
        opacity: 0.7,
    },
};

const sectionTitleSx = {
    fontWeight: 600,
    background:
        'linear-gradient(135deg, rgba(0, 89, 255, 0.84), rgba(230, 21, 118, 0.9))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
};

const actionButtonSx = {
    textTransform: 'none',

    background:
        'linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))',

    color: '#fff',

    boxShadow: '0 4px 19px rgba(0,0,0,0.2)',

    borderRadius: 1,

    fontWeight: 500,

    '&:hover': {
        background:
            'linear-gradient(135deg, rgba(10, 83, 218, 1), rgba(10, 218, 20, 1))',

        boxShadow:
            '0 6px 16px rgba(9, 80, 212, 0.58)',
    },
};

const smallActionButtonSx = {
    ...actionButtonSx,

    px: 2,
    py: 0.6,

    fontSize: '0.76rem',

    minHeight: 34,
};

/* =========================================================
   COMPONENTE
========================================================= */

export default function ConfiguracionEmpresaTab({
    datosEmpresa,
    loading,
    logoPreview,
    guardarEmpresa,
    handleChangeEmpresa,
    subirLogo,
    eliminarLogo,
    descargarPlantilla,
    importarCSV,
    exportarRespaldo,
    importarRespaldo,
    csvContent,
    respaldoFile,
    onCSVSelect,
    onRespaldoSelect,
}: ConfiguracionEmpresaTabProps) {
    const [isDragging, setIsDragging] = useState(false);

    const fileInputRef =
        useRef<HTMLInputElement>(null);

    /* =====================================================
       LOGO
    ===================================================== */

    const processLogoFile = useCallback(
        (file: File) => {
            if (!file.type.startsWith('image/')) {
                return;
            }

            const reader = new FileReader();

            reader.onloadend = () => {
                const base64 = reader.result as string;

                void subirLogo(base64);
            };

            reader.readAsDataURL(file);
        },
        [subirLogo]
    );

    const handleLogoSelect = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];

        if (file) {
            processLogoFile(file);
        }
    };

    const handleDragOver = (
        e: React.DragEvent
    ) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (
        e: React.DragEvent
    ) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (
        e: React.DragEvent
    ) => {
        e.preventDefault();

        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];

        if (file) {
            processLogoFile(file);
        }
    };

    /* =====================================================
       INPUT
    ===================================================== */

    const renderInput = (
        campo: keyof EmpresaData,
        label: string,
        placeholder: string
    ) => (
        <Box
            sx={{
                width: '100%',
                maxWidth: 300,
            }}
        >
            <Typography
                sx={{
                    mb: 0.5,
                    fontWeight: 500,
                    color: '#444',
                    fontSize: '0.8rem',
                }}
            >
                {label}
            </Typography>

            <TextField
                size="small"
                fullWidth
                type={
                    campo === 'email'
                        ? 'email'
                        : 'text'
                }
                placeholder={placeholder}
                value={datosEmpresa[campo]}
                onChange={(e) =>
                    handleChangeEmpresa(
                        campo,
                        e.target.value
                    )
                }
                sx={inputSx}
            />
        </Box>
    );

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <Box
            sx={{ width: '100%', px: 2, pt: 2 }}
        >
            {/* =================================================
                DATOS DE LA EMPRESA + LOGO
            ================================================= */}

            <Card
                sx={{
                    width: '100%',
                    p: 2.5,
                    borderRadius: 2,
                }}
            >
                {/* TÍTULO */}

                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        mb: 3,
                    }}
                >
                    <BusinessIcon
                        sx={{
                            color: '#1976d2',
                            fontSize: 22,
                        }}
                    />

                    <Typography
                        variant="h6"
                        sx={sectionTitleSx}
                    >
                        Datos de la Empresa
                    </Typography>
                </Box>

                {/* =================================================
                    FORMULARIOS + LOGO
                ================================================= */}

                <Box
                    sx={{
                        display: 'grid',

                        gridTemplateColumns: {
                            xs: '1fr',
                            md: '300px 300px 430px',
                        },

                        justifyContent: 'center',

                        alignItems: 'start',

                        columnGap: {
                            xs: 2,
                            md: 4,
                        },

                        rowGap: 2,

                        width: '100%',
                    }}
                >
                    {/* =================================================
                        COLUMNA 1
                    ================================================= */}

                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1.8,
                            width: '100%',
                        }}
                    >
                        {renderInput(
                            'nombre',
                            'Nombre',
                            'Nombre'
                        )}

                        {renderInput(
                            'eslogan',
                            'Eslogan',
                            'Eslogan'
                        )}

                        {renderInput(
                            'direccion',
                            'Dirección',
                            'Dirección'
                        )}

                        {renderInput(
                            'telefono',
                            'Teléfono',
                            'Teléfono'
                        )}
                    </Box>

                    {/* =================================================
                        COLUMNA 2
                    ================================================= */}

                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1.8,
                            width: '100%',
                        }}
                    >
                        {renderInput(
                            'email',
                            'Email',
                            'Email'
                        )}

                        {renderInput(
                            'ruc_nit',
                            'RUC/NIT',
                            'RUC/NIT'
                        )}

                        {renderInput(
                            'ciudad',
                            'Ciudad',
                            'Ciudad'
                        )}

                        {renderInput(
                            'pais',
                            'País',
                            'País'
                        )}
                    </Box>

                    {/* =================================================
                        COLUMNA 3 - LOGO
                    ================================================= */}

                    <Box
                        sx={{
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}
                    >
                        {/* TÍTULO LOGO */}

                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 0.8,
                                mb: 1.5,
                            }}
                        >
                            <ImageIcon
                                sx={{
                                    color: '#1976d2',
                                    fontSize: 20,
                                }}
                            />

                            <Typography
                                sx={{
                                    ...sectionTitleSx,
                                    fontWeight: 600,
                                    fontSize: '0.95rem',
                                }}
                            >
                                Logo
                            </Typography>
                        </Box>

                        {/* PREVISUALIZACIÓN */}

                        <Box
                            sx={{
                                width: 110,
                                height: 110,

                                flexShrink: 0,

                                border: '2px dashed #ccc',

                                borderRadius: 2,

                                display: 'flex',

                                alignItems: 'center',

                                justifyContent: 'center',

                                backgroundColor: '#fafafa',

                                overflow: 'hidden',

                                mb: 1.5,
                            }}
                        >
                            {logoPreview ? (
                                <Avatar
                                    src={logoPreview}
                                    variant="rounded"
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                    }}
                                />
                            ) : (
                                <Typography
                                    sx={{
                                        color: '#999',
                                        fontSize: '0.78rem',
                                    }}
                                >
                                    Sin logo
                                </Typography>
                            )}
                        </Box>

                        {/* ÁREA DE CARGA */}

                        <Paper
                            component="label"
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            sx={{
                                width: '100%',
                                maxWidth: 400,

                                p: 1.7,

                                border:
                                    `2px dashed ${isDragging
                                        ? '#1976d2'
                                        : '#ccc'
                                    }`,

                                borderRadius: 2,

                                backgroundColor:
                                    isDragging
                                        ? 'rgba(25, 118, 210, 0.05)'
                                        : '#fafafa',

                                textAlign: 'center',

                                cursor: 'pointer',

                                transition:
                                    'all 0.3s ease',

                                '&:hover': {
                                    borderColor:
                                        '#1976d2',

                                    backgroundColor:
                                        'rgba(25, 118, 210, 0.05)',
                                },
                            }}
                        >
                            <input
                                type="file"
                                hidden
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleLogoSelect}
                            />

                            <UploadIcon
                                sx={{
                                    fontSize: 30,
                                    color: isDragging
                                        ? '#1976d2'
                                        : '#999',
                                    mb: 0.4,
                                }}
                            />

                            <Typography
                                sx={{
                                    color: '#666',
                                    fontSize: '0.8rem',
                                    fontWeight: 500,
                                }}
                            >
                                {isDragging
                                    ? 'Suelta la imagen aquí'
                                    : 'Arrastra y suelta tu logo aquí'}
                            </Typography>

                            <Typography
                                sx={{
                                    color: '#999',
                                    fontSize: '0.7rem',
                                    mt: 0.3,
                                }}
                            >
                                o haz clic para seleccionar
                            </Typography>
                        </Paper>

                        {/* ELIMINAR */}

                        <Button
                            variant="contained"
                            size="small"
                            startIcon={
                                <DeleteIcon
                                    sx={{
                                        fontSize: 15,
                                    }}
                                />
                            }
                            onClick={eliminarLogo}
                            disabled={
                                loading ||
                                !logoPreview
                            }
                            sx={{
                                mt: 1.2,

                                textTransform: 'none',

                                background:
                                    'linear-gradient(135deg, rgba(255,0,0,0.9), rgba(226,45,187,0.9))',

                                color: '#fff',

                                px: 2,

                                py: 0.55,

                                fontSize: '0.76rem',

                                '&:hover': {
                                    backgroundColor:
                                        '#b71c1c',
                                },
                            }}
                        >
                            Eliminar
                        </Button>
                    </Box>
                </Box>

                {/* =================================================
                    BOTÓN GUARDAR
                ================================================= */}

                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        mt: 3,
                        pt: 2,
                        borderTop:
                            '1px solid #eeeeee',
                    }}
                >
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={
                            <SaveIcon
                                sx={{
                                    fontSize: 17,
                                }}
                            />
                        }
                        onClick={guardarEmpresa}
                        disabled={loading}
                        sx={{
                            ...actionButtonSx,

                            px: 3.5,
                            py: 0.8,

                            fontSize: '0.82rem',
                        }}
                    >
                        Guardar
                    </Button>
                </Box>
            </Card>

            {/* =================================================
                IMPORTACIÓN / EXPORTACIÓN
            ================================================= */}

            <Card
                sx={{
                    width: '100%',
                    p: 2,
                    mt: 2,
                    borderRadius: 2,
                }}
            >
                {/* TÍTULO */}

                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        mb: 3,
                    }}
                >
                    <UploadIcon
                        sx={{
                            color: '#1976d2',
                            fontSize: 22,
                        }}
                    />

                    <Typography
                        variant="h6"
                        sx={sectionTitleSx}
                    >
                        Importación/Exportación
                    </Typography>
                </Box>

                {/* BOXES */}

                <Box
                    sx={{
                        display: 'flex',

                        justifyContent: 'center',

                        alignItems: 'stretch',

                        flexWrap: 'wrap',

                        gap: 2,

                        width: '100%',
                    }}
                >
                    {/* PLANTILLA */}

                    <Box
                        sx={{
                            width: {
                                xs: '100%',
                                sm: 280,
                            },

                            maxWidth: 280,

                            minHeight: 120,

                            border:
                                '1px solid #e0e0e0',

                            borderRadius: 2,

                            p: 1.8,

                            backgroundColor:
                                '#fafafa',

                            display: 'flex',

                            flexDirection: 'column',

                            alignItems: 'center',

                            justifyContent: 'center',

                            textAlign: 'center',
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 0.8,
                                mb: 1.5,
                            }}
                        >
                            <ImageIcon
                                sx={{
                                    color: '#666',
                                    fontSize: 18,
                                }}
                            />

                            <Typography
                                sx={{
                                    fontWeight: 600,
                                    color: '#444',
                                    fontSize: '0.85rem',
                                }}
                            >
                                Plantilla
                            </Typography>
                        </Box>

                        <Button
                            variant="contained"
                            size="small"
                            startIcon={
                                <DownloadIcon
                                    sx={{
                                        fontSize: 15,
                                    }}
                                />
                            }
                            onClick={
                                descargarPlantilla
                            }
                            sx={smallActionButtonSx}
                        >
                            Descargar
                        </Button>
                    </Box>

                    {/* IMPORTAR CSV */}

                    <Box
                        sx={{
                            width: {
                                xs: '100%',
                                sm: 280,
                            },

                            maxWidth: 280,

                            minHeight: 120,

                            border:
                                '1px solid #e0e0e0',

                            borderRadius: 2,

                            p: 1.8,

                            backgroundColor:
                                '#fafafa',

                            display: 'flex',

                            flexDirection: 'column',

                            alignItems: 'center',

                            justifyContent: 'center',

                            textAlign: 'center',
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 0.8,
                                mb: 1.2,
                            }}
                        >
                            <UploadIcon
                                sx={{
                                    color: '#666',
                                    fontSize: 18,
                                }}
                            />

                            <Typography
                                sx={{
                                    fontWeight: 600,
                                    color: '#444',
                                    fontSize: '0.85rem',
                                }}
                            >
                                Importar CSV
                            </Typography>
                        </Box>

                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 0.8,
                                mb: 1.2,
                                flexWrap: 'wrap',
                            }}
                        >
                            <Button
                                variant="outlined"
                                component="label"
                                size="small"
                                sx={{
                                    textTransform:
                                        'none',

                                    borderColor:
                                        '#ccc',

                                    color: '#444',

                                    fontSize:
                                        '0.75rem',

                                    px: 1.3,

                                    py: 0.5,
                                }}
                            >
                                Seleccionar

                                <input
                                    type="file"
                                    accept=".csv"
                                    hidden
                                    onChange={
                                        onCSVSelect
                                    }
                                />
                            </Button>

                            <Typography
                                sx={{
                                    color: '#666',
                                    fontSize:
                                        '0.7rem',
                                }}
                            >
                                {csvContent
                                    ? 'Archivo cargado'
                                    : 'Sin archivo'}
                            </Typography>
                        </Box>

                        <Button
                            variant="contained"
                            size="small"
                            startIcon={
                                <UploadIcon
                                    sx={{
                                        fontSize: 15,
                                    }}
                                />
                            }
                            onClick={importarCSV}
                            disabled={
                                loading ||
                                !csvContent
                            }
                            sx={smallActionButtonSx}
                        >
                            Importar
                        </Button>
                    </Box>

                    {/* RESPALDO */}

                    <Box
                        sx={{
                            width: {
                                xs: '100%',
                                sm: 280,
                            },

                            maxWidth: 280,

                            minHeight: 120,

                            border:
                                '1px solid #e0e0e0',

                            borderRadius: 2,

                            p: 1.8,

                            backgroundColor:
                                '#fafafa',

                            display: 'flex',

                            flexDirection: 'column',

                            alignItems: 'center',

                            justifyContent: 'center',

                            textAlign: 'center',
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 0.8,
                                mb: 1.2,
                            }}
                        >
                            <BackupIcon
                                sx={{
                                    color: '#666',
                                    fontSize: 18,
                                }}
                            />

                            <Typography
                                sx={{
                                    fontWeight: 600,
                                    color: '#444',
                                    fontSize: '0.85rem',
                                }}
                            >
                                Respaldo
                            </Typography>
                        </Box>

                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent:
                                    'center',
                                gap: 0.8,
                                mb: 1.2,
                                flexWrap: 'wrap',
                            }}
                        >
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={
                                    <DownloadIcon
                                        sx={{
                                            fontSize: 15,
                                        }}
                                    />
                                }
                                onClick={
                                    exportarRespaldo
                                }
                                disabled={loading}
                                sx={{
                                    ...smallActionButtonSx,
                                    px: 1.7,
                                }}
                            >
                                Exportar
                            </Button>

                            <Button
                                variant="outlined"
                                component="label"
                                size="small"
                                sx={{
                                    textTransform:
                                        'none',

                                    borderColor:
                                        '#ccc',

                                    color: '#444',

                                    fontSize:
                                        '0.75rem',

                                    px: 1.7,

                                    py: 0.6,
                                }}
                            >
                                Importar

                                <input
                                    type="file"
                                    accept=".json"
                                    hidden
                                    onChange={
                                        onRespaldoSelect
                                    }
                                />
                            </Button>
                        </Box>

                        <Button
                            variant="contained"
                            size="small"
                            startIcon={
                                <WarningAmberIcon
                                    sx={{
                                        fontSize: 15,
                                    }}
                                />
                            }
                            onClick={
                                importarRespaldo
                            }
                            disabled={
                                loading ||
                                !respaldoFile
                            }
                            sx={{
                                textTransform:
                                    'none',

                                background:
                                    'linear-gradient(135deg, rgba(255,0,0,0.9), rgba(226,45,187,0.9))',

                                color: '#fff',

                                px: 2,

                                py: 0.6,

                                fontSize:
                                    '0.78rem',

                                '&:hover': {
                                    backgroundColor:
                                        '#b71c1c',
                                },
                            }}
                        >
                            Resetear
                        </Button>
                    </Box>
                </Box>
            </Card>
        </Box>
    );
}