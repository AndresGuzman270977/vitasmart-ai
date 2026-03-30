"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "../app/lib/supabase";
import { signOutUser } from "../app/lib/auth";
import { getCurrentUserProfile } from "../app/lib/profile";
import {
  getPlanLabel,
  normalizePlan,
  type UserPlan,
} from "../app/lib/planLimits";

type NavbarUser = {
  id: string;
  email?: string;
};

type NavbarProfile = {
  plan?: UserPlan | string | null;
  subscription_status?: string | null;
  cancel_at_period_end?: boolean | null;
};

export default function Navbar() {
  const [user, setUser] = useState<NavbarUser | null>(null);
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(
    null
  );
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;

    async function resolveProfileSafe() {
      try {
        const profile = (await getCurrentUserProfile()) as NavbarProfile | null;

        return {
          plan: normalizePlan(profile?.plan),
          subscriptionStatus: profile?.subscription_status ?? null,
          cancelAtPeriodEnd: Boolean(profile?.cancel_at_period_end),
        };
      } catch (error) {
        console.error("Navbar: no se pudo cargar el perfil del usuario:", error);
        return {
          plan: "free" as UserPlan,
          subscriptionStatus: null,
          cancelAtPeriodEnd: false,
        };
      }
    }

    async function loadUser() {
      try {
        const {
          data: { user: currentUser },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          console.error("Navbar getUser error:", error);
        }

        if (!mounted) return;

        if (currentUser) {
          setUser({
            id: currentUser.id,
            email: currentUser.email,
          });

          setLoading(false);

          const profile = await resolveProfileSafe();

          if (mounted) {
            setUserPlan(profile.plan);
            setSubscriptionStatus(profile.subscriptionStatus);
            setCancelAtPeriodEnd(profile.cancelAtPeriodEnd);
          }
        } else {
          setUser(null);
          setUserPlan(null);
          setSubscriptionStatus(null);
          setCancelAtPeriodEnd(false);
          setLoading(false);
        }
      } catch (error) {
        console.error("Navbar loadUser error:", error);

        if (mounted) {
          setUser(null);
          setUserPlan(null);
          setSubscriptionStatus(null);
          setCancelAtPeriodEnd(false);
          setLoading(false);
        }
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return;

        setTimeout(async () => {
          if (!mounted) return;

          try {
            if (session?.user) {
              setUser({
                id: session.user.id,
                email: session.user.email,
              });
              setLoading(false);

              const profile = await resolveProfileSafe();

              if (mounted) {
                setUserPlan(profile.plan);
                setSubscriptionStatus(profile.subscriptionStatus);
                setCancelAtPeriodEnd(profile.cancelAtPeriodEnd);
              }
            } else {
              setUser(null);
              setUserPlan(null);
              setSubscriptionStatus(null);
              setCancelAtPeriodEnd(false);
              setLoading(false);
            }
          } catch (error) {
            console.error("Navbar auth state error:", error);

            if (mounted) {
              setUser(null);
              setUserPlan("free");
              setSubscriptionStatus(null);
              setCancelAtPeriodEnd(false);
              setLoading(false);
            }
          }
        }, 0);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleLogout() {
    try {
      setSigningOut(true);
      await signOutUser();
      setUser(null);
      setUserPlan(null);
      setSubscriptionStatus(null);
      setCancelAtPeriodEnd(false);
      setMenuOpen(false);
      window.location.href = "/";
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    } finally {
      setSigningOut(false);
    }
  }

  const userLabel = getUserLabel(user?.email);

  const subscriptionStatusLabel = (() => {
    if (!subscriptionStatus) return "Sin suscripción activa";

    if (subscriptionStatus === "active") {
      return cancelAtPeriodEnd
        ? "Activa · cancelación programada"
        : "Activa";
    }

    if (subscriptionStatus === "trialing") return "En prueba";
    if (subscriptionStatus === "past_due") return "Pago pendiente";
    if (subscriptionStatus === "payment_failed") return "Pago fallido";
    if (subscriptionStatus === "canceled") return "Cancelada";
    if (subscriptionStatus === "checkout_completed") {
      return "Procesando activación";
    }

    return subscriptionStatus;
  })();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-slate-900"
        >
          VitaSmart AI
        </Link>

        <nav className="flex flex-wrap items-center gap-2">
          <NavLink href="/dashboard" label="Dashboard" />
          <NavLink href="/quiz" label="Quiz" />
          <NavLink href="/history" label="History" />
          <NavLink href="/marketplace" label="Marketplace" />
          <NavLink href="/pricing" label="Pricing" />

          {loading ? (
            <div className="rounded-lg px-4 py-2 text-sm text-slate-500">
              Cargando...
            </div>
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  {userLabel.initials}
                </div>

                <div className="hidden text-left sm:block">
                  <div className="max-w-[160px] truncate font-medium text-slate-900">
                    {userLabel.name}
                  </div>
                  <div className="max-w-[160px] truncate text-xs text-slate-500">
                    {user.email}
                  </div>
                </div>

                {userPlan && (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase text-slate-700">
                    {getPlanLabel(userPlan)}
                  </span>
                )}

                <span className="text-xs text-slate-500">▾</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                  <div className="border-b border-slate-100 px-3 py-3">
                    <div className="text-sm font-semibold text-slate-900">
                      {userLabel.name}
                    </div>
                    <div className="mt-1 truncate text-xs text-slate-500">
                      {user.email}
                    </div>

                    {userPlan && (
                      <div className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase text-slate-700">
                        Plan {getPlanLabel(userPlan)}
                      </div>
                    )}

                    <div className="mt-2 text-xs text-slate-500">
                      Estado: {subscriptionStatusLabel}
                    </div>
                  </div>

                  <div className="py-2">
                    <MenuLink
                      href="/dashboard"
                      label="Ir al dashboard"
                      onClick={() => setMenuOpen(false)}
                    />
                    <MenuLink
                      href="/history"
                      label="Ver historial"
                      onClick={() => setMenuOpen(false)}
                    />
                    <MenuLink
                      href="/quiz"
                      label="Nuevo análisis"
                      onClick={() => setMenuOpen(false)}
                    />
                    <MenuLink
                      href="/marketplace"
                      label="Marketplace"
                      onClick={() => setMenuOpen(false)}
                    />
                    <MenuLink
                      href="/pricing"
                      label="Gestionar plan"
                      onClick={() => setMenuOpen(false)}
                    />
                  </div>

                  {userPlan === "free" && (
                    <div className="border-t border-slate-100 px-3 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Mejora tu experiencia
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        Desbloquea IA avanzada, más historial y marketplace
                        inteligente.
                      </p>
                      <Link
                        href="/pricing"
                        onClick={() => setMenuOpen(false)}
                        className="mt-3 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        Ver planes
                      </Link>
                    </div>
                  )}

                  {userPlan === "pro" && (
                    <div className="border-t border-slate-100 px-3 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Siguiente salto recomendado
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        Premium te da una experiencia más completa y más
                        refinada.
                      </p>
                      <Link
                        href="/pricing"
                        onClick={() => setMenuOpen(false)}
                        className="mt-3 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        Pasar a Premium
                      </Link>
                    </div>
                  )}

                  <div className="border-t border-slate-100 px-2 pt-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={signingOut}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {signingOut ? "Saliendo..." : "Cerrar sesión"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
    >
      {label}
    </Link>
  );
}

function MenuLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
    >
      {label}
    </Link>
  );
}

function getUserLabel(email?: string) {
  if (!email) {
    return { name: "Usuario", initials: "U" };
  }

  const local = email.split("@")[0];
  const name = local.charAt(0).toUpperCase() + local.slice(1);

  return {
    name,
    initials: local.substring(0, 2).toUpperCase(),
  };
}