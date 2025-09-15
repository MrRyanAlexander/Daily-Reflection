import React, { useMemo, useRef, useState } from "react";

/**
 * Daily Reflection – Minimal React UI that matches the described flow:
 *   1) Write  2) See  3) Fix
 *
 * Tailwind-first styling via classNames. To preview nicely here (without your Vite/Tailwind build),
 * we also include a tiny inline <style> fallback that approximates the dark-pink teen theme.
 *
 * Wire the submit handler to your serverless endpoint at /api/evaluate (examples provided in chat).
 */

export default function App() {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"overview" | "focus">("overview");
  const [result, setResult] = useState<EvalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const minSentences = 3;

  // naive sentence count: split on punctuation; you can replace with a proper sentence tokenizer later
  const sentenceCount = useMemo(() => {
    const s = text
      .replace(/\s+/g, " ")
      .trim()
      .split(/[.!?]+\s+/)
      .filter(Boolean);
    return s.length === 1 && s[0] === "" ? 0 : s.length;
  }, [text]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    setResult(null);
    try {
      const r = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          locale: "en",
          goals: ["tell day", "feelings", "next action"],
          level: "simple_ENGLISH_B1", // default target reading level
        }),
      });
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      const data = (await r.json()) as EvalResult;
      setResult(data);
    } catch (err: any) {
      // For local preview without a backend, fall back to a tiny mock so you can see the UI.
      console.warn("Falling back to mock evaluate:", err?.message);
      setResult(mockEvaluate(text));
      setError(
        "Using demo feedback because the server endpoint is not available. Wire /api/evaluate to OpenAI when you deploy."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-pink-50/40 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col items-center">
      {/* Inline fallback styles so the preview looks close even without Tailwind build */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;600;800&family=Nunito:wght@400;600;800&display=swap');
        :root { color-scheme: light dark; }
        .brand-gradient { background: linear-gradient(135deg,#ec4899 0%,#a21caf 100%); }
        .card { backdrop-filter: blur(8px); }
      `}</style>

      <header className="w-full brand-gradient text-white">
        <div className="mx-auto max-w-4xl px-4 py-5 flex items-center justify-between">
          <h1 className="font-bold text-2xl" style={{ fontFamily: "Baloo 2, system-ui" }}>
            Daily Reflection
          </h1>
          <div className="flex items-center gap-2 text-sm">
            <span className="opacity-90 hidden sm:inline">Write • See • Fix</span>
            <ModeToggle mode={mode} setMode={setMode} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-6 grid md:grid-cols-2 gap-6">
        {/* LEFT: Write box */}
        <section className="card rounded-2xl border border-pink-200/60 dark:border-pink-900/40 bg-white/80 dark:bg-neutral-900/50 shadow-sm">
          <form onSubmit={onSubmit} className="p-4 sm:p-6 flex flex-col gap-4">
            <label htmlFor="entry" className="text-sm font-semibold text-pink-700 dark:text-pink-300" style={{ fontFamily: "Nunito, system-ui" }}>
              Tell me about your day, how it felt, and what you’ll do next.
            </label>
            <textarea
              id="entry"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write at least 3–4 sentences. Keep it honest and clear."
              className="min-h-[220px] resize-vertical rounded-xl border border-pink-300/70 dark:border-pink-800/60 bg-white dark:bg-neutral-900 px-4 py-3 outline-none focus:ring-4 focus:ring-pink-300/40 text-base leading-7"
              style={{ fontFamily: "Nunito, system-ui" }}
              aria-describedby="entry-help"
            />
            <div id="entry-help" className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <Meter value={Math.min(100, Math.round((sentenceCount / minSentences) * 100))} />
                <span>
                  {sentenceCount} sentence{sentenceCount === 1 ? "" : "s"} • minimum {minSentences}
                </span>
              </div>
              <button
                type="submit"
                disabled={submitting || sentenceCount < minSentences}
                className="inline-flex items-center justify-center rounded-xl bg-pink-600 hover:bg-pink-700 disabled:bg-pink-400 text-white px-4 py-2 font-semibold shadow-sm focus:outline-none focus:ring-4 focus:ring-pink-300/40"
              >
                {submitting ? "Checking…" : "Submit"}
              </button>
            </div>
          </form>
        </section>

        {/* RIGHT: Feedback */}
        <section className="flex flex-col gap-4">
          <div className="card rounded-2xl border border-pink-200/60 dark:border-pink-900/40 bg-white/80 dark:bg-neutral-900/50 shadow-sm">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg font-bold text-pink-700 dark:text-pink-300" style={{ fontFamily: "Baloo 2, system-ui" }}>Your original</h2>
              <p className="mt-2 text-sm opacity-80" style={{ fontFamily: "Nunito, system-ui" }}>We always show your words first, unchanged.</p>
              <OriginalPreview text={text} issues={result?.issues ?? []} mode={mode} />
            </div>
          </div>

          <div className="card rounded-2xl border border-pink-200/60 dark:border-pink-900/40 bg-white/80 dark:bg-neutral-900/50 shadow-sm">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg font-bold text-pink-700 dark:text-pink-300" style={{ fontFamily: "Baloo 2, system-ui" }}>Today’s fixes</h2>
              {result ? (
                <div className="mt-3 flex flex-col gap-3">
                  {result.topTips.length === 0 ? (
                    <p className="text-sm opacity-80" style={{ fontFamily: "Nunito, system-ui" }}>No major fixes today. Nice work! Try polishing your style with a stronger feeling word.</p>
                  ) : (
                    result.topTips.map((tip, i) => (
                      <TipCard key={i} tip={tip} mode={mode} />
                    ))
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm opacity-80" style={{ fontFamily: "Nunito, system-ui" }}>Submit to see clear, compact feedback you can act on in under two minutes.</p>
              )}
            </div>
          </div>

          <div className="card rounded-2xl border border-pink-200/60 dark:border-pink-900/40 bg-white/80 dark:bg-neutral-900/50 shadow-sm">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg font-bold text-pink-700 dark:text-pink-300" style={{ fontFamily: "Baloo 2, system-ui" }}>One example</h2>
              {result?.example ? (
                <ExampleCompare example={result.example} />
              ) : (
                <p className="mt-2 text-sm opacity-80" style={{ fontFamily: "Nunito, system-ui" }}>We’ll show one corrected version of your own sentence with the changes bolded.
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="text-xs sm:text-sm text-yellow-900 bg-yellow-100/80 border border-yellow-300 rounded-xl px-3 py-2">
              {error}
            </div>
          )}
        </section>
      </main>

      <footer className="w-full py-6 text-center text-xs opacity-70" style={{ fontFamily: "Nunito, system-ui" }}>
        Gentle loop: write • see • fix
      </footer>
    </div>
  );
}

// ---------- Components ----------

function ModeToggle({ mode, setMode }: { mode: "overview" | "focus"; setMode: (m: any) => void }) {
  return (
    <div className="flex items-center gap-1 bg-white/15 rounded-xl p-1 border border-white/20">
      {(["overview", "focus"] as const).map((m) => (
        <button
          key={m}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
            mode === m ? "bg-white/90 text-pink-700" : "text-white/90 hover:bg-white/10"
          }`}
          onClick={() => setMode(m)}
          aria-pressed={mode === m}
        >
          {m === "overview" ? "Overview" : "Focus"}
        </button>
      ))}
    </div>
  );
}

function Meter({ value }: { value: number }) {
  return (
    <div className="h-2 w-24 bg-pink-200/70 dark:bg-pink-900/40 rounded-full overflow-hidden" aria-hidden>
      <div className="h-full bg-pink-600" style={{ width: `${value}%` }} />
    </div>
  );
}

function OriginalPreview({ text, issues, mode }: { text: string; issues: Issue[]; mode: "overview" | "focus" }) {
  if (!text) {
    return (
      <p className="mt-3 text-base leading-7 bg-white/70 dark:bg-neutral-900/40 border border-pink-200/60 dark:border-pink-900/40 rounded-xl p-3">
        Your writing shows here after you submit.
      </p>
    );
  }

  // Build highlighted segments from issues
  const segments = buildSegments(text, issues);

  return (
    <div className="mt-3 text-base leading-7 bg-white/70 dark:bg-neutral-900/40 border border-pink-200/60 dark:border-pink-900/40 rounded-xl p-3 whitespace-pre-wrap">
      {segments.map((seg, i) => {
        const cls = seg.type === "plain" ? "" : seg.type === "spell" ? "bg-yellow-200/80 dark:bg-yellow-700/40" : seg.type === "grammar" ? "bg-blue-200/70 dark:bg-blue-800/40" : seg.type === "clarity" ? "bg-purple-200/70 dark:bg-purple-800/40" : "bg-red-200/70 dark:bg-red-800/40";
        return (
          <span key={i} className={`rounded-sm px-0.5 ${cls}`} title={seg.tip || undefined}>
            {seg.text}
          </span>
        );
      })}
    </div>
  );
}

function TipCard({ tip, mode }: { tip: Tip; mode: "overview" | "focus" }) {
  return (
    <div className="rounded-xl border border-pink-200/70 dark:border-pink-800/50 bg-white/80 dark:bg-neutral-900/60 p-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-pink-600 shrink-0" aria-hidden />
        <div>
          <p className="text-sm font-bold" style={{ fontFamily: "Nunito, system-ui" }}>{tip.title}</p>
          <p className="text-sm opacity-80 mt-1" style={{ fontFamily: "Nunito, system-ui" }}>{tip.why}</p>
          <div className="mt-2 grid gap-2">
            {tip.examples.map((ex, i) => (
              <div key={i} className="rounded-lg bg-pink-50/70 dark:bg-neutral-800/70 border border-pink-200/70 dark:border-pink-800/50 p-2">
                <p className="text-xs opacity-70" style={{ fontFamily: "Nunito, system-ui" }}>Try it like this</p>
                <p className="text-sm mt-1" style={{ fontFamily: "Nunito, system-ui" }}>
                  <em className="not-italic">{ex.before}</em>
                  <span className="mx-1 opacity-50">→</span>
                  <strong>{ex.after}</strong>
                </p>
              </div>
            ))}
          </div>
          {mode === "focus" && (
            <button className="mt-3 inline-flex items-center gap-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold px-3 py-1.5">
              Fix this with me
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ExampleCompare({ example }: { example: ExamplePair }) {
  return (
    <div className="mt-3 grid gap-2">
      <div className="rounded-xl border border-pink-200/70 dark:border-pink-800/50 bg-white/80 dark:bg-neutral-900/60 p-3">
        <p className="text-xs opacity-70" style={{ fontFamily: "Nunito, system-ui" }}>Yours</p>
        <p className="text-sm mt-1 whitespace-pre-wrap" style={{ fontFamily: "Nunito, system-ui" }}>{example.before}</p>
      </div>
      <div className="rounded-xl border border-pink-200/70 dark:border-pink-800/50 bg-white/80 dark:bg-neutral-900/60 p-3">
        <p className="text-xs opacity-70" style={{ fontFamily: "Nunito, system-ui" }}>Clearer</p>
        <p className="text-sm mt-1 whitespace-pre-wrap" style={{ fontFamily: "Nunito, system-ui" }}>
          {example.afterParts.map((part, i) => (
            <span key={i} className={part.bold ? "font-extrabold" : undefined}>{part.text}</span>
          ))}
        </p>
      </div>
    </div>
  );
}

// ---------- Types & helpers ----------

type IssueType = "spell" | "grammar" | "clarity" | "structure";

type Issue = {
  type: IssueType;
  start: number; // inclusive index into original text
  end: number;   // exclusive
  tip?: string;  // short one-liner for tooltip
};

type Tip = {
  title: string; // What’s the issue (plain language)
  why: string;   // Why it matters (one sentence)
  examples: { before: string; after: string }[]; // Try it like this
};

type ExamplePair = {
  before: string;
  afterParts: { text: string; bold?: boolean }[]; // parts with bolded changes
};

type EvalResult = {
  issues: Issue[];
  topTips: Tip[];
  example?: ExamplePair;
};

function buildSegments(text: string, issues: Issue[]) {
  const markers = new Array<{ idx: number; issue?: Issue; open?: boolean }>();
  for (const it of issues) {
    markers.push({ idx: it.start, issue: it, open: true });
    markers.push({ idx: it.end, issue: it, open: false });
  }
  markers.sort((a, b) => a.idx - b.idx || Number(b.open) - Number(a.open));

  const segs: { text: string; type: "plain" | IssueType; tip?: string }[] = [];
  let cursor = 0;
  let stack: Issue[] = [];
  for (const m of markers) {
    if (m.idx > cursor) {
      // push the plain or current-issue segment
      const active = stack[stack.length - 1];
      const type = active ? active.type : "plain";
      const tip = active?.tip;
      segs.push({ text: text.slice(cursor, m.idx), type, tip });
      cursor = m.idx;
    }
    if (m.open) stack.push(m.issue!);
    else stack = stack.filter((x) => x !== m.issue);
  }
  if (cursor < text.length) {
    const active = stack[stack.length - 1];
    const type = active ? active.type : "plain";
    const tip = active?.tip;
    segs.push({ text: text.slice(cursor), type, tip });
  }
  return segs;
}

function mockEvaluate(text: string): EvalResult {
  // A tiny, obviously fake evaluation so you can see the UI before wiring a backend.
  const firstPeriod = Math.max(0, text.indexOf("."));
  const issues: Issue[] = [];
  if (/\bi\s+was\b/i.test(text)) {
    const m = text.match(/\bi\s+was\b/i);
    if (m?.index != null) {
      issues.push({ type: "grammar", start: m.index, end: m.index + m[0].length, tip: "Capitalize ‘I’." });
    }
  }
  if (/\bteh\b/i.test(text)) {
    const m = text.match(/\bteh\b/i);
    if (m?.index != null) issues.push({ type: "spell", start: m.index, end: m.index + m[0].length, tip: "Spelling: ‘the’." });
  }
  if (firstPeriod === -1 && text.length > 0) {
    issues.push({ type: "clarity", start: 0, end: Math.min(60, text.length), tip: "Add clear sentence breaks." });
  }
  const topTips: Tip[] = [
    {
      title: "Connect what happened to how you felt",
      why: "Connecting events to feelings makes your story easier to understand.",
      examples: [
        { before: "I finished my homework.", after: "I finished my homework, and I felt proud because it was hard." },
      ],
    },
  ];
  const example: ExamplePair = {
    before: text.split(/(?<=[.!?])/)[0] || "today i was tired but i study",
    afterParts: [
      { text: "Today ", bold: false },
      { text: "I", bold: true },
      { text: " felt tired, but I finished science and ", bold: false },
      { text: "I", bold: true },
      { text: " will review vocab after dinner.", bold: false },
    ],
  };
  return { issues, topTips, example };
}
