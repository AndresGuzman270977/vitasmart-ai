import { supabase } from "../lib/supabase";

function sanitizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

function sanitizePassword(password: string) {
  return String(password || "");
}

export async function signUpWithEmail(email: string, password: string) {
  const safeEmail = sanitizeEmail(email);
  const safePassword = sanitizePassword(password);

  return await supabase.auth.signUp({
    email: safeEmail,
    password: safePassword,
  });
}

export async function signInWithEmail(email: string, password: string) {
  const safeEmail = sanitizeEmail(email);
  const safePassword = sanitizePassword(password);

  return await supabase.auth.signInWithPassword({
    email: safeEmail,
    password: safePassword,
  });
}

export async function signOutUser() {
  return await supabase.auth.signOut();
}

export async function getCurrentUser() {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Error getting current user:", error.message);
      return null;
    }

    return user ?? null;
  } catch (error: any) {
    console.error(
      "Unexpected error getting current user:",
      error?.message || error
    );
    return null;
  }
}

export async function getCurrentSession() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Error getting current session:", error.message);
      return null;
    }

    return session ?? null;
  } catch (error: any) {
    console.error(
      "Unexpected error getting current session:",
      error?.message || error
    );
    return null;
  }
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("No hay un usuario autenticado.");
  }

  return user;
}