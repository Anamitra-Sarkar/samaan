import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { client } from '../../api/client'

import { usePageTitle } from '../../hooks/usePageTitle'

const schema = z.object({
  electricity_units_monthly: z.coerce.number().optional(),
  mobile_recharge_monthly_avg: z.coerce.number().optional(),
  utility_bill_avg: z.coerce.number().optional(),
  govt_survey_income_band: z.enum(['A', 'B', 'C', 'D']).optional(),
  additional_notes: z.string().optional(),
})

type Values = z.infer<typeof schema>

export default function ConsumptionEntry() {
  usePageTitle('Consumption Entry')
  const { user } = useAuthStore()
  const [result, setResult] = useState<any>(null)
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: Values) => {
    const response = await client.post('/credit/consumption', values)
    const score = await client.post(`/credit/rescore/${user?.id ?? 0}`)
    setResult({ consumption: response.data, score: score.data })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Consumption data entry</h1>
        <p className="text-sm text-gray-500">Submit utility and survey data to improve the credit score.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 rounded-xl bg-white p-6 shadow-sm md:grid-cols-2">
        {[
          ['electricity_units_monthly', 'Electricity units monthly'],
          ['mobile_recharge_monthly_avg', 'Mobile recharge monthly avg'],
          ['utility_bill_avg', 'Utility bill avg'],
          ['additional_notes', 'Additional notes'],
        ].map(([field, label]) => (
          <div key={field}>
            <label className="mb-1 block text-sm font-medium">{label}</label>
            <input {...register(field as keyof Values)} className="w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-sm font-medium">Income survey band</label>
          <select {...register('govt_survey_income_band')} className="w-full rounded-md border border-gray-300 px-3 py-2">
            <option value="">Select</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <button disabled={isSubmitting} className="rounded-md bg-[#01696f] px-4 py-2 font-semibold text-white disabled:opacity-50">
            Save consumption data
          </button>
        </div>
      </form>

      {result && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Latest score</h2>
          <p className="mt-2">Composite score: {Number(result.score.composite_score).toFixed(1)}</p>
          <p>Risk band: {result.score.risk_band}</p>
          <pre className="mt-4 overflow-auto rounded-lg bg-gray-50 p-4 text-xs">{JSON.stringify(result.score.score_explanation, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
