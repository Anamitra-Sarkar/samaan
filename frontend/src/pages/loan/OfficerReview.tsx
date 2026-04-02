import { useState, useEffect } from 'react'
import { client } from '../../api/client'
import { CheckCircle, XCircle, Eye, Loader2, AlertCircle, MapPin } from 'lucide-react'

export default function OfficerReview() {
  const [proofs, setProofs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewLoading, setReviewLoading] = useState<number | null>(null)
  const [selectedProof, setSelectedProof] = useState<any>(null)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchProofs()
  }, [])

  const fetchProofs = async () => {
    try {
      const response = await client.get('/loan/review-queue')
      setProofs(response.data)
    } catch (error) {
      console.error('Failed to fetch proofs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (proofId: number, decision: 'approve' | 'reject') => {
    setReviewLoading(proofId)
    try {
      await client.patch(`/loan/proof/${proofId}/review`, {
        decision,
        notes
      })
      await fetchProofs()
      setSelectedProof(null)
      setNotes('')
    } catch (error) {
      console.error('Review failed:', error)
    } finally {
      setReviewLoading(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-700'
      case 'REJECTED': return 'bg-red-100 text-red-700'
      case 'MANUAL_REVIEW': return 'bg-orange-100 text-orange-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#01696f]" />
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Proof Review Queue</h1>
        <p className="text-gray-500">Review and validate beneficiary loan utilization proofs</p>
      </div>

      {proofs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">All Caught Up!</h3>
          <p className="text-gray-500">No pending proofs in the review queue</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proof ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beneficiary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">AI Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {proofs.map((proof) => (
                <tr key={proof.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm">#{proof.id}</td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">Beneficiary #{proof.beneficiary_id}</p>
                    <p className="text-sm text-gray-500">Loan #{proof.loan_id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proof.ai_validation_status)}`}>
                      {proof.ai_validation_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            (proof.ai_confidence_score || 0) > 0.7 ? 'bg-green-500' :
                            (proof.ai_confidence_score || 0) > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${(proof.ai_confidence_score || 0) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm">{(proof.ai_confidence_score * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {proof.geolat && proof.geolng ? (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{proof.geolat.toFixed(4)}, {proof.geolng.toFixed(4)}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">No location</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedProof(proof)}
                      className="text-[#01696f] hover:text-[#015459] font-medium text-sm flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      Review
                    </button>
                  </td>
                </tr>