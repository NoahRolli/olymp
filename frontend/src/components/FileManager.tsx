import { useState, useEffect, useCallback } from 'react'

interface FileItem {
  name: string
  type: 'folder' | 'file'
  size: number | null
  modified: number
  path: string
}

interface FilesResponse {
  current_path: string
  items: FileItem[]
  error?: string
}

interface PreviewData {
  type: 'text' | 'image' | 'unknown'
  name: string
  content?: string
  path?: string
}

const API = '/api/files'

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']
const TEXT_EXTENSIONS = ['txt', 'md', 'csv', 'json', 'py', 'js', 'ts', 'tsx', 'html', 'css', 'yml', 'yaml', 'toml', 'cfg', 'conf', 'sh', 'bash', 'log', 'env', 'xml', 'sql', 'ini']

function getExtension(name: string): string {
  const parts = name.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ''
}

function canPreview(name: string): boolean {
  const ext = getExtension(name)
  return IMAGE_EXTENSIONS.includes(ext) || TEXT_EXTENSIONS.includes(ext)
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return '–'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString('de-CH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function FileManager() {
  const [currentPath, setCurrentPath] = useState('')
  const [items, setItems] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [dragging, setDragging] = useState<FileItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<FileItem | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [preview, setPreview] = useState<PreviewData | null>(null)

  const fetchFiles = useCallback(async (path: string = '') => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}?path=${encodeURIComponent(path)}`, { credentials: 'include' })
      const data: FilesResponse = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setItems(data.items)
        setCurrentPath(path)
      }
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchFiles(currentPath)
  }, [])

  const navigateTo = (path: string) => fetchFiles(path)

  const navigateUp = () => {
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    fetchFiles(parts.join('/'))
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    const path = currentPath ? `${currentPath}/${newFolderName}` : newFolderName
    const res = await fetch(`${API}/mkdir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ path }),
    })
    const data = await res.json()
    if (data.error) {
      setError(data.error)
    } else {
      setNewFolderName('')
      setShowNewFolder(false)
      fetchFiles(currentPath)
    }
  }

  const deleteItem = async (item: FileItem) => {
    if (!confirm(`"${item.name}" wirklich löschen?`)) return
    const res = await fetch(`${API}?path=${encodeURIComponent(item.path)}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const data = await res.json()
    if (data.error) {
      setError(data.error)
    } else {
      fetchFiles(currentPath)
    }
  }

  const startRename = (item: FileItem) => {
    setRenaming(item)
    setRenameValue(item.name)
  }

  const cancelRename = () => {
    setRenaming(null)
    setRenameValue('')
  }

  const submitRename = async () => {
    if (!renaming || !renameValue.trim() || renameValue === renaming.name) {
      cancelRename()
      return
    }
    const res = await fetch(`${API}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ path: renaming.path, new_name: renameValue.trim() }),
    })
    const data = await res.json()
    if (data.error) {
      setError(data.error)
    } else {
      fetchFiles(currentPath)
    }
    cancelRename()
  }

  const openPreview = async (item: FileItem) => {
    const ext = getExtension(item.name)
    if (IMAGE_EXTENSIONS.includes(ext)) {
      setPreview({ type: 'image', name: item.name, path: item.path })
    } else if (TEXT_EXTENSIONS.includes(ext)) {
      try {
        const res = await fetch(`${API}/preview?path=${encodeURIComponent(item.path)}`, { credentials: 'include' })
        const data = await res.json()
        if (data.error) {
          setError(data.error)
        } else {
          setPreview(data)
        }
      } catch (e: any) {
        setError(e.message)
      }
    }
  }

  const closePreview = () => setPreview(null)

  const handleDragStart = (item: FileItem) => setDragging(item)
  const handleDragLeave = () => setDragOver(null)

  const handleDragOver = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault()
    setDragOver(targetPath)
  }

  const handleDrop = async (e: React.DragEvent, targetFolder: string) => {
    e.preventDefault()
    setDragOver(null)

    if (e.dataTransfer.files.length > 0) {
      const files = e.dataTransfer.files
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append('file', files[i])
        await fetch(`${API}/upload?path=${encodeURIComponent(targetFolder || currentPath)}`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
      }
      fetchFiles(currentPath)
      setDragging(null)
      return
    }

    if (dragging && targetFolder !== dragging.path) {
      const res = await fetch(`${API}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ source: dragging.path, destination: targetFolder }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else fetchFiles(currentPath)
    }
    setDragging(null)
  }

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(null)
    if (e.dataTransfer.files.length > 0) {
      const files = e.dataTransfer.files
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append('file', files[i])
        await fetch(`${API}/upload?path=${encodeURIComponent(currentPath)}`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
      }
      fetchFiles(currentPath)
    }
  }

  const breadcrumbs = currentPath ? currentPath.split('/').filter(Boolean) : []

  return (
    <div className="hud-card p-6 animate-fade-in col-span-1 md:col-span-2 lg:col-span-3">
      <div className="flex justify-between items-center mb-4">
        <h2 className="hud-title text-sm" style={{ color: 'var(--color-primary)' }}>
          Tresor File Manager
        </h2>
        <div className="flex gap-2">
          <button className="hud-btn" onClick={() => setShowNewFolder(!showNewFolder)}>+ Ordner</button>
          <button className="hud-btn" onClick={() => fetchFiles(currentPath)}>↻</button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 mb-4 text-sm font-mono">
        <button onClick={() => navigateTo('')} className="hover:underline" style={{ color: 'var(--color-primary)' }}>
          tresor
        </button>
        {breadcrumbs.map((part, i) => {
          const path = breadcrumbs.slice(0, i + 1).join('/')
          return (
            <span key={path} className="flex items-center gap-1">
              <span style={{ color: 'var(--color-text-muted)' }}>/</span>
              <button onClick={() => navigateTo(path)} className="hover:underline"
                style={{ color: i === breadcrumbs.length - 1 ? 'var(--color-text-primary)' : 'var(--color-primary)' }}>
                {part}
              </button>
            </span>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 mb-4 rounded" style={{ background: 'rgba(255,59,92,0.1)', border: '1px solid var(--color-danger)' }}>
          <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem' }}>{error}</p>
        </div>
      )}

      {/* New Folder */}
      {showNewFolder && (
        <div className="flex gap-2 mb-4">
          <input className="hud-input flex-1" placeholder="Ordnername..." value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createFolder()} autoFocus />
          <button className="hud-btn-primary hud-btn" onClick={createFolder}>Erstellen</button>
          <button className="hud-btn" onClick={() => { setShowNewFolder(false); setNewFolderName('') }}>✕</button>
        </div>
      )}

      {/* Back */}
      {currentPath && (
        <button onClick={navigateUp} className="flex items-center gap-2 p-2 mb-2 rounded w-full text-left hover:opacity-80"
          style={{ background: 'var(--color-bg-deep)' }}>
          <span style={{ fontSize: '1.2rem' }}>↩</span>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>..</span>
        </button>
      )}

      {/* File List */}
      <div className="space-y-1 min-h-[200px]"
        onDragOver={(e) => { e.preventDefault(); setDragOver('__root__') }}
        onDragLeave={handleDragLeave} onDrop={handleFileDrop}
        style={{ background: dragOver === '__root__' ? 'rgba(0,212,255,0.05)' : 'transparent', borderRadius: '6px', transition: 'background 0.2s' }}>
        {loading ? (
          <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>Laden...</p>
        ) : items.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center', fontSize: '0.85rem' }}>
            Leerer Ordner — Dateien hierher ziehen oder Ordner erstellen
          </p>
        ) : (
          items.map((item) => (
            <div key={item.path} draggable={renaming?.path !== item.path}
              onDragStart={() => handleDragStart(item)}
              onDragOver={(e) => item.type === 'folder' ? handleDragOver(e, item.path) : e.preventDefault()}
              onDragLeave={handleDragLeave}
              onDrop={(e) => item.type === 'folder' ? handleDrop(e, item.path) : undefined}
              className="flex items-center justify-between p-3 rounded-md cursor-grab active:cursor-grabbing group"
              style={{
                background: dragOver === item.path ? 'rgba(0,212,255,0.15)' : 'var(--color-bg-deep)',
                border: dragOver === item.path ? '1px solid var(--color-primary)' : '1px solid transparent',
                transition: 'all 0.2s',
              }}>
              <div className="flex items-center gap-3 flex-1"
                onClick={() => {
                  if (renaming?.path === item.path) return
                  if (item.type === 'folder') navigateTo(item.path)
                  else if (canPreview(item.name)) openPreview(item)
                }}
                style={{ cursor: item.type === 'folder' || canPreview(item.name) ? 'pointer' : 'default' }}>
                <span style={{ fontSize: '1.3rem' }}>{item.type === 'folder' ? '📁' : '📄'}</span>
                <div className="flex-1 min-w-0">
                  {renaming?.path === item.path ? (
                    <div className="flex gap-2 items-center">
                      <input className="hud-input flex-1" style={{ padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
                        value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') cancelRename() }}
                        autoFocus onClick={(e) => e.stopPropagation()} />
                      <button className="hud-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={(e) => { e.stopPropagation(); submitRename() }}>✓</button>
                      <button className="hud-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={(e) => { e.stopPropagation(); cancelRename() }}>✕</button>
                    </div>
                  ) : (
                    <>
                      <p className="font-mono text-sm" style={{
                        color: item.type === 'folder' ? 'var(--color-primary)' : 'var(--color-text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{item.name}</p>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                        {item.type === 'file' ? formatSize(item.size) : 'Ordner'} · {formatDate(item.modified)}
                        {item.type === 'file' && canPreview(item.name) && (
                          <span style={{ color: 'var(--color-primary)', marginLeft: '0.5rem' }}>Vorschau</span>
                        )}
                      </p>
                    </>
                  )}
                </div>
              </div>
              {renaming?.path !== item.path && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.type === 'file' && (
                    <a href={`/api/files/download?path=${encodeURIComponent(item.path)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-1 rounded text-sm"
                      style={{ color: 'var(--color-success, #00ff96)' }}
                      title="Herunterladen">↓</a>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); startRename(item) }}
                    className="px-2 py-1 rounded text-sm" style={{ color: 'var(--color-primary)' }}
                    title="Umbenennen">✎</button>
                  <button onClick={(e) => { e.stopPropagation(); deleteItem(item) }}
                    className="px-2 py-1 rounded text-sm" style={{ color: 'var(--color-danger)' }}
                    title="Löschen">✕</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Drop Zone */}
      <div className="mt-4 p-3 rounded text-center" style={{
        border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.75rem',
      }}>
        Dateien vom Desktop hierher ziehen zum Hochladen
      </div>

      {/* Preview Modal */}
      {preview && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '2rem',
        }} onClick={closePreview}>
          <div style={{
            background: 'var(--color-bg, #0a0e17)', borderRadius: '8px',
            border: '1px solid var(--color-border)', maxWidth: '900px',
            maxHeight: '80vh', width: '100%', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.8rem 1rem', borderBottom: '1px solid var(--color-border)',
            }}>
              <span style={{ color: 'var(--color-text)', fontSize: '0.85rem', fontFamily: 'var(--font-mono, monospace)' }}>
                {preview.name}
              </span>
              <button onClick={closePreview} style={{
                background: 'none', border: 'none', color: 'var(--color-text-muted)',
                fontSize: '1.2rem', cursor: 'pointer',
              }}>✕</button>
            </div>
            {/* Content */}
            <div style={{ overflow: 'auto', flex: 1, padding: '1rem' }}>
              {preview.type === 'image' && (
                <img
                  src={`/api/files/preview?path=${encodeURIComponent(preview.path!)}`}
                  alt={preview.name}
                  style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }}
                />
              )}
              {preview.type === 'text' && (
                <pre style={{
                  color: 'var(--color-text)', fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word', margin: 0, lineHeight: 1.6,
                }}>
                  {preview.content}
                </pre>
              )}
              {preview.type === 'unknown' && (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  Vorschau für diesen Dateityp nicht verfügbar.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}