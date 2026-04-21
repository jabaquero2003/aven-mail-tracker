"use client";

import { useState } from "react";
import Image from "next/image";
import FindByName from "./components/FindByName";
import FindByRole from "./components/FindByRole";
import BulkValidator from "./components/BulkValidator";

const TABS = [
  {
    id: "find-by-name",
    label: "Find by Name",
    description: "Find emails from a name + company list",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: "find-by-role",
    label: "Find by Role",
    description: "Find contacts by company + department",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    id: "bulk-validator",
    label: "Bulk Validator",
    description: "Validate a list of emails instantly",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("find-by-name");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Aven Mail Tracker" width={32} height={32} className="rounded-md" />
            <div>
              <span className="font-semibold text-gray-900 text-sm">Aven Mail Tracker</span>
              <span className="hidden sm:inline text-gray-400 text-xs ml-2">Find. Validate. Connect.</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
            <span className="text-xs text-gray-500">Live</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Email Intelligence</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Find, validate, and connect — powered by real-time DNS and SMTP verification.</p>
        </div>
      </div>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Tab nav */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100">
            <nav className="flex">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 px-4 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? "border-black text-black bg-gray-50/50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/30"
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden text-xs">{tab.label.split(" ")[0]}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab header */}
          <div className="px-6 pt-5 pb-4 border-b border-gray-50">
            {TABS.filter((t) => t.id === activeTab).map((tab) => (
              <div key={tab.id} className="flex items-center gap-2">
                <div className="p-1.5 bg-black rounded-lg text-white">{tab.icon}</div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{tab.label}</h2>
                  <p className="text-xs text-gray-500">{tab.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tab content — all tabs stay mounted to preserve state */}
          <div className="p-6">
            <div className={activeTab === "find-by-name" ? "" : "hidden"}><FindByName /></div>
            <div className={activeTab === "find-by-role" ? "" : "hidden"}><FindByRole /></div>
            <div className={activeTab === "bulk-validator" ? "" : "hidden"}><BulkValidator /></div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Aven Mail Tracker uses DNS/MX and SMTP handshake verification. No emails are stored. Results are indicative only.
        </p>
      </main>
    </div>
  );
}
