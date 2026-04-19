import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * SECURITY (VULN-05): Detect actual MIME type from file content magic bytes.
 * We do NOT trust file.type (client-controlled) or file extension.
 * Magic byte signatures:
 *   JPEG : FF D8 FF
 *   PNG  : 89 50 4E 47 0D 0A 1A 0A
 *   WebP : 52 49 46 46 ?? ?? ?? ?? 57 45 42 50
 */
type AllowedMime = 'image/jpeg' | 'image/png' | 'image/webp'

function detectMimeFromBytes(bytes: Uint8Array): AllowedMime | null {
  if (bytes.length < 12) return null

  // JPEG: starts with FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'

  // PNG: starts with 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return 'image/png'

  // WebP: RIFF????WEBP
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return 'image/webp'

  return null
}

const MIME_TO_EXT: Record<AllowedMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

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

    // Convert File to buffer first so we can inspect magic bytes
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // SECURITY (VULN-05): Validate actual file content via magic bytes — NOT file.type (client-controlled)
    const detectedMime = detectMimeFromBytes(buffer)
    if (!detectedMime) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPG, PNG, and WebP images are allowed.' },
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

    // SECURITY (VULN-05): Derive extension from validated server-side MIME — NOT from client filename
    const fileExt = MIME_TO_EXT[detectedMime]
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const filePath = `profile-photos/${fileName}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('profile-photos')
      .upload(filePath, buffer, {
        contentType: detectedMime,
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
        errorMessage = 'Storage bucket RLS policy error. Please ensure storage bucket policies are configured correctly. See docs/sql/fix-storage-bucket-rls.sql'
      } else if (error.message?.includes('Bucket not found')) {
        errorMessage = 'Storage bucket "profile-photos" not found. Please create it in Supabase Storage.'
      } else if (error.message?.includes('new row violates')) {
        errorMessage = 'Storage bucket RLS policy violation. Please run the SQL script in docs/sql/fix-storage-bucket-rls.sql'
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
  } catch (error: unknown) {
    console.error('[API /upload/profile-photo] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload profile photo. Please try again.' },
      { status: 500 }
    )
  }
}

