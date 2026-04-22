"use client";

import { useState } from "react";
import ProgressBar from "./ProgressBar";
import ConfidenceBadge from "./ConfidenceBadge";
import ExportButton from "./ExportButton";

const DEPARTMENTS = ["HR", "Finance", "IT", "Marketing", "Sales", "Recruiting", "Legal", "Operations", "Executive", "Support"];

interface FoundEmail {
  email: string;
  confidence: number;
  status: string;
}

interface RoleResult {
  domain: string;
  department: string;
  company: string;
  found: FoundEmail[];
  notFound: string[];
  total: number;
}

export default function FindByRole() {
  const [company, setCompany] = useState("");
  const [department, setDepartment] = useState("HR");
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<RoleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!company.trim()) {
      setError("Company name is required.");
      return;
    }
    setError("");
    setLoading(true);
    setProgress(20);
    setResult(null);

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
        setResult(data);
      }
    } catch {
      setError("Request failed. Check your connection.");
    }

    setProgress(100);
    setLoading(false);
  };

  const exportData = result?.found.map((r) => ({
    Email: r.email,
    Department: result.department,
    Company: result.company,
    Domain: result.domain,
    Status: r.status,
    "Confidence %": r.confidence,
  })) ?? [];

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-500 leading-relaxed">
        <strong className="text-gray-700">How it works:</strong> Aven finds the real department inbox for a company
        (e.g. <code className="bg-white px-1 rounded border border-gray-200">hr@company.com</code>,{" "}
        <code className="bg-white px-1 rounded border border-gray-200">recruiting@company.com</code>).
        These are verified real addresses — great for reaching teams directly.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Company Name</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
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
          Domain <span className="text-gray-400 font-normal normal-case">(optional — auto-detected via Clearbit)</span>
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
        {loading ? "Searching…" : "Find Department Emails"}
      </button>

      {loading && <ProgressBar progress={progress} label="Detecting domain and verifying department emails…" />}

      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {result.department} @ {result.company}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Domain detected: <span className="text-blue-600 font-mono">{result.domain}</span>
                {" · "}{result.found.length} email{result.found.length !== 1 ? "s" : ""} found out of {result.total} checked
              </p>
            </div>
            <ExportButton data={exportData} filename="aven-find-by-role" disabled={exportData.length === 0} />
          </div>

          {result.found.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {result.found.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-mono text-green-700">{r.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          Department inbox
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ConfidenceBadge score={r.confidence} status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
              No department emails found for <strong>{result.department}</strong> at <strong>{result.company}</strong>.
              <br />
              <span className="text-xs mt-1 block">Try a different department or override the domain manually.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
