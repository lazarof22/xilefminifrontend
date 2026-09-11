// src/components/DashboardLayout.tsx
import { useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, IconButton, Box, useTheme
} from '@mui/material';

import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import SettingsIcon from '@mui/icons-material/Settings';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import Groups2Icon from '@mui/icons-material/Groups2';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import AccountMenu from './AccountMenuButton';
import BallotIcon from '@mui/icons-material/Ballot';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import React from 'react';

const drawerWidth = 280;
const collapsedWidth = 72;

// ═══════════════════════════════════════════════════════════════
// ESTRUCTURA DE NAVEGACIÓN CON GRUPOS
// ═══════════════════════════════════════════════════════════════

interface NavItem {
  text: string;
  icon: React.ReactNode;
  path: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
      { text: 'Inventario', icon: <InventoryIcon />, path: '/inventario' },
      { text: 'Ventas', icon: <MonetizationOnIcon />, path: '/ventas' },
      { text: 'Compras', icon: <ShoppingCartIcon />, path: '/compras' },
      { text: 'Tasas', icon: <CurrencyExchangeIcon />, path: '/tasas' },
      { text: 'Punto de Venta', icon: <PointOfSaleIcon />, path: '/punto_venta' },
    ],
  },
  {
    label: 'Relaciones',
    items: [
      { text: 'Clientes', icon: <Groups2Icon />, path: '/clientes' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { text: 'Nomencladores', icon: <BallotIcon />, path: '/nomencladores' },
      { text: 'Configuración', icon: <SettingsIcon />, path: '/configuracion' },
      { text: 'Licencia', icon: <VpnKeyIcon />, path: '/licencia' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════

export default function DashboardLayout() {
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const drawerW = collapsed && !hovered ? collapsedWidth : drawerWidth;
  const isExpanded = !collapsed || hovered;

  const toggleGroup = (label: string) => {
    if (!isExpanded) return;
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const handleDrawerLeave = () => {
    setHovered(false);
    if (collapsed) {
      setOpenGroups(new Set());
    }
  };

  // ═══ RENDER: DRAWER COLAPSADO (solo iconos, estilo Trademi) ═══
  const renderCollapsed = () => (
    <List sx={{ pt: 2, px: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      {navGroups.map((group) => (
        <React.Fragment key={group.label}>
          {group.items.map((item) => {
            const active = pathname === item.path;
            return (
              <ListItemButton
                key={item.path}
                onClick={() => navigate(item.path)}
                sx={{
                  minWidth: 0,
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  justifyContent: 'center',
                  alignItems: 'center',
                  p: 0,
                  mb: 0.5,
                  position: 'relative',
                  color: active ? theme.palette.primary.main : 'rgba(255,255,255,0.35)',
                  backgroundColor: active ? 'rgba(0, 229, 160, 0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 229, 160, 0.08)',
                    color: theme.palette.primary.main,
                  },
                  // Indicador activo (punto o barra lateral)
                  '&::before': active ? {
                    content: '""',
                    position: 'absolute',
                    left: -10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 4,
                    height: 20,
                    borderRadius: '0 4px 4px 0',
                    backgroundColor: theme.palette.primary.main,
                  } : {},
                }}
              >
                <ListItemIcon
                  sx={{
                    color: 'inherit',
                    minWidth: 0,
                    justifyContent: 'center',
                    '& svg': { fontSize: '1.4rem' },
                  }}
                >
                  {item.icon}
                </ListItemIcon>
              </ListItemButton>
            );
          })}
        </React.Fragment>
      ))}
    </List>
  );

  // ═══ RENDER: DRAWER EXPANDIDO (estilo InsightX con grupos) ═══
  const renderExpanded = () => (
    <List sx={{ pt: 1, px: 2 }}>
      {navGroups.map((group) => {
        const isOpen = openGroups.has(group.label);
        const hasActiveItem = group.items.some(item => pathname === item.path);

        return (
          <Box key={group.label} sx={{ mb: 1.5 }}>
            {/* Label del grupo */}
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                px: 1.5,
                py: 0.8,
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'rgba(255,255,255,0.25)',
                userSelect: 'none',
              }}
            >
              {group.label}
            </Typography>

            {/* Items del grupo */}
            {group.items.map((item) => {
              const active = pathname === item.path;

              return (
                <ListItemButton
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  sx={{
                    minHeight: 42,
                    borderRadius: 2,
                    px: 1.5,
                    py: 0.8,
                    mb: 0.3,
                    gap: 1.5,
                    // Estilo "pill" activo: fondo claro con texto oscuro (como InsightX)
                    backgroundColor: active
                      ? 'rgba(255, 255, 255, 0.92)'
                      : 'transparent',
                    color: active
                      ? '#0a0f0d'
                      : 'rgba(255,255,255,0.55)',
                    '&:hover': {
                      backgroundColor: active
                        ? 'rgba(255, 255, 255, 0.92)'
                        : 'rgba(255,255,255,0.06)',
                      color: active ? '#0a0f0d' : 'rgba(255,255,255,0.85)',
                    },
                    transition: 'all 0.15s ease',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: 'inherit',
                      minWidth: 0,
                      justifyContent: 'center',
                      '& svg': { fontSize: '1.15rem' },
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    sx={{
                      '& .MuiListItemText-primary': {
                        fontSize: '0.82rem',
                        fontWeight: active ? 700 : 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        letterSpacing: '0.01em',
                      },
                    }}
                  />
                  {/* Indicador activo: punto verde */}
                  {active && (
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: '#00e5a0',
                        flexShrink: 0,
                        ml: 0.5,
                      }}
                    />
                  )}
                </ListItemButton>
              );
            })}
          </Box>
        );
      })}
    </List>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* ═══ APPBAR ═══ */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          background: 'linear-gradient(100deg, #0a0f0d 0%, #151a19 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <Typography
            variant="h6"
            sx={{
              ml: 8,
              flexGrow: 1,
              fontWeight: 800,
              background: 'linear-gradient(135deg, #00e5a0 0%, #5cffc8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
            }}
          >
            🚀 SISTEMA XILEF
          </Typography>
          <Typography
            sx={{
              m: 2,
              color: theme.palette.text.secondary,
              fontSize: '0.85rem',
              fontWeight: 500,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            SISTEMA INTEGRAL ERP
          </Typography>
          <IconButton
            color="inherit"
            onClick={() => setCollapsed(!collapsed)}
            sx={{
              mr: 2,
              color: theme.palette.text.secondary,
              '&:hover': {
                color: theme.palette.primary.main,
                backgroundColor: 'rgba(0, 229, 160, 0.08)',
              },
            }}
          >
            <MenuIcon />
          </IconButton>
          <AccountMenu />
        </Toolbar>
      </AppBar>

      {/* ═══ DRAWER DESKTOP ═══ */}
      <Drawer
        variant="permanent"
        open
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={handleDrawerLeave}
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            width: drawerW,
            overflowX: 'hidden',
            overflowY: 'auto',
            transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            whiteSpace: 'nowrap',
            backgroundColor: '#0d1210',
            color: theme.palette.text.primary,
            borderRight: '1px solid rgba(255, 255, 255, 0.04)',
            boxShadow: '4px 0 24px rgba(0, 0, 0, 0.3)',
            // Scrollbar sutil
            '&::-webkit-scrollbar': {
              width: 4,
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 2,
            },
          },
        }}
      >
        {/* LOGO */}
        <Box sx={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isExpanded ? 'flex-start' : 'center',
          px: isExpanded ? 3 : 0,
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          background: 'linear-gradient(135deg, rgba(0, 229, 160, 0.05), transparent)',
          flexShrink: 0,
        }}>
          <Typography sx={{
            fontSize: isExpanded ? '1.15rem' : '1.5rem',
            fontWeight: 800,
            background: isExpanded
              ? 'linear-gradient(135deg, #00e5a0 0%, #5cffc8 100%)'
              : 'none',
            WebkitBackgroundClip: isExpanded ? 'text' : 'none',
            WebkitTextFillColor: isExpanded ? 'transparent' : 'inherit',
            color: isExpanded ? 'inherit' : theme.palette.primary.main,
            letterSpacing: '-0.01em',
          }}>
            {isExpanded ? '🚀 XILEF' : '🚀'}
          </Typography>
        </Box>

        {/* Contenido del drawer según estado */}
        {isExpanded ? renderExpanded() : renderCollapsed()}
      </Drawer>

      {/* ═══ DRAWER MÓVIL ═══ */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            backgroundColor: '#0d1210',
            color: theme.palette.text.primary,
            borderRight: '1px solid rgba(255, 255, 255, 0.04)',
          },
        }}
      >
        <Box sx={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          px: 3,
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
        }}>
          <Typography sx={{
            fontSize: '1.15rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #00e5a0 0%, #5cffc8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.01em',
          }}>
            🚀 XILEF
          </Typography>
        </Box>
        {renderExpanded()}
      </Drawer>

      {/* ═══ CONTENIDO ═══ */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pl: 9,
          minHeight: '100vh',
          minWidth: 0,
          background: theme.palette.background.default,
          transition: 'padding-left 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}