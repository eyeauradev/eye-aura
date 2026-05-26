# Implementation Plan

## Overview

This plan rewrites the visual acuity timer/progress architecture. The first two tasks
establish the bug reproduction (Property 1, exploration) and the preservation baseline
(Property 2) on the UNFIXED code. The third task implements the fix in the order
hooks → shell → wrappers → cleanup → docs, and the fourth is a final verification
checkpoint.

The fix introduces:

- `useLetterTimer` (RAF-based, single source of truth, idempotent pause/resume,
  visibility-aware, unmount-safe).
- `useAssessmentProgress` (pure derivation of cross-eye global progress).
- `TestingShell` (shared component for far + near tests with the new global header
  layout from the screenshot).
- Thin `TestingStep` and `NearTestingStep` wrappers; deletion of `useAssessmentTimer`.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2", "2.5", "3.12"] },
    { "wave": 2, "tasks": ["3.1", "3.2"] },
    { "wave": 3, "tasks": ["3.3"] },
    { "wave": 4, "tasks": ["3.4", "3.5"] },
    { "wave": 5, "tasks": ["3.6", "3.7"] },
    { "wave": 6, "tasks": ["3.8", "3.9", "3.10", "3.11", "3.13"] },
    { "wave": 7, "tasks": ["4"] }
  ]
}
```

Reading guide:

```
1. Bug-condition exploration test (UNFIXED) ─┐
2. Preservation property tests (UNFIXED) ────┤  must complete before 3.x
2.5 Clinical invariance tests (UNFIXED) ─────┤  pins clinical math baseline
3.12 Golden replay capture (UNFIXED) ────────┘  pins clinical behaviour baseline

3.1 useLetterTimer ─┐
                    ├─► 3.3 TestingShell ─► 3.4 TestingStep wrapper ─┐
3.2 useAssessmentProgress ─┘                3.5 NearTestingStep wrapper ┤
                                                                       ├─► 3.6 Delete useAssessmentTimer
                                                                       ├─► 3.7 Update VISUAL_ACUITY_ENGINE.md
                                                                       │
                                          3.8 Re-run task 1 (must PASS) ┤
                                          3.9 Re-run task 2 (must PASS) ┤
                                          3.10 Re-run task 2.5 (must PASS)┤
                                          3.11 Resize/reflow integration ┤
                                          3.13 Re-run task 3.12 (must PASS) ┘
                                                                       │
                                                                       ▼
                                                                       4. Checkpoint
```

Edges:

- 1 → 3.1, 3.3 (exploration test pins expected behaviour for the hooks/shell).
- 2 → 3.4, 3.5 (preservation test pins behaviour the wrappers must keep).
- 2.5 → 3.10 (clinical-invariance tests are re-run after the fix to prove no clinical
  regression).
- 3.12 → 3.13 (golden replay baseline is re-run against the fixed engine).
- 3.1 → 3.3 (shell consumes the timer hook).
- 3.2 → 3.3 (shell consumes the progress hook).
- 3.3 → 3.4, 3.5 (wrappers consume the shell).
- 3.3 → 3.11 (resize/reflow integration test needs `TestingShell` to exist).
- 3.4, 3.5 → 3.6 (delete legacy hook only after no consumers remain).
- 3.4, 3.5 → 3.7 (docs reflect the actual file structure).
- 3.4, 3.5, 3.6 → 3.8, 3.9, 3.10, 3.13 (re-verify all property suites after the fix
  lands).
- 3.8, 3.9, 3.10, 3.11, 3.13 → 4 (final checkpoint).

## Tasks

- [x] 1. Write bug condition exploration property test
  - **Property 1: Bug Condition** - Per-Letter Timer Resets and Pause Stops Line Advancement
  - **CRITICAL**: This test MUST FAIL on the unfixed code — failure confirms the bug exists.
  - **DO NOT attempt to fix the test or the code when it fails.**
  - **NOTE**: This test encodes the expected correct behaviour (Property 1 in design); it
    will validate the fix when it passes after implementation.
  - **GOAL**: Surface counterexamples that demonstrate the bug exists.
  - **Scoped PBT Approach**: Combine a small set of deterministic scoped cases (e.g.
    `timerDuration = 5`, `chartLength = 9`, `pauseAtMs = 7000`) with `fast-check` generators
    over `(timerDuration ∈ {3,5,7,10}, chartLength ∈ [1, 15], pauseAtMs, waitMs,
    interaction)` to broaden coverage.
  - Set up the test runner: add `vitest`, `fast-check`, `@testing-library/react`, and
    `happy-dom` (or `jsdom`) as devDependencies; add a `test` script to `package.json`;
    create `vitest.config.ts` with a DOM environment.
  - Place the test at `modules/visual-acuity/__tests__/bug-condition.exploration.test.ts`.
  - Drive the test through a thin harness that mounts the existing reading-phase logic of
    `TestingStep` (or a minimal extracted shim) so the unfixed timer/progress paths run end
    to end. Use fake timers (`vi.useFakeTimers`) and a `requestAnimationFrame` polyfill that
    is driven by `vi.advanceTimersByTime`.
  - Encode the following assertions, all of which derive from the Bug Condition in design:
    - **(A) Per-letter ring scope.** Just after `handleEyeBegin`, the displayed countdown
      seconds equals `timerDuration`, NOT `timerDuration * chartLength`.
    - **(B) Pause stops advancement.** After `pauseAtMs`, simulate Pause; advance fake time
      by `2 * timerDuration * 1000`; assert `lineIndex` is unchanged.
    - **(C) Resume continuity.** Pause at `pauseAtMs`, wait `waitMs`, resume; assert
      remaining time on the current letter is `timerDuration * 1000 - pauseAtMs ± 16 ms`.
    - **(D) Global progress bar exists.** Query for `[data-testid="va-global-progress"]`
      (the design contract for the new bar) and assert it is in the DOM with
      `aria-valuenow` reflecting `completedLetters / totalLetters`.
    - **(E) Visibility freeze.** Dispatch `visibilitychange` with `document.hidden = true`,
      advance time by 5000 ms, return to visible; assert remaining time on the letter has
      not drifted.
    - **(F) Rapid pause/resume idempotency.** Spam `pause`/`resume` 50× in 50 ms; assert
      `lineIndex` is unchanged and only one logical timer is active (assert
      `requestAnimationFrame` was scheduled at most as many times as on a single
      pause/resume baseline).
    - **(G) Unmount cleanup.** Mount, advance to mid-letter, unmount, advance time by
      `5 * timerDuration * 1000`; assert no callbacks fire (spy on `onComplete`).
    - **(H) onAllComplete fires exactly once.** Run an eye to completion; assert the eye→
      `self_report` transition fires exactly once.
  - Run the test on UNFIXED code.
  - **EXPECTED OUTCOME**: Test FAILS for assertions (A) (B) (D) (E) (F) — this confirms the
    bug exists. Document each counterexample fast-check produces (e.g.
    `(timerDuration=5, chartLength=9, displayedRemaining=45)`).
  - Mark task complete when the test is written, run, and the failures are documented in
    the test output and in this file as a comment block.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Reading-Phase Behaviour and Unrelated Modules
  - **IMPORTANT**: Follow the observation-first methodology — render the UNFIXED
    `TestingStep` and `NearTestingStep` for non-buggy inputs, observe the actual outputs,
    then write property-based tests that assert those outputs across the input domain.
  - Place the test at `modules/visual-acuity/__tests__/preservation.test.ts` (and
    `.tsx` companion for component snapshot assertions if needed).
  - Use `fast-check` to generate `(testKind ∈ {far, near}, eyePhase ∈ {eye_intro,
    self_report}, currentEye ∈ {right, left}, timerDuration ∈ {3,5,7,10},
    selectedNotation ∈ validNotations ∪ {null})` and assert the following preservation
    invariants:
    - **Eye-intro snapshot equivalence.** For all (testKind, currentEye, timerDuration),
      the rendered DOM for `eye_intro` is the same on F and F' (capture baseline snapshot
      on F first; the post-fix run must match).
    - **Self-report snapshot equivalence.** For all (testKind, currentEye), the
      `self_report` screen renders the same list of selectable lines, the same labels, and
      the same "Could not read any line" button.
    - **Eye switch behaviour.** Pick any notation on right-eye `self_report`; assert
      `currentEye → "left"`, `eyePhase → "eye_intro"`, and the letter index resets to 0.
    - **`onComplete` payload equivalence.** For all `(rightSelection, leftSelection)` drawn
      from `validNotations ∪ {null}`, F and F' invoke `onComplete` with the same payload
      (`{ right: { eye: "right", bestNotation, lineResults: [] }, left: { eye: "left",
      bestNotation, lineResults: [] } }`).
    - **`SnellenRenderer` props equivalence.** For all (currentEye, letterIndex), the
      props passed to `SnellenRenderer` are identical (`letters`, `exactHeightMm`,
      `calibration`, `animate`) and the `key={`${currentEye}-${letterIndex}`}` semantic is
      preserved.
    - **`useVisionProgression` direct equivalence.** Direct hook behaviour is unchanged
      (no edits to its source file).
    - **Far accent `#0f4f4b`, near accent `#b5964d`.** Assert the rendered DOM contains
      the appropriate accent colour for each test kind.
  - Run on UNFIXED code.
  - **EXPECTED OUTCOME**: All preservation tests PASS on the unfixed code (they capture
    the baseline behaviour to preserve). Tests run via fake timers; observation-first
    snapshots are recorded into `__snapshots__/`.
  - Mark task complete when the tests are written, run, and passing on the unfixed code.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [x] 2.5 Write Clinical Invariance Property Tests (BEFORE implementing fix)
  - **Property 3: Clinical Invariance** - Snellen Math, Calibration, and Progression Are Untouched
  - **IMPORTANT**: This task locks down the clinical safety envelope. The tests MUST PASS
    on the UNFIXED code (capturing baseline clinical outputs) and MUST STILL PASS on the
    fixed code (proving the rewrite is purely infrastructural). Any failure after the
    fix means the rewrite has regressed clinical math and MUST be reverted/corrected.
  - Place the tests at `modules/visual-acuity/__tests__/clinical-invariance.test.tsx`.
  - **(A) `SnellenRenderer` numeric output equivalence (property-based).** Use
    `fast-check` to generate `(letters, exactHeightMm, pxPerMm)` triples drawn from:
    - `letters` ∈ permutations of `["C","D","H","K","N","O","R","S","V","Z"]` of length
      1..8.
    - `exactHeightMm` ∈ `{3.27, 4.36, 5.50, 6.50, 8.70, 10.90, 15.30, 21.80, 43.60}`
      (the full set of Snellen and near `exactHeightMm` values from `SNELLEN_LINES` and
      `NEAR_VISION_LINES`).
    - `pxPerMm` ∈ a realistic range derived from typical card calibration (e.g.
      `[1.5, 8.5]`).
    For each triple, render the UNFIXED `SnellenRenderer` and the FIXED
    `SnellenRenderer` (which is the same module — the property is that the file is
    untouched) and assert byte-equal:
    - The SVG element's `width` and `height` numeric attributes.
    - The SVG element's `viewBox` attribute.
    - Each `<text>` child's `font-size`, `x`, `y`, `text-anchor`, and `font-family`
      attributes.
    - The DOM bounding-rect width/height of the SVG.
  - **(B) `AcuitySession.handleTestComplete` payload equivalence (property-based).** Use
    `fast-check` to generate `(rightResponses, leftResponses)` sequences where each
    response is drawn from `validNotations ∪ {null}`. Mount `AcuitySession` on F and F'
    (where F' is the post-rewrite tree) with the same `(calibration, timerDuration,
    testType)` props. Drive the same response sequence on each. Capture the
    `AcuityTestResult` payload submitted by each. Assert deep equality, ignoring the
    volatile fields `sessionId`, `startedAt`, `completedAt`, and `durationSeconds`.
  - **(C) Snellen / Jaeger chart-data snapshot.** Use `expect(...).toMatchSnapshot()`
    on the entire `SNELLEN_LINES` array and the entire `NEAR_VISION_LINES` array. Tests
    fail if any line attribute (length, order, `exactHeightMm`, `letters`, `notation`,
    `notation6m`, `jaeger`, `snellen`, `snellen6m`, `pointSize`, `label`) changes.
  - **(D) `useVisionProgression` API + reducer snapshot.** Snapshot the function
    signature surface (exported types, return type) via a `.d.ts` projection or a
    runtime probe of the returned object's keys. Drive the hook through a deterministic
    sequence of `(correct, retried)` calls and snapshot the full
    `(index, consecutiveFails, isComplete)` trajectory. Tests fail if any reducer
    behaviour changes.
  - Run on UNFIXED code: all assertions in (A)–(D) MUST PASS. The snapshots written on
    this run constitute the baseline that the post-fix run must match exactly.
  - Re-run after the fix lands (in Task 3.10 below) and assert all tests STILL PASS.
  - _Requirements: 3.11, 3.12, 3.13, 3.14, 3.15, 3.16_

- [x] 3. Fix for visual acuity timer/progress architecture

  - [x] 3.1 Implement `useLetterTimer` hook
    - Create `modules/visual-acuity/engine/useLetterTimer.ts` per the TypeScript signature
      and reducer-based state machine in design § Fix Implementation A.
    - Use a single `requestAnimationFrame` loop driven by `performance.now()` deltas.
    - Implement reducer actions: `START`, `PAUSE`, `RESUME`, `VISIBILITY_HIDE`,
      `VISIBILITY_SHOW`, `TICK`, `NEXT_LETTER`, `ALL_COMPLETE`, `RESET`.
    - Implement `pause()` / `resume()` as idempotent (no duplicate RAF; resume re-anchors
      `lastTickAt` so post-resume frames credit only post-resume time).
    - Wire a `visibilitychange` listener that dispatches `VISIBILITY_HIDE` /
      `VISIBILITY_SHOW` without mutating `userPaused`.
    - Ensure `onLetterComplete(completedIndex)` fires when the letter rolls over and
      `onAllComplete()` fires exactly once when the final letter completes (guard with
      `hasFiredRef` to defeat StrictMode double effects).
    - On unmount, cancel the active RAF handle.
    - Maintain invariants: `0 ≤ remainingMs ≤ durationMs`, `0 ≤ letterIndex < totalLetters`,
      monotonic `letterIndex` while running.
    - _Bug_Condition: isBugCondition(input) where phase = "reading" and any of (A)–(F)
      hold (see design § Bug Condition)_
    - _Expected_Behavior: per-letter ring resets at line boundaries; pause/resume freezes
      and continues from exact remaining ms; visibility freeze; idempotent pause/resume;
      unmount cancels RAF; onAllComplete fires exactly once_
    - _Preservation: This hook is brand-new; no existing API surface is touched_
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7, 2.8_

  - [x] 3.2 Implement `useAssessmentProgress` hook
    - Create `modules/visual-acuity/engine/useAssessmentProgress.ts` per the TypeScript
      signature and pure-derivation pseudocode in design § Fix Implementation B.
    - Pure derivation only — no `useState`, no `useEffect`. Use `useMemo` for
      referential stability.
    - Return `{ completedLetters, totalLetters, globalPercent, currentLevel,
      totalLevels }`.
    - NaN-safe: `globalPercent = 0` when `totalLetters = 0`.
    - Clamp `completedLetters` to `[0, totalLetters]`.
    - _Bug_Condition: isBugCondition(input) where (C) globalProgressMissing() holds_
    - _Expected_Behavior: a single global progress value spans both eyes monotonically_
    - _Preservation: This hook is brand-new; no existing API surface is touched_
    - _Requirements: 2.4_

  - [x] 3.3 Implement `TestingShell` component
    - Create `modules/visual-acuity/steps/TestingShell.tsx` per the props and composition
      in design § Fix Implementation C.
    - Own the eye-intro / reading / self-report state machine (`currentEye`, `eyePhase`,
      `rightBest`).
    - Use `useLetterTimer({ totalLetters: chart.length, durationMs: timerDuration * 1000,
      onAllComplete: () => setEyePhase("self_report") })`.
    - Use `useAssessmentProgress({ currentEye, letterIndex: timer.letterIndex,
      totalLinesPerEye: chart.length })`.
    - Render the eye-intro and self-report screens with copy and structure preserved from
      the original (preservation tests in task 2 are the contract).
    - Render the reading-phase header per the screenshot:
      - Left: eye icon (accent-coloured) + "{Right|Left} Eye" + "Level
        {progress.currentLevel}/{progress.totalLevels}"
      - Right: "Snellen {currentLine.notation} ({currentLine.notation6m})"
      - A single thin global progress bar
        (`width: ${progress.globalPercent * 100}%`, accent fill, with
        `data-testid="va-global-progress"` and ARIA roles for accessibility).
    - REMOVE the inline `(lineIndex / chart.length)` mini bar inside the white card.
    - KEEP the per-letter circular ring inside the card, now driven by `timer.elapsedFraction`
      and `timer.remainingSeconds`.
    - KEEP the pause banner copy and the Pause/Resume button; wire to `timer.pause()` /
      `timer.resume()`.
    - On right-eye `self_report` selection: store `rightBest`, `setCurrentEye("left")`,
      `setEyePhase("eye_intro")`, `timer.reset()`.
    - On left-eye `self_report` selection: call `onComplete` with the same payload shape
      as the original.
    - Eliminate ~250 lines of duplication between `TestingStep` and `NearTestingStep`.
    - _Bug_Condition: isBugCondition(input) where phase = "reading"_
    - _Expected_Behavior: header layout matches the screenshot; per-letter ring is correct;
      pause/resume stops/continues line advancement_
    - _Preservation: eye-intro and self-report screens, eye-switch semantics, onComplete
      payload, SnellenRenderer call shape, accent colours all unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.1, 3.2, 3.3, 3.4, 3.5,
      3.8, 3.10_

  - [x] 3.4 Refactor `TestingStep` to a thin wrapper
    - Replace the body of `modules/visual-acuity/steps/TestingStep.tsx` with the ~25-line
      wrapper shown in design § Fix Implementation D (far variant).
    - Pass `chart = SNELLEN_LINES` mapped to `TestingShellChartLine`, `accent = { primary:
      "#0f4f4b", primaryHover: "#0a3a36", ringPaused: "#b5964d" }`,
      `distanceLabel = "3 metres"`, `testKind = "far"`.
    - Delete the local `setInterval` advance logic, the `lineIndexRef`, the `intervalRef`,
      the `startTimeRef`, the inline mini-progress bar, and the
      `useAssessmentTimer` import.
    - Verify `npm run typecheck` passes and the `getDiagnostics` reports no errors.
    - _Bug_Condition: isBugCondition(input) where phase = "reading"_
    - _Expected_Behavior: same as TestingShell, scoped to far accent / 3 metres copy_
    - _Preservation: external props (`calibration`, `timerDuration`, `onComplete`) and
      payload shape unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.9, 3.4, 3.5, 3.6, 3.8_

  - [x] 3.5 Refactor `NearTestingStep` to a thin wrapper
    - Replace the body of `modules/visual-acuity/steps/NearTestingStep.tsx` with the
      ~25-line wrapper shown in design § Fix Implementation D (near variant).
    - Pass `chart = NEAR_VISION_LINES` mapped to `TestingShellChartLine` (note `notation`
      maps from `line.snellen` and `notation6m` from `line.snellen6m`),
      `accent = { primary: "#b5964d", primaryHover: "#9f833f", ringPaused: "#b5964d" }`,
      `distanceLabel = "35 cm"`, `testKind = "near"`.
    - Delete the local `setInterval` advance logic and the `useAssessmentTimer` import.
    - Verify typecheck and diagnostics are clean.
    - _Bug_Condition: isBugCondition(input) where phase = "reading"_
    - _Expected_Behavior: same as TestingShell, scoped to near accent / 35 cm copy_
    - _Preservation: external props and payload shape unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.9, 3.4, 3.5, 3.6, 3.8_

  - [x] 3.6 Delete `useAssessmentTimer.ts`
    - `grep_search` for `useAssessmentTimer` across the workspace to confirm the only
      remaining references are inside the file itself or its imports from the now-rewritten
      step files.
    - If no other consumers exist, delete `modules/visual-acuity/engine/useAssessmentTimer.ts`.
    - If a consumer remains (unlikely), mark the file `@deprecated` in a JSDoc block and
      file a follow-up task.
    - Run `npm run typecheck` to confirm nothing breaks.
    - _Preservation: the file was only consumed by the two step files now refactored; no
      external API contract is broken_
    - _Requirements: 2.9, 3.6, 3.7_

  - [x] 3.7 Update `VISUAL_ACUITY_ENGINE.md`
    - Update Section 5 ("Assessment Flow") to describe the new `useLetterTimer` →
      `useAssessmentProgress` → `TestingShell` triad. Replace the paragraph that says
      "Lines advance using a dedicated `setInterval`" with a description of the RAF-based
      single-source-of-truth design.
    - Update Section 8 ("File Reference") to remove the `engine/useAssessmentTimer.ts` row
      and add three new rows: `engine/useLetterTimer.ts`, `engine/useAssessmentProgress.ts`,
      `steps/TestingShell.tsx`.
    - This is documentation-only and has no impact on runtime behaviour.
    - _Preservation: documentation must accurately describe the new architecture_

  - [x] 3.8 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Per-Letter Timer Resets and Pause Stops Line Advancement
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test.
    - The test from task 1 encodes the expected behaviour. When this test passes, it
      confirms the expected behaviour is satisfied.
    - Run `vitest --run modules/visual-acuity/__tests__/bug-condition.exploration.test.ts`.
    - **EXPECTED OUTCOME**: Test PASSES on the fixed code (confirms bug is fixed).
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [x] 3.9 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Reading-Phase Behaviour and Unrelated Modules
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests.
    - Run `vitest --run modules/visual-acuity/__tests__/preservation.test.ts` (and the
      `.tsx` companion if added).
    - **EXPECTED OUTCOME**: Tests PASS on the fixed code (confirms no regressions).
    - Confirm all tests still pass after fix (no regressions).
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

  - [x] 3.10 Verify Clinical Invariance Tests Still Pass
    - **Property 3: Clinical Invariance** - Snellen Math, Calibration, and Progression Are Untouched
    - **IMPORTANT**: Re-run the SAME tests from task 2.5 — do NOT write new tests.
    - Run `vitest --run modules/visual-acuity/__tests__/clinical-invariance.test.tsx`.
    - **EXPECTED OUTCOME**: All assertions MUST PASS on the fixed code. If any fail,
      the rewrite has regressed clinical math and MUST be reverted or corrected before
      proceeding. The snapshots written in task 2.5 are the contract.
    - Verify in particular that:
      - `SnellenRenderer` produces byte-equal SVG attributes for every generated
        `(letters, exactHeightMm, pxPerMm)` triple (Property A).
      - `AcuitySession` emits byte-equal `AcuityTestResult` payloads (ignoring the
        volatile fields) for every generated `(rightResponses, leftResponses)`
        sequence (Property B).
      - `SNELLEN_LINES` and `NEAR_VISION_LINES` snapshots match (Property C).
      - `useVisionProgression` API and reducer trajectories match (Property D).
    - _Requirements: 3.11, 3.12, 3.13, 3.14, 3.15, 3.16_

  - [x] 3.11 Resize/Reflow & Animation Isolation Integration Test
    - Place the test at `modules/visual-acuity/__tests__/resize-reflow.test.tsx`.
    - **(A) Resize does not perturb timer state.** Mount `TestingShell` with a
      representative chart (e.g. far, 5 lines) and a calibration of `pxPerMm = 4`.
      Advance to letter 2 (using `vi.advanceTimersByTime`). Capture the timer state
      `{ status, letterIndex, remainingMs }`. Dispatch a `window.resize` event
      simulating a viewport change (e.g. 1440×900 → 768×1024). Re-capture state and
      assert `letterIndex` and `status` are unchanged and `remainingMs` is within ±32
      ms of the captured value (one frame of tolerance).
    - **(B) Layout change does not change `SnellenRenderer` SVG dimensions.** Mount
      `TestingShell` and during a running letter, mutate the wrapper element's
      inline `width` style (e.g. from `100%` to `50%`). Query the rendered
      `<svg>` and assert its numeric `width` and `height` attributes are unchanged.
    - **(C) Global progress bar uses compositor-friendly properties.** Query the bar
      via `[data-testid="va-global-progress"]` and assert that its inline style or
      computed style uses `transform` (e.g. `transform: scaleX(...)`), not animated
      `width: ...%`. Inspect the per-letter ring and assert it uses
      `stroke-dashoffset` for its animation (no animated `r`, `cx`, or `cy`).
    - **(D) `SnellenRenderer` is not remounted on resize.** Add a `data-testid` to
      the rendered `<svg>` element from `SnellenRenderer` (or query the existing
      `role="img"` with the chart-line `aria-label`). Capture the DOM node before
      the resize, dispatch the resize, and assert the same DOM node reference is
      still present (React did not unmount/remount it).
    - Run on the fixed code; all assertions MUST PASS.
    - _Requirements: 3.17, 3.18, 3.19, 3.20_

  - [x] 3.12 Golden Replay Behavioural Equivalence Suite
    - **Property 4: Behavioural Equivalence** - Identical Clinical Behaviour Under Replayed Patient Interactions
    - **GOAL**: Guarantee the rewrite is infrastructural-only by replaying identical
      simulated patient interaction scripts through the OLD engine baseline (snapshotted
      from F before the rewrite) and the NEW engine, and assert byte-equal clinical
      outputs at every step. This is the strongest preservation contract in the spec.
    - Place the suite at `modules/visual-acuity/__tests__/golden-replay.test.tsx`.
    - **Step 1 — Capture golden baseline on UNFIXED code.** Before any source edits,
      run a script that drives the UNFIXED `AcuitySession` through a deterministic set
      of patient interaction scripts and writes the captured trajectories as
      golden-snapshot JSON files into `modules/visual-acuity/__tests__/__golden__/`.
      Each script is a sequence of high-level events:
      `{ kind: "tick", ms: number } | { kind: "pause" } | { kind: "resume" } |
       { kind: "select_notation", notation: string | null } | { kind: "ready_eye" }`.
      For each script, capture per-step:
      - `currentEye`, `eyePhase`, `letterIndex` (or its analogue in F).
      - `useVisionProgression` outputs (`index`, `consecutiveFails`, `isComplete`)
        when the test invokes it.
      - The `bestNotation` chosen for each eye.
      - The final `AcuityTestResult` payload from `handleTestComplete`,
        ignoring volatile fields (`sessionId`, `startedAt`, `completedAt`,
        `durationSeconds`).
      - The exact `SnellenRenderer` props passed at each `(currentEye, letterIndex)`.
    - **Script set (deterministic; covers each `timerDuration ∈ {3, 5, 7, 10}` for
      both far and near):**
      - **S1 — Pristine read-through.** Right eye: tick through every letter, pick the
        bottom-most notation. Left eye: tick through every letter, pick the bottom-most
        notation.
      - **S2 — Mid-test pause/resume.** Right eye: tick to mid-letter, pause, wait,
        resume, tick to end, pick a notation. Left eye: same.
      - **S3 — Multiple pause/resume cycles.** Right eye: pause/resume 3 times at
        different `pauseAtMs` values; complete the eye. Left eye: same.
      - **S4 — Self-report null on right.** Right eye: tick to end, pick `null`. Left
        eye: tick to end, pick the bottom-most notation.
      - **S5 — Self-report null on both.** Both eyes pick `null`.
      - **S6 — Self-report top notation only.** Both eyes pick the topmost (largest)
        notation.
      - **S7 — Self-report each notation in order.** For each notation N in the chart,
        replay a script that stops at N on both eyes; produces N golden files (where
        N is the chart length). This yields full coverage of `bestNotation` outputs.
      - **S8 — Visibility hide/show during reading.** Right eye: tick mid-letter, hide
        tab for 5s, show, complete. Left eye: tick mid-letter, hide for 30s, show,
        complete.
      - Each script is run for `(testKind, timerDuration)` ∈
        `{far, near} × {3, 5, 7, 10}` ⇒ 8 × 8 = 64 base trajectories, plus the
        per-notation expansion of S7.
    - **Step 2 — Replay against NEW engine.** After the rewrite, replay the SAME
      scripts through the NEW `AcuitySession` (which composes `TestingShell` +
      `useLetterTimer` + `useAssessmentProgress`). Capture the same trajectory
      structure.
    - **Step 3 — Assert byte-equal trajectories.** For each script:
      - Per-step `currentEye`, `eyePhase`, and `letterIndex` MUST match.
      - `useVisionProgression` outputs MUST match (because that hook is untouched).
      - `bestNotation` per eye MUST match.
      - `AcuityTestResult` payload MUST `deep-equal` the golden file (ignoring
        `sessionId`, `startedAt`, `completedAt`, `durationSeconds`).
      - `SnellenRenderer` prop sequence MUST match (`letters`, `exactHeightMm`,
        `calibration`, `animate`).
    - **Helpers required:**
      - A `golden-replay-harness.ts` test helper that exposes
        `replayScript(testKind, timerDuration, script): TrajectoryRecord` and runs
        the harness with `vi.useFakeTimers()`, fake RAF, and fake
        `performance.now()`.
      - A `golden-snapshot.ts` helper that reads/writes the JSON files under
        `__golden__/` and a CLI flag (`UPDATE_GOLDEN=1`) to overwrite the snapshot.
        The snapshot files are committed to git so the post-fix run reads the
        EXACT baseline captured pre-fix.
    - **Run order:**
      - **2a (now, on UNFIXED code).** Run with `UPDATE_GOLDEN=1` once, commit the
        produced `__golden__/` files. Then run again WITHOUT the flag and confirm all
        assertions PASS — this proves the harness is deterministic and the baseline
        is locked.
      - **2b (after the rewrite, in Task 3.13 below).** Run WITHOUT the flag against
        the new engine and confirm all assertions still PASS — this proves
        behavioural equivalence.
    - Mark this task complete only when (a) the golden files exist in
      `__golden__/`, (b) the deterministic re-run on UNFIXED code passes, and (c)
      the test file is committed.
    - _Requirements: 3.4, 3.5, 3.7, 3.8, 3.9, 3.11, 3.12, 3.13, 3.14, 3.15, 3.16, 3.20_

  - [x] 3.13 Verify Golden Replay Suite Passes Against New Engine
    - **Property 4: Behavioural Equivalence** - Identical Clinical Behaviour Under Replayed Patient Interactions
    - **IMPORTANT**: Re-run the SAME suite from task 3.12 — do NOT write new tests, do
      NOT regenerate the goldens.
    - Run `vitest --run modules/visual-acuity/__tests__/golden-replay.test.tsx`.
    - **EXPECTED OUTCOME**: ALL trajectories match the golden snapshots byte-for-byte
      (modulo volatile fields). Any failure means the rewrite has changed clinical
      behaviour and MUST be reverted/corrected before proceeding.
    - _Requirements: 3.4, 3.5, 3.7, 3.8, 3.9, 3.11, 3.12, 3.13, 3.14, 3.15, 3.16, 3.20_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run `npm run typecheck` — must be clean.
  - Run `npm run lint` — must be clean.
  - Run `vitest --run` — all tests in `modules/visual-acuity/__tests__/` must pass.
  - Manually exercise the assessment flow at `/patient/assessment/visual-acuity?id=<id>`
    for both Far and Near tests with each of `timerDuration ∈ {3, 5, 7, 10}`:
    - Per-letter ring drains 5→4→3→2→1 (or the chosen duration).
    - Pause stops advancement; resume continues from the same letter.
    - Global progress bar above the white card monotonically advances across both eyes.
    - Tab background mid-test does not skip letters on return.
    - Eye switch resets the per-letter timer cleanly.
  - Ensure all tests pass; ask the user if any questions arise (e.g. snapshot diffs they
    want to keep vs reject).

  ### Cross-Viewport Validation Matrix (Manual)

  Run the testing flow at `/patient/assessment/visual-acuity?id=<id>` (Far and Near) on
  each device/zoom/browser combination and record any deviation. The rewrite is accepted
  only if every cell passes.

  Devices:
  - 13" laptop
  - 15" / 16" laptop
  - 1080p external monitor
  - 1440p external monitor
  - Ultrawide external monitor
  - iPad / tablet
  - Android phone
  - iPhone

  Browser zoom: 80%, 100%, 125% on each device.

  Display class: Retina (DPR ≥ 2) and non-Retina (DPR = 1).

  Browsers: Chrome, Safari, Firefox, Edge (where available per platform).

  For each cell, confirm:
  - No optotype scaling drift (rendered mm matches `exactHeightMm` ± 5%).
  - No overflow or clipping of the chart card.
  - Letter spacing is consistent (no font stretching, no skew).
  - No distorted characters (sharp edges, no anti-aliasing artifacts).
  - Optotypes are correctly centered in the card.
  - No visual clipping at card edges.
  - No progress / header overlap with the chart card.

  Resize / reflow / fullscreen behaviour:
  - Resize the window mid-letter: timer state and letter state are preserved.
  - Rotate orientation (mobile/tablet): timer state and letter state are preserved.
  - Toggle browser fullscreen mid-letter: timer state and letter state are preserved.
  - Cross a responsive breakpoint mid-letter: timer state and letter state are preserved.

  Performance:
  - Run a Lighthouse Performance audit on the testing card.
  - Verify Cumulative Layout Shift (CLS) attributable to the testing card is 0.

  ### Final Acceptance Criteria

  The rewrite is successful ONLY if all of the following are true:

  - Timer architecture is cleaner (single source of truth in `useLetterTimer`; no
    parallel `setInterval`).
  - Pause/resume is deterministic (idempotent, no skipped letters, no duplicate RAF
    loops).
  - No memory leaks (RAF cancelled on unmount; visibility listeners removed on unmount;
    `onAllComplete` fires at most once).
  - Rendering is stable across devices (no scaling drift, no distortion, no clipping
    across the cross-viewport matrix above).
  - Optotype sizing remains clinically consistent (rendered-mm vs target-mm deviation
    ≤ 5% per the engine doc; clinical-invariance tests in 2.5 / 3.10 pass).
  - Snellen progression behaviour is unchanged (`SNELLEN_LINES`,
    `NEAR_VISION_LINES`, `useVisionProgression` byte-identical; preservation tests in
    2 / 3.9 pass).
  - Acuity outcomes remain identical for equivalent user input
    (`AcuitySession.handleTestComplete` payloads byte-equal modulo volatile fields).
  - Cross-screen rendering accuracy is preserved or improved (no new viewport-relative
    units in the optotype path; resize/reflow tests in 3.11 pass; CLS = 0).

## Notes

- **Order matters.** Tasks 1 and 2 MUST be run on the UNFIXED code before any source
  edits. Task 1 must FAIL (proving the bug exists). Task 2 must PASS (capturing the
  baseline behaviour to preserve).
- **Test framework.** The repo currently has no test runner. Task 1 sets one up:
  `vitest`, `fast-check`, `@testing-library/react`, and `happy-dom` (or `jsdom`) as
  devDependencies, plus a `test` script in `package.json` and a `vitest.config.ts`.
- **Property-based testing rationale.** Properties (timer invariants, monotonicity,
  preservation) are universally quantified statements over the input domain
  (`timerDuration`, `chartLength`, action sequences). `fast-check` covers them far better
  than a few hand-picked unit cases.
- **Scoped PBT for deterministic reproduction.** Where a defect is deterministic
  (e.g. the per-letter ring shows total-eye time on first render), the exploration test
  also includes one or more concrete fixed inputs so failure is immediate and stable on
  CI.
- **Page Visibility API.** The visibility integration is wired in the hook; the user's
  sticky `userPaused` flag is unaffected by tab hide/show. Both pause sources are ORed in
  the RAF loop's tick gate.
- **StrictMode.** Use `hasFiredRef` to guard `onAllComplete` against React 18 StrictMode
  double-invocation of effects.
- **Do NOT implement the fix as part of this workflow.** The implementation runs when the
  user clicks "Start task" on each task in turn.
