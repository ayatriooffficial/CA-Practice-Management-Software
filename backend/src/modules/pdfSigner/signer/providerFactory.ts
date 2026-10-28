import { env } from '../../../config/env';
import { SignerProvider } from './signer.interface';
import { SoftwareSignerProvider } from './softwareSigner.provider';
import { TokenSignerProvider } from './tokenSigner.provider';

let activeProvider: SignerProvider | null = null;

export function getSignerProvider(): SignerProvider {
  if (activeProvider) {
    return activeProvider;
  }

  const providerType = (env.PDF_SIGNER_PROVIDER || 'software').toLowerCase();
  if (providerType === 'token') {
    activeProvider = new TokenSignerProvider();
  } else {
    activeProvider = new SoftwareSignerProvider();
  }

  return activeProvider;
}

/**
 * Helper to reset provider instance (useful for testing or dynamic switching in dev)
 */
export function setSignerProvider(provider: SignerProvider | null) {
  activeProvider = provider;
}
