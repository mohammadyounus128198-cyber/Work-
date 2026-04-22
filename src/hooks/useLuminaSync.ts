import { useEffect, useRef, useState } from "react";

export interface LuminaWavePayload {
  freq: number;
  speed: number;
  complexity: number;
  hueShift: number;
  timestamp: number;
  source: string;
}

export interface LuminaSyncParams {
  hue: number;
  speed: number;
  complexity: number;
  frequency: number;
  raw: LuminaWavePayload;
}

export interface LuminaSyncState {
  params: LuminaSyncParams | null;
  isSynced: boolean;
  lastLinkTimestamp: number;
}

const STORAGE_KEY = "lumina-wave-params";
const LINK_SOURCE = "resonance-tuner";
const LINK_MAX_AGE_MS = 500;
const POLL_INTERVAL_MS = 100;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mapToOmegaSpace(payload: LuminaWavePayload): LuminaSyncParams {
  return {
    hue: clamp(170 + (payload.hueShift ?? 0), -10, 350),
    speed: clamp(payload.speed ?? 1, 0, 2.5),
    complexity: clamp((payload.complexity ?? 3) / 3.5, 0.28, 2),
    frequency: clamp((payload.freq ?? 1) / 2, 0.2, 2.1),
    raw: payload,
  };
}

export function useLuminaSync(): LuminaSyncState {
  const [params, setParams] = useState<LuminaSyncParams | null>(null);
  const [isSynced, setIsSynced] = useState(false);
  const [lastLinkTimestamp, setLastLinkTimestamp] = useState(0);
  const lastTimestampRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const readPayload = () => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return;
      }

      try {
        const payload = JSON.parse(stored) as LuminaWavePayload;
        const age = Date.now() - payload.timestamp;
        const isValid = payload.source === LINK_SOURCE &&
          age >= 0 &&
          age < LINK_MAX_AGE_MS &&
          payload.timestamp > lastTimestampRef.current;

        if (!isValid) {
          if (age >= LINK_MAX_AGE_MS) {
            setIsSynced(false);
          }
          return;
        }

        const mapped = mapToOmegaSpace(payload);
        lastTimestampRef.current = payload.timestamp;
        setParams(mapped);
        setIsSynced(true);
        setLastLinkTimestamp(payload.timestamp);

        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
        }

        hideTimerRef.current = setTimeout(() => {
          setIsSynced(false);
        }, LINK_MAX_AGE_MS + 100);
      } catch (error) {
        console.error("[LUMINA_SYNC_ERR]", error);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        readPayload();
      }
    };

    window.addEventListener("storage", handleStorage);
    const pollInterval = window.setInterval(readPayload, POLL_INTERVAL_MS);
    readPayload();

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.clearInterval(pollInterval);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  return { params, isSynced, lastLinkTimestamp };
}
