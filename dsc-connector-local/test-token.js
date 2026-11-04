const fs = require('fs');
const pkcs11js = require('pkcs11js');
const forge = require('node-forge');

console.log('=== DSC Token Diagnostic Tool ===');
console.log(`Node Architecture: ${process.arch}`);
console.log(`Node Version: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log('---------------------------------\n');

const path = require('path');

const baseDllPaths = [
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

const dllPaths = baseDllPaths;

let workingPkcs11 = null;
let loadedDllPath = null;

for (const dllPath of dllPaths) {
  console.log('Trying:', dllPath);
  const exists = fs.existsSync(dllPath);
  console.log('  File exists on disk:', exists);

  if (!exists) {
    console.error('  Failed: File does not exist at path');
    continue;
  }

  const pkcs11 = new pkcs11js.PKCS11();
  try {
    pkcs11.load(dllPath);
    console.log('  pkcs11.load() succeeded.');
  } catch (err) {
    console.error('  Failed:', err.message || err);
    continue;
  }

  try {
    pkcs11.C_Initialize();
    console.log('  pkcs11.C_Initialize() succeeded.');
    workingPkcs11 = pkcs11;
    loadedDllPath = dllPath;
    break;
  } catch (err) {
    console.error('  Failed C_Initialize:', err.message || err);
    try {
      pkcs11.close();
    } catch (_) {}
  }
}

if (!workingPkcs11) {
  console.error('\n[RESULT] No supported DSC driver DLL could be loaded and initialized.');
  process.exit(1);
}

console.log(`\n[SUCCESS] Successfully initialized PKCS#11 driver: ${loadedDllPath}`);

try {
  console.log('\n--- Checking Slots ---');
  let slots = [];
  try {
    // Get all slots first
    const allSlots = workingPkcs11.C_GetSlotList(false);
    console.log(`Total slots reported (tokenPresent=false): ${allSlots.length}`);
    
    // Get slots with token present
    slots = workingPkcs11.C_GetSlotList(true);
    console.log(`Slots with token present (tokenPresent=true): ${slots.length}`);
  } catch (err) {
    console.error('Failed getting slot list:', err.message || err);
    throw err;
  }

  if (slots.length === 0) {
    console.error('\n[ERROR] No USB token inserted or detected in slots.');
    process.exit(1);
  }

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    console.log(`\nInspecting Slot #${i}:`);
    try {
      const slotInfo = workingPkcs11.C_GetSlotInfo(slot);
      console.log('Slot Info:', {
        slotDescription: slotInfo.slotDescription ? slotInfo.slotDescription.toString().trim() : 'N/A',
        manufacturerID: slotInfo.manufacturerID ? slotInfo.manufacturerID.toString().trim() : 'N/A',
        flags: slotInfo.flags,
        hardwareVersion: slotInfo.hardwareVersion,
        firmwareVersion: slotInfo.firmwareVersion,
      });

      const tokenInfo = workingPkcs11.C_GetTokenInfo(slot);
      console.log('Token Info:', {
        label: tokenInfo.label ? tokenInfo.label.toString().trim() : 'N/A',
        manufacturerID: tokenInfo.manufacturerID ? tokenInfo.manufacturerID.toString().trim() : 'N/A',
        model: tokenInfo.model ? tokenInfo.model.toString().trim() : 'N/A',
        serialNumber: tokenInfo.serialNumber ? tokenInfo.serialNumber.toString().trim() : 'N/A',
        flags: tokenInfo.flags,
      });
    } catch (err) {
      console.error('Failed reading slot/token info:', err.message || err);
    }

    console.log('\n--- Opening Session and Reading Certificate ---');
    let session = null;
    try {
      session = workingPkcs11.C_OpenSession(slot, pkcs11js.CKF_SERIAL_SESSION);
      console.log('Session opened successfully.');

      workingPkcs11.C_FindObjectsInit(session, [
        { type: pkcs11js.CKA_CLASS, value: pkcs11js.CKO_CERTIFICATE }
      ]);

      const certObjs = [];
      let obj;
      while ((obj = workingPkcs11.C_FindObjects(session, 1)) && obj.length > 0) {
        certObjs.push(obj[0]);
      }
      workingPkcs11.C_FindObjectsFinal(session);

      console.log(`Found ${certObjs.length} certificate object(s) in slot.`);

      if (certObjs.length === 0) {
        console.error('Failed: No certificate found on token in this slot.');
        continue;
      }

      for (let cIdx = 0; cIdx < certObjs.length; cIdx++) {
        const certHandle = certObjs[cIdx];
        console.log(`\nReading Certificate #${cIdx + 1}...`);
        try {
          const attrs = workingPkcs11.C_GetAttributeValue(session, certHandle, [
            { type: pkcs11js.CKA_VALUE }
          ]);

          if (!attrs || !attrs[0] || !attrs[0].value) {
            console.error('Failed: Certificate attribute CKA_VALUE is empty or unreadable.');
            continue;
          }

          const buffer = attrs[0].value;
          const cert = forge.pki.certificateFromAsn1(
            forge.asn1.fromDer(buffer.toString('binary'))
          );

          console.log('\n*** CERTIFICATE DETAILS ***');
          console.log('Subject Common Name (CN):', cert.subject.getField('CN')?.value || 'N/A');
          console.log('Issuer Common Name (CN):', cert.issuer.getField('CN')?.value || 'N/A');
          console.log('Valid From:', cert.validity.notBefore);
          console.log('Valid Until:', cert.validity.notAfter);
          console.log('Serial Number:', cert.serialNumber);
          console.log('***************************');
        } catch (certErr) {
          console.error('Failed reading/parsing certificate:', certErr.message || certErr);
        }
      }
    } catch (sessionErr) {
      console.error('Failed during session or cert retrieval:', sessionErr.message || sessionErr);
    } finally {
      if (session) {
        try {
          workingPkcs11.C_CloseSession(session);
          console.log('Session closed.');
        } catch (e) {
          console.error('Failed closing session:', e.message || e);
        }
      }
    }
  }
} catch (err) {
  console.error('Fatal error during token inspection:', err.message || err);
} finally {
  try {
    workingPkcs11.C_Finalize();
    console.log('\nPKCS#11 finalized successfully.');
  } catch (e) {
    console.error('Failed finalizing PKCS#11:', e.message || e);
  }
}
