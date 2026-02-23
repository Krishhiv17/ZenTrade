'use client'

import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function ScreenshotLightbox({ url, onClose }: { url: string; onClose: () => void }) {
    const modal = (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                backdropFilter: 'blur(4px)',
                zIndex: 9999,
            }}
        >
            <button
                onClick={onClose}
                style={{
                    position: 'absolute', top: 16, right: 16,
                    background: 'rgba(255,255,255,0.1)', border: 'none',
                    borderRadius: '50%', width: 36, height: 36,
                    cursor: 'pointer', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
            >
                <X size={18} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={url}
                alt="Trade screenshot"
                onClick={e => e.stopPropagation()}
                style={{
                    maxWidth: '90vw',
                    maxHeight: '88vh',
                    borderRadius: 8,
                    boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
                    objectFit: 'contain',
                }}
            />
        </div>
    )

    return typeof document !== 'undefined'
        ? createPortal(modal, document.body)
        : null
}
