'use client'

import React from 'react'

interface AccountSwitcherProps {
    accounts: { id: string; firm_name: string }[]
    selectedId: string
}

export default function AccountSwitcher({ accounts, selectedId }: AccountSwitcherProps) {
    return (
        <select
            className="input"
            style={{ width: 'auto', fontSize: '0.8rem' }}
            value={selectedId}
            onChange={e => { window.location.href = `/dashboard?account=${e.target.value}` }}
        >
            {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.firm_name}</option>
            ))}
        </select>
    )
}
