"use client";

import { useRouter } from "next/navigation";
import { UploadForm } from "@/components/UploadForm";

export function UploadSection() {
  const router = useRouter();

  return (
    <UploadForm
      onUploaded={() => {
        router.refresh();
      }}
    />
  );
}

