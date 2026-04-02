import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { client } from '../../api/client'
import { Upload as UploadIcon, MapPin, Camera, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function BeneficiaryUpload() {
  const [geolocation, setGeolocation] = useState<{lat: number; lng: number} | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loans, setLoans] = useState<any[]>([])

  const { register, handleSubmit, watch } = useForm()
  const selectedFile = watch('file')

  useEffect(() => {
    // Get geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeolocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (err) => {
          console.error('Geolocation error:', err)
          setError('Unable to get location. Please ensure location services are enabled.')
        }
      )
    }

    // Fetch user's loans
    fetchLoans()
  }, [])

  useEffect(() => {
    if (selectedFile && selectedFile[0]) {
      const url = URL.createObjectURL(selectedFile[0])
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [selectedFile])

  const fetchLoans = async () => {
    try {
      const response = await client.get('/loan/records')
      setLoans(response.data)
    } catch (err) {
      console.error('Failed to fetch loans:', err)
    }
  }

  const onSubmit = async (data: any) => {
    if (!geolocation) {
      setError('Waiting for geolocation. Please allow location access.')
      return
    }

    if (!data.file[0]) {
      setError('Please select a file to upload')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', data.file[0])
      formData.append('loan_id', data.loan_id)
      formData.append('geolat', geolocation.lat.toString())
      formData.append('geolng', geolocation.lng.toString())

      const response = await client.post('/loan/upload-proof', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setResult(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Upload Loan Utilization Proof</h1>
        <p className="text-gray-500">Submit geo-tagged photo or video evidence of loan utilization</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* Geolocation Status */}
        <div className={`flex items-center gap-3 p-4 rounded-lg mb-6 ${geolocation ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
          <MapPin className="h-5 w-5" />
          <div>
            <p className="font-medium">
              {geolocation ? 'Location Acquired' : 'Acquiring Location...'}
            </p>
            {geolocation && (
              <p className="text-sm">
                Lat: {geolocation.lat.toFixed(6)}, Lng: {geolocation.lng.toFixed(6)}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Loan Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Loan
            </label>
            <select
              {...register('loan_id', { required: true })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#01696f] outline-none"
            >
              <option value="">Choose a loan...</option>
              {loans.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  Loan #{loan.id} - ₹{loan.loan_amount} ({loan.loan_purpose})
                </option>
              ))}
            </select>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Photo/Video
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#01696f] transition-colors">
              <input
                type="file"
                accept="image/*,video/*"
                {...register('file')}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {previewUrl ? (
                  <div className="relative">
                    <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
                    <p className="mt-2 text-sm text-gray-500">Click to change file</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Camera className="h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-gray-600 font-medium">Click to upload photo or video</p>
                    <p className="text-sm text-gray-400 mt-1">Supports JPG, PNG, MP4 (max 50MB)</p>
                  </div>
                )}
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              The uploaded file will be validated using AI for authenticity and location verification.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !geolocation}
            className="w-full bg-[#01696f] text-white py-3 rounded-lg font-semibold hover:bg-[#015459] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Uploading & Validating...
              </>
            ) : (
              <>
                <UploadIcon className="h-5 w-5" />
                Upload Proof
              </>
            )}
          </button>
        </form>

        {/* AI Validation Result */}
        {result && (
          <div className="mt-6 border-t pt-6">
            <h3 className="font-semibold mb-3">AI Validation Result</h3>
            <div className={`p-4 rounded-lg ${
              result.ai_validation_status === 'APPROVED' ? 'bg-green-50 border border-green-200' :
              result.ai_validation_status === 'REJECTED' ? 'bg-red-50 border border-red-200' :
              'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {result.ai_validation_status === 'APPROVED' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : result.ai_validation_status === 'REJECTED' ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <span className={`font-medium ${
                  result.ai_validation_status === 'APPROVED' ? 'text-green-700' :
                  result.ai_validation_status === 'REJECTED' ? 'text-red-700' :
                  'text-yellow-700'
                }`}>
                  {result.ai_validation_status.replace('_', ' ')}
                </span>
              </div>
              <p className={`text-sm ${
                result.ai_validation_status === 'APPROVED' ? 'text-green-600' :
                result.ai_validation_status === 'REJECTED' ? 'text-red-600' :
                'text-yellow-600'
              }`}>
                Confidence Score: {(result.ai_confidence_score * 100).toFixed(1)}%
              </p>
              {result.ai_remarks && (
                <p className="text-sm mt-2">{result.ai_remarks}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}