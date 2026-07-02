"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { collection, query, orderBy, limit, getDocs, updateDoc, doc } from "firebase/firestore";
import { getFirebaseDb } from "@/services/firebase/client";
import type { ErrorLogDocument } from "@/types/error-log";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Clock, User, Code, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ErrorLogsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<(ErrorLogDocument & { firestoreId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unresolved">("unresolved");

  useEffect(() => {
    if (!user) return;
    if (user.role !== "admin") {
      router.push("/");
      return;
    }

    loadErrorLogs();
  }, [user, router]);

  const loadErrorLogs = async () => {
    try {
      setLoading(true);
      const db = getFirebaseDb();
      const logsRef = collection(db, "error_logs");
      const q = query(logsRef, orderBy("timestamp", "desc"), limit(100));
      
      const snapshot = await getDocs(q);
      const errorLogs = snapshot.docs.map(doc => ({
        firestoreId: doc.id,
        id: doc.data().id || doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      })) as (ErrorLogDocument & { firestoreId: string })[];
      
      setLogs(errorLogs);
    } catch (error) {
      console.error("Failed to load error logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsResolved = async (firestoreId: string) => {
    try {
      const db = getFirebaseDb();
      const logRef = doc(db, "error_logs", firestoreId);
      await updateDoc(logRef, { resolved: true });
      
      setLogs(logs.map(log => 
        log.firestoreId === firestoreId ? { ...log, resolved: true } : log
      ));
    } catch (error) {
      console.error("Failed to mark as resolved:", error);
    }
  };

  const filteredLogs = filter === "unresolved" 
    ? logs.filter(log => !log.resolved)
    : logs;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading error logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Error Logs</h1>
        <p className="text-muted-foreground">Monitor and track application errors</p>
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === "all"
              ? "bg-primary text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          All ({logs.length})
        </button>
        <button
          onClick={() => setFilter("unresolved")}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === "unresolved"
              ? "bg-primary text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Unresolved ({logs.filter(l => !l.resolved).length})
        </button>
      </div>

      {/* Error Logs */}
      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {filter === "unresolved" ? "No unresolved errors" : "No error logs found"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map((log) => (
            <Card key={log.firestoreId} className={log.resolved ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        log.resolved 
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {log.code}
                      </span>
                      {log.resolved && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Resolved
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-lg">{log.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{log.message}</p>
                  </div>
                  {!log.resolved && (
                    <button
                      onClick={() => markAsResolved(log.firestoreId)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Original Error */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Original Error:</p>
                  <p className="text-sm text-red-900 font-mono">{log.originalError}</p>
                  {log.firebaseCode && (
                    <p className="text-xs text-red-600 mt-2">
                      Firebase Code: <code className="font-mono">{log.firebaseCode}</code>
                    </p>
                  )}
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                  {log.context && (
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Context</p>
                        <p className="font-semibold">{log.context}</p>
                      </div>
                    </div>
                  )}
                  
                  {log.action && (
                    <div className="flex items-start gap-2">
                      <Code className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Action</p>
                        <p className="font-semibold">{log.action}</p>
                      </div>
                    </div>
                  )}
                  
                  {log.userId && (
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">User</p>
                        <p className="font-semibold">{log.userEmail || log.userId}</p>
                        {log.userRole && (
                          <p className="text-xs text-muted-foreground capitalize">{log.userRole}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Timestamp</p>
                      <p className="font-semibold">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {log.resourceType && (
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Resource</p>
                        <p className="font-semibold capitalize">{log.resourceType}</p>
                        {log.resourceId && (
                          <p className="text-xs text-muted-foreground font-mono">{log.resourceId}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Stack Trace */}
                {log.stack && (
                  <details className="bg-muted rounded-lg p-3">
                    <summary className="text-xs font-semibold cursor-pointer text-muted-foreground hover:text-foreground">
                      Stack Trace
                    </summary>
                    <pre className="text-xs mt-2 overflow-x-auto text-muted-foreground font-mono whitespace-pre-wrap">
                      {log.stack}
                    </pre>
                  </details>
                )}

                {/* URL */}
                {log.url && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">URL: </span>
                    <a href={log.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono">
                      {log.url}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
