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
  // --- 1. Feitian ePass2003 / Auto / SKF (eMudhra, Capricorn, VSign) ---
  'C:\\Windows\\System32\\eps2003csp11.dll',
  'C:\\Windows\\SysWOW64\\eps2003csp11.dll',
  'C:\\Windows\\System32\\eps2003csp11v2.dll',
  'C:\\Windows\\SysWOW64\\eps2003csp11v2.dll',
  'C:\\Windows\\System32\\eps2003csp11_v2.dll',
  'C:\\Windows\\SysWOW64\\eps2003csp11_v2.dll',
  'C:\\Windows\\System32\\eps2003pkiP11.dll',
  'C:\\Windows\\SysWOW64\\eps2003pkiP11.dll',
  'C:\\Windows\\System32\\ep2003pkcs11.dll',
  'C:\\Windows\\SysWOW64\\ep2003pkcs11.dll',
  'C:\\Windows\\System32\\skf.dll',
  'C:\\Windows\\SysWOW64\\skf.dll',
  'C:\\Windows\\System32\\libcastle.dll',
  'C:\\Windows\\SysWOW64\\libcastle.dll',

  // --- 2. Watchdata PROXKey / WD Serial Series (eMudhra, Pantasign, NCode) ---
  'C:\\Windows\\System32\\Watchdata PROXKey\\SignatureP11.dll',
  'C:\\Windows\\SysWOW64\\Watchdata PROXKey\\SignatureP11.dll',
  'C:\\Windows\\System32\\proxpkcs11.dll',
  'C:\\Windows\\SysWOW64\\proxpkcs11.dll',
  'C:\\Windows\\System32\\proxpkcs11_v2.dll',
  'C:\\Windows\\SysWOW64\\proxpkcs11_v2.dll',
  'C:\\Windows\\System32\\wdpkcs.dll',
  'C:\\Windows\\SysWOW64\\wdpkcs.dll',
  'C:\\Windows\\System32\\wdpkcs_Proxkey.dll',
  'C:\\Windows\\SysWOW64\\wdpkcs_Proxkey.dll',
  'C:\\Windows\\System32\\wdpkcs11.dll',
  'C:\\Windows\\SysWOW64\\wdpkcs11.dll',
  'C:\\Windows\\System32\\wdpkcs_icp.dll',
  'C:\\Windows\\SysWOW64\\wdpkcs_icp.dll',

  // --- 3. Hypersecu HyperPKI HYP2003 (Capricorn, Pantasign, Sify) ---
  'C:\\Windows\\System32\\hyp2003pkcs11.dll',
  'C:\\Windows\\SysWOW64\\hyp2003pkcs11.dll',
  'C:\\Windows\\System32\\hyp2003csp11.dll',
  'C:\\Windows\\SysWOW64\\hyp2003csp11.dll',

  // --- 4. Longmai mToken / CryptoID (IDSign, Govt Portals) ---
  'C:\\Windows\\System32\\mTokenPKCS11.dll',
  'C:\\Windows\\SysWOW64\\mTokenPKCS11.dll',
  'C:\\Windows\\System32\\mtoken_pkcs11.dll',
  'C:\\Windows\\SysWOW64\\mtoken_pkcs11.dll',
  'C:\\Windows\\System32\\mtpkcs11.dll',
  'C:\\Windows\\SysWOW64\\mtpkcs11.dll',
  'C:\\Windows\\System32\\mTokenCryptoID11.dll',
  'C:\\Windows\\SysWOW64\\mTokenCryptoID11.dll',
  'C:\\Windows\\System32\\cryptoID_pkcs11.dll',
  'C:\\Windows\\SysWOW64\\cryptoID_pkcs11.dll',

  // --- 5. Shuttle / eM-Pass ---
  'C:\\Windows\\System32\\ShuttleCsp11_3003.dll',
  'C:\\Windows\\SysWOW64\\ShuttleCsp11_3003.dll',
  'C:\\Windows\\System32\\ShuttleCsp11.dll',
  'C:\\Windows\\SysWOW64\\ShuttleCsp11.dll',

  // --- 6. SafeNet / Aladdin eToken (Thales & Gemalto) ---
  'C:\\Windows\\System32\\eToken.dll',
  'C:\\Windows\\SysWOW64\\eToken.dll',
  'C:\\Windows\\System32\\eTPKCS11.dll',
  'C:\\Windows\\SysWOW64\\eTPKCS11.dll',
  'C:\\Windows\\System32\\etpkcs11.dll',
  'C:\\Windows\\SysWOW64\\etpkcs11.dll',

  // --- 7. TrustKey / SafeSign / Gemalto / Nexus ---
  'C:\\Windows\\System32\\aetpkss1.dll',
  'C:\\Windows\\SysWOW64\\aetpkss1.dll',
  'C:\\Windows\\System32\\akisp11.dll',
  'C:\\Windows\\SysWOW64\\akisp11.dll',
  'C:\\Windows\\System32\\ngp11v211.dll',
  'C:\\Windows\\SysWOW64\\ngp11v211.dll',
  'C:\\Windows\\System32\\gpkcs11.dll',
  'C:\\Windows\\SysWOW64\\gpkcs11.dll',
  'C:\\Windows\\System32\\idp11.dll',
  'C:\\Windows\\SysWOW64\\idp11.dll',
  'C:\\Windows\\System32\\idp11_32.dll',
  'C:\\Windows\\SysWOW64\\idp11_32.dll',
  'C:\\Windows\\System32\\idp11_64.dll',
  'C:\\Windows\\SysWOW64\\idp11_64.dll',

  // --- 8. Specific Local Vendor Installation Folders ---
  'C:\\Program Files\\ePass2003\\pkcs11\\eps2003pkiP11.dll',
  'C:\\Program Files (x86)\\ePass2003\\pkcs11\\eps2003pkiP11.dll',
  'C:\\Program Files\\HyperPKI\\eps2003csp11v2.dll',
  'C:\\Program Files (x86)\\HyperPKI\\eps2003csp11v2.dll',
  'C:\\Program Files\\Watchdata\\ProxKey\\wdpkcs.dll',
  'C:\\Program Files (x86)\\Watchdata\\ProxKey\\wdpkcs.dll',
  'C:\\Program Files\\Watchdata\\PROXKey Token Tool\\SignatureP11.dll',
  'C:\\Program Files (x86)\\Watchdata\\PROXKey Token Tool\\SignatureP11.dll',
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
  'C:\\Program Files\\SafeNet\\Authentication\\SAC\\x64\\eTPKCS11.dll',
  'C:\\Program Files (x86)\\SafeNet\\Authentication\\SAC\\x86\\eTPKCS11.dll'
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

  let foundCertData = null;
  let driverFoundOnDisk = false;
  let lastErrorMsg = '';

  for (const dllPath of dllPaths) {
    if (!fs.existsSync(dllPath)) continue;
    driverFoundOnDisk = true;

    const pkcs11 = new pkcs11js.PKCS11();
    try {
      pkcs11.load(dllPath);
    } catch (loadErr) {
      continue;
    }

    try {
      pkcs11.C_Initialize();
    } catch (initErr) {
      try { pkcs11.close(); } catch (_) {}
      continue;
    }

    try {
      let slots = [];
      try {
        slots = pkcs11.C_GetSlotList(true);
      } catch (slotErr) {
        slots = [];
      }

      if (!slots || slots.length === 0) {
        // Token is not present in this driver's slots; finalize and try next driver
        try { pkcs11.C_Finalize(); } catch (_) {}
        try { pkcs11.close(); } catch (_) {}
        continue;
      }

      // Found a driver with an active token in a slot
      for (const slot of slots) {
        let session = null;
        try {
          session = pkcs11.C_OpenSession(slot, pkcs11js.CKF_SERIAL_SESSION);
          pkcs11.C_FindObjectsInit(session, [
            { type: pkcs11js.CKA_CLASS, value: pkcs11js.CKO_CERTIFICATE },
          ]);

          const certObjs = [];
          let obj;
          while ((obj = pkcs11.C_FindObjects(session, 1)) && obj.length > 0) {
            certObjs.push(obj[0]);
          }
          pkcs11.C_FindObjectsFinal(session);

          if (certObjs.length === 0) continue;

          // Parse all certificates to accurately identify the signatory's end-entity cert
          const parsedCerts = [];
          for (const certHandle of certObjs) {
            try {
              const attrs = pkcs11.C_GetAttributeValue(session, certHandle, [
                { type: pkcs11js.CKA_VALUE },
              ]);
              if (!attrs || !attrs[0] || !attrs[0].value) continue;

              const buffer = attrs[0].value;
              const cert = forge.pki.certificateFromAsn1(
                forge.asn1.fromDer(buffer.toString('binary'))
              );

              const name = cert.subject.getField('CN')?.value || '';
              const issuer = cert.issuer.getField('CN')?.value || '';
              const expiryDate = cert.validity.notAfter;
              const issuedDate = cert.validity.notBefore;
              const serialNumber = cert.serialNumber || '';

              // Check if certificate is an Intermediate / Root CA rather than the person's cert
              const isSelfSigned = name && issuer && name.toLowerCase() === issuer.toLowerCase();
              const hasCaKeyword = name && /sub-?ca|root\s*ca|certifying\s*authority|cca\s*india/i.test(name);
              const isCaExtension = cert.extensions && cert.extensions.some(
                (ext) => ext.name === 'basicConstraints' && ext.cA === true
              );
              const isCA = isSelfSigned || hasCaKeyword || isCaExtension;

              parsedCerts.push({
                name,
                issuer,
                expiryDate,
                issuedDate,
                serialNumber,
                isCA,
              });
            } catch (certErr) {
              // Ignore unparseable certificate objects
            }
          }

          if (parsedCerts.length > 0) {
            // Prioritize user certificate (non-CA)
            const userCert = parsedCerts.find((c) => !c.isCA) || parsedCerts[0];
            foundCertData = {
              name: userCert.name,
              issuer: userCert.issuer,
              expiryDate: userCert.expiryDate,
              serialNumber: userCert.serialNumber,
              issuedDate: userCert.issuedDate,
              driver: dllPath,
            };
            break; // Found cert in this slot
          }
        } catch (sessErr) {
          lastErrorMsg = sessErr.message || String(sessErr);
        } finally {
          if (session) {
            try { pkcs11.C_CloseSession(session); } catch (_) {}
          }
        }
      }

      try { pkcs11.C_Finalize(); } catch (_) {}
      try { pkcs11.close(); } catch (_) {}

      if (foundCertData) {
        break; // Successfully extracted certificate details
      }
    } catch (driverErr) {
      lastErrorMsg = driverErr.message || String(driverErr);
      try { pkcs11.C_Finalize(); } catch (_) {}
      try { pkcs11.close(); } catch (_) {}
    }
  }

  if (foundCertData) {
    return res.status(200).json(foundCertData);
  }

  if (!driverFoundOnDisk) {
    return res.status(404).send('No supported DSC token driver found on this system. Please install the vendor PKI client.');
  }

  return res.status(404).send(lastErrorMsg || 'No USB token inserted. Please connect your DSC USB token and try again.');
});

app.listen(PORT, () => {
  console.log(`DSC Connector server is running on http://127.0.0.1:${PORT}`);
});

module.exports = app;
