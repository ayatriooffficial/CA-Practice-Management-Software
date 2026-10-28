import fs from 'fs';
import path from 'path';
import forge from 'node-forge';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import {
  SignerProvider,
  CertificateDescriptor,
  SignDigestParams,
  SignDigestResult,
} from './signer.interface';
import { generateDevPfx } from '../../../scripts/generate-dev-pfx';

export class SoftwareSignerProvider implements SignerProvider {
  public readonly id = 'software' as const;

  private pfxPath: string;
  private passphrase: string;
  private cachedCert: forge.pki.Certificate | null = null;
  private cachedPrivateKey: forge.pki.rsa.PrivateKey | null = null;

  constructor() {
    this.pfxPath = path.resolve(process.cwd(), env.PDF_SIGNER_PFX_PATH || './certs/dev-signer.pfx');
    this.passphrase = env.PDF_SIGNER_PFX_PASSPHRASE || 'AyatrioTestPass123!';
  }

  private loadPfx(): { cert: forge.pki.Certificate; key: forge.pki.rsa.PrivateKey } {
    if (this.cachedCert && this.cachedPrivateKey) {
      return { cert: this.cachedCert, key: this.cachedPrivateKey };
    }

    if (!fs.existsSync(this.pfxPath)) {
      logger.info(`Dev PFX not found at ${this.pfxPath}, generating one on-the-fly...`);
      generateDevPfx(this.pfxPath, this.passphrase);
    }

    const pfxDer = fs.readFileSync(this.pfxPath, 'binary');
    const p12Asn1 = forge.asn1.fromDer(pfxDer);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, this.passphrase);

    let cert: forge.pki.Certificate | null = null;
    let key: forge.pki.rsa.PrivateKey | null = null;

    for (const safeContent of p12.safeContents) {
      for (const safeBag of safeContent.safeBags) {
        if (safeBag.cert) {
          cert = safeBag.cert;
        }
        if (safeBag.key) {
          key = safeBag.key as forge.pki.rsa.PrivateKey;
        }
      }
    }

    if (!cert || !key) {
      throw new Error('Failed to extract certificate and private key from software PFX store');
    }

    this.cachedCert = cert;
    this.cachedPrivateKey = key;
    return { cert, key };
  }

  async health(): Promise<{ available: boolean; detail?: string }> {
    try {
      const { cert } = this.loadPfx();
      const cn = cert.subject.getField('CN')?.value || 'Dev Signer';
      return {
        available: true,
        detail: `Software signer ready (${cn})`,
      };
    } catch (err: any) {
      return {
        available: false,
        detail: `Software signer unavailable: ${err?.message || 'Failed to load PFX'}`,
      };
    }
  }

  async listCertificates(): Promise<CertificateDescriptor[]> {
    const { cert } = this.loadPfx();
    const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
    const certDerBase64 = Buffer.from(certDer, 'binary').toString('base64');

    const md = forge.md.sha256.create();
    md.update(certDer);
    const fingerprintSha256 = md.digest().toHex().toUpperCase();

    const subjectStr = cert.subject.attributes
      .map((a: any) => `${a.shortName || a.name || 'attr'}=${a.value}`)
      .join(', ');
    const issuerStr = cert.issuer.attributes
      .map((a: any) => `${a.shortName || a.name || 'attr'}=${a.value}`)
      .join(', ');

    return [
      {
        certId: 'software-dev-cert',
        subject: subjectStr,
        issuer: issuerStr,
        serialNumber: cert.serialNumber,
        validFrom: cert.validity.notBefore.toISOString(),
        validTo: cert.validity.notAfter.toISOString(),
        fingerprintSha256,
        certDerBase64,
      },
    ];
  }

  async signDigest(params: SignDigestParams): Promise<SignDigestResult> {
    const { key } = this.loadPfx();
    const digestBytes = Buffer.from(params.digestBase64, 'base64').toString('binary');

    // Create a duck-typed message digest for node-forge PKCS#1 v1.5 signer
    const customMd = {
      algorithm: 'sha256',
      blockLength: 64,
      digestLength: 32,
      digest: () => ({
        getBytes: () => digestBytes,
      }),
    };

    const signatureBinary = key.sign(customMd as any);
    const signatureBase64 = Buffer.from(signatureBinary, 'binary').toString('base64');

    return { signatureBase64 };
  }
}
