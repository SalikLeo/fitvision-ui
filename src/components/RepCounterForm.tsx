"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type CountRepsResponse,
  type DetectEquipmentResponse,
  type Exercise,
  EXERCISES,
  countReps,
  detectEquipment,
  detectEquipmentVideo,
  fileToBase64,
} from "@/lib/api";

type Mode = "reps" | "equipment-image" | "equipment-video";

const EXERCISE_LABELS: Record<Exercise, string> = {
  pushup: "Push-up",
  pullup: "Pull-up",
  squat: "Squat",
  jumpingjack: "Jumping Jack",
  plank: "Plank",
  situp: "Sit-up",
  lunge: "Lunge",
};

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: "reps", label: "Rep counting" },
  { value: "equipment-image", label: "Equipment (image)" },
  { value: "equipment-video", label: "Equipment (video)" },
];

function normalizeBase64(base64: string): string {
  const trimmed = base64.trim();
  return trimmed.includes(",") ? trimmed.split(",")[1]! : trimmed;
}

function base64ToObjectUrl(base64: string, mime = "video/mp4"): string {
  const binary = atob(normalizeBase64(base64));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

function VideoPanel({
  label,
  src,
  badge,
  onError,
}: {
  label: string;
  src: string | null;
  badge?: string;
  onError?: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {label}
        </span>
        {badge && (
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
            {badge}
          </span>
        )}
      </div>
      <div className="relative flex flex-1 items-center justify-center bg-black">
        {src ? (
          <video
            key={src}
            src={src}
            controls
            playsInline
            preload="auto"
            onError={onError}
            className="max-h-[420px] w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-zinc-700 bg-zinc-900">
              <svg
                className="h-6 w-6 text-zinc-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H4.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25Z"
                />
              </svg>
            </div>
            <p className="text-sm text-zinc-500">No video yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ImagePanel({ label, src }: { label: string; src: string | null }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {label}
        </span>
      </div>
      <div className="relative flex flex-1 items-center justify-center bg-black">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt="Uploaded gym equipment"
            className="max-h-[420px] w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="text-sm text-zinc-500">No image yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EquipmentResults({ result }: { result: DetectEquipmentResponse }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/80 px-5 py-4">
      <div className="flex flex-wrap items-center gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Detections
          </p>
          <p className="text-5xl font-bold tabular-nums text-emerald-400">
            {result.detections.length}
          </p>
        </div>
        <div className="h-10 w-px bg-zinc-800" />
        <div className="flex flex-wrap gap-2">
          {result.labels.length === 0 ? (
            <span className="text-sm text-zinc-500">No equipment found</span>
          ) : (
            result.labels.map((label) => (
              <span
                key={label}
                className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400"
              >
                {label}
              </span>
            ))
          )}
        </div>
      </div>

      {result.detections.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Label</th>
                <th className="px-4 py-2.5 font-semibold">Confidence</th>
                <th className="px-4 py-2.5 font-semibold">Box</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {result.detections.map((det, index) => (
                <tr key={`${det.label}-${index}`} className="text-zinc-300">
                  <td className="px-4 py-2.5 font-medium text-zinc-100">
                    {det.label}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {(det.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">
                    [{det.box.map((v) => v.toFixed(1)).join(", ")}]
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function RepCounterForm() {
  const [mode, setMode] = useState<Mode>("reps");
  const [file, setFile] = useState<File | null>(null);
  const [exercise, setExercise] = useState<Exercise>("pushup");
  const [sampleEvery, setSampleEvery] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CountRepsResponse | null>(null);
  const [equipmentResult, setEquipmentResult] =
    useState<DetectEquipmentResponse | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const isImageMode = mode === "equipment-image";
  const isEquipmentMode = mode !== "reps";

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  const annotatedUrl = useMemo(
    () => (result?.video ? base64ToObjectUrl(result.video) : null),
    [result],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (annotatedUrl) URL.revokeObjectURL(annotatedUrl);
    };
  }, [annotatedUrl]);

  function resetOutputs() {
    setResult(null);
    setEquipmentResult(null);
    setError(null);
    setVideoError(null);
  }

  function handleModeChange(next: Mode) {
    setMode(next);
    setFile(null);
    resetOutputs();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setError(
        isImageMode ? "Please select an image file." : "Please select a video file.",
      );
      return;
    }

    setLoading(true);
    resetOutputs();

    try {
      const payload = await fileToBase64(file);

      if (mode === "reps") {
        const data = await countReps(payload, exercise);
        setResult(data);
      } else if (mode === "equipment-image") {
        const data = await detectEquipment(payload);
        setEquipmentResult(data);
      } else {
        const data = await detectEquipmentVideo(payload, sampleEvery);
        setEquipmentResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!annotatedUrl || !file) return;
    const link = document.createElement("a");
    link.href = annotatedUrl;
    link.download = `fitvision-${result?.exercise ?? exercise}-annotated.mp4`;
    link.click();
  }

  const hasComparison = Boolean(result && annotatedUrl);
  const accept = isImageMode
    ? "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
    : "video/mp4,video/quicktime,video/x-msvideo,.mp4,.mov,.avi";

  const submitLabel = loading
    ? "Processing…"
    : mode === "reps"
      ? "Count reps"
      : "Detect equipment";

  const loadingMessage =
    mode === "reps"
      ? "Analyzing pose and counting reps…"
      : mode === "equipment-image"
        ? "Detecting equipment in image…"
        : "Sampling video frames for equipment…";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-500">
          Pose, Reps &amp; Equipment
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          FitVision
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-zinc-400">
          Upload a workout clip or gym photo to count reps or detect equipment
          against the FitVision backend.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="flex h-fit flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 backdrop-blur-sm"
        >
          <fieldset>
            <legend className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Mode
            </legend>
            <div className="grid gap-2">
              {MODE_OPTIONS.map(({ value, label }) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition-colors ${
                    mode === value
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={value}
                    checked={mode === value}
                    onChange={() => handleModeChange(value)}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label
              htmlFor="media"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400"
            >
              {isImageMode ? "Gym image" : "Workout video"}
            </label>
            <label
              htmlFor="media"
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition-colors ${
                file
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-zinc-700 bg-zinc-950/50 hover:border-zinc-600"
              }`}
            >
              <input
                id="media"
                type="file"
                accept={accept}
                className="sr-only"
                onChange={(e) => {
                  const selected = e.target.files?.[0] ?? null;
                  setFile(selected);
                  resetOutputs();
                }}
              />
              {file ? (
                <>
                  <span className="text-sm font-medium text-emerald-400">
                    {file.name}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB · tap to change
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-zinc-300">
                    Drop a {isImageMode ? "image" : "video"} or click to browse
                  </span>
                  <span className="text-xs text-zinc-500">
                    {isImageMode ? "JPEG, PNG, or WebP" : "MP4, MOV, or AVI"}
                  </span>
                </>
              )}
            </label>
          </div>

          {mode === "reps" && (
            <div>
              <label
                htmlFor="exercise"
                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400"
              >
                Exercise
              </label>
              <select
                id="exercise"
                value={exercise}
                onChange={(e) => setExercise(e.target.value as Exercise)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {EXERCISES.map((key) => (
                  <option key={key} value={key}>
                    {EXERCISE_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {mode === "equipment-video" && (
            <div>
              <label
                htmlFor="sampleEvery"
                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400"
              >
                Sample every N frames
              </label>
              <input
                id="sampleEvery"
                type="number"
                min={1}
                max={300}
                value={sampleEvery}
                onChange={(e) =>
                  setSampleEvery(
                    Math.min(300, Math.max(1, Number(e.target.value) || 1)),
                  )
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !file}
            className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitLabel}
          </button>
        </form>

        <section className="flex min-h-[480px] flex-col gap-4">
          {hasComparison && !isEquipmentMode && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/80 px-5 py-4">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Total reps
                  </p>
                  <p className="text-5xl font-bold tabular-nums text-emerald-400">
                    {result!.reps}
                  </p>
                </div>
                <div className="h-10 w-px bg-zinc-800" />
                <div className="text-sm text-zinc-400">
                  <p>
                    <span className="text-zinc-500">Exercise</span>{" "}
                    <span className="font-medium text-zinc-200">
                      {EXERCISE_LABELS[result!.exercise as Exercise] ??
                        result!.exercise}
                    </span>
                  </p>
                  <p className="mt-1">
                    <span className="text-zinc-500">Backend</span>{" "}
                    <span className="font-medium text-zinc-200">
                      {result!.backend}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-emerald-500/50 hover:text-emerald-400"
              >
                Download annotated
              </button>
            </div>
          )}

          {equipmentResult && isEquipmentMode && (
            <EquipmentResults result={equipmentResult} />
          )}

          <div className="relative flex min-h-0 flex-1 flex-col">
            {loading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-2xl bg-zinc-950/80 backdrop-blur-sm">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
                <p className="text-sm text-zinc-400">{loadingMessage}</p>
              </div>
            )}

            {videoError && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                {videoError}
              </p>
            )}

            {isImageMode ? (
              <ImagePanel
                label={previewUrl ? "Preview" : "Image input"}
                src={previewUrl}
              />
            ) : hasComparison ? (
              <div className="grid min-h-[420px] flex-1 gap-4 sm:grid-cols-2">
                <VideoPanel label="Original" src={previewUrl} />
                <VideoPanel
                  label="Annotated"
                  src={annotatedUrl}
                  badge={`${result!.reps} reps`}
                  onError={() =>
                    setVideoError(
                      "Annotated video couldn't play in the browser. Try Download annotated — if that file works, restart the backend so it re-encodes to H.264.",
                    )
                  }
                />
              </div>
            ) : (
              <VideoPanel
                label={previewUrl ? "Preview" : "Video output"}
                src={previewUrl}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
