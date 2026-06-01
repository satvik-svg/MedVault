import type { IPrescription } from '../models/Prescription.ts'

function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

export function buildPrescriptionPdfDataUrl(prescription: IPrescription): string {
  const lines = [
    'MedVault Prescription',
    `Prescription: ${prescription.prescriptionNumber || prescription._id.toString()}`,
    `Issued: ${(prescription.issuedAt || prescription.createdAt || new Date()).toISOString()}`,
    '',
    'Medications:',
    ...(prescription.medications || []).map((medication, index) => {
      const duration = medication.dosage?.duration
      const durationText = duration?.value ? `${duration.value} ${duration.unit || 'DAYS'}` : 'as directed'
      return `${index + 1}. ${medication.brandName || medication.genericName} ${medication.strength || ''} ${medication.dosage?.frequency || ''} for ${durationText}`.trim()
    }),
  ]
  const text = lines.map(escapePdfText).join('\\n')
  const content = `BT /F1 12 Tf 72 760 Td (${text}) Tj ET`
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`,
  ]
  let offset = '%PDF-1.4\n'.length
  const xref = ['0000000000 65535 f ']
  for (const object of objects) {
    xref.push(`${offset.toString().padStart(10, '0')} 00000 n `)
    offset += object.length + 1
  }
  const body = objects.join('\n')
  const xrefStart = '%PDF-1.4\n'.length + body.length + 1
  const pdf = [
    '%PDF-1.4',
    body,
    `xref\n0 ${objects.length + 1}`,
    xref.join('\n'),
    `trailer << /Size ${objects.length + 1} /Root 1 0 R >>`,
    `startxref\n${xrefStart}`,
    '%%EOF',
  ].join('\n')
  return `data:application/pdf;base64,${Buffer.from(pdf).toString('base64')}`
}
