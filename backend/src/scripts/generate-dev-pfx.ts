import forge from 'node-forge';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { logger } from '../config/logger';

export function generateDevPfx(outputPath?: string, passphrase?: string): { certPem: string; pfxPath: string } {
  const pfxFile = outputPath || path.resolve(process.cwd(), env.PDF_SIGNER_PFX_PATH || './certs/dev-signer.pfx');
  const password = passphrase !== undefined ? passphrase : env.PDF_SIGNER_PFX_PASSPHRASE || 'AyatrioTestPass123!';

  const certDir = path.dirname(pfxFile);
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  // Generate RSA 2048-bit keypair
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01' + forge.util.bytesToHex(forge.random.getBytesSync(16));

  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 2); // 2 years validity

  const attrs = [
    { name: 'countryName', value: 'IN' },
    { name: 'stateOrProvinceName', value: 'Maharashtra' },
    { name: 'localityName', value: 'Mumbai' },
    { name: 'organizationName', value: 'Ayatrio Practice Management' },
    { name: 'organizationalUnitName', value: 'Digital Signature Department' },
    { name: 'commonName', value: 'Dev Signer (Class 3 Test DSC)' },
    { type: '2.5.4.5', value: '2026-TEST-DSC-001' }, // serialNumber attribute
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs); // Self-signed

  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: false,
    },
    {
      name: 'keyUsage',
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
    },
    {
      name: 'extKeyUsage',
      serverAuth: false,
      clientAuth: true,
      codeSigning: false,
      emailProtection: true,
    },
    {
      name: 'subjectKeyIdentifier',
    },
  ]);

  // Self-sign certificate using SHA-256
  cert.sign(keys.privateKey, forge.md.sha256.create());

  // Package into PKCS#12
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, {
    generateLocalKeyId: true,
    friendlyName: 'Dev Indian Class 3 DSC',
    algorithm: '3des',
  });

  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  fs.writeFileSync(pfxFile, Buffer.from(p12Der, 'binary'));

  const certPem = forge.pki.certificateToPem(cert);
  return { certPem, pfxPath: pfxFile };
}

// If executed directly from CLI: tsx src/scripts/generate-dev-pfx.ts
if (require.main === module) {
  try {
    const res = generateDevPfx();
    logger.info(`✅ Generated Dev Test PFX at: ${res.pfxPath}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to generate test PFX:', err);
    process.exit(1);
  }
}
