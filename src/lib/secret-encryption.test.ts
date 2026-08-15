import { describe, expect, it, beforeAll } from "vitest";

beforeAll(() => {
  process.env.SECRETS_ENCRYPTION_KEY = "0".repeat(64);
});

describe("secret-encryption", () => {
  it("round-trips plaintext through encrypt/decrypt", async () => {
    const { encryptSecret, decryptSecret } = await import("./secret-encryption");
    const plaintext = "EAAGm0PX4ZCpsBO_test_access_token_123";
    const ciphertext = encryptSecret(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(decryptSecret(ciphertext)).toBe(plaintext);
  });

  it("produces a different ciphertext each time (random IV)", async () => {
    const { encryptSecret } = await import("./secret-encryption");
    const a = encryptSecret("same-value");
    const b = encryptSecret("same-value");
    expect(a).not.toBe(b);
  });

  it("throws on a tampered ciphertext instead of silently returning garbage", async () => {
    const { encryptSecret, decryptSecret } = await import("./secret-encryption");
    const ciphertext = encryptSecret("sensitive-token");
    const [iv, authTag, data] = ciphertext.split(".");
    const tampered = [iv, authTag, data.slice(0, -2) + "ff"].join(".");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("throws a clear error when the encryption key is missing", async () => {
    const original = process.env.SECRETS_ENCRYPTION_KEY;
    delete process.env.SECRETS_ENCRYPTION_KEY;
    const { encryptSecret } = await import("./secret-encryption");
    expect(() => encryptSecret("x")).toThrow(/SECRETS_ENCRYPTION_KEY/);
    process.env.SECRETS_ENCRYPTION_KEY = original;
  });
});
