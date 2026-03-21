"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail, signUpWithEmail } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { ensureUserProfile } from "../lib/profile";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

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
          router.push("/dashboard");
          return;
        }

        setMessage(
          "Cuenta creada. Si la confirmación de email está activa, revisa tu correo antes de iniciar sesión."
        );
      } else {
        const { error } = await signInWithEmail(email, password);

        if (error) throw error;

        await ensureUserProfile();
        router.push("/dashboard");
      }
    } catch (error: any) {
      setMessage(translateAuthError(error?.message || "Ocurrió un error."));
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-sm">
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
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-4 inline-flex rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">
          VitaSmart AI · Auth
        </div>

        <h1 className="text-3xl font-bold text-slate-900">
          {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </h1>

        <p className="mt-3 text-slate-600">
          Guarda tu historial y accede a tu perfil de salud personalizado.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Correo
            </label>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-slate-300 p-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-slate-300 p-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
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
      </div>
    </main>
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

  return message;
}