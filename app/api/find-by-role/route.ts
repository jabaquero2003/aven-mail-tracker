import { NextRequest, NextResponse } from "next/server";
import { guessCompanyDomain } from "@/lib/emailPatterns";
import { validateEmail } from "@/lib/emailValidator";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const DEPARTMENT_PATTERNS: Record<string, string[]> = {
  HR: ["hr", "humanresources", "human-resources", "recruiting", "talent", "people", "careers", "jobs"],
  Finance: ["finance", "accounting", "cfo", "treasury", "billing", "accounts", "payments"],
  IT: ["it", "tech", "engineering", "cto", "helpdesk", "support", "devops", "infrastructure"],
  Marketing: ["marketing", "brand", "comms", "communications", "media", "press", "pr", "growth"],
  Sales: ["sales", "bizdev", "biz-dev", "business", "partnerships", "revenue", "deals"],
  Recruiting: ["recruiting", "talent", "hr", "careers", "jobs", "hiring", "recruitment"],
  Legal: ["legal", "compliance", "privacy", "contracts", "counsel", "law"],
  Operations: ["ops", "operations", "admin", "office", "facilities"],
  Executive: ["ceo", "coo", "president", "executive", "leadership", "management", "info", "contact", "hello"],
  Support: ["support", "help", "customer", "service", "cs", "care", "success"],
};

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  if (!rateLimit(ip, 10, 60_000)) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  let body: { company?: string; department?: string; domain?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { company, department, domain: manualDomain } = body;
  if (!company || !department) {
    return NextResponse.json({ error: "company and department are required" }, { status: 400 });
  }

  const domain = manualDomain || (await guessCompanyDomain(company));
  if (!domain) {
    return NextResponse.json({ error: "Could not resolve company domain" }, { status: 400 });
  }

  const deptKey = Object.keys(DEPARTMENT_PATTERNS).find(
    (k) => k.toLowerCase() === department.toLowerCase()
  ) ?? "HR";

  const prefixes = DEPARTMENT_PATTERNS[deptKey];
  const candidates = prefixes.map((p) => `${p}@${domain}`);

  // Validate all candidates in parallel batches of 4
  const results = [];
  const batchSize = 4;

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (email) => {
        const validation = await validateEmail(email);
        return { ...validation, email };
      })
    );
    results.push(...batchResults);
  }

  const found = results
    .filter((r) => r.status === "valid" || r.status === "risky")
    .sort((a, b) => b.confidence - a.confidence);

  const notFound = results
    .filter((r) => r.status === "invalid")
    .map((r) => r.email);

  return NextResponse.json({
    domain,
    department: deptKey,
    company,
    found,
    notFound,
    total: candidates.length,
  });
}
