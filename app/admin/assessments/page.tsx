"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { usersService, visionAssessmentsService } from "@/services/firestore";
import type { UserDocument, VisionAssessmentDocument, VisionAssessmentType } from "@/types/firestore";
import { getAuth } from "firebase/auth";
import { Eye, BookOpen, ShieldAlert, CheckCircle2, Search, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function AdminAssessmentsPage() {
  const { user } = useAuth();

  // Patient search
  const [query, setQuery]                 = useState("");
  const [patients, setPatients]           = useState<UserDocument[]>([]);
  const [searching, setSearching]         = useState(false);
  const [selected, setSelected]           = useState<UserDocument | null>(null);

  // Assignment form
  const [types, setTypes]                 = useState<VisionAssessmentType[]>(["far", "near"]);
  const [assigning, setAssigning]         = useState(false);
  const [success, setSuccess]             = useState(false);
  const [error, setError]                 = useState("");

  // All assessments (recent)
  const [allAssessments, setAllAssessments] = useState<VisionAssessmentDocument[]>([]);
  const [loadingAll, setLoadingAll]         = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await visionAssessmentsService.getAll(50);
        setAllAssessments(list);
      } finally {
        setLoadingAll(false);
      }
    })();
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      setSearching(true);
      const all = await usersService.getByRole("patient");
      const q = query.toLowerCase();
      setPatients(
        all.filter(
          (p) =>
            p.displayName?.toLowerCase().includes(q) ||
            p.email.toLowerCase().includes(q)
        )
      );
    } finally {
      setSearching(false);
    }
  };

  const toggleType = (t: VisionAssessmentType) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const handleAssign = async () => {
    if (!selected || !user || types.length === 0) return;
    setError("");
    try {
      setAssigning(true);
      const idToken = await getAuth().currentUser?.getIdToken();
      const res = await fetch("/api/assessments/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          patientId:    selected.id,
          assessmentTypes: types,
          assignedRole: "admin",
          doctorId:     undefined,
          overrideUsed: true,
          autoAssigned: false,
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        setError(e.error ?? "Assignment failed");
        return;
      }
      setSuccess(true);
      setSelected(null);
      setPatients([]);
      setQuery("");
      const refreshed = await visionAssessmentsService.getAll(50);
      setAllAssessments(refreshed);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      setError("Failed to assign assessment");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl text-[#0f4f4b] mb-1">Vision Assessments</h1>
        <p className="text-sm text-[#0f4f4b]/55">Assign assessments to patients. Admin overrides bypass appointment requirements.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Assignment panel */}
        <Card className="border-[#0f4f4b]/12">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#b5964d]/12 flex items-center justify-center">
                <ShieldAlert className="h-3.5 w-3.5 text-[#b5964d]" />
              </div>
              <CardTitle className="text-sm font-bold text-[#0f4f4b]">Admin Override Assignment</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-2 space-y-4">
            {/* Patient search */}
            <div>
              <label className="text-xs font-semibold text-[#0f4f4b]/60 mb-1.5 block">Find Patient</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Name or email..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1 rounded-xl border-[#0f4f4b]/15"
                />
                <Button
                  onClick={handleSearch}
                  disabled={searching}
                  size="icon"
                  variant="outline"
                  className="rounded-xl border-[#0f4f4b]/15"
                >
                  {searching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {patients.length > 0 && (
                <div className="mt-2 rounded-xl border border-[#0f4f4b]/10 overflow-hidden">
                  {patients.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelected(p); setPatients([]); setQuery(p.displayName ?? p.email); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#0f4f4b]/4 transition-colors ${
                        selected?.id === p.id ? "bg-[#0f4f4b]/6" : ""
                      }`}
                    >
                      <div className="h-8 w-8 rounded-full bg-[#0f4f4b] grid place-items-center shrink-0">
                        <span className="text-[10px] font-bold text-white">
                          {(p.displayName ?? p.email)[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#0f4f4b] truncate">{p.displayName ?? "Patient"}</p>
                        <p className="text-xs text-[#0f4f4b]/50 truncate">{p.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected patient */}
            {selected && (
              <div className="flex items-center gap-3 rounded-xl bg-[#0f4f4b]/6 border border-[#0f4f4b]/12 px-3 py-2">
                <div className="h-8 w-8 rounded-full bg-[#0f4f4b] grid place-items-center shrink-0">
                  <span className="text-[10px] font-bold text-white">
                    {(selected.displayName ?? selected.email)[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0f4f4b]">{selected.displayName ?? "Patient"}</p>
                  <p className="text-xs text-[#0f4f4b]/50">{selected.email}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-[#0f4f4b]/30 hover:text-[#0f4f4b]">
                  <span className="text-lg leading-none">&times;</span>
                </button>
              </div>
            )}

            {/* Test type selection */}
            <div>
              <label className="text-xs font-semibold text-[#0f4f4b]/60 mb-1.5 block">Assessment Types</label>
              <div className="flex gap-2">
                {([["far", Eye, "Far Vision"], ["near", BookOpen, "Near Vision"]] as const).map(([t, Icon, label]) => (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                      types.includes(t)
                        ? "border-[#0f4f4b] bg-[#0f4f4b]/6"
                        : "border-[#0f4f4b]/15 bg-white hover:border-[#0f4f4b]/25"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${types.includes(t) ? "text-[#0f4f4b]" : "text-[#0f4f4b]/35"}`} />
                    <span className={`text-xs font-semibold ${types.includes(t) ? "text-[#0f4f4b]" : "text-[#0f4f4b]/45"}`}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Admin notice */}
            <div className="flex items-start gap-2 rounded-xl bg-[#b5964d]/8 border border-[#b5964d]/20 px-3 py-2">
              <ShieldAlert className="h-3.5 w-3.5 text-[#b5964d] mt-0.5 shrink-0" />
              <p className="text-xs text-[#b5964d]/80 leading-relaxed">
                Admin override: no appointment required. Assignment will be audited with <strong>overrideUsed = true</strong>.
              </p>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" /> Assessment assigned successfully
              </div>
            )}

            <Button
              onClick={handleAssign}
              disabled={!selected || types.length === 0 || assigning}
              className="w-full rounded-xl bg-[#0f4f4b] hover:bg-[#0a3a36]"
            >
              {assigning ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <ShieldAlert className="h-4 w-4 mr-2" />}
              Assign Assessment (Admin Override)
            </Button>
          </CardContent>
        </Card>

        {/* Recent assessments */}
        <Card className="border-[#0f4f4b]/10">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-bold text-[#0f4f4b]">Recent Assignments</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            {loadingAll ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-5 w-5 text-[#0f4f4b]/30 animate-spin" />
              </div>
            ) : allAssessments.length === 0 ? (
              <p className="text-sm text-[#0f4f4b]/40 text-center py-8">No assessments assigned yet</p>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {allAssessments.map((a) => (
                  <div key={a.id} className="rounded-xl border border-[#0f4f4b]/8 bg-white/60 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#0f4f4b] truncate">
                          {a.assessmentTypes.map((t) => t === "far" ? "Far" : "Near").join(" + ")} Vision
                        </p>
                        <p className="text-[10px] text-[#0f4f4b]/45 truncate">
                          Patient: {a.patientId.slice(0, 8)}...
                          {a.overrideUsed && " · Admin override"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                          a.status === "completed"   ? "bg-green-50 text-green-700 border-green-200" :
                          a.status === "in_progress" ? "bg-[#b5964d]/10 text-[#b5964d] border-[#b5964d]/20" :
                          a.status === "expired"     ? "bg-gray-50 text-gray-500 border-gray-200" :
                          "bg-[#0f4f4b]/6 text-[#0f4f4b] border-[#0f4f4b]/12"
                        }`}>{a.status}</span>
                        <span className="flex items-center gap-0.5 text-[10px] text-[#0f4f4b]/35">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(a.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
