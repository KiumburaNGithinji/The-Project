"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Mark from "@/components/Mark";
import { completeOnboarding } from "@/app/welcome/actions";

type Step = {
  title: string;
  body: string;
  points?: string[];
};

const STEPS: Step[] = [
  {
    title: "The Project",
    body: "The whole day-trading system, lecture by lecture, with the homework that goes with it. Here is what to expect before you start.",
  },
  {
    title: "Lectures know what you actually watched",
    body: "Progress is measured from the parts of a video that really played, in five-second slices — not from a timer.",
    points: [
      "Skipping to the end will not mark a lecture complete.",
      "Ninety percent watched marks it done.",
      "Your place is saved as you go, so you can stop and come back.",
    ],
  },
  {
    title: "Homework comes in four shapes",
    body: "Each lecture can carry work that proves you can use it, not just that you sat through it.",
    points: [
      "Marked-up chart screenshots, kept private to you and your mentor.",
      "A trade journal entry in your own words.",
      "A quiz, graded the moment you submit it.",
      "A checkbox, for the ones you simply confirm.",
    ],
  },
  {
    title: "Your mentor sees where you are",
    body: "How far you have got and what you have handed in, so the feedback you get is about your work rather than a guess. Nothing you submit is visible to other students.",
  },
];

export default function WelcomeFlow({
  name,
  demo = false,
}: {
  name: string;
  demo?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  function next() {
    setErr(null);

    if (!last) {
      setStep((s) => s + 1);
      return;
    }

    if (demo) {
      setErr("Preview — nothing saved. Sign in for the real thing.");
      return;
    }

    start(async () => {
      const res = await completeOnboarding();
      if (res.error) {
        setErr(res.error);
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  function skip() {
    if (demo) {
      router.push("/preview");
      return;
    }
    start(async () => {
      await completeOnboarding();
      router.push("/");
      router.refresh();
    });
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center text-center">
          <Mark className="h-16 w-16" animate={step === 0} />
          {step === 0 && (
            <p className="mt-4 text-sm text-muted">Welcome, {name}.</p>
          )}
        </div>

        <div key={step} className="step-in mt-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            {current.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {current.body}
          </p>

          {current.points && (
            <ul className="mt-4 space-y-2">
              {current.points.map((p) => (
                <li key={p} className="flex gap-2.5 text-sm text-muted">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                  />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {err && (
          <p className="mt-4 rounded-md border-l-2 border-danger bg-danger/10 px-3 py-2 text-sm">
            {err}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between">
          <div className="flex gap-1.5" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span
                key={s.title}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-5 bg-accent" : "w-1.5 bg-border-strong"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-muted transition hover:text-foreground"
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              disabled={pending}
              className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-ink transition hover:bg-accent-hover disabled:opacity-40"
            >
              {pending ? "…" : last ? "Start watching" : "Next"}
            </button>
          </div>
        </div>

        <button
          onClick={skip}
          disabled={pending}
          className="mt-6 block w-full text-center text-xs text-muted-dim transition hover:text-muted disabled:opacity-40"
        >
          Skip the tour
        </button>
      </div>
    </main>
  );
}
