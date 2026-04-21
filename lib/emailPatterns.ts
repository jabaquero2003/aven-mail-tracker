export function generateEmailCombinations(
  firstName: string,
  lastName: string,
  domain: string
): string[] {
  const f = firstName.toLowerCase().replace(/[^a-z]/g, "");
  const l = lastName.toLowerCase().replace(/[^a-z]/g, "");
  const fi = f.charAt(0);
  const li = l.charAt(0);

  const patterns = [
    `${f}.${l}@${domain}`,
    `${f}${l}@${domain}`,
    `${fi}${l}@${domain}`,
    `${fi}.${l}@${domain}`,
    `${f}@${domain}`,
    `${f}_${l}@${domain}`,
    `${f}-${l}@${domain}`,
    `${l}.${f}@${domain}`,
    `${l}${f}@${domain}`,
    `${l}@${domain}`,
    `${f}.${li}@${domain}`,
    `${f}${li}@${domain}`,
  ];

  return [...new Set(patterns)];
}

interface ClearbitCompany {
  name: string;
  domain: string;
}

async function findDomainViaClearbit(companyName: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(companyName)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data: ClearbitCompany[] = await res.json();
    if (data && data.length > 0) return data[0].domain;
    return null;
  } catch {
    return null;
  }
}

export async function guessCompanyDomain(companyName: string): Promise<string | null> {
  // Try Clearbit first — accurate company domain database, free, no API key
  const clearbitDomain = await findDomainViaClearbit(companyName);
  if (clearbitDomain) return clearbitDomain;

  // Fallback: DNS MX guessing
  const cleaned = companyName
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|co|company|the|group|and|&)\b/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();

  if (!cleaned) return null;

  const candidates = [
    `${cleaned}.com`,
    `${cleaned}.io`,
    `${cleaned}.co`,
    `${cleaned}.net`,
    `${cleaned}.org`,
  ];

  const { checkMx } = await import("./dnsCheck");

  for (const candidate of candidates) {
    const valid = await checkMx(candidate);
    if (valid) return candidate;
  }

  return `${cleaned}.com`;
}
