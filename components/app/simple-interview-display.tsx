'use client';

import { useEffect, useState } from "react";
import { useRoomContext } from "@livekit/components-react";

export default function SimpleDataPrinter() {
  const [data, setData] = useState<any[]>([]);
  const room = useRoomContext();

  useEffect(() => {
    if (!room) return;

    room.registerTextStreamHandler('llm-structured-response', async (reader: any) => {
      try {
        const jsonString = await reader.readAll();
        const parsed = JSON.parse(jsonString);
        console.log("-------------------Simple Received:", parsed);
        setData(prev => [...prev, parsed]);
      } catch (error) {
        console.error("Error:", error);
      }
    });
  }, [room]);

  return (
    <div className="fixed right-4 top-4 w-96 max-h-96 overflow-auto bg-black/80 text-white p-4 rounded">
      <h3 className="font-bold mb-2">Structured Data:</h3>
      {data.map((item, i) => (
        <pre key={i} className="text-xs mb-2 p-2 bg-gray-900 rounded overflow-auto">
          {JSON.stringify(item, null, 2)}
        </pre>
      ))}
    </div>
  );
}