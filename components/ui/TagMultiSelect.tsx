'use client'

import React, { useState, useRef, useEffect } from 'react'
import { X, Plus, Terminal, Star } from 'lucide-react'
import { createCustomTag, getUserTags, toggleTagFavorite, CustomTag, TagCategory } from '@/actions/tags'

interface TagMultiSelectProps {
    category: TagCategory
    label: string
    selectedTags: string[]
    onChange: (tags: string[]) => void
    defaultOptions?: string[]
}

export default function TagMultiSelect({ category, label, selectedTags, onChange, defaultOptions = [] }: TagMultiSelectProps) {
    const [inputValue, setInputValue] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [userTags, setUserTags] = useState<CustomTag[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Load user's custom tags on mount
    useEffect(() => {
        let mounted = true
        getUserTags(category).then(tags => {
            if (mounted) setUserTags(tags)
        })
        return () => { mounted = false }
    }, [category])

    // Handle clicking outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const favoriteTags = Array.from(new Set(userTags.filter(t => t.is_favorite).map(t => t.tag_name)))

    const availableOptions = Array.from(new Set([...defaultOptions, ...userTags.map(t => t.tag_name)]))
    const filteredOptions = availableOptions
        .filter(opt => opt.toLowerCase().includes(inputValue.toLowerCase()) && !selectedTags.includes(opt))
        .sort((a, b) => {
            const aFav = favoriteTags.includes(a) ? 1 : 0
            const bFav = favoriteTags.includes(b) ? 1 : 0
            if (aFav !== bFav) return bFav - aFav // Favorites first
            return a.localeCompare(b) // Then alphabetical
        })

    const handleSelect = (tag: string) => {
        if (!selectedTags.includes(tag)) {
            onChange([...selectedTags, tag])
        }
        setInputValue('')
        setIsOpen(false)
    }

    const handleRemove = (tag: string) => {
        onChange(selectedTags.filter(t => t !== tag))
    }

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault()
            const tagToCreate = inputValue.trim()

            // If it matches exactly an unselected option, select it
            const existingOpt = filteredOptions.find(o => o.toLowerCase() === tagToCreate.toLowerCase())
            if (existingOpt) {
                handleSelect(existingOpt)
                return
            }

            // Create new tag via action
            setIsLoading(true)
            const res = await createCustomTag(category, tagToCreate)
            if (res.success && res.tag) {
                setUserTags(prev => [...prev, res.tag!])
                handleSelect(tagToCreate)
            } else if (res.error === 'You already have a tag with this name.') {
                // They typed an existing tag they already selected
                setInputValue('')
            } else {
                alert(res.error)
            }
            setIsLoading(false)
        }
    }

    const handleToggleFavorite = async (e: React.MouseEvent, tagName: string) => {
        e.stopPropagation()
        setIsLoading(true)

        const existingTag = userTags.find(t => t.tag_name === tagName)
        if (existingTag) {
            // Toggle existing
            const newFavStatus = !existingTag.is_favorite
            setUserTags(prev => prev.map(t => t.id === existingTag.id ? { ...t, is_favorite: newFavStatus } : t))
            await toggleTagFavorite(existingTag.id, newFavStatus)
        } else {
            // It's a default tag that isn't saved in user_custom_tags yet. Create it as a favorite.
            const res = await createCustomTag(category, tagName, null, true)
            if (res.success && res.tag) {
                setUserTags(prev => [...prev, res.tag!])
            }
        }
        setIsLoading(false)
    }


    return (
        <div className="form-group" style={{ position: 'relative' }} ref={containerRef}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4px' }}>
                <label className="label" style={{ marginBottom: 0 }}>{label}</label>
                {favoriteTags.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '60%' }}>
                        {favoriteTags.map(fav => (
                            <button
                                key={`fav-${fav}`}
                                type="button"
                                onClick={() => handleSelect(fav)}
                                disabled={selectedTags.includes(fav)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 2,
                                    background: selectedTags.includes(fav) ? 'var(--bg-overlay)' : 'rgba(250, 204, 21, 0.15)', // dim yellow background
                                    color: selectedTags.includes(fav) ? 'var(--text-muted)' : 'var(--yellow)',
                                    border: `1px solid ${selectedTags.includes(fav) ? 'var(--border)' : 'rgba(250, 204, 21, 0.3)'}`,
                                    padding: '2px 6px',
                                    borderRadius: '12px',
                                    fontSize: '0.65rem',
                                    cursor: selectedTags.includes(fav) ? 'default' : 'pointer',
                                    opacity: selectedTags.includes(fav) ? 0.5 : 1,
                                    transition: '0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <Star size={10} fill={selectedTags.includes(fav) ? 'var(--text-muted)' : 'var(--yellow)'} />
                                {fav}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div
                className="input"
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    minHeight: '42px',
                    height: 'auto',
                    alignItems: 'center',
                    padding: '6px 10px',
                    cursor: 'text'
                }}
                onClick={() => setIsOpen(true)}
            >
                {selectedTags.map(tag => (
                    <div
                        key={tag}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: 'var(--bg-overlay)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            border: '1px solid var(--border)'
                        }}
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleRemove(tag); }}
                            style={{ background: 'transparent', border: 'none', padding: 2, cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}

                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value)
                        setIsOpen(true)
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    placeholder={selectedTags.length === 0 ? "Select or type to create..." : ""}
                    style={{
                        flex: 1,
                        minWidth: '120px',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem'
                    }}
                />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (inputValue.length > 0 || filteredOptions.length > 0) && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                    zIndex: 20,
                    maxHeight: '200px',
                    overflowY: 'auto'
                }}>
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(opt => {
                            const isFav = favoriteTags.includes(opt)
                            return (
                                <div
                                    key={opt}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        borderBottom: '1px solid var(--border)',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-overlay)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{ flex: 1 }} onClick={() => handleSelect(opt)}>
                                        {opt}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => handleToggleFavorite(e, opt)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: 4,
                                            display: 'flex',
                                            alignItems: 'center',
                                            opacity: isFav ? 1 : 0.3,
                                            transition: '0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                        onMouseLeave={(e) => e.currentTarget.style.opacity = isFav ? '1' : '0.3'}
                                    >
                                        <Star size={14} color={isFav ? "var(--yellow)" : "var(--text-muted)"} fill={isFav ? "var(--yellow)" : "none"} />
                                    </button>
                                </div>
                            )
                        })
                    ) : inputValue.length > 0 ? (
                        <div
                            onClick={() => handleKeyDown({ key: 'Enter', preventDefault: () => { } } as any)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                color: 'var(--accent)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-overlay)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <Plus size={14} /> Create &quot;{inputValue}&quot;
                        </div>
                    ) : null}
                </div>
            )}
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>Press enter to create a custom tag</div>
        </div>
    )
}
