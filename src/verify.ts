/**
 * MCP License Verification Module
 * Uses Ed25519 asymmetric signing — public key verifies, private key signs.
 * This file can be safely published (only contains public key).
 */
import { createPublicKey, verify } from "node:crypto";

const PUBLIC_KEY_B64 =
  "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUNvd0JRWURLMlZ3QXlFQWdBRldDTklHL0x4L01YNng0Ykdac3lNY0w1aU14Z1hnOUNtQ2Fqc0JuMDA9Ci0tLS0tRU5EIFBVQkxJQyBLRVktLS0tLQo=";

let _publicKey: ReturnType<typeof createPublicKey> | null = null;
function getPublicKey() {
  if (!_publicKey) {
    const pem = Buffer.from(PUBLIC_KEY_B64, "base64").toString("utf-8");
    _publicKey = createPublicKey({ key: pem, format: "pem", type: "spki" });
  }
  return _publicKey;
}

export interface LicenseData {
  email: string;
  tier: "free" | "pro";
  issued: string;
  expires: string;
}

const VALID_TIERS = ["free", "pro"] as const;

export function parseLicense(key: string): LicenseData | null {
  if (!key?.startsWith("SLIC-")) return null;

  const b64 = key.slice(5);
  let payload: Buffer;
  let signature: Buffer;

  try {
    const raw = Buffer.from(b64, "base64");
    // First 2 bytes = payload length (big-endian)
    const payloadLen = raw.readUInt16BE(0);
    payload = raw.subarray(2, 2 + payloadLen);
    signature = raw.subarray(2 + payloadLen);
  } catch {
    return null;
  }

  // Verify Ed25519 signature
  const valid = verify(
    null,
    payload,
    getPublicKey(),
    signature
  );

  if (!valid) return null;

  let data: LicenseData;
  try {
    data = JSON.parse(payload.toString("utf-8"));
  } catch {
    return null;
  }

  // Validate structure
  if (
    !data.email ||
    !data.tier ||
    !data.issued ||
    !data.expires ||
    !VALID_TIERS.includes(data.tier as any)
  ) {
    return null;
  }

  // Check expiry
  if (new Date(data.expires) < new Date()) return null;

  return data;
}

export function validateLicense(licenseKey?: string): {
  valid: boolean;
  data?: LicenseData;
  error?: string;
} {
  if (!licenseKey) {
    return { valid: false, error: "未设置 LICENSE_KEY 环境变量" };
  }

  const data = parseLicense(licenseKey);
  if (!data) {
    return { valid: false, error: "无效或过期的 License Key" };
  }

  return { valid: true, data };
}

const PURCHASE_URL = "https://paypal.me/Jing7ao";

function getUpgradeMessage(): string {
  return [
    "",
    "---",
    "Free tier 已用完（5次/天）。升级到 Pro 无限使用：",
    `  ${PURCHASE_URL}`,
    "购买后将收到 License Key，设置环境变量 LICENSE_KEY 即可激活。",
  ].join("\n");
}

/**
 * License guard for tool calls.
 * Returns a tool result error if unlicensed, null if OK.
 */
export function checkLicense(): { data: LicenseData } | { error: string } {
  const key = process.env.LICENSE_KEY;
  const result = validateLicense(key);

  if (!result.valid || !result.data) {
    // Track daily free usage
    const usage = getFreeUsage();
    if (usage >= FREE_DAILY_LIMIT) {
      return {
        error: `Free tier 限制: ${FREE_DAILY_LIMIT} 次/天（今日已用 ${usage} 次）${getUpgradeMessage()}`,
      };
    }
    incrementFreeUsage();
    return { data: { email: "free@unlicensed", tier: "free", issued: "", expires: "" } };
  }

  return { data: result.data };
}

// Simple in-memory daily usage tracker for free tier
const FREE_DAILY_LIMIT = 5;
let _freeDate = "";
let _freeCount = 0;

export function getFreeUsage(): number {
  const today = new Date().toISOString().slice(0, 10);
  if (_freeDate !== today) {
    _freeDate = today;
    _freeCount = 0;
  }
  return _freeCount;
}

function incrementFreeUsage(): void {
  const today = new Date().toISOString().slice(0, 10);
  if (_freeDate !== today) {
    _freeDate = today;
    _freeCount = 0;
  }
  _freeCount++;
}

export function printLicenseBanner(): void {
  const key = process.env.LICENSE_KEY;
  const result = validateLicense(key);
  if (result.valid && result.data) {
    console.error(
      `[License] 已激活: ${result.data.email} | 等级: ${result.data.tier} | 到期: ${result.data.expires}`
    );
  } else {
    console.error(`[License] 未激活，Free tier: ${FREE_DAILY_LIMIT} 次/天。升级: ${PURCHASE_URL}`);
  }
}
