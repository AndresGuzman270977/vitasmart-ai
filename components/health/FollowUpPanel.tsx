// components/health/FollowUpPanel.tsx

"use client";

type FollowUpPanelProps = {
  professionalFollowUpAdvice: string;
};

export default function FollowUpPanel({
  professionalFollowUpAdvice,
}: FollowUpPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">
        Follow-up guidance
      </h2>
      <p className="mt-3 text-sm leading-7 text-slate-700">
        {professionalFollowUpAdvice}
      </p>
    </section>
  );
}