// src/pages/LoginPage.tsx
import * as React from "react";
import {
    Alert,
    Box,
    Card,
    TextField,
    Button,
    Typography,
    Checkbox,
    FormControlLabel,
    IconButton,
    InputAdornment,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

import { authApi } from "../../service/authApi";
import { AuthApiError } from "../../types/auth.types";
import { guardarToken } from "../../utils/auth";

// ═══ Mensajes ═══

function mensajeLogin(e: unknown): string {
    if (e instanceof AuthApiError) {
        if (e.status === 401) return "Correo o contraseña incorrectos";
        if (e.status === 0) return "No se pudo conectar con el servidor";
    }
    return "No se pudo iniciar sesión. Inténtalo de nuevo";
}

export default function LoginPage() {
    const [showPassword, setShowPassword] = React.useState(false);
    const [correo, setCorreo] = React.useState("");
    const [contrasena, setContrasena] = React.useState("");
    const [cargando, setCargando] = React.useState(false);
    const [error, setError] = React.useState("");
    const navigate = useNavigate();

    // ═══ Envío ═══

    const iniciarSesion = async (evento: React.FormEvent<HTMLFormElement>) => {
        evento.preventDefault();
        if (cargando) return;
        if (!correo.trim() || !contrasena) {
            setError("Introduce tu correo y tu contraseña");
            return;
        }
        setCargando(true);
        setError("");
        try {
            const { access_token } = await authApi.login({
                correo_empleado: correo.trim(),
                contraseña: contrasena,
            });
            guardarToken(access_token);
            navigate("/dashboard");
        } catch (e) {
            setError(mensajeLogin(e));
            setCargando(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                p: 2,
            }}
        >
            <Card
                sx={{
                    width: "100%",
                    maxWidth: 1000,
                    height: 550,
                    display: "flex",
                    borderRadius: 3,
                    overflow: "hidden",
                    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.3)",
                    border: "1px solid rgba(255, 255, 255, 0.04)",
                    backgroundColor: "#151a19",
                }}
            >
                {/* 🔹 PANEL IZQUIERDO (FORM) */}
                <Box
                    component="form"
                    noValidate
                    onSubmit={(evento: React.FormEvent<HTMLFormElement>) => void iniciarSesion(evento)}
                    sx={{
                        width: "45%",
                        p: 6,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        backgroundColor: "#151a19",
                    }}
                >
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 700,
                            mb: 1,
                            color: "#f0f0f0",
                            letterSpacing: "-0.02em",
                        }}
                    >
                        Bienvenido
                    </Typography>

                    <Typography
                        variant="body2"
                        sx={{
                            mb: 4,
                            color: "#9ca3af",
                            letterSpacing: "0.01em",
                        }}
                    >
                        Accede al sistema ERP
                    </Typography>

                    <TextField
                        label="Usuario"
                        name="correo_empleado"
                        autoComplete="username"
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                        disabled={cargando}
                        fullWidth
                        margin="normal"
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                borderRadius: 2,
                                backgroundColor: "rgba(255, 255, 255, 0.03)",
                                "& fieldset": {
                                    borderColor: "rgba(255, 255, 255, 0.08)",
                                },
                                "&:hover fieldset": {
                                    borderColor: "rgba(0, 229, 160, 0.3)",
                                },
                                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                    borderColor: "#00e5a0",
                                    borderWidth: 2,
                                    boxShadow: "0 0 0 3px rgba(0, 229, 160, 0.1)",
                                },
                            },
                            "& .MuiInputLabel-root": {
                                color: "#9ca3af",
                                "&.Mui-focused": {
                                    color: "#00e5a0",
                                },
                            },
                            "& .MuiInputBase-input": {
                                color: "#f0f0f0",
                            },
                        }}
                    />

                    <TextField
                        label="Contraseña"
                        type={showPassword ? "text" : "password"}
                        name="contraseña"
                        autoComplete="current-password"
                        value={contrasena}
                        onChange={(e) => setContrasena(e.target.value)}
                        disabled={cargando}
                        fullWidth
                        margin="normal"
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                borderRadius: 2,
                                backgroundColor: "rgba(255, 255, 255, 0.03)",
                                "& fieldset": {
                                    borderColor: "rgba(255, 255, 255, 0.08)",
                                },
                                "&:hover fieldset": {
                                    borderColor: "rgba(0, 229, 160, 0.3)",
                                },
                                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                    borderColor: "#00e5a0",
                                    borderWidth: 2,
                                    boxShadow: "0 0 0 3px rgba(0, 229, 160, 0.1)",
                                },
                            },
                            "& .MuiInputLabel-root": {
                                color: "#9ca3af",
                                "&.Mui-focused": {
                                    color: "#00e5a0",
                                },
                            },
                            "& .MuiInputBase-input": {
                                color: "#f0f0f0",
                            },
                        }}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                            sx={{
                                                color: "#9ca3af",
                                                transition: "all 0.2s ease",
                                                "&:hover": {
                                                    color: "#00e5a0",
                                                    backgroundColor: "rgba(0, 229, 160, 0.08)",
                                                },
                                            }}
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />

                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mt: 1,
                        }}
                    >
                        <FormControlLabel
                            control={
                                <Checkbox
                                    sx={{
                                        color: "#9ca3af",
                                        "&.Mui-checked": {
                                            color: "#00e5a0",
                                        },
                                    }}
                                />
                            }
                            label={
                                <Typography variant="body2" sx={{ color: "#9ca3af" }}>
                                    Recordarme
                                </Typography>
                            }
                        />
                        <Typography
                            variant="body2"
                            sx={{
                                color: "#00e5a0",
                                cursor: "pointer",
                                "&:hover": {
                                    color: "#5cffc8",
                                },
                            }}
                        >
                            ¿Olvidaste tu contraseña?
                        </Typography>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mt: 3 }}>
                            {error}
                        </Alert>
                    )}

                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        fullWidth
                        disabled={cargando}
                        sx={{
                            mt: 4,
                            borderRadius: 2,
                            py: 1.5,
                            background: "linear-gradient(135deg, #00e5a0 0%, #00c896 100%)",
                            color: "#0a0f0d",
                            fontWeight: 600,
                            letterSpacing: "0.01em",
                            transition: "all 0.2s ease",
                            "&:hover": {
                                background: "linear-gradient(135deg, #5cffc8 0%, #00e5a0 100%)",
                                transform: "translateY(-1px)",
                                boxShadow: "0 4px 20px rgba(0, 229, 160, 0.25)",
                            },
                        }}
                    >
                        {cargando ? "Iniciando sesión…" : "Iniciar sesión"}
                    </Button>
                </Box>

                {/* 🔹 PANEL DERECHO (IMAGEN / GRADIENTE) */}
                <Box
                    sx={{
                        width: "55%",
                        position: "relative",
                        color: "#fff",
                        display: { xs: "none", md: "flex" },
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        p: 6,
                        background:
                            "linear-gradient(135deg, rgba(5, 138, 98, 0.85), rgba(3, 230, 173, 0.85)), url('/images/fondo/Code_Generated_Image.jpg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backdropFilter: "blur(12px)",
                    }}
                >
                    <Box>
                        <Typography
                            variant="overline"
                            sx={{
                                letterSpacing: 3,
                                color: "rgba(255, 255, 255, 0.7)",
                            }}
                        >
                            BIENVENIDO A
                        </Typography>

                        <Typography
                            variant="h3"
                            sx={{
                                fontWeight: 700,
                                mt: 2,
                                color: "#fff",
                                letterSpacing: "-0.02em",
                            }}
                        >
                            Sistema XILEF
                        </Typography>

                        <Typography
                            sx={{
                                mt: 2,
                                color: "rgba(255, 255, 255, 0.85)",
                                letterSpacing: "0.01em",
                            }}
                        >
                            Plataforma de gestión empresarial
                        </Typography>
                    </Box>
                </Box>
            </Card>
        </Box>
    );
}