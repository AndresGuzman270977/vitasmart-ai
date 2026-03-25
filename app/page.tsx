"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabase";

export default function HomePage() {
  const router = useRouter();

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function checkSession() {
      try {
        if (!ignore) {
          setCheckingSession(true);
          setAuthError("");
        }

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        if (ignore) return;

        if (user) {
          setHasSession(true);
          setCheckingSession(false);
          router.replace("/dashboard");
          return;
        }

        setHasSession(false);
      } catch (error: any) {
        console.error("Error verificando sesión:", error);

        if (!ignore) {
          setHasSession(false);
          setAuthError(
            error?.message || "No se pudo verificar la sesión actual."
          );
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

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-slate-50">
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm text-slate-600">
              VitaSmart AI
            </div>

            <h1 className="mt-6 text-3xl font-bold text-slate-900 sm:text-4xl">
              Verificando tu sesión...
            </h1>

            <p className="mt-4 text-slate-600">
              Estamos comprobando si ya tienes una cuenta activa para llevarte a
              tu dashboard personal.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (hasSession) {
    return (
      <main className="min-h-screen bg-slate-50">
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm text-slate-600">
              VitaSmart AI
            </div>

            <h1 className="mt-6 text-3xl font-bold text-slate-900 sm:text-4xl">
              Redirigiendo a tu dashboard...
            </h1>

            <p className="mt-4 text-slate-600">
              Tu sesión está activa. Te estamos llevando a tu panel personal.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-1 text-sm text-slate-600 shadow-sm">
            Preventive Health Intelligence
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            Tu plataforma inteligente de salud preventiva
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Analiza tu perfil, obtén un Health Score, descubre prioridades de
            bienestar y recibe recomendaciones personalizadas de suplementos y
            hábitos con apoyo de inteligencia artificial.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/quiz"
              className="rounded-xl bg-slate-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-slate-700"
            >
              Comenzar análisis
            </Link>

            <Link
              href="/history"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ver historial
            </Link>
          </div>

          {authError && (
            <p className="mx-auto mt-6 max-w-2xl text-sm text-red-600">
              {authError}
            </p>
          )}
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          <FeatureCard
            title="Health Score"
            description="Obtén una puntuación orientativa de bienestar basada en tu perfil actual, con factores clave que influyen en tu estado general."
          />
          <FeatureCard
            title="Análisis inteligente"
            description="La plataforma interpreta sueño, estrés, edad y objetivos para generar una lectura clara y accionable de tu situación."
          />
          <FeatureCard
            title="Seguimiento continuo"
            description="Guarda tus análisis en el tiempo y observa la evolución de tu score, tendencias y cambios en tu bienestar."
          />
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Cómo funciona VitaSmart AI
            </h2>
            <p className="mt-4 text-slate-600">
              Un flujo simple, rápido y pensado para generar valor real desde el
              primer análisis.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <StepCard
              step="01"
              title="Responde el assessment"
              description="Completa el cuestionario sobre edad, estrés, sueño y objetivo principal de salud."
            />
            <StepCard
              step="02"
              title="Recibe tu análisis"
              description="La IA genera un score, interpreta tu perfil y resume tus prioridades de bienestar."
            />
            <StepCard
              step="03"
              title="Actúa y da seguimiento"
              description="Consulta recomendaciones, guarda tus resultados y revisa tu evolución en el tiempo."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-3xl bg-slate-900 px-8 py-12 text-white shadow-sm sm:px-12">
          <div className="max-w-3xl">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              Próximo nivel
            </div>

            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Convierte tus análisis en un sistema de mejora continua
            </h2>

            <p className="mt-4 text-slate-300">
              VitaSmart AI no es solo un test. Es la base de una plataforma de
              salud preventiva con historial, tendencias, recomendaciones
              inteligentes y evolución del usuario.
            </p>

            <div className="mt-8">
              <Link
                href="/quiz"
                className="inline-flex rounded-xl bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Hacer mi análisis ahora
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
      <div className="text-sm font-semibold tracking-wide text-slate-500">
        {step}
      </div>
      <h3 className="mt-3 text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 leading-7 text-slate-600">{description}</p>
    </div>
  );
}