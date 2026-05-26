# Eye Aura — Visual Acuity Engine

Technical reference for the calibrated digital eye chart system.

---

## 1. Clinical Foundation

### Snellen Scaling (Far Vision)

A Snellen letter is designed to subtend **5 arc-minutes** of visual angle at the test distance.

```
tan(5 arcmin) = tan(5/60 × π/180) ≈ 0.001454

Height at distance D (metres):
  H_mm = denominator × (D / 6) × 1.454
```

| Acuity        | Height at 3 m |
|---------------|--------------|
| 20/200 (6/60) | 43.60 mm     |
| 20/100 (6/30) | 21.80 mm     |
| 20/70  (6/21) | 15.30 mm     |
| 20/50  (6/15) | 10.90 mm     |
| 20/40  (6/12) |  8.70 mm     |
| 20/30  (6/9)  |  6.50 mm     |
| 20/25  (6/7.5)|  5.50 mm     |
| 20/20  (6/6)  |  4.36 mm     |
| 20/15  (6/4.5)|  3.27 mm     |

### Near Vision Scaling (40 cm)

Near vision chart uses Jaeger notation with physical letter heights
calibrated for a 40 cm (16 inch) reading distance.

| Jaeger | Snellen Equiv | Height at 40 cm |
|--------|--------------|----------------|
| J16    | 20/200       | 5.82 mm        |
| J11    | 20/100       | 2.91 mm        |
| J9     | 20/70        | 2.04 mm        |
| J5     | 20/50        | 1.45 mm        |
| J3     | 20/40        | 1.16 mm        |
| J2     | 20/30        | 0.87 mm        |
| J1     | 20/25        | 0.73 mm        |
| J1+    | 20/20        | 0.58 mm        |

---

## 2. Why Browser Font Rendering Fails

Standard CSS/HTML typography is NOT suitable for clinical acuity charts:

| Problem                    | Effect                                        |
|---------------------------|-----------------------------------------------|
| `font-size` ≠ cap height  | Glyphs render 65–75% of declared px size      |
| Browser font hinting       | Sub-pixel snapping collapses tiny differences  |
| Font anti-aliasing         | 2 px and 3 px glyphs become visually identical |
| `width: 100%` on SVG       | Browser rescales SVG, destroying physical size |
| `px` ≠ physical mm         | Varies by device DPI, OS scale, browser zoom  |

**This system avoids all of the above.**

---

## 3. Calibration Engine

### Card Calibration Flow

1. Display an on-screen rectangle
2. User resizes it (slider + ±1/5px buttons) to match a physical **ISO/IEC 7810 ID-1** card (85.60 × 53.98 mm)
3. `pxPerMm = cardWidthPx / 85.60`

This is the **only** valid pixel-per-mm reference. All rendering uses it.

### CalibrationData type

```typescript
interface CalibrationData {
  pxPerMm: number;       // CSS px per physical mm (the key value)
  cardWidthPx: number;   // calibrated card width in CSS px
  deviceWidth: number;   // window.innerWidth at calibration time
  deviceHeight: number;  // window.innerHeight at calibration time
  dpr: number;           // devicePixelRatio at calibration time
  timestamp: number;     // Date.now() — stored for 24hr cache
}
```

### Invalidation Rules

Stored calibration is discarded when:
- Age > 24 hours
- `window.innerWidth` or `innerHeight` changed (orientation / resize)

### Why NOT `window.devicePixelRatio`

`devicePixelRatio` does **not** encode physical screen density reliably:
- Browser zoom changes DPR
- OS accessibility scaling changes DPR
- Retina displays report DPR=2 but physical PPI varies widely

Card calibration directly measures the relationship between CSS pixels and physical millimetres on the current screen, in the current browser, at the current zoom level.

---

## 4. SVG Text Rendering Engine

### Architecture

```
rawCapPx   = exactHeightMm × pxPerMm
capPx      = max(rawCapPx, MIN_CAP_PX)       // device floor only
fontSize   = capPx / CAP_HEIGHT_RATIO         // = capPx / 0.711
baselineY  = padV + capPx                     // alphabetic baseline position
```

Letters rendered as `<text>` inside an exact-dimension `<svg>`:

```tsx
<svg width={svgW} height={svgH}>                   // exact px — no browser scaling
  <text x={center} y={baselineY} fontSize={fontSize}
        fontFamily="'Helvetica Neue', 'Arial', sans-serif"
        fontWeight="700">E</text>
</svg>
```

### Cap Height Compensation

SVG `fontSize` refers to the **em-square**, not the capital letter height.

```
Arial cap height = 1456 / 2048 UPM = 0.711 × font-size
```

Without correction: a 10px font produces ~7.1px capital letters.
With correction: `fontSize = targetCapPx / 0.711` produces exactly `targetCapPx` capital height.

### Font Selection Rationale

`'Helvetica Neue', 'Arial', 'Liberation Sans', sans-serif` is used because:
- Standard clinical Snellen charts use bold sans-serif letterforms
- Arial/Helvetica cap height ratio (0.711) is consistent across browsers and OS
- Real ophthalmic letter shapes: proper curved O, C, D — not geometric blocks
- Available on all platforms without web font loading

### SVG Sizing (Critical)

The SVG must have **numeric** `width` and `height` (not `"100%"`):

```tsx
// CORRECT — browser cannot rescale, physical accuracy preserved
<svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>

// WRONG — browser rescales to container, destroys physical accuracy
<svg style={{ width: "100%", height: "auto" }}>
```

The scroll container uses `overflowX: auto` — large letters (20/200 = 43 mm) scroll rather than shrink.

---

## 5. Assessment Flow

```
type_select → instructions → calibration → duration_select → testing → results
```

### Testing phases per eye

```
eye_intro → reading (auto-advance by setInterval) → self_report
```

### Line advancement

Lines advance through a single, RAF-driven state machine in
`useLetterTimer`. Each per-letter `requestAnimationFrame` tick computes the
elapsed delta from `Date.now()` (mock-friendly under fake timers) and
dispatches a `TICK` action; on rollover the reducer increments `letterIndex`
and resets `remainingMs` to `durationMs`; on the final letter it transitions
`status: "running" → "done"` and the `onAllComplete` effect flips the shell
into `self_report`. Pause / Resume / Visibility-Hide / Visibility-Show all
gate the same loop, so there are no parallel timers and pause cannot leak
line advancement. Cross-eye global progress is derived purely from
`(currentEye, letterIndex, totalLinesPerEye)` by `useAssessmentProgress`.

### Self-report screen

After all lines are shown, the user selects the **smallest line they could read clearly**.
Buttons show: `Level N · 20/xx · label`.

---

## 6. Device Scaling Handling

| Scenario               | Handled by                                       |
|------------------------|--------------------------------------------------|
| Retina (DPR=2)         | CSS px is DPR-independent; no adjustment needed  |
| Browser zoom           | Calibration captures this — pxPerMm is accurate  |
| Orientation change     | Cached calibration invalidated → recalibrate     |
| Resize                 | Cached calibration invalidated → recalibrate     |
| Sub-pixel small lines  | `MIN_CAP_PX` floor clamp; flagged in debug panel |

---

## 7. Developer Diagnostics Panel

Pass `showDebug={true}` to `SnellenRenderer` in development.
Panel appears **below** the chart (never overlapping).

Shows:
- Target mm
- Rendered mm
- Deviation % (red if > 5%)
- Cap px (flagged if clamped)
- px/mm ratio
- devicePixelRatio
- Path scale factor
- SVG bounding box dimensions

---

## 8. File Reference

| File                                   | Responsibility                              |
|----------------------------------------|---------------------------------------------|
| `optotypes.ts`                         | SVG path definitions for all 9 optotypes    |
| `SnellenRenderer.tsx`                  | Path-based renderer with calibrated sizing  |
| `snellen-data.ts`                      | Far vision chart data + utility functions   |
| `near/near-vision-data.ts`             | Near vision Jaeger chart data               |
| `steps/CalibrationStep.tsx`            | Card calibration UI + pxPerMm calculation   |
| `steps/TestingStep.tsx`                | Far vision test (3 m)                       |
| `steps/NearTestingStep.tsx`            | Near vision test (40 cm)                    |
| `steps/ResultsStep.tsx`                | Results display with level + notation       |
| `engine/useLetterTimer.ts`             | RAF-driven per-letter timer + advancement   |
| `engine/useAssessmentProgress.ts`      | Pure derivation of cross-eye global progress |
| `steps/TestingShell.tsx`               | Shared eye-intro / reading / self-report shell |
| `AcuitySession.tsx`                    | Phase orchestrator                          |

---

## 9. Future Extensibility

The `OptotypeDef` interface in `optotypes.ts` is the extension point for new chart types:

- **Tumbling E** — 4 rotations of existing E path (`transform="rotate(deg)"`)
- **Landolt C** — circular ring with gap, add as `LC` optotype
- **Pediatric (LEA)** — apple, house, circle, square as SVG paths
- **Contrast sensitivity** — vary `fill` opacity from `#0a0a0a` to `#f0f0f0`
- **ETDRS chart** — use same path system with different letter set and spacing

All new chart types inherit the calibration engine and physical sizing pipeline automatically.

---

## 10. Minimum Device Requirements

For reliable near vision testing (lines at 0.58–1.45 mm):
- Screen PPI ≥ 150 (3.74 CSS px/mm at 100% zoom / no OS scaling)
- Below this, near vision lines fall below 4–6 px and cannot be clinically distinguished
- The debug panel flags clamped lines with `⚠ clamped`
