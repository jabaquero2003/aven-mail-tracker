export interface ValidationResult {
  email: string;
  syntax: boolean;
  mxValid: boolean;
  smtpValid: boolean | null;
  confidence: number;
  status: "valid" | "invalid" | "risky" | "unknown";
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export function checkSyntax(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

interface ReoonResponse {
  email: string;
  status: string;
  is_valid_syntax: boolean;
  mx_accepts_mail: boolean;
  is_catch_all: boolean;
  is_deliverable: boolean;
  is_safe_to_send: boolean;
  can_connect_smtp: boolean;
  is_disposable: boolean;
  overall_score: number;
}

interface MailCheckResponse {
  status: number;
  mx: boolean;
  disposable: boolean;
  relay_domain: boolean;
  public_domain: boolean;
  spam: boolean;
}

interface DisifyResponse {
  format: boolean;
  dns: boolean;
  disposable: boolean;
  whitelist: boolean;
}

async function verifyWithReoon(email: string): Promise<ReoonResponse | null> {
  const apiKey = process.env.REOON_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://emailverifier.reoon.com/api/v1/verify?email=${encodeURIComponent(email)}&key=${apiKey}&mode=power`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return null;
    const data: ReoonResponse = await res.json();
    // Reoon returns error objects when credits are exhausted
    if (!data.email) return null;
    return data;
  } catch {
    return null;
  }
}

async function verifyWithMailCheck(email: string): Promise<MailCheckResponse | null> {
  try {
    const res = await fetch(
      `https://api.mailcheck.ai/email/${encodeURIComponent(email)}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function verifyWithDisify(email: string): Promise<DisifyResponse | null> {
  try {
    const res = await fetch(
      `https://disify.com/api/email/${encodeURIComponent(email)}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function validateEmail(email: string): Promise<ValidationResult> {
  const trimmed = email.trim().toLowerCase();
  const syntax = checkSyntax(trimmed);

  if (!syntax) {
    return { email: trimmed, syntax: false, mxValid: false, smtpValid: false, confidence: 0, status: "invalid" };
  }

  // Tier 1: Reoon — full SMTP verification (600/month)
  const reoon = await verifyWithReoon(trimmed);

  if (reoon) {
    const mxValid = reoon.mx_accepts_mail;
    const smtpValid = reoon.can_connect_smtp ? reoon.is_deliverable : null;

    let confidence: number;
    let status: ValidationResult["status"];

    if (reoon.is_safe_to_send || reoon.status === "safe" || reoon.status === "valid") {
      confidence = 100;
      status = "valid";
    } else if (reoon.status === "invalid" || reoon.status === "dangerous" || !reoon.mx_accepts_mail) {
      confidence = 0;
      status = "invalid";
    } else if (reoon.is_catch_all) {
      confidence = 70;
      status = "risky";
    } else {
      confidence = 0;
      status = "invalid";
    }

    return { email: trimmed, syntax, mxValid, smtpValid, confidence, status };
  }

  // Tier 2: MailCheck.ai + Disify — no API key, unlimited, DNS-level
  const [mailcheck, disify] = await Promise.all([
    verifyWithMailCheck(trimmed),
    verifyWithDisify(trimmed),
  ]);

  if (mailcheck || disify) {
    const mxValid = mailcheck ? mailcheck.mx : (disify ? disify.dns : false);
    const isDisposable = (mailcheck?.disposable || disify?.disposable) ?? false;
    const isCatchAll = mailcheck?.relay_domain ?? false;
    const isSpam = mailcheck?.spam ?? false;

    if (!mxValid) {
      return { email: trimmed, syntax, mxValid: false, smtpValid: false, confidence: 0, status: "invalid" };
    }

    if (isDisposable || isSpam) {
      return { email: trimmed, syntax, mxValid, smtpValid: null, confidence: 0, status: "invalid" };
    }

    if (isCatchAll) {
      return { email: trimmed, syntax, mxValid, smtpValid: null, confidence: 70, status: "risky" };
    }

    // Domain is valid, no red flags — honest score without SMTP
    return { email: trimmed, syntax, mxValid, smtpValid: null, confidence: 60, status: "unknown" };
  }

  // Tier 3: Local DNS fallback
  const { checkMx } = await import("./dnsCheck");
  const mxValid = await checkMx(trimmed.split("@")[1]);
  return {
    email: trimmed,
    syntax,
    mxValid,
    smtpValid: null,
    confidence: mxValid ? 40 : 0,
    status: mxValid ? "unknown" : "invalid",
  };
}
