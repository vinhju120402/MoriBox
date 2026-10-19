'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { getSupabase } from '../lib/supabase';
import { Role, isRole, isStaff } from '../lib/permissions';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  disabled?: boolean;
  joinedAt?: string; // ISO timestamp
}

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  role: string;
  disabled?: boolean;
  created_at: string;
}

const toUser = (r: ProfileRow): AuthUser => ({
  id: r.id,
  name: r.name,
  email: r.email,
  role: isRole(r.role) ? r.role : 'customer',
  disabled: !!r.disabled,
  joinedAt: r.created_at,
});

// ── Shared auth store ────────────────────────────────────────────────
// Every useAuth() consumer reads the same Supabase session, so login/logout
// in one component is reflected everywhere immediately.
interface AuthState {
  user: AuthUser | null;
  hasLoaded: boolean;
}

const SERVER_STATE: AuthState = { user: null, hasLoaded: false };
let state: AuthState = SERVER_STATE;
let started = false;
const listeners = new Set<() => void>();

function setState(next: AuthState) {
  state = next;
  listeners.forEach(l => l());
}

async function loadProfile(userId: string | undefined) {
  if (!userId) {
    setState({ user: null, hasLoaded: true });
    return;
  }
  const supabase = getSupabase();
  // Password accepted but the one-time code not entered yet (AAL1 with a factor
  // set up): not logged in as far as the app is concerned. The session is kept so
  // the code step on the login page can finish it.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    setState({ user: null, hasLoaded: true });
    return;
  }
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle<ProfileRow>();
  if (data?.disabled) {
    await supabase.auth.signOut();
    setState({ user: null, hasLoaded: true });
    return;
  }
  setState({ user: data ? toUser(data) : null, hasLoaded: true });
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const supabase = getSupabase();
  supabase.auth.getSession().then(({ data }) => loadProfile(data.session?.user.id));
  supabase.auth.onAuthStateChange((_event, session) => {
    // Don't await Supabase calls inside this callback (it can deadlock) — defer.
    setTimeout(() => { void loadProfile(session?.user.id); }, 0);
  });
}

function subscribe(cb: () => void) {
  start();
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

const getSnapshot = () => state;
const getServerSnapshot = () => SERVER_STATE;

export type AuthError =
  | 'invalid_credentials' | 'email_not_confirmed' | 'exists' | 'weak_password' | 'unknown'
  | 'mfa_required' | 'invalid_code' | 'disabled';

function mapError(message: string): AuthError {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'invalid_credentials';
  if (m.includes('not confirmed')) return 'email_not_confirmed';
  if (m.includes('already registered') || m.includes('already been registered')) return 'exists';
  if (m.includes('password')) return 'weak_password';
  return 'unknown';
}

export function useAuth() {
  const { user, hasLoaded } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Returns null on success, or an error code.
  const login = useCallback(async (email: string, password: string): Promise<AuthError | null> => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return mapError(error.message);
    const { data: profile } = await supabase.from('profiles').select('disabled').eq('id', data.user.id).maybeSingle();
    if (profile?.disabled) {
      await supabase.auth.signOut();
      return 'disabled';
    }
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') return 'mfa_required';
    return null;
  }, []);

  // Second step of a login for accounts with two-factor authentication.
  const verifyMfa = useCallback(async (code: string): Promise<AuthError | null> => {
    const supabase = getSupabase();
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp.find(f => f.status === 'verified');
    if (!factor) return 'unknown';
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
    if (error) return 'invalid_code';
    await loadProfile((await supabase.auth.getSession()).data.session?.user.id);
    return null;
  }, []);

  // Returns 'ok' (signed in), 'confirm' (check email to finish), or an error code.
  const register = useCallback(async (name: string, email: string, password: string): Promise<'ok' | 'confirm' | AuthError> => {
    const { data, error } = await getSupabase().auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    });
    if (error) return mapError(error.message);
    // Supabase returns a fake user with no identities when the email is taken.
    if (data.user && data.user.identities?.length === 0) return 'exists';
    return data.session ? 'ok' : 'confirm';
  }, []);

  const logout = useCallback(async () => {
    await getSupabase().auth.signOut();
  }, []);

  // Only the display name is editable — the email is the login identity.
  const updateProfile = useCallback(async (name: string): Promise<'ok' | 'invalid' | 'error'> => {
    const trimmed = name.trim();
    if (!user || !trimmed) return 'invalid';
    const { error } = await getSupabase().from('profiles').update({ name: trimmed }).eq('id', user.id);
    if (error) return 'error';
    setState({ ...state, user: { ...user, name: trimmed } });
    return 'ok';
  }, [user]);

  // Server-side RPC (security definer) — a browser can't delete auth users itself.
  const deleteAccount = useCallback(async (): Promise<boolean> => {
    if (!user || isStaff(user.role)) return false;
    const { error } = await getSupabase().rpc('delete_my_account');
    if (error) return false;
    await getSupabase().auth.signOut();
    return true;
  }, [user]);

  return { user, isLoggedIn: !!user, role: user?.role, isAdmin: user?.role === 'admin', isStaff: isStaff(user?.role), hasLoaded, login, verifyMfa, register, logout, updateProfile, deleteAccount };
}

// Admin-only: every registered profile (RLS returns just your own row to non-admins),
// plus setRole() to change roles - enforced again server-side by set_user_role().
export function useAllProfiles() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    let cancelled = false;
    getSupabase()
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!cancelled && data) setUsers((data as ProfileRow[]).map(toUser));
      });
    return () => { cancelled = true; };
  }, [user?.role, version]);

  const setRole = useCallback(async (userId: string, role: Role): Promise<{ ok: true } | { ok: false; error: string }> => {
    const { error } = await getSupabase().rpc('set_user_role', { p_user_id: userId, p_role: role });
    if (error) return { ok: false, error: error.message };
    setVersion(v => v + 1);
    return { ok: true };
  }, []);

  const setDisabled = useCallback(async (userId: string, disabled: boolean): Promise<{ ok: true } | { ok: false; error: string }> => {
    const { error } = await getSupabase().rpc('set_user_disabled', { p_user_id: userId, p_disabled: disabled });
    if (error) return { ok: false, error: error.message };
    setVersion(v => v + 1);
    return { ok: true };
  }, []);

  return { users: user?.role === 'admin' ? users : [], setRole, setDisabled };
}
