import type { SearchResult, BaselineResult } from '@/types';

interface RecordedFixture {
  query: string;
  docId: string;
  jev: SearchResult;
  baseline: BaselineResult;
}

export const recordedFixtures: RecordedFixture[] = [
  {
    query: 'Who owns the code I upload?',
    docId: 'acme-tos',
    jev: {
      where: 'L0014',
      exists: 0.97,
      topLines: [
        { lineId: 'L0014', text: 'You own all Content that you upload, create, or store using the services. Acme does not claim ownership of your Content.', relevance: 0.98 },
        { lineId: 'L0015', text: 'You retain all intellectual property rights in your Content.', relevance: 0.85 },
        { lineId: 'L0016', text: 'You grant Acme a worldwide, non-exclusive, royalty-free license to host, store, process, and transmit your Content as necessary to provide the services to you.', relevance: 0.42 },
        { lineId: 'L0013', text: '"Content" means any data, text, files, code, images, or other materials you upload or create using the services.', relevance: 0.35 },
        { lineId: 'L0017', text: 'You are solely responsible for the Content you upload and for ensuring it does not violate any law or third-party rights.', relevance: 0.28 },
      ],
      requests: [],
      responses: [{
        model: 'jev-1.13.0',
        answers: {
          where: { type: 'choice', choice: 'L0014', confidence: 0.98, probabilities: { L0014: 0.98, L0015: 0.85 } },
          exists: { type: 'noul', noul: 0.97 },
        },
        usage: { input_tokens: 1389, output_tokens: 450 },
      }],
      model: 'jev-1.13.0',
      usage: { input_tokens: 1389, output_tokens: 450 },
      latencyMs: 263,
      costUsd: 0.0000583,
      mode: 'single',
    },
    baseline: {
      topLines: [
        { lineId: 'L0014', text: 'You own all Content that you upload, create, or store using the services. Acme does not claim ownership of your Content.', relevance: 0.91 },
        { lineId: 'L0016', text: 'You grant Acme a worldwide, non-exclusive, royalty-free license to host, store, process, and transmit your Content as necessary to provide the services to you.', relevance: 0.78 },
        { lineId: 'L0013', text: '"Content" means any data, text, files, code, images, or other materials you upload or create using the services.', relevance: 0.72 },
        { lineId: 'L0015', text: 'You retain all intellectual property rights in your Content.', relevance: 0.68 },
        { lineId: 'L0017', text: 'You are solely responsible for the Content you upload and for ensuring it does not violate any law or third-party rights.', relevance: 0.61 },
      ],
      latencyMs: 412,
      costUsd: 0.0000104,
      model: 'text-embedding-3-small',
    },
  },
  {
    query: 'Can they kick me off without warning?',
    docId: 'acme-tos',
    jev: {
      where: 'L0023',
      exists: 0.95,
      topLines: [
        { lineId: 'L0023', text: 'Acme may suspend or terminate your account at any time without prior notice if we believe you have violated these Terms or any applicable law.', relevance: 0.97 },
        { lineId: 'L0024', text: 'Acme may also suspend or terminate accounts that are inactive for more than 12 consecutive months.', relevance: 0.55 },
        { lineId: 'L0025', text: 'Upon termination, your Content may be deleted after a 30-day grace period.', relevance: 0.38 },
        { lineId: 'L0026', text: 'You may terminate your account at any time by contacting support or through your account settings.', relevance: 0.22 },
      ],
      requests: [],
      responses: [{
        model: 'jev-1.13.0',
        answers: {
          where: { type: 'choice', choice: 'L0023', confidence: 0.97, probabilities: { L0023: 0.97, L0024: 0.55 } },
          exists: { type: 'noul', noul: 0.95 },
        },
        usage: { input_tokens: 1420, output_tokens: 420 },
      }],
      model: 'jev-1.13.0',
      usage: { input_tokens: 1420, output_tokens: 420 },
      latencyMs: 281,
      costUsd: 0.0000596,
      mode: 'single',
    },
    baseline: {
      topLines: [
        { lineId: 'L0023', text: 'Acme may suspend or terminate your account at any time without prior notice if we believe you have violated these Terms or any applicable law.', relevance: 0.88 },
        { lineId: 'L0024', text: 'Acme may also suspend or terminate accounts that are inactive for more than 12 consecutive months.', relevance: 0.71 },
        { lineId: 'L0025', text: 'Upon termination, your Content may be deleted after a 30-day grace period.', relevance: 0.58 },
        { lineId: 'L0026', text: 'You may terminate your account at any time by contacting support or through your account settings.', relevance: 0.52 },
        { lineId: 'L0022', text: 'You agree not to attempt to disrupt or compromise the security of the services.', relevance: 0.34 },
      ],
      latencyMs: 387,
      costUsd: 0.0000106,
      model: 'text-embedding-3-small',
    },
  },
  {
    query: 'Do I have to go to arbitration?',
    docId: 'acme-tos',
    jev: {
      where: null,
      exists: 0.08,
      topLines: [
        { lineId: 'L0036', text: 'These Terms are governed by the laws of the State of California, without regard to its conflict of laws principles.', relevance: 0.15 },
        { lineId: 'L0037', text: 'Any dispute arising from these Terms shall be resolved in the state or federal courts located in San Francisco County, California.', relevance: 0.12 },
        { lineId: 'L0030', text: 'You agree to indemnify and hold Acme harmless from any claims, damages, or expenses arising from your use of the services or your violation of these Terms.', relevance: 0.06 },
      ],
      requests: [],
      responses: [{
        model: 'jev-1.13.0',
        answers: {
          where: { type: 'choice', choice: 'L0036', confidence: 0.15, probabilities: { L0036: 0.15, L0037: 0.12 } },
          exists: { type: 'noul', noul: 0.08 },
        },
        usage: { input_tokens: 1389, output_tokens: 380 },
      }],
      model: 'jev-1.13.0',
      usage: { input_tokens: 1389, output_tokens: 380 },
      latencyMs: 245,
      costUsd: 0.0000583,
      mode: 'single',
    },
    baseline: {
      topLines: [
        { lineId: 'L0037', text: 'Any dispute arising from these Terms shall be resolved in the state or federal courts located in San Francisco County, California.', relevance: 0.72 },
        { lineId: 'L0036', text: 'These Terms are governed by the laws of the State of California, without regard to its conflict of laws principles.', relevance: 0.68 },
        { lineId: 'L0030', text: 'You agree to indemnify and hold Acme harmless from any claims, damages, or expenses arising from your use of the services or your violation of these Terms.', relevance: 0.41 },
        { lineId: 'L0031', text: 'We may update these Terms at any time. We will notify you of material changes by email or in-app notification.', relevance: 0.28 },
        { lineId: 'L0034', text: 'These Terms constitute the entire agreement between you and Acme regarding the services.', relevance: 0.22 },
      ],
      latencyMs: 398,
      costUsd: 0.0000104,
      model: 'text-embedding-3-small',
    },
  },
  {
    query: 'Can minors use it with parental permission?',
    docId: 'acme-tos',
    jev: {
      where: 'L0007',
      exists: 0.52,
      topLines: [
        { lineId: 'L0007', text: 'You must be at least 13 years of age to create an account and use the services. By registering, you represent that you meet this age requirement.', relevance: 0.78 },
        { lineId: 'L0008', text: 'You are responsible for maintaining the security of your account credentials. You must not share your password with anyone.', relevance: 0.12 },
        { lineId: 'L0006', text: '"Content" means any data, text, files, code, images, or other materials you upload or create using the services.', relevance: 0.05 },
      ],
      requests: [],
      responses: [{
        model: 'jev-1.13.0',
        answers: {
          where: { type: 'choice', choice: 'L0007', confidence: 0.78, probabilities: { L0007: 0.78, L0008: 0.12 } },
          exists: { type: 'noul', noul: 0.52 },
        },
        usage: { input_tokens: 1389, output_tokens: 410 },
      }],
      model: 'jev-1.13.0',
      usage: { input_tokens: 1389, output_tokens: 410 },
      latencyMs: 268,
      costUsd: 0.0000583,
      mode: 'single',
    },
    baseline: {
      topLines: [
        { lineId: 'L0007', text: 'You must be at least 13 years of age to create an account and use the services. By registering, you represent that you meet this age requirement.', relevance: 0.82 },
        { lineId: 'L0008', text: 'You are responsible for maintaining the security of your account credentials. You must not share your password with anyone.', relevance: 0.34 },
        { lineId: 'L0005', text: 'Acme means Acme Cloud, Inc.', relevance: 0.18 },
        { lineId: 'L0009', text: 'You are responsible for all activity that occurs under your account.', relevance: 0.15 },
        { lineId: 'L0006', text: '"Content" means any data, text, files, code, images, or other materials you upload or create using the services.', relevance: 0.12 },
      ],
      latencyMs: 375,
      costUsd: 0.0000104,
      model: 'text-embedding-3-small',
    },
  },
  {
    query: 'How many vacation days do I get?',
    docId: 'northwind-handbook',
    jev: {
      where: 'L0019',
      exists: 0.96,
      topLines: [
        { lineId: 'L0019', text: 'Full-time employees accrue 15 days of paid time off per year during their first 3 years. After 3 years, accrual increases to 20 days per year.', relevance: 0.96 },
        { lineId: 'L0020', text: 'PTO must be requested at least 2 weeks in advance and approved by a manager.', relevance: 0.35 },
        { lineId: 'L0021', text: 'Unused PTO of up to 5 days may be carried over to the following year.', relevance: 0.28 },
        { lineId: 'L0022', text: 'PTO is paid out upon termination for accrued but unused days.', relevance: 0.18 },
      ],
      requests: [],
      responses: [{
        model: 'jev-1.13.0',
        answers: {
          where: { type: 'choice', choice: 'L0019', confidence: 0.96, probabilities: { L0019: 0.96, L0020: 0.35 } },
          exists: { type: 'noul', noul: 0.96 },
        },
        usage: { input_tokens: 980, output_tokens: 350 },
      }],
      model: 'jev-1.13.0',
      usage: { input_tokens: 980, output_tokens: 350 },
      latencyMs: 198,
      costUsd: 0.0000412,
      mode: 'single',
    },
    baseline: {
      topLines: [
        { lineId: 'L0019', text: 'Full-time employees accrue 15 days of paid time off per year during their first 3 years. After 3 years, accrual increases to 20 days per year.', relevance: 0.89 },
        { lineId: 'L0020', text: 'PTO must be requested at least 2 weeks in advance and approved by a manager.', relevance: 0.65 },
        { lineId: 'L0021', text: 'Unused PTO of up to 5 days may be carried over to the following year.', relevance: 0.58 },
        { lineId: 'L0022', text: 'PTO is paid out upon termination for accrued but unused days.', relevance: 0.48 },
        { lineId: 'L0023', text: 'Employees receive 10 days of paid sick leave per year.', relevance: 0.32 },
      ],
      latencyMs: 305,
      costUsd: 0.0000074,
      model: 'text-embedding-3-small',
    },
  },
  {
    query: 'Can I work from another country for a month?',
    docId: 'northwind-handbook',
    jev: {
      where: null,
      exists: 0.11,
      topLines: [
        { lineId: 'L0015', text: 'Employees may work remotely up to 3 days per week with manager approval.', relevance: 0.22 },
        { lineId: 'L0016', text: 'Remote employees must maintain a reliable internet connection and be reachable during work hours.', relevance: 0.15 },
        { lineId: 'L0017', text: 'Employees who work remotely must attend in-person team meetings at least once per month.', relevance: 0.08 },
      ],
      requests: [],
      responses: [{
        model: 'jev-1.13.0',
        answers: {
          where: { type: 'choice', choice: 'L0015', confidence: 0.22, probabilities: { L0015: 0.22, L0016: 0.15 } },
          exists: { type: 'noul', noul: 0.11 },
        },
        usage: { input_tokens: 980, output_tokens: 340 },
      }],
      model: 'jev-1.13.0',
      usage: { input_tokens: 980, output_tokens: 340 },
      latencyMs: 212,
      costUsd: 0.0000412,
      mode: 'single',
    },
    baseline: {
      topLines: [
        { lineId: 'L0015', text: 'Employees may work remotely up to 3 days per week with manager approval.', relevance: 0.78 },
        { lineId: 'L0016', text: 'Remote employees must maintain a reliable internet connection and be reachable during work hours.', relevance: 0.62 },
        { lineId: 'L0017', text: 'Employees who work remotely must attend in-person team meetings at least once per month.', relevance: 0.55 },
        { lineId: 'L0018', text: 'Fully remote arrangements require director-level approval and are reviewed quarterly.', relevance: 0.48 },
        { lineId: 'L0013', text: 'Standard work hours are 9:00 AM to 5:00 PM, Monday through Friday.', relevance: 0.21 },
      ],
      latencyMs: 298,
      costUsd: 0.0000074,
      model: 'text-embedding-3-small',
    },
  },
  {
    query: 'What is the late fee for rent?',
    docId: 'maple-lease',
    jev: {
      where: 'L0028',
      exists: 0.94,
      sections: [
        { id: 'S05', heading: '5. Rent', probability: 0.88 },
        { id: 'S06', heading: '6. Security Deposit', probability: 0.06 },
        { id: 'S26', heading: '26. Remedies', probability: 0.03 },
      ],
      topLines: [
        { lineId: 'L0028', text: 'Rent is considered late if not received by the 5th day of the month. A late fee of 50 dollars applies to payments received after the 5th.', relevance: 0.91, sectionId: 'S05', sectionProb: 0.88 },
        { lineId: 'L0027', text: 'Tenant shall pay rent in the amount of 1,850 dollars per month, due on the first day of each month.', relevance: 0.42, sectionId: 'S05', sectionProb: 0.88 },
        { lineId: 'L0029', text: 'Rent payments must be made by electronic transfer, check, or money order. Cash is not accepted.', relevance: 0.18, sectionId: 'S05', sectionProb: 0.88 },
      ],
      requests: [],
      responses: [{
        model: 'jev-1.13.0',
        answers: {
          where: { type: 'choice', choice: 'L0028', confidence: 0.91, probabilities: { L0028: 0.91, L0027: 0.42 } },
          exists: { type: 'noul', noul: 0.94 },
        },
        usage: { input_tokens: 3200, output_tokens: 680 },
      }],
      model: 'jev-1.13.0',
      usage: { input_tokens: 3200, output_tokens: 680 },
      latencyMs: 542,
      costUsd: 0.0001344,
      mode: 'two_pass',
    },
    baseline: {
      topLines: [
        { lineId: 'L0028', text: 'Rent is considered late if not received by the 5th day of the month. A late fee of 50 dollars applies to payments received after the 5th.', relevance: 0.86 },
        { lineId: 'L0027', text: 'Tenant shall pay rent in the amount of 1,850 dollars per month, due on the first day of each month.', relevance: 0.72 },
        { lineId: 'L0029', text: 'Rent payments must be made by electronic transfer, check, or money order. Cash is not accepted.', relevance: 0.48 },
        { lineId: 'L0026', text: 'The lease term begins on the first day of the month and continues for 12 months.', relevance: 0.28 },
        { lineId: 'L0130', text: 'Upon default, Landlord may re-take possession of the Premises, terminate this lease, and recover all damages including unpaid rent, repair costs, and legal fees.', relevance: 0.22 },
      ],
      latencyMs: 687,
      costUsd: 0.0000234,
      model: 'text-embedding-3-small',
    },
  },
  {
    query: 'Can I install a home security system?',
    docId: 'maple-lease',
    jev: {
      where: null,
      exists: 0.07,
      sections: [
        { id: 'S14', heading: '14. Alterations', probability: 0.35 },
        { id: 'S11', heading: '11. Maintenance and Repairs', probability: 0.12 },
        { id: 'none', heading: 'none', probability: 0.48 },
      ],
      topLines: [
        { lineId: 'L0073', text: 'Tenant may not paint, alter, or modify the Premises without prior written consent from the Landlord.', relevance: 0.18, sectionId: 'S14', sectionProb: 0.35 },
        { lineId: 'L0074', text: 'Any approved alterations become the property of the Landlord upon lease termination.', relevance: 0.08, sectionId: 'S14', sectionProb: 0.35 },
      ],
      requests: [],
      responses: [{
        model: 'jev-1.13.0',
        answers: {
          where: { type: 'choice', choice: 'L0073', confidence: 0.18, probabilities: { L0073: 0.18, L0074: 0.08 } },
          exists: { type: 'noul', noul: 0.07 },
        },
        usage: { input_tokens: 2800, output_tokens: 520 },
      }],
      model: 'jev-1.13.0',
      usage: { input_tokens: 2800, output_tokens: 520 },
      latencyMs: 498,
      costUsd: 0.0001176,
      mode: 'two_pass',
    },
    baseline: {
      topLines: [
        { lineId: 'L0073', text: 'Tenant may not paint, alter, or modify the Premises without prior written consent from the Landlord.', relevance: 0.68 },
        { lineId: 'L0074', text: 'Any approved alterations become the property of the Landlord upon lease termination.', relevance: 0.52 },
        { lineId: 'L0067', text: 'Tenant is responsible for minor repairs costing less than 50 dollars including replacing light bulbs, smoke detector batteries, and air filters.', relevance: 0.35 },
        { lineId: 'L0068', text: 'Tenant must report all maintenance issues to Landlord within 48 hours of discovery.', relevance: 0.28 },
        { lineId: 'L0112', text: 'Firearms must be stored in a locked container or with a trigger lock when not being carried on the person.', relevance: 0.15 },
      ],
      latencyMs: 654,
      costUsd: 0.0000208,
      model: 'text-embedding-3-small',
    },
  },
];

export function findFixture(query: string, docId: string): RecordedFixture | undefined {
  return recordedFixtures.find(
    (f) => f.query.toLowerCase() === query.toLowerCase() && f.docId === docId,
  );
}
