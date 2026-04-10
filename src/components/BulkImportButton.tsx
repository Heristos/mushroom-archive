'use client'

import { useState } from 'react'
import { BulkImportModal } from './BulkImportModal'

const BulkImportButton: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          backgroundColor: hover ? '#2c2c2c' : '#3c3c3c',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        ⬆ Import ZIP
      </button>

      {open && <BulkImportModal onClose={() => setOpen(false)} />}
    </>
  )
}

export default BulkImportButton
