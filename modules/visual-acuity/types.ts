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
  | "testing"
  | "results";

// ─── Snellen (far vision) ────────────────────────────────────────────────────
export type SnellenNotation =
  | "6/60"
  | "6/36"
  | "6/24"
  | "6/18"
  | "6/12"
  | "6/9"
  | "6/6"
  | "6/5";

export interface SnellenLine {
  notation: SnellenNotation;
  denominator: number;
  letterCount: number;
  label: string;
}

// ─── Near vision (Jaeger-equivalent N-point) ─────────────────────────────────
export type NearNotation = "N24" | "N18" | "N12" | "N8" | "N6" | "N5" | "N4";

export interface NearVisionLine {
  notation: NearNotation;
  /** Physical cap-height in mm at 40 cm viewing distance */
  capHeightMm: number;
  /** Reading content shown to the patient */
  content: string;
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
