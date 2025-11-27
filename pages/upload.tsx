import dynamic from "next/dynamic";
import React from "react";
const UploadQueue = dynamic(() => import("../app/components/UploadQueue"), { ssr: false });

export default function UploadPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl mb-4">Upload documents</h1>
      <UploadQueue />
    </div>
  );
}
