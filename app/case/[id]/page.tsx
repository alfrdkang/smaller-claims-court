import type { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";

import { CaseFile } from "@/components/CaseFile";
import { getCase } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const record = await getCase(id);
  if (!record) return { title: "Case not found | The Smaller Claims Court" };

  const title = `${record.plaintiff} v. ${record.defendant} (${record.caseNumber})`;
  const description =
    record.verdict?.ruling ??
    `${record.description.slice(0, 160)}${record.description.length > 160 ? "..." : ""}`;

  return {
    title: `${title} | The Smaller Claims Court`,
    description,
    openGraph: { title, description, type: "article" },
  };
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getCase(id);
  if (!record) notFound();

  return <CaseFile initialCase={record} />;
}
