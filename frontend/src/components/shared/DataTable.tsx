import { ReactNode, useMemo, useState } from 'react'

type Column<T> = {
  key: keyof T | string
  label: string
  render?: (row: T) => ReactNode
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  rowKey,
}: {
  data: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string | number
}) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc')

  const sorted = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const av = (a as any)[sortKey]
      const bv = (b as any)[sortKey]
      const an = typeof av === 'number' ? av : Number(av)
      const bn = typeof bv === 'number' ? bv : Number(bv)
      const bothNumeric = Number.isFinite(an) && Number.isFinite(bn)
      if (bothNumeric) {
        return direction === 'asc' ? an - bn : bn - an
      }
      const as = String(av ?? '')
      const bs = String(bv ?? '')
      return direction === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as)
    })
  }, [data, sortKey, direction])

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm data-table">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.label}
                onClick={() => {
                  const next = String(column.key)
                  if (sortKey === next) {
                    setDirection(direction === 'asc' ? 'desc' : 'asc')
                  } else {
                    setSortKey(next)
                    setDirection('asc')
                  }
                }}
                className="cursor-pointer px-4 py-3 text-left font-semibold text-gray-600"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-gray-50">
              {columns.map((column) => (
                <td key={column.label} className="px-4 py-3 align-top text-gray-700">
                  {column.render ? column.render(row) : String((row as any)[column.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
