import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import NewCampaign from './pages/NewCampaign'
import ReviewCampaign from './pages/ReviewCampaign'
import ContentCalendar from './pages/ContentCalendar'
import WFClients      from './welcome-flow/pages/WFClients'
import WFClientDetail from './welcome-flow/pages/WFClientDetail'
import WFBrief        from './welcome-flow/pages/WFBrief'
import WFCopy         from './welcome-flow/pages/WFCopy'
import WFImages       from './welcome-flow/pages/WFImages'
import WFPreview      from './welcome-flow/pages/WFPreview'
import WFApprove      from './welcome-flow/pages/WFApprove'
import RBClients      from './repeat-booking/pages/RBClients'
import RBClientDetail from './repeat-booking/pages/RBClientDetail'
import RBBrief        from './repeat-booking/pages/RBBrief'
import RBCopy         from './repeat-booking/pages/RBCopy'
import RBImages       from './repeat-booking/pages/RBImages'
import RBPreview      from './repeat-booking/pages/RBPreview'
import RBApprove      from './repeat-booking/pages/RBApprove'
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
        <Route path="welcome-flow" element={<WFClients />} />
        <Route path="welcome-flow/:clientId" element={<WFClientDetail />} />
        <Route path="welcome-flow/:clientId/email/:emailId" element={<WFBrief />} />
        <Route path="welcome-flow/:clientId/email/:emailId/copy" element={<WFCopy />} />
        <Route path="welcome-flow/:clientId/email/:emailId/images" element={<WFImages />} />
        <Route path="welcome-flow/:clientId/email/:emailId/preview" element={<WFPreview />} />
        <Route path="welcome-flow/:clientId/email/:emailId/approve" element={<WFApprove />} />
        <Route path="repeat-booking" element={<RBClients />} />
        <Route path="repeat-booking/:clientId" element={<RBClientDetail />} />
        <Route path="repeat-booking/:clientId/email/:emailId" element={<RBBrief />} />
        <Route path="repeat-booking/:clientId/email/:emailId/copy" element={<RBCopy />} />
        <Route path="repeat-booking/:clientId/email/:emailId/images" element={<RBImages />} />
        <Route path="repeat-booking/:clientId/email/:emailId/preview" element={<RBPreview />} />
        <Route path="repeat-booking/:clientId/email/:emailId/approve" element={<RBApprove />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
