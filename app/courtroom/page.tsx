import type { Metadata } from "next";

import { CourtroomPreview } from "@/components/courtroom/CourtroomPreview";

export const metadata: Metadata = {
  title: "Courtroom No. 01 | The Smaller Claims Court",
  description: "A small room for matters of enormous personal importance.",
};

export default function CourtroomPage() {
  return <CourtroomPreview />;
}
