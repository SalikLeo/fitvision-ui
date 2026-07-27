export const EXERCISES = ["pushup", "pullup", "squat", "jumpingjack", "plank", "situp", "lunge"] as const;
export type Exercise = (typeof EXERCISES)[number];

export type Backend = "tflite" | "mediapipe";

export interface CountRepsResponse {
  exercise: string;
  reps: number;
  backend: string;
  video: string;
}

export interface EquipmentDetectionItem {
  label: string;
  confidence: number;
  box: number[];
}

export interface DetectEquipmentResponse {
  detections: EquipmentDetectionItem[];
  labels: string[];
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://fitvision.medaide.org";

async function postJson<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    const message =
      typeof detail?.detail === "string"
        ? detail.detail
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return response.json();
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1]! : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

export async function countReps(
  videoBase64: string,
  exercise: Exercise,
  backend: Backend,
): Promise<CountRepsResponse> {
  const endpoint =
    backend === "mediapipe" ? "/count-reps-mediapipe" : "/count-reps";

  return postJson<CountRepsResponse>(endpoint, {
    video: videoBase64,
    exercise,
  });
}

export async function detectEquipment(
  imageBase64: string,
): Promise<DetectEquipmentResponse> {
  return postJson<DetectEquipmentResponse>("/detect-equipment", {
    image: imageBase64,
  });
}

export async function detectEquipmentVideo(
  videoBase64: string,
  sampleEvery = 30,
): Promise<DetectEquipmentResponse> {
  return postJson<DetectEquipmentResponse>("/detect-equipment-video", {
    video: videoBase64,
    sample_every: sampleEvery,
  });
}
