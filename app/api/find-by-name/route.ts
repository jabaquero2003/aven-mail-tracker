import { NextRequest, NextResponse } from "next/server";
import { generateEmailCombinations, guessCompanyDomain } from "@/lib/emailPatterns";
import { validateEmail } from "@/lib/emailValidator";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export interface FindByNameInput {
  firstName: string;
  lastName: string;
  company: string;
  domain?: string;
}

export interface FindByNameResult {
  firstName: string;
  lastName: string;
  company: string;
  email: string | null;
  confidence: number;
  allTried: number;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  if (!rateLimit(ip, 10, 60_000)) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  let body: { contacts?: FindByNameInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const contacts = body.contacts ?? [];
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json({ error: "contacts array is required" }, { status: 400 });
  }
  if (contacts.length > 50) {
    return NextResponse.json({ error: "Maximum 50 contacts per request" }, { status: 400 });
  }

  const results: FindByNameResult[] = [];

  for (const contact of contacts) {
    const { firstName, lastName, company, domain: manualDomain } = contact;
    if (!firstName || !lastName || !company) {
      results.push({ firstName, lastName, company, email: null, confidence: 0, allTried: 0 });
      continue;
    }

    const domain = manualDomain || (await guessCompanyDomain(company));
    if (!domain) {
      results.push({ firstName, lastName, company, email: null, confidence: 0, allTried: 0 });
      continue;
    }

    const combos = generateEmailCombinations(firstName, lastName, domain);
    let bestEmail: string | null = null;
    let bestConfidence = 0;

    for (const email of combos) {
      const result = await validateEmail(email);
      if (result.status === "valid" && result.confidence > bestConfidence) {
        bestEmail = email;
        bestConfidence = result.confidence;
        break;
      }
      if (result.status === "risky" && bestConfidence < 55) {
        bestEmail = email;
        bestConfidence = result.confidence;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    results.push({
      firstName,
      lastName,
      company,
      email: bestEmail,
      confidence: bestConfidence,
      allTried: combos.length,
    });
  }

  return NextResponse.json({ results });
}
