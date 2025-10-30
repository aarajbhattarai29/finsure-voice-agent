'use client';

import { useEffect, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';

export default function SimpleDataPrinter() {
  const [data, setData] = useState<any[]>([]);
  const room = useRoomContext();

  useEffect(() => {
    if (!room) return;

    room.registerTextStreamHandler('llm-structured-response', async (reader: any) => {
      try {
        const jsonString = await reader.readAll();
        const parsed = JSON.parse(jsonString);
        console.log('-------------------Simple Received:', parsed);
        setData((prev) => [...prev, parsed]);
      } catch (error) {
        console.error('Error:', error);
      }
    });
  }, [room]);

  return (
    <div className="fixed top-4 right-4 max-h-96 w-96 overflow-auto rounded bg-black/80 p-4 text-white">
      <h3 className="mb-2 font-bold">Structured Data:</h3>
      {data.map((item, i) => (
        <pre key={i} className="mb-2 overflow-auto rounded bg-gray-900 p-2 text-xs">
          {JSON.stringify(item, null, 2)}
        </pre>
      ))}
    </div>
  );
}
