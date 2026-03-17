import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { adminFetch } from "../lib/api";
import { TrendingUp, AlertTriangle, MapPin, Tag } from "lucide-react";

type AnalyticsData = {
  total: number;
  byStatus: { status: string; count: number }[];
  byCategory: { category: string; count: number }[];
  byLocation: { location: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  byMonth: { month: string; count: number }[];
};

const PIE_COLORS = ["#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#14b8a6"];
const STATUS_COLORS: Record<string,string> = { Submitted: "#f59e0b", "in-progress": "#3b82f6", resolved: "#10b981" };
const STATUS_LABELS: Record<string,string> = { Submitted: "Submitted", "in-progress": "In Progress", resolved: "Resolved" };
const PRIORITY_COLORS: Record<string,string> = { Low: "#9ca3af", Medium: "#f59e0b", High: "#ef4444" };

export default function Analytics() {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) { navigate("/admin-login"); return; }
    adminFetch("/api/analytics")
      .then(r => { if (r.status === 401 || r.status === 403) { navigate("/admin-login"); return r; } return r; })
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Loading analytics...</p>
    </div>
  );

  if (!data) return null;

  const statusData = data.byStatus.map(s => ({ ...s, name: STATUS_LABELS[s.status] ?? s.status }));
  const monthData = [...data.byMonth].reverse();

  const resolvedRate = data.total > 0
    ? Math.round(((data.byStatus.find(s => s.status === "resolved")?.count ?? 0) / data.total) * 100)
    : 0;

  const highPriority = data.byPriority.find(p => p.priority === "High")?.count ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Campus complaint trends and insights</p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Complaints", value: data.total, icon: Tag, color: "text-gray-700 dark:text-gray-200" },
            { label: "Resolution Rate", value: `${resolvedRate}%`, icon: TrendingUp, color: "text-emerald-600" },
            { label: "High Priority", value: highPriority, icon: AlertTriangle, color: "text-red-500" },
            { label: "Locations Affected", value: data.byLocation.length, icon: MapPin, color: "text-blue-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className={color}/>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Complaints over time */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4">Complaints Over Time</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }}/>
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }}/>
                  <Tooltip/>
                  <Bar dataKey="count" fill="#10b981" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status distribution */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4">Status Distribution</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} dataKey="count" nameKey="name" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                    {statusData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.status] ?? PIE_COLORS[i]}/>)}
                  </Pie>
                  <Tooltip/>
                  <Legend/>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* By Category */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4">Complaints by Category</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }}/>
                  <YAxis type="category" dataKey="category" width={90} tick={{ fontSize: 11 }}/>
                  <Tooltip/>
                  <Bar dataKey="count" radius={[0,4,4,0]}>
                    {data.byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* By Location */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4">Complaints by Location</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byLocation} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }}/>
                  <YAxis type="category" dataKey="location" width={110} tick={{ fontSize: 11 }}/>
                  <Tooltip/>
                  <Bar dataKey="count" radius={[0,4,4,0]}>
                    {data.byLocation.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Priority breakdown */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">Priority Breakdown</h2>
            <div className="flex gap-4 flex-wrap">
              {data.byPriority.map((p) => (
                <div key={p.priority} className="flex-1 min-w-24 p-4 rounded-xl border text-center"
                  style={{ borderColor: PRIORITY_COLORS[p.priority] }}>
                  <p className="text-2xl font-bold" style={{ color: PRIORITY_COLORS[p.priority] }}>{p.count}</p>
                  <p className="text-sm text-gray-500">{p.priority} Priority</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
