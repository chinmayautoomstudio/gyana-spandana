import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Parse FormData
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPG, PNG, and WebP are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }

    // Get file extension
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
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
      console.error('Storage upload error:', {
        error: error,
        message: error.message,
        statusCode: (error as any).statusCode,
        errorCode: (error as any).error,
        userId: user.id,
        filePath: filePath,
        fileSize: file.size,
        fileType: file.type,
      })
      
      // Provide more helpful error messages
      let errorMessage = error.message
      if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
        errorMessage = 'Storage bucket RLS policy error. Please ensure storage bucket policies are configured correctly. See docs/fix-storage-bucket-rls.sql'
      } else if (error.message?.includes('Bucket not found')) {
        errorMessage = 'Storage bucket "profile-photos" not found. Please create it in Supabase Storage.'
      } else if (error.message?.includes('new row violates')) {
        errorMessage = 'Storage bucket RLS policy violation. Please run the SQL script in docs/fix-storage-bucket-rls.sql'
      }
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { success: false, error: 'Failed to get public URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl
    })
  } catch (error: any) {
    console.error('Profile photo upload error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload profile photo' },
      { status: 500 }
    )
  }
}

