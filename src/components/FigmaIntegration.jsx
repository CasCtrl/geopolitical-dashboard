import { useState, useEffect } from 'react'
import Figma from 'figma-js'

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
  const [figmaData, setFigmaData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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
      const client = new Figma.Client({ personalAccessToken: token })

      // Fetch file data
      const file = await client.file(fileId)
      setFigmaData(file)
      console.log('Figma file loaded:', file)
    } catch (err) {
      setError(err.message)
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
      <h2>Figma Integration</h2>

      <button onClick={fetchFigmaFile} disabled={loading}>
        {loading ? 'Loading...' : 'Load Figma Design'}
      </button>

      {error && <div className="error-message">{error}</div>}

      {figmaData && (
        <div className="figma-data">
          <h3>{figmaData.name}</h3>
          <p>
            <strong>File ID:</strong> {figmaData.id}
          </p>
          <p>
            <strong>Pages:</strong> {figmaData.document?.children?.length || 0}
          </p>
          {figmaData.document?.children && (
            <ul>
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
