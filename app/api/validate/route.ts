import { NextRequest, NextResponse } from "next/server";
import { validateEmail } from "@/lib/emailValidator";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  if (!rateLimit(ip, 20, 60_000)) {
    return NextResponse.json({ error: "Rate limit exceeded. Please wait a minute." }, { status: 429 });
  }

  let body: { emails?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const emails: string[] = body.emails ?? [];
  if (!Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json({ error: "emails array is required" }, { status: 400 });
  }
  if (emails.length > 100) {
    return NextResponse.json({ error: "Maximum 100 emails per request" }, { status: 400 });
  }

  const results = [];
  for (const email of emails) {
    const result = await validateEmail(email);
    results.push(result);
    await new Promise((r) => setTimeout(r, 1100));
  }

  return NextResponse.json({ results });
}
