import type { Metadata } from "next";
import React from "react";

import { FileCaseForm } from "@/components/FileCaseForm";

export const metadata: Metadata = {
  title: "File a case | The Smaller Claims Court",
};

export default function FilePage() {
  return (
    <div className="space-y-10">
      <header className="text-center">
        <p className="eyebrow">Clerk&rsquo;s window</p>
        <h1 className="mt-4 font-display text-3xl text-brass-200 sm:text-4xl">File a case</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-oak-200/80">
          State your grievance plainly and completely. The court cannot rule on facts it has not
          been given, and it is not above ruling against you for vagueness.
        </p>
      </header>

      <FileCaseForm />
    </div>
  );
}
