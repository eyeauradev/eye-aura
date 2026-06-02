// ─── Test classification ────────────────────────────────────────────────────
export type TestType = "far" | "near";
export type Eye = "right" | "left";

/** Reading duration choices presented before each test */
export type TimerDuration = 3 | 5 | 7 | 10;

/** Far-vision only: 3 m calibrated distance */
export type TestingDistance = 3;

/** Near-vision viewing distance (cm) */
export type NearViewingDistance = 40;

// ─── Phase state machine ─────────────────────────────────────────────────────
export type TestPhase =
  | "type_select"
  | "instructions"
  | "calibration"
  | "duration_select"
  | "countdown"
  | "testing"
  | "results";

// ─── Snellen (far vision) ────────────────────────────────────────────────────
export type SnellenNotation =
  | "20/200"
  | "20/100"
  | "20/70"
  | "20/50"
  | "20/40"
  | "20/30"
  | "20/25"
  | "20/20"
  | "20/15";

export type Snellen6mNotation =
  | "6/60"
  | "6/30"
  | "6/21"
  | "6/15"
  | "6/12"
  | "6/9"
  | "6/7.5"
  | "6/6"
  | "6/4.5";

export interface SnellenLine {
  notation: SnellenNotation;      // 20/xx format
  notation6m: Snellen6mNotation;  // 6/xx equivalent
  exactHeightMm: number;          // Exact letter height in mm
  letters: string[];              // Fixed letters for this line
  label: string;
}

// ─── Near vision (Jaeger notation) ─────────────────────────────────────────────
export type JaegerNotation = "J16" | "J11" | "J9" | "J5" | "J3" | "J2" | "J1" | "J1+" | "—";

export interface NearVisionLine {
  jaeger: JaegerNotation;
  snellen: SnellenNotation;      // 20/xx equivalent
  snellen6m: Snellen6mNotation;  // 6/xx equivalent
  exactHeightMm: number;         // Exact letter height in mm at 40 cm
  pointSize: number;            // Times New Roman point size
  letters: string[];            // Optotype letters for this line
  label: string;
}

// ─── Calibration ─────────────────────────────────────────────────────────────
export interface CalibrationData {
  pxPerMm: number;
  cardWidthPx: number;
  deviceWidth: number;
  deviceHeight: number;
  dpr: number;
  timestamp: number;
}

// ─── Per-line result (shared between far + near) ──────────────────────────────
export interface LineResult {
  /** Snellen notation (far) or N notation (near) */
  notation: string;
  correct: boolean;
  skipped: boolean;
  retried: boolean;
  eye: Eye;
  timestamp: number;
  timerDuration: TimerDuration;
  /** Far only */
  letters?: string[];
  /** Near only */
  content?: string;
}

export interface EyeAcuityResult {
  eye: Eye;
  /** Best notation achieved (Snellen for far, N-notation for near) */
  bestNotation: string | null;
  lineResults: LineResult[];
}

export interface AcuityTestResult {
  sessionId: string;
  testType: TestType;
  rightEye: EyeAcuityResult;
  leftEye: EyeAcuityResult;
  timerDuration: TimerDuration;
  /** 3 for far (metres), 40 for near (cm) */
  testingDistance: number;
  calibration: CalibrationData;
  startedAt: number;
  completedAt: number;
  durationSeconds: number;
}

export type LineAction = "unable" | "retry" | "pause" | "exit";
