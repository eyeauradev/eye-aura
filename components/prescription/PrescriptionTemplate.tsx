import React from "react";

export interface PrescriptionTemplateProps {
  prescriptionId: string;
  patientName: string;
  patientAge: string;
  patientGender: string;
  patientPhone: string;
  date: string;
  referredBy: string;
  doctorName: string;
  rightEye: { sph: string; cyl: string; axis: string; va: string; remarks: string };
  leftEye: { sph: string; cyl: string; axis: string; va: string; remarks: string };
  distancePD: string;
  nearPD: string;
  nearVisionRight: { add: string; va: string; remarks: string };
  nearVisionLeft: { add: string; va: string; remarks: string };
  findings: string;
  glasses: string;
  eyeDrops: string;
  exercises: string;
  reviewAfter: string;
}

const GREEN = "#1B4332";
const LIGHT_GREEN_BG = "#EAF1EC";
const BORDER_COLOR = "#B7D4BB";
const GOLD = "#C6A84B";
const BG = "#F9F5F0";
const TEXT_DARK = "#1A2E1F";
const TEXT_MID = "#3A5A4A";
const TABLE_HEADER_BG = "#1B4332";
const ROW_ALT = "#F2F8F4";

function cell(content: string, style: React.CSSProperties = {}): React.ReactElement {
  return (
    <td style={{ border: `1px solid ${BORDER_COLOR}`, padding: "3px 6px", fontSize: "8pt", color: TEXT_DARK, ...style }}>
      {content}
    </td>
  );
}

export default function PrescriptionTemplate(props: PrescriptionTemplateProps) {
  const {
    prescriptionId, patientName, patientAge, patientGender, patientPhone,
    date, referredBy, doctorName,
    rightEye, leftEye, distancePD, nearPD,
    nearVisionRight, nearVisionLeft,
    findings, glasses, eyeDrops, exercises, reviewAfter,
  } = props;

  return (
    <div style={{
      width: "210mm", height: "297mm", backgroundColor: BG,
      fontFamily: "'Lato', 'Helvetica Neue', Arial, sans-serif",
      fontSize: "9pt", color: TEXT_DARK,
      padding: "7mm 8mm 5mm 8mm",
      boxSizing: "border-box", position: "relative", overflow: "hidden",
    }}>

      {/* ── Decorative leaf watermark top-left ── */}
      <div style={{ position: "absolute", top: 0, left: 0, opacity: 0.07, pointerEvents: "none" }}>
        <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
          <ellipse cx="30" cy="60" rx="18" ry="35" transform="rotate(-35 30 60)" fill={GREEN} />
          <ellipse cx="50" cy="45" rx="12" ry="26" transform="rotate(-15 50 45)" fill={GREEN} />
          <ellipse cx="20" cy="72" rx="10" ry="22" transform="rotate(-55 20 72)" fill={GREEN} />
        </svg>
      </div>

      {/* ════════════════════════════════════
          HEADER
      ════════════════════════════════════ */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "3.5mm", paddingBottom: "3mm", borderBottom: `1px solid ${BORDER_COLOR}` }}>

        {/* Logo + Branding */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
          {/* Full Eye Aura logo */}
          <img
            src="/eye-aura-logo-v2.svg"
            alt="Eye Aura"
            style={{ height: "110px", width: "auto", backgroundColor: "#f7f3ee", padding: "8px", borderRadius: "8px" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "80%" }}>
            <div style={{ height: "1px", flex: 1, background: GOLD }} />
            <span style={{ fontSize: "5.5pt", letterSpacing: "2.5px", color: TEXT_MID, fontWeight: 700, whiteSpace: "nowrap" }}>
              PERSONALIZED VISION CARE
            </span>
            <div style={{ height: "1px", flex: 1, background: GOLD }} />
          </div>
        </div>

        {/* Vertical divider */}
        <div style={{ width: "1px", background: BORDER_COLOR, alignSelf: "stretch", margin: "0 14px" }} />

        {/* Contact info */}
        <div style={{ textAlign: "left", minWidth: "130px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
            {/* Phone icon */}
            <svg width="12" height="12" viewBox="0 0 24 24" fill={GREEN}><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
            <span style={{ fontSize: "9pt", fontWeight: 700, color: TEXT_DARK }}>7042092967</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "5px" }}>
            {/* Location icon */}
            <svg width="11" height="11" viewBox="0 0 24 24" fill={GREEN} style={{ marginTop: "1px", flexShrink: 0 }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            <div style={{ fontSize: "7.5pt", color: TEXT_MID, lineHeight: 1.35 }}>
              Online Consultation<br />Your Vision, Our Care
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════
          PATIENT INFO BOX
      ════════════════════════════════════ */}
      <div style={{
        border: `1px solid ${BORDER_COLOR}`, borderRadius: "7px",
        padding: "5px 12px 6px 12px", marginBottom: "3mm",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 16px",
      }}>
        {[
          ["Patient Name", patientName, "Date", date],
          ["Age / Gender", [patientAge, patientGender].filter(Boolean).join(" / "), "Prescription ID", prescriptionId],
          ["Contact No.", patientPhone, "Referred By", referredBy],
        ].map(([l1, v1, l2, v2], i) => (
          <React.Fragment key={i}>
            <InfoRow label={l1 as string} value={v1 as string} />
            <InfoRow label={l2 as string} value={v2 as string} />
          </React.Fragment>
        ))}
      </div>

      {/* ════════════════════════════════════
          DISTANCE VISION + PD (side-by-side)
      ════════════════════════════════════ */}
      <div style={{ display: "flex", gap: "3mm", marginBottom: "3mm", alignItems: "flex-start" }}>
        {/* Distance Vision table */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <SectionHeader icon="glasses" label="DISTANCE VISION" />
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1.5mm" }}>
            <thead>
              <tr style={{ backgroundColor: TABLE_HEADER_BG }}>
                {["EYE", "SPH (Sphere)", "CYL (Cylinder)", "AXIS", "VA (Visual Acuity)", "REMARKS"].map(h => (
                  <th key={h} style={{ border: `1px solid ${BORDER_COLOR}`, padding: "4px 5px", fontSize: "7.5pt", fontWeight: 700, color: "white", textAlign: "center" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ backgroundColor: "white" }}>
                <td style={{ border: `1px solid ${BORDER_COLOR}`, padding: "4px 6px", fontSize: "8pt", fontWeight: 600, color: TEXT_DARK }}>RIGHT (OD)</td>
                {cell(rightEye.sph, { textAlign: "center" })}
                {cell(rightEye.cyl, { textAlign: "center" })}
                {cell(rightEye.axis, { textAlign: "center" })}
                {cell(rightEye.va, { textAlign: "center" })}
                {cell(rightEye.remarks, { textAlign: "center" })}
              </tr>
              <tr style={{ backgroundColor: ROW_ALT }}>
                <td style={{ border: `1px solid ${BORDER_COLOR}`, padding: "4px 6px", fontSize: "8pt", fontWeight: 600, color: TEXT_DARK }}>LEFT (OS)</td>
                {cell(leftEye.sph, { textAlign: "center" })}
                {cell(leftEye.cyl, { textAlign: "center" })}
                {cell(leftEye.axis, { textAlign: "center" })}
                {cell(leftEye.va, { textAlign: "center" })}
                {cell(leftEye.remarks, { textAlign: "center" })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pupillary Distance box */}
        <div style={{
          border: `1px solid ${BORDER_COLOR}`, borderRadius: "7px",
          padding: "6px 10px 8px 10px", width: "44mm", flexShrink: 0, textAlign: "center",
        }}>
          {/* Eye icon */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "4px" }}>
            <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
              <ellipse cx="14" cy="10" rx="12" ry="7" stroke={GREEN} strokeWidth="1.5" fill="none" />
              <circle cx="14" cy="10" r="4" fill={GREEN} />
              <circle cx="14" cy="10" r="2.2" fill="#0D2B1F" />
              <circle cx="15" cy="9" r="0.8" fill="white" />
            </svg>
          </div>
          <div style={{ fontSize: "7.5pt", fontWeight: 800, color: GREEN, letterSpacing: "0.5px", marginBottom: "6px" }}>
            PUPILLARY DISTANCE
          </div>
          <PDRow label="Distance PD" value={distancePD} />
          <PDRow label="Near PD" value={nearPD} />
        </div>
      </div>

      {/* ════════════════════════════════════
          NEAR VISION + FINDINGS (side-by-side)
      ════════════════════════════════════ */}
      <div style={{ display: "flex", gap: "3mm", marginBottom: "3mm", alignItems: "flex-start" }}>
        {/* Near Vision table */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <SectionHeader icon="book" label="NEAR VISION (ADD)" />
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1.5mm" }}>
            <thead>
              <tr style={{ backgroundColor: TABLE_HEADER_BG }}>
                {["EYE", "ADD", "VA (Visual Acuity)", "REMARKS"].map(h => (
                  <th key={h} style={{ border: `1px solid ${BORDER_COLOR}`, padding: "4px 5px", fontSize: "7.5pt", fontWeight: 700, color: "white", textAlign: "center" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ backgroundColor: "white" }}>
                <td style={{ border: `1px solid ${BORDER_COLOR}`, padding: "4px 6px", fontSize: "8pt", fontWeight: 600, color: TEXT_DARK }}>RIGHT (OD)</td>
                {cell(nearVisionRight.add, { textAlign: "center" })}
                {cell(nearVisionRight.va, { textAlign: "center" })}
                {cell(nearVisionRight.remarks, { textAlign: "center" })}
              </tr>
              <tr style={{ backgroundColor: ROW_ALT }}>
                <td style={{ border: `1px solid ${BORDER_COLOR}`, padding: "4px 6px", fontSize: "8pt", fontWeight: 600, color: TEXT_DARK }}>LEFT (OS)</td>
                {cell(nearVisionLeft.add, { textAlign: "center" })}
                {cell(nearVisionLeft.va, { textAlign: "center" })}
                {cell(nearVisionLeft.remarks, { textAlign: "center" })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Findings box */}
        <div style={{
          border: `1px solid ${BORDER_COLOR}`, borderRadius: "7px",
          padding: "6px 10px 8px 10px", width: "44mm", flexShrink: 0,
        }}>
          <div style={{ fontSize: "7.5pt", fontWeight: 800, color: GREEN, textAlign: "center", letterSpacing: "0.5px", marginBottom: "5px" }}>
            FINDINGS
          </div>
          <div style={{ fontSize: "7.5pt", color: TEXT_DARK, lineHeight: 1.5, minHeight: "28mm", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {findings || ""}
          </div>
          {/* Decorative leaf at bottom */}
          <div style={{ textAlign: "center", marginTop: "4px", opacity: 0.4 }}>
            <svg width="40" height="14" viewBox="0 0 40 14" fill="none">
              <path d="M20 12 C15 8 5 8 2 3 C8 4 14 6 20 12Z" fill={GREEN} />
              <path d="M20 12 C25 8 35 8 38 3 C32 4 26 6 20 12Z" fill={GREEN} />
            </svg>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════
          EYE AURA PLAN
      ════════════════════════════════════ */}
      <div style={{ marginBottom: "3mm" }}>
        {/* Section label with curved-top border look */}
        <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "0" }}>
          <SectionHeader icon="clipboard" label="EYE AURA PLAN" />
        </div>
        <div style={{
          border: `1px solid ${BORDER_COLOR}`, borderRadius: "0 7px 7px 7px",
          marginTop: "-1px",
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        }}>
          <PlanColumn icon="glasses-icon" title="GLASSES" content={glasses} borderRight />
          <PlanColumn icon="drop" title="RECOMMENDED EYE DROPS" content={eyeDrops} borderRight />
          <PlanColumn icon="meditation" title="EYE EXERCISES" content={exercises} />
        </div>
      </div>

      {/* ════════════════════════════════════
          BOTTOM ROW: Ritual | Advice | Review
      ════════════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.6fr", gap: "3mm", marginBottom: "3mm" }}>

        {/* Daily Eye Ritual */}
        <div style={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: "7px", padding: "8px 10px", backgroundColor: LIGHT_GREEN_BG }}>
          <div style={{ fontSize: "8pt", fontWeight: 800, color: GREEN, textAlign: "center", letterSpacing: "0.5px", marginBottom: "7px" }}>
            DAILY EYE RITUAL
          </div>
          <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "7px" }}>
            <RitualItem svg={<EyeSvg />} label="Blink Slowly" sub="(10 times)" />
            <RitualItem svg={<ClosedEyeSvg />} label="Close Eyes" sub="(30 sec)" />
            <RitualItem svg={<PalmSvg />} label="Palm Gently" sub="(20-30 sec)" />
          </div>
          <div style={{
            backgroundColor: GREEN, borderRadius: "12px",
            padding: "3px 0", textAlign: "center",
            fontSize: "6.5pt", color: "white", fontWeight: 600, letterSpacing: "0.3px",
          }}>
            Do this twice daily for relaxed vision
          </div>
        </div>

        {/* Important Advice */}
        <div style={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: "7px", padding: "8px 10px" }}>
          <div style={{ fontSize: "8pt", fontWeight: 800, color: GREEN, textAlign: "center", letterSpacing: "0.5px", marginBottom: "6px" }}>
            IMPORTANT ADVICE
          </div>
          {[
            "Use your glasses as prescribed.",
            "Follow 20-20-20 rule for screen use.",
            "Maintain proper lighting while reading.",
            "Stay hydrated and get adequate sleep.",
          ].map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "5px", marginBottom: "4px" }}>
              <span style={{ color: GREEN, fontWeight: 700, fontSize: "8pt", marginTop: "1px" }}>•</span>
              <span style={{ fontSize: "7.5pt", color: TEXT_DARK, lineHeight: 1.4 }}>{t}</span>
            </div>
          ))}
        </div>

        {/* Review After */}
        <div style={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: "7px", padding: "8px 10px", textAlign: "center" }}>
          <div style={{ fontSize: "8pt", fontWeight: 800, color: GREEN, letterSpacing: "0.5px", marginBottom: "8px" }}>
            REVIEW AFTER
          </div>
          {/* Calendar icon */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="3" y="6" width="26" height="23" rx="3" stroke={GREEN} strokeWidth="1.5" fill="none" />
              <line x1="3" y1="12" x2="29" y2="12" stroke={GREEN} strokeWidth="1.5" />
              <line x1="10" y1="3" x2="10" y2="9" stroke={GREEN} strokeWidth="2" strokeLinecap="round" />
              <line x1="22" y1="3" x2="22" y2="9" stroke={GREEN} strokeWidth="2" strokeLinecap="round" />
              <rect x="8" y="16" width="4" height="3" rx="1" fill={GREEN} opacity="0.6" />
              <rect x="14" y="16" width="4" height="3" rx="1" fill={GREEN} opacity="0.6" />
              <rect x="20" y="16" width="4" height="3" rx="1" fill={GREEN} opacity="0.6" />
              <rect x="8" y="21" width="4" height="3" rx="1" fill={GREEN} opacity="0.6" />
              <rect x="14" y="21" width="4" height="3" rx="1" fill={GREEN} opacity="0.6" />
            </svg>
          </div>
          <div style={{
            borderBottom: `1px solid ${BORDER_COLOR}`,
            minHeight: "18px", padding: "2px 4px",
            fontSize: "8.5pt", fontWeight: 600, color: TEXT_DARK,
          }}>
            {reviewAfter || ""}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════
          FOOTER
      ════════════════════════════════════ */}
      <div style={{ borderTop: `1px solid ${BORDER_COLOR}`, paddingTop: "4px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ fontStyle: "italic", fontSize: "10pt", color: TEXT_MID, fontFamily: "Georgia, serif" }}>
          Your eyes deserve calm, not strain. ♡
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "7.5pt", color: TEXT_MID, marginBottom: "2px" }}>Doctor&apos;s Signature</div>
          <div style={{ fontSize: "8.5pt", fontWeight: 700, color: GREEN, borderTop: `1px solid ${BORDER_COLOR}`, paddingTop: "2px", minWidth: "100px" }}>
            Dr. {doctorName}
          </div>
          {/* Small glasses icon */}
          <div style={{ marginTop: "2px", opacity: 0.5 }}>
            <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
              <circle cx="6" cy="5" r="4" stroke={GREEN} strokeWidth="1.2" />
              <circle cx="16" cy="5" r="4" stroke={GREEN} strokeWidth="1.2" />
              <line x1="10" y1="5" x2="12" y2="5" stroke={GREEN} strokeWidth="1.2" />
              <line x1="1" y1="3" x2="0" y2="2" stroke={GREEN} strokeWidth="1.2" />
              <line x1="21" y1="3" x2="22" y2="2" stroke={GREEN} strokeWidth="1.2" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "4px", fontSize: "7.5pt", padding: "1px 0" }}>
      <span style={{ color: TEXT_MID, whiteSpace: "nowrap", minWidth: "68px" }}>{label}</span>
      <span style={{ color: TEXT_MID }}>:</span>
      <span style={{
        flex: 1, borderBottom: `1px solid #9ABAA8`,
        paddingBottom: "1px", fontWeight: value ? 600 : 400,
        color: value ? TEXT_DARK : "transparent", minHeight: "12px",
      }}>{value || "\u00A0"}</span>
    </div>
  );
}

function PDRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "4px", fontSize: "7.5pt", marginBottom: "5px" }}>
      <span style={{ color: TEXT_MID, flex: 1 }}>{label}</span>
      <span style={{ color: TEXT_MID }}>:</span>
      <span style={{
        borderBottom: `1px solid #9ABAA8`, minWidth: "32px",
        paddingBottom: "1px", fontWeight: 600, color: TEXT_DARK, textAlign: "center",
      }}>{value || "\u00A0"}</span>
      <span style={{ fontSize: "7pt", color: TEXT_MID }}>mm</span>
    </div>
  );
}

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
      <div style={{
        width: "22px", height: "22px", borderRadius: "50%",
        backgroundColor: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {icon === "glasses" && (
          <svg width="13" height="7" viewBox="0 0 13 7" fill="none">
            <circle cx="3.5" cy="3.5" r="2.8" stroke="white" strokeWidth="1" />
            <circle cx="9.5" cy="3.5" r="2.8" stroke="white" strokeWidth="1" />
            <line x1="6.3" y1="3.5" x2="7.1" y2="3.5" stroke="white" strokeWidth="1" />
            <line x1="0.5" y1="2" x2="0" y2="1" stroke="white" strokeWidth="1" />
            <line x1="12.5" y1="2" x2="13" y2="1" stroke="white" strokeWidth="1" />
          </svg>
        )}
        {icon === "book" && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H6zm1 4h8v1H7V6zm0 3h8v1H7V9zm0 3h5v1H7v-1z" />
          </svg>
        )}
        {icon === "clipboard" && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <path d="M19 3h-4.18A3 3 0 0 0 9.18 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-7 0a1 1 0 0 1 1 1 1 1 0 0 1-1 1 1 1 0 0 1-1-1 1 1 0 0 1 1-1zm7 16H5V5h2v2h10V5h2v14z" />
          </svg>
        )}
      </div>
      <span style={{ fontSize: "9pt", fontWeight: 800, color: GREEN, letterSpacing: "0.5px" }}>{label}</span>
    </div>
  );
}

function PlanColumn({ icon, title, content, borderRight }: { icon: string; title: string; content: string; borderRight?: boolean }) {
  return (
    <div style={{ padding: "8px 10px", borderRight: borderRight ? `1px solid ${BORDER_COLOR}` : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
        {icon === "glasses-icon" && (
          <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
            <circle cx="5" cy="5" r="4" stroke={GREEN} strokeWidth="1.2" />
            <circle cx="13" cy="5" r="4" stroke={GREEN} strokeWidth="1.2" />
            <line x1="9" y1="5" x2="10" y2="5" stroke={GREEN} strokeWidth="1.2" />
            <line x1="1" y1="3" x2="0" y2="1.5" stroke={GREEN} strokeWidth="1.2" />
            <line x1="17" y1="3" x2="18" y2="1.5" stroke={GREEN} strokeWidth="1.2" />
          </svg>
        )}
        {icon === "drop" && (
          <svg width="12" height="16" viewBox="0 0 12 16" fill="none">
            <path d="M6 1 C6 1 1 7 1 10.5 A5 5 0 0 0 11 10.5 C11 7 6 1 6 1Z" stroke={GREEN} strokeWidth="1.2" fill="none" />
          </svg>
        )}
        {icon === "meditation" && (
          <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
            <circle cx="8" cy="3" r="2" stroke={GREEN} strokeWidth="1.2" />
            <path d="M8 6 L8 10 M4 8 L8 9 L12 8 M6 10 L4 15 M10 10 L12 15" stroke={GREEN} strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        )}
        <span style={{ fontSize: "7.5pt", fontWeight: 800, color: GREEN, letterSpacing: "0.4px" }}>{title}</span>
      </div>
      {/* Dotted content lines */}
      <div style={{ fontSize: "7.5pt", color: TEXT_DARK, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", minHeight: "22mm", borderBottom: content ? "none" : `1px dotted ${BORDER_COLOR}` }}>
        {content || <DottedLines count={3} />}
      </div>
    </div>
  );
}

function DottedLines({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ borderBottom: `1px dotted ${BORDER_COLOR}`, height: "14px", marginBottom: "4px" }} />
      ))}
    </>
  );
}

function RitualItem({ svg, label, sub }: { svg: React.ReactNode; label: string; sub: string }) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "3px" }}>{svg}</div>
      <div style={{ fontSize: "6.5pt", fontWeight: 700, color: TEXT_DARK, lineHeight: 1.3 }}>{label}</div>
      <div style={{ fontSize: "6pt", color: TEXT_MID }}>{sub}</div>
    </div>
  );
}

function EyeSvg() {
  return (
    <svg width="24" height="18" viewBox="0 0 24 18" fill="none">
      <ellipse cx="12" cy="9" rx="10" ry="6" stroke={GREEN} strokeWidth="1.3" />
      <circle cx="12" cy="9" r="3.5" fill={GREEN} />
      <circle cx="12" cy="9" r="2" fill="#0D2B1F" />
      <circle cx="13" cy="8" r="0.8" fill="white" />
    </svg>
  );
}

function ClosedEyeSvg() {
  return (
    <svg width="24" height="18" viewBox="0 0 24 18" fill="none">
      <path d="M2 9 C6 3 18 3 22 9" stroke={GREEN} strokeWidth="1.3" fill="none" />
      <path d="M2 9 C6 15 18 15 22 9" stroke={GREEN} strokeWidth="1.3" fill="none" />
      <line x1="8" y1="14" x2="7" y2="16" stroke={GREEN} strokeWidth="1" strokeLinecap="round" />
      <line x1="12" y1="15" x2="12" y2="17" stroke={GREEN} strokeWidth="1" strokeLinecap="round" />
      <line x1="16" y1="14" x2="17" y2="16" stroke={GREEN} strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function PalmSvg() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M7 10 L7 5 Q7 3.5 8.5 3.5 Q10 3.5 10 5 L10 9" stroke={GREEN} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M10 9 L10 4 Q10 2.5 11.5 2.5 Q13 2.5 13 4 L13 9" stroke={GREEN} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M13 9 L13 5 Q13 3.5 14.5 3.5 Q16 3.5 16 5 L16 9" stroke={GREEN} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M7 10 L6 10 Q4.5 10 4.5 11.5 L4.5 14 Q4.5 19 11 19 Q17.5 19 17.5 14 L17.5 9 Q17.5 7.5 16 7.5 Q14.5 7.5 14.5 9" stroke={GREEN} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
