export type PersonaId = "grimsby" | "vex" | "calloway";

export interface EvidenceItem {
  id: string;
  uploadedBy: string;
  /** data: URI. Kept small (see MAX_EVIDENCE_BYTES) so cases stay serialisable. */
  imageUrl: string;
  caption?: string;
  createdAt: number;
}

export interface Verdict {
  caseCitation: string;
  reasoning: string;
  ruling: string;
  damagesAwarded: string;
  /** Endpoint that streams the ElevenLabs audio, or null if TTS was unavailable. */
  audioUrl: string | null;
  personaId: PersonaId;
  /** Set when this verdict is the result of an appeal. */
  appeal?: boolean;
  deliveredAt: number;
}

export type CaseStatus = "filed" | "judged";

export interface Case {
  id: string;
  /** Human-facing docket number, e.g. PC-2026-0042. */
  caseNumber: string;
  plaintiff: string;
  defendant: string;
  description: string;
  requestedDamages: string;
  personaId: PersonaId;
  evidence: EvidenceItem[];
  rebuttal?: string;
  status: CaseStatus;
  verdict?: Verdict;
  /** Prior verdicts, oldest first, pushed here when a case is appealed. */
  history: Verdict[];
  createdAt: number;
}

/** A case with the heavy fields (evidence data URIs, audio) stripped. */
export interface CaseSummary {
  id: string;
  caseNumber: string;
  plaintiff: string;
  defendant: string;
  description: string;
  requestedDamages: string;
  personaId: PersonaId;
  status: CaseStatus;
  evidenceCount: number;
  appealed: boolean;
  ruling?: string;
  damagesAwarded?: string;
  caseCitation?: string;
  createdAt: number;
}

export function toSummary(c: Case): CaseSummary {
  return {
    id: c.id,
    caseNumber: c.caseNumber,
    plaintiff: c.plaintiff,
    defendant: c.defendant,
    description: c.description,
    requestedDamages: c.requestedDamages,
    personaId: c.personaId,
    status: c.status,
    evidenceCount: c.evidence.length,
    appealed: c.history.length > 0,
    ruling: c.verdict?.ruling,
    damagesAwarded: c.verdict?.damagesAwarded,
    caseCitation: c.verdict?.caseCitation,
    createdAt: c.createdAt,
  };
}
