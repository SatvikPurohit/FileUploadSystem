// components/UploadQueue.tsx
import React, { useRef } from "react";
import { useServerUploadQueue, type UploadItem } from "../../hooks/useServerUploadQueue";

export default function UploadQueue() {
  const { items, enqueue, cancelOne, retry, cancelAll } = useServerUploadQueue(3);
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="p-4">
      <div className="mb-4">
        <input ref={fileRef} type="file" multiple onChange={e => e.target.files && enqueue(e.target.files)} />
        <button className="ml-2 px-3 py-1 bg-gray-700 text-white rounded" onClick={() => fileRef.current?.click()}>Select files</button>
        <button className="ml-2 px-3 py-1 bg-red-600 text-white rounded" onClick={() => cancelAll()}>Cancel All</button>
      </div>

      <div className="space-y-3">
        {items.map((it: UploadItem) => (
          <div key={it.id} className="p-3 border rounded flex items-center justify-between">
            <div style={{ width: "60%" }}>
              <div className="font-medium">{it.file.name}</div>
              <div className="text-sm text-gray-600">{it.status} • {it.progress}%</div>
              <div className="w-full bg-gray-200 h-2 rounded mt-2">
                <div style={{ width: `${it.progress}%` }} className="h-2 bg-green-500 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {it.status === "failed" && <button className="px-2 py-1 bg-yellow-500 rounded" onClick={() => retry(it.id)}>Retry</button>}
              {it.status !== "success" && <button className="px-2 py-1 bg-red-500 rounded" onClick={() => cancelOne(it.id)}>Cancel</button>}
              {it.status === "success" && <a className="px-2 py-1 bg-blue-600 text-white rounded" href={`/api/download?docId=${it.docId}`} >Download</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
