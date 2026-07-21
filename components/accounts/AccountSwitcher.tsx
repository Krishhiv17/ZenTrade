'use client'

import React from 'react'

interface AccountSwitcherProps {
    accounts: { id: string; firm_name: string }[]
    selectedId: string
    basePath?: string
    /** Extra query params to preserve across the switch (e.g. range, tab). */
    params?: Record<string, string>
}

export default function AccountSwitcher({ accounts, selectedId, basePath = '/dashboard', params }: AccountSwitcherProps) {
    function go(id: string) {
        const p = new URLSearchParams(params ?? {})
        p.set('account', id)
        window.location.href = `${basePath}?${p.toString()}`
    }
    return (
        <select
            className="input"
            style={{ width: 'auto', fontSize: '0.8rem' }}
            value={selectedId}
            onChange={e => go(e.target.value)}
        >
            {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.firm_name}</option>
            ))}
        </select>
    )
}
