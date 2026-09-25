import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ABSENCE_TYPES } from './absences';
import { monthSummary } from './calc';
import { STATES } from './holidays';
import { MONTHS, WEEKDAYS_SHORT, dateKey, fmtDuration, fmtHoursDecimal, fmtMoney, fmtTime, parseDateKey, pad } from './time';
import type { AppState, Project } from './types';

/** Die Standardschriften von jsPDF kennen nur WinAnsi – U+2212 (Minus) ersetzen. */
const pdfSafe = (s: string) => s.replace(/\u2212/g, '-');

export function buildMonthReport(state: AppState, project: Project, year: number, month0: number, now = Date.now()) {
  const sum = monthSummary(state, project, year, month0, now);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const title = `Monatsbericht ${MONTHS[month0]} ${year}`;
  const hasRate = project.hourlyRate > 0;
  const activeRules = sum.surcharges.map((s) => s.rule);

  doc.setFontSize(18);
  doc.text(title, 14, 18);
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(`Arbeitgeber / Projekt: ${project.name}`, 14, 25);
  doc.text(
    `Soll/Tag: ${fmtDuration(project.dailyTargetHours * 60)} h  ·  Feiertage: ${STATES[project.state] ?? '–'}`,
    14,
    30,
  );
  doc.text(`Erstellt am ${new Date(now).toLocaleDateString('de-DE')}`, pageWidth - 14, 18, { align: 'right' });
  doc.setTextColor(0);

  const body = sum.days.map((d): string[] => {
    const date = parseDateKey(d.date);
    const times = d.sessions
      .map((s) => `${fmtTime(s.start)}–${s.end ? fmtTime(s.end) + (dateKey(s.end) !== d.date ? ' (+1)' : '') : 'läuft'}`)
      .join('\n');
    const remarks: string[] = [];
    if (d.holiday) remarks.push(d.holiday);
    if (d.absence) remarks.push(ABSENCE_TYPES[d.absence.type].label + (d.absence.note ? `: ${d.absence.note}` : ''));
    if (d.autoBreak > 0) remarks.push(`inkl. ${Math.round(d.autoBreak)} min gesetzl. Pause`);
    for (const s of d.sessions) if (s.note) remarks.push(s.note);
    const surcharges = activeRules
      .filter((r) => (d.surcharges[r.id] ?? 0) > 0)
      .map((r) => `${r.name} ${fmtDuration(d.surcharges[r.id])}`)
      .join('\n');
    return [
      `${WEEKDAYS_SHORT[date.getDay()]} ${pad(date.getDate())}.${pad(month0 + 1)}.`,
      times,
      d.sessions.length ? fmtDuration(d.pause) : '',
      d.sessions.length ? fmtDuration(d.worked) : d.credit ? `(${fmtDuration(d.credit)})` : '',
      d.target ? fmtDuration(d.target) : '',
      surcharges,
      remarks.join('\n'),
    ];
  });

  autoTable(doc, {
    startY: 36,
    head: [['Datum', 'Zeiten', 'Pause', 'Arbeit', 'Soll', 'Zulagen', 'Bemerkung']],
    body: body.map((r) => r.map(pdfSafe)),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.4, valign: 'middle' },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 26 },
      2: { cellWidth: 13, halign: 'right' },
      3: { cellWidth: 14, halign: 'right' },
      4: { cellWidth: 13, halign: 'right' },
      5: { cellWidth: 36 },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const day = sum.days[data.row.index];
      if (!day.isWorkday || day.holiday) data.cell.styles.fillColor = [241, 245, 249];
      if (day.untracked) data.cell.styles.fillColor = [254, 242, 242];
    },
  });

  // Zusammenfassung
  const summaryRows: string[][] = [
    ['Gearbeitete Tage', String(sum.workedDays), ''],
    ['Arbeitszeit', `${fmtDuration(sum.worked)} h`, `${fmtHoursDecimal(sum.worked)} h`],
    ['Gutschrift (Urlaub, Krank …)', `${fmtDuration(sum.credit)} h`, `${fmtHoursDecimal(sum.credit)} h`],
    ['Soll', `${fmtDuration(sum.target)} h`, `${fmtHoursDecimal(sum.target)} h`],
    ['Saldo (Über-/Minusstunden)', `${fmtDuration(sum.balance, true)} h`, `${fmtHoursDecimal(sum.balance)} h`],
  ];
  for (const [type, count] of Object.entries(sum.absenceCounts)) {
    summaryRows.push([ABSENCE_TYPES[type as keyof typeof ABSENCE_TYPES].label, `${count} Tag(e)`, '']);
  }
  if (hasRate) summaryRows.push(['Grundlohn', fmtMoney(sum.baseWage), '']);

  const finalY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const summaryHeight = Math.max(summaryRows.length, sum.surcharges.length + 2) * 5.5 + 12;
  let y = finalY() + 8;
  if (y + summaryHeight > 285) {
    doc.addPage();
    y = 18;
  }
  const blockTop = y;
  const half = (pageWidth - 28 - 6) / 2;
  doc.setFontSize(12);
  doc.text('Zusammenfassung', 14, y);
  autoTable(doc, {
    startY: y + 2,
    body: summaryRows.map((r) => r.map(pdfSafe)),
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.2 },
    columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right', cellWidth: 22 }, 2: { halign: 'right', cellWidth: 20 } },
    margin: { left: 14 },
    tableWidth: half,
  });
  let bottom = finalY();

  if (sum.surcharges.length) {
    const left = 14 + half + 6;
    doc.setFontSize(12);
    doc.text('Zulagen', left, blockTop);
    const rows = sum.surcharges.map((s) => [
      s.rule.name,
      `${s.rule.percent} %`,
      `${fmtDuration(s.minutes)} h`,
      hasRate ? fmtMoney(s.amount) : '–',
    ]);
    if (hasRate) rows.push(['Summe', '', '', fmtMoney(sum.surchargeTotal)]);
    autoTable(doc, {
      startY: blockTop + 2,
      head: [['Zulage', 'Satz', 'Stunden', 'Betrag']],
      body: rows,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 1.4 },
      headStyles: { fillColor: [100, 116, 139] },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      didParseCell: (data) => {
        if (hasRate && data.section === 'body' && data.row.index === rows.length - 1) data.cell.styles.fontStyle = 'bold';
      },
      margin: { left },
      tableWidth: half,
    });
    bottom = Math.max(bottom, finalY());
  }

  // Unterschriften
  y = bottom + 22;
  if (y > 280) {
    doc.addPage();
    y = 40;
  }
  doc.setFontSize(9);
  doc.setDrawColor(120);
  doc.line(14, y, 84, y);
  doc.line(pageWidth - 84, y, pageWidth - 14, y);
  doc.text('Datum, Unterschrift Arbeitnehmer', 14, y + 4);
  doc.text('Datum, Unterschrift Arbeitgeber', pageWidth - 84, y + 4);

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(`${project.name} · ${title} · Seite ${i}/${pages}`, pageWidth / 2, 290, { align: 'center' });
  }

  const fileName = `Monatsbericht_${project.name.replace(/[^\wäöüÄÖÜß-]+/g, '_')}_${year}-${pad(month0 + 1)}.pdf`;
  return { doc, fileName };
}

export function exportMonthPdf(state: AppState, project: Project, year: number, month0: number) {
  const { doc, fileName } = buildMonthReport(state, project, year, month0);
  doc.save(fileName);
}
