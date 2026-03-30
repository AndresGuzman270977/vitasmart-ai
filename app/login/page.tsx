"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signInWithEmail, signUpWithEmail } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { ensureUserProfile } from "../lib/profile";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-8 lg:grid-cols-2">
              <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
                <div className="mb-4 inline-flex rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">
                  VitaSmart AI · Auth
                </div>

                <h1 className="text-3xl font-bold text-slate-900">
                  Cargando acceso...
                </h1>

                <p className="mt-3 text-slate-600">
                  Estamos preparando tu experiencia de inicio de sesión.
                </p>
              </section>

              <section className="rounded-3xl bg-slate-900 p-8 text-white shadow-sm">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                  Lo que desbloqueas
                </div>

                <h2 className="mt-4 text-3xl font-bold">
                  Una experiencia que crece contigo
                </h2>

                <p className="mt-4 leading-7 text-slate-300">
                  Historial, IA avanzada, marketplace inteligente y una
                  experiencia pensada para ayudarte a progresar con continuidad.
                </p>
              </section>
            </div>
          </div>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  const nextPath = useMemo(() => {
    const raw = searchParams.get("next");
    if (!raw || !raw.startsWith("/")) return "/dashboard";
    if (raw.startsWith("//")) return "/dashboard";
    return raw;
  }, [searchParams]);

  useEffect(() => {
    let ignore = false;

    async function checkSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!ignore && session?.user) {
          router.replace("/dashboard");
        }
      } catch (error) {
        console.error("Error verificando sesión:", error);
      } finally {
        if (!ignore) {
          setCheckingSession(false);
        }
      }
    }

    checkSession();

    return () => {
      ignore = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const { data, error } = await signUpWithEmail(email, password);

        if (error) throw error;

        if (data.session?.user) {
          await ensureUserProfile();
          await new Promise((res) => setTimeout(res, 300));
          router.replace(nextPath);
          return;
        }

        setMessage(
          "Cuenta creada. Si la confirmación de correo está activa, revisa tu email antes de iniciar sesión."
        );
        return;
      }

      const { data, error } = await signInWithEmail(email, password);

      if (error) throw error;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error("No se pudo establecer la sesión.");
      }

      await ensureUserProfile();
      await new Promise((res) => setTimeout(res, 300));

      router.replace(nextPath);
    } catch (error: any) {
      console.error("Auth submit error:", error);
      setMessage(
        translateAuthError(
          error?.message || "Ocurrió un error al intentar autenticarte."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  const headline = useMemo(() => {
    return mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta";
  }, [mode]);

  const subheadline = useMemo(() => {
    return mode === "login"
      ? "Entra a tu dashboard, revisa tu progreso y sigue construyendo una versión más fuerte y más consciente de tu salud."
      : "Empieza gratis, guarda tu historial y prepárate para desbloquear una experiencia mucho más valiosa.";
  }, [mode]);

  const authNarrative = useMemo(() => {
    return mode === "login"
      ? "Tu cuenta conecta tu análisis, tu historial y tu progreso dentro de una sola experiencia continua."
      : "Crear tu cuenta convierte un análisis puntual en una experiencia con memoria, seguimiento y más valor a lo largo del tiempo.";
  }, [mode]);

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <div className="mb-4 inline-flex rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">
                VitaSmart AI · Auth
              </div>
              <h1 className="text-3xl font-bold text-slate-900">
                Verificando sesión...
              </h1>
              <p className="mt-3 text-slate-600">
                Estamos comprobando si ya tienes una sesión activa.
              </p>
            </div>

            <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                VitaSmart AI
              </div>
              <h2 className="mt-4 text-3xl font-bold">
                Tu salud mejora cuando entiendes mejor tus patrones
              </h2>
              <p className="mt-4 leading-7 text-slate-300">
                Health Score, historial, recomendaciones inteligentes y una
                experiencia pensada para ayudarte a progresar con claridad.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 inline-flex rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">
              VitaSmart AI · Auth
            </div>

            <h1 className="text-3xl font-bold text-slate-900">{headline}</h1>

            <p className="mt-3 text-slate-600">{subheadline}</p>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">
                Qué ganas al entrar
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {authNarrative}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Correo
                </label>
                <input
                  type="email"
                  className="mt-1 w-full rounded-xl border border-slate-300 p-3 outline-none transition focus:border-slate-900"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Contraseña
                </label>
                <input
                  type="password"
                  className="mt-1 w-full rounded-xl border border-slate-300 p-3 outline-none transition focus:border-slate-900"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
              >
                {loading
                  ? "Procesando..."
                  : mode === "login"
                  ? "Entrar"
                  : "Crear cuenta"}
              </button>
            </form>

            {message && (
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                {message}
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                setMode((prev) => (prev === "login" ? "signup" : "login"))
              }
              className="mt-6 text-sm font-medium text-slate-700 underline"
            >
              {mode === "login"
                ? "¿No tienes cuenta? Crear una"
                : "¿Ya tienes cuenta? Iniciar sesión"}
            </button>

            <div className="mt-8 border-t border-slate-200 pt-6">
              <Link
                href="/"
                className="text-sm font-medium text-slate-600 underline"
              >
                Volver al inicio
              </Link>
            </div>
          </section>

          <section className="grid gap-6">
            <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Lo que desbloqueas
              </div>

              <h2 className="mt-4 text-3xl font-bold">
                Una experiencia que crece contigo
              </h2>

              <p className="mt-4 leading-7 text-slate-300">
                VitaSmart AI no está pensada para darte un resultado aislado.
                Está pensada para ayudarte a ver tu evolución y tomar mejores
                decisiones con continuidad.
              </p>

              <div className="mt-6 grid gap-3">
                <DarkValueRow text="Health Score y análisis de perfil" />
                <DarkValueRow text="Historial de resultados en el tiempo" />
                <DarkValueRow text="IA avanzada en Pro y Premium" />
                <DarkValueRow text="Marketplace inteligente y experiencia más profunda" />
              </div>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-2xl font-bold text-slate-900">
                Por qué vale la pena crear tu cuenta
              </h3>

              <p className="mt-4 leading-7 text-slate-600">
                Incluso si empiezas en Free, tu cuenta te permite guardar tu
                avance, construir historial y estar listo para pasar a una
                experiencia mucho más completa cuando quieras.
              </p>

              <div className="mt-6 grid gap-3">
                <LightValueRow text="Empiezas gratis" />
                <LightValueRow text="Guardas tus análisis" />
                <LightValueRow text="Puedes mejorar a Pro o Premium después" />
              </div>

              <div className="mt-6">
                <Link
                  href="/pricing"
                  className="inline-flex rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Comparar planes
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function DarkValueRow({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4 text-slate-200 ring-1 ring-white/10">
      {text}
    </div>
  );
}

function LightValueRow({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 text-slate-700 ring-1 ring-slate-200">
      {text}
    </div>
  );
}

function translateAuthError(message: string) {
  if (message.includes("Invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }

  if (message.includes("Email not confirmed")) {
    return "Tu correo aún no ha sido confirmado.";
  }

  if (message.includes("User already registered")) {
    return "Ese correo ya está registrado.";
  }

  if (message.includes("Password should be at least")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }

  if (message.includes("signup is disabled")) {
    return "El registro de usuarios está deshabilitado en Supabase.";
  }

  if (message.includes("No se pudo establecer la sesión.")) {
    return "No se pudo establecer la sesión. Intenta nuevamente.";
  }

  return message;
}