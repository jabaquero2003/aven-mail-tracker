import { NextRequest, NextResponse } from "next/server";
import { guessCompanyDomain } from "@/lib/emailPatterns";
import { validateEmail } from "@/lib/emailValidator";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const ROLE_PATTERNS: Record<string, { titles: string[]; names: string[][] }> = {
  HR: {
    titles: ["HR Manager", "HR Director", "People Operations", "Talent Acquisition", "Human Resources"],
    names: [["sarah", "johnson"], ["jennifer", "smith"], ["michael", "brown"], ["lisa", "davis"], ["emily", "wilson"]],
  },
  Finance: {
    titles: ["CFO", "Finance Manager", "Controller", "Finance Director", "Accounting Manager"],
    names: [["david", "miller"], ["robert", "taylor"], ["james", "anderson"], ["patricia", "thomas"], ["linda", "jackson"]],
  },
  IT: {
    titles: ["CTO", "IT Manager", "VP Engineering", "Head of Technology", "IT Director"],
    names: [["john", "martin"], ["christopher", "garcia"], ["matthew", "martinez"], ["andrew", "robinson"], ["daniel", "clark"]],
  },
  Marketing: {
    titles: ["CMO", "Marketing Manager", "VP Marketing", "Head of Marketing", "Digital Marketing Manager"],
    names: [["jessica", "rodriguez"], ["ashley", "lewis"], ["megan", "lee"], ["stephanie", "walker"], ["nicole", "hall"]],
  },
  Sales: {
    titles: ["VP Sales", "Sales Director", "Head of Sales", "Account Executive", "Sales Manager"],
    names: [["william", "allen"], ["richard", "young"], ["joseph", "hernandez"], ["charles", "king"], ["thomas", "wright"]],
  },
  Recruiting: {
    titles: ["Head of Recruiting", "Talent Acquisition Manager", "Recruiter", "Technical Recruiter", "Recruiting Director"],
    names: [["amanda", "scott"], ["heather", "green"], ["kimberly", "adams"], ["tamara", "baker"], ["rachel", "gonzalez"]],
  },
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

  const deptKey = Object.keys(ROLE_PATTERNS).find(
    (k) => k.toLowerCase() === department.toLowerCase()
  ) || "HR";
  const pattern = ROLE_PATTERNS[deptKey];

  const results = [];

  for (let i = 0; i < pattern.names.length; i++) {
    const [first, last] = pattern.names[i];
    const title = pattern.titles[i % pattern.titles.length];

    const emailCandidates = [
      `${first}.${last}@${domain}`,
      `${first[0]}${last}@${domain}`,
      `${first}@${domain}`,
    ];

    let validEmail: string | null = null;
    let confidence = 0;

    for (const email of emailCandidates) {
      const r = await validateEmail(email);
      if (r.status === "valid" || r.status === "risky") {
        validEmail = email;
        confidence = r.confidence;
        break;
      }
      await new Promise((res) => setTimeout(res, 150));
    }

    results.push({
      name: `${first.charAt(0).toUpperCase() + first.slice(1)} ${last.charAt(0).toUpperCase() + last.slice(1)}`,
      role: title,
      department: deptKey,
      email: validEmail,
      confidence,
      company,
    });
  }

  return NextResponse.json({ results, domain });
}
