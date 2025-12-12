'use server'

import { createClient } from '@/lib/supabase/server'
import { ProfileCompletionFormData } from '@/lib/validations'
import { revalidatePath } from 'next/cache'

/**
 * Upload profile photo to Supabase Storage
 */
export async function uploadProfilePhoto(file: File, userId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Get file extension
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `profile-photos/${fileName}`

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('profile-photos')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('Upload error:', error)
      return { success: false, error: error.message }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      return { success: false, error: 'Failed to get public URL' }
    }

    return { success: true, url: urlData.publicUrl }
  } catch (error: any) {
    console.error('Profile photo upload error:', error)
    return { success: false, error: error.message || 'Failed to upload profile photo' }
  }
}

/**
 * Complete profile by updating participant record
 */
export async function completeProfile(
  data: ProfileCompletionFormData,
  profilePhotoUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Authentication error:', userError)
      return { success: false, error: 'User not authenticated' }
    }

    // Verify participant record exists and belongs to this user
    const { data: existingParticipant, error: fetchError } = await supabase
      .from('participants')
      .select('id, user_id')
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      console.error('Error fetching participant:', fetchError)
      return { 
        success: false, 
        error: 'Participant record not found. Please contact support.' 
      }
    }

    if (!existingParticipant) {
      return { 
        success: false, 
        error: 'Participant record not found. Please contact support.' 
      }
    }

    // Verify user_id matches (extra security check)
    if (existingParticipant.user_id !== user.id) {
      console.error('User ID mismatch:', { 
        participantUserId: existingParticipant.user_id, 
        authUserId: user.id 
      })
      return { 
        success: false, 
        error: 'Authorization error. Please try logging in again.' 
      }
    }

    // Prepare update data - handle optional fields
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    // Only set fields if they have values (handle optional fields)
    if (data.address !== undefined && data.address !== null && data.address.trim() !== '') {
      updateData.address = data.address
    }
    if (data.schoolAddress !== undefined && data.schoolAddress !== null && data.schoolAddress.trim() !== '') {
      updateData.school_address = data.schoolAddress
    }
    if (data.class !== undefined && data.class !== null && data.class.trim() !== '') {
      updateData.class = data.class
    }
    if (data.dateOfBirth !== undefined && data.dateOfBirth !== null && data.dateOfBirth.trim() !== '') {
      updateData.date_of_birth = data.dateOfBirth
    }

    // Add profile photo URL if provided
    if (profilePhotoUrl) {
      updateData.profile_photo_url = profilePhotoUrl
    }

    // Mark as completed if at least one field was filled
    // Or if user explicitly submitted (even with empty fields, they've interacted with the form)
    updateData.profile_completed = true

    // Update participant record using the participant ID to ensure we're updating the correct record
    const { error: updateError, data: updatedData } = await supabase
      .from('participants')
      .update(updateData)
      .eq('id', existingParticipant.id)
      .eq('user_id', user.id) // Double check user_id matches
      .select()

    if (updateError) {
      console.error('Profile update error:', {
        error: updateError,
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        userId: user.id,
        participantId: existingParticipant.id
      })
      return { 
        success: false, 
        error: updateError.message || 'Failed to update profile. Please try again.' 
      }
    }

    if (!updatedData || updatedData.length === 0) {
      console.error('No rows updated:', { userId: user.id, participantId: existingParticipant.id })
      return { 
        success: false, 
        error: 'Failed to update profile. No changes were made.' 
      }
    }

    // Revalidate dashboard page
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error: any) {
    console.error('Complete profile error:', error)
    return { success: false, error: error.message || 'Failed to complete profile' }
  }
}

/**
 * Update profile information
 */
export async function updateProfile(
  data: {
    name: string
    gender: string
    email?: string
    phone?: string
    address?: string
    schoolAddress?: string
    class?: string
    dateOfBirth?: string
    profilePhoto?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Authentication error:', userError)
      return { success: false, error: 'User not authenticated' }
    }

    // Verify participant record exists and belongs to this user
    const { data: existingParticipant, error: fetchError } = await supabase
      .from('participants')
      .select('id, user_id')
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingParticipant) {
      console.error('Error fetching participant:', fetchError)
      return { 
        success: false, 
        error: 'Participant record not found. Please contact support.' 
      }
    }

    // Verify user_id matches (extra security check)
    if (existingParticipant.user_id !== user.id) {
      console.error('User ID mismatch:', { 
        participantUserId: existingParticipant.user_id, 
        authUserId: user.id 
      })
      return { 
        success: false, 
        error: 'Authorization error. Please try logging in again.' 
      }
    }

    // Prepare update data
    const updateData: any = {
      name: data.name,
      gender: data.gender,
      updated_at: new Date().toISOString(),
    }

    // Add optional fields if provided
    if (data.email) updateData.email = data.email
    if (data.phone) updateData.phone = data.phone
    if (data.address !== undefined) updateData.address = data.address || null
    if (data.schoolAddress !== undefined) updateData.school_address = data.schoolAddress || null
    if (data.class !== undefined) updateData.class = data.class || null
    if (data.dateOfBirth) updateData.date_of_birth = data.dateOfBirth || null
    if (data.profilePhoto) updateData.profile_photo_url = data.profilePhoto

    // Update participant record using the participant ID to ensure we're updating the correct record
    const { error: updateError, data: updatedData } = await supabase
      .from('participants')
      .update(updateData)
      .eq('id', existingParticipant.id)
      .eq('user_id', user.id) // Double check user_id matches
      .select()

    if (updateError) {
      console.error('Profile update error:', {
        error: updateError,
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        userId: user.id,
        participantId: existingParticipant.id
      })
      return { 
        success: false, 
        error: updateError.message || 'Failed to update profile. Please try again.' 
      }
    }

    if (!updatedData || updatedData.length === 0) {
      console.error('No rows updated:', { userId: user.id, participantId: existingParticipant.id })
      return { 
        success: false, 
        error: 'Failed to update profile. No changes were made.' 
      }
    }

    // Revalidate pages
    revalidatePath('/dashboard')
    revalidatePath('/profile/edit')

    return { success: true }
  } catch (error: any) {
    console.error('Update profile error:', error)
    return { success: false, error: error.message || 'Failed to update profile' }
  }
}

/**
 * Check if profile is completed
 */
export async function checkProfileCompletion(): Promise<{ completed: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { completed: false, error: 'User not authenticated' }
    }

    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('profile_completed')
      .eq('user_id', user.id)
      .single()

    if (participantError) {
      return { completed: false, error: participantError.message }
    }

    return { completed: participant?.profile_completed || false }
  } catch (error: any) {
    console.error('Check profile completion error:', error)
    return { completed: false, error: error.message }
  }
}

