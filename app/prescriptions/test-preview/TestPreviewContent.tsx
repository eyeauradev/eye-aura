"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ── Hardcoded test prescription ──────────────────────────────────────────────
const TEST_PRESCRIPTION = {
  id: "TEST-PREVIEW-001",
  patientName: "Rahul Sharma",
  patientAge: "34 years",
  patientGender: "Male",
  patientPhone: "+91 98765 43210",
  date: "26 Jun 2026",
  referredBy: "Dr. Mehta",
  doctorName: "Dr. Priya Verma",
  rightEye: { sph: "-2.50", cyl: "-0.75", axis: "180", va: "6/9", remarks: "Mild myopia" },
  leftEye:  { sph: "-3.00", cyl: "-1.00", axis: "175", va: "6/12", remarks: "Moderate myopia" },
  nearVisionRight: { add: "+1.50", va: "N6", remarks: "" },
  nearVisionLeft:  { add: "+1.50", va: "N8", remarks: "" },
  diagnosis: "Bilateral myopia with mild astigmatism.\nAnterior segment: Normal OU.\nFundus: Disc and macula normal OU.",
  eyeDrops: "Carboxymethylcellulose 0.5% – 1 drop TID\nLubricating eye drops as needed",
  exercises: "20-20-20 rule: every 20 min look\nat something 20 ft away for 20 sec.\nPalming twice daily.",
  reviewAfter: "3 Months",
};
// ─────────────────────────────────────────────────────────────────────────────

const G = "#1a472b";
const LTGREEN = "#f6f6ee";
const BORDER = "#c8d4bc";

const cell: React.CSSProperties = {
  border: `1px solid ${BORDER}`, padding: "3px 6px",
  fontSize: "8pt", color: G, textAlign: "center", minHeight: "22px",
};
const hCell: React.CSSProperties = {
  ...cell, background: G, color: "white",
  fontWeight: 700, fontSize: "7pt", letterSpacing: "0.3px", padding: "5px 6px",
};
const dotLine: React.CSSProperties = {
  borderBottom: "1px dotted #b0b0b0", height: "17px", marginBottom: "5px", display: "block",
};

function Row({ label, sph, cyl, axis, va, remarks }: any) {
  return (
    <tr>
      <td style={{ ...cell, fontWeight: 700, textAlign: "left", background: "#f4f4ea" }}>{label}</td>
      <td style={cell}>{sph || ""}</td>
      <td style={cell}>{cyl || ""}</td>
      <td style={cell}>{axis || ""}</td>
      <td style={cell}>{va || ""}</td>
      <td style={cell}>{remarks || ""}</td>
    </tr>
  );
}

function NearRow({ label, add, va, remarks }: any) {
  return (
    <tr>
      <td style={{ ...cell, fontWeight: 700, textAlign: "left", background: "#f4f4ea" }}>{label}</td>
      <td style={cell}>{add || ""}</td>
      <td style={cell}>{va || ""}</td>
      <td style={cell}>{remarks || ""}</td>
    </tr>
  );
}

function PlanCol({ icon, title, content, borderRight }: {
  icon: React.ReactNode; title: string; content?: string; borderRight?: boolean;
}) {
  return (
    <div style={{ flex: 1, padding: "0 10px", borderRight: borderRight ? `1px solid ${BORDER}` : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
        {icon}
        <span style={{ fontSize: "7pt", fontWeight: 700, letterSpacing: "1px", color: G }}>{title}</span>
      </div>
      {content
        ? <div style={{ fontSize: "7.5pt", color: G, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{content}</div>
        : <><span style={dotLine}/><span style={dotLine}/><span style={dotLine}/></>
      }
    </div>
  );
}

export function TestPreviewContent() {
  const router = useRouter();
  const [scale, setScale] = useState(1);
  const rx = TEST_PRESCRIPTION;

  useEffect(() => {
    const update = () => {
      setScale(Math.min(1, (window.innerWidth - 40) / 794));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const infoFields = [
    { label: "Patient Name",    value: rx.patientName },
    { label: "Date",            value: rx.date },
    { label: "Age / Gender",    value: `${rx.patientAge} / ${rx.patientGender}` },
    { label: "Prescription ID", value: rx.id },
    { label: "Contact No.",     value: rx.patientPhone },
    { label: "Referred By",     value: rx.referredBy },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: white !important; }
          @page { size: A4 portrait; margin: 0; }
          html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        body { background: #faf7f0; }
      `}} />

      {/* Dev toolbar */}
      <div className="no-print" style={{ position: "fixed", top: 16, right: 16, zIndex: 1000, display: "flex", gap: 8 }}>
        <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "#856404", fontWeight: 600 }}>
          🧪 DEV ONLY — hardcoded test prescription
        </div>
        <button onClick={() => window.print()} style={{ background: G, color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
          🖨️ Print / Save as PDF
        </button>
        <button onClick={() => router.back()} style={{ background: "white", color: G, border: `1px solid ${G}`, borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontSize: 13 }}>
          ← Back
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ width: 794, zoom: scale, background: "#fefdf9", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", fontFamily: "Arial, sans-serif", color: G, fontSize: "8pt", position: "relative", overflow: "hidden" }}>

          {/* HEADER */}
          <div style={{ padding: "26px 44px 0", boxSizing: "border-box" }}>
            <div style={{ width: "100%", height: "100px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/prescription_header.svg" alt="Eye Aura Header" style={{ display: "block", width: "100%", height: "auto" }} />
            </div>
          </div>

          {/* BODY */}
          <div style={{ padding: "12px 45px 30px" }}>

            {/* PATIENT INFO */}
            <div style={{ border: `1.5px solid ${BORDER}`, borderRadius: 6, padding: "6px 12px 8px", marginBottom: "5mm", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 20px" }}>
              {infoFields.map(({ label, value }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "8pt", minHeight: 20 }}>
                  <span style={{ whiteSpace: "nowrap", minWidth: 82, color: G }}>{label}</span>
                  <span style={{ color: "#888", marginRight: 3 }}>:</span>
                  <span style={{ flex: 1, borderBottom: "1px solid #ccc", paddingBottom: 1, fontWeight: value ? 600 : 400, color: G }}>{value || "\u00A0"}</span>
                </div>
              ))}
            </div>

            {/* DISTANCE VISION */}
            <div style={{ marginBottom: "4mm" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: LTGREEN, padding: "5px 8px", borderRadius: "4px 4px 0 0", marginBottom: 1 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="10" viewBox="0 0 28 16" fill="none">
                    <circle cx="7" cy="8" r="5.5" fill="none" stroke="white" strokeWidth="2"/>
                    <circle cx="21" cy="8" r="5.5" fill="none" stroke="white" strokeWidth="2"/>
                    <line x1="12.5" y1="8" x2="15.5" y2="8" stroke="white" strokeWidth="2"/>
                  </svg>
                </div>
                <span style={{ fontWeight: 700, fontSize: "9pt", letterSpacing: "1px", color: G }}>DISTANCE VISION</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <table style={{ flex: 1, borderCollapse: "collapse" }}>
                  <thead><tr>{["EYE","SPH (Sphere)","CYL (Cylinder)","AXIS","VA (Visual Acuity)","REMARKS"].map(h => <th key={h} style={hCell}>{h}</th>)}</tr></thead>
                  <tbody>
                    <Row label="RIGHT (OD)" {...rx.rightEye} />
                    <Row label="LEFT (OS)"  {...rx.leftEye}  />
                  </tbody>
                </table>
              </div>
            </div>

            {/* NEAR VISION */}
            <div style={{ marginBottom: "4mm" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: LTGREEN, padding: "5px 8px", borderRadius: "4px 4px 0 0", marginBottom: 1 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="14" height="12" viewBox="0 0 20 18" fill="none">
                    <path d="M2 2h6c1.3 0 2 .7 2 2v11c0-1.3-.7-2-2-2H2V2Z" fill="white"/>
                    <path d="M18 2h-6c-1.3 0-2 .7-2 2v11c0-1.3.7-2 2-2h6V2Z" fill="white"/>
                    <line x1="10" y1="4" x2="10" y2="15" stroke={G} strokeWidth="0.8"/>
                  </svg>
                </div>
                <span style={{ fontWeight: 700, fontSize: "9pt", letterSpacing: "1px", color: G }}>NEAR VISION (ADD)</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <table style={{ flex: 1, borderCollapse: "collapse" }}>
                  <thead><tr>{["EYE","ADD","VA (Visual Acuity)","REMARKS"].map(h => <th key={h} style={hCell}>{h}</th>)}</tr></thead>
                  <tbody>
                    <NearRow label="RIGHT (OD)" {...rx.nearVisionRight} />
                    <NearRow label="LEFT (OS)"  {...rx.nearVisionLeft}  />
                  </tbody>
                </table>
                <div style={{ width: 112, border: `1.5px solid ${BORDER}`, borderRadius: 6, padding: "8px 10px", flexShrink: 0 }}>
                  <div style={{ fontSize: "7pt", fontWeight: 700, letterSpacing: "1px", color: G, textAlign: "center", marginBottom: 5 }}>DIAGNOSIS</div>
                  <div style={{ fontSize: "7.5pt", color: G, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{rx.diagnosis}</div>
                </div>
              </div>
            </div>

            {/* EYE AURA PLAN */}
            <div style={{ border: `1.5px solid ${BORDER}`, borderRadius: 6, marginBottom: "4mm" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ flex: 1, height: 1, background: BORDER }}/>
                <span style={{ fontWeight: 700, fontSize: "9pt", letterSpacing: "1px", color: G, whiteSpace: "nowrap" }}>EYE AURA PLAN</span>
                <div style={{ flex: 1, height: 1, background: BORDER }}/>
              </div>
              <div style={{ display: "flex", padding: "8px 0" }}>
                <PlanCol icon={<svg width="16" height="20" viewBox="0 0 20 26" fill="none"><path d="M10 2 Q17 10 17 17 A7 7 0 0 1 3 17 Q3 10 10 2Z" fill="none" stroke={G} strokeWidth="1.5"/></svg>} title="RECOMMENDED EYE DROPS" content={rx.eyeDrops} borderRight />
                <PlanCol icon={<svg width="20" height="24" viewBox="0 0 24 28" fill="none"><circle cx="12" cy="5" r="3" fill={G}/><path d="M8 12 Q12 9 16 12 L15 19 Q12 21 9 19Z" fill={G}/></svg>} title="EYE EXERCISES" content={rx.exercises} />
              </div>
            </div>

            {/* BOTTOM ROW */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2.2fr", gap: 8, marginBottom: "4mm" }}>
              <div style={{ background: LTGREEN, borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ fontSize: "8pt", fontWeight: 700, letterSpacing: "1px", color: G, textAlign: "center", marginBottom: 7 }}>DAILY EYE RITUAL</div>
                <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 6 }}>
                  {["Blink Slowly\n(10 times)", "Close Eyes\n(30 sec)", "Palm Gently\n(20-30 sec)"].map((t, i) => (
                    <div key={i} style={{ textAlign: "center", fontSize: "6.5pt", color: G }}>
                      <div style={{ width: 26, height: 18, background: "#c8d4bc", borderRadius: 4, margin: "0 auto 3px" }} />
                      {t.split("\n").map((line, j) => <div key={j} style={{ fontWeight: j === 0 ? 600 : 400, color: j === 0 ? G : "#666" }}>{line}</div>)}
                    </div>
                  ))}
                </div>
                <div style={{ background: G, color: "white", borderRadius: 20, padding: "4px 6px", textAlign: "center", fontSize: "6.5pt", fontWeight: 600 }}>
                  Do this twice daily for relaxed vision
                </div>
              </div>
              <div style={{ display: "flex", background: "#f8f6ea", border: `1px solid ${BORDER}`, borderRadius: 6, overflow: "hidden" }}>
                <div style={{ flex: 1, padding: "8px 12px", borderRight: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: "8pt", fontWeight: 700, letterSpacing: "1px", color: G, marginBottom: 6, textAlign: "center" }}>IMPORTANT ADVICE</div>
                  {["Use your glasses as prescribed.", "Follow 20-20-20 rule for screen use.", "Maintain proper lighting while reading.", "Stay hydrated and get adequate sleep."].map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: 5, fontSize: "7.5pt", color: G, marginBottom: 4 }}><span>•</span><span>{a}</span></div>
                  ))}
                </div>
                <div style={{ width: 110, flexShrink: 0, padding: "8px 10px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontSize: "7.5pt", fontWeight: 700, letterSpacing: "1px", color: G, marginBottom: 8 }}>REVIEW AFTER</div>
                  <div style={{ borderBottom: `1px solid ${BORDER}`, width: "80%", paddingBottom: 2, fontSize: "8pt", fontWeight: 700, color: G }}>{rx.reviewAfter}</div>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 2, paddingTop: 4, borderTop: `1px solid ${BORDER}` }}>
              <div style={{ fontStyle: "italic", fontSize: "13pt", color: G, fontFamily: "Georgia, serif" }}>
                Your eyes deserve calm, not strain. ♡
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ borderBottom: `1px solid ${G}`, width: 140, marginBottom: 3 }}>
                  <span style={{ fontSize: "7.5pt", fontWeight: 700, color: G }}>{rx.doctorName}</span>
                </div>
                <div style={{ fontSize: "7pt", color: "#666" }}>Doctor&apos;s Signature</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
