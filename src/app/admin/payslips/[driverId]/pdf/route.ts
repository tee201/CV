import { NextResponse, type NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireAdmin } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { getDriverById } from "@/lib/data/drivers";
import { getWorkLogsForDriver } from "@/lib/data/work-logs";
import { calculateDayPay, calculatePeriodTotal, formatGBP } from "@/lib/payslip/calculate";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ driverId: string }> }) {
  await requireAdmin();
  const { driverId } = await params;

  const from = request.nextUrl.searchParams.get("from") ?? "";
  const to = request.nextUrl.searchParams.get("to") ?? "";
  if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) {
    return NextResponse.json({ error: "Provide a valid from/to date range." }, { status: 400 });
  }

  const supabase = await createClient();
  const driver = await getDriverById(supabase, driverId);
  if (!driver) {
    return NextResponse.json({ error: "Driver not found." }, { status: 404 });
  }

  const workLogs = await getWorkLogsForDriver(supabase, driverId, { from, to });
  const total = calculatePeriodTotal(workLogs.map((log) => ({ drops: log.drops, isTraining: log.is_training })));

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const marginX = 50;
  const slate900 = rgb(0.06, 0.09, 0.16);
  const slate500 = rgb(0.39, 0.45, 0.55);

  let y = 780;
  page.drawText("Payslip", { x: marginX, y, size: 22, font: bold, color: slate900 });
  y -= 28;
  page.drawText(driver.full_name, { x: marginX, y, size: 14, font: bold, color: slate900 });
  y -= 18;
  page.drawText(`${formatDate(from)} - ${formatDate(to)}`, { x: marginX, y, size: 11, font, color: slate500 });
  y -= 36;

  const columns = [
    { label: "Date", x: marginX, width: 90 },
    { label: "Route", x: marginX + 90, width: 70 },
    { label: "Drops", x: marginX + 160, width: 70 },
    { label: "Type", x: marginX + 230, width: 90 },
    { label: "Pay", x: marginX + 400, width: 90 },
  ];

  function drawRow(cells: string[], options: { bold?: boolean; color?: ReturnType<typeof rgb> } = {}) {
    const rowFont = options.bold ? bold : font;
    columns.forEach((col, i) => {
      page.drawText(cells[i] ?? "", { x: col.x, y, size: 10, font: rowFont, color: options.color ?? slate900 });
    });
  }

  drawRow(
    columns.map((c) => c.label),
    { bold: true, color: slate500 },
  );
  y -= 8;
  page.drawLine({ start: { x: marginX, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.85, 0.87, 0.91) });
  y -= 16;

  if (workLogs.length === 0) {
    page.drawText("No days logged in this period.", { x: marginX, y, size: 10, font, color: slate500 });
    y -= 20;
  }

  for (const log of workLogs) {
    if (y < 80) break; // Single-page payslip; long periods are truncated rather than paginated.
    const pay = calculateDayPay(log.drops, log.is_training);
    drawRow([
      formatDate(log.work_date),
      log.route_number,
      log.is_training ? "-" : String(log.drops),
      log.is_training ? "Training" : "Standard",
      formatGBP(pay),
    ]);
    y -= 20;
  }

  y -= 10;
  page.drawLine({ start: { x: marginX, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.85, 0.87, 0.91) });
  y -= 24;
  page.drawText("Total pay", { x: marginX + 230, y, size: 12, font: bold, color: slate900 });
  page.drawText(formatGBP(total), { x: marginX + 400, y, size: 12, font: bold, color: slate900 });

  const pdfBytes = await pdfDoc.save();
  const filename = `payslip-${driver.full_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${from}-to-${to}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
