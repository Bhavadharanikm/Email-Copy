/**
 * authGoogle.js — signing in with the company Google account.
 *
 * The same Supabase project the video analyser uses issues the session, so one
 * Google account opens both tools. This app never sees a password and never
 * stores one; it holds the access token that project hands back and sends it on
 * every API call, exactly where the old signed session used to go.
 *
 * Off until VITE_AUTH_SUPABASE_URL and VITE_AUTH_SUPABASE_ANON_KEY are set, so
 * an environment without them keeps the name-and-PIN sign-in and nothing breaks.
 */
import { createClient } from '@supabase/supabase-js'

const URL  = (import.meta.env.VITE_AUTH_SUPABASE_URL || '').replace(/\/+$/, '')
const ANON = import.meta.env.VITE_AUTH_SUPABASE_ANON_KEY || ''

export const ALLOWED_DOMAIN = (import.meta.env.VITE_AUTH_EMAIL_DOMAIN || 'hiddengem.media').toLowerCase()
export const googleAuthReady = !!(URL && ANON)

/* Its own storage key: this token is not the app's session store, and mixing
   the two would let a stale one masquerade as the other. */
export const authClient = googleAuthReady
  ? createClient(URL, ANON, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'hgm_google_auth' },
    })
  : null

export const isAllowedEmail = (email) =>
  String(email || '').trim().toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)

/** The shape the rest of the app already expects from a session. */
export function userFromGoogle(sbUser) {
  const email = String(sbUser?.email || '').trim().toLowerCase()
  const name  = String(sbUser?.user_metadata?.full_name || sbUser?.user_metadata?.name || email.split('@')[0] || '').trim()
  return { id: sbUser?.id || email, name, email, role: 'Google', isAdmin: false, via: 'google' }
}

/** Sends the browser to Google. It comes back to /login with the session in the URL. */
export async function startGoogleSignIn() {
  if (!authClient) throw new Error('Google sign-in is not configured')
  const { error } = await authClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/login`,
      queryParams: { hd: ALLOWED_DOMAIN, prompt: 'select_account' },
    },
  })
  if (error) throw error
}

export async function googleSignOut() {
  if (authClient) { try { await authClient.auth.signOut() } catch { /* already gone */ } }
}
