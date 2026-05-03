import crypto from "node:crypto";

/**
 * Field-level encryption for PII (NIK / KTP number).
 *
 * Storage format: `v1:<iv_b64>:<authTag_b64>:<ciphertext_b64>`
 *   - AES-256-GCM, fresh 12-byte IV per write
 *   - 16-byte auth tag prevents tampering
 *
 * Lookups: a separate HMAC-SHA256 "blind index" (id_card_hash) lets us
 * detect duplicate NIKs and search by NIK without ever decrypting.
 *
 * Required env (32 random bytes each, base64-encoded — generate with
 * `openssl rand -base64 32`):
 *   - KTP_ENCRYPTION_KEY  (AES-256 key)
 *   - KTP_HASH_KEY        (HMAC key — must be different from encryption key)
 */

const ENCRYPTION_VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_LEN = 12; // GCM standard
const KEY_LEN = 32; // AES-256

let _encKey: Buffer | null = null;
let _hashKey: Buffer | null = null;

function loadKey(envVar: string): Buffer {
    const raw = process.env[envVar];
    if (!raw) {
        throw new Error(
            `${envVar} is not set. Generate one with: openssl rand -base64 32`,
        );
    }
    let key: Buffer;
    try {
        key = Buffer.from(raw, "base64");
    } catch {
        throw new Error(`${envVar} must be base64-encoded`);
    }
    if (key.length !== KEY_LEN) {
        throw new Error(
            `${envVar} must decode to ${KEY_LEN} bytes (got ${key.length}). ` +
            `Generate with: openssl rand -base64 32`,
        );
    }
    return key;
}

function getEncKey(): Buffer {
    if (!_encKey) _encKey = loadKey("KTP_ENCRYPTION_KEY");
    return _encKey;
}

function getHashKey(): Buffer {
    if (!_hashKey) _hashKey = loadKey("KTP_HASH_KEY");
    return _hashKey;
}

/** Encrypt a plaintext NIK (or any short PII string) using AES-256-GCM. */
export function encryptNik(plaintext: string): string {
    if (!plaintext) throw new Error("Cannot encrypt empty value");
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${ENCRYPTION_VERSION}:${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

/** Decrypt a payload produced by `encryptNik`. Returns `null` if the input
 *  is null/undefined/empty so callers can pass straight through optional
 *  columns. Throws on tampered or malformed payloads. */
export function decryptNik(payload: string | null | undefined): string | null {
    if (!payload) return null;
    const parts = payload.split(":");
    if (parts.length !== 4 || parts[0] !== ENCRYPTION_VERSION) {
        throw new Error("Unsupported NIK ciphertext format");
    }
    const [, ivB64, tagB64, ctB64] = parts;
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const ct = Buffer.from(ctB64, "base64");
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncKey(), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
    return plaintext.toString("utf8");
}

/** True when `value` looks like a NIK ciphertext rather than a plaintext NIK. */
export function isEncryptedNik(value: string | null | undefined): boolean {
    return typeof value === "string" && value.startsWith(`${ENCRYPTION_VERSION}:`);
}

/** Stable blind-index hash. Same input → same output, so we can find a
 *  person by NIK (e.g. dedup check) without decrypting any row. */
export function hashNik(plaintext: string): string {
    if (!plaintext) throw new Error("Cannot hash empty value");
    return crypto
        .createHmac("sha256", getHashKey())
        .update(plaintext, "utf8")
        .digest("hex");
}

/**
 * Best-effort decrypt for rows that may already contain plaintext from
 * legacy data. Returns plaintext NIK or null. Logs (does not throw) on
 * unexpected ciphertext failures so that read paths stay robust.
 */
export function decryptNikSafe(value: string | null | undefined): string | null {
    if (!value) return null;
    if (!isEncryptedNik(value)) return value; // legacy plaintext row
    try {
        return decryptNik(value);
    } catch (err) {
        console.error("Failed to decrypt NIK:", err);
        return null;
    }
}
