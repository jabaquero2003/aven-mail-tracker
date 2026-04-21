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

export async function guessCompanyDomain(companyName: string): Promise<string | null> {
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

  const dns = await import("dns");
  const resolveMx = (host: string): Promise<boolean> =>
    new Promise((resolve) => {
      dns.resolveMx(host, (err, addrs) => resolve(!err && addrs.length > 0));
    });

  for (const candidate of candidates) {
    const valid = await resolveMx(candidate);
    if (valid) return candidate;
  }

  return `${cleaned}.com`;
}
