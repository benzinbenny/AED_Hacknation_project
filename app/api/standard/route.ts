import { NextResponse } from "next/server";
import { createStandardWorkbook } from "@/export/workbook";

export const runtime = "nodejs";

export async function GET() {
  const workbook = await createStandardWorkbook();
  return new NextResponse(new Uint8Array(workbook), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename*=UTF-8''Punkt-Zycia-standard-danych-AED.xlsx",
      "Cache-Control": "no-store",
    },
  });
}
