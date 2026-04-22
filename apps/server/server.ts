import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import http from "http";
import { createHash } from "crypto";
import { GoogleGenAI } from "@google/genai";
import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { processSignals } from "../../src/lib/engine";
import { signals as seedSignals } from "../../src/lib/signals";
import { fetchMarketSignals, fetchNewsSignals, normalizeSignals, getResilienceState } from "../../src/lib/connectors";
import { Signal, ProcessedSignal, PlateId, OperatorState, CodexStep, TraceAnnotation, GuardrailEvent, PathState, StateHash } from "../../src/lib/types";
import { runKernelDiagnostics } from "../../src/lib/mfcs/kernel.test";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../../");

// Global Buffers and Session State
const STATE_HISTORY_LIMIT = 50;
const HASH_BUFFER_LIMIT = 1000; // ~10 minutes @ 618ms
const SNAPSHOT_INTERVAL = 10;
const SNAPSHOT_LIMIT = 100;

// 3D Path Generator Configuration (Scaled to 1,000 Nodes)
const NODES_PER_QUADRANT = 250;

let stateHistory: OperatorState[] = [];
let hashBuffer: StateHash[] = [];
let snapshots: Map<number, OperatorState> = new Map();

let operatorState: OperatorState = {
  sessionId: `session-${Date.now()}`,
  operatorId: "MOHAMMAD",
  tick: 0,
  phi: 0,
  readiness: 0,
  energy: 0,
  device: "DESKTOP",
  engine: {
    phase: "DEFINE",
    status: "ACTIVE"
  },
  telemetry: {
    SVI: 88,
    CBU: 65,
    ESQ: 92,
    OM: 78,
    AP: 12,
    pathMap: {
      north: generatePaths("N", 0),
      east: generatePaths("E", 1),
      south: generatePaths("S", 2),
      west: generatePaths("W", 3)
    }
  },
  steps: [],
  annotations: [],
  guardrailEvents: [],
  plateCounts: {
    "I": 0, "II": 0, "III": 0, "IV": 0, "V": 0, "VI": 0, "VII": 0, "VIII": 0, "IX": 0
  },
  resilience: {
    rateLimitState: "STABLE",
    circuitBreaker: "CLOSED"
  },
  ui: {
    focusedPanel: "NEXUS_MAIN",
    selectedSignalId: undefined,
    focusMode: "SCAN" as "SCAN" | "FOCUS" | "SIMULATE",
    targetId: undefined
  },
  updatedAt: Date.now()
};

// Static Guardrail Definitions
const guardrailChecks = [
  (step: CodexStep) => {
    if (
      step.plateId === "IV" &&
      step.metrics.risk > 0.8
    ) {
      return {
        guardrailId: "NO_PLATE_IV_HIGH_VOL",
        violated: true,
        reason: "Plate IV activation under excessive risk"
      };
    }
    return { violated: false };
  }
];

function generatePaths(prefix: string, seed: number): PathState[] {
  return Array.from({ length: NODES_PER_QUADRANT }).map((_, i) => ({
    id: `${prefix}-${i + 1}`,
    value: Math.max(0, Math.min(100, (Math.random() * 40) + 30)),
    drift: (Math.random() - 0.5) * 5,
    risk: Math.random() * 100,
    momentum: 50,
    importance: 0.1,
    lastActivation: new Date().toISOString()
  }));
}

/**
 * INTELLIGENCE SCALING: Pattern Detection
 * Enrichment of the evaluation step without overriding the loop.
 */
function detectPatterns(state: OperatorState) {
  const all = [...state.telemetry.pathMap.north, ...state.telemetry.pathMap.east, ...state.telemetry.pathMap.south, ...state.telemetry.pathMap.west];
  
  // 1. Cluster Detection (Simple Energy Densities)
  const hotspots = all.filter(p => p.value > 85);
  
  // 2. Anomaly Detection (Sudden Energy Spikes)
  // (In a real system, we'd compare against stateHistory)
  
  return {
    hotspotCount: hotspots.length,
    criticalDensity: hotspots.length / all.length
  };
}

function generateStateHash(state: OperatorState): string {
  const content = JSON.stringify({
    tick: state.tick,
    SVI: state.telemetry.SVI,
    pathSum: [...state.telemetry.pathMap.north, ...state.telemetry.pathMap.east, ...state.telemetry.pathMap.south, ...state.telemetry.pathMap.west]
      .reduce((sum, p) => sum + p.value, 0)
  });
  return createHash("sha256").update(content).digest("hex");
}

function sense() {
  operatorState.tick++;
  
  // Rolling History
  stateHistory.push(JSON.parse(JSON.stringify(operatorState)));
  if (stateHistory.length > STATE_HISTORY_LIMIT) stateHistory.shift();

  // State Hashing
  const currentHash: StateHash = {
    tick: operatorState.tick,
    hash: generateStateHash(operatorState),
    timestamp: Date.now(),
    metrics: {
      SVI: operatorState.telemetry.SVI,
      OM: operatorState.telemetry.OM
    },
    mode: operatorState.ui.focusMode
  };
  hashBuffer.push(currentHash);
  if (hashBuffer.length > HASH_BUFFER_LIMIT) hashBuffer.shift();

  // Snapshotting
  if (operatorState.tick % SNAPSHOT_INTERVAL === 0) {
    snapshots.set(operatorState.tick, JSON.parse(JSON.stringify(operatorState)));
    if (snapshots.size > SNAPSHOT_LIMIT) {
      const oldestTick = Math.min(...snapshots.keys());
      snapshots.delete(oldestTick);
    }
  }

  return operatorState;
}

function evaluate(state: OperatorState) {
  const allPaths = [...state.telemetry.pathMap.north, ...state.telemetry.pathMap.east, ...state.telemetry.pathMap.south, ...state.telemetry.pathMap.west];
  const energies = allPaths.map(p => p.value / 100);
  
  // Stability = 1 - variance(energy)
  const mean = energies.reduce((a, b) => a + b, 0) / energies.length;
  const variance = energies.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / energies.length;
  const stability = Math.max(0, Math.min(1, 1 - (variance * 4))); // Adjusted sensitivity for 1,000 nodes

  // Update telemetry
  state.telemetry.SVI = stability * 100;
  state.telemetry.OM = mean * 100;
  state.telemetry.AP = (energies.filter(e => e < 0.2).length / allPaths.length) * 100;

  // CROSS-MODE CONSERVATION GUARDRAIL (From TLA+ Envelope Theorem)
  // Law: W = energy + C_phi*phi + C_r*readiness <= M
  const C_phi = 1.0;
  const C_r = 0.5;
  const M = 150; // Scaled limit
  const currentEnvelope = state.energy + C_phi * state.phi + C_r * state.readiness;
  
  if (currentEnvelope > M) {
    state.guardrailEvents.unshift({
      id: `ge-env-${Date.now()}`,
      timestamp: new Date().toISOString(),
      guardrailId: "ENVELOPE_INFLATION",
      severity: "MED",
      reason: `Stability envelope breached: ${currentEnvelope.toFixed(1)} > ${M}. Engaging dissipation.`
    });
    // Dissipative correction
    state.phi *= 0.9;
    state.readiness *= 0.9;
  }

  // Intelligence Enrichment
  const patterns = detectPatterns(state);
  if (patterns.criticalDensity > 0.1) {
    state.resilience.rateLimitState = "THROTTLED";
  }

  // Stability Guard: auto-recover if stability collapses
  if (stability < 0.35 && snapshots.size > 0) {
    // Jump to last snapshot
    const snapshotTicks = Array.from(snapshots.keys()).sort((a, b) => b - a);
    const lastSnapshot = snapshots.get(snapshotTicks[0]);
    
    if (lastSnapshot) {
      console.warn(`[STABILITY_ROLLBACK] Stability collapse (${(stability*100).toFixed(1)}%). Reverting to snapshot @ tick ${lastSnapshot.tick}`);
      
      // Log anomaly event
      state.guardrailEvents.unshift({
        id: `ge-rollback-${Date.now()}`,
        timestamp: new Date().toISOString(),
        guardrailId: "STABILITY_COLLAPSE",
        severity: "HIGH",
        reason: `System variance exceeded bounds. Rolled back from tick ${state.tick} to ${lastSnapshot.tick}. Hash verified.`
      });
      
      return JSON.parse(JSON.stringify(lastSnapshot));
    }
  }
  return state;
}

function adjust(state: OperatorState) {
  const isThrottled = state.resilience.rateLimitState === "THROTTLED";
  const baseDrift = 0.05;
  const throttledDrift = 0.02;
  const driftBound = (isThrottled ? throttledDrift : baseDrift) * 100;
  
  // MULTI-RESOURCE ACCUMULATION (TLA+ TWIN DYNAMICS)
  const K = 60; // Conversion threshold
  const phase = state.engine.phase;

  if (phase === "GENERATE") { // BUILD_COLLECT
     state.phi = Math.min(100, state.phi + 2);
  } 
  else if (phase === "CHOOSE") { // BUILD_COMPRESS
     if (state.phi >= K) {
        // Rule B: Conversion
        state.phi = Math.max(0, state.phi - 1);
        state.readiness = Math.min(100, state.readiness + 4);
     } else {
        // Rule A: Accumulation
        state.phi = Math.min(100, state.phi + 2);
        state.readiness = Math.min(100, state.readiness + 1);
     }
  }
  else if (phase === "ACT") { // FUSION
     if (state.energy === 0 && state.phi > 0) {
        state.energy = state.phi; // Ignition: Seed energy from phi
        state.guardrailEvents.unshift({
           id: `fuse-${Date.now()}`,
           timestamp: new Date().toISOString(),
           guardrailId: "FUSION_IGNITION",
           severity: "LOW",
           reason: `Fusion ignition successful. Seeded ${state.energy.toFixed(1)} energy units.`
        });
     }
     state.energy = Math.max(0, state.energy - 3); // Burn rate
  }
  else if (phase === "LEARN") { // COLLAPSE / DECAY
     state.readiness = Math.max(0, state.readiness - 5);
     state.phi = Math.max(0, state.phi - 2);
     state.energy = Math.max(0, state.energy - 1);
  }

  const updateQuadrant = (paths: PathState[]) => paths.map(p => {
    const drift = (Math.random() - 0.5) * driftBound;
    const newValue = Math.max(0, Math.min(100, p.value + drift));
    
    // Logic: p.energy ∈ [0,1], state derived ONLY from energy
    const e = newValue / 100;
    let importance = 0.1;
    if (e > 0.8) importance = 1.0;      // active
    else if (e > 0.5) importance = 0.6; // staged
    else if (e > 0.2) importance = 0.3; // monitor
    else importance = 0.05;             // sealed

    return { ...p, value: newValue, importance };
  });

  state.telemetry.pathMap.north = updateQuadrant(state.telemetry.pathMap.north);
  state.telemetry.pathMap.east = updateQuadrant(state.telemetry.pathMap.east);
  state.telemetry.pathMap.south = updateQuadrant(state.telemetry.pathMap.south);
  state.telemetry.pathMap.west = updateQuadrant(state.telemetry.pathMap.west);

  // Golden Thread (Permanent Feature)
  const all = [...state.telemetry.pathMap.north, ...state.telemetry.pathMap.east, ...state.telemetry.pathMap.south, ...state.telemetry.pathMap.west];
  const driver = all.reduce((a, b) => a.value > b.value ? a : b);
  state.ui.targetId = driver.id;

  state.updatedAt = Date.now();
  return state;
}

/**
 * GHOST FUTURE ENGINE: Deterministic Step
 * For simulation without affecting the canonical state.
 */
function runStep(state: OperatorState): OperatorState {
  let next = JSON.parse(JSON.stringify(state));
  next.tick++;
  next = evaluate(next);
  next = adjust(next);
  return next;
}

function syncOperatorState(signals: ProcessedSignal[]) {
  const avgRisk = signals.reduce((acc, s) => acc + s.risk, 0) / (signals.length || 1);
  const avgScore = signals.reduce((acc, s) => acc + s.score, 0) / (signals.length || 1);
  const resilience = getResilienceState();
  
  const now = Date.now();
  const seed = now / 10000;
  
  // Evolve Engine Phase
  const phases: OperatorState['engine']['phase'][] = ["DEFINE", "GENERATE", "CHOOSE", "ACT", "LEARN"];
  const currentPhaseIndex = phases.indexOf(operatorState.engine.phase);
  const nextPhase = phases[(currentPhaseIndex + 1) % phases.length];
  
  operatorState = {
    ...operatorState,
    engine: {
      ...operatorState.engine,
      phase: nextPhase
    },
    telemetry: {
      ...operatorState.telemetry,
      SVI: 85 + Math.sin(seed) * 5,
      CBU: 60 + Math.cos(seed) * 10,
      ESQ: 90 + Math.sin(seed * 0.5) * 5,
      OM: 75 + Math.cos(seed * 0.5) * 5,
      AP: 15 + Math.sin(seed * 2) * 5,
    },
    resilience: {
      rateLimitState: resilience.latency > 200 ? "THROTTLED" : "STABLE",
      circuitBreaker: "CLOSED"
    },
    updatedAt: now
  };
}

async function startServer() {
  try {
    runKernelDiagnostics();

  const app = express();
  app.use(cors());
  app.use((req, res, next) => {
    console.log(`[HTTP_REQ] ${req.method} ${req.url}`);
    next();
  });
  app.set("trust proxy", true);
  
  const PORT = 3000;
  const isProd = process.env.NODE_ENV === "production";

  // Production Secret Validation
  if (isProd && !process.env.GEMINI_API_KEY) {
    console.warn("[OMEGA_SECURITY_ALERT] GEMINI_API_KEY is not defined in the production environment.");
    console.warn("[OMEGA_SECURITY_ALERT] Integration with Signal Engines may be limited.");
  }

  let currentSignals: Signal[] = seedSignals;
  let lastProcessed: ProcessedSignal[] = [];

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      version: "1.5.0-omega",
      telemetry: {
        uptime: process.uptime(),
        memory: process.memoryUsage().rss,
        engineStatus: operatorState.engine.status
      }
    });
  });

  app.get("/api/state", (req, res) => {
    res.json(operatorState);
  });

  app.get("/api/codex/annotations", (req, res) => {
    console.log("[API_REQ] GET /api/codex/annotations");
    res.json(operatorState.annotations);
  });

  app.get("/api/codex/guardrails/events", (req, res) => {
    console.log("[API_REQ] GET /api/codex/guardrails/events");
    res.json(operatorState.guardrailEvents);
  });

  app.get("/api/lab", (req, res) => {
    console.log("[API_REQ] GET /api/lab (Consolidated Sync)");
    res.json({
      annotations: operatorState.annotations,
      guardrailEvents: operatorState.guardrailEvents,
      plateCounts: operatorState.plateCounts,
      telemetry: operatorState.telemetry,
      phi: operatorState.phi,
      readiness: operatorState.readiness,
      energy: operatorState.energy,
      rateLimitState: operatorState.resilience.rateLimitState
    });
  });

  app.get("/api/stability/hashes", (req, res) => {
    res.json(hashBuffer);
  });

  app.get("/api/stability/snapshots", (req, res) => {
    res.json(Array.from(snapshots.keys()));
  });

  app.post("/api/codex/annotations", express.json(), (req, res) => {
    // Authorization guard: if the caller supplies an operatorId it must match
    // the active operator — prevents user impersonation via body spreading.
    const { operatorId, author: _discardedAuthor, ...safeBody } = req.body ?? {};

    if (operatorId !== undefined && operatorId !== operatorState.operatorId) {
      return res.status(401).json({
        error: "Unauthorized",
        detail: "Supplied operatorId does not match the active operator session."
      });
    }

    const annotation: TraceAnnotation = {
      id: `ann-${Date.now()}`,
      createdAt: new Date().toISOString(),
      // author is always set server-side from the canonical operatorId,
      // never from untrusted request body input.
      author: operatorState.operatorId,
      ...safeBody
    };
    operatorState.annotations.unshift(annotation);
    res.status(201).json(annotation);
  });

  app.post("/api/oracle", express.json(), async (req, res) => {
    const { prompt, metrics } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // PROD_FALLBACK: Static simulation
      return res.json({
        text: "Lattice resonance stable but external oracle link decoupled. Prompt ignored in static fallback mode.",
      });
    }

    try {
      const systemPrompt = "You are the Nexus Oracle, a high-fidelity strategic AI for the OMEGA LATTICE system. You provide tactical advice and foresight. Analyze given metrics or address operator queries with operational precision.";
      const userPrompt = metrics 
        ? `Perform a strategic analysis of the OMEGA LATTICE current state:
           SVI: ${metrics.SVI}, OM: ${metrics.OM}, AP: ${metrics.AP}, Phi: ${metrics.phi}, Readiness: ${metrics.readiness}, Energy: ${metrics.energy}, Mode: ${metrics.mode}`
        : (prompt || "Requesting strategic briefing.");

      const result = await streamText({
        model: google("gemini-3-flash-preview"),
        prompt: userPrompt,
        system: systemPrompt,
      });

      result.pipeTextStreamToResponse(res);
    } catch (err) {
      console.error("[ORACLE_STREAM_ERR]", err);
      res.status(500).json({ error: "Streaming Failure" });
    }
  });

  app.post("/api/advisor", express.json(), async (req, res) => {
    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(401).json({ error: "GEMINI_API_KEY missing" });
    }

    try {
      const result = await streamText({
        model: google("gemini-3-flash-preview"),
        prompt: prompt || "Provide a high-level strategic overview of the OMEGA LATTICE current state.",
        system: "You are the Nexus Oracle, a high-fidelity strategic AI for the OMEGA LATTICE system. You provide tactical advice and foresight.",
      });

      result.pipeTextStreamToResponse(res);
    } catch (err) {
      console.error("[ADVISOR_STREAM_ERR]", err);
      res.status(500).json({ error: "Streaming Failure" });
    }
  });

  // Explicitly create HTTP server early
  const server = http.createServer(app);

  if (!isProd) {
    const vite = await createViteServer({
      root: ROOT_DIR,
      server: { 
        middlewareMode: true,
        hmr: { server },
        host: "0.0.0.0",
        port: PORT
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Manual WebSocket Upgrade Handling (Cloud Run / Proxy Compatibility)
  const wss = new WebSocketServer({ noServer: true });

  wss.on("error", (err) => {
    console.error("[WSS_GLOBAL_ERR] Unhandled WebSocket Server Collision:", err);
  });

  server.on("upgrade", (request, socket, head) => {
    // Cloud Run requires HTTP/1.1 for WebSocket upgrades
    if (request.httpVersion !== "1.1") {
      socket.destroy();
      return;
    }

    const { pathname } = new URL(request.url || "/", `http://${request.headers.host}`);
    // Option A: Root-level WebSocket upgrade
    if (pathname !== "/") {
      socket.destroy();
      return;
    }

    // Handle WebSocket upgrade
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[OMEGA_CORE] Server running at http://localhost:${PORT}`);
    console.log(`[OMEGA_CORE] WebSocket upgrade listener attached (HTTP/1.1 forced).`);
  });

  function broadcast() {
    const payload = JSON.stringify({
      type: "STATE_UPDATE",
      payload: operatorState,
      signals: lastProcessed
    });
    wss.clients.forEach(client => {
      try {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      } catch (err) {
        console.error("[WS_BROADCAST_ERR] Peer connection severed during push:", err);
      }
    });
  }

  // OMEGA LATTICE — FINAL LOCK (v1.0) Core Loop (618ms)
  // Scaling 2: Scaled Input Integration
  const simulateLiveInputs = async () => {
    // Plug in: market, system, logs -> map to energy drift
    if (operatorState.resilience.rateLimitState === "THROTTLED") return; // Freeze input bursts

    const driftBoost = Math.random() > 0.9 ? 15 : 0; // Simulate "burst"
    operatorState.telemetry.CBU = Math.min(100, operatorState.telemetry.CBU + (Math.random() - 0.5) * 2 + driftBoost / 10);
  };

  setInterval(() => {
    simulateLiveInputs();
    operatorState = sense();
    operatorState = evaluate(operatorState);
    operatorState = adjust(operatorState);
    broadcast();
  }, 618);

  async function updateCycle() {
    try {
      const [mkt, news] = await Promise.all([fetchMarketSignals(), fetchNewsSignals()]);
      const combined = normalizeSignals([...currentSignals, ...mkt, ...news]);
      currentSignals = combined.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).slice(0, 11);

      lastProcessed = processSignals(currentSignals, lastProcessed);

      // Create Codex Steps
      lastProcessed.forEach(p => {
        if (p.codex_alignment) {
           const step: CodexStep = {
             id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
             timestamp: new Date().toISOString(),
             plateId: p.codex_alignment,
             plateName: `Plate_${p.codex_alignment}`,
             operator: operatorState.operatorId,
             signalId: p.id,
             metrics: {
               stability: p.score,
               risk: p.risk,
               momentum: p.momentum
             }
           };
           operatorState.steps.unshift(step);
           operatorState.currentSignal = p;

           // Guardrails
           guardrailChecks.forEach(check => {
             const result = check(step);
             if (result.violated && result.guardrailId) {
                operatorState.guardrailEvents.unshift({
                  id: `ge-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  guardrailId: result.guardrailId,
                  severity: "HIGH",
                  reason: result.reason || "VIOLATION",
                  step: step
                });
             }
           });
        }
      });

      operatorState.steps = operatorState.steps.slice(0, 50);
      operatorState.guardrailEvents = operatorState.guardrailEvents.slice(0, 100);

      // Plate Analysis (Nexus OMEGA Continued Logic)
      const counts: Record<PlateId, number> = { "I": 0, "II": 0, "III": 0, "IV": 0, "V": 0, "VI": 0, "VII": 0, "VIII": 0, "IX": 0 };
      lastProcessed.forEach(p => {
        if (p.codex_alignment) {
          counts[p.codex_alignment]++;
        }
      });
      operatorState.plateCounts = counts;

      syncOperatorState(lastProcessed);
      broadcast();
    } catch (err) {
      console.error("[OMEGA_ERR] Cycle failed:", err);
    }
  }

  setInterval(updateCycle, 5000);

  wss.on("connection", (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`[WS_CONNECTED] Peer: ${ip}`);

    // Heartbeat State
    let isAlive = true;
    ws.on("pong", () => {
      isAlive = true;
    });

    // Prevent unhandled errors from crashing the Node process
    ws.on("error", (err) => {
      // Filter out common protocol noise from logs (e.g. invalid status codes from proxies)
      if (err.message.includes("status code") || err.message.includes("frame")) {
        // Silently terminate the compromised connection to clear the buffer
        ws.terminate();
      } else {
        console.error("[WS_CLIENT_ERR] Fatal Socket Failure:", err);
      }
    });

    // Individual ping timer (30s)
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        if (!isAlive) return ws.terminate();
        isAlive = false;
        ws.ping();
      }
    }, 30000);

    ws.on("close", () => {
      clearInterval(pingInterval);
      console.log(`[WS_DISCONNECTED] Peer: ${ip}`);
    });

    // Helper to send typed packets to a single client
    const sendToClient = (obj: any) => {
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
      } catch (err) {
        console.error("[WS_SEND_ERR] Failed to push packet to client:", err);
      }
    };

    ws.on("message", (message, isBinary) => {
      if (isBinary) {
        console.warn("[WS_WARN] Received unexpected binary frame. Ignoring.");
        return;
      }

      try {
        const msg = JSON.parse(message.toString());

        // HANDLING INTENTS (OMEGA INFRASTRUCTURE Scaling)
        if (msg.type === "INTENT") {
          const { action, meta } = msg.payload;
          
          // Immediate ACK
          sendToClient({ 
            type: "ACK", 
            payload: { action, status: "RECEIVED", timestamp: Date.now() } 
          });

          switch (action) {
            case "STABILIZE":
              // Global dampening logic
              const dampen = (paths: PathState[]) => paths.map(p => ({ ...p, value: p.value * 0.8 }));
              operatorState.telemetry.pathMap.north = dampen(operatorState.telemetry.pathMap.north);
              operatorState.telemetry.pathMap.east = dampen(operatorState.telemetry.pathMap.east);
              operatorState.telemetry.pathMap.south = dampen(operatorState.telemetry.pathMap.south);
              operatorState.telemetry.pathMap.west = dampen(operatorState.telemetry.pathMap.west);
              operatorState.telemetry.SVI = Math.min(100, operatorState.telemetry.SVI * 1.2);
              sendToClient({ type: "ACK", payload: { action, status: "OK", result: "Stabilization pulse emitted." } });
              break;

            case "BOOST":
              const ignite = (paths: PathState[]) => paths.map(p => ({ ...p, value: Math.min(100, p.value * 1.3 + 5) }));
              operatorState.telemetry.pathMap.north = ignite(operatorState.telemetry.pathMap.north);
              operatorState.telemetry.pathMap.east = ignite(operatorState.telemetry.pathMap.east);
              operatorState.telemetry.pathMap.south = ignite(operatorState.telemetry.pathMap.south);
              operatorState.telemetry.pathMap.west = ignite(operatorState.telemetry.pathMap.west);
              operatorState.telemetry.OM = Math.min(100, operatorState.telemetry.OM * 1.25);
              sendToClient({ type: "ACK", payload: { action, status: "OK", result: "High-energy ignition successful." } });
              break;

            case "PREDICTION": {
              const steps = meta?.steps || 12;
              const ghosts = [];
              let currentGhost = JSON.parse(JSON.stringify(operatorState));
              for (let i = 0; i < steps; i++) {
                currentGhost = runStep(currentGhost);
                ghosts.push(currentGhost);
              }
              sendToClient({ type: "PREDICTION_VECT", payload: { snapshots: ghosts, targetTick: operatorState.tick + steps } });
              sendToClient({ type: "ACK", payload: { action, status: "OK", result: `Ghost future projected (${steps} steps).` } });
              break;
            }

            case "TRACE": {
              const limit = Math.min(100, meta?.limit || 50);
              const historyTail = stateHistory.slice(-limit);
              sendToClient({ type: "TRACE_RESULT", payload: { entries: historyTail } });
              sendToClient({ type: "ACK", payload: { action, status: "OK", result: `State trace retrieved (${historyTail.length} entries).` } });
              break;
            }
          }
          broadcast();
          return;
        }

        if (msg.type === "UI_EVENT") {
          const { action, id, mode } = msg.payload;
          if (action === "SELECT_SIGNAL") {
            operatorState.ui.selectedSignalId = id;
            operatorState.ui.focusMode = "FOCUS";
          }
          if (action === "SET_FOCUS_MODE") {
            operatorState.ui.focusMode = mode as "SCAN" | "FOCUS" | "SIMULATE";
          }
          if (action === "STABILIZE_SYSTEM") {
            // Functional stabilization logic: Reduce volatility, boost confidence across signals
            lastProcessed = lastProcessed.map(signal => ({
              ...signal,
              volatility: Math.max(0.1, signal.volatility * 0.5),
              confidence: Math.min(0.95, signal.confidence * 1.2),
              score: Math.min(100, signal.score * 1.1)
            }));
            operatorState.telemetry.SVI = Math.min(100, operatorState.telemetry.SVI * 1.15);
            operatorState.telemetry.CBU = Math.max(10, operatorState.telemetry.CBU * 0.8); // Reduce load
            operatorState.telemetry.AP = Math.max(0, operatorState.telemetry.AP * 0.4); // Clear pressure
            operatorState.updatedAt = Date.now();
          }
          broadcast();
        }
      } catch (e) {
        console.error("UI_EVENT processing error", e);
      }
    });

    ws.send(JSON.stringify({
      type: "STATE_UPDATE",
      payload: operatorState,
      signals: lastProcessed
    }));
  });
  } catch (err) {
    console.error("[CRITICAL_SERVER_FAILURE]", err);
    process.exit(1);
  }
}

startServer().catch(err => {
  console.error("[SHUTDOWN_SYNC_FAILURE]", err);
  process.exit(1);
});
