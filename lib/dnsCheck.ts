import dns from "dns";
import { promisify } from "util";

const resolveMx = promisify(dns.resolveMx);

export async function checkMx(domain: string): Promise<boolean> {
  try {
    const records = await resolveMx(domain);
    return records && records.length > 0;
  } catch {
    return false;
  }
}

export async function getMxHost(domain: string): Promise<string | null> {
  try {
    const records = await resolveMx(domain);
    if (!records || records.length === 0) return null;
    records.sort((a, b) => a.priority - b.priority);
    return records[0].exchange;
  } catch {
    return null;
  }
}
