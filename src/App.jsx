import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import NewCampaign from './pages/NewCampaign'
import ReviewCampaign from './pages/ReviewCampaign'
import ContentCalendar from './pages/ContentCalendar'
import Login from './pages/Login'
import { useAuth } from './context/AuthContext'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="campaign/new" element={<NewCampaign />} />
        <Route path="campaign/:id/review" element={<ReviewCampaign />} />
        <Route path="calendar" element={<ContentCalendar />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
