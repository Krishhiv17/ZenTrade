'use client'

import { Download } from 'lucide-react'
import type { Trade } from '@/lib/supabase/types'

export default function ExportCsvButton({ trades, accountMap }: { trades: Trade[], accountMap: Record<string, string> }) {
    function handleExport() {
        if (!trades.length) return

        // Define columns
        const headers = [
            'Date', 'Account', 'Ticker', 'Direction', 'Result',
            'Size (Contracts)', 'Entry', 'Stop Loss', 'Take Profit',
            'Risk ($)', 'Net PnL ($)', 'R-Multiple', 'Balance After ($)',
            'Macro Context', 'Timeframe', 'News'
        ]

        // Map trades to rows
        const rows = trades.map(t => [
            t.date,
            accountMap[t.account_id] || 'Unknown',
            t.ticker,
            t.direction,
            t.result || '',
            t.size,
            t.entry,
            t.sl || '',
            t.tp_avg || '',
            t.risk_dollars || '',
            t.pnl,
            t.r_multiple || '',
            t.balance_after || '',
            `"${(t.macro || '').replace(/"/g, '""')}"`, // escape quotes for CSV
            t.exec_timeframe || '',
            `"${(t.news || '').replace(/"/g, '""')}"`
        ])

        // Build CSV string
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n')

        // Trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')

        const timestamp = new Date().toISOString().split('T')[0]
        link.setAttribute('href', url)
        link.setAttribute('download', `tradejournal_export_${timestamp}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <button
            onClick={handleExport}
            className="btn btn-ghost"
            style={{ fontSize: '0.8125rem', padding: '0.5rem 0.75rem', borderColor: 'var(--border-strong)' }}
            disabled={trades.length === 0}
        >
            <Download size={15} /> Export CSV
        </button>
    )
}
