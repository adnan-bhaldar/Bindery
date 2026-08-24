import crypto from "crypto";
import bcrypt from "bcryptjs";

// A random 6-digit numeric code, zero-padded (e.g. "004821").
// crypto.randomInt is cryptographically secure — Math.random() is not
// suitable for anything used as a credential.
export function generateBackupCode() {
    return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function hashBackupCode(code) {
    const salt = await bcrypt.genSalt(10); // lighter than the password's cost 12 — these are short-lived, single-use, and there are only 6 per user
    return bcrypt.hash(code, salt);
}

export async function compareBackupCode(candidate, hash) {
    return bcrypt.compare(candidate, hash);
}

// Generates a fresh set of 6 backup codes: the plaintext codes (returned to
// the user once, never stored) and the hashed records (what actually gets
// saved to the database).
export async function generateBackupCodeSet() {
    const plainCodes = Array.from({ length: 6 }, generateBackupCode);
    const records = await Promise.all(
        plainCodes.map(async (code) => ({
            codeHash: await hashBackupCode(code),
            used: false,
        }))
    );
    return { plainCodes, records };
}
