// CA Practice Extension - Multi-Portal Credential Manager

export class CredentialManager {
  /**
   * Extract portal-specific credentials from a client object.
   * Supports MCA, Income Tax, GST, and TRACES.
   */
  static extractCredentials(client, portalId = "mca") {
    if (!client) {
      return {
        portalId,
        userId: "",
        password: "",
        clientName: "",
        directorName: "",
        clientPan: "",
      };
    }

    const clientName = client.name || "Client";
    const clientPan = client.pan || "";

    switch (portalId.toLowerCase()) {
      case "mca":
        return this.extractMcaCredentials(client);

      case "incometax":
        return this.extractIncomeTaxCredentials(client);

      case "gst":
        return this.extractGstCredentials(client);

      case "traces":
        return this.extractTracesCredentials(client);

      default:
        return this.extractGenericCredentials(client, portalId);
    }
  }

  // 1. MCA Credentials (Directors, Promoters, Portal Passwords)
  static extractMcaCredentials(client) {
    let mcaId = "";
    let mcaPassword = "";
    let directorName = "";

    // 1. Check contacts / directors
    const contacts = client.contacts || [];
    for (const c of contacts) {
      if (c.mcaId || c.din) {
        mcaId = c.mcaId || c.din;
        mcaPassword = c.mcaPassword || "";
        directorName = c.name || "Director";
        if (mcaPassword) break;
      }
    }

    // 2. Check promoters
    if (!mcaPassword && client.customerFiles?.promoter) {
      for (const p of client.customerFiles.promoter) {
        if (p.mcaId) {
          if (!mcaId) mcaId = p.mcaId;
          if (!directorName) directorName = p.name || "Director";
          if (p.mcaPassword) {
            mcaPassword = p.mcaPassword;
            directorName = p.name || directorName;
            break;
          }
        }
      }
    }

    // 3. Check portal passwords
    if (!mcaPassword && client.passwords) {
      const mcaP = client.passwords.find((p) => (p.portal || "").toLowerCase().includes("mca"));
      if (mcaP) {
        if (!mcaId) mcaId = mcaP.userId || "";
        mcaPassword = mcaP.password || "";
        if (!directorName) directorName = mcaP.remarks || "MCA User";
      }
    }

    // 4. Check statutory
    if (!mcaPassword && client.customerFiles?.statutory) {
      const statP = client.customerFiles.statutory.find((s) => (s.type || "").toLowerCase().includes("mca"));
      if (statP) {
        if (!mcaId) mcaId = statP.userId || statP.idNo || "";
        mcaPassword = statP.password || "";
      }
    }

    return {
      portalId: "mca",
      userId: mcaId,
      mcaId,
      password: mcaPassword,
      mcaPassword,
      clientName: client.name || "Client",
      directorName: directorName || "Director",
      clientPan: client.pan || "",
    };
  }

  // 2. Income Tax Credentials (PAN / User ID, Password)
  static extractIncomeTaxCredentials(client) {
    let userId = client.pan || "";
    let password = "";

    // 1. Check passwords array
    if (client.passwords) {
      const itP = client.passwords.find((p) => {
        const portal = (p.portal || "").toLowerCase();
        return portal.includes("income tax") || portal.includes("itd") || portal.includes("incometax");
      });
      if (itP) {
        if (itP.userId) userId = itP.userId;
        password = itP.password || "";
      }
    }

    // 2. Check statutory files
    if (!password && client.customerFiles?.statutory) {
      const itStat = client.customerFiles.statutory.find((s) => {
        const t = (s.type || "").toLowerCase();
        return t.includes("income tax") || t.includes("pan") || t.includes("itd");
      });
      if (itStat) {
        if (itStat.userId) userId = itStat.userId;
        password = itStat.password || "";
      }
    }

    return {
      portalId: "incometax",
      userId,
      pan: userId,
      password,
      incomeTaxPassword: password,
      clientName: client.name || "Client",
      directorName: (client.contacts?.[0]?.name) || client.name || "Authorized Signatory",
      clientPan: client.pan || "",
    };
  }

  // 3. GST Credentials (GSTIN / Username, Password)
  static extractGstCredentials(client) {
    let userId = client.gstin || "";
    let password = "";

    if (client.passwords) {
      const gstP = client.passwords.find((p) => (p.portal || "").toLowerCase().includes("gst"));
      if (gstP) {
        if (gstP.userId) userId = gstP.userId;
        password = gstP.password || "";
      }
    }

    if (!password && client.customerFiles?.statutory) {
      const gstStat = client.customerFiles.statutory.find((s) => (s.type || "").toLowerCase().includes("gst"));
      if (gstStat) {
        if (gstStat.userId) userId = gstStat.userId;
        password = gstStat.password || "";
      }
    }

    return {
      portalId: "gst",
      userId,
      gstUsername: userId,
      password,
      gstPassword: password,
      clientName: client.name || "Client",
      directorName: (client.contacts?.[0]?.name) || client.name || "Authorized Signatory",
      clientPan: client.pan || "",
    };
  }

  // 4. TRACES Credentials (TAN / User ID, Password)
  static extractTracesCredentials(client) {
    let userId = client.tan || "";
    let password = "";

    if (client.passwords) {
      const tracesP = client.passwords.find((p) => {
        const portal = (p.portal || "").toLowerCase();
        return portal.includes("traces") || portal.includes("tds");
      });
      if (tracesP) {
        if (tracesP.userId) userId = tracesP.userId;
        password = tracesP.password || "";
      }
    }

    return {
      portalId: "traces",
      userId,
      tracesUserId: userId,
      password,
      tracesPassword: password,
      clientName: client.name || "Client",
      directorName: (client.contacts?.[0]?.name) || client.name || "Authorized Signatory",
      clientPan: client.pan || "",
    };
  }

  // 5. Generic Credential Extractor for any custom portal
  static extractGenericCredentials(client, portalKey) {
    let userId = "";
    let password = "";

    if (client.passwords) {
      const p = client.passwords.find((item) => (item.portal || "").toLowerCase().includes(portalKey.toLowerCase()));
      if (p) {
        userId = p.userId || "";
        password = p.password || "";
      }
    }

    return {
      portalId: portalKey,
      userId,
      password,
      clientName: client.name || "Client",
      directorName: (client.contacts?.[0]?.name) || client.name || "User",
      clientPan: client.pan || "",
    };
  }

  // Extract all available directors / signatories for switching in popup or floating widget
  static getClientDirectors(client) {
    if (!client) return [];
    const list = [];
    const seen = new Set();

    (client.contacts || []).forEach((c) => {
      const key = (c.name || "") + "|" + (c.din || c.mcaId || "");
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          name: c.name || "Director",
          din: c.din || c.mcaId || "",
          mcaId: c.mcaId || c.din || "",
          mcaPassword: c.mcaPassword || "",
          pan: c.pan || "",
          designation: c.designation || "Director",
          email: c.email || "",
          mobile: c.mobile || "",
        });
      }
    });

    (client.customerFiles?.promoter || []).forEach((p) => {
      const key = (p.name || "") + "|" + (p.mcaId || "");
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          name: p.name || "Promoter",
          din: p.mcaId || "",
          mcaId: p.mcaId || "",
          mcaPassword: p.mcaPassword || "",
          pan: p.pan || "",
          designation: p.designation || "Promoter",
          email: p.email || "",
          mobile: p.mobile || "",
        });
      }
    });

    return list;
  }
}
