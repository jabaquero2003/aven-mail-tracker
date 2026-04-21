import dns from "dns";
import net from "net";
import { promisify } from "util";

const resolveMx = promisify(dns.resolveMx);

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

export async function checkSmtp(email: string, mxHost: string): Promise<boolean | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(null);
    }, 8000);

    const socket = net.createConnection(25, mxHost);
    let stage = 0;
    let buffer = "";

    socket.on("connect", () => {});

    socket.on("data", (data) => {
      buffer += data.toString();
      const lines = buffer.split("\r\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line) continue;
        const code = parseInt(line.slice(0, 3), 10);

        if (stage === 0 && code === 220) {
          socket.write(`EHLO mail-checker.local\r\n`);
          stage = 1;
        } else if (stage === 1 && (code === 250 || code === 220)) {
          if (!line.includes("-")) {
            socket.write(`MAIL FROM:<check@mail-checker.local>\r\n`);
            stage = 2;
          }
        } else if (stage === 2 && code === 250) {
          socket.write(`RCPT TO:<${email}>\r\n`);
          stage = 3;
        } else if (stage === 3) {
          clearTimeout(timeout);
          socket.write("QUIT\r\n");
          socket.destroy();
          resolve(code === 250 || code === 251);
          return;
        } else if (code >= 400) {
          clearTimeout(timeout);
          socket.destroy();
          resolve(code >= 500 ? false : null);
          return;
        }
      }
    });

    socket.on("error", () => {
      clearTimeout(timeout);
      resolve(null);
    });

    socket.on("close", () => {
      clearTimeout(timeout);
    });
  });
}

export async function validateEmail(email: string): Promise<ValidationResult> {
  const trimmed = email.trim().toLowerCase();
  const syntax = checkSyntax(trimmed);

  if (!syntax) {
    return { email: trimmed, syntax: false, mxValid: false, smtpValid: false, confidence: 0, status: "invalid" };
  }

  const domain = trimmed.split("@")[1];
  const mxValid = await checkMx(domain);

  if (!mxValid) {
    return { email: trimmed, syntax: true, mxValid: false, smtpValid: false, confidence: 5, status: "invalid" };
  }

  let smtpValid: boolean | null = null;
  try {
    const mxHost = await getMxHost(domain);
    if (mxHost) {
      smtpValid = await checkSmtp(trimmed, mxHost);
    }
  } catch {
    smtpValid = null;
  }

  let confidence: number;
  let status: ValidationResult["status"];

  if (smtpValid === true) {
    confidence = 95;
    status = "valid";
  } else if (smtpValid === false) {
    confidence = 10;
    status = "invalid";
  } else {
    confidence = 55;
    status = "risky";
  }

  return { email: trimmed, syntax, mxValid, smtpValid, confidence, status };
}
