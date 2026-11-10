import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchArtworkFiles } from '../../utils/api'

import { INK, SAGE, LINE, SERIF } from './theme'

// Light grey checks, so transparent PNGs read as transparent.
const CHECKER = { backgroundColor: '#F4F5F0', backgroundImage: 'linear-gradient(45deg,#E9EBE4 25%,transparent 25%,transparent 75%,#E9EBE4 75%),linear-gradient(45deg,#E9EBE4 25%,transparent 25%,transparent 75%,#E9EBE4 75%)', backgroundSize: '16px 16px', backgroundPosition: '0 0,8px 8px' }


export function Modal({ title, subtitle, onClose, children, width = 640 }) {
  return createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '24px', width: '100%', maxWidth: `${width}px`, maxHeight: '86vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '24px 28px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', borderBottom: `1px solid ${LINE}` }}>
          <div>
            <h2 style={{ fontFamily: SERIF, fontSize: '22px', fontWeight: 800, color: INK }}>{title}</h2>
            {subtitle && <p style={{ fontSize: '12px', color: SAGE, marginTop: '4px' }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ flexShrink: 0, width: '32px', height: '32px', background: '#F4F5F0', border: 'none', borderRadius: '10px', fontSize: '14px', color: INK, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px 28px 24px' }}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}

export function Thumb({ file, size = '100%' }) {
  return (
    <div style={{ ...CHECKER, width: size, aspectRatio: '1 / 1', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img src={file.thumb_url} alt="" loading="lazy" style={{ maxWidth: '82%', maxHeight: '82%', objectFit: 'contain' }} />
    </div>
  )
}

// Used by the designer's "Choose from My files".
export function FilePicker({ onPick, onClose }) {
  const [files, setFiles] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    fetchArtworkFiles().then(setFiles).catch(err => { setError(err.message); setFiles([]) })
  }, [])
  return (
    <Modal title="My files" subtitle="Pick a file to place on this print area." onClose={onClose}>
      {error && <div style={{ color: '#C53030', fontSize: '13px', marginBottom: '12px' }}>⚠ {error}</div>}
      {files === null ? (
        <div style={{ textAlign: 'center', padding: '32px', color: SAGE, fontSize: '13px' }}>Loading…</div>
      ) : files.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: SAGE, fontSize: '13px' }}>No files yet. Upload one here and it will be saved to My files.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
          {files.map(f => (
            <button key={f.file_id} onClick={() => onPick(f)} style={{ textAlign: 'left', background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: '16px', padding: '8px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              <Thumb file={f} />
              <div style={{ fontSize: '12px', fontWeight: 700, color: INK, marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
              <div style={{ fontSize: '11px', color: SAGE }}>{f.px_w}×{f.px_h}px</div>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}

