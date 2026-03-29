-- supabase/migrations/20260330_vitasmart_health_upgrade.sql

begin;

-- =========================================================
-- 1) EXTENSIÓN BASE
-- =========================================================
create extension if not exists pgcrypto;

-- =========================================================
-- 2) TABLA health_assessments
--    Ampliación segura de la tabla existente
-- =========================================================

alter table if exists public.health_assessments
  add column if not exists assessment_version text,
  add column if not exists plan text,
  add column if not exists ai_mode text,
  add column if not exists generated_by text,

  add column if not exists weight_kg numeric,
  add column if not exists height_cm numeric,
  add column if not exists waist_cm numeric,
  add column if not exists bmi numeric,

  add column if not exists stress_level integer,
  add column if not exists sleep_hours numeric,
  add column if not exists sleep_quality integer,
  add column if not exists fatigue_level integer,
  add column if not exists focus_difficulty integer,

  add column if not exists physical_activity integer,
  add column if not exists alcohol_use integer,
  add column if not exists smoking_status text,
  add column if not exists sun_exposure integer,
  add column if not exists hydration_level integer,
  add column if not exists ultra_processed_food_level integer,

  add column if not exists blood_pressure_known boolean default false,
  add column if not exists systolic_bp integer,
  add column if not exists diastolic_bp integer,

  add column if not exists main_goal text,

  add column if not exists base_conditions jsonb default '[]'::jsonb,
  add column if not exists current_medications jsonb default '[]'::jsonb,
  add column if not exists current_supplements jsonb default '[]'::jsonb,

  add column if not exists health_score integer,
  add column if not exists sleep_score integer,
  add column if not exists stress_score integer,
  add column if not exists energy_score integer,
  add column if not exists focus_score integer,
  add column if not exists metabolic_score integer,

  add column if not exists confidence_level text,
  add column if not exists confidence_explanation text,

  add column if not exists executive_summary text,
  add column if not exists clinical_style_summary text,
  add column if not exists score_narrative text,
  add column if not exists professional_followup_advice text,

  add column if not exists strengths jsonb default '[]'::jsonb,
  add column if not exists main_drivers jsonb default '[]'::jsonb,
  add column if not exists priority_actions jsonb default '[]'::jsonb,
  add column if not exists risk_signals jsonb default '[]'::jsonb,

  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- =========================================================
-- 3) RESTRICCIONES SUAVES / CHECKS
-- =========================================================

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'health_assessments_ai_mode_check'
  ) then
    alter table public.health_assessments
      add constraint health_assessments_ai_mode_check
      check (ai_mode is null or ai_mode in ('basic', 'advanced'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'health_assessments_plan_check'
  ) then
    alter table public.health_assessments
      add constraint health_assessments_plan_check
      check (plan is null or plan in ('free', 'pro', 'premium'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'health_assessments_confidence_level_check'
  ) then
    alter table public.health_assessments
      add constraint health_assessments_confidence_level_check
      check (
        confidence_level is null
        or confidence_level in ('high', 'moderate', 'limited')
      );
  end if;
end $$;

-- =========================================================
-- 4) TABLA assessment_biomarkers
-- =========================================================

create table if not exists public.assessment_biomarkers (
  id uuid primary key default gen_random_uuid(),

  assessment_id bigint not null references public.health_assessments(id) on delete cascade,

  fasting_glucose numeric,
  hba1c numeric,
  total_cholesterol numeric,
  hdl numeric,
  ldl numeric,
  triglycerides numeric,
  vitamin_d numeric,
  b12 numeric,
  ferritin numeric,
  tsh numeric,
  creatinine numeric,
  ast numeric,
  alt numeric,
  lab_date date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assessment_biomarkers_assessment_id
  on public.assessment_biomarkers(assessment_id);

-- =========================================================
-- 5) TABLA assessment_recommendations
--    Snapshot de ingredientes recomendados
-- =========================================================

create table if not exists public.assessment_recommendations (
  id uuid primary key default gen_random_uuid(),

  assessment_id bigint not null references public.health_assessments(id) on delete cascade,

  ingredient_slug text not null,
  ingredient_name text not null,

  match_score integer,
  safety_decision text,

  why_matched jsonb default '[]'::jsonb,
  cautions jsonb default '[]'::jsonb,

  rank integer,
  is_primary boolean default false,

  evidence_level text,
  evidence_summary text,
  scientific_context text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assessment_recommendations_assessment_id
  on public.assessment_recommendations(assessment_id);

create index if not exists idx_assessment_recommendations_ingredient_slug
  on public.assessment_recommendations(ingredient_slug);

-- =========================================================
-- 6) TABLA recommendation_product_options
--    Snapshot de productos mostrados por cada ingrediente recomendado
-- =========================================================

create table if not exists public.recommendation_product_options (
  id uuid primary key default gen_random_uuid(),

  assessment_recommendation_id uuid not null
    references public.assessment_recommendations(id)
    on delete cascade,

  product_slug text,
  product_name text not null,
  brand text,
  manufacturer text,

  budget_tier text,
  fit_score integer,
  quality_score integer,
  value_score integer,

  price_label text,
  estimated_cost_per_day_usd numeric,

  image_url text,
  buy_url text,

  quality_seals jsonb default '[]'::jsonb,
  quality_notes jsonb default '[]'::jsonb,

  why_for_user text,
  science_summary text,
  lab_quality_summary text,
  how_to_take text,
  restrictions_summary text,
  side_effects_summary text,
  budget_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recommendation_product_options_assessment_recommendation_id
  on public.recommendation_product_options(assessment_recommendation_id);

create index if not exists idx_recommendation_product_options_product_slug
  on public.recommendation_product_options(product_slug);

-- =========================================================
-- 7) FUNCIÓN updated_at
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_health_assessments_updated_at on public.health_assessments;
create trigger trg_health_assessments_updated_at
before update on public.health_assessments
for each row execute function public.set_updated_at();

drop trigger if exists trg_assessment_biomarkers_updated_at on public.assessment_biomarkers;
create trigger trg_assessment_biomarkers_updated_at
before update on public.assessment_biomarkers
for each row execute function public.set_updated_at();

drop trigger if exists trg_assessment_recommendations_updated_at on public.assessment_recommendations;
create trigger trg_assessment_recommendations_updated_at
before update on public.assessment_recommendations
for each row execute function public.set_updated_at();

drop trigger if exists trg_recommendation_product_options_updated_at on public.recommendation_product_options;
create trigger trg_recommendation_product_options_updated_at
before update on public.recommendation_product_options
for each row execute function public.set_updated_at();

-- =========================================================
-- 8) ÍNDICES EXTRA EN health_assessments
-- =========================================================

create index if not exists idx_health_assessments_user_id_created_at
  on public.health_assessments(user_id, created_at desc);

create index if not exists idx_health_assessments_plan
  on public.health_assessments(plan);

create index if not exists idx_health_assessments_ai_mode
  on public.health_assessments(ai_mode);

create index if not exists idx_health_assessments_main_goal
  on public.health_assessments(main_goal);

-- =========================================================
-- 9) RLS (solo si la tabla ya usa auth.uid())
-- =========================================================

alter table public.assessment_biomarkers enable row level security;
alter table public.assessment_recommendations enable row level security;
alter table public.recommendation_product_options enable row level security;

-- assessment_biomarkers
drop policy if exists "Users can view own assessment biomarkers" on public.assessment_biomarkers;
create policy "Users can view own assessment biomarkers"
on public.assessment_biomarkers
for select
using (
  exists (
    select 1
    from public.health_assessments ha
    where ha.id = assessment_biomarkers.assessment_id
      and ha.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert own assessment biomarkers" on public.assessment_biomarkers;
create policy "Users can insert own assessment biomarkers"
on public.assessment_biomarkers
for insert
with check (
  exists (
    select 1
    from public.health_assessments ha
    where ha.id = assessment_biomarkers.assessment_id
      and ha.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own assessment biomarkers" on public.assessment_biomarkers;
create policy "Users can update own assessment biomarkers"
on public.assessment_biomarkers
for update
using (
  exists (
    select 1
    from public.health_assessments ha
    where ha.id = assessment_biomarkers.assessment_id
      and ha.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own assessment biomarkers" on public.assessment_biomarkers;
create policy "Users can delete own assessment biomarkers"
on public.assessment_biomarkers
for delete
using (
  exists (
    select 1
    from public.health_assessments ha
    where ha.id = assessment_biomarkers.assessment_id
      and ha.user_id = auth.uid()
  )
);

-- assessment_recommendations
drop policy if exists "Users can view own assessment recommendations" on public.assessment_recommendations;
create policy "Users can view own assessment recommendations"
on public.assessment_recommendations
for select
using (
  exists (
    select 1
    from public.health_assessments ha
    where ha.id = assessment_recommendations.assessment_id
      and ha.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert own assessment recommendations" on public.assessment_recommendations;
create policy "Users can insert own assessment recommendations"
on public.assessment_recommendations
for insert
with check (
  exists (
    select 1
    from public.health_assessments ha
    where ha.id = assessment_recommendations.assessment_id
      and ha.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own assessment recommendations" on public.assessment_recommendations;
create policy "Users can update own assessment recommendations"
on public.assessment_recommendations
for update
using (
  exists (
    select 1
    from public.health_assessments ha
    where ha.id = assessment_recommendations.assessment_id
      and ha.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own assessment recommendations" on public.assessment_recommendations;
create policy "Users can delete own assessment recommendations"
on public.assessment_recommendations
for delete
using (
  exists (
    select 1
    from public.health_assessments ha
    where ha.id = assessment_recommendations.assessment_id
      and ha.user_id = auth.uid()
  )
);

-- recommendation_product_options
drop policy if exists "Users can view own recommendation product options" on public.recommendation_product_options;
create policy "Users can view own recommendation product options"
on public.recommendation_product_options
for select
using (
  exists (
    select 1
    from public.assessment_recommendations ar
    join public.health_assessments ha on ha.id = ar.assessment_id
    where ar.id = recommendation_product_options.assessment_recommendation_id
      and ha.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert own recommendation product options" on public.recommendation_product_options;
create policy "Users can insert own recommendation product options"
on public.recommendation_product_options
for insert
with check (
  exists (
    select 1
    from public.assessment_recommendations ar
    join public.health_assessments ha on ha.id = ar.assessment_id
    where ar.id = recommendation_product_options.assessment_recommendation_id
      and ha.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own recommendation product options" on public.recommendation_product_options;
create policy "Users can update own recommendation product options"
on public.recommendation_product_options
for update
using (
  exists (
    select 1
    from public.assessment_recommendations ar
    join public.health_assessments ha on ha.id = ar.assessment_id
    where ar.id = recommendation_product_options.assessment_recommendation_id
      and ha.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own recommendation product options" on public.recommendation_product_options;
create policy "Users can delete own recommendation product options"
on public.recommendation_product_options
for delete
using (
  exists (
    select 1
    from public.assessment_recommendations ar
    join public.health_assessments ha on ha.id = ar.assessment_id
    where ar.id = recommendation_product_options.assessment_recommendation_id
      and ha.user_id = auth.uid()
  )
);

commit;