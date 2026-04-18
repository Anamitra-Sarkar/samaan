import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, type ReactNode } from 'react'
import { useAuthStore } from './store/authStore'

// Layout
import Layout from './components/layout/Layout'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'

import BeneficiaryUpload from './pages/loan/BeneficiaryUpload'
import OfficerReview from './pages/loan/OfficerReview'
import LoanDataEntry from './pages/loan/LoanDataEntry'

import CreditScoreView from './pages/credit/CreditScoreView'
import ConsumptionEntry from './pages/credit/ConsumptionEntry'
import DirectLending from './pages/credit/DirectLending'

import VillageMap from './pages/village/VillageMap'
import GapReport from './pages/village/GapReport'
import VillageDetail from './pages/village/VillageDetail'

import AgencyDirectory from './pages/agency/AgencyDirectory'
import FundFlow from './pages/agency/FundFlow'
import AgencyMapping from './pages/agency/AgencyMapping'

import DBTChecker from './pages/dbt/DBTChecker'
import SocialPension from './pages/dbt/SocialPension'
import DBTSchemes from './pages/dbt/DBTSchemes'
import DBTCaseDetail from './pages/dbt/DBTCaseDetail'
import GrievancePortal from './pages/dbt/GrievancePortal'
import VictimRegistry from './pages/dbt/VictimRegistry'
import DisbursementTracker from './pages/dbt/DisbursementTracker'

function ProtectedRoute({ children, allowedRoles }: { children: ReactNode, allowedRoles?: string[] }) {
  const { token, user, isHydrated } = useAuthStore()

  if (!isHydrated) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Loading session...</div>
  }
  
  if (!token) {
    return <Navigate to="/login" replace />
  }
  
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}

function App() {
  const { initializeAuth } = useAuthStore()
  
  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="loan/upload" element={<ProtectedRoute allowedRoles={['beneficiary', 'admin']}><BeneficiaryUpload /></ProtectedRoute>} />
          <Route path="loan/review" element={<ProtectedRoute allowedRoles={['state_officer', 'admin']}><OfficerReview /></ProtectedRoute>} />
          <Route path="loan/data-entry" element={<ProtectedRoute allowedRoles={['state_officer', 'admin']}><LoanDataEntry /></ProtectedRoute>} />
          <Route path="credit/scores" element={<ProtectedRoute allowedRoles={['bank_officer', 'state_officer', 'admin']}><CreditScoreView /></ProtectedRoute>} />
          <Route path="credit/consumption" element={<ProtectedRoute allowedRoles={['beneficiary', 'admin']}><ConsumptionEntry /></ProtectedRoute>} />
          <Route path="credit/lending" element={<ProtectedRoute allowedRoles={['bank_officer', 'admin']}><DirectLending /></ProtectedRoute>} />
          <Route path="village/map" element={<ProtectedRoute allowedRoles={['state_officer', 'bank_officer', 'admin']}><VillageMap /></ProtectedRoute>} />
          <Route path="village/list" element={<ProtectedRoute allowedRoles={['state_officer', 'bank_officer', 'admin']}><GapReport /></ProtectedRoute>} />
          <Route path="village/:id" element={<ProtectedRoute allowedRoles={['state_officer', 'bank_officer', 'admin']}><VillageDetail /></ProtectedRoute>} />
          <Route path="agency/directory" element={<ProtectedRoute allowedRoles={['state_officer', 'bank_officer', 'admin']}><AgencyDirectory /></ProtectedRoute>} />
          <Route path="agency/fund-flow" element={<ProtectedRoute allowedRoles={['state_officer', 'bank_officer', 'admin']}><FundFlow /></ProtectedRoute>} />
          <Route path="agency/accountability" element={<ProtectedRoute allowedRoles={['state_officer', 'bank_officer', 'admin']}><AgencyMapping /></ProtectedRoute>} />
          <Route path="dbt/victims" element={<ProtectedRoute allowedRoles={['state_officer', 'admin']}><VictimRegistry /></ProtectedRoute>} />
          <Route path="dbt/disbursements" element={<ProtectedRoute allowedRoles={['state_officer', 'bank_officer', 'admin']}><DisbursementTracker /></ProtectedRoute>} />
          <Route path="dbt/checker" element={<ProtectedRoute allowedRoles={['state_officer', 'admin']}><DBTChecker /></ProtectedRoute>} />
          <Route path="dbt/register" element={<ProtectedRoute allowedRoles={['state_officer', 'admin']}><SocialPension /></ProtectedRoute>} />
          <Route path="dbt/cases" element={<ProtectedRoute allowedRoles={['state_officer', 'admin']}><DBTSchemes /></ProtectedRoute>} />
          <Route path="dbt/case/:id" element={<ProtectedRoute allowedRoles={['state_officer', 'admin']}><DBTCaseDetail /></ProtectedRoute>} />
          <Route path="dbt/grievance" element={<ProtectedRoute allowedRoles={['beneficiary', 'state_officer', 'admin']}><GrievancePortal /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
        <Route path="/loan/beneficiary-upload" element={<Navigate to="/loan/upload" replace />} />
        <Route path="/loan/officer-review" element={<Navigate to="/loan/review" replace />} />
        <Route path="/credit/credit-score" element={<Navigate to="/credit/scores" replace />} />
        <Route path="/credit/consumption-entry" element={<Navigate to="/credit/consumption" replace />} />
        <Route path="/credit/direct-lending" element={<Navigate to="/credit/lending" replace />} />
        <Route path="/village/gap-report" element={<Navigate to="/village/list" replace />} />
        <Route path="/village/detail/:id" element={<Navigate to="/village/map" replace />} />
        <Route path="/agency/mapping" element={<Navigate to="/agency/accountability" replace />} />
        <Route path="/dbt/social-pension" element={<Navigate to="/dbt/register" replace />} />
        <Route path="/dbt/schemes" element={<Navigate to="/dbt/cases" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
