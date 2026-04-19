import { useState, useEffect } from 'react'
import * as Figma from 'figma-js'

interface FileData {
  name: string
  id: string
  document?: {
    children?: Array<{ id: string; name: string }>
  }
}

/**
 * FigmaIntegration Component
 *
 * This component demonstrates how to fetch Figma file data using the figma-js library.
 * To use this:
 *
 * 1. Set your Figma token and file ID in .env.local:
 *    - VITE_FIGMA_TOKEN=your_token
 *    - VITE_FIGMA_FILE_ID=your_file_id
 *
 * 2. Import and use this component in your main app
 */

export default function FigmaIntegration() {
  const [figmaData, setFigmaData] = useState<FileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFigmaFile = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = import.meta.env.VITE_FIGMA_TOKEN
      const fileId = import.meta.env.VITE_FIGMA_FILE_ID

      if (!token || !fileId) {
        throw new Error(
          'Missing Figma credentials. Please set VITE_FIGMA_TOKEN and VITE_FIGMA_FILE_ID in .env.local'
        )
      }

      // Initialize Figma client
      const client = new (Figma as any).Client({ personalAccessToken: token })

      // Fetch file data
      const file = await client.file(fileId)
      setFigmaData(file as FileData)
      console.log('Figma file loaded:', file)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching Figma file:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Uncomment to auto-fetch on component mount
    // fetchFigmaFile()
  }, [])

  return (
    <div className="figma-integration">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Figma Integration</h2>

      <button
        onClick={fetchFigmaFile}
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
      >
        {loading ? 'Loading...' : 'Load Figma Design'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {figmaData && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">{figmaData.name}</h3>
          <p className="text-sm text-gray-600 mb-3">
            <strong>File ID:</strong> {figmaData.id}
          </p>
          <p className="text-sm text-gray-600 mb-3">
            <strong>Pages:</strong> {figmaData.document?.children?.length || 0}
          </p>
          {figmaData.document?.children && figmaData.document.children.length > 0 && (
            <ul className="list-disc list-inside text-sm text-gray-600">
              {figmaData.document.children.map((page) => (
                <li key={page.id}>{page.name}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
