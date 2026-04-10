'use client'

import { useState, useEffect, useCallback } from 'react'

interface Game {
  id: number
  title: string
}

interface Category {
  id: number
  name: string
}

interface ImportResult {
  name: string
  status: 'success' | 'error'
  message?: string
}

interface BulkImportModalProps {
  onClose: () => void
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ onClose }) => {
  const [games, setGames] = useState<Game[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedGame, setSelectedGame] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ImportResult[]>([])
  const [error, setError] = useState<string>('')

  useEffect(() => {
    fetch('/api/games?limit=100')
      .then((r) => r.json())
      .then((data) => setGames(data.docs || []))
      .catch(() => setError('Impossible de charger les jeux'))
  }, [])

  useEffect(() => {
    if (!selectedGame) {
      setCategories([])
      setSelectedCategory('')
      return
    }
    fetch(`/api/categories?where[game][equals]=${selectedGame}&limit=100`)
      .then((r) => r.json())
      .then((data) => {
        setCategories(data.docs || [])
        setSelectedCategory('')
      })
      .catch(() => setError('Impossible de charger les catégories'))
  }, [selectedGame])

  const handleSubmit = useCallback(async () => {
    if (!selectedGame || !selectedCategory || !zipFile) {
      setError('Veuillez remplir tous les champs')
      return
    }

    setLoading(true)
    setError('')
    setResults([])

    const formData = new FormData()
    formData.append('gameId', selectedGame)
    formData.append('categoryId', selectedCategory)
    formData.append('zip', zipFile)

    try {
      const res = await fetch('/api/bulk-import', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'import")
      } else {
        setResults(data.results || [])
      }
    } catch {
      setError("Erreur réseau lors de l'import")
    } finally {
      setLoading(false)
    }
  }, [selectedGame, selectedCategory, zipFile])

  const successCount = results.filter((r) => r.status === 'success').length
  const errorCount = results.filter((r) => r.status === 'error').length

  return (
    <>
      <style>{`
        .payload-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(2px);
        }

        .payload-modal {
          background: #1b1b1f;
          border: 1px solid #2e2e34;
          border-radius: 4px;
          width: 540px;
          max-height: 85vh;
          overflow-y: auto;
          color: #fff;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
        }

        .payload-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid #2e2e34;
        }

        .payload-modal-title {
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          letter-spacing: 0;
        }

        .payload-modal-close {
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 2px;
          transition: color 0.15s;
          line-height: 1;
          font-size: 18px;
        }

        .payload-modal-close:hover {
          color: #fff;
        }

        .payload-modal-body {
          padding: 24px;
        }

        .payload-notice {
          background: #16161a;
          border: 1px solid #2e2e34;
          border-radius: 3px;
          padding: 12px 14px;
          margin-bottom: 24px;
          font-size: 12px;
          color: #888;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          line-height: 1.6;
        }

        .payload-notice code {
          color: #7ab8f5;
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 11px;
          background: #0d0d10;
          padding: 1px 5px;
          border-radius: 2px;
        }

        .payload-field {
          margin-bottom: 20px;
        }

        .payload-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #888;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .payload-label span {
          color: #555;
          font-weight: 400;
          margin-left: 2px;
        }

        .payload-select,
        .payload-input {
          width: 100%;
          padding: 8px 10px;
          background: #0d0d10;
          border: 1px solid #2e2e34;
          border-radius: 3px;
          color: #fff;
          font-size: 13px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          transition: border-color 0.15s;
          box-sizing: border-box;
          appearance: none;
          -webkit-appearance: none;
          outline: none;
        }

        .payload-select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23555' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
          padding-right: 32px;
          cursor: pointer;
        }

        .payload-select:focus,
        .payload-input:focus {
          border-color: #4a90e2;
        }

        .payload-select:disabled,
        .payload-input:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .payload-select option {
          background: #1b1b1f;
          color: #fff;
        }

        .payload-file-wrapper {
          position: relative;
        }

        .payload-file-input {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
          width: 100%;
          height: 100%;
        }

        .payload-file-display {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: #0d0d10;
          border: 1px dashed #2e2e34;
          border-radius: 3px;
          font-size: 13px;
          color: #888;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          transition: border-color 0.15s, color 0.15s;
          min-height: 38px;
        }

        .payload-file-display:hover {
          border-color: #4a90e2;
          color: #ccc;
        }

        .payload-file-icon {
          font-size: 14px;
          flex-shrink: 0;
        }

        .payload-file-active {
          border-style: solid;
          border-color: #2e2e34;
          color: #fff;
        }

        .payload-file-size {
          margin-left: auto;
          font-size: 11px;
          color: #555;
          font-family: 'SF Mono', monospace;
        }

        .payload-error {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: #1c0f0f;
          border: 1px solid #5c1a1a;
          border-radius: 3px;
          padding: 10px 12px;
          margin-bottom: 20px;
          font-size: 12px;
          color: #f87171;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          line-height: 1.5;
        }

        .payload-results {
          margin-bottom: 20px;
        }

        .payload-results-summary {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 10px;
          font-size: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .payload-results-success {
          color: #4ade80;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .payload-results-error {
          color: #f87171;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .payload-results-list {
          border: 1px solid #2e2e34;
          border-radius: 3px;
          max-height: 180px;
          overflow-y: auto;
          background: #0d0d10;
        }

        .payload-results-list::-webkit-scrollbar {
          width: 4px;
        }

        .payload-results-list::-webkit-scrollbar-track {
          background: transparent;
        }

        .payload-results-list::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 2px;
        }

        .payload-result-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          font-size: 12px;
          border-bottom: 1px solid #1e1e22;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .payload-result-row:last-child {
          border-bottom: none;
        }

        .payload-result-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .payload-result-name {
          flex: 1;
          color: #ccc;
        }

        .payload-result-msg {
          color: #555;
          font-size: 11px;
        }

        .payload-modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          padding: 16px 24px;
          border-top: 1px solid #2e2e34;
        }

        .payload-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 16px;
          font-size: 13px;
          font-weight: 500;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          border-radius: 3px;
          cursor: pointer;
          transition: background 0.15s, opacity 0.15s;
          border: none;
          outline: none;
        }

        .payload-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .payload-btn-secondary {
          background: transparent;
          color: #888;
          border: 1px solid #2e2e34;
        }

        .payload-btn-secondary:hover:not(:disabled) {
          background: #2e2e34;
          color: #fff;
        }

        .payload-btn-primary {
          background: #fff;
          color: #0d0d10;
        }

        .payload-btn-primary:hover:not(:disabled) {
          background: #e0e0e0;
        }

        .payload-spinner {
          width: 12px;
          height: 12px;
          border: 1.5px solid rgba(0,0,0,0.2);
          border-top-color: #000;
          border-radius: 50%;
          animation: payload-spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        @keyframes payload-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div
        className="payload-modal-overlay"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="payload-modal">
          {/* Header */}
          <div className="payload-modal-header">
            <h2 className="payload-modal-title">Import ZIP en masse</h2>
            <button className="payload-modal-close" onClick={onClose} disabled={loading}>
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="payload-modal-body">
            <div className="payload-notice">
              Le ZIP doit contenir un dossier par item. Chaque dossier doit avoir :{' '}
              <code>icon.webp</code> (icône) + <code>*.zip</code> (fichier du item)
            </div>

            {/* Game */}
            <div className="payload-field">
              <label className="payload-label">
                Jeu <span>*</span>
              </label>
              <select
                className="payload-select"
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                disabled={loading}
              >
                <option value="">Sélectionner un jeu</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="payload-field">
              <label className="payload-label">
                Catégorie <span>*</span>
              </label>
              <select
                className="payload-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                disabled={loading || !selectedGame}
              >
                <option value="">Sélectionner une catégorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* ZIP file */}
            <div className="payload-field">
              <label className="payload-label">
                Fichier ZIP <span>*</span>
              </label>
              <div className="payload-file-wrapper">
                <input
                  type="file"
                  accept=".zip"
                  className="payload-file-input"
                  onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                  disabled={loading}
                />
                <div className={`payload-file-display ${zipFile ? 'payload-file-active' : ''}`}>
                  <span className="payload-file-icon">{zipFile ? '📦' : '↑'}</span>
                  <span>
                    {zipFile ? zipFile.name : 'Cliquer pour sélectionner un fichier .zip'}
                  </span>
                  {zipFile && (
                    <span className="payload-file-size">
                      {(zipFile.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="payload-error">
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="payload-results">
                <div className="payload-results-summary">
                  <span className="payload-results-success">
                    <span>●</span> {successCount} importé{successCount !== 1 ? 's' : ''}
                  </span>
                  {errorCount > 0 && (
                    <span className="payload-results-error">
                      <span>●</span> {errorCount} erreur{errorCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="payload-results-list">
                  {results.map((r, i) => (
                    <div key={i} className="payload-result-row">
                      <span
                        className="payload-result-dot"
                        style={{ background: r.status === 'success' ? '#4ade80' : '#f87171' }}
                      />
                      <span className="payload-result-name">{r.name}</span>
                      {r.message && <span className="payload-result-msg">{r.message}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="payload-modal-footer">
            <button
              className="payload-btn payload-btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              {results.length > 0 ? 'Fermer' : 'Annuler'}
            </button>
            {results.length === 0 && (
              <button
                className="payload-btn payload-btn-primary"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="payload-spinner" />
                    Import en cours…
                  </>
                ) : (
                  <>⬆ Lancer l&apos;import</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
