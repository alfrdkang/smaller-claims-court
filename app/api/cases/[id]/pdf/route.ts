import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import QRCode from "qrcode";
import React from "react";

import { CourtOrderPdf } from "@/components/CourtOrderPdf";
import { notFound } from "@/lib/http";
import { APPELLATE, getPersona } from "@/lib/personas";
import { caseUrl, COURT_NAME, orderFilename } from "@/lib/site";
import { getCase } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/cases/:id/pdf - the order, as a document you can wave at someone. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getCase(id);
  if (!record) return notFound();

  const url = caseUrl(id, req);

  let qrDataUri: string | undefined;
  try {
    qrDataUri = await QRCode.toDataURL(url, { margin: 1, width: 240, errorCorrectionLevel: "M" });
  } catch (err) {
    // A missing QR code is not worth failing the download over.
    console.warn("[pdf] QR generation failed:", err);
  }

  const judgeName = record.verdict?.appeal ? APPELLATE.name : getPersona(record.personaId).name;

  // renderToBuffer is typed against the <Document> element itself; our wrapper
  // returns exactly that, but the component's own props don't satisfy the signature.
  const order = React.createElement(CourtOrderPdf, {
    record,
    judgeName,
    courtName: COURT_NAME,
    qrDataUri,
    caseUrl: url,
  }) as React.ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(order);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${orderFilename(
        record.caseNumber,
        record.plaintiff,
        record.defendant,
      )}"`,
      "Cache-Control": "no-store",
    },
  });
}
