const express = require('express');
const cors = require('cors');
const pkcs11js = require('pkcs11js');
const forge = require('node-forge');

const app = express();
const PORT = 8081;
const USE_MOCK_DATA = false;

// Enable CORS for all origins
app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check route
app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// PKCS#11 hardware interface to detect and open a session with physical DSC USB tokens
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

  const dllPaths = [
    'C:\\Windows\\System32\\eps2003csp11.dll',
    'C:\\Windows\\System32\\ShuttleCsp11_3003.dll',
    'C:\\Windows\\System32\\proxpkcs11.dll',
    'C:\\Windows\\System32\\Watchdata PROXKey\\SignatureP11.dll',
  ];

  let driverLoaded = false;
  for (const dllPath of dllPaths) {
    try {
      pkcs11.load(dllPath);
      pkcs11.C_Initialize();
      driverLoaded = true;
      break;
    } catch (err) {
      // Continue trying next driver DLL
    }
  }

  if (!driverLoaded) {
    return res.status(404).send('No supported DSC driver found.');
  }

  let slots;
  try {
    slots = pkcs11.C_GetSlotList(true);
  } catch (err) {
    try {
      pkcs11.C_Finalize();
    } catch (e) {}
    return res.status(500).send(err.message || 'Error getting slot list.');
  }

  if (!slots || slots.length === 0) {
    try {
      pkcs11.C_Finalize();
    } catch (e) {}
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
    if (!certHandle) {
      return res.status(404).send('No certificate found on token.');
    }

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

    return res.status(200).json({
      name,
      issuer,
      expiryDate,
      serialNumber,
    });
  } catch (err) {
    return res.status(500).send(err.message || 'Error communicating with USB token.');
  } finally {
    if (session) {
      try {
        pkcs11.C_CloseSession(session);
      } catch (e) {}
    }
    try {
      pkcs11.C_Finalize();
    } catch (e) {}
  }
});

app.listen(PORT, () => {
  console.log(`DSC Connector server is running on http://127.0.0.1:${PORT}`);
});

module.exports = app;


