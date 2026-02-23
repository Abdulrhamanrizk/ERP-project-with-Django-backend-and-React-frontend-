import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './store/AuthContext'
import { BranchProvider } from './store/BranchContext'
import { ToastProvider } from './store/ToastContext'
import { ShortcutsProvider } from './store/ShortcutsContext'
import Login from './pages/Login'
import Layout from './layouts/Layout'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Categories from './pages/Categories'
import Parties from './pages/Parties'
import Sales from './pages/Sales'
import Purchases from './pages/Purchases'
import Treasury from './pages/Treasury'
import Maintenance from './pages/Maintenance'
import Reports from './pages/Reports'
import Warehouse from './pages/Warehouse'
import Advances from './pages/Advances'
import JournalEntries from './pages/JournalEntries'
import Activity from './pages/Activity'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return (
    <BranchProvider>
      <ToastProvider>
        <ShortcutsProvider>
          <Layout>{children}</Layout>
        </ShortcutsProvider>
      </ToastProvider>
    </BranchProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/products" element={<PrivateRoute><Products /></PrivateRoute>} />
          <Route path="/categories" element={<PrivateRoute><Categories /></PrivateRoute>} />
          <Route path="/parties" element={<PrivateRoute><Parties /></PrivateRoute>} />
          <Route path="/sales" element={<PrivateRoute><Sales /></PrivateRoute>} />
          <Route path="/purchases" element={<PrivateRoute><Purchases /></PrivateRoute>} />
          <Route path="/treasury" element={<PrivateRoute><Treasury /></PrivateRoute>} />
          <Route path="/advances" element={<PrivateRoute><Advances /></PrivateRoute>} />
          <Route path="/journal" element={<PrivateRoute><JournalEntries /></PrivateRoute>} />
          <Route path="/maintenance" element={<PrivateRoute><Maintenance /></PrivateRoute>} />
          <Route path="/warehouse" element={<PrivateRoute><Warehouse /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
          <Route path="/activity" element={<PrivateRoute><Activity /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
