"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { prescriptionsService, usersService } from "@/services/firestore";
import { useAuth } from "@/contexts/auth-context";

const G = "#1a472b";       // dark forest green (exact brand)
const GOLD = "#C4972A";    // gold/amber
const LTGREEN = "#f6f6ee"; // light cream-green section headers
const BORDER = "#c8d4bc";  // muted green border

const cell: React.CSSProperties = { border: `1px solid ${BORDER}`, padding: "3px 6px", fontSize: "8pt", color: G, textAlign: "center", minHeight: "22px" };
const hCell: React.CSSProperties = { ...cell, background: G, color: "white", fontWeight: 700, fontSize: "7pt", letterSpacing: "0.3px", padding: "5px 6px" };
const dotLine: React.CSSProperties = { borderBottom: "1px dotted #b0b0b0", height: "17px", marginBottom: "5px", display: "block" };

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

function PlanCol({ icon, title, content }: { icon: React.ReactNode; title: string; content?: string }) {
  return (
    <div style={{ flex: 1, padding: "0 10px", borderRight: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
        {icon}
        <span style={{ fontSize: "7pt", fontWeight: 700, letterSpacing: "1px", color: G }}>{title}</span>
      </div>
      {content ? (
        <div style={{ fontSize: "7.5pt", color: G, lineHeight: 1.6 }}>{content}</div>
      ) : (
        <>
          <span style={dotLine} />
          <span style={dotLine} />
          <span style={dotLine} />
        </>
      )}
    </div>
  );
}

export default function PrescriptionPdfPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [prescription, setPrescription] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scale, setScale]   = useState(1);

  useEffect(() => {
    const update = () => {
      const available = window.innerWidth - 40; // 20px pad each side
      setScale(Math.min(1, available / 794));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    async function load() {
      if (!params.id || !user) return;
      try {
        const rx = await prescriptionsService.getById(params.id as string);
        if (!rx) { router.push("/"); return; }
        if (rx.patientId !== user.id && rx.doctorId !== user.id && user.role !== "admin") { router.push("/"); return; }
        setPrescription(rx);
        const [pd, dd] = await Promise.all([usersService.getById(rx.patientId), usersService.getById(rx.doctorId)]);
        setPatient(pd); setDoctor(dd);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [params.id, user, router]);

  const fmt = (d: Date) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
  const shortId = (id: string) => id.substring(0, 8).toUpperCase();

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>Loading...</div>;
  if (!prescription) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>Prescription not found.</div>;

  const infoFields = [
    { label: "Patient Name", value: patient?.displayName || "" },
    { label: "Date", value: prescription.createdAt ? fmt(prescription.createdAt) : "" },
    { label: "Age / Gender", value: [prescription.patientAge, prescription.patientGender].filter(Boolean).join(" / ") },
    { label: "Prescription ID", value: shortId(prescription.id) },
    { label: "Contact No.", value: patient?.phoneNumber || "" },
    { label: "Referred By", value: prescription.referredBy || "" },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @font-face {
          font-family: 'Brittany Signature';
          src: url('/fonts/BrittanySignature.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap');
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: white !important; }
          @page { size: A4 portrait; margin: 0; }
          html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .rx-page { box-shadow: none !important; }
        }
        body { background: #faf7f0; }
        @media print { .rx-page { zoom: 1 !important; } }
      `}} />

      <div className="no-print" style={{ position: "fixed", top: 16, right: 16, zIndex: 1000, display: "flex", gap: 8 }}>
        <button onClick={() => window.print()} style={{ background: G, color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
          🖨️ Print / Save as PDF
        </button>
        <button onClick={() => router.back()} style={{ background: "white", color: G, border: `1px solid ${G}`, borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontSize: 13 }}>
          ← Back
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "center", padding: "40px 20px" }}>
        <div className="rx-page" style={{ width: 794, zoom: scale, background: "#fefdf9", padding: 0, boxSizing: "border-box", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", fontFamily: "Arial, sans-serif", color: G, fontSize: "8pt", position: "relative", overflow: "hidden" }}>

          {/* HEADER IMAGE — full bleed, exactly 794px wide */}
          <img
            src="/prescription_header.svg"
            alt="Eye Aura Header"
            style={{ display: "block", width: "100%", marginBottom: 0 }}
          />

          {/* BODY — all content below the header, with side padding */}
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
              {/* glasses icon in dark green circle */}
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="16" height="10" viewBox="0 0 28 16" fill="none">
                  <circle cx="7" cy="8" r="5.5" fill="none" stroke="white" strokeWidth="2"/>
                  <circle cx="21" cy="8" r="5.5" fill="none" stroke="white" strokeWidth="2"/>
                  <line x1="12.5" y1="8" x2="15.5" y2="8" stroke="white" strokeWidth="2"/>
                  <line x1="1" y1="6" x2="1.5" y2="3.5" stroke="white" strokeWidth="1.8"/>
                  <line x1="27" y1="6" x2="26.5" y2="3.5" stroke="white" strokeWidth="1.8"/>
                </svg>
              </div>
              <span style={{ fontWeight: 700, fontSize: "9pt", letterSpacing: "1px", color: G }}>DISTANCE VISION</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <table style={{ flex: 1, borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["EYE", "SPH (Sphere)", "CYL (Cylinder)", "AXIS", "VA (Visual Acuity)", "REMARKS"].map(h => <th key={h} style={hCell}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  <Row label="RIGHT (OD)" {...prescription.rightEye} />
                  <Row label="LEFT (OS)" {...prescription.leftEye} />
                </tbody>
              </table>
              <div style={{ width: 112, border: `1.5px solid ${BORDER}`, borderRadius: 6, padding: "8px 10px", flexShrink: 0, textAlign: "center" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
                  <svg width="34" height="20" viewBox="0 0 36 22" fill="none">
                    <path d="M2 11 Q18 0 34 11 Q18 22 2 11Z" fill="none" stroke={G} strokeWidth="1.5"/>
                    <circle cx="18" cy="11" r="5" fill={G}/>
                    <circle cx="18" cy="11" r="2.5" fill="white"/>
                    <circle cx="18" cy="11" r="1.2" fill={G}/>
                  </svg>
                </div>
                <div style={{ fontSize: "7pt", fontWeight: 700, letterSpacing: "0.5px", color: G, marginBottom: 7 }}>PUPILLARY DISTANCE</div>
                {[{ label: "Distance PD", val: prescription.pd }, { label: "Near PD", val: prescription.nearPD }].map(({ label, val }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", fontSize: "7pt", marginBottom: 5, gap: 2, justifyContent: "center" }}>
                    <span style={{ color: "#555", fontSize: "6.5pt" }}>{label} :</span>
                    <span style={{ borderBottom: "1px solid #ccc", minWidth: 26, textAlign: "center", paddingBottom: 1, fontWeight: val ? 700 : 400 }}>{val || "\u00A0"}</span>
                    <span style={{ color: "#555" }}>mm</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* NEAR VISION */}
          <div style={{ marginBottom: "4mm" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: LTGREEN, padding: "5px 8px", borderRadius: "4px 4px 0 0", marginBottom: 1 }}>
              {/* book icon in dark green circle */}
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
                <thead>
                  <tr>{["EYE", "ADD", "VA (Visual Acuity)", "REMARKS"].map(h => <th key={h} style={hCell}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  <NearRow label="RIGHT (OD)" {...prescription.nearVisionRight} />
                  <NearRow label="LEFT (OS)" {...prescription.nearVisionLeft} />
                </tbody>
              </table>
              <div style={{ width: 112, border: `1.5px solid ${BORDER}`, borderRadius: 6, padding: "8px 10px", flexShrink: 0 }}>
                <div style={{ fontSize: "7pt", fontWeight: 700, letterSpacing: "1px", color: G, textAlign: "center", marginBottom: 5 }}>FINDINGS</div>
                <div style={{ fontSize: "7.5pt", color: G, lineHeight: 1.6 }}>
                  {prescription.findings || <><span style={dotLine}/><span style={dotLine}/><span style={dotLine}/></>}
                </div>
                <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
                  <svg width="44" height="20" viewBox="0 0 60 28" fill="none" opacity="0.5">
                    <path d="M10 24 Q20 15 30 10 Q25 18 15 24Z" fill={G}/>
                    <path d="M50 24 Q40 15 30 10 Q35 18 45 24Z" fill={G}/>
                    <path d="M15 26 Q30 20 45 26" stroke={G} strokeWidth="1" fill="none"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* EYE AURA PLAN */}
          <div style={{ border: `1.5px solid ${BORDER}`, borderRadius: 6, marginBottom: "4mm" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", borderBottom: `1px solid ${BORDER}` }}>
              {/* clipboard icon in dark green circle */}
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="13" height="14" viewBox="0 0 20 22" fill="none">
                  <rect x="2" y="4" width="16" height="16" rx="2" stroke="white" strokeWidth="1.8" fill="none"/>
                  <rect x="7" y="1" width="6" height="5" rx="1" stroke="white" strokeWidth="1.5" fill={G}/>
                  <line x1="5.5" y1="10" x2="14.5" y2="10" stroke="white" strokeWidth="1.2"/>
                  <line x1="5.5" y1="13" x2="12" y2="13" stroke="white" strokeWidth="1.2"/>
                </svg>
              </div>
              {/* dashed rule lines flanking title */}
              <div style={{ flex: 1, height: 1, background: BORDER }}/>
              <span style={{ fontWeight: 700, fontSize: "9pt", letterSpacing: "1px", color: G, whiteSpace: "nowrap" }}>EYE AURA PLAN</span>
              <div style={{ flex: 1, height: 1, background: BORDER }}/>
            </div>
            <div style={{ display: "flex", padding: "8px 0" }}>
              <PlanCol icon={<svg width="22" height="13" viewBox="0 0 28 16" fill="none"><circle cx="7" cy="8" r="5.5" fill="none" stroke={G} strokeWidth="1.5"/><circle cx="21" cy="8" r="5.5" fill="none" stroke={G} strokeWidth="1.5"/><line x1="12.5" y1="8" x2="15.5" y2="8" stroke={G} strokeWidth="1.5"/><line x1="0.5" y1="6" x2="1.5" y2="3.5" stroke={G} strokeWidth="1.3"/><line x1="27.5" y1="6" x2="26.5" y2="3.5" stroke={G} strokeWidth="1.3"/></svg>} title="GLASSES" content={prescription.medications} />
              <PlanCol icon={<svg width="16" height="20" viewBox="0 0 20 26" fill="none"><path d="M10 2 Q17 10 17 17 A7 7 0 0 1 3 17 Q3 10 10 2Z" fill="none" stroke={G} strokeWidth="1.5"/></svg>} title="RECOMMENDED EYE DROPS" content={prescription.eyeDrops} />
              <div style={{ flex: 1, padding: "0 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                  <svg width="20" height="24" viewBox="0 0 24 28" fill="none">
                    <circle cx="12" cy="5" r="3" fill={G}/>
                    <path d="M8 12 Q12 9 16 12 L15 19 Q12 21 9 19Z" fill={G}/>
                    <path d="M8 13 Q5 15 4 18" stroke={G} strokeWidth="1.5" fill="none"/>
                    <path d="M16 13 Q19 15 20 18" stroke={G} strokeWidth="1.5" fill="none"/>
                  </svg>
                  <span style={{ fontSize: "7pt", fontWeight: 700, letterSpacing: "1px", color: G }}>EYE EXERCISES</span>
                </div>
                {prescription.exercises ? <div style={{ fontSize: "7.5pt", color: G, lineHeight: 1.6 }}>{prescription.exercises}</div> : <><span style={dotLine}/><span style={dotLine}/><span style={dotLine}/></>}
              </div>
            </div>
          </div>

          {/* BOTTOM ROW */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2.2fr", gap: 8, marginBottom: "4mm" }}>
            {/* Daily Eye Ritual */}
            <div style={{ background: LTGREEN, borderRadius: 6, padding: "8px 10px" }}>
              <div style={{ fontSize: "8pt", fontWeight: 700, letterSpacing: "1px", color: G, textAlign: "center", marginBottom: 7 }}>DAILY EYE RITUAL</div>
              <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 6 }}>
                {[
                  { icon: <svg width="26" height="18" viewBox="0 0 28 20" fill="none"><path d="M2 10 Q14 0 26 10 Q14 20 2 10Z" fill="none" stroke={G} strokeWidth="1.5"/><circle cx="14" cy="10" r="5" fill={G}/><circle cx="14" cy="10" r="2.5" fill="white"/><circle cx="14" cy="10" r="1.2" fill={G}/></svg>, label: "Blink Slowly", sub: "(10 times)" },
                  { icon: (
                    /* Close Eyes — closed eyelid with lashes */
                    <svg width="28" height="18" viewBox="0 0 30 18" fill="none">
                      <path d="M2 9 Q15 2 28 9" stroke={G} strokeWidth="1.8" fill="none" strokeLinecap="round"/>
                      <path d="M6 10 Q15 14 24 10" stroke={G} strokeWidth="1.4" fill="none" strokeLinecap="round"/>
                      <line x1="8" y1="11" x2="7" y2="15" stroke={G} strokeWidth="1.1" strokeLinecap="round"/>
                      <line x1="12" y1="13" x2="12" y2="17" stroke={G} strokeWidth="1.1" strokeLinecap="round"/>
                      <line x1="16" y1="13" x2="16" y2="17" stroke={G} strokeWidth="1.1" strokeLinecap="round"/>
                      <line x1="20" y1="12" x2="21" y2="16" stroke={G} strokeWidth="1.1" strokeLinecap="round"/>
                    </svg>
                  ), label: "Close Eyes", sub: "(30 sec)" },
                  { icon: (
                    /* Palm Gently — two open cupped hands side by side */
                    <svg width="30" height="22" viewBox="0 0 34 24" fill="none">
                      {/* Left hand */}
                      <rect x="1" y="10" width="3.2" height="7" rx="1.6" fill={G}/>
                      <rect x="5" y="7" width="3.2" height="10" rx="1.6" fill={G}/>
                      <rect x="9" y="6" width="3.2" height="11" rx="1.6" fill={G}/>
                      <rect x="13" y="7" width="3.2" height="9" rx="1.6" fill={G}/>
                      <path d="M1 15 Q1 21 7 22 L16 22 Q17 20 16 16" fill={G}/>
                      {/* Right hand (mirror) */}
                      <rect x="29.8" y="10" width="3.2" height="7" rx="1.6" fill={G}/>
                      <rect x="25.8" y="7" width="3.2" height="10" rx="1.6" fill={G}/>
                      <rect x="21.8" y="6" width="3.2" height="11" rx="1.6" fill={G}/>
                      <rect x="17.8" y="7" width="3.2" height="9" rx="1.6" fill={G}/>
                      <path d="M33 15 Q33 21 27 22 L18 22 Q17 20 18 16" fill={G}/>
                    </svg>
                  ), label: "Palm Gently", sub: "(20-30 sec)" },
                ].map(({ icon, label, sub }, i) => (
                  <div key={i} style={{ textAlign: "center", fontSize: "6.5pt", color: G }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 3 }}>{icon}</div>
                    <div style={{ fontWeight: 600 }}>{label}</div>
                    <div style={{ color: "#666" }}>{sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: "#1a472b", color: "white", borderRadius: 20, padding: "4px 6px", textAlign: "center", fontSize: "6.5pt", fontWeight: 600 }}>
                Do this twice daily for relaxed vision
              </div>
            </div>

            {/* Important Advice + Review After — shared box */}
            <div style={{ display: "flex", background: "#f8f6ea", border: `1px solid ${BORDER}`, borderRadius: 6, overflow: "hidden" }}>

              {/* Important Advice */}
              <div style={{ flex: 1, padding: "8px 12px", borderRight: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: "8pt", fontWeight: 700, letterSpacing: "1px", color: G, marginBottom: 6, textAlign: "center" }}>IMPORTANT ADVICE</div>
                {[
                  "Use your glasses as prescribed.",
                  "Follow 20-20-20 rule for screen use.",
                  "Maintain proper lighting while reading.",
                  "Stay hydrated and get adequate sleep.",
                ].map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 5, fontSize: "7.5pt", color: G, marginBottom: 4 }}>
                    <span>•</span><span>{a}</span>
                  </div>
                ))}
              </div>

              {/* Review After */}
              <div style={{ width: 110, flexShrink: 0, padding: "8px 10px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: "7.5pt", fontWeight: 700, letterSpacing: "1px", color: G, marginBottom: 8 }}>REVIEW AFTER</div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <rect x="2" y="6" width="28" height="24" rx="3" stroke={G} strokeWidth="1.5" fill="none"/>
                    <line x1="2" y1="13" x2="30" y2="13" stroke={G} strokeWidth="1"/>
                    <line x1="9" y1="2" x2="9" y2="10" stroke={G} strokeWidth="2"/>
                    <line x1="23" y1="2" x2="23" y2="10" stroke={G} strokeWidth="2"/>
                    <circle cx="9" cy="19" r="1.5" fill={G}/><circle cx="16" cy="19" r="1.5" fill={G}/><circle cx="23" cy="19" r="1.5" fill={G}/>
                    <circle cx="9" cy="25" r="1.5" fill={G}/><circle cx="16" cy="25" r="1.5" fill={G}/>
                  </svg>
                </div>
                <div style={{ borderBottom: `1px solid ${BORDER}`, width: "80%", paddingBottom: 2, fontSize: "8pt", fontWeight: prescription.reviewAfter ? 700 : 400, color: G, minHeight: 18 }}>
                  {prescription.reviewAfter || "\u00A0"}
                </div>
              </div>

            </div>
          </div>

          {/* FOOTER */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 2, paddingTop: 4, borderTop: `1px solid ${BORDER}` }}>
            <div style={{ fontFamily: "'Brittany Signature', 'Dancing Script', cursive", fontSize: "15pt", color: G }}>
              Your eyes deserve calm, not strain. ♡
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ borderBottom: `1px solid ${G}`, width: 140, marginBottom: 3 }}>
                {doctor?.displayName ? <span style={{ fontSize: "7.5pt", fontWeight: 700, color: G }}>{doctor.displayName}</span> : "\u00A0"}
              </div>
              <div style={{ fontSize: "7pt", color: "#666" }}>Doctor&apos;s Signature</div>
            </div>
            <div>
              <svg width="32" height="18" viewBox="0 0 36 20" fill="none">
                <circle cx="9" cy="10" r="8" fill="none" stroke={G} strokeWidth="1.8"/>
                <circle cx="27" cy="10" r="8" fill="none" stroke={G} strokeWidth="1.8"/>
                <line x1="17" y1="10" x2="19" y2="10" stroke={G} strokeWidth="1.8"/>
              </svg>
            </div>
          </div>

          </div>{/* end body */}
        </div>
      </div>
    </>
  );
}
