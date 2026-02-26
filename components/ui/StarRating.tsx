'use client'

import React, { useState } from 'react'
import { Star } from 'lucide-react'

interface StarRatingProps {
    value: number
    onChange: (val: number) => void
}

export default function StarRating({ value, onChange }: StarRatingProps) {
    const [hover, setHover] = useState<number | null>(null)

    const getColor = (rating: number) => {
        if (rating === 1) return 'var(--red)'
        if (rating === 2) return 'var(--orange)'
        if (rating === 3) return 'var(--yellow)'
        if (rating === 4) return '#86efac' // light green
        if (rating === 5) return '#22c55e' // bright/vibrant green
        return 'var(--bg-overlay)'
    }

    const currentRating = hover ?? value

    return (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map(star => {
                const isActive = star <= currentRating
                const color = isActive ? getColor(currentRating) : 'var(--bg-overlay)'

                return (
                    <button
                        key={star}
                        type="button"
                        onClick={() => onChange(star)}
                        onMouseEnter={() => setHover(star)}
                        onMouseLeave={() => setHover(null)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            display: 'flex',
                            transition: 'all 0.2s',
                            transform: hover === star ? 'scale(1.2)' : 'scale(1)'
                        }}
                    >
                        <Star
                            size={24}
                            color={color}
                            fill={isActive ? color : 'transparent'}
                            style={{
                                filter: isActive && currentRating >= 4 ? `drop-shadow(0 0 8px ${color}88)` : 'none'
                            }}
                        />
                    </button>
                )
            })}
            <div style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-muted)', width: 60 }}>
                {value === 1 && 'Low'}
                {value === 2 && 'Fair'}
                {value === 3 && 'Good'}
                {value === 4 && 'High'}
                {value === 5 && 'Conviction'}
            </div>
        </div>
    )
}
