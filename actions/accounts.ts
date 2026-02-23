'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { PropAccount } from '@/lib/supabase/types'

export async function getAccounts(): Promise<PropAccount[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data, error } = await supabase
        .from('prop_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data ?? []
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
        account_size: accountSize,
        current_balance: accountSize,  // starts equal to account size
        profit_target: formData.get('profit_target') ? parseFloat(formData.get('profit_target') as string) : null,
        max_drawdown: formData.get('max_drawdown') ? parseFloat(formData.get('max_drawdown') as string) : null,
        trailing_drawdown: formData.get('trailing_drawdown') === 'true',
        daily_loss_limit: formData.get('daily_loss_limit') ? parseFloat(formData.get('daily_loss_limit') as string) : null,
        personal_daily_loss_limit: formData.get('personal_daily_loss_limit') ? parseFloat(formData.get('personal_daily_loss_limit') as string) : null,
        consistency_rule: (formData.get('consistency_rule') as string) || null,
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
