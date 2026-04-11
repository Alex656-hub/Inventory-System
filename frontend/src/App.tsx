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
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/productos"
            element={
              <PrivateRoute>
                <Layout>
                  <ProductList />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/categorias"
            element={
              <PrivateRoute>
                <Layout>
                  <CategoryList />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/proveedores"
            element={
              <PrivateRoute>
                <Layout>
                  <SupplierList />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/clientes"
            element={
              <PrivateRoute>
                <Layout>
                  <ClientList />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/unidades"
            element={
              <PrivateRoute>
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
              <PrivateRoute allowedRoles={['gerente']}>
                <Layout>
                  <PersonalList />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <PrivateRoute allowedRoles={['gerente']}>
                <Layout>
                  <UserAccess />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/ajustes"
            element={
              <PrivateRoute allowedRoles={['gerente']}>
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
