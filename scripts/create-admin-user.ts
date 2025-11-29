/**
 * Script to create an admin user in Supabase Auth
 * 
 * Usage:
 *   Set SUPABASE_SERVICE_ROLE_KEY in your environment, then run:
 *   npx tsx scripts/create-admin-user.ts
 * 
 * Or add to package.json scripts and run:
 *   npm run create-admin
 */

import { createAdminClient } from '../lib/supabase/admin'

const ADMIN_EMAIL = 'chinmay.nayak@autoomstudio.com'
const ADMIN_PASSWORD = 'Chinmay@2000'
const ADMIN_NAME = 'Chinmay Kumar Nayak'

async function createAdminUser() {
  console.log('🚀 Starting admin user creation...\n')

  try {
    const supabase = createAdminClient()

    // Check if user already exists
    console.log(`📧 Checking if user ${ADMIN_EMAIL} already exists...`)
    const { data: existingUser, error: lookupError } = await supabase.auth.admin.listUsers()
    
    if (lookupError) {
      console.error('❌ Error checking for existing user:', lookupError.message)
      process.exit(1)
    }

    const userExists = existingUser?.users?.find(user => user.email === ADMIN_EMAIL)

    if (userExists) {
      console.log(`✅ User ${ADMIN_EMAIL} already exists. Updating to admin role...`)
      
      // Update existing user to admin
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        userExists.id,
        {
          user_metadata: {
            name: ADMIN_NAME,
            role: 'admin',
          },
        }
      )

      if (updateError) {
        console.error('❌ Error updating user:', updateError.message)
        process.exit(1)
      }

      // Create or update user_profiles record
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userExists.id,
          role: 'admin',
          name: ADMIN_NAME,
        }, {
          onConflict: 'user_id'
        })

      if (profileError) {
        console.warn('⚠️  Warning: Could not update user_profiles:', profileError.message)
        console.warn('   User metadata was updated, but profile table update failed.')
        console.warn('   This may cause issues. Please run the migration scripts.')
      }

      console.log('✅ User updated successfully!')
      console.log(`   User ID: ${updatedUser.user.id}`)
      console.log(`   Email: ${updatedUser.user.email}`)
      console.log(`   Name: ${updatedUser.user.user_metadata?.name}`)
      console.log(`   Role: ${updatedUser.user.user_metadata?.role}`)
      console.log('\n✨ Admin user is ready to use!')
      return
    }

    // Create new user
    console.log(`👤 Creating new admin user: ${ADMIN_EMAIL}...`)
    
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // Auto-confirm email so user can login immediately
      user_metadata: {
        name: ADMIN_NAME,
        role: 'admin',
      },
    })

    if (createError) {
      console.error('❌ Error creating user:', createError.message)
      process.exit(1)
    }

    if (!newUser.user) {
      console.error('❌ User creation failed: No user data returned')
      process.exit(1)
    }

    // Create user_profiles record
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: newUser.user.id,
        role: 'admin',
        name: ADMIN_NAME,
      })

    if (profileError) {
      console.warn('⚠️  Warning: Could not create user_profiles:', profileError.message)
      console.warn('   User was created in auth, but profile table insert failed.')
      console.warn('   Please run the migration scripts or manually create the profile.')
    }

    console.log('\n✅ Admin user created successfully!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📋 User Details:')
    console.log(`   User ID: ${newUser.user.id}`)
    console.log(`   Email: ${newUser.user.email}`)
    console.log(`   Name: ${newUser.user.user_metadata?.name}`)
    console.log(`   Role: ${newUser.user.user_metadata?.role}`)
    console.log(`   Email Confirmed: ${newUser.user.email_confirmed_at ? 'Yes' : 'No'}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n🔐 Login Credentials:')
    console.log(`   Email: ${ADMIN_EMAIL}`)
    console.log(`   Password: ${ADMIN_PASSWORD}`)
    console.log('\n✨ You can now login at /login and access the admin dashboard!')
    console.log('   The user will be automatically redirected to /admin after login.\n')

  } catch (error: any) {
    console.error('\n❌ Unexpected error:', error.message)
    if (error.message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      console.error('\n💡 Make sure you have set SUPABASE_SERVICE_ROLE_KEY in your .env.local file')
      console.error('   You can find it in Supabase Dashboard > Settings > API > service_role key')
    }
    process.exit(1)
  }
}

// Run the script
createAdminUser()

