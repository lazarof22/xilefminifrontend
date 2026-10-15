// src/App.tsx
import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from './pages/auth/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/modulosPrincipales/Dashboard';
import Inventario from './pages/modulosPrincipales/Inventario';
import Ventas from './pages/modulosPrincipales/Ventas';
import Tasa from './pages/modulosPrincipales/Tasa';
import Compras from './pages/modulosPrincipales/Compras';
import PuntoVenta from './pages/modulosPrincipales/PuntoVenta';
import NomencladoresPage from "./pages/configuracion/Nomencladores";
import ConfiguracionPage from './pages/configuracion/Configuracion';
import ClientesPage from './pages/clientesProveedores/Clientes';
import LicenciaPage from './pages/configuracion/Licencia';
import { RutaModulo, RutaPrivada } from './components/RutaProtegida';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route element={<RutaPrivada />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<RutaModulo modulo="dashboard"><Dashboard /></RutaModulo>} />
            <Route path="/inventario" element={<RutaModulo modulo="inventario"><Inventario /></RutaModulo>} />
            <Route path="/ventas" element={<RutaModulo modulo="ventas"><Ventas /></RutaModulo>} />
            <Route path="/compras" element={<RutaModulo modulo="compras"><Compras /></RutaModulo>} />
            <Route path="/tasas" element={<RutaModulo modulo="tasas"><Tasa /></RutaModulo>} />
            <Route path="/punto_venta" element={<RutaModulo modulo="punto_venta"><PuntoVenta /></RutaModulo>} />
            <Route path="/clientes" element={<RutaModulo modulo="clientes"><ClientesPage /></RutaModulo>} />
            <Route path="/nomencladores" element={<RutaModulo modulo="nomencladores"><NomencladoresPage /></RutaModulo>} />
            <Route path="/configuracion" element={<RutaModulo modulo="configuracion"><ConfiguracionPage /></RutaModulo>} />
            <Route path="/licencia" element={<RutaModulo modulo="licencia"><LicenciaPage /></RutaModulo>} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;