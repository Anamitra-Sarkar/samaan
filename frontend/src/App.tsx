import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'

// Layout
import Layout from './components/layout/Layout'

// Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

// Loan Module
import BeneficiaryUpload from './pages/loan/BeneficiaryUpload'
import OfficerReview from './pages/loan/OfficerReview'
import LoanDataEntry from './pages/loan/LoanDataEntry'

// Credit Module
import CreditScoreView from './pages/credit/CreditScoreView'
import ConsumptionEntry from './pages/credit/ConsumptionEntry'
import DirectLending from './pages/credit/DirectLending'

// Village Module
import VillageMap from './pages/village/VillageMap'
import GapReport from './pages/village/GapReport'
import VillageDetail from './pages/village/VillageDetail'

// Agency Module
import AgencyDirectory from './pages/agency/AgencyDirectory'
import FundFlow from './pages/agency/FundFlow'
import AgencyMapping from './pages/agency/AgencyMapping'

// DBT Module
import DBTChecker from './pages/dbt/DBTChecker'
import SocialPension from './pages/dbt/SocialPension'
import DBTSchemes from './pages/dbt/DBTSchemes'

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { token, user } = useAuthStore()
  
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
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* Loan Routes */}
          <Route path="loan/beneficiary-upload" element={
            <ProtectedRoute allowedRoles={['beneficiary', 'admin']}>
              <BeneficiaryUpload />
            </ProtectedRoute>
          } />
          <Route path="loan/officer-review" element={
            <ProtectedRoute allowedRoles={['state_officer', 'admin']}>
              <OfficerReview />
            </ProtectedRoute>
          } />
          <Route path="loan/data-entry" element={
            <ProtectedRoute allowedRoles={['state_officer', 'admin']}>
              <LoanDataEntry />
            </ProtectedRoute>
          } />
          
          {/* Credit Routes */}
          <Route path="credit/credit-score" element={<CreditScoreView />} />
          <Route path="credit/consumption-entry" element={
            <ProtectedRoute allowedRoles={['beneficiary', 'admin']}>
              <ConsumptionEntry />
            </ProtectedRoute>
          } />
          <Route path="credit/direct-lending" element={
            <ProtectedRoute allowedRoles={['bank_officer', 'admin']}>
              <DirectLending />
            </ProtectedRoute>
          } />
          
          {/* Village Routes */}
          <Route path="village/map" element={<VillageMap />} />
          <Route path="village/gap-report" element={<GapReport />} />
          <Route path="village/detail/:id" element={<VillageDetail />} />
          
          {/* Agency Routes */}
          <Route path="agency/directory" element={<AgencyDirectory />} />
          <Route path="agency/fund-flow" element={<FundFlow />} />
          <Route path="agency/mapping" element={<AgencyMapping />} />
          
          {/* DBT Routes */}
          <Route path="dbt/checker" element={<DBTChecker />} />
          <Route path="dbt/social-pension" element={<SocialPension />} />
          <Route path="dbt/schemes" element={<DBTSchemes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
