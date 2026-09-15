import fs from "node:fs/promises";
import { createHash, verify } from "node:crypto";

export function verifyUpdateManifest(manifest, archive) {
  if (manifest?.format !== "archify-desktop-release" || manifest.version !== 1 || typeof manifest.productVersion !== "string" || typeof manifest.sha256 !== "string" || !Number.isSafeInteger(manifest.bytes)) throw new Error("Invalid Archify desktop release manifest.");
  const bytes = Buffer.isBuffer(archive) ? archive : Buffer.from(archive), digest = createHash("sha256").update(bytes).digest("hex").toUpperCase();
  if (bytes.length !== manifest.bytes || digest !== manifest.sha256.toUpperCase()) throw new Error("Update archive does not match the signed release manifest.");
  return { productVersion: manifest.productVersion, bytes: bytes.length, sha256: digest };
}

export function verifyUpdateSignature(manifest, signature, publicKey) {
  const payload = Buffer.from(JSON.stringify(manifest));
  if (!verify(null, payload, publicKey, signature)) throw new Error("Desktop update signature is invalid.");
  return true;
}

if (process.argv[1]?.endsWith("trusted-update.mjs") && process.argv.length >= 6) {
  const [, , manifestPath, archivePath, publicKeyPath, signaturePath] = process.argv;
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")), archive = await fs.readFile(archivePath);
  verifyUpdateManifest(manifest, archive);
  verifyUpdateSignature(manifest, await fs.readFile(signaturePath), await fs.readFile(publicKeyPath));
  console.log(`Verified Archify Editor ${manifest.productVersion} update: ${manifest.sha256}`);
}
