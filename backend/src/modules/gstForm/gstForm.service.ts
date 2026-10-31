import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Types } from 'mongoose';
import * as XLSX from 'xlsx';
import {
  GstFormLinkModel,
  GstFormDraftModel,
  GstFormSubmissionModel,
  Gstr1B2BModel,
  Gstr1B2clModel,
  Gstr1B2csModel,
  Gstr1CdnModel,
  Gstr1NilModel,
  Gstr1HsnModel,
  Gstr1DocIssueModel,
  Gstr3bSummaryModel,
  GstAuditLogModel,
  ClientImportMappingModel,
  ClientMasterSuggestionModel,
  GstImportBatchModel,
} from './gstForm.model';
import { Client } from '../client/client.model';
import {
  validateGstForms,
} from './gstForm.validation';
import {
  Gstr1Payload,
  Gstr3BPayload,
  TurnoverSlab,
  FilingFrequency,
  RegistrationType,
  ValidationReport,
} from './gstForm.interface';
import {
  COLUMN_SYNONYMS,
  DEFAULT_TAX_RATES,
  MASTER_UQC,
  DEFAULT_MASTER_HSN,
  NATURE_OF_DOCUMENTS,
  STATE_MAP,
} from './gstForm.constants';

// Helper: SHA-256 hash
export function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function parseCsvString(csvText: string): any[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const parseLine = (line: string): string[] => {
    const res: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQuotes = !inQuotes;
      else if (c === ',' && !inQuotes) {
        res.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    res.push(cur.trim());
    return res;
  };
  const headers = parseLine(lines[0]);
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    const row: any = {};
    headers.forEach((h, idx) => {
      row[h] = vals[idx] !== undefined ? vals[idx] : '';
    });
    rows.push(row);
  }
  return rows;
}

export class GstFormService {
  // 1. Generate Link for Client
  static async generateLink(params: {
    clientId: string;
    gstin: string;
    legalName: string;
    tradeName?: string;
    pan?: string;
    stateCode: string;
    returnPeriod: string; // MMYYYY
    filingFrequency?: FilingFrequency;
    turnoverSlab?: TurnoverSlab;
    registrationType?: RegistrationType;
    createdBy?: string;
    baseUrl?: string;
  }) {
    const {
      clientId,
      gstin,
      legalName,
      tradeName = '',
      stateCode,
      returnPeriod,
      filingFrequency = 'Monthly',
      turnoverSlab = 'Up to ₹5 crore',
      registrationType = 'Regular',
      createdBy,
      baseUrl = 'http://localhost:3000',
    } = params;

    // Invalidate any older active link for the same client + period
    const olderActiveLinks = await GstFormLinkModel.find({
      client_id: new Types.ObjectId(clientId),
      return_period: returnPeriod,
      status: 'ACTIVE',
    });

    // Verify client has GST return service active if serviceSettings exist
    try {
      const clientDoc = await Client.findById(clientId).select('serviceSettings services').lean();
      if (clientDoc) {
        const settings: any[] = (clientDoc as any).serviceSettings || [];
        if (settings.length > 0) {
          const gstServices = settings.filter((s: any) => {
            const n = (s.serviceName || s.name || '').toLowerCase();
            const c = (s.category || '').toLowerCase().replace(/[\.\s]/g, '');
            return (
              n.includes('gstr-1') ||
              n.includes('gstr1') ||
              n.includes('gstr-3b') ||
              n.includes('gstr3b') ||
              n.includes('gst monthly return') ||
              n.includes('gst return') ||
              (c === 'gst' && (n.includes('return') || n.includes('filing')))
            );
          });
          if (gstServices.length > 0) {
            const hasActiveGst = gstServices.some((s: any) => Boolean(s.isActive !== undefined ? s.isActive : s.compliance));
            if (!hasActiveGst) {
              throw {
                statusCode: 400,
                message: 'GST return filing service (GSTR-1 & GSTR-3B) is currently turned off in Service Settings for this client. Please enable it before generating collection links.',
              };
            }
          }
        }
      }
    } catch (err: any) {
      if (err.statusCode) throw err;
    }

    // 1. Determine client name slug for custom unique URL
    const rawName = legalName || tradeName || 'client';
    const slugName = rawName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'client';

    // 2. Determine PAN for custom unique URL
    let pan = '';
    if (params.pan && typeof params.pan === 'string') {
      pan = params.pan.trim().toUpperCase();
    } else {
      // Check client record in DB
      try {
        const clientRec = await Client.findById(clientId).select('pan').lean();
        if (clientRec?.pan) {
          pan = clientRec.pan.trim().toUpperCase();
        }
      } catch {
        // ignore
      }
      // If still empty, extract from 15-character GSTIN (chars 3 to 12)
      if (!pan && gstin && gstin.length >= 12) {
        pan = gstin.substring(2, 12).trim().toUpperCase();
      }
    }
    pan = pan.replace(/[^A-Z0-9]/g, '') || 'PAN';

    // 3. Cryptographically secure 16-hex unique identifier
    const randomEntropy = crypto.randomBytes(8).toString('hex');

    // 4. Construct custom unique token: e.g. "rajesh-kumar-sharma-AAACA1234A-4d8e7a1b9c2f5e3d"
    const rawToken = `${slugName}-${pan}-${randomEntropy}`;
    const tokenHash = sha256(rawToken);
    const expiresAt = null; // Links never expire
    const publicUrl = `${baseUrl}/gst-form/${rawToken}`;

    const normalizedTurnoverSlab = String(turnoverSlab || '').toLowerCase().includes('above')
      ? 'Above ₹5 crore'
      : 'Up to ₹5 crore';

    const newLink = await GstFormLinkModel.create({
      client_id: new Types.ObjectId(clientId),
      gstin: gstin.toUpperCase(),
      legal_name: legalName,
      trade_name: tradeName,
      state_code: stateCode,
      return_period: returnPeriod,
      filing_frequency: filingFrequency,
      aggregate_turnover_slab: normalizedTurnoverSlab,
      registration_type: registrationType,
      token_hash: tokenHash,
      custom_slug: rawToken,
      custom_url: publicUrl,
      status: 'ACTIVE',
      created_by: createdBy,
      expires_at: null,
    });

    // Mark older links as REVOKED / superseded
    if (olderActiveLinks.length > 0) {
      await GstFormLinkModel.updateMany(
        { _id: { $in: olderActiveLinks.map((l) => l._id) } },
        { status: 'REVOKED', revoked_at: new Date(), superseded_by: newLink._id }
      );
    }

    // Initialize blank draft
    const initialGstr1: Gstr1Payload = {
      is_nil: false,
      b2b: [],
      b2cl: [],
      b2cs: [],
      nil: [
        { sply_ty: 'INTRB2B', label: 'Inter-State supplies to registered persons', nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
        { sply_ty: 'INTRAB2B', label: 'Intra-State supplies to registered persons', nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
        { sply_ty: 'INTRB2C', label: 'Inter-State supplies to unregistered persons', nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
        { sply_ty: 'INTRAB2C', label: 'Intra-State supplies to unregistered persons', nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
      ],
      cdnr: [],
      cdnur: [],
      hsn_b2b: [],
      hsn_b2c: [],
      doc_issue: NATURE_OF_DOCUMENTS.map((nat) => ({
        doc_num: nat.id,
        name: nat.name,
        docs: [],
      })),
    };

    const initialGstr3B: Gstr3BPayload = {
      is_nil: false,
      table3_1: {
        osup_det: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
        osup_zero: { txval: 0, iamt: 0, csamt: 0 },
        osup_nil_exmp: { txval: 0 },
        isup_rev: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
        osup_nongst: { txval: 0 },
      },
      table3_2: [],
      table4: {
        itc_avl: {
          impg: { iamt: 0, csamt: 0 },
          imps: { iamt: 0, csamt: 0 },
          isrc: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
          isd: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
          oth: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
        },
        itc_rev: {
          rul: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
          oth: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
        },
        itc_net: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
        itc_inelg: {
          rul: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
          oth: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
        },
      },
      table5: {
        comp_nil: { inter: 0, intra: 0 },
        non_gst: { inter: 0, intra: 0 },
      },
      table5_1: {
        interest: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
        late_fee: { camt: 0, samt: 0 },
      },
      verification: {
        declared: false,
        signatory_name: '',
        date: new Date().toLocaleDateString('en-GB'),
        place: stateCode,
      },
    };

    await GstFormDraftModel.create({
      link_id: newLink._id,
      payload: {
        currentStep: 'gstr1',
        gstr1: initialGstr1,
        gstr3b: initialGstr3B,
      },
    });

    // Audit log
    await GstAuditLogModel.create({
      link_id: newLink._id,
      event: 'LINK_CREATED',
      metadata: { clientId, returnPeriod, createdBy },
    });

    return {
      linkId: newLink._id,
      rawToken,
      customSlug: rawToken,
      publicUrl,
      expiresAt,
      status: newLink.status,
    };
  }

  // Helper to find link by SHA-256 hash or directly by custom_slug, ObjectId (resilient link lookup)
  static async findLinkByToken(token: string) {
    if (!token) return null;
    const cleanToken = decodeURIComponent(token).trim();

    // 1. Try finding by token_hash of cleanToken
    const tokenHash = sha256(cleanToken);
    let link = await GstFormLinkModel.findOne({ token_hash: tokenHash });
    if (link) return link;

    // 2. Also try lowercase hash in case user copied in lowercase
    const lowerHash = sha256(cleanToken.toLowerCase());
    link = await GstFormLinkModel.findOne({ token_hash: lowerHash });
    if (link) return link;

    // 3. Try finding directly by custom_slug (exact or case-insensitive)
    link = await GstFormLinkModel.findOne({
      $or: [
        { custom_slug: cleanToken },
        { custom_slug: { $regex: new RegExp(`^${cleanToken}$`, 'i') } },
      ],
    });
    if (link) return link;

    // 4. Try finding by ObjectId fallback
    if (Types.ObjectId.isValid(cleanToken)) {
      link = await GstFormLinkModel.findById(cleanToken);
    }

    if (link && link.status === 'EXPIRED' && !link.submitted_at && !link.revoked_at) {
      link.status = 'ACTIVE';
      link.expires_at = null as any;
      await link.save();
    }

    return link;
  }

  // 2. Fetch Public Form Context (by token)
  static async getPublicFormContext(token: string, ip?: string, userAgent?: string) {
    if (!token) {
      throw { statusCode: 400, message: 'Invalid or missing link token' };
    }

    const link = await this.findLinkByToken(token);

    if (!link) {
      throw { statusCode: 404, message: 'This link is invalid or does not exist.' };
    }

    // Check expiry (links never expire unless explicitly revoked or submitted)
    if (link.status === 'EXPIRED') {
      return {
        isAccessible: false,
        state: 'EXPIRED',
        message: 'This link has expired. Please contact your CA.',
      };
    }

    // Check submission
    if (link.status === 'SUBMITTED') {
      return {
        isAccessible: false,
        state: 'SUBMITTED',
        message: 'Already submitted. You cannot edit this return.',
        submittedAt: link.submitted_at,
      };
    }

    if (link.status === 'REVOKED') {
      return {
        isAccessible: false,
        state: 'REVOKED',
        message: 'This link has been revoked. Please contact your CA for a new link.',
      };
    }

    // Fetch Draft
    const draft = await GstFormDraftModel.findOne({ link_id: link._id });

    // Log opened event
    await GstAuditLogModel.create({
      link_id: link._id,
      event: 'LINK_OPENED',
      ip,
      user_agent: userAgent,
    });

    // Fetch Client settings
    const client = await Client.findById(link.client_id).select('serviceSettings name legalName').lean();
    const serviceSettings = (client as any)?.serviceSettings || [];
    const gstr1Enabled =
      serviceSettings.length === 0 ||
      serviceSettings.some((s: any) => s.isActive && (s.serviceName?.includes('GSTR-1') || s.category === 'G.S.T'));
    const gstr3bEnabled =
      serviceSettings.length === 0 ||
      serviceSettings.some((s: any) => s.isActive && (s.serviceName?.includes('GSTR-3B') || s.category === 'G.S.T'));

    // Check Previous Submission
    const prevSub = await GstFormSubmissionModel.findOne({
      client_id: link.client_id,
      return_period: { $ne: link.return_period },
    })
      .sort({ submitted_at: -1 })
      .lean();

    // Series Book from latest submission or doc issue
    const docIssues = await Gstr1DocIssueModel.find({ client_id: link.client_id })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    const seriesBook: Array<{ prefix: string; lastNumber: number; docNum: number }> = [];
    docIssues.forEach((det: any) => {
      const docNum = det.doc_num || 1;
      (det.docs || []).forEach((row: any) => {
        if (row.to) {
          const match = String(row.to).match(/^(.*?)(\d+)$/);
          if (match) {
            seriesBook.push({
              prefix: match[1],
              lastNumber: parseInt(match[2], 10),
              docNum,
            });
          }
        }
      });
    });

    return {
      isAccessible: true,
      state: 'ACTIVE',
      expiresAt: null,
      header: {
        gstin: link.gstin,
        legalName: link.legal_name,
        tradeName: link.trade_name,
        stateCode: link.state_code,
        returnPeriod: link.return_period,
        filingFrequency: link.filing_frequency,
        turnoverSlab: link.aggregate_turnover_slab,
        registrationType: link.registration_type,
      },
      clientContext: {
        enabledServices: {
          gstr1: gstr1Enabled,
          gstr3b: gstr3bEnabled,
        },
        hasPreviousSubmission: Boolean(prevSub),
        previousSubmissionSummary: prevSub
          ? {
              submissionId: String(prevSub._id),
              returnPeriod: prevSub.return_period,
              selectedSections: (prevSub.raw_draft as any)?.selected_sections || [],
            }
          : undefined,
        seriesBook,
        commonDefaults: {
          usualPos: [link.state_code],
          usualRates: [18, 12, 5, 28, 0],
          usualHsn: ['998314', '998221', '84713010', '998313'],
        },
      },
      draft: draft?.payload || null,
      masters: {
        taxRates: DEFAULT_TAX_RATES,
        uqc: MASTER_UQC,
        hsn: DEFAULT_MASTER_HSN,
      },
    };
  }

  // 3. Save Draft
  static async saveDraft(token: string, payload: any) {
    const link = await this.findLinkByToken(token);

    if (!link) {
      throw { statusCode: 404, message: 'Invalid link' };
    }

    if (link.status !== 'ACTIVE') {
      throw { statusCode: 403, message: 'Cannot save draft. Link is expired or already submitted.' };
    }

    const draft = await GstFormDraftModel.findOneAndUpdate(
      { link_id: link._id },
      { payload, updated_at: new Date() },
      { upsert: true, new: true }
    );

    return { success: true, updatedAt: draft.updated_at };
  }

  // 4. Validate Form Server-side
  static async validateForm(token: string, payload: any): Promise<ValidationReport> {
    const link = await this.findLinkByToken(token);

    if (!link) {
      throw { statusCode: 404, message: 'Invalid link' };
    }

    const gstr1: Gstr1Payload = payload.gstr1;
    const gstr3b: Gstr3BPayload = payload.gstr3b;

    return validateGstForms(
      link.gstin,
      link.state_code,
      link.return_period,
      link.aggregate_turnover_slab,
      gstr1,
      gstr3b,
      false // Preview validation on summary page
    );
  }

  // 5. Final Submit
  static async submitForm(params: {
    token: string;
    payload: any;
    ip?: string;
    userAgent?: string;
  }) {
    const { token, payload, ip, userAgent } = params;
    const link = await this.findLinkByToken(token);

    if (!link) {
      throw { statusCode: 404, message: 'Invalid link' };
    }

    if (link.status === 'SUBMITTED') {
      throw { statusCode: 400, message: 'This form has already been submitted.' };
    }

    if (link.status !== 'ACTIVE') {
      throw { statusCode: 403, message: 'Cannot submit form. Link has expired.' };
    }

    const gstr1Payload: Gstr1Payload = payload.gstr1;
    const gstr3bPayload: Gstr3BPayload = payload.gstr3b;

    // Ensure verification details exist
    if (!gstr3bPayload.verification) {
      gstr3bPayload.verification = {
        declared: true,
        signatory_name: link.legal_name || 'Authorized Signatory',
        place: 'Bangalore',
        date: new Date().toLocaleDateString('en-GB'),
      };
    } else {
      gstr3bPayload.verification.declared = true;
      if (!gstr3bPayload.verification.signatory_name?.trim()) {
        gstr3bPayload.verification.signatory_name = link.legal_name || 'Authorized Signatory';
      }
      if (!gstr3bPayload.verification.place?.trim()) {
        gstr3bPayload.verification.place = 'Bangalore';
      }
      if (!gstr3bPayload.verification.date) {
        gstr3bPayload.verification.date = new Date().toLocaleDateString('en-GB');
      }
    }

    // Run strict server validation
    const validationReport = validateGstForms(
      link.gstin,
      link.state_code,
      link.return_period,
      link.aggregate_turnover_slab,
      gstr1Payload,
      gstr3bPayload,
      true // isFinalSubmit
    );

    if (!validationReport.isValid) {
      throw {
        statusCode: 422,
        message: 'Form has blocking validation errors. Please review and resolve them before submitting.',
        errors: validationReport.errors,
      };
    }

    // 1. Build Canonical GSTN GSTR-1 JSON (Section 9.3)
    const canonicalGstr1 = this.buildCanonicalGstr1(link, gstr1Payload);

    // 2. Build Canonical GSTN GSTR-3B JSON (Section 9.4)
    const canonicalGstr3B = this.buildCanonicalGstr3B(link, gstr3bPayload);

    // 3. Payload SHA-256 for tamper detection
    const submissionString = JSON.stringify({ canonicalGstr1, canonicalGstr3B });
    const payloadSha256 = sha256(submissionString);

    // 4. Create Submission Record
    const submission = await GstFormSubmissionModel.create({
      link_id: link._id,
      client_id: link.client_id,
      gstin: link.gstin,
      return_period: link.return_period,
      schema_version: '1.0.0',
      gstr1: canonicalGstr1,
      gstr3b: canonicalGstr3B,
      raw_draft: {
        gstr1: gstr1Payload,
        gstr3b: gstr3bPayload,
      },
      validation_report: validationReport,
      payload_sha256: payloadSha256,
      submitted_at: new Date(),
      submitted_ip: ip,
      user_agent: userAgent,
    });

    // 5. Save canonical JSON files to disk / object storage path (Section 9.2)
    const storageDir = path.resolve(
      process.cwd(),
      'storage',
      'gst-submissions',
      String(link.client_id),
      link.return_period,
      String(submission._id)
    );
    fs.mkdirSync(storageDir, { recursive: true });

    const gstr1FilePath = path.join(storageDir, 'gstr1.json');
    const gstr3bFilePath = path.join(storageDir, 'gstr3b.json');
    const metaFilePath = path.join(storageDir, 'meta.json');

    fs.writeFileSync(gstr1FilePath, JSON.stringify(canonicalGstr1, null, 2), 'utf-8');
    fs.writeFileSync(gstr3bFilePath, JSON.stringify(canonicalGstr3B, null, 2), 'utf-8');
    fs.writeFileSync(
      metaFilePath,
      JSON.stringify(
        {
          submission_id: submission._id,
          client_id: link.client_id,
          gstin: link.gstin,
          legal_name: link.legal_name,
          return_period: link.return_period,
          schema_version: '1.0.0',
          payload_sha256: payloadSha256,
          submitted_at: submission.submitted_at,
          validation_report: validationReport,
          selected_sections: payload.selected_sections || [],
          auto_included_sections: payload.auto_included_sections || ['hsn', 'doc_issue'],
          started_from_previous_submission_id: payload.started_from_previous_submission_id || null,
        },
        null,
        2
      ),
      'utf-8'
    );

    submission.file_paths = {
      gstr1: gstr1FilePath,
      gstr3b: gstr3bFilePath,
      meta: metaFilePath,
    };
    await submission.save();

    // 6. Populate Normalized Query Collections (Section 9.1)
    await this.saveNormalizedRecords(submission._id, link, gstr1Payload, canonicalGstr3B);

    // 7. Record Suggestions for CA Master (Section 5.9)
    await this.recordSuggestionsOnSubmit(link.client_id, submission._id, payload);

    // 8. Update link status to SUBMITTED
    link.status = 'SUBMITTED';
    link.submitted_at = new Date();
    await link.save();

    // 8. Audit log
    await GstAuditLogModel.create({
      link_id: link._id,
      event: 'SUBMITTED',
      ip,
      user_agent: userAgent,
      metadata: { submission_id: submission._id, payload_sha256: payloadSha256 },
    });

    return {
      success: true,
      submissionId: submission._id,
      submittedAt: submission.submitted_at,
      payloadSha256,
      filesGenerated: {
        gstr1: 'gstr1.json',
        gstr3b: 'gstr3b.json',
        meta: 'meta.json',
      },
    };
  }

  // Build Canonical GSTR-1 (Section 9.3)
  private static buildCanonicalGstr1(link: any, p: Gstr1Payload) {
    if (p.is_nil) {
      return {
        gstin: link.gstin,
        fp: link.return_period,
        gt: 0,
        cur_gt: 0,
        is_nil: true,
        b2b: [],
        b2cl: [],
        b2cs: [],
        cdnr: [],
        cdnur: [],
        nil: { inv: [] },
        hsn: { hsn_b2b: [], hsn_b2c: [] },
        doc_issue: { doc_det: [] },
      };
    }

    // Group B2B by recipient ctin
    const b2bByRecipient: Record<string, any[]> = {};
    for (const inv of p.b2b || []) {
      const ctin = inv.ctin.toUpperCase();
      if (!b2bByRecipient[ctin]) b2bByRecipient[ctin] = [];

      b2bByRecipient[ctin].push({
        inum: inv.inum,
        idt: inv.idt,
        val: inv.val,
        pos: inv.pos ? inv.pos.substring(0, 2) : link.state_code,
        rchrg: inv.rchrg ? 'Y' : 'N',
        inv_typ: inv.inv_type || 'R',
        irn: inv.irn || undefined,
        irngendate: inv.irngendate || undefined,
        srctyp: inv.srctyp || 'Manual',
        diff_percent: inv.diff_percent || undefined,
        itms: (inv.items || [])
          .filter((it) => it.txval > 0)
          .map((it, idx) => ({
            num: idx + 1,
            itm_det: {
              rt: it.rt,
              txval: it.txval,
              iamt: it.iamt || 0,
              camt: it.camt || 0,
              samt: it.samt || 0,
              csamt: it.csamt || 0,
            },
          })),
      });
    }

    const b2b = Object.keys(b2bByRecipient).map((ctin) => ({
      ctin,
      inv: b2bByRecipient[ctin],
    }));

    // Group B2CL by POS
    const b2clByPos: Record<string, any[]> = {};
    for (const inv of p.b2cl || []) {
      const pos = inv.pos ? inv.pos.substring(0, 2) : '';
      if (!b2clByPos[pos]) b2clByPos[pos] = [];
      b2clByPos[pos].push({
        inum: inv.inum,
        idt: inv.idt,
        val: inv.val,
        etin: inv.etin || undefined,
        diff_percent: inv.diff_percent || undefined,
        itms: (inv.items || [])
          .filter((it) => it.txval > 0)
          .map((it, idx) => ({
            num: idx + 1,
            itm_det: {
              rt: it.rt,
              txval: it.txval,
              iamt: it.iamt || 0,
              csamt: it.csamt || 0,
            },
          })),
      });
    }
    const b2cl = Object.keys(b2clByPos).map((pos) => ({
      pos,
      inv: b2clByPos[pos],
    }));

    // B2CS
    const b2cs = (p.b2cs || []).map((row) => ({
      sply_ty: row.pos?.substring(0, 2) === link.state_code ? 'INTRA' : 'INTER',
      pos: row.pos?.substring(0, 2) || link.state_code,
      typ: 'OE',
      rt: row.rt,
      txval: row.txval,
      camt: row.camt || 0,
      samt: row.samt || 0,
      iamt: row.iamt || 0,
      csamt: row.csamt || 0,
      diff_percent: row.diff_percent || undefined,
    }));

    // CDNR
    const cdnrByRecipient: Record<string, any[]> = {};
    for (const note of p.cdnr || []) {
      const ctin = (note.ctin || '').toUpperCase();
      if (!cdnrByRecipient[ctin]) cdnrByRecipient[ctin] = [];
      cdnrByRecipient[ctin].push({
        ntty: note.ntty,
        nt_num: note.nt_num,
        nt_dt: note.nt_dt,
        val: note.val,
        pos: note.pos ? note.pos.substring(0, 2) : link.state_code,
        rchrg: note.rchrg ? 'Y' : 'N',
        inv_typ: note.inv_typ || 'R',
        inum: note.inum || undefined,
        idt: note.idt || undefined,
        itms: (note.items || []).map((it, idx) => ({
          num: idx + 1,
          itm_det: {
            rt: it.rt,
            txval: it.txval,
            iamt: it.iamt || 0,
            camt: it.camt || 0,
            samt: it.samt || 0,
            csamt: it.csamt || 0,
          },
        })),
      });
    }
    const cdnr = Object.keys(cdnrByRecipient).map((ctin) => ({
      ctin,
      nt: cdnrByRecipient[ctin],
    }));

    // CDNUR
    const cdnur = (p.cdnur || []).map((note) => ({
      typ: note.ur_type || 'B2CL',
      ntty: note.ntty,
      nt_num: note.nt_num,
      nt_dt: note.nt_dt,
      val: note.val,
      pos: note.pos ? note.pos.substring(0, 2) : link.state_code,
      itms: (note.items || []).map((it, idx) => ({
        num: idx + 1,
        itm_det: {
          rt: it.rt,
          txval: it.txval,
          iamt: it.iamt || 0,
          csamt: it.csamt || 0,
        },
      })),
    }));

    // Nil
    const nil = {
      inv: (p.nil || []).map((row) => ({
        sply_ty: row.sply_ty,
        nil_amt: row.nil_amt || 0,
        expt_amt: row.expt_amt || 0,
        ngsup_amt: row.ngsup_amt || 0,
      })),
    };

    // HSN
    const hsn = {
      hsn_b2b: (p.hsn_b2b || []).map((it, idx) => ({
        num: idx + 1,
        hsn_sc: it.hsn_sc,
        desc: it.desc,
        uqc: it.uqc,
        qty: it.qty,
        rt: it.rt,
        txval: it.txval,
        iamt: it.iamt || 0,
        camt: it.camt || 0,
        samt: it.samt || 0,
        csamt: it.csamt || 0,
      })),
      hsn_b2c: (p.hsn_b2c || []).map((it, idx) => ({
        num: idx + 1,
        hsn_sc: it.hsn_sc,
        desc: it.desc,
        uqc: it.uqc,
        qty: it.qty,
        rt: it.rt,
        txval: it.txval,
        iamt: it.iamt || 0,
        camt: it.camt || 0,
        samt: it.samt || 0,
        csamt: it.csamt || 0,
      })),
    };

    // Doc Issue
    const doc_issue = {
      doc_det: (p.doc_issue || [])
        .filter((sec) => sec.docs && sec.docs.length > 0)
        .map((sec) => ({
          doc_num: sec.doc_num,
          docs: sec.docs.map((d, idx) => ({
            num: idx + 1,
            from: d.from,
            to: d.to,
            totnum: d.totnum,
            cancel: d.cancel,
            net_issue: d.net_issue,
          })),
        })),
    };

    return {
      gstin: link.gstin,
      fp: link.return_period,
      gt: 0,
      cur_gt: 0,
      b2b,
      b2cl,
      b2cs,
      cdnr,
      cdnur,
      nil,
      hsn,
      doc_issue,
    };
  }

  // Build Canonical GSTR-3B (Section 9.4)
  private static buildCanonicalGstr3B(link: any, p: Gstr3BPayload) {
    return {
      gstin: link.gstin,
      ret_period: link.return_period,
      sup_details: {
        osup_det: p.table3_1?.osup_det || { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
        osup_zero: p.table3_1?.osup_zero || { txval: 0, iamt: 0, csamt: 0 },
        osup_nil_exmp: p.table3_1?.osup_nil_exmp || { txval: 0 },
        isup_rev: p.table3_1?.isup_rev || { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
        osup_nongst: p.table3_1?.osup_nongst || { txval: 0 },
      },
      inter_sup: {
        unreg_details: (p.table3_2 || [])
          .filter((r) => r.group === 'unreg')
          .map((r) => ({ pos: r.pos, txval: r.txval, iamt: r.iamt })),
        comp_details: (p.table3_2 || [])
          .filter((r) => r.group === 'comp')
          .map((r) => ({ pos: r.pos, txval: r.txval, iamt: r.iamt })),
        uin_details: (p.table3_2 || [])
          .filter((r) => r.group === 'uin')
          .map((r) => ({ pos: r.pos, txval: r.txval, iamt: r.iamt })),
      },
      itc_elg: {
        itc_avl: [
          { ty: 'IMPG', ...p.table4?.itc_avl?.impg, camt: 0, samt: 0 },
          { ty: 'IMPS', ...p.table4?.itc_avl?.imps, camt: 0, samt: 0 },
          { ty: 'ISRC', ...p.table4?.itc_avl?.isrc },
          { ty: 'ISD', ...p.table4?.itc_avl?.isd },
          { ty: 'OTH', ...p.table4?.itc_avl?.oth },
        ],
        itc_rev: [
          { ty: 'RUL', ...p.table4?.itc_rev?.rul },
          { ty: 'OTH', ...p.table4?.itc_rev?.oth },
        ],
        itc_net: p.table4?.itc_net || { iamt: 0, camt: 0, samt: 0, csamt: 0 },
        itc_inelg: [
          { ty: 'RUL', ...p.table4?.itc_inelg?.rul },
          { ty: 'OTH', ...p.table4?.itc_inelg?.oth },
        ],
      },
      inward_sup: {
        isup_details: [
          { ty: 'GST', inter: p.table5?.comp_nil?.inter || 0, intra: p.table5?.comp_nil?.intra || 0 },
          { ty: 'NONGST', inter: p.table5?.non_gst?.inter || 0, intra: p.table5?.non_gst?.intra || 0 },
        ],
      },
      intr_ltfee: {
        intr_details: p.table5_1?.interest || { iamt: 0, camt: 0, samt: 0, csamt: 0 },
        ltfee_details: p.table5_1?.late_fee || { camt: 0, samt: 0 },
      },
    };
  }

  // Populate Normalized Query Collections (Section 9.1)
  private static async saveNormalizedRecords(
    submissionId: any,
    link: any,
    gstr1: Gstr1Payload,
    gstr3b: any
  ) {
    const meta = {
      submission_id: submissionId,
      client_id: link.client_id,
      gstin: link.gstin,
      return_period: link.return_period,
    };

    // 1. B2B
    if (gstr1.b2b?.length) {
      const b2bDocs = gstr1.b2b.map((inv) => ({
        ...meta,
        ctin: inv.ctin,
        cname: inv.cname,
        inum: inv.inum,
        idt: inv.idt,
        val: inv.val,
        pos: inv.pos,
        rchrg: inv.rchrg,
        inv_typ: inv.inv_type,
        items: inv.items,
      }));
      await Gstr1B2BModel.insertMany(b2bDocs);
    }

    // 2. B2CL
    if (gstr1.b2cl?.length) {
      const b2clDocs = gstr1.b2cl.map((inv) => ({
        ...meta,
        pos: inv.pos,
        inum: inv.inum,
        idt: inv.idt,
        val: inv.val,
        items: inv.items,
      }));
      await Gstr1B2clModel.insertMany(b2clDocs);
    }

    // 3. B2CS
    if (gstr1.b2cs?.length) {
      const b2csDocs = gstr1.b2cs.map((row) => ({
        ...meta,
        pos: row.pos,
        sply_ty: row.sply_ty,
        typ: row.typ || 'OE',
        rt: row.rt,
        txval: row.txval,
        iamt: row.iamt,
        camt: row.camt,
        samt: row.samt,
        csamt: row.csamt,
      }));
      await Gstr1B2csModel.insertMany(b2csDocs);
    }

    // 4. CDN
    const allCdn = [...(gstr1.cdnr || []), ...(gstr1.cdnur || [])];
    if (allCdn.length) {
      const cdnDocs = allCdn.map((cdn) => ({
        ...meta,
        registered: cdn.registered,
        ctin: cdn.ctin,
        cname: cdn.cname,
        ntty: cdn.ntty,
        nt_num: cdn.nt_num,
        nt_dt: cdn.nt_dt,
        val: cdn.val,
        pos: cdn.pos,
        items: cdn.items,
      }));
      await Gstr1CdnModel.insertMany(cdnDocs);
    }

    // 5. Nil
    if (gstr1.nil?.length) {
      const nilDocs = gstr1.nil.map((n) => ({
        ...meta,
        sply_ty: n.sply_ty,
        nil_amt: n.nil_amt,
        expt_amt: n.expt_amt,
        ngsup_amt: n.ngsup_amt,
      }));
      await Gstr1NilModel.insertMany(nilDocs);
    }

    // 6. HSN
    const allHsn = [
      ...(gstr1.hsn_b2b || []).map((h) => ({ ...h, tab: 'B2B' })),
      ...(gstr1.hsn_b2c || []).map((h) => ({ ...h, tab: 'B2C' })),
    ];
    if (allHsn.length) {
      const hsnDocs = allHsn.map((h) => ({
        ...meta,
        tab: h.tab,
        hsn_sc: h.hsn_sc,
        desc: h.desc,
        uqc: h.uqc,
        qty: h.qty,
        txval: h.txval,
        rt: h.rt,
        iamt: h.iamt,
        camt: h.camt,
        samt: h.samt,
        csamt: h.csamt,
      }));
      await Gstr1HsnModel.insertMany(hsnDocs);
    }

    // 7. Doc Issue
    if (gstr1.doc_issue?.length) {
      const docDocs = gstr1.doc_issue
        .filter((d) => d.docs && d.docs.length > 0)
        .map((d) => ({
          ...meta,
          doc_num: d.doc_num,
          name: d.name,
          docs: d.docs,
        }));
      if (docDocs.length) await Gstr1DocIssueModel.insertMany(docDocs);
    }

    // 8. GSTR-3B Summary
    await Gstr3bSummaryModel.create({
      ...meta,
      sup_details: gstr3b.sup_details,
      inter_sup: gstr3b.inter_sup,
      itc_elg: gstr3b.itc_elg,
      inward_sup: gstr3b.inward_sup,
      intr_ltfee: gstr3b.intr_ltfee,
    });
  }

  // 6. CSV Template Generator (Section 6.10)
  static getCsvTemplate(section: string): { filename: string; content: string } {
    switch (section.toLowerCase()) {
      case 'b2b':
      case '4a':
        return {
          filename: 'gstr1_b2b_template.csv',
          content:
            'recipient_gstin,recipient_name,invoice_no,invoice_date,invoice_value,pos,reverse_charge,invoice_type,differential_rate,rate,taxable_value,igst,cgst,sgst,cess,irn,irn_date,hsn,uqc,quantity\n' +
            '29AABCS1429B1ZB,Acme Corp,INV-2026-001,15/10/2026,11800.00,29-Karnataka,N,REGULAR,N,18,10000.00,1800.00,0.00,0.00,0.00,,,998314,NOS,1\n',
        };
      case 'b2cl':
      case '5':
        return {
          filename: 'gstr1_b2cl_template.csv',
          content:
            'pos,invoice_no,invoice_date,invoice_value,differential_rate,rate,taxable_value,igst,cess,ecom_gstin\n' +
            '29-Karnataka,INV-L001,10/10/2026,150000.00,N,18,127118.64,22881.36,0.00,\n',
        };
      case 'b2cs':
      case '7':
        return {
          filename: 'gstr1_b2cs_template.csv',
          content:
            'pos,rate,differential_rate,taxable_value,igst,cgst,sgst,cess\n' +
            '27-Maharashtra,18,N,50000.00,0.00,4500.00,4500.00,0.00\n' +
            '29-Karnataka,18,N,25000.00,4500.00,0.00,0.00,0.00\n',
        };
      case 'nil':
      case '8':
        return {
          filename: 'gstr1_nil_template.csv',
          content:
            'supply_type,nil_rated,exempted,non_gst\n' +
            'INTER_REGISTERED,0.00,0.00,0.00\n' +
            'INTRA_REGISTERED,0.00,0.00,0.00\n' +
            'INTER_UNREGISTERED,0.00,0.00,0.00\n' +
            'INTRA_UNREGISTERED,0.00,0.00,0.00\n',
        };
      case 'cdnr':
      case '9b_reg':
        return {
          filename: 'gstr1_cdnr_template.csv',
          content:
            'recipient_gstin,recipient_name,note_type,note_no,note_date,note_value,pos,reverse_charge,note_supply_type,differential_rate,rate,taxable_value,igst,cgst,sgst,cess,original_invoice_no,original_invoice_date\n' +
            '29AABCS1429B1ZB,Acme Corp,C,CN-001,20/10/2026,1180.00,29-Karnataka,N,REGULAR,N,18,1000.00,180.00,0.00,0.00,0.00,INV-2026-001,15/10/2026\n',
        };
      case 'cdnur':
      case '9b_unreg':
        return {
          filename: 'gstr1_cdnur_template.csv',
          content:
            'type,note_type,note_no,note_date,note_value,pos,rate,taxable_value,igst,cess\n' +
            'B2CL,C,CN-UR01,22/10/2026,5000.00,29-Karnataka,18,4237.29,762.71,0.00\n',
        };
      case 'hsn':
      case '12':
        return {
          filename: 'gstr1_hsn_template.csv',
          content:
            'tab,hsn,uqc,quantity,taxable_value,rate,igst,cgst,sgst,cess,product_name\n' +
            'B2B,998314,NOS,1,10000.00,18,1800.00,0.00,0.00,0.00,Software Design\n' +
            'B2C,84713010,NOS,2,100000.00,18,18000.00,0.00,0.00,0.00,Laptops\n',
        };
      case 'documents':
      case '13':
        return {
          filename: 'gstr1_documents_template.csv',
          content:
            'nature,from,to,total_number,cancelled\n' +
            '1,INV-001,INV-025,25,1\n' +
            '4,DN-001,DN-002,2,0\n' +
            '5,CN-001,CN-003,3,0\n',
        };
      default:
        throw { statusCode: 400, message: `Unknown section ${section}` };
    }
  }

  // 7. CA Staff Methods
  static async getLinksForClient(clientId: string) {
    if (!Types.ObjectId.isValid(clientId)) {
      return [];
    }
    const links = await GstFormLinkModel.find({ client_id: new Types.ObjectId(clientId) })
      .sort({ created_at: -1 })
      .lean();

    const linkIds = links.map((l) => l._id);
    const submissions = await GstFormSubmissionModel.find(
      { link_id: { $in: linkIds } },
      { _id: 1, link_id: 1, submitted_at: 1 }
    )
      .sort({ submitted_at: -1 })
      .lean();

    const subMap = new Map<string, any>();
    submissions.forEach((s) => {
      const k = String(s.link_id);
      if (!subMap.has(k)) {
        subMap.set(k, s);
      }
    });

    // Un-expire any links previously marked EXPIRED from the old 24h limit
    await GstFormLinkModel.updateMany(
      { status: 'EXPIRED', submitted_at: null, revoked_at: null },
      { $set: { status: 'ACTIVE', expires_at: null } }
    );

    return links.map((link) => {
      const liveStatus = (link.status === 'EXPIRED' && !link.submitted_at && !link.revoked_at) ? 'ACTIVE' : link.status;
      const matchedSub = subMap.get(String(link._id));
      return {
        ...link,
        status: liveStatus,
        submission_id: matchedSub ? String(matchedSub._id) : null,
        custom_slug: (link as any).custom_slug || '',
        custom_url: (link as any).custom_url || '',
      };
    });
  }

  static async revokeLink(linkId: string) {
    const link = await GstFormLinkModel.findById(linkId);
    if (!link) throw { statusCode: 404, message: 'Link not found' };

    link.status = 'REVOKED';
    link.revoked_at = new Date();
    await link.save();

    await GstAuditLogModel.create({
      link_id: link._id,
      event: 'LINK_REVOKED',
    });

    return link;
  }

  static async getSubmission(idOrLinkId: string) {
    if (!idOrLinkId || typeof idOrLinkId !== 'string') {
      throw { statusCode: 400, message: 'Invalid submission or link ID' };
    }

    let submission: any = null;

    if (Types.ObjectId.isValid(idOrLinkId)) {
      const objId = new Types.ObjectId(idOrLinkId);
      // 1. Try finding by submission _id
      submission = await GstFormSubmissionModel.findById(objId).lean();
      // 2. Fall back to finding by link_id (most recent submission)
      if (!submission) {
        submission = await GstFormSubmissionModel.findOne({ link_id: objId })
          .sort({ submitted_at: -1 })
          .lean();
      }
    }

    if (!submission) {
      throw { statusCode: 404, message: 'Submission not found for this return' };
    }

    return submission;
  }

  // 8. v3 Helpers & Endpoints

  // Suggestions Record on Final Submit (Section 5.9)
  static async recordSuggestionsOnSubmit(
    clientId: Types.ObjectId,
    submissionId: Types.ObjectId,
    payload: any
  ) {
    try {
      const gstr1 = payload.gstr1 || {};
      const newRecipients = new Map<string, { gstin: string; name: string; state: string }>();
      const newItems = new Map<string, { name: string; hsn: string; uqc: string; defaultRate: number }>();

      (gstr1.b2b || []).forEach((inv: any) => {
        if (inv.ctin) {
          const gstin = inv.ctin.toUpperCase().trim();
          if (!newRecipients.has(gstin)) {
            newRecipients.set(gstin, {
              gstin,
              name: inv.cname || '',
              state: inv.pos ? inv.pos.substring(0, 2) : gstin.substring(0, 2),
            });
          }
        }
        (inv.items || []).forEach((it: any) => {
          if (it.hsn && it.hsn.trim().length >= 2) {
            const h = it.hsn.trim();
            if (!newItems.has(h)) {
              newItems.set(h, {
                name: it.desc || `HSN ${h}`,
                hsn: h,
                uqc: it.uqc || 'NOS',
                defaultRate: Number(it.rt) || 18,
              });
            }
          }
        });
      });

      (gstr1.cdnr || []).forEach((cdn: any) => {
        if (cdn.ctin) {
          const gstin = cdn.ctin.toUpperCase().trim();
          if (!newRecipients.has(gstin)) {
            newRecipients.set(gstin, {
              gstin,
              name: cdn.cname || '',
              state: cdn.pos ? cdn.pos.substring(0, 2) : gstin.substring(0, 2),
            });
          }
        }
      });

      for (const rec of Array.from(newRecipients.values())) {
        const exists = await ClientMasterSuggestionModel.findOne({
          client_id: clientId,
          kind: 'RECIPIENT',
          'payload.gstin': rec.gstin,
        });
        if (!exists) {
          await ClientMasterSuggestionModel.create({
            client_id: clientId,
            kind: 'RECIPIENT',
            payload: rec,
            source_submission_id: submissionId,
            status: 'PENDING',
          });
        }
      }

      for (const item of Array.from(newItems.values())) {
        const exists = await ClientMasterSuggestionModel.findOne({
          client_id: clientId,
          kind: 'ITEM',
          'payload.hsn': item.hsn,
        });
        if (!exists) {
          await ClientMasterSuggestionModel.create({
            client_id: clientId,
            kind: 'ITEM',
            payload: item,
            source_submission_id: submissionId,
            status: 'PENDING',
          });
        }
      }
    } catch (err) {
      console.error('Failed to record master suggestions:', err);
    }
  }

  // Recipient Search (Max 10, >= 2 chars, Privacy Guarded)
  static async searchRecipients(token: string, q: string) {
    if (!q || q.trim().length < 2) return [];
    const link = await this.findLinkByToken(token);
    if (!link) throw { statusCode: 404, message: 'Invalid link' };

    const regex = new RegExp(q.trim(), 'i');

    const prevInvs = await Gstr1B2BModel.find({
      client_id: link.client_id,
      $or: [{ ctin: regex }, { cname: regex }],
    })
      .limit(20)
      .lean();

    const approvedSuggestions = await ClientMasterSuggestionModel.find({
      client_id: link.client_id,
      kind: 'RECIPIENT',
      status: 'APPROVED',
      $or: [{ 'payload.gstin': regex }, { 'payload.name': regex }],
    })
      .limit(20)
      .lean();

    const recipientMap = new Map<string, { gstin: string; name: string; state: string; lastPos?: string }>();

    prevInvs.forEach((inv) => {
      if (inv.ctin) {
        const gstin = inv.ctin.toUpperCase();
        if (!recipientMap.has(gstin)) {
          recipientMap.set(gstin, {
            gstin,
            name: inv.cname || '',
            state: inv.pos ? inv.pos.substring(0, 2) : gstin.substring(0, 2),
            lastPos: inv.pos || undefined,
          });
        }
      }
    });

    approvedSuggestions.forEach((sugg) => {
      const p = sugg.payload;
      if (p && p.gstin) {
        const gstin = p.gstin.toUpperCase();
        if (!recipientMap.has(gstin)) {
          recipientMap.set(gstin, {
            gstin,
            name: p.name || '',
            state: p.state || gstin.substring(0, 2),
            lastPos: p.lastPos || p.state,
          });
        }
      }
    });

    return Array.from(recipientMap.values()).slice(0, 10);
  }

  // Item Search (Max 10, >= 2 chars)
  static async searchItems(token: string, q: string) {
    if (!q || q.trim().length < 2) return [];
    const link = await this.findLinkByToken(token);
    if (!link) throw { statusCode: 404, message: 'Invalid link' };

    const regex = new RegExp(q.trim(), 'i');

    const prevHsn = await Gstr1HsnModel.find({
      client_id: link.client_id,
      $or: [{ hsn_sc: regex }, { desc: regex }],
    })
      .limit(20)
      .lean();

    const itemsMap = new Map<string, { name: string; hsn: string; uqc: string; defaultRate: number }>();

    prevHsn.forEach((h: any) => {
      if (h.hsn_sc && !itemsMap.has(h.hsn_sc)) {
        itemsMap.set(h.hsn_sc, {
          name: h.desc || `HSN ${h.hsn_sc}`,
          hsn: h.hsn_sc,
          uqc: h.uqc || 'NOS',
          defaultRate: Number(h.rt) || 18,
        });
      }
    });

    DEFAULT_MASTER_HSN.forEach((m) => {
      if (
        (m.hsn.includes(q.trim()) || m.description.toLowerCase().includes(q.trim().toLowerCase())) &&
        !itemsMap.has(m.hsn)
      ) {
        itemsMap.set(m.hsn, {
          name: m.description,
          hsn: m.hsn,
          uqc: m.isService ? 'NA' : 'NOS',
          defaultRate: 18,
        });
      }
    });

    return Array.from(itemsMap.values()).slice(0, 10);
  }

  // Series Book for client
  static async getSeriesBook(token: string) {
    const link = await this.findLinkByToken(token);
    if (!link) throw { statusCode: 404, message: 'Invalid link' };

    const docIssues = await Gstr1DocIssueModel.find({ client_id: link.client_id })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    const seriesList: Array<{ prefix: string; lastNumber: number; docNum: number }> = [];

    docIssues.forEach((det: any) => {
      const docNum = det.doc_num || 1;
      (det.docs || []).forEach((row: any) => {
        if (row.to) {
          const match = String(row.to).match(/^(.*?)(\d+)$/);
          if (match) {
            seriesList.push({
              prefix: match[1],
              lastNumber: parseInt(match[2], 10),
              docNum,
            });
          }
        }
      });
    });

    return { series: seriesList };
  }

  // Carry Over from previous period (Section 7)
  static async getCarryOver(token: string) {
    const link = await this.findLinkByToken(token);
    if (!link) throw { statusCode: 404, message: 'Invalid link' };

    const prevSub = await GstFormSubmissionModel.findOne({
      client_id: link.client_id,
      return_period: { $ne: link.return_period },
    })
      .sort({ submitted_at: -1 })
      .lean();

    if (!prevSub) {
      return { canCarryOver: false, message: 'No previous period submission found for this client.' };
    }

    const prevDraft = prevSub.raw_draft || {};
    const prevGstr1 = prevDraft.gstr1 || {};

    const selectedSections = (prevDraft as any)?.selected_sections || [];

    const b2csPreseed = (prevGstr1.b2cs || []).map((row: any) => ({
      sply_ty: row.sply_ty || 'INTRA',
      pos: row.pos,
      rt: row.rt,
      diff_percent: row.diff_percent || false,
      txval: '',
      iamt: '',
      camt: '',
      samt: '',
      csamt: '',
    }));

    const seriesPreseed: any[] = [];
    if (Array.isArray(prevGstr1.doc_issue)) {
      prevGstr1.doc_issue.forEach((nature: any) => {
        const newDocs = (nature.docs || []).map((doc: any) => {
          let nextFrom = '';
          if (doc.to) {
            const match = String(doc.to).match(/^(.*?)(\d+)$/);
            if (match) {
              const prefix = match[1];
              const num = parseInt(match[2], 10) + 1;
              nextFrom = prefix + String(num).padStart(match[2].length, '0');
            }
          }
          return {
            num: doc.num || 1,
            from: nextFrom || doc.from || '',
            to: '',
            totnum: 0,
            cancld: 0,
            net_issued: 0,
          };
        });
        seriesPreseed.push({
          doc_num: nature.doc_num,
          name: nature.name,
          docs: newDocs,
        });
      });
    }

    const hsnPreseedB2b = (prevGstr1.hsn_b2b || []).map((h: any) => ({
      hsn_sc: h.hsn_sc,
      desc: h.desc,
      uqc: h.uqc,
      qty: '',
      txval: '',
      rt: h.rt,
      iamt: '',
      camt: '',
      samt: '',
      csamt: '',
    }));

    const hsnPreseedB2c = (prevGstr1.hsn_b2c || []).map((h: any) => ({
      hsn_sc: h.hsn_sc,
      desc: h.desc,
      uqc: h.uqc,
      qty: '',
      txval: '',
      rt: h.rt,
      iamt: '',
      camt: '',
      samt: '',
      csamt: '',
    }));

    return {
      canCarryOver: true,
      previousPeriod: prevSub.return_period,
      previousSubmissionId: String(prevSub._id),
      selected_sections: selectedSections,
      sections: selectedSections,
      b2cs_preseed: b2csPreseed,
      b2csStructure: b2csPreseed,
      series_preseed: seriesPreseed,
      seriesRows: seriesPreseed,
      hsn_preseed_b2b: hsnPreseedB2b,
      hsn_preseed_b2c: hsnPreseedB2c,
      hsnStructure: hsnPreseedB2b,
    };
  }

  // Smart Column Mapping Suggestions (Section 8.4)
  static async smartMapHeaders(token: string, section: string, headers: string[]) {
    const link = await this.findLinkByToken(token);
    if (!link) throw { statusCode: 404, message: 'Invalid link' };

    const saved = await ClientImportMappingModel.findOne({ client_id: link.client_id, section }).lean();
    if (saved && saved.mapping && Object.keys(saved.mapping).length > 0) {
      return {
        mapping: saved.mapping,
        dateFormat: saved.date_format || 'DD/MM/YYYY',
        isSaved: true,
      };
    }

    const mapping: Record<string, string> = {};
    headers.forEach((hdr) => {
      const cleanHdr = hdr
        .toLowerCase()
        .replace(/%/g, ' percent ')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Pass 1: exact matches
      let matchedField: string | null = null;
      for (const [canonicalField, synonyms] of Object.entries(COLUMN_SYNONYMS)) {
        const cleanField = canonicalField.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
        if (
          cleanHdr === cleanField ||
          synonyms.some((syn) => {
            const cleanSyn = syn
              .toLowerCase()
              .replace(/%/g, ' percent ')
              .replace(/[^a-z0-9]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            return cleanHdr === cleanSyn;
          })
        ) {
          matchedField = canonicalField;
          break;
        }
      }

      // Pass 2: substring matches (cleanHdr contains cleanSyn)
      if (!matchedField) {
        for (const [canonicalField, synonyms] of Object.entries(COLUMN_SYNONYMS)) {
          if (
            synonyms.some((syn) => {
              const cleanSyn = syn
                .toLowerCase()
                .replace(/%/g, ' percent ')
                .replace(/[^a-z0-9]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
              return cleanSyn.length >= 3 && cleanHdr.includes(cleanSyn);
            })
          ) {
            matchedField = canonicalField;
            break;
          }
        }
      }

      if (matchedField) {
        mapping[hdr] = matchedField;
      }
    });

    return {
      mapping,
      dateFormat: 'DD/MM/YYYY',
      isSaved: false,
    };
  }

  // Save Column Mapping for Client
  static async saveImportMapping(token: string, section: string, mapping: Record<string, string>, dateFormat?: string) {
    const link = await this.findLinkByToken(token);
    if (!link) throw { statusCode: 404, message: 'Invalid link' };

    const res = await ClientImportMappingModel.findOneAndUpdate(
      { client_id: link.client_id, section },
      { mapping, date_format: dateFormat || 'DD/MM/YYYY' },
      { upsert: true, new: true }
    );
    return res;
  }

  // Derive Table 12 HSN from Invoices (Section 6.5)
  static async deriveHsn(token: string, draftPayload: any) {
    const link = await this.findLinkByToken(token);
    if (!link) throw { statusCode: 404, message: 'Invalid link' };

    const gstr1 = draftPayload.gstr1 || {};
    const b2bInvoices = gstr1.b2b || [];
    const b2clInvoices = gstr1.b2cl || [];
    const b2csRows = gstr1.b2cs || [];

    const hsnB2bMap = new Map<string, any>();
    const b2bTotalByRate: Record<number, number> = {};
    const b2bAllocatedByRate: Record<number, number> = {};

    b2bInvoices.forEach((inv: any) => {
      (inv.items || []).forEach((it: any) => {
        const rt = Number(it.rt) || 0;
        const txval = Number(it.txval) || 0;
        b2bTotalByRate[rt] = (b2bTotalByRate[rt] || 0) + txval;

        if (it.hsn && String(it.hsn).trim().length >= 2) {
          const key = `${String(it.hsn).trim()}_${it.uqc || 'NOS'}_${rt}`;
          b2bAllocatedByRate[rt] = (b2bAllocatedByRate[rt] || 0) + txval;

          if (!hsnB2bMap.has(key)) {
            const masterMatch = DEFAULT_MASTER_HSN.find((m) => m.hsn === String(it.hsn).trim());
            hsnB2bMap.set(key, {
              hsn_sc: String(it.hsn).trim(),
              desc: masterMatch?.description || `Product/Service ${it.hsn}`,
              uqc: it.uqc || (masterMatch?.isService ? 'NA' : 'NOS'),
              qty: Number(it.qty) || 0,
              txval: 0,
              rt,
              iamt: 0,
              camt: 0,
              samt: 0,
              csamt: 0,
            });
          }
          const row = hsnB2bMap.get(key);
          row.txval = Math.round((row.txval + txval) * 100) / 100;
          row.qty = Math.round(((row.qty || 0) + (Number(it.qty) || 0)) * 1000) / 1000;
          row.iamt = Math.round((row.iamt + (Number(it.iamt) || 0)) * 100) / 100;
          row.camt = Math.round((row.camt + (Number(it.camt) || 0)) * 100) / 100;
          row.samt = Math.round((row.samt + (Number(it.samt) || 0)) * 100) / 100;
          row.csamt = Math.round((row.csamt + (Number(it.csamt) || 0)) * 100) / 100;
        }
      });
    });

    const unallocatedB2b: Array<{ rt: number; txval: number }> = [];
    Object.keys(b2bTotalByRate).forEach((rtKey) => {
      const rt = Number(rtKey);
      const diff = Math.round(((b2bTotalByRate[rt] || 0) - (b2bAllocatedByRate[rt] || 0)) * 100) / 100;
      if (diff > 0.01) {
        unallocatedB2b.push({ rt, txval: diff });
      }
    });

    const b2cTotalByRate: Record<number, number> = {};
    b2clInvoices.forEach((inv: any) => {
      (inv.items || []).forEach((it: any) => {
        const rt = Number(it.rt) || 0;
        b2cTotalByRate[rt] = (b2cTotalByRate[rt] || 0) + (Number(it.txval) || 0);
      });
    });
    b2csRows.forEach((row: any) => {
      const rt = Number(row.rt) || 0;
      b2cTotalByRate[rt] = (b2cTotalByRate[rt] || 0) + (Number(row.txval) || 0);
    });

    const unallocatedB2c: Array<{ rt: number; txval: number }> = [];
    Object.keys(b2cTotalByRate).forEach((rtKey) => {
      const rt = Number(rtKey);
      const val = Math.round((b2cTotalByRate[rt] || 0) * 100) / 100;
      if (val > 0.01) {
        unallocatedB2c.push({ rt, txval: val });
      }
    });

    return {
      hsn_b2b: Array.from(hsnB2bMap.values()),
      unallocated: {
        b2b: unallocatedB2b,
        b2c: unallocatedB2c,
      },
    };
  }

  // Derive Table 13 Documents from Invoices (Section 6.6)
  static async deriveDocuments(token: string, draftPayload: any) {
    const link = await this.findLinkByToken(token);
    if (!link) throw { statusCode: 404, message: 'Invalid link' };

    const gstr1 = draftPayload.gstr1 || {};
    const b2bInvoices = gstr1.b2b || [];
    const b2clInvoices = gstr1.b2cl || [];
    const cdnrNotes = gstr1.cdnr || [];
    const cdnurNotes = gstr1.cdnur || [];

    const outwardInvNums: string[] = [
      ...b2bInvoices.map((i: any) => String(i.inum || '').trim()),
      ...b2clInvoices.map((i: any) => String(i.inum || '').trim()),
    ].filter(Boolean);

    const debitNums: string[] = [
      ...cdnrNotes.filter((n: any) => n.nt_ty === 'D').map((n: any) => String(n.nt_num || '').trim()),
      ...cdnurNotes.filter((n: any) => n.nt_ty === 'D').map((n: any) => String(n.nt_num || '').trim()),
    ].filter(Boolean);

    const creditNums: string[] = [
      ...cdnrNotes.filter((n: any) => n.nt_ty === 'C').map((n: any) => String(n.nt_num || '').trim()),
      ...cdnurNotes.filter((n: any) => n.nt_ty === 'C').map((n: any) => String(n.nt_num || '').trim()),
    ].filter(Boolean);

    const prevSeriesRes = await this.getSeriesBook(token);
    const prevSeries = prevSeriesRes.series || [];

    const helperDetect = (nums: string[], docNum: number) => {
      if (nums.length === 0) return [];
      const groups = new Map<string, { padding: number; numbers: number[] }>();

      nums.forEach((numStr) => {
        const match = numStr.match(/^(.*?)(\d+)$/);
        const prefix = match ? match[1] : '';
        const numericPart = match ? parseInt(match[2], 10) : 0;
        const padding = match ? match[2].length : 1;

        if (!groups.has(prefix)) {
          groups.set(prefix, { padding, numbers: [] });
        }
        groups.get(prefix)!.numbers.push(numericPart);
      });

      const docsRows: any[] = [];
      let rowIdx = 1;

      groups.forEach((data, prefix) => {
        const sorted = data.numbers.sort((a, b) => a - b);
        const minVal = sorted[0];
        const maxVal = sorted[sorted.length - 1];

        const prevMatch = prevSeries.find((s) => s.prefix === prefix && s.docNum === docNum);
        const fromVal = prevMatch && prevMatch.lastNumber > 0 ? prevMatch.lastNumber + 1 : minVal;
        const toVal = maxVal;

        const fromStr = prefix + String(fromVal).padStart(data.padding, '0');
        const toStr = prefix + String(toVal).padStart(data.padding, '0');
        const totnum = Math.max(1, toVal - fromVal + 1);

        const missingCount = totnum - sorted.length;

        docsRows.push({
          num: rowIdx++,
          from: fromStr,
          to: toStr,
          totnum,
          cancld: 0,
          net_issued: totnum,
          detectedTo: toStr,
          missingCount: missingCount > 0 ? missingCount : 0,
        });
      });

      return docsRows;
    };

    const nature1Docs = helperDetect(outwardInvNums, 1);
    const nature4Docs = helperDetect(debitNums, 4);
    const nature5Docs = helperDetect(creditNums, 5);

    const docIssue = NATURE_OF_DOCUMENTS.map((nat) => {
      let docs: any[] = [];
      if (nat.id === 1) docs = nature1Docs;
      else if (nat.id === 4) docs = nature4Docs;
      else if (nat.id === 5) docs = nature5Docs;
      return {
        doc_num: nat.id,
        name: nat.name,
        docs,
      };
    });

    return {
      doc_issue: docIssue,
    };
  }

  // Parse File and Preview with Auto-derivations (Section 8)
  static async parseFileAndPreview(params: {
    token: string;
    section: string;
    fileBuffer?: Buffer;
    fileContent?: string;
    fileType: 'csv' | 'xlsx' | 'paste';
    fileName?: string;
    mapping: Record<string, string>;
    dateFormat?: string;
  }) {
    const { token, section, fileBuffer, fileContent, fileType, fileName = 'import', mapping } = params;
    const link = await this.findLinkByToken(token);
    if (!link) throw { statusCode: 404, message: 'Invalid link' };

    let rawRows: any[] = [];

    if (fileType === 'xlsx' && fileBuffer) {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
    } else if (fileContent) {
      if (fileType === 'paste') {
        const lines = fileContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length > 0) {
          const firstLine = lines[0].split('\t');
          const isHeader = firstLine.some((col) =>
            Object.values(COLUMN_SYNONYMS).some((syns) => syns.includes(col.toLowerCase().trim()))
          );
          const startIdx = isHeader ? 1 : 0;
          const headers = isHeader ? firstLine.map((c) => c.trim()) : Object.keys(mapping);
          for (let i = startIdx; i < lines.length; i++) {
            const vals = lines[i].split('\t');
            const row: any = {};
            headers.forEach((h, idx) => {
              row[h] = vals[idx] !== undefined ? vals[idx].trim() : '';
            });
            rawRows.push(row);
          }
        }
      } else {
        rawRows = parseCsvString(fileContent);
      }
    }

    if (rawRows.length > 10000) {
      throw { statusCode: 400, message: 'File exceeds maximum limit of 10,000 rows.' };
    }

    const processedRows: any[] = [];
    const errors: Array<{ row: number; field: string; message: string }> = [];

    rawRows.forEach((raw, idx) => {
      const rowIdx = idx + 1;
      const mapped: any = { _rowNum: rowIdx, _isValid: true, _errors: [] };

      Object.entries(mapping).forEach(([fileCol, canonField]) => {
        if (canonField && raw[fileCol] !== undefined) {
          mapped[canonField] = String(raw[fileCol]).trim();
        }
      });

      Object.keys(raw).forEach((k) => {
        const val = String(raw[k]).trim();
        if (mapping[k] === undefined && val !== '') {
          mapped[k] = val;
        }
      });

      if (mapped.recipient_gstin) {
        mapped.recipient_gstin = mapped.recipient_gstin.toUpperCase().replace(/\s+/g, '');
        if (!mapped.pos) {
          const stCode = mapped.recipient_gstin.substring(0, 2);
          const stInfo = STATE_MAP[stCode];
          mapped.pos = stInfo ? `${stCode}-${stInfo.name}` : stCode;
        }
      }

      const txval = parseFloat(String(mapped.taxable_value || '0').replace(/,/g, '')) || 0;
      const rate = parseFloat(String(mapped.rate || '0')) || 0;
      mapped.taxable_value = txval;
      mapped.rate = rate;

      const isInterState = mapped.pos ? mapped.pos.substring(0, 2) !== link.state_code : false;
      const expectedTax = Math.round(((txval * rate) / 100) * 100) / 100;

      if (!mapped.igst && !mapped.cgst && !mapped.sgst) {
        if (isInterState) {
          mapped.igst = expectedTax;
          mapped.cgst = 0;
          mapped.sgst = 0;
        } else {
          mapped.igst = 0;
          mapped.cgst = Math.round((expectedTax / 2) * 100) / 100;
          mapped.sgst = Math.round((expectedTax / 2) * 100) / 100;
        }
      } else {
        mapped.igst = parseFloat(String(mapped.igst || '0').replace(/,/g, '')) || 0;
        mapped.cgst = parseFloat(String(mapped.cgst || '0').replace(/,/g, '')) || 0;
        mapped.sgst = parseFloat(String(mapped.sgst || '0').replace(/,/g, '')) || 0;
      }
      mapped.cess = parseFloat(String(mapped.cess || '0').replace(/,/g, '')) || 0;

      if (!mapped.invoice_value) {
        mapped.invoice_value = Math.round((txval + mapped.igst + mapped.cgst + mapped.sgst + mapped.cess) * 100) / 100;
      } else {
        mapped.invoice_value = parseFloat(String(mapped.invoice_value).replace(/,/g, '')) || 0;
      }

      if (section === 'b2b' || section === 'cdnr') {
        if (!mapped.recipient_gstin) {
          mapped._errors.push('Recipient GSTIN is mandatory');
        } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(mapped.recipient_gstin)) {
          mapped._errors.push('Recipient GSTIN format is invalid');
        }
      }

      if (section === 'b2b' || section === 'b2cl') {
        if (!mapped.invoice_no) {
          mapped._errors.push('Invoice number is mandatory');
        }
        if (!mapped.invoice_date) {
          mapped._errors.push('Invoice date is mandatory');
        }
      }

      if (mapped._errors.length > 0) {
        mapped._isValid = false;
        mapped._errors.forEach((msg: string) => {
          errors.push({ row: rowIdx, field: '', message: msg });
        });
      }

      processedRows.push(mapped);
    });

    const validCount = processedRows.filter((r) => r._isValid).length;
    const errorCount = processedRows.length - validCount;

    const batch = await GstImportBatchModel.create({
      link_id: link._id,
      section,
      file_name: fileName,
      row_count: processedRows.length,
      valid_count: validCount,
      error_count: errorCount,
    });

    return {
      batchId: batch._id,
      totalRows: processedRows.length,
      validCount,
      errorCount,
      rows: processedRows,
      errors,
    };
  }

  // Staff: Get Master Suggestions (Section 11)
  static async getMasterSuggestions(clientId: string) {
    const list = await ClientMasterSuggestionModel.find({
      client_id: new Types.ObjectId(clientId),
    })
      .sort({ created_at: -1 })
      .lean();
    return list;
  }

  // Staff: Update Suggestion Status
  static async updateSuggestionStatus(suggestionId: string, status: 'APPROVED' | 'REJECTED') {
    const updated = await ClientMasterSuggestionModel.findByIdAndUpdate(
      suggestionId,
      { status },
      { new: true }
    );
    return updated;
  }
}
