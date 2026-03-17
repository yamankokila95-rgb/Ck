import { useState } from "react";
import { Building2, Wifi, Zap, Shield, Trash2, HelpCircle, Upload, X, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/api";

const categories = [
  { name: "Infrastructure", desc: "Buildings, roads", icon: Building2 },
  { name: "Technology", desc: "Internet, computers", icon: Wifi },
  { name: "Utilities", desc: "Electricity, water", icon: Zap },
  { name: "Safety", desc: "Security issues", icon: Shield },
  { name: "Sanitation", desc: "Waste management", icon: Trash2 },
  { name: "Other", desc: "General complaints", icon: HelpCircle },
];

const priorities = ["Low", "Medium", "High"];

export default function Home() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("Main Building");
  const [priority, setPriority] = useState("Medium");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Success state
  const [submitted, setSubmitted] = useState(false);
  const [complaintId, setComplaintId] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [copied, setCopied] = useState<"id"|"phrase"|null>(null);

  const handleCopy = (text: string, type: "id"|"phrase") => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const submitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !category) {
      alert("Please fill all fields and select a category");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("location", location);
      formData.append("priority", priority);
      if (file) formData.append("attachment", file);

      const res = await fetch(`${API_BASE}/api/complaints`, { method: "POST", body: formData });
      const data = await res.json();
      if (!data.id) { alert("Submission failed"); return; }

      setComplaintId(String(data.id));
      setPassphrase(data.passphrase);
      setSubmitted(true);
    } catch {
      alert("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Complaint Submitted!</h2>
          <p className="text-gray-500 mb-6">Save your Complaint ID and Secret Passphrase — you'll need them to track your complaint and see admin replies.</p>

          <div className="space-y-3 mb-6">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex justify-between items-center">
              <div className="text-left">
                <p className="text-xs text-gray-500 mb-1">Complaint ID</p>
                <p className="font-mono font-bold text-lg">{complaintId}</p>
              </div>
              <button onClick={() => handleCopy(complaintId, "id")}
                className="flex items-center gap-1 text-sm px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors">
                {copied === "id" ? <><Check size={14}/> Copied!</> : <><Copy size={14}/> Copy</>}
              </button>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl p-4 flex justify-between items-center">
              <div className="text-left">
                <p className="text-xs text-amber-600 mb-1">Secret Passphrase</p>
                <p className="font-mono font-bold text-lg text-amber-700">{passphrase}</p>
              </div>
              <button onClick={() => handleCopy(passphrase, "phrase")}
                className="flex items-center gap-1 text-sm px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition-colors">
                {copied === "phrase" ? <><Check size={14}/> Copied!</> : <><Copy size={14}/> Copy</>}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-6">⚠️ This passphrase is shown only once. Copy and save it somewhere safe!</p>

          <div className="flex gap-3">
            <button onClick={() => navigate(`/track?phrase=${passphrase}`)}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-semibold transition-colors">
              Track Complaint
            </button>
            <button onClick={() => { setSubmitted(false); setTitle(""); setDescription(""); setCategory(""); setFile(null); }}
              className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 py-3 rounded-xl font-semibold transition-colors">
              New Complaint
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="text-center mt-10 px-6">
        <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-100">
          Report Campus Issues <span className="text-emerald-500">Anonymously</span>
        </h2>
        <p className="text-gray-500 mt-4 max-w-xl mx-auto">
          Help improve our campus by reporting issues. No account needed — track with a secret passphrase.
        </p>
      </div>

      <div className="max-w-xl mx-auto mt-10 bg-white dark:bg-gray-900 rounded-xl shadow p-6 mb-10">
        <h3 className="text-xl font-semibold mb-1">Submit a New Issue</h3>
        <p className="text-gray-500 text-sm mb-6">All submissions are anonymous.</p>

        <p className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Category <span className="text-red-500">*</span></p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button key={cat.name} type="button" onClick={() => setCategory(cat.name)}
                className={`border rounded-xl p-3 text-left flex gap-3 items-start transition-colors ${
                  category === cat.name ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30" : "border-gray-200 dark:border-gray-700 hover:border-emerald-300"
                }`}>
                <Icon size={20} className={category === cat.name ? "text-emerald-600 mt-0.5" : "text-gray-400 mt-0.5"} />
                <div>
                  <div className="font-semibold text-sm">{cat.name}</div>
                  <div className="text-xs text-gray-500">{cat.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        <form onSubmit={submitIssue} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Location</label>
              <select value={location} onChange={(e) => setLocation(e.target.value)}
                className="w-full border rounded-lg p-3 dark:bg-gray-800 dark:border-gray-700 text-sm">
                {["Main Building","Library","Science Block","Cafeteria","Sports Complex","Dormitory","Parking Area","Outdoor/Campus Grounds","Other"].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full border rounded-lg p-3 dark:bg-gray-800 dark:border-gray-700 text-sm">
                {priorities.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <input placeholder="Brief summary of the issue *" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-lg p-3 dark:bg-gray-800 dark:border-gray-700" />

          <textarea placeholder="Provide as much detail as possible..." value={description}
            onChange={(e) => setDescription(e.target.value)} rows={4}
            className="w-full border rounded-lg p-3 dark:bg-gray-800 dark:border-gray-700" />

          {/* File upload */}
          <div>
            <label className="text-sm font-medium mb-1 block">Attachment (optional)</label>
            {file ? (
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                <span className="text-sm flex-1 truncate">{file.name}</span>
                <button type="button" onClick={() => setFile(null)} className="text-gray-400 hover:text-red-500"><X size={16}/></button>
              </div>
            ) : (
              <label className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-emerald-400 transition-colors text-gray-500">
                <Upload size={18} />
                <span className="text-sm">Click to upload image or PDF (max 5MB)</span>
                <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </div>

          <button type="submit" disabled={submitting}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-colors">
            {submitting ? "Submitting..." : "Submit Issue Report"}
          </button>
        </form>

        <div className="mt-4 flex justify-center">
          <button onClick={() => navigate("/track")}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition">
            🔍 Track Existing Complaint
          </button>
        </div>
      </div>
    </div>
  );
}
