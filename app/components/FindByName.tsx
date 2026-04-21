"use client";

import { useState } from "react";
import FileUpload from "./FileUpload";
import ProgressBar from "./ProgressBar";
import ConfidenceBadge from "./ConfidenceBadge";
import ExportButton from "./ExportButton";

interface Contact {
  firstName: string;
  lastName: string;
  company: string;
  domain?: string;
}

interface Result {
  firstName: string;
  lastName: string;
  company: string;
  email: string | null;
  confidence: number;
  allTried: number;
}

const TEMPLATE_TEXT = `firstName,lastName,company
John,Smith,Google
Jane,Doe,Microsoft
Carlos,Lopez,Stripe`;

export default function FindByName() {
  const [textInput, setTextInput] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "file">("text");

  const parseText = (raw: string): Contact[] => {
    const lines = raw.trim().split("\n").filter(Boolean);
    return lines
      .map((line) => {
        const parts = line.split(/[,|\t]/).map((p) => p.trim());
        if (parts.length >= 3) {
          return { firstName: parts[0], lastName: parts[1], company: parts[2], domain: parts[3] };
        }
        return null;
      })
      .filter(Boolean) as Contact[];
  };

  const handleFileData = (rows: Record<string, string>[]) => {
    const parsed = rows.map((r) => ({
      firstName: r.firstName || r["First Name"] || r.first_name || "",
      lastName: r.lastName || r["Last Name"] || r.last_name || "",
      company: r.company || r.Company || r["Company Name"] || "",
      domain: r.domain || r.Domain || "",
    })).filter((c) => c.firstName && c.lastName && c.company);
    setContacts(parsed);
  };

  const handleSubmit = async () => {
    setError("");
    const list = inputMode === "text" ? parseText(textInput) : contacts;
    if (!list.length) {
      setError("No contacts found. Check your format.");
      return;
    }

    setLoading(true);
    setResults([]);
    setProgress(5);

    const batchSize = 5;
    const all: Result[] = [];

    for (let i = 0; i < list.length; i += batchSize) {
      const batch = list.slice(i, i + batchSize);
      try {
        const res = await fetch("/api/find-by-name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contacts: batch }),
        });
        const data = await res.json();
        if (data.results) all.push(...data.results);
      } catch {
        setError("Request failed. Check your connection.");
      }
      setProgress(Math.round(((i + batchSize) / list.length) * 100));
    }

    setResults(all);
    setProgress(100);
    setLoading(false);
  };

  const exportData = results.map((r) => ({
    "First Name": r.firstName,
    "Last Name": r.lastName,
    Company: r.company,
    Email: r.email ?? "Not found",
    "Confidence %": r.confidence,
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setInputMode("text")}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${inputMode === "text" ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
          >
            Paste Text
          </button>
          <button
            onClick={() => setInputMode("file")}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${inputMode === "file" ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
          >
            Upload File
          </button>
        </div>

        {inputMode === "text" ? (
          <div>
            <p className="text-xs text-gray-500 mb-2">Format: <code className="bg-gray-100 px-1 rounded">First Name, Last Name, Company</code> — one per line</p>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={TEMPLATE_TEXT}
              rows={6}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
            />
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-500 mb-2">Columns needed: <code className="bg-gray-100 px-1 rounded">firstName, lastName, company</code> (and optional <code className="bg-gray-100 px-1 rounded">domain</code>)</p>
            <FileUpload onData={handleFileData} />
            {contacts.length > 0 && (
              <p className="text-sm text-gray-600 mt-2">{contacts.length} contacts loaded</p>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-black text-white py-2.5 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Finding emails…" : "Find Emails"}
      </button>

      {loading && <ProgressBar progress={progress} label="Validating email combinations…" />}

      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Results ({results.length})</h3>
            <ExportButton data={exportData} filename="aven-find-by-name" />
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.firstName} {r.lastName}</td>
                    <td className="px-4 py-3 text-gray-600">{r.company}</td>
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
