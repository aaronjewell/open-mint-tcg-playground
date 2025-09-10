## Open‑Mint TCG Exploration (v0)

Proof‑of‑Work card minting with a stateless Ed25519 signer and an offline verifier. No blockchain, no DB.

### Prerequisites
- Node.js 18+

### Install & Build
```bash
npm i
npm run build
```

### Generate an Ed25519 key pair
```bash
npm run keygen -- \
  [--out <path>] # writes ed25519.sk.hex and ed25519.pk.b64 files to path, defaults to writing keys to stdout
```

### Run the signer
```bash
npm run signer -- \
  --key ./keys/ed25519.sk.hex \
  --config ./config/season.example.json \
  [--port 8787]
```

### Mine a card (client)
```bash
npm run miner -- \
  --config <your-config.json>
  --signer-url <url> # required to sign the cert
  [--quiet]
  [--out <filepath>] # defaults to stdout
```

### Verify a certificate (offline)
```bash
npm run verify -- \
  --cert <your-cert.json>
  [--config ./config/season.example.json]
```

### Generate flavor (deterministic)
```bash
npm run flavor -- \
  --cert <your-cert.json> \
  --theme ./themes/fantasy.v1.json
  [--out <filepath>] # defaults to stdout
```

### Render a card (SVG)
```bash
npm run render -- \
  --in ./flavors/example.json \
  [--out <filepath>] # defaults to stdout
  [--use-openai] # use OpenAI Images API to generate an image from flavor's image information
  [--openai-model gpt-image-1] # ignored without --use-openai flag
  [--openai-size 1024x1024] # ignored without --use-openai flag
  [--openai-key ./keys/openai.apikey.txt] # file path; ignored without --use-openai flag;
  [--cert <your-cert.json>] # cert to optionally add as QR code to card image
```

### Assemble VM program (Card DSL)
```bash
npm run assemble -- \
  --input ./src/card-dsl/examples/test-program.asm \
  [--output ./src/card-dsl/examples/test-program.bin] \
  [--disassemble]
```

Examples:
```bash
# Assemble text to bytecode
npm run assemble -- -i ./src/card-dsl/examples/test-program.asm -o ./src/card-dsl/examples/test-program.bin

# Disassemble bytecode to assembly (prints to stdout)
npm run assemble -- -i ./src/card-dsl/examples/test-program.bin -d
```

### Decode VM bytecode (tokens/AST)
```bash
npm run decode -- \
  --input ./src/card-dsl/examples/test-program.bin \
  [--tokens] \
  [--ast] \
  [--verbose]
```

Examples:
```bash
# Show tokens
npm run decode -- -i ./src/card-dsl/examples/test-program.bin -t

# Show AST
npm run decode -- -i ./src/card-dsl/examples/test-program.bin -a

# Verbose (tokens + AST)
npm run decode -- -i ./src/card-dsl/examples/test-program.bin --verbose
```

### Explore valid programs (helper)
Generates random codes, decodes/parses them, and prints viability/semantic stats and samples.
```bash
npm run check-valid-programs
```
Notes:
- Uses internal defaults (e.g., version byte 0x01) and finite sampling.
- Prints top parse/semantic error counts and a few valid samples when found.

### Create a card end-to-end 
```bash
# Mines + signs, assembles flavor, renders SVG
npm run create-card -- \
  --config ./config/season.example.json
  [--signer-url http://localhost:8787/sign]
  [--theme ./themes/fantasy.v1.json]
  [--cert-out ./certs/<unix timestamp>.json]
  [--flavor-out ./flavors/<same-filename-as-cert>]
  [--out ./cards/<same-basename-as-cert>.svg] # defaults to stdout
  [--use-openai]
  [--openai-model gpt-image-1] # ignored without --use-openai flag
  [--openai-size 1024x1024] # ignored without --use-openai flag
  [--openai-key ./keys/openai.apikey.txt] # file path; ignored without --use-openai flag
  [--qr-code] # generate a qr code of the signed cert on the rendered card
  [--quiet]
```

Defaults and intermediate outputs:
- Certificate JSON is saved to `certs/<timestamp>.json` (override with `--cert-out <path>`)
- Flavor JSON is saved to `flavors/<same-basename-as-cert>.json` (override with `--flavor-out <path>`)
- Final SVG goes to stdout unless `--out <path>` is provided

Example with overrides:
```bash
npm run create-card -- \
  --config ./config/season.example.json \
  --signer-url http://localhost:8787/sign \
  --theme ./themes/fantasy.v1.json \
  --use-openai \
  --openai-model dall-e-3 \
  --openai-key ./keys/openai.apikey.txt \
  --qr-code
```

### Run tests

Tests execute against example files

```bash
npm run test
```

### Signer API
- POST `/sign`
  - Request JSON: `{ "version": 1, "seasonId": <number>, "code": <string> }`
  - 200: Certificate JSON with `signatureB64`
  - 400/410: Validation or season errors

### Notes
- Mining loop is compute‑only; network and file I/O happen once after a viable code is found.

### Project layout
- `certs/cert.example.json`: example generated card cert
- `config/season.example.json`: example season config
- `dist/`: compiled modules
- `flavors/flavor.example.json`: example generated flavor
- `schema/`: JSON Schemas for theme and flavor output
- `scripts/`: top-level bash scripts (e.g., `create-card.sh`)
- `src/core`: hashing, validation, stats, canonical digest, signing helpers
- `src/signer`: HTTP `/sign` service
- `src/miner`: mining CLI
- `src/verifier`: offline verifier CLI
- `src/flavorer`: deterministic flavor generator (theme loader, selector, assembler, CLI)
- `src/renderer`: standalone SVG renderer and CLI (optional OpenAI image fetch)
- `themes/`: example flavor themes (`fantasy.v1.json`)
- `tests/`: cli tests
