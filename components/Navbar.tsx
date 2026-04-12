"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "../app/lib/supabase";
import { signOutUser } from "../app/lib/auth";
import { resolveViewerState } from "../app/lib/viewer";
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

type ResolvedProfileState = {
  plan: UserPlan;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
};

const FALLBACK_PROFILE_STATE: ResolvedProfileState = {
  plan: "free",
  subscriptionStatus: null,
  cancelAtPeriodEnd: false,
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const authRefreshRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const [user, setUser] = useState<NavbarUser | null>(null);
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(
    null
  );
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const safeSetState = useCallback((fn: () => void) => {
    if (!mountedRef.current) return;
    fn();
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const resolveProfileSafe = useCallback(async (): Promise<ResolvedProfileState> => {
    try {
      const viewer = await resolveViewerState();

      const profile = (viewer.profile || null) as NavbarProfile | null;

      return {
        plan: normalizePlan(profile?.plan ?? viewer.plan),
        subscriptionStatus: profile?.subscription_status ?? null,
        cancelAtPeriodEnd: Boolean(profile?.cancel_at_period_end),
      };
    } catch (error) {
      console.error("Navbar: no se pudo cargar el perfil del usuario:", error);
      return FALLBACK_PROFILE_STATE;
    }
  }, []);

  const applyLoggedOutState = useCallback(() => {
    safeSetState(() => {
      setUser(null);
      setUserPlan(null);
      setSubscriptionStatus(null);
      setCancelAtPeriodEnd(false);
      setLoading(false);
    });
  }, [safeSetState]);

  const applyUserBaseState = useCallback(
    (sessionUser: Session["user"]) => {
      if (!sessionUser) return;

      safeSetState(() => {
        setUser({
          id: sessionUser.id,
          email: sessionUser.email,
        });
        setLoading(false);
      });
    },
    [safeSetState]
  );

  const applyResolvedProfile = useCallback(async () => {
    const profileState = await resolveProfileSafe();

    safeSetState(() => {
      setUserPlan(profileState.plan);
      setSubscriptionStatus(profileState.subscriptionStatus);
      setCancelAtPeriodEnd(profileState.cancelAtPeriodEnd);
    });
  }, [resolveProfileSafe, safeSetState]);

  const bootstrap = useCallback(async () => {
    try {
      const {
        data: { user: currentUser },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Navbar getUser error:", error);
      }

      if (!mountedRef.current) return;

      if (!currentUser) {
        applyLoggedOutState();
        return;
      }

      applyUserBaseState(currentUser);
      await applyResolvedProfile();
    } catch (error) {
      console.error("Navbar bootstrap error:", error);
      applyLoggedOutState();
    }
  }, [applyLoggedOutState, applyResolvedProfile, applyUserBaseState]);

  useEffect(() => {
    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (!mountedRef.current) return;

        if (authRefreshRef.current) {
          window.clearTimeout(authRefreshRef.current);
        }

        authRefreshRef.current = window.setTimeout(async () => {
          if (!mountedRef.current) return;

          try {
            if (!session?.user) {
              applyLoggedOutState();
              return;
            }

            applyUserBaseState(session.user);
            await applyResolvedProfile();
          } catch (error) {
            console.error("Navbar auth state error:", error);

            if (!mountedRef.current) return;

            safeSetState(() => {
              setUser(
                session?.user
                  ? {
                      id: session.user.id,
                      email: session.user.email,
                    }
                  : null
              );
              setUserPlan("free");
              setSubscriptionStatus(null);
              setCancelAtPeriodEnd(false);
              setLoading(false);
            });
          }
        }, 0);
      }
    );

    return () => {
      if (authRefreshRef.current) {
        window.clearTimeout(authRefreshRef.current);
      }

      subscription.unsubscribe();
    };
  }, [applyLoggedOutState, applyResolvedProfile, applyUserBaseState, bootstrap, safeSetState]);

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
      setMenuOpen(false);

      await signOutUser();

      safeSetState(() => {
        setUser(null);
        setUserPlan(null);
        setSubscriptionStatus(null);
        setCancelAtPeriodEnd(false);
      });

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    } finally {
      safeSetState(() => {
        setSigningOut(false);
      });
    }
  }

  const userLabel = useMemo(() => getUserLabel(user?.email), [user?.email]);

  const subscriptionStatusLabel = useMemo(() => {
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
  }, [subscriptionStatus, cancelAtPeriodEnd]);

  const planAccent =
    userPlan === "premium"
      ? "bg-violet-100 text-violet-700"
      : userPlan === "pro"
      ? "bg-sky-100 text-sky-700"
      : "bg-slate-100 text-slate-700";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-slate-900"
          >
            VitaSmart AI
          </Link>

          {userPlan && (
            <span
              className={`hidden rounded-full px-3 py-1 text-[11px] font-semibold uppercase lg:inline-flex ${planAccent}`}
            >
              {getPlanLabel(userPlan)}
            </span>
          )}
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          <NavLink href="/dashboard" label="Dashboard" currentPath={pathname} />
          <NavLink href="/quiz" label="Quiz" currentPath={pathname} />
          <NavLink href="/history" label="Historial" currentPath={pathname} />
          <NavLink
            href="/marketplace"
            label="Marketplace"
            currentPath={pathname}
          />
          <NavLink href="/pricing" label="Pricing" currentPath={pathname} />

          {loading ? (
            <div className="rounded-lg px-4 py-2 text-sm text-slate-500">
              Cargando...
            </div>
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
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
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${planAccent}`}
                  >
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
                      <div
                        className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold uppercase ${planAccent}`}
                      >
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

function NavLink({
  href,
  label,
  currentPath,
}: {
  href: string;
  label: string;
  currentPath: string;
}) {
  const active =
    currentPath === href ||
    (href !== "/" && currentPath.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-slate-900 text-white"
          : "text-slate-700 hover:bg-slate-100"
      }`}
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
  const safeLocal = local || "usuario";

  return {
    name: safeLocal.charAt(0).toUpperCase() + safeLocal.slice(1),
    initials: safeLocal.substring(0, 2).toUpperCase(),
  };
}