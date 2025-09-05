type SeasonId = 1;

export type MiningEvents = {
  viableCode: [code: string, attempts: number, elapsedMs: number];
  progress: [attempts: number, elapsedMs: number, hps: string];
  error: [message: string];
}

export type MiningMode = "BLIND";

export interface GeneSpec {
  alphabet: string;
  length: number;
}

export interface ViabilitySpec {
  type: "zeros-in-hex";
  suffix: string; // e.g., ":viability"
  threshold: number; // require zeros >= threshold
}

export interface MiningSpec {
  mode: MiningMode;
  hash: "SHA-256";
  gene: GeneSpec;
  viability: ViabilitySpec;
}

export type PropertyMethod = "zeros-in-hex-div2-cap10";

export interface PropertyRule {
  key: string; // e.g., "h", "a"
  suffix: string; // e.g., ":health"
  method: PropertyMethod;
}

export interface PropertiesFromCodeSpec {
  version: number;
  rules: PropertyRule[];
}

export interface SigningSpec {
  algo: "Ed25519";
  publicKeyBase64: string;
}

type SchemaVersion = 1;

export interface SeasonConfig {
  schemaVersion: SchemaVersion;
  seasonId: SeasonId;
  name: string;
  mining: MiningSpec;
  propertiesFromCode: PropertiesFromCodeSpec;
  signing: SigningSpec;
}

export interface PropertiesMap { [key: string]: number; }

type CertificateVersion = 1;

export interface Certificate {
  v: CertificateVersion;
  seasonId: SeasonId;
  mining: { mode: MiningMode; viabilityZeros: number; threshold: number };
  code: string;
  seedHex: string; // 32-byte hex
  properties: PropertiesMap;
  signatureB64: string; // detached signature over canonical digest
}

export type Code = string;

export type BlindSignRequest = {
  version: 1;
  seasonId: SeasonConfig['seasonId'];
  code: string;
}
