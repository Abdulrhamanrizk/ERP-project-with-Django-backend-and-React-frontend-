import { useAuth } from '../store/AuthContext'
import ManagerDashboard from './dashboards/ManagerDashboard'
import AccountantDashboard from './dashboards/AccountantDashboard'
import CashierDashboard from './dashboards/CashierDashboard'
import WarehouseDashboard from './dashboards/WarehouseDashboard'
import DefaultDashboard from './dashboards/DefaultDashboard'

export default function Dashboard() {
  const { user } = useAuth()
  const role = user?.role || ''
  const isManager = role === 'manager' || !!user?.is_superuser

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>لوحة التحكم</h1>
          <p className="dashboard-welcome">مرحباً، {user?.first_name || user?.username}</p>
        </div>
      </div>
      {isManager && <ManagerDashboard />}
      {!isManager && role === 'accountant' && <AccountantDashboard />}
      {!isManager && role === 'cashier' && <CashierDashboard />}
      {!isManager && role === 'warehouse' && <WarehouseDashboard />}
      {!isManager && (!role || role === '') && <DefaultDashboard />}
    </div>
  )
}
