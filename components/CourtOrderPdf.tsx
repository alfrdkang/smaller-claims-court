import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import React from "react";

import type { Case } from "@/lib/types";

export interface CourtOrderProps {
  record: Case;
  judgeName: string;
  courtName: string;
  /** PNG data URI of a QR code pointing at the live case page. */
  qrDataUri?: string;
  caseUrl: string;
}

// Times/Helvetica/Courier are the PDF standard-14 faces: no font files to fetch,
// no network dependency at render time, and they already look like a court form.
const styles = StyleSheet.create({
  page: {
    paddingTop: 46,
    paddingBottom: 54,
    paddingHorizontal: 56,
    fontFamily: "Times-Roman",
    fontSize: 11,
    lineHeight: 1.5,
    color: "#1b1b1b",
  },
  rule: { borderBottomWidth: 2, borderBottomColor: "#1b1b1b", marginVertical: 8 },
  thinRule: { borderBottomWidth: 0.75, borderBottomColor: "#1b1b1b", marginVertical: 6 },
  courtName: {
    fontFamily: "Times-Bold",
    fontSize: 17,
    textAlign: "center",
    letterSpacing: 2.4,
  },
  courtSub: {
    fontSize: 9,
    textAlign: "center",
    letterSpacing: 1.6,
    marginTop: 4,
    color: "#3a3a3a",
  },
  docketRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontFamily: "Courier",
    fontSize: 9,
    marginTop: 10,
    color: "#3a3a3a",
  },
  caption: { marginTop: 18, flexDirection: "row" },
  captionParties: { width: "62%" },
  captionMeta: {
    width: "38%",
    borderLeftWidth: 0.75,
    borderLeftColor: "#1b1b1b",
    paddingLeft: 12,
  },
  party: { fontFamily: "Times-Bold", fontSize: 12 },
  partyRole: { fontSize: 8, letterSpacing: 1.4, color: "#5a5a5a", marginTop: 1 },
  vs: { fontFamily: "Times-Italic", fontSize: 10, marginVertical: 5 },
  metaLabel: { fontSize: 7.5, letterSpacing: 1.2, color: "#5a5a5a" },
  metaValue: { fontFamily: "Courier", fontSize: 9.5, marginBottom: 7 },
  title: {
    fontFamily: "Times-Bold",
    fontSize: 13,
    textAlign: "center",
    letterSpacing: 2,
    marginTop: 22,
    marginBottom: 4,
  },
  citation: {
    fontFamily: "Times-Italic",
    fontSize: 10.5,
    textAlign: "center",
    color: "#3a3a3a",
    marginBottom: 14,
  },
  sectionHead: {
    fontFamily: "Times-Bold",
    fontSize: 9,
    letterSpacing: 1.6,
    marginTop: 14,
    marginBottom: 4,
  },
  body: { textAlign: "justify" },
  award: {
    marginTop: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: "#1b1b1b",
    backgroundColor: "#f4f0e6",
  },
  awardLabel: { fontSize: 7.5, letterSpacing: 1.4, color: "#5a5a5a", marginBottom: 3 },
  awardText: { fontFamily: "Times-Bold", fontSize: 11.5 },
  signatureBlock: { marginTop: 30, flexDirection: "row", justifyContent: "space-between" },
  sealBox: { width: 120, alignItems: "center", justifyContent: "center" },
  seal: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1.5,
    borderColor: "#6f442d",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    color: "#6f442d",
  },
  sealTop: { fontSize: 5.5, letterSpacing: 0.7, color: "#6f442d" },
  sealGlyph: { fontSize: 22, color: "#6f442d", marginVertical: 7 },
  sealBottom: { fontSize: 5.5, letterSpacing: 0.7, color: "#6f442d" },
  signature: { width: 268, alignItems: "flex-end" },
  signatureName: { fontFamily: "Times-Italic", fontSize: 18 },
  signatureRule: {
    borderBottomWidth: 0.75,
    borderBottomColor: "#1b1b1b",
    width: "100%",
    marginTop: 2,
    marginBottom: 4,
  },
  signatureCaption: { fontSize: 8.5, letterSpacing: 0.8, color: "#3a3a3a" },
  qrRow: { marginTop: 26, flexDirection: "row", alignItems: "center" },
  qr: { width: 62, height: 62, marginRight: 10 },
  qrText: { fontSize: 7.5, color: "#5a5a5a", width: 300 },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 56,
    right: 56,
    textAlign: "center",
    fontSize: 7.5,
    fontFamily: "Times-Italic",
    color: "#5a5a5a",
    borderTopWidth: 0.75,
    borderTopColor: "#c9c2b4",
    paddingTop: 6,
  },
});

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

/** Numbers the sections in order, so an absent rebuttal doesn't leave a gap. */
function sectionNumbering() {
  let n = 0;
  return () => ROMAN[n++] ?? String(n);
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function CourtOrderPdf({
  record,
  judgeName,
  courtName,
  qrDataUri,
  caseUrl,
}: CourtOrderProps) {
  const verdict = record.verdict;
  const ordered = formatDate(verdict?.deliveredAt ?? record.createdAt);
  const section = sectionNumbering();

  return (
    <Document
      title={`${record.caseNumber} - ${record.plaintiff} v. ${record.defendant}`}
      author={judgeName}
      subject="Order of the Smaller Claims Court"
    >
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.courtName}>THE SMALLER CLAIMS COURT</Text>
        <Text style={styles.courtSub}>{courtName.toUpperCase()}</Text>
        <View style={styles.rule} />
        <View style={styles.docketRow}>
          <Text>DOCKET NO. {record.caseNumber}</Text>
          <Text>{verdict?.appeal ? "ON APPEAL" : "COURT OF FIRST INSTANCE"}</Text>
        </View>

        <View style={styles.caption}>
          <View style={styles.captionParties}>
            <Text style={styles.party}>{record.plaintiff}</Text>
            <Text style={styles.partyRole}>PLAINTIFF</Text>
            <Text style={styles.vs}>- against -</Text>
            <Text style={styles.party}>{record.defendant}</Text>
            <Text style={styles.partyRole}>DEFENDANT</Text>
          </View>
          <View style={styles.captionMeta}>
            <Text style={styles.metaLabel}>FILED</Text>
            <Text style={styles.metaValue}>{formatDate(record.createdAt)}</Text>
            <Text style={styles.metaLabel}>ORDERED</Text>
            <Text style={styles.metaValue}>{ordered}</Text>
            <Text style={styles.metaLabel}>EXHIBITS</Text>
            <Text style={styles.metaValue}>
              {record.evidence.length === 0 ? "NONE" : String(record.evidence.length)}
            </Text>
            <Text style={styles.metaLabel}>RELIEF SOUGHT</Text>
            <Text style={styles.metaValue}>{record.requestedDamages || "UNSPECIFIED"}</Text>
          </View>
        </View>

        <View style={styles.thinRule} />
        <Text style={styles.title}>
          {verdict?.appeal ? "OPINION AND ORDER ON APPEAL" : "FINDINGS, OPINION AND ORDER"}
        </Text>
        {verdict ? <Text style={styles.citation}>{verdict.caseCitation}</Text> : null}

        <Text style={styles.sectionHead}>{section()}. STATEMENT OF CLAIM</Text>
        <Text style={styles.body}>{record.description}</Text>

        {record.rebuttal ? (
          <>
            <Text style={styles.sectionHead}>{section()}. REBUTTAL OF THE DEFENDANT</Text>
            <Text style={styles.body}>{record.rebuttal}</Text>
          </>
        ) : null}

        {verdict ? (
          <>
            <Text style={styles.sectionHead}>{section()}. OPINION OF THE COURT</Text>
            <Text style={styles.body}>{verdict.reasoning}</Text>

            <Text style={styles.sectionHead}>{section()}. DISPOSITION</Text>
            <Text style={styles.body}>{verdict.ruling}</Text>

            <View style={styles.award}>
              <Text style={styles.awardLabel}>DAMAGES AND OBLIGATIONS AWARDED</Text>
              <Text style={styles.awardText}>{verdict.damagesAwarded}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionHead}>{section()}. STATUS</Text>
            <Text style={styles.body}>
              This matter has been filed but not yet heard. No findings have been entered and no
              relief has been granted.
            </Text>
          </>
        )}

        <View style={styles.signatureBlock}>
          <View style={styles.sealBox}>
            <View style={styles.seal}>
              <Text style={styles.sealTop}>SMALLER CLAIMS</Text>
              <Text style={styles.sealGlyph}>SC</Text>
              <Text style={styles.sealBottom}>COURT SEAL</Text>
            </View>
          </View>
          <View style={styles.signature}>
            <Text style={styles.signatureName}>{judgeName}</Text>
            <View style={styles.signatureRule} />
            <Text style={styles.signatureCaption}>{judgeName}</Text>
            <Text style={styles.signatureCaption}>
              {verdict?.appeal ? "Presiding, Court of Petty Appeals" : "Judge, Smaller Claims Court"}
            </Text>
            <Text style={styles.signatureCaption}>Entered {ordered}</Text>
          </View>
        </View>

        <View style={styles.qrRow}>
          {qrDataUri ? <Image style={styles.qr} src={qrDataUri} /> : null}
          <Text style={styles.qrText}>
            The complete record of this matter, including any recording of the ruling as delivered
            from the bench, is available at {caseUrl}
          </Text>
        </View>

        <Text style={styles.footer} fixed>
          This ruling is final and non-appealable, unless you ask really nicely.
        </Text>
      </Page>
    </Document>
  );
}
