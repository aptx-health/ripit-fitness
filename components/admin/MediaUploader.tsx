'use client'

import { ImagePlus, Upload } from 'lucide-react'
import { useRef, useState } from 'react'

interface MediaUploaderProps {
  onInsert: (markdown: string) => void
}

export default function MediaUploader({ onInsert }: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setPreview(URL.createObjectURL(file))
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/media', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error)
        setPreview(null)
        return
      }

      onInsert(json.data.markdown)
      setPreview(null)
    } catch {
      setError('Upload failed')
      setPreview(null)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      <span className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
        Media Upload
      </span>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: file upload drop zone with hidden input */}
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-border p-4 text-center hover:border-primary transition-colors cursor-pointer"
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleChange}
          className="hidden"
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Upload size={16} className="animate-pulse" />
            Uploading...
          </div>
        ) : preview ? (
          // biome-ignore lint/performance/noImgElement: preview of blob URL before upload
          <img src={preview} alt="Preview" className="max-h-32 mx-auto" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImagePlus size={24} />
            <span className="text-xs">Drop image here or click to browse (max 5MB)</span>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}
