import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // For AES-GCM, the IV is typically 12 bytes, but 16 is also common and supported
const AUTH_TAG_LENGTH = 16;

// Ensure the encryption key is loaded from environment variables
const encryptionKey = process.env.API_ENCRYPTION_KEY;
if (!encryptionKey || encryptionKey.length !== 64) {
  throw new Error(
    "API_ENCRYPTION_KEY environment variable is missing or not a 64-character hex string."
  );
}
const key = Buffer.from(encryptionKey, "hex");

/**
 * Encrypts a string using AES-256-GCM.
 * @param text The string to encrypt.
 * @returns The encrypted string in the format 'iv:authTag:encryptedData', encoded in hex.
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Combine IV, authTag, and encrypted data, then encode as hex
  return Buffer.concat([iv, authTag, encrypted]).toString("hex");
}

/**
 * Decrypts a string encrypted with AES-256-GCM.
 * @param encryptedHex The hex-encoded encrypted string ('iv:authTag:encryptedData').
 * @returns The original decrypted string.
 * @throws Error if decryption fails (e.g., wrong key, tampered data).
 */
export function decrypt(encryptedHex: string): string {
  const data = Buffer.from(encryptedHex, "hex");

  // Extract IV, authTag, and encrypted data
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    // Decrypt and concatenate Buffers, then convert to string
    const decryptedBuffer = Buffer.concat([
      decipher.update(encrypted), // Returns Buffer
      decipher.final(), // Returns Buffer
    ]);
    return decryptedBuffer.toString("utf8"); // Convert final buffer to string
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error(
      "Decryption failed. Data may be tampered or key is incorrect."
    );
  }
}
