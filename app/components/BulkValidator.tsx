"use client";

import { useState } from "react";
import FileUpload from "./FileUpload";
import ProgressBar from "./ProgressBar";
import ConfidenceBadge from "./ConfidenceBadge";
import ExportButton from "./ExportButton";

interface ValidationResult {
  email: string;
  syntax: boolean;
  mxValid: boolean;
  smtpValid: boolean | null;
  confidence: number;
  status: "valid" | "invalid" | "risky" | "unknown";
}

export default function BulkValidator() {
  const [textInput, setTextInput] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "file">("text");
  const [fileEmails, setFileEmails] = useState<string[]>([]);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const handleFileData = (rows: Record<string, string>[]) => {
    const emails = rows
      .map((r) => r.email || r.Email || r.EMAIL || Object.values(r)[0] || "")
      .filter(Boolean);
    setFileEmails(emails);
  };

  const handleSubmit = async () => {
    setError("");
    const rawEmails =
      inputMode === "text"
        ? textInput.split(/[\n,;]+/).map((e) => e.trim()).filter(Boolean)
        : fileEmails;

    if (!rawEmails.length) {
      setError("No emails found. Paste emails or upload a file.");
      return;
    }
    if (rawEmails.length > 100) {
      setError("Maximum 100 emails per batch.");
      return;
    }

    setLoading(true);
    setResults([]);
    setProgress(5);

    const batchSize = 10;
    const all: ValidationResult[] = [];

    for (let i = 0; i < rawEmails.length; i += batchSize) {
      const batch = rawEmails.slice(i, i + batchSize);
      try {
        const res = await fetch("/api/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: batch }),
        });
        const data = await res.json();
        if (data.results) all.push(...data.results);
      } catch {
        setError("Request failed.");
      }
      setProgress(Math.round(((i + batchSize) / rawEmails.length) * 100));
    }

    setResults(all);
    setProgress(100);
    setLoading(false);
  };

  const summary = {
    total: results.length,
    valid: results.filter((r) => r.status === "valid").length,
    risky: results.filter((r) => r.status === "risky").length,
    invalid: results.filter((r) => r.status === "invalid").length,
  };

  const exportData = results.map((r) => ({
    Email: r.email,
    Status: r.status,
    Syntax: r.syntax ? "✓" : "✗",
    "MX Valid": r.mxValid ? "✓" : "✗",
    "SMTP Valid": r.smtpValid === null ? "Unknown" : r.smtpValid ? "✓" : "✗",
    "Confidence %": r.confidence,
  }));

  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-1">
        <button
          onClick={() => setInputMode("text")}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${inputMode === "text" ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
        >
          Paste Emails
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
          <p className="text-xs text-gray-500 mb-2">One email per line, or comma-separated. Max 100.</p>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={"john@example.com\njane@company.io\nuser@domain.net"}
            rows={6}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
          />
        </div>
      ) : (
        <div>
          <p className="text-xs text-gray-500 mb-2">File should have an <code className="bg-gray-100 px-1 rounded">email</code> column.</p>
          <FileUpload onData={handleFileData} />
          {fileEmails.length > 0 && (
            <p className="text-sm text-gray-600 mt-2">{fileEmails.length} emails loaded</p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-black text-white py-2.5 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Validating…" : "Validate Emails"}
      </button>

      {loading && <ProgressBar progress={progress} label="Running syntax + DNS + SMTP checks…" />}

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Valid", count: summary.valid, color: "text-green-700 bg-green-50 border-green-100" },
              { label: "Risky", count: summary.risky, color: "text-yellow-700 bg-yellow-50 border-yellow-100" },
              { label: "Invalid", count: summary.invalid, color: "text-red-700 bg-red-50 border-red-100" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}>
                <p className="text-2xl font-bold">{s.count}</p>
                <p className="text-xs font-medium mt-0.5">{s.label}</p>
                <p className="text-xs opacity-60">{summary.total ? Math.round((s.count / summary.total) * 100) : 0}%</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Results ({summary.total})</h3>
            <ExportButton data={exportData} filename="aven-bulk-validation" />
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Syntax</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">MX</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">SMTP</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-gray-800">{r.email}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={r.syntax ? "text-green-600" : "text-red-500"}>
                        {r.syntax ? "✓" : "✗"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={r.mxValid ? "text-green-600" : "text-red-500"}>
                        {r.mxValid ? "✓" : "✗"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={r.smtpValid === true ? "text-green-600" : r.smtpValid === false ? "text-red-500" : "text-gray-400"}>
                        {r.smtpValid === true ? "✓" : r.smtpValid === false ? "✗" : "~"}
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
        </div>
      )}
    </div>
  );
}
