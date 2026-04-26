import { AppButton, AppChrome, ModeChoiceCard, ShellCard } from "./_components/creative-studio";

export default function LandingPage() {
  return (
    <AppChrome subtitle="Creative intelligence for modern campaigns" title="Choose how you want to work">
      <div className="grid gap-5 lg:grid-cols-2">
        <ModeChoiceCard
          description="Upload one ad and get a full-page read on score, behavior probabilities, neuro signals, and AI audit reasoning."
          href="/analyze"
          title="Run analysis"
        />
        <ModeChoiceCard
          description="Place two creatives side by side, compare attention and engagement potential, and get a sharper winner call."
          href="/compare"
          title="Compare creatives"
        />
      </div>

      <ShellCard className="mt-8 p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-[#6e6e73]">Scaled workflow</p>
            <p className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-black">From input to decision, without the clutter.</p>
            <p className="mt-3 text-[16px] leading-7 text-[#6e6e73]">
              Test your creatives before allocating any budget.
            </p>
          </div>

          <div className="flex gap-3">
            <AppButton href="/analyze">Run analysis</AppButton>
            <AppButton href="/compare" subtle>
              Compare creatives
            </AppButton>
          </div>
        </div>
      </ShellCard>
    </AppChrome>
  );
}
