export interface CertificateDescriptor {
  certId: string;
  subject: string;
  issuer: string;
  serialNumber: string;
  validFrom: string;
  validTo: string;
  fingerprintSha256: string;
  certDerBase64: string;
}

export interface SignDigestParams {
  certId: string;
  digestBase64: string;
  hashAlg?: 'SHA-256';
  keyAlg?: 'RSA-PKCS1-v1_5';
}

export interface SignDigestResult {
  signatureBase64: string;
}

export interface SignerHealth {
  available: boolean;
  provider: 'software' | 'token';
  detail?: string;
}

export class NotAvailableError extends Error {
  constructor(message = 'Signer provider is not available or not configured') {
    super(message);
    this.name = 'NotAvailableError';
  }
}

export interface SignerProvider {
  id: 'software' | 'token';
  health(): Promise<{ available: boolean; detail?: string }>;
  listCertificates(): Promise<CertificateDescriptor[]>;
  signDigest(params: SignDigestParams): Promise<SignDigestResult>;
}
