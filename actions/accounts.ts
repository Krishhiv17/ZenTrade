'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { PropAccount } from '@/lib/supabase/types'
import { computeDrawdown, type DrawdownTrade } from '@/lib/domain/drawdown'

export interface AccountWithDrawdown extends PropAccount {
    peak_eod_balance: number
    drawdown_floor: number | null   // current stop-out balance
    drawdown_breached: boolean
    drawdown_buffer: number | null   // current_balance − floor
}

export async function getAccounts(): Promise<AccountWithDrawdown[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data, error } = await supabase
        .from('prop_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    if (!data) return []

    const accounts = data as PropAccount[]

    // Drawdown is computed from trades grouped by SESSION date (not calendar date),
    // via the single drawdown domain module.
    const { data: trades } = await supabase
        .from('trades')
        .select('account_id, pnl, max_unrealized_pnl, session_date, date, created_at')
        .eq('user_id', user.id)

    const byAccount = new Map<string, DrawdownTrade[]>()
    for (const t of trades ?? []) {
        const arr = byAccount.get(t.account_id) ?? []
        arr.push({
            pnl: t.pnl,
            max_unrealized_pnl: t.max_unrealized_pnl,
            session_date: t.session_date ?? t.date,
            created_at: t.created_at,
        })
        byAccount.set(t.account_id, arr)
    }

    return accounts.map(acc => {
        const dd = computeDrawdown(
            {
                account_size: acc.account_size,
                current_balance: acc.current_balance,
                max_drawdown: acc.max_drawdown,
                drawdown_type: acc.drawdown_type,
            },
            byAccount.get(acc.id) ?? [],
        )
        return {
            ...acc,
            peak_eod_balance: dd.peakBalance,
            drawdown_floor: dd.floor,
            drawdown_breached: dd.breached,
            drawdown_buffer: dd.remainingBuffer,
        }
    })
}

export async function createAccount(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const accountSize = parseFloat(formData.get('account_size') as string)

    const payload = {
        user_id: user.id,
        firm_name: formData.get('firm_name') as string,
        account_type: formData.get('account_type') as string,
        market_type: formData.get('market_type') as string,
        account_size: accountSize,
        current_balance: accountSize,  // starts equal to account size
        profit_target: formData.get('profit_target') ? parseFloat(formData.get('profit_target') as string) : null,
        max_drawdown: formData.get('max_drawdown') ? parseFloat(formData.get('max_drawdown') as string) : null,
        drawdown_type: formData.get('drawdown_type') || 'static',
        daily_loss_limit: formData.get('daily_loss_limit') ? parseFloat(formData.get('daily_loss_limit') as string) : null,
        personal_daily_loss_limit: formData.get('personal_daily_loss_limit') ? parseFloat(formData.get('personal_daily_loss_limit') as string) : null,
        consistency_rule: (formData.get('consistency_rule') as string) || null,
        max_daily_trades: formData.get('max_daily_trades') ? parseInt(formData.get('max_daily_trades') as string, 10) : null,
        start_date: formData.get('start_date') as string || new Date().toISOString().split('T')[0],
    }

    const { error } = await supabase.from('prop_accounts').insert(payload)
    if (error) throw new Error(error.message)

    revalidatePath('/accounts')
    revalidatePath('/dashboard')
}

export async function updateAccountStatus(id: string, status: 'active' | 'passed' | 'blown') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { error } = await supabase
        .from('prop_accounts')
        .update({ status })
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) throw new Error(error.message)
    revalidatePath('/accounts')
    revalidatePath('/dashboard')
}

export async function updateAccount(id: string, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const payload = {
        firm_name: formData.get('firm_name') as string,
        account_type: formData.get('account_type') as string,
        market_type: formData.get('market_type') as string,
        account_size: Number(formData.get('account_size')),
        profit_target: formData.get('profit_target') ? Number(formData.get('profit_target')) : null,
        max_drawdown: formData.get('max_drawdown') ? Number(formData.get('max_drawdown')) : null,
        drawdown_type: formData.get('drawdown_type') as string || null,
        daily_loss_limit: formData.get('daily_loss_limit') ? Number(formData.get('daily_loss_limit')) : null,
        max_daily_trades: formData.get('max_daily_trades') ? Number(formData.get('max_daily_trades')) : null
    }

    const { error } = await supabase
        .from('prop_accounts')
        .update(payload)
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) throw new Error(error.message)
    revalidatePath('/')
}

export async function deleteAccount(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { error } = await supabase
        .from('prop_accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) throw new Error(error.message)
    revalidatePath('/accounts')
    revalidatePath('/dashboard')
}
