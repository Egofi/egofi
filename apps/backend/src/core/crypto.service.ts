import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard
const AUTH_TAG_LENGTH = 16;

/**
 * AES-256-GCM field-level encryption (§4). Used to encrypt sensitive
 * merchant fields (webhook secrets, future: xpubs) before they reach
 * the database. Output format: `iv:authTag:ciphertext` (hex-encoded).
 */
@Injectable()
export class CryptoService {
	private readonly key: Buffer;

	constructor(config: ConfigService) {
		const hex = config.getOrThrow<string>("FIELD_ENCRYPTION_KEY");
		this.key = Buffer.from(hex, "hex");
		if (this.key.length !== 32) {
			throw new Error("FIELD_ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars)");
		}
	}

	encrypt(plaintext: string): string {
		const iv = randomBytes(IV_LENGTH);
		const cipher = createCipheriv(ALGORITHM, this.key, iv, {
			authTagLength: AUTH_TAG_LENGTH,
		});
		const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
		const authTag = cipher.getAuthTag();
		return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
	}

	decrypt(ciphertext: string): string {
		const parts = ciphertext.split(":");
		if (parts.length !== 3) {
			throw new Error("Invalid encrypted field format (expected iv:authTag:ciphertext)");
		}
		const [ivHex, authTagHex, encryptedHex] = parts as [string, string, string];
		const iv = Buffer.from(ivHex, "hex");
		const authTag = Buffer.from(authTagHex, "hex");
		const encrypted = Buffer.from(encryptedHex, "hex");

		const decipher = createDecipheriv(ALGORITHM, this.key, iv, {
			authTagLength: AUTH_TAG_LENGTH,
		});
		decipher.setAuthTag(authTag);
		return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
	}
}
