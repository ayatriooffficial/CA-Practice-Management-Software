const express = require('express');
const cors = require('cors');
const pkcs11js = require('pkcs11js');
const forge = require('node-forge');
const fs = require('fs');

const app = express();
const PORT = 8081;
const USE_MOCK_DATA = false;

// 1. Chrome Private Network Access (PNA) Headers MUST come before standard CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, *');
    return res.sendStatus(204);
  }
  next();
});

// 2. Standard CORS for Vercel communication
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check route for Next.js polling
app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Exhaustive Indian CA driver DLL paths (System32, SysWOW64, and Program Files)
const dllPaths = [
  // Core System32 and SysWOW64 paths (ePass2003, ProxKey, HyperPKI, mToken, Shuttle, eToken, SafeSign)
  'C:\\Windows\\System32\\eps2003csp11.dll',
  'C:\\Windows\\SysWOW64\\eps2003csp11.dll',
  'C:\\Windows\\System32\\eps2003csp11_v2.dll',
  'C:\\Windows\\SysWOW64\\eps2003csp11_v2.dll',
  'C:\\Windows\\System32\\Watchdata PROXKey\\SignatureP11.dll',
  'C:\\Windows\\SysWOW64\\Watchdata PROXKey\\SignatureP11.dll',
  'C:\\Windows\\System32\\proxpkcs11.dll',
  'C:\\Windows\\SysWOW64\\proxpkcs11.dll',
  'C:\\Windows\\System32\\wdpkcs.dll',
  'C:\\Windows\\SysWOW64\\wdpkcs.dll',
  'C:\\Windows\\System32\\wdpkcs_icp.dll',
  'C:\\Windows\\SysWOW64\\wdpkcs_icp.dll',
  'C:\\Windows\\System32\\hyp2003pkcs11.dll',
  'C:\\Windows\\SysWOW64\\hyp2003pkcs11.dll',
  'C:\\Windows\\System32\\hyp2003csp11.dll',
  'C:\\Windows\\SysWOW64\\hyp2003csp11.dll',
  'C:\\Windows\\System32\\mTokenPKCS11.dll',
  'C:\\Windows\\SysWOW64\\mTokenPKCS11.dll',
  'C:\\Windows\\System32\\mtoken_pkcs11.dll',
  'C:\\Windows\\SysWOW64\\mtoken_pkcs11.dll',
  'C:\\Windows\\System32\\mTokenCryptoID11.dll',
  'C:\\Windows\\SysWOW64\\mTokenCryptoID11.dll',
  'C:\\Windows\\System32\\cryptoID_pkcs11.dll',
  'C:\\Windows\\SysWOW64\\cryptoID_pkcs11.dll',
  'C:\\Windows\\System32\\ShuttleCsp11_3003.dll',
  'C:\\Windows\\SysWOW64\\ShuttleCsp11_3003.dll',
  'C:\\Windows\\System32\\eToken.dll',
  'C:\\Windows\\SysWOW64\\eToken.dll',
  'C:\\Windows\\System32\\eTPKCS11.dll',
  'C:\\Windows\\SysWOW64\\eTPKCS11.dll',
  'C:\\Windows\\System32\\aetpkss1.dll',
  'C:\\Windows\\SysWOW64\\aetpkss1.dll',
  'C:\\Windows\\System32\\akisp11.dll',
  'C:\\Windows\\SysWOW64\\akisp11.dll',

  // Program Files Vendor Installations
  'C:\\Program Files\\Watchdata\\Watchdata India PKI Client\\SignatureP11.dll',
  'C:\\Program Files (x86)\\Watchdata\\Watchdata India PKI Client\\SignatureP11.dll',
  'C:\\Program Files\\PROXKey\\SignatureP11.dll',
  'C:\\Program Files (x86)\\PROXKey\\SignatureP11.dll',
  'C:\\Program Files\\ePass2003 India\\eps2003csp11.dll',
  'C:\\Program Files (x86)\\ePass2003 India\\eps2003csp11.dll',
  'C:\\Program Files\\EnterSafe\\ePass2003\\eps2003csp11.dll',
  'C:\\Program Files (x86)\\EnterSafe\\ePass2003\\eps2003csp11.dll',
  'C:\\Program Files\\HyperPKI\\hyp2003pkcs11.dll',
  'C:\\Program Files (x86)\\HyperPKI\\hyp2003pkcs11.dll',
  'C:\\Program Files\\mToken\\mtoken_pkcs11.dll',
  'C:\\Program Files (x86)\\mToken\\mtoken_pkcs11.dll',
  'C:\\Program Files\\mToken CryptoID\\mTokenCryptoID11.dll',
  'C:\\Program Files (x86)\\mToken CryptoID\\mTokenCryptoID11.dll',
  'C:\\Program Files\\SafeNet\\Authentication\\SAC\\x86\\eTPKCS11.dll',
  'C:\\Program Files (x86)\\SafeNet\\Authentication\\SAC\\x64\\eTPKCS11.dll'
];

// PKCS#11 hardware interface
app.get('/read-dsc', (req, res) => {
  if (USE_MOCK_DATA) {
    return res.status(200).json({
      name: 'Vedang Mock User',
      issuer: 'eMudhra Sub-CA for Class 3 Individual',
      expiryDate: '2028-10-30T00:00:00.000Z',
      serialNumber: 'MOCK-DSC-987654321',
      issuedDate: '2025-10-30T00:00:00.000Z',
    });
  }

  const pkcs11 = new pkcs11js.PKCS11();

  let driverLoaded = false;
  let activeDriver = '';

  for (const dllPath of dllPaths) {
    try {
      if (!fs.existsSync(dllPath)) continue;
      pkcs11.load(dllPath);
      pkcs11.C_Initialize();
      driverLoaded = true;
      activeDriver = dllPath;
      break;
    } catch (err) {
      // Silently try next path
    }
  }

  if (!driverLoaded) {
    return res.status(404).send('No supported DSC driver found.');
  }

  let slots;
  try {
    slots = pkcs11.C_GetSlotList(true);
  } catch (err) {
    try { pkcs11.C_Finalize(); } catch (e) {}
    return res.status(500).send(err.message || 'Error getting slot list.');
  }

  if (!slots || slots.length === 0) {
    try { pkcs11.C_Finalize(); } catch (e) {}
    return res.status(404).send('No USB token inserted.');
  }

  let session;
  try {
    session = pkcs11.C_OpenSession(slots[0], pkcs11js.CKF_SERIAL_SESSION);
    pkcs11.C_FindObjectsInit(session, [
      { type: pkcs11js.CKA_CLASS, value: pkcs11js.CKO_CERTIFICATE },
    ]);

    const certObj = pkcs11.C_FindObjects(session);
    pkcs11.C_FindObjectsFinal(session);

    const certHandle = Array.isArray(certObj) ? certObj[0] : certObj;
    if (!certHandle) return res.status(404).send('No certificate found on token.');

    const attrs = pkcs11.C_GetAttributeValue(session, certHandle, [
      { type: pkcs11js.CKA_VALUE },
    ]);
    const buffer = attrs[0].value;

    const cert = forge.pki.certificateFromAsn1(
      forge.asn1.fromDer(buffer.toString('binary'))
    );

    const name = cert.subject.getField('CN')?.value || '';
    const issuer = cert.issuer.getField('CN')?.value || '';
    const expiryDate = cert.validity.notAfter;
    const serialNumber = cert.serialNumber;
    const issuedDate = cert.validity.notBefore;

    return res.status(200).json({ name, issuer, expiryDate, serialNumber, issuedDate });
  } catch (err) {
    return res.status(500).send(err.message || 'Error communicating with USB token.');
  } finally {
    if (session) {
      try { pkcs11.C_CloseSession(session); } catch (e) {}
    }
    try { pkcs11.C_Finalize(); } catch (e) {}
  }
});

app.listen(PORT, () => {
  console.log(`DSC Connector server is running on http://127.0.0.1:${PORT}`);
});

module.exports = app;
