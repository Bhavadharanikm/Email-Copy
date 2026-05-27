import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import NewCampaign from './pages/NewCampaign'
import ReviewCampaign from './pages/ReviewCampaign'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="campaign/new" element={<NewCampaign />} />
        <Route path="campaign/:id/review" element={<ReviewCampaign />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
