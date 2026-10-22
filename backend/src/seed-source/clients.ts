import type { Client } from './types/notices';
import { daysAgoIso } from '../dates';

export function createClientsSeed(): Client[] {
  return [
    {
      id: 'client-karnataka-stores',
      name: 'KARNATAKA STORES',
      identifiers: {
        gstin: '29AALFK6109R1ZI',
        tan: 'CHEC17994E',
        pan: 'AOVPV6657F',
      },
      state: 'Karnataka',
      portals: ['GST', 'IT', 'TDS'],
      sync: {
        status: 'ready',
        lastSyncAt: daysAgoIso(1),
      },
    },
    {
      id: 'client-miracle-coro',
      name: 'MIRACLE CORO PLAST PRIVATE LIMITED',
      identifiers: {
        gstin: '27AABCM9124K1ZK',
        pan: 'AABCM9124K',
      },
      state: 'Maharashtra',
      portals: ['GST'],
      sync: {
        status: 'ready',
        lastSyncAt: daysAgoIso(2),
      },
    },
    {
      id: 'client-trustgrid',
      name: 'TRUSTGRID AI INNOVATIONS',
      identifiers: {
        gstin: '29AABCT8841M1ZN',
        pan: 'AABCT8841M',
      },
      state: 'Karnataka',
      portals: ['GST'],
      sync: {
        status: 'ready',
        lastSyncAt: daysAgoIso(1),
      },
    },
    {
      id: 'client-regalheaven',
      name: 'regalheaven',
      identifiers: {
        gstin: '07AABCR5512L1ZP',
        pan: 'AABCR5512L',
      },
      state: 'Delhi',
      portals: ['GST'],
      sync: {
        status: 'ready',
        lastSyncAt: daysAgoIso(3),
      },
    },
    {
      id: 'client-turia-ind',
      name: 'Turia Industries private limited',
      identifiers: {
        tan: 'BLRT09812A',
        pan: 'AAACT5514P',
      },
      state: 'Karnataka',
      portals: ['IT', 'TDS'],
      sync: {
        status: 'ready',
        lastSyncAt: daysAgoIso(2),
      },
    },
    {
      id: 'client-aanya-hosp',
      name: 'AANYA HOSPITALITY LLP',
      identifiers: {
        gstin: '30AAHFA1189N1ZG',
        pan: 'AAHFA1189N',
      },
      state: 'Goa',
      portals: ['GST', 'IT'],
      sync: {
        status: 'ready',
        lastSyncAt: daysAgoIso(1),
      },
    },
    {
      id: 'client-mk-retail',
      name: 'M.K.RETAIL COMPANY',
      identifiers: {
        gstin: '29AABCM3314Q1Z1',
        pan: 'AABCM3314Q',
      },
      state: 'Karnataka',
      portals: ['GST', 'IT'],
      sync: {
        status: 'ready',
        lastSyncAt: daysAgoIso(2),
      },
    },
    {
      id: 'client-apex-auto',
      name: 'Apex Auto Works',
      identifiers: {
        gstin: '24AAACR1123P1ZQ',
        pan: 'AAACR1123P',
      },
      state: 'Gujarat',
      portals: ['GST', 'IT'],
      sync: {
        status: 'ready',
        lastSyncAt: daysAgoIso(4),
      },
    },
    {
      id: 'client-coastal-exp',
      name: 'Coastal Exports',
      identifiers: {
        gstin: '32AAACC5541L1Z9',
        pan: 'AAACC5541L',
      },
      state: 'Kerala',
      portals: ['GST', 'IT'],
      sync: {
        status: 'ready',
        lastSyncAt: daysAgoIso(3),
      },
    },
    {
      id: 'client-evergreen',
      name: 'Evergreen Textiles',
      identifiers: {
        gstin: '24AABCE7712M1ZB',
        pan: 'AABCE7712M',
      },
      state: 'Gujarat',
      portals: ['GST', 'IT'],
      sync: {
        status: 'error',
        errorMessage: 'Portal login failed - check saved credentials',
        lastSyncAt: daysAgoIso(5),
      },
    },
    {
      id: 'client-falcon',
      name: 'Falcon Couriers',
      identifiers: {
        gstin: '36AABCF4419K1ZS',
        pan: 'AABCF4419K',
      },
      state: 'Telangana',
      portals: ['GST', 'IT'],
      sync: {
        status: 'error',
        errorMessage: 'Portal login failed - check saved credentials',
        lastSyncAt: daysAgoIso(10),
      },
    },
    {
      id: 'client-delta-foods',
      name: 'Delta Foods',
      identifiers: {
        pan: 'AABCD8812L',
      },
      state: 'Delhi',
      portals: [],
      sync: {
        status: 'error',
        errorMessage: 'Portal login failed - check saved credentials',
        lastSyncAt: daysAgoIso(12),
      },
    },
    {
      id: 'client-blue-lagoon',
      name: 'Blue Lagoon Cafe',
      identifiers: {
        pan: 'AABCB9912K',
      },
      state: 'Goa',
      portals: [],
      sync: {
        status: 'never_synced',
      },
    },
    {
      id: 'client-asha-kulkarni',
      name: 'Asha Kulkarni',
      identifiers: {
        pan: 'ABCDE1234F',
      },
      state: 'Maharashtra',
      portals: [],
      sync: {
        status: 'stale',
        lastSyncAt: daysAgoIso(25),
      },
    },
    {
      id: 'client-atlas-travels',
      name: 'Atlas Travels',
      identifiers: {
        pan: 'AABCA4412R',
      },
      state: 'Delhi',
      portals: [],
      sync: {
        status: 'stale',
        lastSyncAt: daysAgoIso(25),
      },
    },
    {
      id: 'client-bharat-traders',
      name: 'Bharat Traders',
      identifiers: {
        pan: 'AABCB3319M',
      },
      state: 'Madhya Pradesh',
      portals: [],
      sync: {
        status: 'stale',
        lastSyncAt: daysAgoIso(25),
      },
    },
  ];
}
