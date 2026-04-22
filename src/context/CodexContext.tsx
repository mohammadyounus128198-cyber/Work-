import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { 
  ProcessedSignal, 
  MeridianTelemetry, 
  CodexStep, 
  TraceAnnotation, 
  GuardrailEvent,
  EnvelopeEvaluation,
  PlateId,
} from "../lib/types";
import { generateAlerts } from "../lib/alerts";
import { generateOracleAnalysis } from "../services/geminiService";
import { 
  generateInitialState, 
  createDemoStaticTelemetry, 
  generateDemoSignals, 
  generateDemoStep 
} from "../lib/demoRuntime";
import { evaluateEnvelope } from "../lib/oracleKernelCore";
import { ACTIVE_MIRROR_CONTRACT } from "../lib/oracleMirror";

interface CodexContextType {
  data: ProcessedSignal[];
  meridian: MeridianTelemetry | null;
  codexHistory: CodexStep[];
  annotations: TraceAnnotation[];
  guardrailEvents: GuardrailEvent[];
  plateCounts: Record<string, number>;
  alerts: string[];
  isProcessing: boolean;
  lastSync: string;
  phi: number;
  readiness: number;
  s: number;
  energy: number;
  rateLimitState: "STABLE" | "THROTTLED";
  bootSequence: boolean;
  focusMode: "SCAN" | "FOCUS" | "SIMULATE";
  addAnnotation: (a: Omit<TraceAnnotation, "id" | "createdAt">) => Promise<void>;
  setFocusMode: (mode: "SCAN" | "FOCUS" | "SIMULATE") => void;
  selectedSignalId?: string;
  setSelectedSignal: (id: string) => void;
  stabilizeSystem: () => void;
  sendIntent: (action: string, meta?: any) => void;
  runOracleAnalysis: () => Promise<void>;
  lastAck: any | null;
  predictions: any[];
  trace: any[];
  oracleInsight: any | null;
  isAnalyzing: boolean;
  lastEvaluation: EnvelopeEvaluation | null;
}

const CodexContext = createContext<CodexContextType | undefined>(undefined);

export const CodexProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // ... existing states ...
  const [data, setData] = useState<ProcessedSignal[]>([]);
  const [meridian, setMeridian] = useState<MeridianTelemetry | null>(null);
  const [codexHistory, setCodexHistory] = useState<CodexStep[]>([]);
  const [annotations, setAnnotations] = useState<TraceAnnotation[]>([]);
  const [guardrailEvents, setGuardrailEvents] = useState<GuardrailEvent[]>([]);
  const [plateCounts, setPlateCounts] = useState<Record<string, number>>({
    "I": 0, "II": 0, "III": 0, "IV": 0, "V": 0, "VI": 0, "VII": 0, "VIII": 0, "IX": 0
  });
  const [alerts, setAlerts] = useState<string[]>([]);
  const [bootSequence, setBootSequence] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSync, setLastSync] = useState<string>("");
  const [phi, setPhi] = useState(0);
  const [readiness, setReadiness] = useState(0);
  const [s, setS] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [rateLimitState, setRateLimitState] = useState<"STABLE" | "THROTTLED">("STABLE");
  const [focusMode, setFocusModeLocal] = useState<"SCAN" | "FOCUS" | "SIMULATE">("SCAN");
  const [selectedSignalId, setSelectedSignalId] = useState<string | undefined>(undefined);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [lastAck, setLastAck] = useState<any | null>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [trace, setTrace] = useState<any[]>([]);
  const [oracleInsight, setOracleInsight] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState<EnvelopeEvaluation | null>(null);
  const [usingDemo, setUsingDemo] = useState(false);
  const demoRef = React.useRef<any>(generateInitialState());

  const inferSynergy = (nextPhi: number, nextReadiness: number, nextEnergy: number) => {
    return Math.max(
      0,
      Math.min(100, Number((Math.max(0, nextPhi - 60) * 0.7 + nextReadiness * 0.18 + nextEnergy * 0.12).toFixed(1))),
    );
  };

  const runOracleAnalysis = async () => {
    if (!meridian) return;
    setIsAnalyzing(true);
    try {
      const insight = await generateOracleAnalysis({
        SVI: meridian.vitalityIndex,
        OM: meridian.operationalMomentum,
        AP: meridian.anomalyPressure,
        phi,
        readiness,
        energy,
        mode: focusMode
      });
      setOracleInsight(insight);
    } catch (err) {
      console.error("[ORACLE_ERR]", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sendIntent = (action: string, meta?: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "INTENT",
        payload: { action, meta }
      }));
    }
  };

  const setFocusMode = (mode: "SCAN" | "FOCUS" | "SIMULATE") => {
    setFocusModeLocal(mode);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "UI_EVENT",
        payload: { action: "SET_FOCUS_MODE", mode }
      }));
    }
  };

  const setSelectedSignal = (id: string) => {
    setSelectedSignalId(id);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "UI_EVENT",
        payload: { action: "SELECT_SIGNAL", id }
      }));
    }
  };

  const stabilizeSystem = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "UI_EVENT",
        payload: { action: "STABILIZE_SYSTEM" }
      }));
    }
  };

  const fetchInitialLabData = async (retries = 3, delay = 1000) => {
    const endpoints = ["/api/lab"];
    
    // Minimal wait to let the server start up
    await new Promise(resolve => setTimeout(resolve, 1000));

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[CODEX_LOAD] Initiating Lab Sync (Attempt ${attempt}/${retries})...`);
        
        // Relative paths [safer for proxies] with cache busting
        const responses = await Promise.all(endpoints.map(url => {
          const buster = `?_t=${Date.now()}`;
          return fetch(`${url}${buster}`, {
            cache: 'no-store',
            headers: { 
              'Accept': 'application/json',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
        }));
        
        const results = await Promise.all(responses.map(async (res, i) => {
          if (!res.ok) {
            throw new Error(`HTTP_ERROR [${res.status}]: ${endpoints[i]}`);
          }
          const contentType = res.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            const text = await res.text();
            throw new Error(`CONTENT_TYPE_MISMATCH: Expected JSON, got ${contentType} from ${endpoints[i]}. Start: ${text.slice(0, 50)}`);
          }
          return res.json();
        }));

        const labData = results[0];
        setAnnotations(labData.annotations || []);
        setGuardrailEvents(labData.guardrailEvents || []);
        if (labData.plateCounts) setPlateCounts(labData.plateCounts);
        if (labData.telemetry) setMeridian(labData.telemetry);
        if (labData.phi !== undefined) setPhi(labData.phi);
        if (labData.readiness !== undefined) setReadiness(labData.readiness);
        setS(labData.s !== undefined ? labData.s : inferSynergy(labData.phi ?? phi, labData.readiness ?? readiness, labData.energy ?? energy));
        if (labData.energy !== undefined) setEnergy(labData.energy);
        if (labData.rateLimitState) setRateLimitState(labData.rateLimitState);

        console.log("[CODEX_LOAD] Lab Sync Successful.");
        return; 
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Network or CORS collision";
        console.error(`[LAB_FETCH_ERR] Attempt ${attempt} failed:`, errorMsg);
        
        if (attempt === retries) {
          console.error("[LAB_FETCH_FATAL] All sync attempts exhausted. Fallback telemetry active.");
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  };

  const addAnnotation = async (a: Omit<TraceAnnotation, "id" | "createdAt">) => {
    try {
      const res = await fetch("/api/codex/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(a)
      });
      if (!res.ok) throw new Error("Annotation persistence failed");
      const newAnnotation = await res.json();
      setAnnotations(prev => [...prev, newAnnotation]);
    } catch (err) {
      console.error("[ANNOTATION_POST_ERR]", err);
    }
  };

  useEffect(() => {
    fetchInitialLabData();
    
    const isHttps = window.location.protocol === "https:";
    const protocol = isHttps ? "wss:" : "ws:";
    const host = window.location.host || "localhost:3000";
    const wsUrl = `${protocol}//${host}/`;
    
    let demoInterval: any;

    const startDemoLoop = () => {
      console.warn("[CODEX_DEMO_START] Production Fallback Active.");
      setUsingDemo(true);
      demoInterval = setInterval(() => {
        setIsProcessing(true);
        demoRef.current.tick++;
        
        // Simulate drift
        demoRef.current.phi = Math.max(0, Math.min(100, demoRef.current.phi + (Math.random() - 0.5) * 4));
        demoRef.current.energy = Math.max(0, Math.min(100, demoRef.current.energy + (Math.random() - 0.5) * 2));
        demoRef.current.readiness = Math.max(0, Math.min(100, demoRef.current.readiness + (Math.random() - 0.5) * 3));
        demoRef.current.s = inferSynergy(demoRef.current.phi, demoRef.current.readiness, demoRef.current.energy);
        
        setPhi(demoRef.current.phi);
        setEnergy(demoRef.current.energy);
        setReadiness(demoRef.current.readiness);
        setS(demoRef.current.s);
        
        const demoTel = createDemoStaticTelemetry(demoRef.current);
        setMeridian(demoTel);
        
        if (demoRef.current.tick % 8 === 0) {
          const sigs = generateDemoSignals(demoRef.current.tick);
          setData(sigs);
          const step = generateDemoStep(demoRef.current.tick, sigs[0]);
          setCodexHistory(prev => [step, ...prev].slice(0, 50));
          setAlerts(generateAlerts(sigs));
        }
        
        setLastSync(new Date().toLocaleTimeString());
        setIsProcessing(false);
        if (bootSequence) setBootSequence(false);
      }, 1000);
    };

    console.log("[CODEX_WS_CONNECTING]", wsUrl);
    const connection = new WebSocket(wsUrl);
    setWs(connection);

    connection.onmessage = (event) => {
      try {
        setIsProcessing(true);
        const message = JSON.parse(event.data);
        
        if (message.type === "STATE_UPDATE" || message.type === "SYNC") {
          const payload = message.payload || message; 
          
          if (payload.ui) {
            if (payload.ui.focusMode) setFocusModeLocal(payload.ui.focusMode);
            if (payload.ui.selectedSignalId) setSelectedSignalId(payload.ui.selectedSignalId);
          }
          
          if (message.signals) setData(message.signals);
          else if (payload.signals) setData(payload.signals);
          else if (payload.data) setData(payload.data);

          const nextPhi = payload.phi !== undefined ? payload.phi : phi;
          const nextReadiness = payload.readiness !== undefined ? payload.readiness : readiness;
          const nextEnergy = payload.energy !== undefined ? payload.energy : energy;

          if (payload.readiness !== undefined) setReadiness(payload.readiness);
          if (payload.phi !== undefined) setPhi(payload.phi);
          if (payload.energy !== undefined) setEnergy(payload.energy);
          setS(payload.s !== undefined ? payload.s : inferSynergy(nextPhi, nextReadiness, nextEnergy));
          if (payload.resilience?.rateLimitState) setRateLimitState(payload.resilience.rateLimitState);

          if (payload.telemetry) {
            // Map OperatorState.telemetry to MeridianTelemetry
            const tel = payload.telemetry;
            const meridianData: MeridianTelemetry = {
              vitalityIndex: tel.SVI,
              cognitiveBandwidth: tel.CBU,
              environmentalQuality: tel.ESQ,
              operationalMomentum: tel.OM,
              anomalyPressure: tel.AP,
              pathMap: tel.pathMap,
              decisionLoop: {
                perception: "Complete",
                interpretation: "Complete",
                decision: "In-Motion",
                action: "Open",
                learning: "Open"
              },
              metrics: {
                stability: payload.currentSignal?.score || 88,
                load: tel.CBU,
                clarity: tel.ESQ,
                momentum: tel.OM,
                risk: payload.currentSignal?.risk || 12,
                harmonicAlignment: 92,
                fractalDensity: 45,
                snr: 12.5
              },
              guardians: [
                { id: "g1", name: "Synthesis", symbol: "S", status: "ACTIVE", alignment: 94 },
                { id: "g2", name: "Traverser", symbol: "T", status: "ACTIVE", alignment: 88 }
              ],
              operator: {
                name: payload.operatorId || "Mohammad Saad Younus",
                focus: 0.92,
                energy: 0.85,
                cadence: 1.2,
                driftCorrection: 0.05
              },
              world: {
                globalPulse: "Transitional",
                marketTemperature: "Neutral",
                techSignal: "Accelerating",
                weather: { location: "Dubai", temp: 32, condition: "Clear", visibility: "10km" }
              },
              health: { heartbeat: true, artifactIntegrity: true, guardianAlignment: true, pathMapPosition: 0.42 }
            };
            setMeridian(meridianData);
          }

          if (payload.steps) setCodexHistory(payload.steps);
          if (payload.annotations) setAnnotations(payload.annotations);
          if (payload.guardrailEvents) setGuardrailEvents(payload.guardrailEvents);
          if (payload.plateCounts) setPlateCounts(payload.plateCounts);
          
          setAlerts(generateAlerts(message.signals || payload.signals || payload.data || []));
          setLastSync(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          
          if (bootSequence) {
            setTimeout(() => setBootSequence(false), 2000);
          }
        } else if (message.type === "ACK") {
          setLastAck(message.payload);
        } else if (message.type === "PREDICTION_VECT") {
          setPredictions(message.payload.snapshots || []);
        } else if (message.type === "TRACE_RESULT") {
          setTrace(message.payload.entries || []);
        }
      } catch (err) {
        console.error("[CODEX_WS_ERR]", err);
      } finally {
        setTimeout(() => setIsProcessing(false), 800);
      }
    };
    
    connection.onclose = () => {
      console.warn("[CODEX_WS_CLOSED] Connectivity lost.");
      startDemoLoop();
    };
    
    connection.onerror = (err) => {
      console.error("[CODEX_WS_FATAL]", err);
      startDemoLoop();
    };

    const killTimer = setTimeout(() => {
      if (connection.readyState !== WebSocket.OPEN) {
        console.warn("[CODEX_WS_TIMEOUT] Switching to Demo Mode.");
        connection.close();
        startDemoLoop();
      }
    }, 5000);
    
    return () => {
      connection.close();
      if (demoInterval) clearInterval(demoInterval);
      clearTimeout(killTimer);
    };
  }, []);

  useEffect(() => {
    const emptyPathMap = {
      north: [],
      east: [],
      south: [],
      west: [],
    };

    const evaluation = evaluateEnvelope(
      {
        sessionId: "mirror-ui",
        operatorId: "MIRROR",
        tick: Date.now(),
        phi,
        readiness,
        s,
        energy,
        device: "DESKTOP",
        engine: {
          phase: focusMode === "SIMULATE" ? "ACT" : focusMode === "FOCUS" ? "CHOOSE" : "GENERATE",
          status: "ACTIVE",
        },
        telemetry: {
          SVI: meridian?.vitalityIndex ?? 0,
          CBU: meridian?.cognitiveBandwidth ?? 0,
          ESQ: meridian?.environmentalQuality ?? 0,
          OM: meridian?.operationalMomentum ?? 0,
          AP: meridian?.anomalyPressure ?? 0,
          pathMap: meridian?.pathMap ?? emptyPathMap,
        },
        steps: codexHistory,
        annotations,
        guardrailEvents,
        plateCounts: plateCounts as Record<PlateId, number>,
        resilience: {
          rateLimitState,
          circuitBreaker: "CLOSED",
        },
        ui: {
          selectedSignalId,
          focusMode,
        },
        updatedAt: Date.now(),
      },
      ACTIVE_MIRROR_CONTRACT,
    );

    setLastEvaluation(evaluation);
  }, [annotations, codexHistory, energy, focusMode, guardrailEvents, meridian, phi, plateCounts, rateLimitState, readiness, s, selectedSignalId]);

  return (
    <CodexContext.Provider value={{
      data,
      meridian,
      codexHistory,
      annotations,
      guardrailEvents,
      plateCounts,
      alerts,
      isProcessing,
      lastSync,
      phi,
      readiness,
      s,
      energy,
      rateLimitState,
      bootSequence,
      focusMode,
      selectedSignalId,
      lastAck,
      predictions,
      trace,
      oracleInsight,
      isAnalyzing,
      lastEvaluation,
      addAnnotation,
      setFocusMode,
      setSelectedSignal,
      stabilizeSystem,
      sendIntent,
      runOracleAnalysis
    }}>
      {children}
    </CodexContext.Provider>
  );
};

export const useCodex = () => {
  const context = useContext(CodexContext);
  if (context === undefined) {
    throw new Error("useCodex must be used within a CodexProvider");
  }
  return context;
};
