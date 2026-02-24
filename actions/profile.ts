'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getProfile() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (error) {
        console.error('Error fetching profile:', error)
        return null
    }
    return data
}

export async function updateProfile(data: { full_name: string; default_account_id: string | null; commission_per_rt: number }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('profiles')
        .update({
            full_name: data.full_name,
            default_account_id: data.default_account_id || null, // Ensure empty string becomes null
            commission_per_rt: data.commission_per_rt
        })
        .eq('id', user.id)

    if (error) throw new Error(error.message)

    revalidatePath('/settings')
    revalidatePath('/dashboard')
    revalidatePath('/trades/new')
}
