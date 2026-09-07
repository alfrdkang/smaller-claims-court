import Link from "next/link";
import React from "react";

export default function NotFound() {
  return (
    <div className="paper mx-auto max-w-xl px-8 py-12 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-oak-700">
        Clerk&rsquo;s notice
      </p>
      <h1 className="mt-4 font-display text-2xl text-oak-950">No such page</h1>
      <p className="mt-4 text-sm leading-relaxed text-oak-800">
        There is no matter of this description before the court. The clerk suggests you file
        something instead.
      </p>
      <div className="mt-7 flex justify-center gap-3">
        <Link href="/file" className="btn-primary !py-2.5 !text-[11px]">
          File a case
        </Link>
        <Link
          href="/docket"
          className="btn-ghost !border-oak-900/40 !py-2.5 !text-[11px] !text-oak-800"
        >
          View the docket
        </Link>
      </div>
    </div>
  );
}
