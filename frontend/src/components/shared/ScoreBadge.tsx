type RiskBand =
  | 'LOW_RISK_HIGH_NEED'
  | 'LOW_RISK_LOW_NEED'
  | 'HIGH_RISK_HIGH_NEED'
  | 'HIGH_RISK_LOW_NEED'

const labelMap: Record<RiskBand, string> = {
  LOW_RISK_HIGH_NEED: 'Low Risk / High Need',
  LOW_RISK_LOW_NEED: 'Low Risk / Low Need',
  HIGH_RISK_HIGH_NEED: 'High Risk / High Need',
  HIGH_RISK_LOW_NEED: 'High Risk / Low Need',
}

const classMap: Record<RiskBand, string> = {
  LOW_RISK_HIGH_NEED: 'bg-green-100 text-green-700',
  LOW_RISK_LOW_NEED: 'bg-blue-100 text-blue-700',
  HIGH_RISK_HIGH_NEED: 'bg-red-100 text-red-700',
  HIGH_RISK_LOW_NEED: 'bg-amber-100 text-amber-700',
}

export default function ScoreBadge({ band }: { band: RiskBand | string }) {
  const key = band as RiskBand
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classMap[key] || 'bg-gray-100 text-gray-700'}`}>{labelMap[key] || band}</span>
}

