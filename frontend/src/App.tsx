import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import NavMenu from './components/NavMenu'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import CarOwnersPage from './pages/CarOwnersPage'
import CarsPage from './pages/CarsPage'
import VendorsPage from './pages/VendorsPage'
import DriversPage from './pages/DriversPage'
import MaintenancePage from './pages/MaintenancePage'
import CarDocsPage from './pages/CarDocsPage'
import PaymentsPage from './pages/PaymentsPage'
import ProfilePage from './pages/ProfilePage'
import './App.css'

function AppNav() {
  const user = useAuthStore((state) => state.user)
  return user ? <NavMenu /> : null
}

function App() {
  return (
    <BrowserRouter>
      <Header />
      <div className="app-body">
        <AppNav />
        <div className="app-main">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/car-owners"
              element={
                <ProtectedRoute>
                  <CarOwnersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cars"
              element={
                <ProtectedRoute>
                  <CarsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendors"
              element={
                <ProtectedRoute>
                  <VendorsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/drivers"
              element={
                <ProtectedRoute>
                  <DriversPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/maintenance"
              element={
                <ProtectedRoute>
                  <MaintenancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/car-docs"
              element={
                <ProtectedRoute>
                  <CarDocsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payments"
              element={
                <ProtectedRoute>
                  <PaymentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
