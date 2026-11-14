import { jsPDF } from 'jspdf';
import type { IndicatorStatus, SymptomReport } from './types';

// Status colours from your colour scheme
const STATUS_RGB: Record<IndicatorStatus, [number, number, number]> = {
  normal: [0x79, 0xb8, 0x14],
  caution: [0xef, 0xc6, 0x21],
  warning: [0xe0, 0x2c, 0x2a],
  advisory: [0x39, 0x9d, 0xe3],
};
const TEXT_RGB: [number, number, number] = [0x2b, 0x26, 0x29];
const ACCENT_RGB: [number, number, number] = [0xe0, 0xb0, 0xbd];

function fileStem(r: SymptomReport) {
  return `symptom-report_${r.crew.id}_${r.createdAt.replace(/[:.]/g, '-')}`;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Machine-readable copy. The flight surgeon's software or your backend reads this one. */
export function reportToJsonBlob(report: SymptomReport): Blob {
  return new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
}

export function downloadJson(report: SymptomReport) {
  download(reportToJsonBlob(report), `${fileStem(report)}.json`);
}

/** Human-readable copy for the clinician to open and read. */
export function reportToPdf(report: SymptomReport): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };
  const heading = (text: string) => {
    ensureSpace(14);
    doc.setFillColor(...ACCENT_RGB);
    doc.rect(margin, y, contentW, 8, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...TEXT_RGB);
    doc.text(text, margin + 2, y + 5.5);
    y += 12;
  };
  const para = (text: string, size = 10, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(size).setTextColor(...TEXT_RGB);
    const lines = doc.splitTextToSize(text, contentW) as string[];
    ensureSpace(lines.length * size * 0.45 + 2);
    doc.text(lines, margin, y);
    y += lines.length * size * 0.45 + 2;
  };

  // Header
  doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(...TEXT_RGB);
  doc.text('Crew Symptom Report', margin, y + 6);
  y += 12;
  para(`${report.crew.name} (${report.crew.id}), mission ${report.crew.mission}`);
  para(`Created ${new Date(report.createdAt).toLocaleString()}   ·   Report ID ${report.reportId}`, 8);
  y += 2;

  // Symptoms
  heading('Reported symptoms');
  if (report.symptoms.length === 0) para('No symptoms reported.');
  report.symptoms.forEach((s) => {
    const name = s.name === 'Other' && s.customName ? s.customName : s.name;
    para(`${name}: severity ${s.severity}/10`, 11, true);
    para(
      [
        `Onset: ${new Date(s.onset).toLocaleString()}`,
        s.bodyLocation && `Location: ${s.bodyLocation}`,
        s.notes && `Notes: ${s.notes}`,
      ].filter(Boolean).join('\n'),
    );
    y += 1;
  });
  if (report.generalNotes) {
    para('General notes', 11, true);
    para(report.generalNotes);
  }

  // Sensor readings
  heading('Sensor readings at time of report');
  if (report.sensorSnapshot.length === 0) para('No sensor data attached.');
  report.sensorSnapshot.forEach((r) => {
    ensureSpace(7);
    if (r.status) {
      doc.setFillColor(...STATUS_RGB[r.status]);
      doc.circle(margin + 2, y - 1.3, 1.6, 'F');
    }
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...TEXT_RGB);
    doc.text(`${r.label}: ${r.value} ${r.unit}`, margin + 6, y);
    doc.setFontSize(8);
    doc.text(
      `${r.status ? r.status.toUpperCase() + '  ·  ' : ''}${new Date(r.timestamp).toLocaleTimeString()}`,
      pageW - margin, y, { align: 'right' },
    );
    y += 6;
  });

  // Photos, one per block, scaled to fit
  if (report.photos.length) heading(`Photos (${report.photos.length})`);
  report.photos.forEach((p, i) => {
    const maxH = 110;
    const scale = Math.min(contentW / p.width, maxH / p.height);
    const w = p.width * scale;
    const h = p.height * scale;
    ensureSpace(h + 18);
    doc.addImage(p.dataUrl, 'JPEG', margin, y, w, h);
    y += h + 4;
    para(
      `Photo ${i + 1}${p.bodyLocation ? `, ${p.bodyLocation}` : ''}, taken ${new Date(p.takenAt).toLocaleString()}` +
        (p.caption ? `\n${p.caption}` : '') +
        (p.guidanceAtCapture !== 'ok' ? `\nCaptured with a quality warning (${p.guidanceAtCapture.replace('_', ' ')}).` : ''),
      9,
    );
    y += 3;
  });

  return doc;
}

export function downloadPdf(report: SymptomReport) {
  reportToPdf(report).save(`${fileStem(report)}.pdf`);
}
