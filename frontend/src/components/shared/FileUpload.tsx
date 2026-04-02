import { useRef } from 'react'
import { Upload } from 'lucide-react'

export default function FileUpload({
  onChange,
  accept,
}: {
  onChange: (file: File | null) => void
  accept?: string
}) {
  const ref = useRef<HTMLInputElement | null>(null)

  return (
    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="inline-flex items-center gap-2 rounded-md bg-[#01696f] px-4 py-2 text-white hover:bg-[#015459]"
      >
        <Upload className="h-4 w-4" />
        Choose file
      </button>
      <p className="mt-3 text-sm text-gray-600">Drag-and-drop is not required; choose a proof image or video to continue.</p>
    </div>
  )
}

