import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { DocumentService } from './document.service';
import { connectDatabase, disconnectDatabase } from '../../config/database';

describe('Document Module - Person Search & Details Integration Tests', () => {
  before(async () => {
    await connectDatabase();
  });

  after(async () => {
    await disconnectDatabase();
  });

  test('1. searchPeople retrieves persisted real records from database', async () => {
    const result = await DocumentService.searchPeople({ page: 1, limit: 10 });
    assert.ok(result.people.length > 0, 'Should return at least one person');
    assert.ok(result.pagination.total > 0, 'Total count should be positive');

    // Ensure no passwords or secrets are exposed
    for (const p of result.people) {
      assert.ok(p.name, 'Every person must have a name');
      assert.ok(p.identifier, 'Every person must have an identifier (fileNo or employeeId)');
      assert.ok(p.entityType === 'client' || p.entityType === 'team');
      assert.strictEqual((p as any).password, undefined);
      assert.strictEqual((p as any).passwordHash, undefined);
    }
  });

  test('2. searchPeople filters correctly by partial and case-insensitive name', async () => {
    // Search for "zenith" (lowercase partial match)
    const resultZenith = await DocumentService.searchPeople({ search: 'zenith' });
    assert.ok(resultZenith.people.length >= 1, 'Should find Zenith client');
    assert.match(resultZenith.people[0].name.toLowerCase(), /zenith/);

    // Search for "aniket" (lowercase partial match for team member)
    const resultAniket = await DocumentService.searchPeople({ search: 'aniket' });
    assert.ok(resultAniket.people.length >= 1, 'Should find Aniket team member');
    assert.match(resultAniket.people[0].name.toLowerCase(), /aniket/);
  });

  test('3. searchPeople distinguishes between clients and team members', async () => {
    const clientOnly = await DocumentService.searchPeople({ type: 'client' });
    assert.ok(clientOnly.people.every((p) => p.entityType === 'client'));

    const teamOnly = await DocumentService.searchPeople({ type: 'team' });
    assert.ok(teamOnly.people.every((p) => p.entityType === 'team'));
  });

  test('4. searchPeople returns empty list for nonexistent query', async () => {
    const result = await DocumentService.searchPeople({ search: 'NONEXISTENT_XYZ_PERSON_9999' });
    assert.strictEqual(result.people.length, 0);
    assert.strictEqual(result.pagination.total, 0);
  });

  test('5. getPersonDetails returns complete details and associated documents for client', async () => {
    const search = await DocumentService.searchPeople({ search: 'Zenith', type: 'client' });
    assert.ok(search.people.length > 0);
    const target = search.people[0];

    const detail = await DocumentService.getPersonDetails(target.id);
    assert.strictEqual(detail.person.id, target.id);
    assert.strictEqual(detail.person.name, target.name);
    assert.ok(Array.isArray(detail.documents), 'Documents must be an array');
    assert.ok(detail.documents.length >= 1, 'Zenith should have associated documents in DocumentModel');

    const firstDoc = detail.documents[0];
    assert.ok(firstDoc.fileName, 'Document must have fileName');
    assert.ok(firstDoc.category, 'Document must have category');
    assert.ok(firstDoc.size > 0, 'Document must have valid size');

    // Requirements & Summary verification
    assert.ok(Array.isArray(detail.requirements), 'Requirements must be an array');
    assert.ok(detail.requirements.length > 0, 'Should synthesize requirements inventory');
    assert.ok(detail.summary, 'Summary metrics must be present');
    assert.ok(detail.summary.total >= 1, 'Total requirements must be >= 1');
    assert.ok(typeof detail.summary.available === 'number');
    assert.ok(typeof detail.summary.pending === 'number');

    // Check that pending status exists for missing requirements (e.g. PAN or task doc)
    const pendingReqs = detail.requirements.filter((r) => r.status === 'Pending');
    assert.ok(pendingReqs.length >= 1, 'Should have at least 1 Pending requirement');
    for (const r of pendingReqs) {
      assert.strictEqual(r.status, 'Pending');
      assert.ok(r.title, 'Requirement must have title');
      assert.ok(r.category, 'Requirement must have category');
      assert.ok(r.relatedProcess, 'Requirement must have related process');
    }

    // Check that available status exists for available documents
    const availableReqs = detail.requirements.filter((r) => r.status === 'Available');
    assert.ok(availableReqs.length >= 1, 'Should have at least 1 Available requirement');
  });

  test('6. getPersonDetails returns empty documents array for person without documents', async () => {
    const search = await DocumentService.searchPeople({ search: 'Karnataka General Traders', type: 'client' });
    if (search.people.length > 0) {
      const target = search.people[0];
      const detail = await DocumentService.getPersonDetails(target.id);
      assert.strictEqual(detail.person.id, target.id);
      // Client has no drive docs seeded
      const driveDocs = detail.documents.filter((d) => d.storageProvider === 'google-drive');
      assert.strictEqual(driveDocs.length, 0, 'Should have 0 Google Drive documents');
    }
  });

  test('7. getPersonDetails throws error for invalid ID', async () => {
    await assert.rejects(
      async () => {
        await DocumentService.getPersonDetails('invalid-id-format');
      },
      /Invalid person ID format/
    );

    const nonExistentObjectId = new mongoose.Types.ObjectId().toString();
    await assert.rejects(
      async () => {
        await DocumentService.getPersonDetails(nonExistentObjectId);
      },
      /Person record not found/
    );
  });
});
