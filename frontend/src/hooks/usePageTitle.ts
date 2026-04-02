import { useEffect } from 'react'

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | SAMAAN` : 'SAMAAN | Ministry of Social Justice & Empowerment'
    return () => {
      document.title = 'SAMAAN | Ministry of Social Justice & Empowerment'
    }
  }, [title])
}
