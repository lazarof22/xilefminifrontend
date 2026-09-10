import { Box, Button, Typography } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

export default function NomencladoresPage() {
    return (
        <Box>
            <Box
                sx={{
                    width: '100%',
                    height: 60,
                    background:
                        "linear-gradient(135deg, rgba(0,114,255,0.9), rgba(142,45,226,0.9)), url('/images/login-bg.jpg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    alignContent: 'center',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 2,
                }}>
                <Typography variant="h5" sx={{ ml: 2, color: 'white' }}>
                    Nomencladores
                </Typography>
                <Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        sx={{
                            ml: 1,
                            background: "linear-gradient(135deg, rgb(0, 174, 255), rgba(196, 45, 226, 0.9))",
                            color: "#fff",
                            textTransform: "none",
                            fontWeight: 600,
                            boxShadow: "none",
                            "&:hover": {
                                background: "linear-gradient(135deg, rgb(0, 174, 255), rgb(196, 45, 226))",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                            }
                        }}
                    >
                        Nueva Nomenclador
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<PictureAsPdfIcon sx={{ fontSize: "medium" }} />}
                        sx={{
                            ml: 1,
                            background: "linear-gradient(135deg, rgba(255,0,0,0.9), rgba(196, 45, 226, 0.9))",
                            color: "#fff",
                            textTransform: "none",
                            fontWeight: 600,
                            boxShadow: "none",
                            "&:hover": {
                                background: "linear-gradient(135deg, rgba(255,0,0,1), rgb(196, 45, 226))",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                            }
                        }}
                    >
                        Exportar PDF
                    </Button>
                </Box>
            </Box>
        </Box>
    );
}