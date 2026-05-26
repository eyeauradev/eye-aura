# Bugfix Requirements Document

## Introduction

The visual acuity testing flow (far and near) has a broken timer/progress architecture in
`modules/visual-acuity/steps/TestingStep.tsx` and `modules/visual-acuity/steps/NearTestingStep.tsx`.

Three observable defects stem from the same architectural flaw — two parallel, untied timing
systems are driving the same test:

1. The countdown ring inside the chart card is seeded with `timerDuration * chart.length`, so it
   displays the remaining time for the **entire eye** instead of the **current letter/line**.
   Patients see "22 / 45s" instead of the expected per-letter "5→4→3→2→1".
2. Line auto-advancement is driven by a separate `setInterval(..., timerDuration * 1000)` that is
   **not** wired to `timer.pause()`. Pressing Pause freezes the visual countdown but the test keeps
   advancing through lines in the background. Resume cannot recover the missed time.
3. There is no global progress bar that spans the entire test (right eye + left eye). The only
   progress indicator is a thin inline bar inside the card showing `lineIndex / chart.length`,
   which resets when the eye switches.

The bug is duplicated verbatim across the far (`TestingStep.tsx`) and near
(`NearTestingStep.tsx`) testing steps, so any fix must address both surfaces.

The fix replaces the two parallel timers with a single per-letter timer hook
(`useLetterTimer`), introduces a derived global progress hook
(`useAssessmentProgress`), and consolidates the duplicated UI into a shared
`TestingShell` component. Behaviour for everything outside the buggy timing/progress paths
(eye-intro screen, self-report screen, calibration, Snellen rendering, results) must remain
unchanged.

## Bug Analysis

### Current Behavior (Defect)

The bug surfaces during the `reading` phase of either testing step
(far or near) under the conditions listed below.

1.1 WHEN the reading phase begins for an eye with `timerDuration = D` seconds and a chart of
    `N` lines THEN the system seeds the countdown ring with `D * N` seconds and the visible
    countdown drains continuously from `D * N → 0` instead of resetting to `D` for each line.

1.2 WHEN the user presses Pause during the reading phase THEN the system freezes the visual
    countdown ring but the parallel `setInterval` continues firing every `D` seconds, so
    `lineIndex` keeps advancing and the patient loses lines they were still reading.

1.3 WHEN the user presses Resume after a pause THEN the system resumes the visual countdown
    from where it stopped, but the line index has already been advanced by the unpaused
    `setInterval`, so the displayed letters and the countdown are out of sync.

1.4 WHEN the patient has completed any number of letters on the right eye and the test is
    still mid-flight THEN the system displays no global progress indicator that spans the
    whole assessment (both eyes combined). The only progress UI is a per-eye
    `lineIndex / chart.length` mini bar inside the card that resets on eye switch.

1.5 WHEN the browser tab is backgrounded mid-test THEN the `setInterval`-based timing is
    throttled or de-synced by the browser and the per-letter ring drifts away from real
    elapsed time, because timing is anchored to ticks rather than `performance.now()` deltas.

1.6 WHEN the user rapidly taps Pause/Resume THEN multiple `setInterval` ticks may interleave
    with state updates and stale-closure callbacks (the displayed countdown and `lineIndex`
    can desynchronize); pause idempotency is not guaranteed.

1.7 WHEN the same logic is duplicated across `TestingStep.tsx` and `NearTestingStep.tsx`
    THEN any fix to one file must be manually mirrored in the other, and the duplication is
    the underlying enabler of all the bugs above.

### Expected Behavior (Correct)

2.1 WHEN the reading phase begins for an eye with `timerDuration = D` seconds THEN the system
    SHALL seed the countdown ring with exactly `D` seconds and the ring SHALL drain from
    `D → 0` for each individual letter/line, then reset to `D` when the next line begins.

2.2 WHEN the user presses Pause during the reading phase THEN the system SHALL freeze both
    the visual countdown ring and the line-advancement clock so that no line transition
    occurs while paused.

2.3 WHEN the user presses Resume after pausing with `R` milliseconds remaining on the current
    letter THEN the system SHALL continue the same letter from exactly `R` milliseconds — no
    restart of the letter, no skip ahead.

2.4 WHEN the assessment is in flight THEN the system SHALL display a single global progress
    bar in the top header that represents `completedLetters / (rightLines + leftLines)` and
    monotonically advances across the entire assessment, including across the right→left eye
    switch.

2.5 WHEN the browser tab is backgrounded THEN the system SHALL freeze the per-letter timer
    using the Page Visibility API (without changing the user-visible pause state) and SHALL
    resume timing on visibility return so total elapsed real time on a letter equals the
    `D` seconds the patient actually saw it.

2.6 WHEN the user taps Pause or Resume rapidly (idempotent calls) THEN the system SHALL NOT
    spawn duplicate `requestAnimationFrame` loops, SHALL NOT skip letters, and SHALL produce
    the same final state as a single Pause / single Resume.

2.7 WHEN the component (`TestingStep` or `NearTestingStep`) unmounts mid-test THEN the system
    SHALL cancel its `requestAnimationFrame` handle so no callback fires after unmount.

2.8 WHEN the final letter on the final eye completes THEN the system SHALL fire the all-done
    callback exactly once and transition to the `self_report` phase for the left eye — never
    twice, never zero times.

2.9 WHEN the timing/progress logic exists THEN it SHALL be implemented in a single shared
    place (`useLetterTimer`, `useAssessmentProgress`, `TestingShell`) so the far and near
    testing steps share the same correct behaviour.

### Unchanged Behavior (Regression Prevention)

#### Clinical Safety Envelope

This rewrite is infrastructure-only. It MUST NOT alter visual acuity scoring, optotype
scaling, Snellen progression, line thresholds, pass/fail determination, viewing
calibration, acuity calculations, rendering proportions, or eye workflow semantics.
Timing precision and rendering consistency may be improved, but clinical reliability
MUST NEVER be reduced.

3.1 WHEN the user is on the eye-intro screen of either test (`eyePhase === "eye_intro"`)
    THEN the system SHALL CONTINUE TO render the existing intro card (eye icon, "Cover your
    X eye" copy, distance copy, "Ready — Start Test" button) exactly as today, with no
    timing logic active.

3.2 WHEN the reading phase finishes for an eye THEN the system SHALL CONTINUE TO display the
    existing self-report screen (`eyePhase === "self_report"`) with the same list of
    selectable Snellen/Jaeger lines and the same "Could not read any line" option.

3.3 WHEN the user selects a self-report notation for the right eye THEN the system SHALL
    CONTINUE TO advance to the left eye intro and reset progression state for the left
    eye exactly as today.

3.4 WHEN the user selects a self-report notation for the left eye THEN the system SHALL
    CONTINUE TO call `onComplete({ right, left })` with the same payload shape
    (`EyeAcuityResult` for each eye, `lineResults: []`, `bestNotation`).

3.5 WHEN the chart is rendered on each line THEN the system SHALL CONTINUE TO use
    `SnellenRenderer` with the same `letters`, `exactHeightMm`, `calibration`, and
    `animate` props, and the same `key={`${currentEye}-${lineIndex}`}` remount semantics.

3.6 WHEN the calibration step, instructions step, results step, duration selector, test-type
    selector, and `AcuitySession` orchestration run THEN the system SHALL CONTINUE TO behave
    identically — none of those files are modified by this fix.

3.7 WHEN the `useVisionProgression` hook is consumed elsewhere THEN the system SHALL
    CONTINUE TO export the same API; this hook is not part of the rewrite.

3.8 WHEN the colour palette is applied THEN the far test SHALL CONTINUE TO use accent
    `#0f4f4b` (deep teal) and the near test SHALL CONTINUE TO use accent `#b5964d` (gold);
    the shared `TestingShell` is parameterized by accent colour.

3.9 WHEN the patient's Snellen line data, Jaeger line data, and calibration data are read
    THEN the system SHALL CONTINUE TO use the existing `SNELLEN_LINES` and
    `NEAR_VISION_LINES` arrays unchanged.

3.10 WHEN any non-buggy input flows through the system (keyboard interactions, mouse clicks
     outside Pause/Resume, calibration input, results computation) THEN the fixed code SHALL
     produce exactly the same observable behaviour as the original code.

3.11 WHEN the optotype rendering math runs (`rawCapPx = exactHeightMm * pxPerMm`,
     `capPx = max(rawCapPx, MIN_CAP_PX)`, `fontSize = capPx / CAP_HEIGHT_RATIO` with
     `MIN_CAP_PX = 4` and `CAP_HEIGHT_RATIO = 0.711`) THEN the system SHALL CONTINUE TO
     produce identical numeric values for `capPx`, `fontSize`, `slotW`, `gap`, `padH`,
     `padV`, `svgW`, `svgH`, and `baselineY` for the same `(letters, exactHeightMm,
     calibration)` triple — these constants and this pipeline SHALL NOT be modified by the
     rewrite.

3.12 WHEN calibration is performed via `CalibrationStep.tsx` THEN the system SHALL CONTINUE
     TO produce a `CalibrationData` object with the same shape (`pxPerMm`, `cardWidthPx`,
     `deviceWidth`, `deviceHeight`, `dpr`, `timestamp`) and the same numeric `pxPerMm =
     cardLongPx / 85.60` derivation; `CalibrationStep.tsx` SHALL NOT be modified by this
     rewrite.

3.13 WHEN `SnellenRenderer` is invoked with the same `(letters, exactHeightMm,
     calibration)` triple before and after the rewrite THEN the system SHALL CONTINUE TO
     emit an SVG with byte-identical numeric `width`, `height`, `viewBox`, `<text>`
     `fontSize`, per-letter `x` (`slotCenterX`), and `y` (`baselineY`) attribute values;
     `SnellenRenderer.tsx` and `optotypes.ts` SHALL NOT be modified by this rewrite.

3.14 WHEN the testing flow reads chart data THEN the system SHALL CONTINUE TO use
     `SNELLEN_LINES` (far) and `NEAR_VISION_LINES` (near) with the exact same array
     length, the exact same per-line ordering, and the exact same per-line attribute
     values for `exactHeightMm`, `letters`, `notation`, `notation6m` (far),
     `jaeger`, `snellen`, `snellen6m`, `pointSize`, `label` (near).

3.15 WHEN the user has answered the right-eye and left-eye self-report screens THEN the
     system SHALL CONTINUE TO compute `bestNotation` per eye and assemble the
     `EyeAcuityResult` and downstream `AcuityTestResult` payload (`testType`,
     `testingDistance`, `timerDuration`, `calibration`, `rightEye`, `leftEye`,
     `startedAt`, `completedAt`, `durationSeconds`, `sessionId`) using the exact same
     logic; `AcuitySession.handleTestComplete` SHALL NOT be modified by this rewrite.

3.16 WHEN the progression / pass-fail logic runs (`useVisionProgression` with
     `stopAfterFails` defaulting to 2; "could not read any line" mapping to
     `bestNotation = null`) THEN the system SHALL CONTINUE TO produce identical
     line-advancement decisions for any sequence of `(correct, retried)` calls;
     `useVisionProgression.ts` and `ResultsStep.tsx` SHALL NOT be modified by this
     rewrite.

3.17 WHEN a window resize, orientation change, fullscreen toggle, or responsive
     breakpoint transition occurs during the reading phase THEN the system SHALL
     CONTINUE TO preserve current timer state (`status`, `remainingMs`, `letterIndex`)
     and current letter state, and SHALL NOT restart the timer, reset
     `letterIndex`, or remount `SnellenRenderer` solely as a consequence of the layout
     change.

3.18 WHEN the new global progress bar and the per-letter circular ring animate THEN
     they SHALL CONTINUE TO use only compositor-friendly properties (`transform`,
     `opacity`, `stroke-dashoffset`) and SHALL NOT trigger layout, reflow, or font
     metric recomputation on `SnellenRenderer`; Cumulative Layout Shift (CLS)
     attributable to the testing card SHALL remain at 0.

3.19 WHEN any wrapper, parent, or animation container is added around `SnellenRenderer`
     THEN the system SHALL NOT introduce CSS `transform`, `scale`, viewport-relative
     units (`vw`, `vh`, `%`), or any layout style that mutates the rendered optotype's
     physical mm size on screen; the rendered-mm-vs-target-mm deviation budget SHALL
     remain ≤ 5% per the existing engine specification.

3.20 WHEN the clinical UX runs end-to-end THEN the system SHALL CONTINUE TO present the
     same flow (eye intro → reading → self-report; right eye → left eye), the same copy,
     and the same CTA labels, except for the global progress header layout and the
     removal of the inline `lineIndex / chart.length` mini-bar already covered in
     section 2; eye-switch semantics and response interpretation SHALL be unchanged.
