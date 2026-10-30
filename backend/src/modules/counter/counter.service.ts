import { Counter } from './counter.model';
import { CounterName, ICounter } from './counter.interface';
import { logger } from '../../config/logger';

export class CounterService {
  /**
   * Atomically fetch the next sequence number for a given counter.
   * Uses MongoDB findOneAndUpdate with $inc for 100% thread-safety and concurrency protection.
   *
   * @param counterName Unique identifier for the counter (e.g., 'taskIdCounter', 'serviceIdCounter')
   * @param defaultStart Initial baseline if counter does not exist yet (e.g. 6000 for tasks)
   */
  static async getNextSequence(
    counterName: CounterName,
    defaultStart: number = 0
  ): Promise<number> {
    // If start baseline provided, ensure counter exists with at least that start value
    if (defaultStart > 0) {
      await Counter.updateOne(
        { _id: counterName },
        { $setOnInsert: { seq: defaultStart, name: counterName } },
        { upsert: true }
      );
    }

    const counter = await Counter.findOneAndUpdate(
      { _id: counterName },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return counter.seq;
  }

  /**
   * Formatted ID generator: returns e.g. #TSK06010, SRV00001, etc.
   */
  static async generateFormattedId(
    counterName: CounterName,
    prefix: string,
    padLength: number = 5,
    defaultStart: number = 0
  ): Promise<string> {
    const seq = await this.getNextSequence(counterName, defaultStart);
    return `${prefix}${String(seq).padStart(padLength, '0')}`;
  }

  /**
   * Dedicated generator for Task IDs (#TSK06010, #TSK06011, etc.)
   * Concurrency-safe, atomic sequence incrementing.
   */
  static async getNextTaskId(): Promise<string> {
    const seq = await this.getNextSequence('taskIdCounter', 6000);
    let taskId = `#TSK${String(seq).padStart(5, '0')}`;

    // Safety guard against any legacy manual ID collisions
    try {
      const { Task } = await import('../task/task.model');
      while (await Task.exists({ taskId })) {
        const nextSeq = await this.getNextSequence('taskIdCounter');
        taskId = `#TSK${String(nextSeq).padStart(5, '0')}`;
      }
    } catch {
      // Non-blocking
    }

    return taskId;
  }

  /**
   * Dedicated generator for Service IDs (SRV00001, SRV00002, etc.)
   */
  static async getNextServiceId(): Promise<string> {
    const seq = await this.getNextSequence('serviceIdCounter', 0);
    return `SRV${String(seq).padStart(5, '0')}`;
  }

  /**
   * Dedicated generator for Client File Numbers (CL-YYYY-0001)
   */
  static async getNextClientFileNo(year?: number): Promise<string> {
    const currentYear = year || new Date().getFullYear();
    const counterKey = `clientIdCounter_${currentYear}`;
    const seq = await this.getNextSequence(counterKey, 0);
    return `CL-${currentYear}-${String(seq).padStart(4, '0')}`;
  }

  /**
   * Dedicated generator for Tax Invoice Numbers (INV-YYYY-XXXX).
   * Thread-safe, atomic sequence incrementing per organization and fiscal year.
   * Cross-checks existing database records to prevent any collisions with legacy data.
   */
  static async getNextInvoiceNumber(orgId: any, year?: number): Promise<string> {
    const currentYear = year || new Date().getFullYear();
    const counterKey = `invoiceCounter_${String(orgId)}_${currentYear}`;

    let seq = await this.getNextSequence(counterKey, 0);
    let candidate = `INV-${currentYear}-${String(seq).padStart(4, '0')}`;

    try {
      const { FinancialInvoice } = await import('../financials/financial.model');
      while (await FinancialInvoice.exists({ orgId, number: candidate })) {
        seq = await this.getNextSequence(counterKey);
        candidate = `INV-${currentYear}-${String(seq).padStart(4, '0')}`;
      }
    } catch {
      // Non-blocking fallback
    }

    return candidate;
  }

  /**
   * Dedicated generator for Payment Receipt Numbers (REC-YYYY-XXXX).
   * Thread-safe, atomic sequence incrementing per organization and fiscal year.
   * Cross-checks existing database records to prevent collisions.
   */
  static async getNextReceiptNumber(orgId: any, year?: number): Promise<string> {
    const currentYear = year || new Date().getFullYear();
    const counterKey = `receiptCounter_${String(orgId)}_${currentYear}`;

    let seq = await this.getNextSequence(counterKey, 0);
    let candidate = `REC-${currentYear}-${String(seq).padStart(4, '0')}`;

    try {
      const { FinancialReceipt } = await import('../financials/financial.model');
      while (await FinancialReceipt.exists({ orgId, receiptNo: candidate })) {
        seq = await this.getNextSequence(counterKey);
        candidate = `REC-${currentYear}-${String(seq).padStart(4, '0')}`;
      }
    } catch {
      // Non-blocking fallback
    }

    return candidate;
  }

  /**
   * Dedicated generator for Lead IDs (LD-00001, etc.)
   */
  static async getNextLeadId(): Promise<string> {
    const seq = await this.getNextSequence('leadIdCounter', 0);
    return `LD-${String(seq).padStart(5, '0')}`;
  }

  /**
   * Returns current sequence without incrementing.
   */
  static async getCurrentSequence(counterName: CounterName): Promise<number> {
    const counter = await Counter.findById(counterName).lean();
    return counter ? counter.seq : 0;
  }

  /**
   * Manually sets or resets a counter value.
   */
  static async setCounter(counterName: CounterName, seq: number): Promise<ICounter> {
    const counter = await Counter.findOneAndUpdate(
      { _id: counterName },
      { $set: { seq } },
      { new: true, upsert: true }
    );
    return counter;
  }

  /**
   * Returns all active counters in the dedicated collection.
   */
  static async getAllCounters(): Promise<ICounter[]> {
    return Counter.find({}).sort({ _id: 1 }).lean();
  }

  /**
   * Synchronizes counter baselines with existing documents across collections.
   * Ensures that newly generated IDs never collide with pre-existing database records.
   */
  static async initializeCounters(): Promise<void> {
    try {
      logger.info('🔄 Initializing and synchronizing dedicated counters...');

      // 1. Sync Task ID counter (#TSK06000+)
      const { Task } = await import('../task/task.model');
      const tasks = await Task.find({}, { taskId: 1 }).lean();
      let maxTaskNum = 6000;

      for (const t of tasks) {
        if (t.taskId) {
          const match = t.taskId.match(/\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (!isNaN(num) && num > maxTaskNum) {
              maxTaskNum = num;
            }
          }
        }
      }

      await Counter.updateOne(
        { _id: 'taskIdCounter' },
        {
          $setOnInsert: { name: 'Task ID Counter', prefix: '#TSK', padLength: 5 },
          $max: { seq: maxTaskNum },
        },
        { upsert: true }
      );
      logger.info(`   ↳ [taskIdCounter] synchronized to baseline: ${maxTaskNum}`);

      // 2. Sync Service ID counter (SRV00001+)
      const { Service } = await import('../service/service.model');
      const serviceCount = await Service.countDocuments().setOptions({ includeDeleted: true });
      await Counter.updateOne(
        { _id: 'serviceIdCounter' },
        {
          $setOnInsert: { name: 'Service ID Counter', prefix: 'SRV', padLength: 5 },
          $max: { seq: serviceCount },
        },
        { upsert: true }
      );
      logger.info(`   ↳ [serviceIdCounter] synchronized to baseline: ${serviceCount}`);

      // 3. Sync Client File Number counter (CL-YYYY-0001+)
      const currentYear = new Date().getFullYear();
      const clientCounterKey = `clientIdCounter_${currentYear}`;
      const { Client } = await import('../client/client.model');
      const clientCount = await Client.countDocuments().setOptions({ includeDeleted: true });

      await Counter.updateOne(
        { _id: clientCounterKey },
        {
          $setOnInsert: {
            name: `Client File Number Counter (${currentYear})`,
            prefix: `CL-${currentYear}-`,
            padLength: 4,
          },
          $max: { seq: clientCount },
        },
        { upsert: true }
      );
      logger.info(`   ↳ [${clientCounterKey}] synchronized to baseline: ${clientCount}`);

      // 4. Sync Lead ID counter
      const { Lead } = await import('../lead/lead.model');
      const leadCount = await Lead.countDocuments().setOptions({ includeDeleted: true });
      await Counter.updateOne(
        { _id: 'leadIdCounter' },
        {
          $setOnInsert: { name: 'Lead ID Counter', prefix: 'LD-', padLength: 5 },
          $max: { seq: leadCount },
        },
        { upsert: true }
      );
      logger.info(`   ↳ [leadIdCounter] synchronized to baseline: ${leadCount}`);

      logger.info('✅ All dedicated counters successfully initialized and verified.');
    } catch (err: any) {
      logger.error('⚠️ Counter initialization warning:', err?.message || err);
    }
  }
}
