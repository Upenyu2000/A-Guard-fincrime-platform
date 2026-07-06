import { Injectable } from "@nestjs/common";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { AuditEvent, UserRole } from "../../domain";

@Injectable()
export class SecurityService {
  private readonly secret = process.env.CONSORTIUM_SHARED_SECRET ?? "local-dev-secret";

  pseudonymize(value: string): string {
    return createHmac("sha256", this.secret).update(value).digest("hex").slice(0, 12);
  }

  anonymizeEntity(prefix: string, value: string): string {
    return `${prefix}_${this.pseudonymize(value)}`;
  }

  encryptForConsortium(payload: unknown) {
    const key = createHash("sha256").update(this.secret).digest();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(payload), "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return {
      alg: "AES-256-GCM",
      keyRef: "vault://keys/consortium/current",
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    };
  }

  encryptSecret(value: string, context: string) {
    const key = createHash("sha256").update(`${this.secret}:${context}`).digest();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      secretRef: `vault://secrets/${this.pseudonymize(context)}`,
      alg: "AES-256-GCM",
      keyFingerprint: this.fingerprint(value),
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    };
  }

  fingerprint(value: string): string {
    return `sha256:${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
  }

  decryptFromConsortium(envelope: {
    iv: string;
    tag: string;
    ciphertext: string;
  }): unknown {
    const key = createHash("sha256").update(this.secret).digest();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64"));
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");

    return JSON.parse(plaintext) as unknown;
  }

  audit(actor: string, role: UserRole, action: string, target: string, metadata: Record<string, unknown>): AuditEvent {
    return {
      id: `aud-${Date.now()}-${Math.round(Math.random() * 10_000)}`,
      actor,
      role,
      action,
      target,
      metadata,
      createdAt: new Date().toISOString(),
    };
  }
}
