import {
  SignerProvider,
  CertificateDescriptor,
  SignDigestParams,
  SignDigestResult,
  NotAvailableError,
} from './signer.interface';

export class TokenSignerProvider implements SignerProvider {
  public readonly id = 'token' as const;

  async health(): Promise<{ available: boolean; detail?: string }> {
    return {
      available: false,
      detail: 'USB Token connector is not configured',
    };
  }

  async listCertificates(): Promise<CertificateDescriptor[]> {
    throw new NotAvailableError(
      'USB Token Signer is not configured. Please install and configure the local hardware connector.'
    );
  }

  async signDigest(_params: SignDigestParams): Promise<SignDigestResult> {
    throw new NotAvailableError(
      'USB Token Signer is not configured. Cannot perform hardware token signature.'
    );
  }
}
