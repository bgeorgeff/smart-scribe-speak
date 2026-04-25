import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAIL = "bgeorgeff@protonmail.com";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
}

interface SearchLog {
  id: string;
  user_id: string;
  user_email: string;
  topic: string;
  grade_level: string;
  created_at: string;
}

interface SavedItem {
  id: string;
  user_id: string;
  user_email: string;
  topic: string;
  grade_level: string;
  created_at: string;
  updated_at: string;
}

type Tab = "users" | "searches" | "saved";

function fmt(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("users");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchLogs, setSearchLogs] = useState<SearchLog[]>([]);
  const [savedContent, setSavedContent] = useState<SavedItem[]>([]);

  const [userFilter, setUserFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [savedFilter, setSavedFilter] = useState("");

  // Check auth
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        setAccessDenied(true);
        return;
      }
      const email = session.user.email ?? "";
      if (email !== ADMIN_EMAIL) {
        setLoading(false);
        setAccessDenied(true);
        return;
      }
      setCurrentUser({ email });
      setLoading(false);
    }
    checkAuth();
  }, []);

  // Fetch data once we know the user is the admin
  useEffect(() => {
    if (!currentUser) return;
    fetchAdminData();
  }, [currentUser]);

  async function fetchAdminData() {
    setDataLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/get-admin-data`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: SUPABASE_ANON_KEY,
          },
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      setUsers(data.users ?? []);
      setSearchLogs(data.searchLogs ?? []);
      setSavedContent(data.savedContent ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setDataLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf8f0]">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf8f0]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-500">This page is only accessible to the site administrator.</p>
          <a href="/" className="mt-4 inline-block text-blue-600 underline">Go back home</a>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u =>
    (u.email ?? "").toLowerCase().includes(userFilter.toLowerCase())
  );
  const filteredSearches = searchLogs.filter(s =>
    s.topic.toLowerCase().includes(searchFilter.toLowerCase()) ||
    s.user_email.toLowerCase().includes(searchFilter.toLowerCase())
  );
  const filteredSaved = savedContent.filter(s =>
    s.topic.toLowerCase().includes(savedFilter.toLowerCase()) ||
    s.user_email.toLowerCase().includes(savedFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#fdf8f0] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">LearnAnything · learnanything.us</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAdminData}
              disabled={dataLoading}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
            >
              {dataLoading ? "Refreshing…" : "↻ Refresh"}
            </button>
            <a
              href="/"
              className="px-4 py-2 bg-[#4a7c59] text-white rounded-lg text-sm hover:bg-[#3d6649] transition"
            >
              ← Back to App
            </a>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Total Users" value={users.length} color="bg-blue-50 border-blue-200" textColor="text-blue-700" />
          <StatCard label="Total Searches" value={searchLogs.length} color="bg-green-50 border-green-200" textColor="text-green-700" />
          <StatCard label="Saved Passages" value={savedContent.length} color="bg-purple-50 border-purple-200" textColor="text-purple-700" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-white border border-gray-200 rounded-xl p-1 w-fit">
          {(["users", "searches", "saved"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                tab === t
                  ? "bg-[#4a7c59] text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t === "users" ? `Users (${users.length})` : t === "searches" ? `Searches (${searchLogs.length})` : `Saved (${savedContent.length})`}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {dataLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            Loading data…
          </div>
        ) : (
          <>
            {tab === "users" && (
              <TablePanel
                filter={userFilter}
                onFilter={setUserFilter}
                placeholder="Filter by email…"
                emptyMessage="No users found."
                count={filteredUsers.length}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-3 pr-4 font-medium">Email</th>
                      <th className="pb-3 pr-4 font-medium">Signed Up</th>
                      <th className="pb-3 pr-4 font-medium">Last Sign In</th>
                      <th className="pb-3 font-medium">Confirmed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                        <td className="py-3 pr-4 font-mono text-gray-800">{u.email}</td>
                        <td className="py-3 pr-4 text-gray-600">{fmt(u.created_at)}</td>
                        <td className="py-3 pr-4 text-gray-600">{fmt(u.last_sign_in_at)}</td>
                        <td className="py-3 text-gray-600">{u.email_confirmed_at ? "✓" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TablePanel>
            )}

            {tab === "searches" && (
              <TablePanel
                filter={searchFilter}
                onFilter={setSearchFilter}
                placeholder="Filter by topic or email…"
                emptyMessage="No searches logged yet."
                count={filteredSearches.length}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-3 pr-4 font-medium">User</th>
                      <th className="pb-3 pr-4 font-medium">Topic</th>
                      <th className="pb-3 pr-4 font-medium">Grade</th>
                      <th className="pb-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSearches.map(s => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                        <td className="py-3 pr-4 text-gray-600 font-mono text-xs">{s.user_email}</td>
                        <td className="py-3 pr-4 text-gray-800 font-medium">{s.topic}</td>
                        <td className="py-3 pr-4 text-gray-600">Grade {s.grade_level}</td>
                        <td className="py-3 text-gray-500 text-xs">{fmt(s.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TablePanel>
            )}

            {tab === "saved" && (
              <TablePanel
                filter={savedFilter}
                onFilter={setSavedFilter}
                placeholder="Filter by topic or email…"
                emptyMessage="No saved passages yet."
                count={filteredSaved.length}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-3 pr-4 font-medium">User</th>
                      <th className="pb-3 pr-4 font-medium">Topic</th>
                      <th className="pb-3 pr-4 font-medium">Grade</th>
                      <th className="pb-3 font-medium">Saved On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSaved.map(s => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                        <td className="py-3 pr-4 text-gray-600 font-mono text-xs">{s.user_email}</td>
                        <td className="py-3 pr-4 text-gray-800 font-medium">{s.topic}</td>
                        <td className="py-3 pr-4 text-gray-600">Grade {s.grade_level}</td>
                        <td className="py-3 text-gray-500 text-xs">{fmt(s.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TablePanel>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, textColor }: { label: string; value: number; color: string; textColor: string }) {
  return (
    <div className={`${color} border rounded-xl p-5`}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}

function TablePanel({
  filter,
  onFilter,
  placeholder,
  emptyMessage,
  count,
  children,
}: {
  filter: string;
  onFilter: (v: string) => void;
  placeholder: string;
  emptyMessage: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center gap-3">
        <input
          type="text"
          value={filter}
          onChange={e => onFilter(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a7c59]/30"
        />
        <span className="text-sm text-gray-400">{count} result{count !== 1 ? "s" : ""}</span>
      </div>
      <div className="overflow-x-auto">
        {count === 0 ? (
          <p className="p-8 text-center text-gray-400 text-sm">{emptyMessage}</p>
        ) : (
          <div className="p-4">{children}</div>
        )}
      </div>
    </div>
  );
}
