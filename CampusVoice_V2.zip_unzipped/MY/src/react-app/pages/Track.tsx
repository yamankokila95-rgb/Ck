import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Search, Loader2, Clock, Building2, MapPin, Calendar, CheckCircle2, Circle, MessageSquare, Paperclip } from "lucide-react";
import { API_BASE } from "../lib/api";

type Comment = { id: number; message: string; adminName: string; createdAt: string };
type Complaint = {
  id: string; title: string; description: string; category: string;
  location: string; status: string; priority: string; attachment: string | null;
  createdAt: string; comments: Comment[];
};

const statusConfig: Record<string, { label: string; color: string; description: string }> = {
  Submitted:    { label: "Submitted",   color: "bg-amber-100 text-amber-700",   description: "Your complaint has been submitted and is awaiting review." },
  "in-progress":{ label: "In Progress", color: "bg-blue-100 text-blue-700",     description: "Administration is actively working on your issue." },
  resolved:     { label: "Resolved",    color: "bg-emerald-100 text-emerald-700",description: "Your issue has been resolved. Thank you for reporting!" },
};

const priorityColor: Record<string, string> = {
  Low: "bg-gray-100 text-gray-600",
  Medium: "bg-amber-100 text-amber-700",
  High: "bg-red-100 text-red-700",
};

const steps = ["Submitted", "in-progress", "resolved"] as const;

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function Track() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("phrase") || searchParams.get("id") || "");
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (q?: string) => {
    const val = (q ?? query).trim();
    if (!val) return;
    setLoading(true); setError(""); setComplaint(null);
    try {
      // If it looks like a passphrase (contains dashes), use passphrase endpoint
      const isPhrase = val.includes("-");
      const url = isPhrase
        ? `${API_BASE}/api/complaints/passphrase/${val}`
        : `${API_BASE}/api/complaints/${val}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      setComplaint(await res.json());
    } catch {
      setError("No complaint found. Check your ID or passphrase and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const phrase = searchParams.get("phrase");
    const id = searchParams.get("id");
    const val = phrase || id;
    if (val) { setQuery(val); handleSearch(val); }
  }, [searchParams]);

  const currentStepIdx = complaint ? steps.indexOf(complaint.status as typeof steps[number]) : -1;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Track Your Complaint</h1>
          <p className="text-muted-foreground">Enter your Complaint ID or Secret Passphrase</p>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex gap-3">
              <Input placeholder="e.g.  42  or  blue-river-412" value={query} onChange={(e) => setQuery(e.target.value)} />
              <Button type="submit" disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <Search className="w-4 h-4 mr-2" />Track
              </Button>
            </form>
          </CardContent>
        </Card>

        {loading && (
          <div className="text-center py-10">
            <Loader2 className="animate-spin mx-auto mb-2 text-emerald-500" size={32} />
            <p className="text-muted-foreground">Searching...</p>
          </div>
        )}

        {!loading && error && (
          <Card className="border-red-200">
            <CardContent className="text-center py-10">
              <p className="text-red-500 font-medium">{error}</p>
            </CardContent>
          </Card>
        )}

        {!loading && complaint && (
          <Card className="shadow-xl rounded-2xl">
            <CardHeader>
              <CardTitle className="flex justify-between items-start gap-2 flex-wrap">
                <span>{complaint.title}</span>
                <div className="flex gap-2">
                  {complaint.priority && (
                    <span className={`text-xs px-2 py-1 rounded-full ${priorityColor[complaint.priority] ?? "bg-gray-100 text-gray-600"}`}>
                      {complaint.priority}
                    </span>
                  )}
                  <span className={`text-xs px-3 py-1 rounded-full ${statusConfig[complaint.status]?.color ?? "bg-gray-100 text-gray-600"}`}>
                    {statusConfig[complaint.status]?.label ?? complaint.status}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Progress steps */}
              <div className="flex items-center">
                {steps.map((step, idx) => (
                  <div key={step} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      {idx <= currentStepIdx
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        : <Circle className="w-5 h-5 text-gray-300" />}
                      <p className="text-xs mt-1 text-center w-16 leading-tight">{statusConfig[step]?.label}</p>
                    </div>
                    {idx < steps.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-1 mb-5 ${idx < currentStepIdx ? "bg-emerald-500" : "bg-gray-200"}`} />
                    )}
                  </div>
                ))}
              </div>

              <p className="text-gray-700 dark:text-gray-300">{complaint.description}</p>

              <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                <div className="flex gap-2 items-center"><Building2 size={15}/><span>{complaint.category}</span></div>
                <div className="flex gap-2 items-center"><MapPin size={15}/><span>{complaint.location}</span></div>
                <div className="flex gap-2 items-center"><Calendar size={15}/><span>{formatDate(complaint.createdAt)}</span></div>
                <div className="flex gap-2 items-center"><Clock size={15}/><span>ID #{complaint.id}</span></div>
              </div>

              {/* Attachment */}
              {complaint.attachment && (
                <a href={`${API_BASE}/uploads/${complaint.attachment}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-emerald-600 hover:underline">
                  <Paperclip size={15}/> View Attachment
                </a>
              )}

              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-sm text-emerald-800 dark:text-emerald-300">
                {statusConfig[complaint.status]?.description}
              </div>

              {/* Admin comments */}
              {complaint.comments && complaint.comments.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <MessageSquare size={16}/> Admin Responses
                  </h4>
                  <div className="space-y-3">
                    {complaint.comments.map((c) => (
                      <div key={c.id} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-l-4 border-blue-400">
                        <p className="text-sm text-gray-800 dark:text-gray-200">{c.message}</p>
                        <p className="text-xs text-gray-400 mt-2">{c.adminName} · {formatDate(c.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {complaint.comments?.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No admin responses yet. Check back later.</p>
              )}
            </CardContent>
          </Card>
        )}

        {!loading && !complaint && !error && (
          <p className="text-center text-muted-foreground mt-4">Enter your complaint ID or passphrase above to track status</p>
        )}
      </main>
    </div>
  );
}
