"use client";

import Link from "next/link";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type AnalysisResponse = {
  creative_score: number;
  confidence?: "low" | "medium" | "high";
  predicted_behavior: {
    likely_action?: "scroll" | "pause" | "engage";
    scroll_probability: number;
    pause_probability: number;
    engage_probability: number;
    rationale?: string;
  };
  neuro_signals: {
    attention_intensity: number;
    cognitive_load: number;
    cognitive_load_band: string;
    emotional_salience: number;
    focus_distribution: string;
    focus_clarity: number;
    text_density: number;
    visual_complexity: number;
    text_density_score: number;
    visual_complexity_score: number;
    element_count_estimate: number;
    region_activity?: {
      amygdala: "low" | "medium" | "high";
      prefrontal_cortex: "low" | "medium" | "high";
      ventral_attention_network: "low" | "medium" | "high";
    } | null;
    [key: string]: string | number | null | Record<string, string> | undefined;
  };
  reasoning: string[];
  heatmap?: {
    primary_focus_region?: HeatmapRegion | null;
    secondary_focus?: HeatmapRegion[];
    ignored_zones?: HeatmapRegion[];
    clutter_regions?: HeatmapRegion[];
  } | null;
  ai_audit?: {
    summary: string;
    improved_reasoning: string[];
    improved_recommendations: string[];
  } | null;
};

type HeatmapRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number;
  label: string;
  reason: string;
};

type CompareResponse = {
  winner: "creative_a" | "creative_b";
  reasoning: string[];
  metric_comparison: {
    attention: { creative_a: number; creative_b: number };
    cognitive_load: { creative_a: number; creative_b: number };
    engagement: { creative_a: number; creative_b: number };
  };
};

type SingleFormState = {
  image: File | null;
  caption: string;
  budget: number;
  days: number;
};

type CompareFormState = {
  imageA: File | null;
  captionA: string;
  imageB: File | null;
  captionB: string;
  budget: number;
  days: number;
};

type PagePhase = "form" | "loading" | "result";

const BUDGET_STOPS = [
  2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000,
  15000, 16000, 17000, 18000, 19000, 20000, 21000, 22000, 23000, 24000, 25000, 26000, 27000, 28000, 29000,
  30000
] as const;

const DEMOGRAPHIC_OPTIONS = [
  "Gen Z Shoppers",
  "Millennial Professionals",
  "Parents Of Toddlers",
  "Parents Of Teens",
  "New Parents",
  "Urban Professionals",
  "Remote Workers",
  "College Students",
  "Graduate Students",
  "Young Couples",
  "Newly Married",
  "Frequent Travelers",
  "Luxury Buyers",
  "Budget-Conscious Families",
  "First-Time Home Buyers",
  "Homeowners",
  "Renters",
  "Small Business Owners",
  "Startup Founders",
  "Corporate Executives",
  "Fitness Enthusiasts",
  "Gym Members",
  "Runners",
  "Yoga Practitioners",
  "Cyclists",
  "Outdoor Adventurers",
  "Beauty Enthusiasts",
  "Skincare Shoppers",
  "Makeup Buyers",
  "Fashion-Forward Women",
  "Streetwear Fans",
  "Sneaker Collectors",
  "Tech Early Adopters",
  "Gamers",
  "Console Gamers",
  "PC Gamers",
  "Creators",
  "Photographers",
  "Video Editors",
  "Designers",
  "Coffee Lovers",
  "Foodies",
  "Healthy Eaters",
  "Plant-Based Consumers",
  "Pet Owners",
  "Dog Owners",
  "Cat Owners",
  "High-Income Households",
  "Mid-Income Households",
  "Retirees",
  "Women 18-24",
  "Women 25-34",
  "Women 35-44",
  "Men 18-24",
  "Men 25-34",
  "Men 35-44",
  "Parents With High Schoolers",
  "Career Switchers",
  "Wellness Seekers",
  "Mindfulness Practitioners"
] as const;

const behaviorBars = [
  { key: "scroll_probability", label: "Scroll", tone: "#8b8b90" },
  { key: "pause_probability", label: "Pause", tone: "#111111" },
  { key: "engage_probability", label: "Engage", tone: "#6e685f" }
] as const;

const singleFormDefault: SingleFormState = {
  image: null,
  caption: "",
  budget: 5000,
  days: 14
};

const compareFormDefault: CompareFormState = {
  imageA: null,
  captionA: "",
  imageB: null,
  captionB: "",
  budget: 5000,
  days: 14
};

function formatLabel(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatSignalValue(value: string | number | null | Record<string, string> | undefined) {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "number") {
    if (value <= 1) return `${Math.round(value * 100)}%`;
    return value.toString();
  }
  if (typeof value === "string") return value;
  return Object.entries(value)
    .map(([key, nestedValue]) => `${formatLabel(key)}: ${nestedValue}`)
    .join(" • ");
}

function buildAudiencePayload(selectedDemographics: string[]) {
  return JSON.stringify({ segments: selectedDemographics });
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function closestStopIndex(stops: readonly number[], value: number) {
  return stops.reduce((bestIndex, stop, index) => {
    const bestDistance = Math.abs(stops[bestIndex] - value);
    const nextDistance = Math.abs(stop - value);
    return nextDistance < bestDistance ? index : bestIndex;
  }, 0);
}

export function AppButton({
  children,
  href,
  onClick,
  subtle = false,
  type = "button"
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  subtle?: boolean;
  type?: "button" | "submit";
}) {
  const className = `inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium backdrop-blur transition duration-200 ${
    subtle
      ? "border-black/10 bg-white/60 text-black/80 hover:bg-white"
      : "border-black bg-black text-white hover:bg-black/92"
  }`;

  if (href) {
    return (
      <Link className={className} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={className} onClick={onClick} type={type}>
      {children}
    </button>
  );
}

export function AppChrome({
  children,
  title,
  subtitle
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <main className="min-h-screen bg-[#f4f1ee]">
      <div className="mx-auto max-w-[1280px] px-5 py-5 sm:px-8 lg:px-10">
        <header className="mb-10 flex flex-col gap-4 rounded-[30px] border border-black/5 bg-white/60 px-5 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center px-1">
            <span className="text-[28px] font-bold tracking-[-0.04em] text-black">Scaled</span>
          </div>

          <div className="flex items-center gap-3">
            <AppButton href="/" subtle>
              Home
            </AppButton>
            <AppButton subtle>History</AppButton>
          </div>
        </header>

        <div className="mb-8 max-w-3xl">
          <h1 className="text-[40px] font-semibold tracking-[-0.05em] text-black sm:text-[52px]">{title}</h1>
          <p className="mt-3 text-[17px] leading-8 text-[#6e6e73]">{subtitle}</p>
        </div>

        {children}
      </div>
    </main>
  );
}

export function ShellCard({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[28px] border border-black/5 bg-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur-xl ${className}`}>
      {children}
    </section>
  );
}

function FieldLabel({
  title,
  subtitle
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3">
      <p className="text-[15px] font-medium tracking-[-0.01em] text-black">{title}</p>
      {subtitle ? <p className="mt-1 text-sm text-[#6e6e73]">{subtitle}</p> : null}
    </div>
  );
}

export function ModeChoiceCard({
  href,
  title,
  description
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      className="rounded-[32px] border border-black/5 bg-white/72 px-8 py-8 shadow-[0_18px_50px_rgba(0,0,0,0.06)] transition duration-300 hover:-translate-y-1 hover:bg-white"
      href={href}
    >
      <div className="space-y-3">
        <div className="inline-flex rounded-full border border-black/8 bg-[#fbfaf8] px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-[#6e6e73]">
          Start here
        </div>
        <h2 className="text-[30px] font-semibold tracking-[-0.04em] text-black">{title}</h2>
        <p className="max-w-xl text-[15px] leading-7 text-[#6e6e73]">{description}</p>
      </div>
    </Link>
  );
}

function UploadPanel({
  label,
  file,
  previewUrl,
  onChange
}: {
  label: string;
  file: File | null;
  previewUrl: string | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <FieldLabel title={label} subtitle="Drop in a JPG, PNG, or WebP creative to get started." />
      <label className="block cursor-pointer rounded-[24px] border border-dashed border-black/10 bg-[#fbfaf8] p-5 transition duration-200 hover:border-black/20 hover:bg-white">
        <input accept="image/*" className="hidden" onChange={onChange} type="file" />
        <div className="flex min-h-[120px] flex-col justify-between gap-4">
          <div>
            <p className="text-base font-medium tracking-[-0.02em] text-black">{file ? file.name : "Choose creative"}</p>
            <p className="mt-1 text-sm text-[#6e6e73]">
              {file ? "Creative selected successfully." : "Tap to browse from your computer."}
            </p>
          </div>
          <div className="inline-flex w-fit rounded-full bg-black px-4 py-2 text-sm font-medium text-white">Upload creative</div>
        </div>
      </label>

      {previewUrl ? (
        <div className="mt-4 overflow-hidden rounded-[24px] border border-black/5 bg-white">
          <img alt={`${label} preview`} className="h-64 w-full object-cover" src={previewUrl} />
        </div>
      ) : null}
    </div>
  );
}

function AudiencePicker({
  selected,
  onToggle
}: {
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return DEMOGRAPHIC_OPTIONS;
    return DEMOGRAPHIC_OPTIONS.filter((option) => option.toLowerCase().includes(normalized));
  }, [search]);

  return (
    <div>
      <FieldLabel title="Customer demographics" subtitle="Pick up to 20 audience segments from a curated demographic list." />
      <div className="rounded-[24px] border border-black/8 bg-white/80 p-4">
        <button
          className="flex w-full items-center justify-between rounded-2xl border border-black/8 bg-[#f7f4f1] px-4 py-3 text-left text-[15px] text-black transition hover:border-black/20"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <span>{selected.length > 0 ? `${selected.length} demographics selected` : "Choose demographics"}</span>
          <span className={`text-sm text-[#6e6e73] transition duration-200 ${isOpen ? "rotate-180" : ""}`}>⌄</span>
        </button>

        <div className="mt-3 flex flex-wrap gap-2">
          {selected.length > 0 ? (
            selected.map((item) => (
              <button
                key={item}
                className="rounded-full bg-black px-3 py-1.5 text-sm font-medium text-white transition hover:bg-black/85"
                onClick={() => onToggle(item)}
                type="button"
              >
                {item}
              </button>
            ))
          ) : (
            <p className="text-sm text-[#6e6e73]">No demographics selected yet.</p>
          )}
        </div>

        <div className={`grid overflow-hidden transition-all duration-300 ease-out ${isOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="min-h-0">
            <input
              className="mb-3 w-full rounded-2xl border border-black/8 bg-[#f7f4f1] px-4 py-3 text-[15px] text-black transition focus:border-black/20"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search demographics"
              value={search}
            />

            <div className="max-h-72 overflow-y-auto rounded-[20px] border border-black/6 bg-[#fbfaf8] p-2">
              <div className="grid gap-2 sm:grid-cols-2">
                {filtered.map((option) => {
                  const active = selected.includes(option);
                  const disabled = !active && selected.length >= 20;

                  return (
                    <button
                      key={option}
                      className={`rounded-2xl px-4 py-3 text-left text-sm transition duration-200 ${
                        active
                          ? "bg-black text-white shadow-[0_10px_30px_rgba(0,0,0,0.16)]"
                          : disabled
                            ? "cursor-not-allowed bg-white/70 text-black/30"
                            : "bg-white text-black hover:bg-white/90"
                      }`}
                      disabled={disabled}
                      onClick={() => onToggle(option)}
                      type="button"
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm text-[#6e6e73]">{selected.length}/20 selected</p>
      </div>
    </div>
  );
}

function SliderField({
  title,
  subtitle,
  value,
  min,
  max,
  displayValue,
  inputValue,
  onInputChange,
  stops,
  onSliderChange
}: {
  title: string;
  subtitle: string;
  value: number;
  min: number;
  max: number;
  displayValue: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  stops?: readonly number[];
  onSliderChange: (value: number) => void;
}) {
  const sliderIndex = stops ? closestStopIndex(stops, value) : value;
  const sliderMax = stops ? stops.length - 1 : max;

  return (
    <div>
      <FieldLabel title={title} subtitle={subtitle} />
      <div className="rounded-[24px] border border-black/8 bg-white/80 p-5">
        <div className="flex items-center justify-between">
          <p className="text-[32px] font-semibold tracking-[-0.04em] text-black">{displayValue}</p>
          <p className="text-sm text-[#6e6e73]">
            {min.toLocaleString()} to {max.toLocaleString()}
          </p>
        </div>

        <input
          className="mt-5 w-full"
          max={sliderMax}
          min={stops ? 0 : min}
          onChange={(event) => {
            const numeric = Number(event.target.value);
            const nextValue = stops ? stops[numeric] : numeric;
            onSliderChange(nextValue);
          }}
          step={1}
          type="range"
          value={sliderIndex}
        />

        <div className="mt-5">
          <p className="mb-2 text-sm text-[#6e6e73]">Type exact amount</p>
          <div className="flex items-center rounded-2xl border border-black/8 bg-[#f7f4f1] px-4 py-3">
            <input
              className="w-full bg-transparent text-[15px] text-black"
              inputMode="numeric"
              onChange={(event) => onInputChange(event.target.value)}
              value={inputValue}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-[#6e6e73]">
        <span>{label}</span>
        <span className="font-medium text-black">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-2 rounded-full bg-black/8">
        <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ backgroundColor: tone, width: `${Math.max(8, value * 100)}%` }} />
      </div>
    </div>
  );
}

function scoreCardTone(score: number) {
  if (score < 40) {
    return {
      bg: "bg-[#fdeeee]",
      text: "text-[#b42318]",
      subtext: "text-[#d05c4b]"
    };
  }

  if (score > 75) {
    return {
      bg: "bg-[#edf8ef]",
      text: "text-[#166534]",
      subtext: "text-[#4c8d60]"
    };
  }

  return {
    bg: "bg-black",
    text: "text-white",
    subtext: "text-white/65"
  };
}

function HeatmapOverlay({
  imageUrl,
  heatmap
}: {
  imageUrl: string | null;
  heatmap?: AnalysisResponse["heatmap"];
}) {
  if (!imageUrl) return null;

  const regions = [
    ...(heatmap?.secondary_focus || []),
    ...(heatmap?.clutter_regions || []),
    ...(heatmap?.ignored_zones || []),
    ...(heatmap?.primary_focus_region ? [heatmap.primary_focus_region] : [])
  ].sort((a, b) => b.intensity - a.intensity);

  const hotspots = regions.slice(0, 4).map((region) => ({
    left: (region.x + region.width / 2) * 100,
    top: (region.y + region.height / 2) * 100,
    intensity: region.intensity
  }));

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-[26px] border border-black/6 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.95),rgba(241,237,232,0.95))]">
        <div className="relative w-full">
          <img alt="Creative heatmap" className="block w-full" src={imageUrl} />

          <div className="pointer-events-none absolute inset-0">
            {(heatmap?.ignored_zones || []).map((region, index) => (
              <div
                key={`ignored-${index}`}
                className="absolute rounded-[20px] border border-white/50 bg-[rgba(128,128,128,0.4)]"
                style={{
                  left: `${region.x * 100}%`,
                  top: `${region.y * 100}%`,
                  width: `${region.width * 100}%`,
                  height: `${region.height * 100}%`
                }}
              />
            ))}

            {(heatmap?.secondary_focus || []).map((region, index) => (
              <div
                key={`secondary-${index}`}
                className="absolute rounded-[20px] border border-white/60 bg-[radial-gradient(circle,rgba(255,199,0,0.7),rgba(255,120,0,0.5),transparent_80%)]"
                style={{
                  left: `${region.x * 100}%`,
                  top: `${region.y * 100}%`,
                  width: `${region.width * 100}%`,
                  height: `${region.height * 100}%`
                }}
              />
            ))}

            {(heatmap?.clutter_regions || []).map((region, index) => (
              <div
                key={`clutter-${index}`}
                className="absolute rounded-[20px] border border-white/60 bg-[radial-gradient(circle,rgba(255,59,48,0.8),rgba(255,149,0,0.5),transparent_80%)]"
                style={{
                  left: `${region.x * 100}%`,
                  top: `${region.y * 100}%`,
                  width: `${region.width * 100}%`,
                  height: `${region.height * 100}%`
                }}
              />
            ))}

            {heatmap?.primary_focus_region ? (
              <div
                className="absolute rounded-[22px] border border-white/70 bg-[radial-gradient(circle,rgba(52,199,89,0.75),rgba(10,132,255,0.45),transparent_85%)] shadow-[0_0_40px_rgba(52,199,89,0.4)]"
                style={{
                  left: `${heatmap.primary_focus_region.x * 100}%`,
                  top: `${heatmap.primary_focus_region.y * 100}%`,
                  width: `${heatmap.primary_focus_region.width * 100}%`,
                  height: `${heatmap.primary_focus_region.height * 100}%`
                }}
              />
            ) : null}

            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {hotspots.slice(0, -1).map((spot, index) => {
                const next = hotspots[index + 1];
                return (
                  <path
                    key={`path-${index}`}
                    d={`M ${spot.left} ${spot.top} Q ${(spot.left + next.left) / 2} ${Math.min(spot.top, next.top) - 8} ${next.left} ${next.top}`}
                    fill="none"
                    opacity="0.9"
                    stroke="rgba(255,255,255,1)"
                    strokeDasharray="3 3"
                    strokeWidth="0.4"
                  />
                );
              })}
            </svg>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-1 rounded-[18px] bg-black/62 px-4 py-3 text-xs text-white backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <span>Predictive eye-path + clutter map</span>
            <span>Warm zones = more visual pull</span>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-black/6 bg-[#fbfaf8] p-5">
        <p className="text-sm font-medium text-black">Priority guidance</p>
        <div className="mt-3 space-y-3 text-[15px] leading-7 text-[#3a3a3c]">
          <p>High-intensity regions show where the eye is likely to stop first, so the offer, product, or CTA should live near those hotspots.</p>
          <p>Redder clutter zones suggest competing elements are taking too much attention away from the conversion path.</p>
          <p>The dotted path estimates how the eye may travel between dominant visual anchors before a conversion decision is made.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from(new Map(regions.map(r => [r.label, r])).values()).slice(0, 3).map((region, index) => (
          <div key={`${region.label}-${index}`} className="rounded-[24px] border border-black/6 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-black">{formatLabel(region.label)}</p>
              <span className="rounded-full bg-black/6 px-3 py-1 text-xs text-[#6e6e73]">{Math.round(region.intensity * 100)}%</span>
            </div>
            <p className="mt-3 text-[14px] leading-6 text-[#6e6e73]">{region.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BrainScan({
  regionActivity,
  signals
}: {
  regionActivity?: AnalysisResponse["neuro_signals"]["region_activity"];
  signals: AnalysisResponse["neuro_signals"];
}) {
  const levelColor = {
    low: "#cfc7bf",
    medium: "#f5b75d",
    high: "#34c759"
  } as const;

  const glowIntensity = { low: 0, medium: 0.45, high: 0.85 } as const;

  const regions = [
    {
      key: "prefrontal_cortex",
      label: "Prefrontal Cortex",
      value: regionActivity?.prefrontal_cortex || "low",
      note: `${Math.round(signals.cognitive_load * 100)}% cognitive load shows how much thinking effort the layout asks from the viewer.`,
      expandedInfo: "The Prefrontal Cortex handles executive function and decision making. High cognitive load indicates the viewer is working hard to process the layout, text density, and visual hierarchy. If this region is overloaded, it can lead to decision fatigue and abandonment before the conversion action is reached.",
      color: "#8b5cf6"
    },
    {
      key: "amygdala",
      label: "Amygdala",
      value: regionActivity?.amygdala || "low",
      note: `${Math.round(signals.emotional_salience * 100)}% emotional salience suggests how strongly the creative may trigger emotional relevance.`,
      expandedInfo: "The Amygdala processes emotional responses and salience. A strong response here means the creative is successfully triggering an emotional reaction, which is crucial for brand recall and impulse engagement. Low activation implies the creative feels dry or purely informational.",
      color: "#f59e0b"
    },
    {
      key: "ventral_attention_network",
      label: "Ventral Attention Network",
      value: regionActivity?.ventral_attention_network || "low",
      note: `${Math.round(signals.attention_intensity * 100)}% attention intensity estimates stop power and first-glance capture.`,
      expandedInfo: "The Ventral Attention Network is responsible for bottom-up, stimulus-driven attention. It acts as a circuit breaker that interrupts ongoing cognitive processes to direct attention to unexpected or highly salient stimuli. Strong activation means the creative has excellent stopping power in a busy feed.",
      color: "#34c759"
    }
  ] as const;

  const pfcLevel = regionActivity?.prefrontal_cortex || "low";
  const amgLevel = regionActivity?.amygdala || "low";
  const vanLevel = regionActivity?.ventral_attention_network || "low";

  const [activeRegion, setActiveRegion] = useState<string | null>(null);

  return (
    <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
      <div className="relative flex items-center justify-center overflow-hidden rounded-[26px] border border-black/6 bg-[radial-gradient(circle_at_50%_40%,rgba(28,28,30,0.96),rgba(8,8,10,1))] p-8" style={{ minHeight: 360 }}>
        <svg viewBox="0 0 320 280" className="w-full max-w-[320px]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="glow-pfc" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-amg" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-van" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Brain outline */}
          <path
            d="M 65 140 C 65 75, 110 28, 165 25 C 220 22, 268 55, 278 100 C 288 145, 272 200, 238 230 C 205 258, 155 262, 125 255 C 95 248, 70 218, 62 185 C 56 160, 60 148, 65 140 Z"
            fill="#2a2a2e" stroke="#444" strokeWidth="1.2"
          />
          {/* Sulci lines */}
          <path d="M 140 32 C 145 90, 148 145, 130 200" stroke="#3d3d42" strokeWidth="0.8" fill="none" />
          <path d="M 205 38 C 198 100, 215 155, 195 215" stroke="#3d3d42" strokeWidth="0.8" fill="none" />
          <path d="M 95 85 C 130 90, 185 80, 230 88" stroke="#3d3d42" strokeWidth="0.8" fill="none" />
          <path d="M 85 145 C 115 140, 160 148, 200 140" stroke="#3d3d42" strokeWidth="0.8" fill="none" />
          <path d="M 170 55 C 175 70, 168 95, 180 110" stroke="#3d3d42" strokeWidth="0.6" fill="none" />

          {/* Prefrontal cortex region (front) */}
          <path
            d="M 68 140 C 68 90, 95 45, 135 30 C 142 28, 145 38, 142 55 L 130 140 C 110 148, 80 148, 70 143 Z"
            fill="#8b5cf6"
            opacity={activeRegion === "prefrontal_cortex" ? 1 : (activeRegion ? 0.1 : (glowIntensity[pfcLevel] || 0.12))}
            filter={pfcLevel !== "low" && !activeRegion ? "url(#glow-pfc)" : undefined}
            className="cursor-pointer transition-all duration-500 hover:opacity-100"
            onClick={() => setActiveRegion("prefrontal_cortex")}
          />

          {/* Amygdala region (temporal, small deep region) */}
          <ellipse
            cx="145" cy="175" rx="22" ry="18"
            fill="#f59e0b"
            opacity={activeRegion === "amygdala" ? 1 : (activeRegion ? 0.1 : (glowIntensity[amgLevel] || 0.12))}
            filter={amgLevel !== "low" && !activeRegion ? "url(#glow-amg)" : undefined}
            className="cursor-pointer transition-all duration-500 hover:opacity-100"
            onClick={() => setActiveRegion("amygdala")}
          />

          {/* Ventral attention network (parietal / posterior upper) */}
          <path
            d="M 210 35 C 248 32, 275 60, 280 100 C 282 118, 270 128, 252 118 L 200 70 C 195 50, 200 37, 210 35 Z"
            fill="#34c759"
            opacity={activeRegion === "ventral_attention_network" ? 1 : (activeRegion ? 0.1 : (glowIntensity[vanLevel] || 0.12))}
            filter={vanLevel !== "low" && !activeRegion ? "url(#glow-van)" : undefined}
            className="cursor-pointer transition-all duration-500 hover:opacity-100"
            onClick={() => setActiveRegion("ventral_attention_network")}
          />

          {/* Region labels */}
          <text x="95" y="105" fill="white" fontSize="9" fontWeight="500" opacity={activeRegion && activeRegion !== "prefrontal_cortex" ? 0.2 : 0.7}>PFC</text>
          <text x="135" y="180" fill="white" fontSize="8" fontWeight="500" opacity={activeRegion && activeRegion !== "amygdala" ? 0.2 : 0.7}>AMG</text>
          <text x="235" y="80" fill="white" fontSize="9" fontWeight="500" opacity={activeRegion && activeRegion !== "ventral_attention_network" ? 0.2 : 0.7}>VAN</text>
        </svg>

        <div className="absolute bottom-4 left-4 right-4 rounded-[18px] bg-white/10 px-4 py-3 text-center text-xs text-white/60 backdrop-blur">
          Click any region to expand
        </div>
      </div>

      <div className="relative flex flex-col space-y-3">
        {activeRegion ? (
          (() => {
            const region = regions.find((r) => r.key === activeRegion)!;
            return (
              <div className="flex h-full flex-col rounded-[24px] border border-black/6 bg-white p-6 shadow-sm">
                <button
                  className="mb-5 inline-flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#6e6e73] transition-colors hover:text-black"
                  onClick={() => setActiveRegion(null)}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Back to overview
                </button>
                <div className="flex items-center gap-3">
                  <div className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: region.color }} />
                  <h3 className="text-[22px] font-semibold tracking-[-0.03em] text-black">{region.label}</h3>
                </div>
                <div className="mt-3">
                  <span
                    className="inline-block rounded-full px-3 py-1.5 text-xs font-semibold text-black"
                    style={{ backgroundColor: `${levelColor[region.value as keyof typeof levelColor]}33` }}
                  >
                    Activation: {formatLabel(region.value)}
                  </span>
                </div>
                <div className="mt-6 flex-1 space-y-4 text-[15px] leading-7 text-[#3a3a3c]">
                  <p className="font-medium text-black">{region.note}</p>
                  <p>{region.expandedInfo}</p>
                </div>
              </div>
            );
          })()
        ) : (
          regions.map((region) => (
            <div
              key={region.key}
              className="group cursor-pointer rounded-[24px] border border-transparent bg-[#fbfaf8] p-5 transition hover:border-black/6 hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
              onClick={() => setActiveRegion(region.key)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: region.color, boxShadow: region.value !== "low" ? `0 0 8px ${region.color}66` : "none" }} />
                  <p className="text-sm font-medium text-black">{region.label}</p>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium text-black"
                  style={{ backgroundColor: `${levelColor[region.value as keyof typeof levelColor]}33` }}
                >
                  {formatLabel(region.value)}
                </span>
              </div>
              <p className="mt-3 text-[14px] leading-6 text-[#6e6e73]">{region.note}</p>
              <p className="mt-4 text-xs font-medium text-[#6e6e73] opacity-0 transition-opacity group-hover:opacity-100">Click to expand →</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}



function AnalysisLoading({ label }: { label: string }) {
  return (
    <AppChrome subtitle="Creative intelligence for modern campaigns" title={label}>
      <ShellCard className="mx-auto max-w-3xl px-8 py-20 text-center">
        <div className="mx-auto flex w-fit items-center gap-3">
          {[0, 1, 2].map((item) => (
            <span
              key={item}
              className="h-4 w-4 animate-pulse rounded-full bg-black"
              style={{ animationDelay: `${item * 180}ms`, animationDuration: "1.2s" }}
            />
          ))}
        </div>
        <p className="mt-8 text-[32px] font-semibold tracking-[-0.04em] text-black">Analyzing your creative</p>
        <p className="mx-auto mt-3 max-w-xl text-[16px] leading-7 text-[#6e6e73]">
          Reading focal structure, audience fit, and predicted behavior to build a cleaner recommendation view.
        </p>
      </ShellCard>
    </AppChrome>
  );
}

function AnalysisResults({
  result,
  imageUrl,
  onReset,
  onNewAnalysis
}: {
  result: AnalysisResponse;
  imageUrl: string | null;
  onReset: () => void;
  onNewAnalysis: () => void;
}) {
  const signalEntries = Object.entries(result.neuro_signals);
  const scoreTone = scoreCardTone(result.creative_score);

  return (
    <AppChrome subtitle="Creative intelligence for modern campaigns" title="Analysis complete">
      <div className="mb-6 flex items-center gap-3">
        <AppButton onClick={onNewAnalysis} subtle>
          New analysis
        </AppButton>
        <AppButton onClick={onReset} subtle>
          Edit inputs
        </AppButton>
      </div>

      <div className="space-y-6">
        <ShellCard className="p-6">
          <div className="mb-6">
            <p className="text-lg font-semibold tracking-[-0.03em] text-black">Creative heatmap breakdown</p>
            <p className="mt-2 text-[15px] leading-7 text-[#6e6e73]">
              A predictive view of where the eye is likely to land, what creates clutter, and how the visual path may shape conversion behavior.
            </p>
          </div>
          <HeatmapOverlay heatmap={result.heatmap} imageUrl={imageUrl} />
        </ShellCard>

        <ShellCard className="p-6">
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className={`rounded-[26px] px-6 py-7 ${scoreTone.bg} ${scoreTone.text}`}>
              <p className={`text-sm ${scoreTone.subtext}`}>Creative score</p>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-7xl font-semibold tracking-[-0.05em]">{result.creative_score}</span>
                <span className={`pb-2 text-xl ${scoreTone.subtext}`}>/100</span>
              </div>
              <p className={`mt-4 text-sm ${scoreTone.subtext}`}>
                Confidence <span className={`ml-2 capitalize ${scoreTone.text}`}>{result.confidence || "N/A"}</span>
              </p>
            </div>

            <div className="rounded-[26px] border border-black/6 bg-[#fbfaf8] p-6">
              <p className="text-sm text-[#6e6e73]">
                Likely action <span className="ml-2 font-medium capitalize text-black">{result.predicted_behavior.likely_action || "N/A"}</span>
              </p>
              <div className="mt-5 space-y-4">
                {behaviorBars.map((bar) => (
                  <ProgressBar key={bar.key} label={bar.label} tone={bar.tone} value={result.predicted_behavior[bar.key]} />
                ))}
              </div>
            </div>
          </div>

          {result.predicted_behavior.rationale ? (
            <div className="mt-4 rounded-[22px] border border-black/6 bg-[#fbfaf8] px-5 py-4 text-[15px] leading-7 text-[#3a3a3c]">
              {result.predicted_behavior.rationale}
            </div>
          ) : null}
        </ShellCard>

        <ShellCard className="p-6">
          <p className="text-lg font-semibold tracking-[-0.03em] text-black">Neuro analysis</p>
          <p className="mt-2 text-[15px] leading-7 text-[#6e6e73]">
            Simulated brain-region response based on the creative’s emotional pull, processing effort, and attention capture.
          </p>
          <div className="mt-5">
            <BrainScan regionActivity={result.neuro_signals.region_activity} signals={result.neuro_signals} />
          </div>
        </ShellCard>

        <ShellCard className="p-6">
          <p className="text-lg font-semibold tracking-[-0.03em] text-black">Neuro signals</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {signalEntries.map(([key, value]) => (
              <div key={key} className="rounded-[22px] border border-black/6 bg-[#fbfaf8] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[#6e6e73]">{formatLabel(key)}</p>
                <p className="mt-2 text-[15px] leading-6 text-black">{formatSignalValue(value)}</p>
              </div>
            ))}
          </div>
        </ShellCard>

        <ShellCard className="p-6">
          <p className="text-lg font-semibold tracking-[-0.03em] text-black">Key insights</p>
          <p className="mt-2 text-[15px] leading-7 text-[#6e6e73]">What the model found when analyzing your creative.</p>
          <div className="mt-5 space-y-3">
            {result.reasoning.map((item, index) => (
              <div key={`${item}-${index}`} className="flex gap-4 rounded-[22px] border border-black/6 bg-[#fbfaf8] px-5 py-4">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
                  {index + 1}
                </div>
                <p className="text-[15px] leading-7 text-[#3a3a3c]">{item}</p>
              </div>
            ))}
          </div>
        </ShellCard>

        {result.ai_audit ? (
          <ShellCard className="p-6">
            <p className="text-lg font-semibold tracking-[-0.03em] text-black">AI audit</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-[22px] border border-[#f6d77a] bg-[linear-gradient(180deg,#fffdf7,#fbf5df)] px-5 py-4 text-[15px] leading-7 text-[#6a5320]">
                {result.ai_audit.summary}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[22px] border border-black/6 bg-white p-5">
                  <p className="text-sm font-medium text-black">Improved reasoning</p>
                  <div className="mt-3 space-y-2 text-[15px] leading-7 text-[#3a3a3c]">
                    {result.ai_audit.improved_reasoning.map((item, index) => (
                      <div key={`${item}-${index}`}>{item}</div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[22px] border border-[#cfe9d4] bg-[linear-gradient(180deg,#f6fcf7,#eef8f0)] p-5">
                  <p className="text-sm font-medium text-black">Improved recommendations</p>
                  <div className="mt-3 space-y-2 text-[15px] leading-7 text-[#3a3a3c]">
                    {result.ai_audit.improved_recommendations.map((item, index) => (
                      <div key={`${item}-${index}`} className="rounded-[18px] bg-white/75 px-4 py-3 text-[#166534]">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </ShellCard>
        ) : null}
      </div>
    </AppChrome>
  );
}

function CompareResults({
  result,
  onReset
}: {
  result: CompareResponse;
  onReset: () => void;
}) {
  return (
    <AppChrome subtitle="Creative intelligence for modern campaigns" title="Comparison complete">
      <div className="mb-6 flex items-center gap-3">
        <AppButton href="/compare" subtle>
          New comparison
        </AppButton>
        <AppButton onClick={onReset} subtle>
          Edit inputs
        </AppButton>
      </div>

      <div className="space-y-6">
        <ShellCard className="p-6">
          <div className="rounded-[26px] bg-black px-6 py-8 text-white">
            <p className="text-sm text-white/65">Winner</p>
            <p className="mt-3 text-[42px] font-semibold tracking-[-0.05em]">
              {result.winner === "creative_a" ? "Creative A" : "Creative B"}
            </p>
          </div>
        </ShellCard>

        <ShellCard className="p-6">
          <p className="text-lg font-semibold tracking-[-0.03em] text-black">Metric comparison</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {Object.entries(result.metric_comparison).map(([metric, values]) => (
              <div key={metric} className="rounded-[22px] border border-black/6 bg-[#fbfaf8] p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-[#6e6e73]">{formatLabel(metric)}</p>
                <div className="mt-3 space-y-2 text-[15px] leading-7 text-black">
                  <p>Creative A: {Math.round(values.creative_a * 100)}%</p>
                  <p>Creative B: {Math.round(values.creative_b * 100)}%</p>
                </div>
              </div>
            ))}
          </div>
        </ShellCard>

        <ShellCard className="p-6">
          <p className="text-lg font-semibold tracking-[-0.03em] text-black">Why it won</p>
          <div className="mt-5 space-y-3">
            {result.reasoning.map((item, index) => (
              <div key={`${item}-${index}`} className="rounded-[22px] border border-black/6 bg-[#fbfaf8] px-5 py-4 text-[15px] leading-7 text-[#3a3a3c]">
                {item}
              </div>
            ))}
          </div>
        </ShellCard>
      </div>
    </AppChrome>
  );
}

export function AnalyzeStudio() {
  const [phase, setPhase] = useState<PagePhase>("form");
  const [form, setForm] = useState<SingleFormState>(singleFormDefault);
  const [selectedDemographics, setSelectedDemographics] = useState<string[]>(["Women 25-34", "Coffee Lovers"]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState(String(singleFormDefault.budget));
  const [dayInput, setDayInput] = useState(String(singleFormDefault.days));
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!form.image) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(form.image);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [form.image]);

  function toggleDemographic(value: string) {
    setSelectedDemographics((current) => {
      if (current.includes(value)) return current.filter((item) => item !== value);
      if (current.length >= 20) return current;
      return [...current, value];
    });
  }

  function updateBudget(value: number) {
    const next = clampNumber(value, 2000, 30000);
    setForm((current) => ({ ...current, budget: next }));
    setBudgetInput(String(next));
  }

  function updateDays(value: number) {
    const next = clampNumber(value, 1, 90);
    setForm((current) => ({ ...current, days: next }));
    setDayInput(String(next));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.image) {
      setError("Please upload a creative before running analysis.");
      return;
    }

    setPhase("loading");

    try {
      const payload = new FormData();
      payload.append("file", form.image);
      payload.append("caption", form.caption);
      payload.append("audience", buildAudiencePayload(selectedDemographics));
      payload.append("budget", String(form.budget));
      payload.append("days", String(form.days));

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: payload
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to run analysis.");
      }

      setResult(data);
      setPhase("result");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to complete analysis.");
      setPhase("form");
    }
  }

  if (phase === "loading") {
    return <AnalysisLoading label="Running analysis" />;
  }

  if (phase === "result" && result) {
    return <AnalysisResults imageUrl={previewUrl} onReset={() => setPhase("form")} onNewAnalysis={() => { setForm(singleFormDefault); setPhase("form"); }} result={result} />;
  }

  return (
    <AppChrome subtitle="Build a cleaner read on a single asset before you spend." title="Run analysis">
      <ShellCard className="p-5 sm:p-6">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <UploadPanel file={form.image} label="Upload creative" onChange={(event) => setForm((current) => ({ ...current, image: event.target.files?.[0] || null }))} previewUrl={previewUrl} />

          <div>
            <FieldLabel title="Caption" subtitle="Add the copy exactly as it will appear in-market." />
            <textarea
              className="min-h-32 w-full rounded-[24px] border border-black/8 bg-white/80 px-5 py-4 text-[15px] text-black transition focus:border-black/20"
              onChange={(event) => setForm((current) => ({ ...current, caption: event.target.value }))}
              placeholder="Write the caption for this creative..."
              value={form.caption}
            />
          </div>

          <AudiencePicker onToggle={toggleDemographic} selected={selectedDemographics} />

          <SliderField
            displayValue={form.budget.toLocaleString()}
            inputValue={budgetInput}
            max={30000}
            min={2000}
            onInputChange={(value) => {
              setBudgetInput(value);
              const numeric = Number(value.replace(/[^0-9]/g, ""));
              if (!Number.isNaN(numeric) && numeric > 0) updateBudget(numeric);
            }}
            onSliderChange={updateBudget}
            stops={BUDGET_STOPS}
            subtitle="Per day budget with tighter early steps for finer campaign control."
            title="Per day budget"
            value={form.budget}
          />

          <SliderField
            displayValue={String(form.days)}
            inputValue={dayInput}
            max={90}
            min={1}
            onInputChange={(value) => {
              setDayInput(value);
              const numeric = Number(value.replace(/[^0-9]/g, ""));
              if (!Number.isNaN(numeric) && numeric > 0) updateDays(numeric);
            }}
            onSliderChange={updateDays}
            subtitle="Number of days the creative is expected to run."
            title="Number of days"
            value={form.days}
          />

          <button
            className="inline-flex w-full items-center justify-center rounded-full bg-black px-6 py-4 text-[15px] font-medium text-white shadow-[0_16px_40px_rgba(0,0,0,0.16)] transition duration-300 hover:translate-y-[-1px] hover:bg-black/92"
            type="submit"
          >
            Run analysis
          </button>

          {error ? <div className="rounded-[22px] bg-[#fff1ef] px-5 py-4 text-sm text-[#b42318]">{error}</div> : null}
        </form>
      </ShellCard>
    </AppChrome>
  );
}

export function CompareStudio() {
  return (
    <AppChrome subtitle="Side-by-side creative intelligence" title="Compare creatives">
      <ShellCard className="mx-auto max-w-4xl px-6 py-12 text-center sm:px-10 sm:py-16">
        <div className="inline-flex rounded-full border border-black/8 bg-[#fbfaf8] px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-[#6e6e73]">
          Coming soon
        </div>
        <h2 className="mt-6 text-[36px] font-semibold tracking-[-0.04em] text-black sm:text-[44px]">
          Compare two creatives,
          <br />
          pick the stronger one.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-7 text-[#6e6e73]">
          Upload two ad assets, and the model will evaluate attention, cognitive load, and engagement potential side by side — then tell you which one wins, and why.
        </p>

        <div className="mt-8">
          <AppButton href="/analyze">Run analysis instead</AppButton>
        </div>
      </ShellCard>

      <div className="mt-8">
        <p className="mb-4 text-center text-[13px] font-medium uppercase tracking-[0.18em] text-[#6e6e73]">Preview of how it works</p>

        <div className="pointer-events-none select-none" style={{ opacity: 0.55 }}>
          <ShellCard className="p-6">
            <div className="grid gap-5 md:grid-cols-2">
              {/* Mock Creative A */}
              <div className="space-y-4">
                <div className="rounded-[22px] border border-dashed border-black/10 bg-[#fbfaf8] p-5">
                  <p className="text-sm font-medium text-black">Creative A</p>
                  <div className="mt-3 flex h-40 items-center justify-center rounded-[18px] bg-black/4 text-sm text-[#6e6e73]">
                    Your first creative appears here
                  </div>
                </div>
                <div className="rounded-[22px] border border-black/6 bg-white p-4">
                  <div className="flex items-end gap-2">
                    <span className="text-[40px] font-semibold tracking-[-0.04em] text-black">72</span>
                    <span className="pb-1.5 text-sm text-[#6e6e73]">/100</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-xs text-[#6e6e73]"><span>Attention</span><span>68%</span></div>
                    <div className="h-1.5 rounded-full bg-black/6"><div className="h-full w-[68%] rounded-full bg-black/40" /></div>
                    <div className="flex justify-between text-xs text-[#6e6e73]"><span>Engagement</span><span>74%</span></div>
                    <div className="h-1.5 rounded-full bg-black/6"><div className="h-full w-[74%] rounded-full bg-black/40" /></div>
                  </div>
                </div>
              </div>

              {/* Mock Creative B */}
              <div className="space-y-4">
                <div className="rounded-[22px] border border-dashed border-black/10 bg-[#fbfaf8] p-5">
                  <p className="text-sm font-medium text-black">Creative B</p>
                  <div className="mt-3 flex h-40 items-center justify-center rounded-[18px] bg-black/4 text-sm text-[#6e6e73]">
                    Your second creative appears here
                  </div>
                </div>
                <div className="rounded-[22px] border border-black/6 bg-white p-4">
                  <div className="flex items-end gap-2">
                    <span className="text-[40px] font-semibold tracking-[-0.04em] text-black">84</span>
                    <span className="pb-1.5 text-sm text-[#6e6e73]">/100</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-xs text-[#6e6e73]"><span>Attention</span><span>82%</span></div>
                    <div className="h-1.5 rounded-full bg-black/6"><div className="h-full w-[82%] rounded-full bg-black/40" /></div>
                    <div className="flex justify-between text-xs text-[#6e6e73]"><span>Engagement</span><span>88%</span></div>
                    <div className="h-1.5 rounded-full bg-black/6"><div className="h-full w-[88%] rounded-full bg-black/40" /></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mock Winner Banner */}
            <div className="mt-6 rounded-[22px] bg-black px-6 py-5 text-center text-white">
              <p className="text-xs uppercase tracking-[0.16em] text-white/50">Winner</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Creative B</p>
              <p className="mt-2 text-sm text-white/60">Stronger attention capture and higher engagement potential based on cognitive load and visual clarity.</p>
            </div>
          </ShellCard>
        </div>
      </div>
    </AppChrome>
  );
}
