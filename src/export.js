import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function slug(name) {
  return (name || "organization").trim().replace(/\s+/g, "_");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportDashboardExcel(data) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "CCI";
  wb.created = new Date(data.generatedAt);

  const summary = wb.addWorksheet("Summary");
  summary.columns = [
    { header: "Metric", key: "metric", width: 32 },
    { header: "Value", key: "value", width: 60 },
  ];
  summary.addRows([
    { metric: "Organization", value: data.org.name },
    { metric: "Generated", value: new Date(data.generatedAt).toLocaleString() },
    { metric: "Unified Compliance Score", value: `${data.unified}%` },
    { metric: "Risk Score", value: `${data.riskIndex}/100` },
    { metric: "Connectors", value: `${data.health.connected} / ${data.health.total} connected` },
  ]);
  summary.getRow(1).font = { bold: true };
  if (data.gapAnalysis) {
    summary.addRow({});
    summary.addRow({ metric: "Gap Analysis Summary", value: data.gapAnalysis.overallSummary });
    summary.getRow(summary.rowCount).font = { italic: true };
  }

  const fwSheet = wb.addWorksheet("Framework Compliance");
  fwSheet.columns = [
    { header: "Code", key: "code", width: 16 },
    { header: "Framework", key: "name", width: 32 },
    { header: "Compliance %", key: "score", width: 16 },
    { header: "Notes", key: "summary", width: 70 },
  ];
  data.perFramework.forEach((f) => fwSheet.addRow({ code: f.code, name: f.name, score: f.score, summary: f.summary || "" }));
  fwSheet.getRow(1).font = { bold: true };

  const risksSheet = wb.addWorksheet("Open Risks");
  risksSheet.columns = [
    { header: "Code", key: "code", width: 14 },
    { header: "Framework", key: "framework", width: 14 },
    { header: "Title", key: "title", width: 42 },
    { header: "Owner", key: "owner", width: 20 },
    { header: "Score", key: "score", width: 10 },
    { header: "Status", key: "status", width: 16 },
  ];
  data.openRisks.forEach((r) => risksSheet.addRow({ code: r.code, framework: r.framework, title: r.title, owner: r.owner, score: r.score, status: r.status }));
  risksSheet.getRow(1).font = { bold: true };

  if (data.gapAnalysis?.riskControlGaps?.length) {
    const chainSheet = wb.addWorksheet("Risk-Control-Gap");
    chainSheet.columns = [
      { header: "Risk", key: "risk", width: 34 },
      { header: "Risk Level", key: "riskLevel", width: 12 },
      { header: "Score", key: "riskScore", width: 8 },
      { header: "Control", key: "control", width: 26 },
      { header: "ISO27001", key: "iso", width: 22 },
      { header: "SAMA", key: "sama", width: 22 },
      { header: "NCAECC", key: "ncaecc", width: 22 },
      { header: "Evidence", key: "evidenceStatus", width: 12 },
      { header: "Evidence Note", key: "evidenceNote", width: 50 },
      { header: "Gap", key: "gap", width: 60 },
      { header: "Remediation", key: "remediation", width: 60 },
    ];
    data.gapAnalysis.riskControlGaps.forEach((item) => {
      const byCode = Object.fromEntries((item.frameworkMapping || []).map((f) => [f.code, `${f.controlRef} · ${f.status}`]));
      chainSheet.addRow({
        risk: item.risk,
        riskLevel: item.riskLevel,
        riskScore: item.riskScore,
        control: item.control,
        iso: byCode.ISO27001 || "",
        sama: byCode.SAMA || "",
        ncaecc: byCode.NCAECC || "",
        evidenceStatus: item.evidenceStatus,
        evidenceNote: item.evidenceNote,
        gap: item.gap,
        remediation: item.remediation,
      });
    });
    chainSheet.getRow(1).font = { bold: true };
  }

  if (data.aiRecommendations?.length) {
    const recSheet = wb.addWorksheet("AI Recommendations");
    recSheet.columns = [
      { header: "Title", key: "title", width: 36 },
      { header: "Details", key: "body", width: 70 },
      { header: "Compliance Impact", key: "complianceDelta", width: 18 },
      { header: "Risk Impact", key: "riskDelta", width: 14 },
      { header: "Effort", key: "effort", width: 12 },
      { header: "Frameworks", key: "frameworks", width: 28 },
    ];
    data.aiRecommendations.forEach((r) => recSheet.addRow({ ...r, frameworks: (r.frameworks || []).join(", ") }));
    recSheet.getRow(1).font = { bold: true };
  }

  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${slug(data.org.name)}_dashboard_export.xlsx`
  );
}

export function exportDashboardPDF(data) {
  const doc = new jsPDF({ unit: "pt" });
  const marginX = 40;
  const pageBottom = 780;
  let y = 50;

  const ensureSpace = (needed) => {
    if (y + needed > pageBottom) {
      doc.addPage();
      y = 50;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Executive Compliance Report", marginX, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${data.org.name} — Generated ${new Date(data.generatedAt).toLocaleString()}`, marginX, y);
  y += 20;
  doc.setTextColor(0);

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Unified Compliance Score", `${data.unified}%`],
      ["Risk Score", `${data.riskIndex}/100`],
      ["Connectors", `${data.health.connected} / ${data.health.total} connected`],
    ],
    theme: "grid",
    headStyles: { fillColor: [140, 124, 250] },
    margin: { left: marginX, right: marginX },
  });
  y = doc.lastAutoTable.finalY + 24;

  if (data.gapAnalysis) {
    ensureSpace(60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Gap Analysis Summary", marginX, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(data.gapAnalysis.overallSummary, 515);
    doc.text(lines, marginX, y);
    y += lines.length * 13 + 16;
  }

  ensureSpace(60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Framework Compliance", marginX, y);
  autoTable(doc, {
    startY: y + 10,
    head: [["Code", "Framework", "Compliance %"]],
    body: data.perFramework.map((f) => [f.code, f.name, `${f.score}%`]),
    theme: "striped",
    margin: { left: marginX, right: marginX },
  });
  y = doc.lastAutoTable.finalY + 24;

  if (data.gapAnalysis?.riskControlGaps?.length) {
    ensureSpace(80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Risk → Control → Frameworks → Gap", marginX, y);
    autoTable(doc, {
      startY: y + 10,
      head: [["Risk", "Control", "ISO27001", "SAMA", "NCAECC", "Evidence", "Gap", "Remediation"]],
      body: data.gapAnalysis.riskControlGaps.map((item) => {
        const byCode = Object.fromEntries((item.frameworkMapping || []).map((f) => [f.code, `${f.controlRef} (${f.status})`]));
        return [
          `${item.risk} [${item.riskLevel} ${item.riskScore}]`,
          item.control,
          byCode.ISO27001 || "",
          byCode.SAMA || "",
          byCode.NCAECC || "",
          item.evidenceStatus,
          item.gap,
          item.remediation,
        ];
      }),
      theme: "striped",
      styles: { fontSize: 7 },
      columnStyles: { 0: { cellWidth: 90 }, 6: { cellWidth: 90 }, 7: { cellWidth: 90 } },
      margin: { left: marginX, right: marginX },
    });
    y = doc.lastAutoTable.finalY + 24;
  }

  if (data.openRisks?.length) {
    ensureSpace(80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Top Missing Controls / Risks", marginX, y);
    autoTable(doc, {
      startY: y + 10,
      head: [["Code", "Framework", "Title", "Owner", "Score", "Status"]],
      body: data.openRisks.map((r) => [r.code, r.framework, r.title, r.owner, r.score, r.status]),
      theme: "striped",
      styles: { fontSize: 8 },
      margin: { left: marginX, right: marginX },
    });
    y = doc.lastAutoTable.finalY + 24;
  }

  if (data.aiRecommendations?.length) {
    ensureSpace(80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("AI Recommendations", marginX, y);
    autoTable(doc, {
      startY: y + 10,
      head: [["Title", "Compliance", "Risk", "Effort"]],
      body: data.aiRecommendations.map((r) => [r.title, r.complianceDelta, r.riskDelta, r.effort]),
      theme: "striped",
      margin: { left: marginX, right: marginX },
    });
  }

  doc.save(`${slug(data.org.name)}_executive_report.pdf`);
}
