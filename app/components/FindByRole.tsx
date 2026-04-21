"use client";

import { useState } from "react";
import ProgressBar from "./ProgressBar";
import ConfidenceBadge from "./ConfidenceBadge";
import ExportButton from "./ExportButton";

const DEPARTMENTS = ["HR", "Finance", "IT", "Marketing", "Sales", "Recruiting"];

interface Result {
  name: string;
  role: string;
  department: string;
  email: string | null;
  confidence: number;
  company: string;
}

export default function FindByRole() {
  const [company, setCompany] = useState("");
  const [department, setDepartment] = useState("HR");
  const [domain, setDomain] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [foundDomain, setFoundDomain] = useState("");

  const handleSubmit = async () => {
    if (!company.trim()) {
      setError("Company name is required.");
      return;
    }
    setError("");
    setLoading(true);
    setProgress(20);
    setResults([]);

    try {
      const res = await fetch("/api/find-by-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: company.trim(), department, domain: domain.trim() || undefined }),
      });
      setProgress(80);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Request failed.");
      } else {
        setResults(data.results ?? []);
        setFoundDomain(data.domain ?? "");
      }
    } catch {
      setError("Request failed. Check your connection.");
    }

    setProgress(100);
    setLoading(false);
  };

  const exportData = results.map((r) => ({
    Name: r.name,
    Role: r.role,
    Department: r.department,
    Email: r.email ?? "Not found",
    "Confidence %": r.confidence,
    Company: r.company,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Company Name</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Stripe"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Department</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Domain Override <span className="text-gray-400 font-normal normal-case">(optional — leave blank to auto-detect)</span>
        </label>
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="e.g. stripe.com"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
        />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-black text-white py-2.5 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Searching…" : "Find Contacts"}
      </button>

      {loading && <ProgressBar progress={progress} label="Searching and validating contacts…" />}

      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{department} contacts at {company}</h3>
              {foundDomain && <p className="text-xs text-gray-400">Domain: {foundDomain}</p>}
            </div>
            <ExportButton data={exportData} filename="aven-find-by-role" />
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.role}</td>
                    <td className="px-4 py-3 font-mono text-gray-800">
                      {r.email ? (
                        <span className="text-green-700">{r.email}</span>
                      ) : (
                        <span className="text-gray-400 italic">Not found</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.email ? <ConfidenceBadge score={r.confidence} /> : <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
