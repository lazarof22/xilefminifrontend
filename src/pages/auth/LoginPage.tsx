// src/pages/LoginPage.tsx
import * as React from "react";
import {
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
import CircularProgress from "@mui/material/CircularProgress";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authContext";
import { useNotify } from "../../components/notificaciones/useNotify";
import { rutaInicio } from "../../utils/auth";
import { getErrorMessage } from "../../utils/errorMessage";

export default function LoginPage() {
    const [showPassword, setShowPassword] = React.useState(false);
    const [nombre, setNombre] = React.useState("");
    const [contrasena, setContrasena] = React.useState("");
    const [recordar, setRecordar] = React.useState(true);
    const [enviando, setEnviando] = React.useState(false);
    const navigate = useNavigate();
    const ubicacion = useLocation();
    const notify = useNotify();
    const { usuario, cargando, login, logout } = useAuth();

    // Ruta a la que iba antes de que se le pidiera iniciar sesión.
    const destinoPrevio = (ubicacion.state as { desde?: string } | null)?.desde;

    const destinoPara = (modulos: readonly string[]): string | null => {
        if (destinoPrevio && modulos.includes(destinoPrevio.replace(/^\//, "").split("/")[0])) {
            return destinoPrevio;
        }
        return rutaInicio(modulos);
    };

    // Sesión ya iniciada (p. ej. token guardado): no se muestra el login.
    if (!cargando && usuario) {
        const destino = destinoPara(usuario.modulos);
        if (destino) return <Navigate to={destino} replace />;
    }

    const iniciarSesion = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        if (enviando) return;
        if (!nombre.trim() || !contrasena) {
            notify.warning("Ingrese su usuario y contraseña.");
            return;
        }
        setEnviando(true);
        try {
            const sesion = await login({ nombre: nombre.trim(), contraseña: contrasena }, recordar);
            const destino = destinoPara(sesion.modulos);
            if (!destino) {
                logout();
                notify.warning("Su usuario no tiene módulos asignados. Contacte al administrador.");
                return;
            }
            navigate(destino, { replace: true });
        } catch (error: unknown) {
            notify.error(getErrorMessage(error, "No se pudo iniciar sesión"));
        } finally {
            setEnviando(false);
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

                    <Box component="form" onSubmit={(e) => void iniciarSesion(e)} noValidate sx={{ display: "flex", flexDirection: "column" }}>
                    <TextField
                        label="Usuario"
                        fullWidth
                        margin="normal"
                        autoComplete="username"
                        autoFocus
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        disabled={enviando}
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
                        fullWidth
                        margin="normal"
                        autoComplete="current-password"
                        value={contrasena}
                        onChange={(e) => setContrasena(e.target.value)}
                        disabled={enviando}
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
                                    checked={recordar}
                                    onChange={(e) => setRecordar(e.target.checked)}
                                    disabled={enviando}
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
                            onClick={() => notify.info("Para restablecer su contraseña, solicite al administrador que la cambie en Configuración > Usuarios.")}
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

                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        fullWidth
                        disabled={enviando}
                        startIcon={enviando ? <CircularProgress size={18} color="inherit" /> : undefined}
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
                        {enviando ? "Verificando…" : "Iniciar sesión"}
                    </Button>
                    </Box>
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