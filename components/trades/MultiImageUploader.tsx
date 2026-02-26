'use client'

import React, { useCallback, useState } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

interface MultiImageUploaderProps {
    maxFiles?: number
    files: File[]
    onFilesChange: (files: File[]) => void
}

export default function MultiImageUploader({ maxFiles = 5, files, onFilesChange }: MultiImageUploaderProps) {
    const [isDragging, setIsDragging] = useState(false)

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const uploadedFiles = Array.from(e.dataTransfer.files)
            const imageFiles = uploadedFiles.filter(f => f.type.startsWith('image/'))

            const newFiles = [...files, ...imageFiles].slice(0, maxFiles)
            onFilesChange(newFiles)
        }
    }, [files, maxFiles, onFilesChange])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const uploadedFiles = Array.from(e.target.files)
            const newFiles = [...files, ...uploadedFiles].slice(0, maxFiles)
            onFilesChange(newFiles)
        }
    }

    const removeFile = (index: number) => {
        const newFiles = [...files]
        newFiles.splice(index, 1)
        onFilesChange(newFiles)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label className="label">Screenshots ({files.length}/{maxFiles})</label>

            {/* Dropzone */}
            {files.length < maxFiles && (
                <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    style={{
                        border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: '10px',
                        padding: '1.5rem',
                        textAlign: 'center',
                        background: isDragging ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                    }}
                    onClick={() => document.getElementById('screenshot-upload')?.click()}
                >
                    <Upload size={24} color={isDragging ? 'var(--accent)' : 'var(--text-muted)'} />
                    <div style={{ fontSize: '0.8125rem', color: isDragging ? 'var(--accent)' : 'var(--text-primary)', fontWeight: 500 }}>
                        Click or drag images here
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Up to {maxFiles} images (PNG, JPG, WebP)
                    </div>
                    <input
                        id="screenshot-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                    />
                </div>
            )}

            {/* Preview Grid */}
            {files.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                    {files.map((file, i) => {
                        const previewUrl = URL.createObjectURL(file)
                        return (
                            <div key={i} style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={previewUrl} alt={`Preview ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                                    style={{
                                        position: 'absolute', top: 4, right: 4,
                                        width: 20, height: 20, borderRadius: '10px',
                                        background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
