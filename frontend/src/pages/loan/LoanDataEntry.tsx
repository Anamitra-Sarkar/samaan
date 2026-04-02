import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { client } from '../../api/client'

const schema = z.object({
  beneficiary_id: z.coerce.number().int().positive(),
  state_agency_id: z.coerce.number().int().positive().optional(),
  loan_amount: z.coerce.number().positive(),
  loan_purpose: z.string().min(3),
  asset_description: z.string().optional(),
  repayment_schedule: z.string().optional(),
  interest_rate: z.coerce.number().optional(),
})

type Values = z.infer<typeof schema>

export default function LoanDataEntry() {
  const [message, setMessage] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { beneficiary_id: 5, loan_amount: 50000, loan_purpose: 'Livelihood support' },
  })

  const onSubmit = async (values: Values) => {
    const response = await client.post('/loan/enter-beneficiary', values)
    setMessage(`Loan record created with ID ${response.data.id}`)
    reset(values)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Loan data entry</h1>
        <p className="text-sm text-gray-500">State officers can register beneficiary loans here.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 rounded-xl bg-white p-6 shadow-sm md:grid-cols-2">
        {['beneficiary_id', 'state_agency_id', 'loan_amount', 'loan_purpose', 'asset_description', 'repayment_schedule', 'interest_rate'].map((field) => (
          <div key={field} className={field === 'asset_description' ? 'md:col-span-2' : ''}>
            <label className="mb-1 block text-sm font-medium capitalize">{field.replace('_', ' ')}</label>
            <input
              {...register(field as keyof Values)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              type={field.includes('amount') || field.includes('id') || field.includes('rate') ? 'number' : 'text'}
            />
            {errors[field as keyof Values] && <p className="text-sm text-red-600">{errors[field as keyof Values]?.message as string}</p>}
          </div>
        ))}
        <div className="md:col-span-2">
          <button disabled={isSubmitting} className="rounded-md bg-[#01696f] px-4 py-2 font-semibold text-white disabled:opacity-50">
            Save record
          </button>
          {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
        </div>
      </form>
    </div>
  )
}

