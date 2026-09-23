import {
    Box,
    Typography,
    Card,
    TextField,
    Button,
    IconButton,
} from '@mui/material';

import PersonIcon from '@mui/icons-material/Person';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

import { useState } from 'react';

export interface UsuarioBackend {
    _id: string;
    ci_empleado: string;
    nombre_empleado: string;
    correo_empleado: string;
    departamento: string;
    cargo: string;
    salario: number;
    rol: string;
    createdAt: string;
}

export interface UsuarioRow {
    id: number;
    usuario: string;
    accion: string;
}

interface ConfiguracionUsuariosTabProps {
    usuarios: UsuarioRow[];
    loading: boolean;

    agregarUsuario: (datos: {
        nombre: string;
        contrasena: string;
        correo: string;
        ci: string;
        departamento: string;
        cargo: string;
        salario: string;
    }) => Promise<void>;

    eliminarUsuario: (id: number) => Promise<void>;
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
        fontSize: '0.84rem',
    },

    '& .MuiInputBase-input': {
        py: 0.85,
        px: 1.3,
    },

    '& .MuiInputBase-input::placeholder': {
        fontSize: '0.8rem',
        opacity: 0.7,
    },
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

const sectionTitleSx = {
    fontWeight: 600,

    background:
        'linear-gradient(135deg, rgba(0, 89, 255, 0.84), rgba(230, 21, 118, 0.9))',

    WebkitBackgroundClip: 'text',

    WebkitTextFillColor: 'transparent',
};

/* =========================================================
   COMPONENTE
========================================================= */

export default function ConfiguracionUsuariosTab({
    usuarios,
    loading,
    agregarUsuario,
    eliminarUsuario,
}: ConfiguracionUsuariosTabProps) {
    const [nuevoUsuario, setNuevoUsuario] =
        useState('');

    const [nuevaContrasena, setNuevaContrasena] =
        useState('');

    const [nuevoCorreo, setNuevoCorreo] =
        useState('');

    const [nuevoCI, setNuevoCI] =
        useState('');

    const [nuevoDepartamento, setNuevoDepartamento] =
        useState('');

    const [nuevoCargo, setNuevoCargo] =
        useState('');

    const [nuevoSalario, setNuevoSalario] =
        useState('');

    /* =====================================================
       AGREGAR USUARIO
    ===================================================== */

    const handleAgregarUsuario = async () => {
        if (
            !nuevoUsuario.trim() ||
            !nuevaContrasena.trim()
        ) {
            return;
        }

        await agregarUsuario({
            nombre: nuevoUsuario,
            contrasena: nuevaContrasena,
            correo: nuevoCorreo,
            ci: nuevoCI,
            departamento: nuevoDepartamento,
            cargo: nuevoCargo,
            salario: nuevoSalario,
        });

        setNuevoUsuario('');
        setNuevaContrasena('');
        setNuevoCorreo('');
        setNuevoCI('');
        setNuevoDepartamento('');
        setNuevoCargo('');
        setNuevoSalario('');
    };

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <Box
           
            sx={{ width: '100%', px: 2, pt: 2 }}
        >
            <Card
                sx={{
                    width: '100%',
                    p: 2,
                    borderRadius: 2,
                    
                }}
            >
                {/* =================================================
                    CABECERA
                ================================================= */}

                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        mb: 3,
                    }}
                >
                    <PersonIcon
                        sx={{
                            color: '#1976d2',
                            fontSize: 22,
                        }}
                    />

                    <Typography
                        variant="h6"
                        sx={sectionTitleSx}
                    >
                        Usuarios
                    </Typography>

                    <Box
                        sx={{
                            ml: 1,

                            width: 26,
                            height: 26,

                            borderRadius: '50%',

                            backgroundColor:
                                '#e3f2fd',

                            display: 'flex',

                            alignItems: 'center',

                            justifyContent:
                                'center',
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize:
                                    '0.75rem',

                                fontWeight: 600,

                                color:
                                    '#1976d2',
                            }}
                        >
                            {usuarios.length}
                        </Typography>
                    </Box>
                </Box>

                {/* =================================================
                    CONTENIDO PRINCIPAL
                ================================================= */}

                <Box
                    sx={{
                        display: 'grid',

                        gridTemplateColumns: {
                            xs: '1fr',
                            md: 'minmax(300px, 320px) minmax(300px, 420px)',
                        },

                        justifyContent: 'center',

                        alignItems: 'start',

                        gap: {
                            xs: 4,
                            md: 5,
                        },

                        width: '100%',
                    }}
                >
                    {/* =================================================
                        FORMULARIO NUEVO USUARIO
                    ================================================= */}

                    <Box
                        sx={{
                            width: '100%',
                            maxWidth: 320,
                            justifySelf: 'center',
                        }}
                    >
                        <Typography
                            sx={{
                                mb: 1,
                                fontWeight: 600,
                                color: '#444',
                                fontSize:
                                    '0.85rem',
                                textAlign:
                                    'center',
                            }}
                        >
                            Nuevo Usuario
                        </Typography>

                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection:
                                    'column',
                                alignItems:
                                    'center',
                                gap: 1.2,
                            }}
                        >
                            {/* NOMBRE */}

                            <TextField
                                size="small"
                                placeholder="Nombre completo"
                                value={nuevoUsuario}
                                onChange={(e) =>
                                    setNuevoUsuario(
                                        e.target.value
                                    )
                                }
                                sx={inputSx}
                            />

                            {/* CORREO */}

                            <TextField
                                size="small"
                                type="email"
                                placeholder="Correo electrónico"
                                value={nuevoCorreo}
                                onChange={(e) =>
                                    setNuevoCorreo(
                                        e.target.value
                                    )
                                }
                                sx={inputSx}
                            />

                            {/* CI */}

                            <TextField
                                size="small"
                                placeholder="Cédula de identidad"
                                value={nuevoCI}
                                onChange={(e) =>
                                    setNuevoCI(
                                        e.target.value
                                    )
                                }
                                sx={inputSx}
                            />

                            {/* DEPARTAMENTO */}

                            <TextField
                                size="small"
                                placeholder="Departamento"
                                value={
                                    nuevoDepartamento
                                }
                                onChange={(e) =>
                                    setNuevoDepartamento(
                                        e.target.value
                                    )
                                }
                                sx={inputSx}
                            />

                            {/* CARGO */}

                            <TextField
                                size="small"
                                placeholder="Cargo"
                                value={nuevoCargo}
                                onChange={(e) =>
                                    setNuevoCargo(
                                        e.target.value
                                    )
                                }
                                sx={inputSx}
                            />

                            {/* SALARIO */}

                            <TextField
                                size="small"
                                type="number"
                                placeholder="Salario"
                                value={nuevoSalario}
                                onChange={(e) =>
                                    setNuevoSalario(
                                        e.target.value
                                    )
                                }
                                sx={inputSx}
                            />

                            {/* CONTRASEÑA + AGREGAR */}

                            <Box
                                sx={{
                                    display: 'flex',

                                    alignItems:
                                        'center',

                                    justifyContent:
                                        'center',

                                    gap: 1,

                                    width: '100%',
                                }}
                            >
                                <TextField
                                    size="small"
                                    type="password"
                                    placeholder="Contraseña"
                                    value={
                                        nuevaContrasena
                                    }
                                    onChange={(e) =>
                                        setNuevaContrasena(
                                            e.target.value
                                        )
                                    }
                                    sx={{
                                        ...inputSx,
                                        maxWidth: 205,
                                    }}
                                />

                                <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={
                                        <AddIcon
                                            sx={{
                                                fontSize: 15,
                                            }}
                                        />
                                    }
                                    onClick={() =>
                                        void handleAgregarUsuario()
                                    }
                                    disabled={
                                        loading
                                    }
                                    sx={{
                                        ...actionButtonSx,

                                        px: 1.8,
                                        py: 0.65,

                                        fontSize:
                                            '0.78rem',

                                        minWidth:
                                            'unset',

                                        minHeight: 36,
                                    }}
                                >
                                    Agregar
                                </Button>
                            </Box>
                        </Box>
                    </Box>

                    {/* =================================================
                        LISTA DE USUARIOS
                    ================================================= */}

                    <Box
                        sx={{
                            width: '100%',
                            maxWidth: 420,
                            justifySelf: 'center',
                        }}
                    >
                        <Typography
                            sx={{
                                mb: 1,
                                fontWeight: 600,
                                color: '#444',
                                fontSize:
                                    '0.85rem',
                                textAlign:
                                    'center',
                            }}
                        >
                            Usuarios registrados
                        </Typography>

                        <Box
                            sx={{
                                width: '100%',

                                border:
                                    '1px solid #e0e0e0',

                                borderRadius: 1.5,

                                overflow: 'hidden',

                                backgroundColor:
                                    '#fff',
                            }}
                        >
                            {/* CABECERA TABLA */}

                            <Box
                                sx={{
                                    display: 'flex',

                                    backgroundColor:
                                        '#f5f5f5',

                                    px: 1.5,

                                    py: 0.8,

                                    borderBottom:
                                        '1px solid #e0e0e0',
                                }}
                            >
                                <Typography
                                    sx={{
                                        flex: 1,

                                        fontWeight: 600,

                                        color: '#444',

                                        fontSize:
                                            '0.78rem',
                                    }}
                                >
                                    Usuario
                                </Typography>

                                <Typography
                                    sx={{
                                        flex: 1,

                                        fontWeight: 600,

                                        color: '#444',

                                        fontSize:
                                            '0.78rem',

                                        textAlign:
                                            'right',
                                    }}
                                >
                                    Acción
                                </Typography>
                            </Box>

                            {/* FILAS */}

                            {usuarios.map((u) => (
                                <Box
                                    key={u.id}
                                    sx={{
                                        display:
                                            'flex',

                                        px: 1.5,

                                        py: 0.9,

                                        borderBottom:
                                            '1px solid #f0f0f0',

                                        alignItems:
                                            'center',

                                        '&:last-child': {
                                            borderBottom:
                                                'none',
                                        },
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            flex: 1,

                                            color: '#444',

                                            fontSize:
                                                '0.78rem',

                                            overflow:
                                                'hidden',

                                            textOverflow:
                                                'ellipsis',

                                            whiteSpace:
                                                'nowrap',
                                        }}
                                    >
                                        {u.usuario}
                                    </Typography>

                                    <Box
                                        sx={{
                                            flex: 1,

                                            display:
                                                'flex',

                                            justifyContent:
                                                'flex-end',

                                            alignItems:
                                                'center',

                                            gap: 0.6,
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                color:
                                                    '#666',

                                                fontSize:
                                                    '0.75rem',
                                            }}
                                        >
                                            {u.accion}
                                        </Typography>

                                        <IconButton
                                            size="small"
                                            onClick={() =>
                                                void eliminarUsuario(
                                                    u.id
                                                )
                                            }
                                            sx={{
                                                color:
                                                    '#d32f2f',

                                                p: 0.4,
                                            }}
                                        >
                                            <DeleteIcon
                                                sx={{
                                                    fontSize:
                                                        17,
                                                }}
                                            />
                                        </IconButton>
                                    </Box>
                                </Box>
                            ))}

                            {/* SIN USUARIOS */}

                            {usuarios.length ===
                                0 && (
                                <Typography
                                    sx={{
                                        p: 1.8,

                                        color: '#999',

                                        fontSize:
                                            '0.78rem',

                                        textAlign:
                                            'center',
                                    }}
                                >
                                    No hay usuarios
                                    registrados.
                                </Typography>
                            )}
                        </Box>
                    </Box>
                </Box>
            </Card>
        </Box>
    );
}
