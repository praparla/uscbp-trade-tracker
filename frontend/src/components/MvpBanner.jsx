import { AlertTriangle } from 'lucide-react'

export default function MvpBanner({ meta }) {
  const cap = meta?.max_pdfs_cap
  // Support both old format (pdfs_processed) and new pipeline format (bulletins_fetched)
  const processed = meta?.bulletins_fetched ?? meta?.pdfs_processed ?? 0

  // Show banner if a cap is configured (cap > 0)
  if (!cap || cap <= 0) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center gap-2 text-amber-800 text-sm">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>
          <strong>MVP Mode:</strong> Processing capped at {cap} source documents
          ({processed} processed).{' '}
          Update <code className="bg-amber-100 px-1 rounded text-xs">MAX_PDFS_TO_PROCESS</code> to expand.
        </span>
      </div>
    </div>
  )
}
