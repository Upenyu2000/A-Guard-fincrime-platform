import { Injectable } from "@nestjs/common";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { AuditEvent, UserRole } from "../../domain";

export interface EncryptedEnvelope {
  alg: "AES-256-GCM";
  keyRef: string;
  iv: string;
  tag: string;
  ciphertext: string;
  aad: string;
}

@Injectable()
export class SecurityService {
  private readonly masterKey: Buffer;
  private readonly keyRef: string;

  constructor() {
    const configured = process.env.ENCRYPTION_MASTER_KEY;
    const environment = process.env.NODE_ENV ?? "development";

    if (configured) {
      const decoded = Buffer.from(configured, "base64");
      if (decoded.length !== 32) {
        throw new Error("ENCRYPTION_MASTER_KEY must be a base64-encoded 32-byte key.");
      }
      this.masterKey = decoded;
      this.keyRef = process.env.ENCRYPTION_KEY_REF ?? "env://ENCRYPTION_MASTER_KEY";
      return;
    }

    if (environment === "production") {
      throw new Error(
        "ENCRYPTION_MASTER_KEY and ENCRYPTION_KEY_REF must be supplied by the production secret manager.",
      );
    }

    // Local development receives a process-local key. Data encrypted with this key is intentionally
    // not durable across restarts and must never be used for production records.
    this.masterKey = randomBytes(32);
    this.keyRef = "local-ephemeral://process-key";
  }

  pseudonymize(value: string): string {
    return createHmac("sha256", this.deriveKey("pseudonymisation"))
      .update(value, "utf8")
      .digest("hex");
  }

  anonymizeEntity(prefix: string, value: string): string {
    return `${prefix}_${this.pseudonymize(value).slice(0, 24)}`;
  }

  encryptForConsortium(payload: unknown): EncryptedEnvelope {
    const aad = "african-guard:consortium:v1";
    return this.encrypt(JSON.stringify(payload), "consortium", aad);
  }

  encryptSecret(value: string, context: string) {
    const aad = `african-guard:secret:${context}`;
    const envelope = this.encrypt(value, `secret:${context}`, aad);

    return {
      secretRef: `${this.keyRef}#${this.pseudonymize(context).slice(0, 24)}`,
      alg: envelope.alg,
      keyFingerprint: this.fingerprint(value),
      iv: envelope.iv,
      tag: envelope.tag,
      ciphertext: envelope.ciphertext,
      aad: envelope.aad,
    };
  }

  fingerprint(value: string | Buffer): string {
    return `sha256:${createHash("sha256").update(value).digest("hex")}`;
  }

  decryptFromConsortium(envelope: {
    iv: string;
    tag: string;
    ciphertext: string;
    aad?: string;
  }): unknown {
    const aad = envelope.aad ?? "african-guard:consortium:v1";
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.deriveKey("consortium"),
      Buffer.from(envelope.iv, "base64"),
    );
    decipher.setAAD(Buffer.from(aad, "utf8"));
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");

    return JSON.parse(plaintext) as unknown;
  }

  audit(
    actor: string,
    role: UserRole,
    action: string,
    target: string,
    metadata: Record<string, unknown>,
  ): AuditEvent {
    return {
      id: `aud-${randomUUID()}`,
      actor,
      role,
      action,
      target,
      metadata,
      createdAt: new Date().toISOString(),
    };
  }

  private encrypt(value: string, purpose: string, aad: string): EncryptedEnvelope {
    const key = this.deriveKey(purpose);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from(aad, "utf8"));
    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      alg: "AES-256-GCM",
      keyRef: this.keyRef,
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      ciphertext: ciphertext.toString("base64"),
      aad,
    };
  }

  private deriveKey(purpose: string): Buffer {
    return createHmac("sha256", this.masterKey)
      .update(`african-guard:${purpose}:v1`, "utf8")
      .digest();
  }
}
