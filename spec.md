## Open-Mint TCG (v0): Proof-of-Work Client + Stateless Signer

A minimum-viable card-minting system with no blockchain, no database, no ledger. Players mine a short code via Proof-of-Work; a stateless signing service validates and signs a certificate that judges can verify offline using the season’s public key.

---

### 1) Roles

- **Miner (player client)**: randomly generates codes and checks viability by counting `0` characters in `sha256(code + ":viability")` (hex string).
- **Signer (server)**: stateless HTTP service that validates code viability, deterministically derives properties from suffix-hashed code, signs a canonical digest, and returns a certificate. Keeps only a private key locally.
- **Judge/Verifier**: offline app/tool that validates a certificate and signature and recomputes viability and properties.
- **Publisher**: posts a Season Config JSON that all parties trust.

---

### 2) Season Config (public, signed once per season)

A single JSON file published at season start (static for the season). The verifier requires `cert.v === config.schemaVersion` and `cert.seasonId === config.seasonId`.

```json
{
  "schemaVersion": 1,
  "seasonId": 1,
  "name": "Season 1: Minty Fresh",
  "mining": {
    "mode": "BLIND",
    "hash": "SHA-256",
    "gene": { "alphabet": "abcd", "length": 12 },
    "viability": { "type": "zeros-in-hex", "suffix": ":viability", "threshold": 16 }
  },
  "propertiesFromCode": {
    "version": 1,
    "rules": [
      { "key": "h", "suffix": ":health", "method": "zeros-in-hex-div2-cap10" },
      { "key": "a", "suffix": ":attack", "method": "zeros-in-hex-div2-cap10" }
    ]
  },
  "signing": { "algo": "Ed25519", "publicKeyBase64": "…" }
}
```

- **Blind mining**: pick a gene string; a code is legal iff `count('0' in hex(sha256(code + ":viability")))` meets the threshold.
- **Properties**: derived by hashing the same code with property-specific suffixes (e.g., `":health"`, `":attack"`) and counting zeros.
- The Season Config itself SHOULD be signed (detached signature) and versioned.

---

### 3) Canonical Byte Layouts

#### 3.1 Code (what is actually “mined”)

`code` is an ASCII string of length `gene.length` using only characters from `gene.alphabet`.

- **Mode**: `BLIND` in v0 (no targeted minting).
- The code is the sole mined input in v0.

#### 3.2 Seed

`seed = SHA256(code)` (32 raw bytes).

#### 3.3 Hashes

- **Viability hash (hex)**: `v = hex(SHA256(code || ":viability"))` where the suffix comes from config.
- **Property hash (hex)** for key with suffix `s`: `d = hex(SHA256(code || s))`.

#### 3.4 Viability check (zeros-in-hex)

Let `threshold = mining.viability.threshold`. Require `zeros(v) ≥ threshold`, where `zeros(x)` counts `'0'` characters in the hex string.

---

### 4) Properties function (deterministic)

For each property rule `{ key, suffix }`:

1. Compute `d = sha256(code + suffix)` as a hex string (64 chars).
2. Let `z = count('0' in d)`.
3. Property value = `min(floor(z / 2), 10)`, lower-bounded at 0.

Concretely (v0):

- **Health (`h`)**: `suffix=":health" → h = min(floor(zeros/2), 10)`
- **Attack (`a`)**: `suffix=":attack" → a = min(floor(zeros/2), 10)`

---

### 5) Certificate (what the server signs & returns)

#### 5.1 Canonical digest to sign (fixed byte layout)

The signer builds a deterministic preimage and signs `SHA256(preimage)` with Ed25519.

```
preimage =
  "OMT-CERT\0"                  // ASCII tag
  || u8(version)                 // certificate version
  || u32be(seasonId)
  || "BLIND"                    // mining.mode as ASCII
  || u8(geneLen)                 // code length from config
  || UTF-8(code)                 // ASCII in practice
  || u8(viability.threshold)
  || u8(viability.zeros)
  || seed(32 bytes)
  || propertyBytes

propertyBytes =
  u8(count) || repeated ( u8(keyLen) || UTF-8(key) || u16be(value) )
```

Notes:

- Property entries are sorted by descending key (lexicographic, `b[0].localeCompare(a[0])`) before encoding.
- The final `digest = SHA256(preimage)` is what gets signed.

#### 5.2 Certificate JSON (transport/QR)

```json
{
  "v": 1,
  "seasonId": 1,
  "mining": { "mode": "BLIND", "viabilityZeros": 18, "threshold": 16 },
  "code": "bcdddbabdcaa",
  "seedHex": "…64-hex…",
  "properties": { "h": 3, "a": 4 },
  "signatureB64": "…"        
}
```

---

### 6) HTTP API (signer)

`POST /sign`

Request:

```json
{ "version": 1, "seasonId": 1, "code": "…" }
```

Server behavior:

1. Validate code charset/length against `mining.gene`.
2. Compute `v = sha256_hex(code + viability.suffix)`; ensure `zeros(v) ≥ threshold`.
3. `seed = sha256(code)`; derive `properties` via the deterministic rule above.
4. Build canonical digest, sign with Ed25519, return the Certificate JSON.

Response codes (v0 implementation):

- `200 OK` with certificate on success.
- `400 Bad Request` for invalid inputs or non-viable code.
- `410 Gone` if `seasonId` does not match the active config.

The service is stateless; there is no persistence or duplicate tracking.

---

### 7) Verifier (offline judge)

Input: Certificate JSON and the Season Config.

Checks:

1. Validate `cert.v === cfg.schemaVersion` and `cert.seasonId === cfg.seasonId`.
2. Validate code charset/length per `cfg.mining.gene`.
3. Recompute `v = sha256_hex(cert.code + cfg.mining.viability.suffix)`; enforce `zeros(v) ≥ cfg.mining.viability.threshold` and `== cert.mining.viabilityZeros`.
4. Recompute `seed = sha256(cert.code)` and ensure `hex(seed) === cert.seedHex`.
5. Recompute `propertiesFromCode(cert.code, cfg.propertiesFromCode)` and ensure equality with `cert.properties` for all keys.
6. Rebuild canonical digest and verify `Ed25519(signature, digest)` using `cfg.signing.publicKeyBase64`.

No network required.

---

### 8) Security properties & trade-offs (v0)

- **Authenticity**: Only the signer’s private key can produce valid certificates.
- **Determinism**: Anyone can recompute viability & properties → easy counterfeit detection.
- **No global auditability**: Authority could over-issue; v0 accepts this.
- **Duplicates**: Not prevented in v0 (server is stateless). Events may locally reject repeated `cardId` if they choose to track.
- **Key hygiene**: Rotate signer key between seasons; keep old pubkeys in verifier for legacy cards.

Optional hardening later: rate limits, signed manifests, revocation lists—none required for v0.

---

### 9) Reference parameters (sane defaults)

- **hash**: SHA-256
- **code**: alphabet = `"abcd"`, length = 12
- **viability**: threshold = 16 (zeros-in-hex)
- **properties**: cap values to 0–10 via `min(floor(z/2), 10)`
- **signatures**: Ed25519 (deterministic, widely supported)
- **QR**: JSON, max payload ≤ ~1.5 KiB (CBOR optional)

---

### 10) Pseudocode

Miner

```text
cfg = load_season_config()
for code in random_code_stream(alphabet=cfg.mining.gene.alphabet, length=cfg.mining.gene.length):
  v = sha256_hex(code + cfg.mining.viability.suffix)
  if count_zeros(v) >= cfg.mining.viability.threshold:
    send_to_signer({version=1, seasonId=cfg.seasonId, code})
    break
```

Signer (handler)

```text
assert valid_code(req.code, cfg.mining.gene)
v        = sha256_hex(req.code + cfg.mining.viability.suffix)
assert count_zeros(v) >= cfg.mining.viability.threshold
seed     = sha256(req.code)
props    = properties_from_code(req.code, cfg.propertiesFromCode)
digest   = build_digest_blind(version, seasonId, mode="BLIND", code=req.code, geneLen=cfg.mining.gene.length, threshold=cfg.mining.viability.threshold, zeros=count_zeros(v), seed, props)
sig      = ed25519_sign(sk, digest)
return cert_json_blind(code=req.code, viabilityZeros=count_zeros(v), threshold=cfg.mining.viability.threshold, seed, props, sig)
```

Verifier

```text
assert cert.v == cfg.schemaVersion && cert.seasonId == cfg.seasonId
assert valid_code(cert.code, cfg.mining.gene)
v        = sha256_hex(cert.code + cfg.mining.viability.suffix)
assert count_zeros(v) >= cfg.mining.viability.threshold && count_zeros(v) == cert.mining.viabilityZeros
seed     = sha256(cert.code)
assert hex(seed) == cert.seedHex
assert properties_from_code(cert.code, cfg.propertiesFromCode) == cert.properties
digest   = build_digest_blind(...)
assert ed25519_verify(cfg.signing.publicKeyBase64, digest, cert.signatureB64)
```