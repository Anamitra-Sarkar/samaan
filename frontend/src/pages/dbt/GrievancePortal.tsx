import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { client } from '../../api/client'
import DataTable from '../../components/shared/DataTable'

const schema = z.object({
  victim_id: z.coerce.number().optional(),
  case_id: z.coerce.number().optional(),
  category: z.enum(['delay', 'wrong_amount', 'harassment', 'other']),
  description: z.string().min(5),
})

type Values = z.infer<typeof schema>

export default function GrievancePortal() {
  const [items, setItems] = useState<any[]>([])
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'delay' },
  })

  const load = async () => {
    const res = await client.get('/dbt/grievance')
    setItems(res.data.items || [])
  }

  useEffect(() => { load().catch(() => setItems([])) }, [])

  const onSubmit = async (values: Values) => {
    await client.post('/dbt/grievance', values)
    await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Grievance portal</h1>
        <p className="text-sm text-gray-500">Submit and track DBT grievances.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 rounded-xl bg-white p-6 shadow-sm md:grid-cols-2">
        <input {...register('victim_id')} className="rounded-md border border-gray-300 px-3 py-2" placeholder="Victim ID" />
        <input {...register('case_id')} className="rounded-md border border-gray-300 px-3 py-2" placeholder="Case ID" />
        <select {...register('category')} className="rounded-md border border-gray-300 px-3 py-2">
          <option value="delay">Delay</option>
          <option value="wrong_amount">Wrong amount</option>
          <option value="harassment">Harassment</option>
          <option value="other">Other</option>
        </select>
        <textarea {...register('description')} className="rounded-md border border-gray-300 px-3 py-2" placeholder="Description" />
        <div className="md:col-span-2">
          <button disabled={isSubmitting} className="rounded-md bg-[#01696f] px-4 py-2 font-semibold text-white">Submit grievance</button>
        </div>
      </form>

      <DataTable
        data={items}
        rowKey={(row) => row.id}
        columns={[
          { key: 'id', label: 'Ticket' },
          { key: 'category', label: 'Category' },
          { key: 'status', label: 'Status' },
          { key: 'description', label: 'Description' },
        ]}
      />
    </div>
  )
}

