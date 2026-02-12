'use server'

import { createClient } from '@/lib/supabase/server'

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export async function createNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = 'info',
    link?: string
) {
    const supabase = await createClient()

    try {
        const { error } = await supabase.from('notifications').insert({
            user_id: userId,
            title,
            message,
            type,
            link,
            read: false,
        })

        if (error) throw error
        return { success: true }
    } catch (error) {
        console.error('Error creating notification:', error)
        return { success: false, error }
    }
}

export async function markNotificationAsRead(notificationId: string) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', notificationId)

        if (error) throw error
        return { success: true }
    } catch (error) {
        console.error('Error marking notification as read:', error)
        return { success: false, error }
    }
}

export async function notifyAllAdmins(
    title: string,
    message: string,
    type: NotificationType = 'info',
    link?: string
) {
    const supabase = await createClient()

    try {
        // 1. Get all admin user IDs
        const { data: admins, error: adminError } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('role', 'admin')

        if (adminError) throw adminError
        if (!admins || admins.length === 0) return { success: true, count: 0 }

        // 2. Create notifications for each admin
        const notifications = admins.map(admin => ({
            user_id: admin.user_id,
            title,
            message,
            type,
            link,
            read: false,
        }))

        const { error: insertError } = await supabase
            .from('notifications')
            .insert(notifications)

        if (insertError) throw insertError

        return { success: true, count: admins.length }
    } catch (error) {
        console.error('Error notifying admins:', error)
        return { success: false, error }
    }
}

export async function deleteAllNotifications() {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { error, count } = await supabase
            .from('notifications')
            .delete({ count: 'exact' })
            .eq('user_id', user.id)

        if (error) throw error
        return { success: true, count }
    } catch (error) {
        console.error('Error deleting all notifications:', error)
        return { success: false, error }
    }
}
