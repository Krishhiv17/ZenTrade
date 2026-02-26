'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type TagCategory = 'market_condition' | 'entry_model' | 'psychology' | 'pd_array' | 'entry_confluence' | 'dol' | 'mistake'

export interface CustomTag {
    id: string
    tag_category: TagCategory
    tag_name: string
    sentiment: 'positive' | 'negative' | null
    is_favorite: boolean
}

export async function getUserTags(category?: TagCategory): Promise<CustomTag[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    let query = supabase
        .from('user_custom_tags')
        .select('*')
        .eq('user_id', user.id)
        .order('tag_name', { ascending: true })

    if (category) {
        query = query.eq('tag_category', category)
    }

    const { data, error } = await query
    if (error) {
        console.error('Error fetching custom tags:', error.message)
        return []
    }

    return data ?? []
}

export async function createCustomTag(
    category: TagCategory,
    name: string,
    sentiment: 'positive' | 'negative' | null = null,
    isFavorite: boolean = false
): Promise<{ success: boolean; tag?: CustomTag; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const cleanName = name.trim()
    if (!cleanName) return { success: false, error: 'Tag name cannot be empty.' }

    const { data, error } = await supabase
        .from('user_custom_tags')
        .insert({
            user_id: user.id,
            tag_category: category,
            tag_name: cleanName,
            sentiment,
            is_favorite: isFavorite
        })
        .select()
        .single()

    if (error) {
        // Handle unique constraint violation gracefully
        if (error.code === '23505') {
            return { success: false, error: 'You already have a tag with this name.' }
        }
        return { success: false, error: error.message }
    }

    return { success: true, tag: data }
}

export async function toggleTagFavorite(
    tagId: string,
    isFavorite: boolean
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { error } = await supabase
        .from('user_custom_tags')
        .update({ is_favorite: isFavorite })
        .eq('id', tagId)
        .eq('user_id', user.id)

    if (error) {
        return { success: false, error: error.message }
    }

    return { success: true }
}
