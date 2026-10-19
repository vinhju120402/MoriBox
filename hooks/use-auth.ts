'use client';

import { useEffect, useState } from 'react';

export interface AuthUser {
  name: string;
  email: string;
  isAdmin?: boolean;
  joinedAt?: string; // ISO timestamp, stamped at registration
}

const SESSION_KEY = 'moribox_user';
const REGISTERED_KEY = 'moribox_registered_users';

// Seeded admin account — lets /admin be reached without a separate
// registration flow. Password isn't checked anywhere in this mock auth
// system (see login below), so any password works here too, same as
// for every other account.
const ADMIN_EMAIL = 'admin@moribox.com';
const ADMIN_USER: AuthUser = { name: 'Quản trị viên', email: ADMIN_EMAIL, isAdmin: true };

// Exported so the admin "Người dùng" page can list every registered account —
// there's no backend, so this localStorage list is the only source of truth.
export function getRegisteredUsers(): AuthUser[] {
  try {
    const raw = localStorage.getItem(REGISTERED_KEY);
    const users: AuthUser[] = raw ? JSON.parse(raw) : [];
    if (!users.some(u => u.email.toLowerCase() === ADMIN_EMAIL)) {
      const seeded = [...users, ADMIN_USER];
      localStorage.setItem(REGISTERED_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return users;
  } catch {
    return [ADMIN_USER];
  }
}

// Local-only mock auth (no backend). "Registered" accounts and the current
// session both live in localStorage, so login can honestly check whether an
// account exists instead of always pretending to succeed.
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setUser(JSON.parse(saved));
    } catch {
      setUser(null);
    }
    setHasLoaded(true);
  }, []);

  // Returns false if no account exists with this email — caller should
  // prompt the user to register instead.
  const login = (email: string): boolean => {
    const account = getRegisteredUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!account) return false;
    setUser(account);
    localStorage.setItem(SESSION_KEY, JSON.stringify(account));
    return true;
  };

  // Returns false if an account with this email already exists.
  const register = (newUser: AuthUser): boolean => {
    const users = getRegisteredUsers();
    if (users.some(u => u.email.toLowerCase() === newUser.email.toLowerCase())) return false;
    const stamped: AuthUser = { ...newUser, joinedAt: new Date().toISOString() };
    localStorage.setItem(REGISTERED_KEY, JSON.stringify([...users, stamped]));
    setUser(stamped);
    localStorage.setItem(SESSION_KEY, JSON.stringify(stamped));
    return true;
  };

  // Updates name/email on the session and the registered-accounts list.
  const updateProfile = (name: string, email: string): 'ok' | 'invalid' | 'exists' => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!user || !trimmedName || !/^\S+@\S+\.\S+$/.test(trimmedEmail)) return 'invalid';
    const users = getRegisteredUsers();
    const taken = users.some(u =>
      u.email.toLowerCase() === trimmedEmail.toLowerCase() && u.email.toLowerCase() !== user.email.toLowerCase());
    if (taken) return 'exists';
    // The seeded admin is identified by its email, so that stays fixed.
    const nextEmail = user.isAdmin ? user.email : trimmedEmail;
    const updated: AuthUser = { ...user, name: trimmedName, email: nextEmail };
    localStorage.setItem(
      REGISTERED_KEY,
      JSON.stringify(users.map(u => (u.email.toLowerCase() === user.email.toLowerCase() ? updated : u))),
    );
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    setUser(updated);
    return 'ok';
  };

  // Removes the account from this device and ends the session. The seeded
  // admin can't be deleted (it would just be re-seeded).
  const deleteAccount = (): boolean => {
    if (!user || user.isAdmin) return false;
    const remaining = getRegisteredUsers().filter(u => u.email.toLowerCase() !== user.email.toLowerCase());
    localStorage.setItem(REGISTERED_KEY, JSON.stringify(remaining));
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return { user, isLoggedIn: !!user, isAdmin: !!user?.isAdmin, hasLoaded, login, register, logout, updateProfile, deleteAccount };
}
