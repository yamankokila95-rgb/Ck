import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Search, Filter, Paperclip, MessageSquare, ChevronDown, ChevronUp, Send } from "lucide-react";
import { API_BASE, adminFetch } from "../lib/api";

type Comment = { id: number; message: string; adminName: string; createdAt: string };
type Complaint = {
  id: string; title: string; description: string; category: string;
  location: string; status: string; priority: string; attachment: string | null;
  createdAt: string; comments?: Comment[];
};

const STATUS_LABELS: Record<string, string> = { Submitted: "Submitted", "in-progress": "In Progress", resolved: "Resolved" };
const STATUS_COLORS: Record<string, string> = {
  Submitted: "bg-amber-100 text-amber-700",
  "in-progress": "bg-blue-100 text-blue-700",
  resolved: "bg-emerald-100 text-emerald-700",
};
const PRIORITY_COLORS: Record<string, string> = {
  Low: "bg-gray-100 text-gray-600", Medium: "bg-amber-100 text-amber-700", High: "bg-red-100 text-red-700",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminPage() {
  const navigate = useNavigate();
  const adminName = localStorage.getItem("adminName") || "Admin";

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [sendingComment, setSendingComment] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) navigate("/admin-login");
  }, [navigate]);

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterCategory !== "all") params.set("category", filterCategory);
      if (filterPriority !== "all") params.set("priority", filterPriority);
      if (filterLocation !== "all") params.set("location", filterLocation);
      if (search.trim()) params.set("search", search.trim());

      const res = await adminFetch(`/api/complaints?${params}`);
      if (res.status === 401 || res.status === 403) { navigate("/admin-login"); return; }
      setComplaints(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterCategory, filterPriority, filterLocation, search, navigate]);

  useEffect(() => { loadComplaints(); }, [loadComplaints]);

  const updateStatus = async (id: string, status: string) => {
    await adminFetch(`/api/admin/complaints/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    loadComplaints();
  };

  const updatePriority = async (id: string, priority: string) => {
    await adminFetch(`/api/admin/complaints/${id}`, { method: "PATCH", body: JSON.stringify({ priority }) });
    loadComplaints();
  };

  const sendComment = async (id: string) => {
    const msg = commentText[id]?.trim();
    if (!msg) return;
    setSendingComment(id);
    try {
      await adminFetch(`/api/admin/complaints/${id}/comments`, { method: "POST", body: JSON.stringify({ message: msg }) });
      setCommentText((prev) => ({ ...prev, [id]: "" }));
      // Reload just this complaint's comments
      const res = await fetch(`${API_BASE}/api/complaints/${id}`);
      const data = await res.json();
      setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, comments: data.comments } : c)));
    } finally {
      setSendingComment(null);
    }
  };

  const total = complaints.length;
  const submitted = complaints.filter(c => c.status === "Submitted").length;
  const inProgress = complaints.filter(c => c.status === "in-progress").length;
  const resolved = complaints.filter(c => c.status === "resolved").length;

  const categories = [...new Set(complaints.map(c => c.category))];
  const locations = [...new Set(complaints.map(c => c.location))];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Welcome back, {adminName}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total", value: total, color: "text-gray-800 dark:text-gray-100" },
            { label: "Submitted", value: submitted, color: "text-amber-600" },
            { label: "In Progress", value: inProgress, color: "text-blue-600" },
            { label: "Resolved", value: resolved, color: "text-emerald-600" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search + Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-48">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <Input placeholder="Search by title or description..." value={search}
                  onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Filter size={15} className="text-gray-400"/>
                {[
                  { label: "Status", value: filterStatus, setter: setFilterStatus, options: ["all","Submitted","in-progress","resolved"] },
                  { label: "Priority", value: filterPriority, setter: setFilterPriority, options: ["all","Low","Medium","High"] },
                  { label: "Category", value: filterCategory, setter: setFilterCategory, options: ["all", ...categories] },
                  { label: "Location", value: filterLocation, setter: setFilterLocation, options: ["all", ...locations] },
                ].map(({ label, value, setter, options }) => (
                  <select key={label} value={value} onChange={(e) => setter(e.target.value)}
                    className="text-sm border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-700">
                    <option value="all">All {label}s</option>
                    {options.filter(o => o !== "all").map(o => <option key={o} value={o}>{STATUS_LABELS[o] ?? o}</option>)}
                  </select>
                ))}
                <button onClick={() => { setSearch(""); setFilterStatus("all"); setFilterCategory("all"); setFilterPriority("all"); setFilterLocation("all"); }}
                  className="text-sm text-red-500 hover:text-red-700 px-2">Clear</button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Complaints */}
        {loading && <p className="text-muted-foreground text-center py-10">Loading complaints...</p>}
        {!loading && complaints.length === 0 && <p className="text-muted-foreground text-center py-10">No complaints match your filters.</p>}

        {!loading && complaints.map((c) => (
          <Card key={c.id} className="mb-4 overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-2 flex-wrap">
                <div className="flex-1">
                  <CardTitle className="text-base font-semibold mb-1">{c.title}</CardTitle>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{c.category}</span><span>·</span>
                    <span>{c.location}</span><span>·</span>
                    <span>{formatDate(c.createdAt)}</span><span>·</span>
                    <span>ID #{c.id}</span>
                    {c.attachment && <span className="flex items-center gap-1"><Paperclip size={11}/>Attachment</span>}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-1 rounded-full ${PRIORITY_COLORS[c.priority] ?? "bg-gray-100 text-gray-600"}`}>{c.priority}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>{STATUS_LABELS[c.status] ?? c.status}</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{c.description}</p>

              {/* Status + Priority controls */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-xs font-medium text-gray-500 self-center">Status:</span>
                {["Submitted","in-progress","resolved"].map(s => (
                  <button key={s} onClick={() => updateStatus(c.id, s)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${c.status === s ? "bg-emerald-500 text-white border-emerald-500" : "border-gray-200 hover:border-emerald-400"}`}>
                    {STATUS_LABELS[s]}
                  </button>
                ))}
                <span className="text-xs font-medium text-gray-500 self-center ml-2">Priority:</span>
                {["Low","Medium","High"].map(p => (
                  <button key={p} onClick={() => updatePriority(c.id, p)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${c.priority === p ? "bg-gray-700 text-white border-gray-700" : "border-gray-200 hover:border-gray-400"}`}>
                    {p}
                  </button>
                ))}
              </div>

              {/* Expand/collapse comments */}
              <button onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-1">
                <MessageSquare size={15}/>
                {c.comments?.length ?? 0} Response{(c.comments?.length ?? 0) !== 1 ? "s" : ""}
                {expanded === c.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
              </button>

              {expanded === c.id && (
                <div className="mt-3 space-y-3">
                  {(c.comments ?? []).map((cm) => (
                    <div key={cm.id} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-l-4 border-blue-400">
                      <p className="text-sm">{cm.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{cm.adminName} · {formatDate(cm.createdAt)}</p>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <Input placeholder="Write a response to the student..."
                      value={commentText[c.id] ?? ""}
                      onChange={(e) => setCommentText(prev => ({ ...prev, [c.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && sendComment(c.id)}
                    />
                    <Button size="sm" onClick={() => sendComment(c.id)} disabled={sendingComment === c.id}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white">
                      <Send size={14}/>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
