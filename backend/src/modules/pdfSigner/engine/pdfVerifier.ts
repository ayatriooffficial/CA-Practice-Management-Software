import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import forge from 'node-forge';

export interface VerificationReport {
  isSigned: boolean;
  isValid: boolean;
  coversWholeFile: boolean;
  contentTampered: boolean;
  signatureTampered: boolean;
  signingTime: string | null;
  signer: {
    commonName: string;
    subject: string;
    issuer: string;
    serialNumber: string;
    validFrom: string;
    validTo: string;
    isValidAtSigningTime: boolean;
    isExpiredNow: boolean;
  } | null;
  trust: {
    status: 'trusted' | 'unknown_signer' | 'untrusted';
    description: string;
  };
  details: {
    byteRange: number[];
    fileSize: number;
    expectedDigestHex: string;
    computedDigestHex: string;
  } | null;
  tamperReason?: string;
  error?: string;
}


export class PdfVerifier {
  static verifyPdf(pdfBuffer: Buffer): VerificationReport {
    try {
      // 1. Locate ByteRange and Contents in PDF buffer
      const byteRangeMatch = pdfBuffer.toString('latin1').match(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/);
      if (!byteRangeMatch) {
        return {
          isSigned: false,
          isValid: false,
          coversWholeFile: false,
          contentTampered: false,
          signatureTampered: false,
          signingTime: null,
          signer: null,
          trust: { status: 'untrusted', description: 'No digital signature found in document' },
          details: null,
          error: 'No /ByteRange signature dictionary found in document.',
        };
      }

      const offset1 = parseInt(byteRangeMatch[1], 10);
      const len1 = parseInt(byteRangeMatch[2], 10);
      const offset2 = parseInt(byteRangeMatch[3], 10);
      const len2 = parseInt(byteRangeMatch[4], 10);
      const byteRange = [offset1, len1, offset2, len2];

      const coversWholeFile = offset1 === 0 && offset2 + len2 === pdfBuffer.length;

      // Extract /Contents <HEX>
      const contentsHeader = Buffer.from('/Contents <');
      const contentsIdx = pdfBuffer.indexOf(contentsHeader);
      if (contentsIdx === -1) {
        throw new Error('Missing /Contents field in signature dictionary');
      }

      const openAngleIdx = contentsIdx + contentsHeader.length - 1; // position of '<'
      const closeAngleIdx = pdfBuffer.indexOf('>', openAngleIdx);
      if (openAngleIdx === -1 || closeAngleIdx === -1) {
        throw new Error('Malformed /Contents hex string delimiters');
      }

      const rawHex = pdfBuffer.toString('latin1', openAngleIdx + 1, closeAngleIdx).trim();
      const allBytes = forge.util.hexToBytes(rawHex);
      // Read exact DER structure length from ASN.1 header to strip placeholder padding
      let exactLen = allBytes.length;
      if (allBytes.charCodeAt(0) === 0x30 /* SEQUENCE */) {
        const b1 = allBytes.charCodeAt(1);
        if ((b1 & 0x80) === 0) {
          exactLen = 2 + b1;
        } else {
          const numLenBytes = b1 & 0x7f;
          let len = 0;
          for (let i = 0; i < numLenBytes; i++) {
            len = (len << 8) | allBytes.charCodeAt(2 + i);
          }
          exactLen = 2 + numLenBytes + len;
        }
      }

      const cmsDerBinary = allBytes.slice(0, exactLen);
      const p7Asn1 = forge.asn1.fromDer(cmsDerBinary);
      const p7: any = forge.pkcs7.messageFromAsn1(p7Asn1);

      if (!p7.certificates || p7.certificates.length === 0) {
        throw new Error('PKCS#7 signature contains no embedded certificates');
      }

      const cert = p7.certificates[0];
      const si = p7.rawCapture?.signerInfos?.[0];
      if (!si) {
        throw new Error('No SignerInfo structure found in PKCS#7');
      }

      // Recompute document hash over ByteRange
      const part1 = pdfBuffer.subarray(offset1, offset1 + len1);
      const part2 = pdfBuffer.subarray(offset2, offset2 + len2);
      const signedContent = Buffer.concat([part1, part2]);
      const computedHashBinary = crypto.createHash('sha256').update(signedContent).digest('binary');
      const computedHashHex = Buffer.from(computedHashBinary, 'binary').toString('hex');

      // Find authenticatedAttributes (tagClass: 128, type: 0) and signature (tagClass: 0, type: 4)
      const authAttrsAsn1 = si.value.find((v: any) => v.tagClass === 128 && v.type === 0);
      const sigAsn1 = si.value.find((v: any) => v.tagClass === 0 && v.type === 4);
      if (!authAttrsAsn1 || !sigAsn1) {
        throw new Error('SignerInfo is missing authenticatedAttributes or signatureValue');
      }

      const rawSignature = sigAsn1.value;

      // Extract messageDigest and signingTime from authenticatedAttributes
      let expectedHashBinary = '';
      let signingTime: Date | null = null;

      for (const attr of authAttrsAsn1.value) {
        if (attr.type === forge.asn1.Type.SEQUENCE && attr.value) {
          const oid = forge.asn1.derToOid(attr.value[0]?.value);
          if (oid === forge.pki.oids.messageDigest) {
            expectedHashBinary = attr.value[1]?.value?.[0]?.value || '';
          } else if (oid === forge.pki.oids.signingTime) {
            const timeVal = attr.value[1]?.value?.[0]?.value;
            if (timeVal) {
              const match = String(timeVal).match(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/);
              if (match) {
                const y = parseInt(match[1], 10) + (parseInt(match[1], 10) < 50 ? 2000 : 1900);
                const m = parseInt(match[2], 10) - 1;
                const d = parseInt(match[3], 10);
                const h = parseInt(match[4], 10);
                const min = parseInt(match[5], 10);
                const s = parseInt(match[6], 10);
                signingTime = new Date(Date.UTC(y, m, d, h, min, s));
              } else {
                signingTime = new Date(timeVal);
              }
            }
          }
        }
      }

      const expectedHashHex = Buffer.from(expectedHashBinary, 'binary').toString('hex');
      const contentTampered = expectedHashBinary !== computedHashBinary;

      // Verify the cryptographic signature:
      // Convert authenticatedAttributes into SET OF (universal tag 17) and compute SHA-256
      const setOfAttrs = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, authAttrsAsn1.value);
      const setOfDer = forge.asn1.toDer(setOfAttrs).getBytes();
      const attrDigestBinary = crypto.createHash('sha256').update(Buffer.from(setOfDer, 'binary')).digest('binary');

      let signatureValid = false;
      try {
        signatureValid = cert.publicKey.verify(attrDigestBinary, rawSignature);
      } catch {
        signatureValid = false;
      }

      const signatureTampered = !signatureValid;
      const isValid = !contentTampered && signatureValid;

      // Check dates
      const notBefore = cert.validity.notBefore;
      const notAfter = cert.validity.notAfter;
      const now = new Date();
      const isValidAtSigningTime = signingTime ? signingTime >= notBefore && signingTime <= notAfter : true;
      const isExpiredNow = now > notAfter;

      // Check trusted roots directory
      const trustStatus = this.checkTrustRoot(cert);

      const cn = cert.subject.getField('CN')?.value || 'Signer';
      const subjectStr = cert.subject.attributes
        .map((a: any) => `${a.shortName || a.name || 'attr'}=${a.value}`)
        .join(', ');
      const issuerStr = cert.issuer.attributes
        .map((a: any) => `${a.shortName || a.name || 'attr'}=${a.value}`)
        .join(', ');

      let tamperReason: string | undefined = undefined;
      if (contentTampered) {
        tamperReason = 'Content Hash Mismatch: The document content was modified after signing. The SHA-256 byte digest of the current document does not match the sealed cryptographic digest.';
      } else if (signatureTampered) {
        tamperReason = 'RSA Signature Broken: The cryptographic signature failed mathematical verification with the signer\'s public key. The signature bytes were corrupted or forged.';
      } else if (!coversWholeFile) {
        tamperReason = 'Document Boundary Violation: Bytes or incremental revisions were appended to the PDF outside the signed byte range.';
      }

      return {
        isSigned: true,
        isValid,
        coversWholeFile,
        contentTampered,
        signatureTampered,
        signingTime: signingTime ? signingTime.toISOString() : null,
        signer: {
          commonName: String(cn),
          subject: subjectStr,
          issuer: issuerStr,
          serialNumber: cert.serialNumber,
          validFrom: notBefore.toISOString(),
          validTo: notAfter.toISOString(),
          isValidAtSigningTime,
          isExpiredNow,
        },
        trust: trustStatus,
        details: {
          byteRange,
          fileSize: pdfBuffer.length,
          expectedDigestHex: expectedHashHex,
          computedDigestHex: computedHashHex,
        },
        tamperReason,
      };
    } catch (err: any) {
      return {
        isSigned: false,
        isValid: false,
        coversWholeFile: false,
        contentTampered: false,
        signatureTampered: false,
        signingTime: null,
        signer: null,
        trust: { status: 'untrusted', description: err?.message || 'Verification failed' },
        details: null,
        tamperReason: 'No Valid Signature Block: The document has no valid PKCS#7 signature or was converted from another format (e.g. Word), which stripped the digital signature.',
        error: err?.message || 'Failed to parse digital signature',
      };
    }

  }

  private static checkTrustRoot(cert: forge.pki.Certificate): {
    status: 'trusted' | 'unknown_signer' | 'untrusted';
    description: string;
  } {
    const trustedRootsDir = path.resolve(process.cwd(), './certs/trusted-roots');
    if (fs.existsSync(trustedRootsDir)) {
      const files = fs.readdirSync(trustedRootsDir).filter((f) => f.endsWith('.pem') || f.endsWith('.crt'));
      for (const file of files) {
        try {
          const rootPem = fs.readFileSync(path.join(trustedRootsDir, file), 'utf8');
          const rootCert = forge.pki.certificateFromPem(rootPem);
          if (rootCert.verify(cert)) {
            return {
              status: 'trusted',
              description: `Verified against trusted root certificate: ${file}`,
            };
          }
        } catch {
          // continue checking other roots
        }
      }
    }

    return {
      status: 'unknown_signer',
      description: 'Unknown Signer: Self-signed certificate or untrusted root (expected for development tokens)',
    };
  }
}
