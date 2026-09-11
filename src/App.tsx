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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/compras" element={<Compras />} />
          <Route path="/tasas" element={<Tasa />} />
          <Route path="/punto_venta" element={<PuntoVenta />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/nomencladores" element={<NomencladoresPage />} />
          <Route path="/configuracion" element={<ConfiguracionPage />} />
          <Route path="/licencia" element={<LicenciaPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;