import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ProductList from './components/ProductList';
import CategoryList from './components/CategoryList';
import SupplierList from './components/SupplierList';
import UnitList from './components/UnitList';
import ClientList from './components/ClientList';
import ImportSales from './components/ImportSales';
import SalesList from './components/SalesList';
import SalesSummaryPage from './components/SalesSummary';
import ReportSelector from './components/ReportSelector';
import Ajustes from './components/Ajustes';
import UserAccess from './components/UserAccess';
import PersonalList from './components/PersonalList';
import SedesYAlmacenesList from './components/SedesYAlmacenesList';
import OperacionesStock from './components/OperacionesStock';
import HistorialKardex from './components/HistorialKardex';
import ReporteInventario from './components/ReporteInventario';
import AlertList from './components/AlertList';
import PrivateRoute from './components/PrivateRoute';
import { authService } from './services/auth.service';
import './App.css';

function App() {
  return (
    <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              authService.estaAutenticado() ? (
                <Navigate to="/" replace />
              ) : (
                <Login />
              )
            }
          />
          <Route
            path="/"
            element={
              <PrivateRoute requiredPermission="dashboard">
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/productos"
            element={
              <PrivateRoute requiredPermission="catalogoProductos">
                <Layout>
                  <ProductList />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/categorias"
            element={
              <PrivateRoute requiredPermission="categorias">
                <Layout>
                  <CategoryList />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/proveedores"
            element={
              <PrivateRoute requiredPermission="proveedores">
                <Layout>
                  <SupplierList />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/clientes"
            element={
              <PrivateRoute requiredPermission="clientes">
                <Layout>
                  <ClientList />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/unidades"
            element={
              <PrivateRoute requiredPermission="unidades">
                <Layout>
                  <UnitList />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/importar"
            element={
              <PrivateRoute>
                <Layout>
                  <ImportSales />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/ventas"
            element={
              <PrivateRoute>
                <Layout>
                  <SalesList />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/ventas/resumen"
            element={
              <PrivateRoute>
                <Layout>
                  <SalesSummaryPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/reportes"
            element={
              <PrivateRoute allowedRoles={['gerente']}>
                <Layout>
                  <ReportSelector />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/personal"
            element={
              <PrivateRoute requiredPermission="personal">
                <Layout>
                  <PersonalList />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <PrivateRoute requiredPermission="usuariosAccesos">
                <Layout>
                  <UserAccess />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/sedes-almacenes"
            element={
              <PrivateRoute requiredPermission="sedesAlmacenes">
                <Layout>
                  <SedesYAlmacenesList />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/operaciones-stock"
            element={
              <PrivateRoute requiredPermission="operacionesStock">
                <Layout>
                  <OperacionesStock />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/historial-kardex"
            element={
              <PrivateRoute requiredPermission="historialKardex">
                <Layout>
                  <HistorialKardex />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/reporte-inventario"
            element={
              <PrivateRoute requiredPermission="reporteInventario">
                <Layout>
                  <ReporteInventario />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/alertas-stock"
            element={
              <PrivateRoute requiredPermission="alertasStock">
                <Layout>
                  <AlertList />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/ajustes"
            element={
              <PrivateRoute requiredPermission="ajustes">
                <Layout>
                  <Ajustes />
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
  );
}

export default App;
