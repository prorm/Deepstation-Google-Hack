// components/DataMapper.tsx
"use client";

import { useState } from "react";

// The placeholders Swastik's engine expects
const REQUIRED_PLACEHOLDERS = ["participantName"]; 

type ExcelCell = string | number | boolean | null | undefined;
type ExcelRow = Record<string, ExcelCell>;

export default function DataMapper({ 
  headers, 
  excelData 
}: { 
  headers: string[], 
  excelData: ExcelRow[] 
}) {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [eventId, setEventId] = useState("");
  const [eventName, setEventName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMapChange = (placeholder: string, header: string) => {
    setMapping(prev => ({ ...prev, [placeholder]: header }));
  };

  const handleGenerate = async () => {
    const normalizedEventId = eventId.trim();
    const normalizedEventName = eventName.trim();
    if (!normalizedEventId) {
      alert("Please enter an Event ID before generating certificates.");
      return;
    }

    setIsProcessing(true);
    
    // Transform the raw Excel rows using the user's mapping
    const formattedParticipants = excelData.map(row => {
      const metadata: Record<string, unknown> = {};
      
      // Save mapped fields (like Name)
      REQUIRED_PLACEHOLDERS.forEach(placeholder => {
        const mappedHeader = mapping[placeholder];
        if (mappedHeader) {
          metadata[placeholder] = row[mappedHeader];
        }
      });

      // Dump EVERYTHING else into the JSON metadata so we don't lose data
      headers.forEach(header => {
        if (!Object.values(mapping).includes(header)) {
          metadata[header] = row[header];
        }
      });

      return {
        email: row["Email"] || row["email"] || "", 
        metadata: metadata
      };
    });

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: normalizedEventId,
          eventName: normalizedEventName || undefined,
          participants: formattedParticipants
        })
      });

      const result = await response.json();
      if (result.success) {
        if (result.deferred) {
          alert("Saved successfully, but the queue is temporarily unavailable. Please retry later to process the pending certificates.");
        } else {
          alert(`Success! Queued ${result.queued} certificates to the engine.`);
        }
      } else {
        alert("Failed to queue certificates.");
      }
    } catch (error) {
      console.error(error);
      alert("API Error.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 mt-6 bg-white rounded-xl shadow-md border border-gray-200">
      <h3 className="text-lg font-bold mb-4 text-gray-800">Map Columns to Canva Placeholders</h3>

      <div className="mb-3">
        <label htmlFor="event-id" className="block text-sm font-semibold text-gray-700 mb-1">
          Event ID
        </label>
        <input
          id="event-id"
          type="text"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          placeholder="example: ai-jack-of-aiml-trades-2026"
          className="w-full border border-gray-300 rounded p-2 text-sm bg-white"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="event-name" className="block text-sm font-semibold text-gray-700 mb-1">
          Event Name (optional)
        </label>
        <input
          id="event-name"
          type="text"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          placeholder="example: AI Jack Of AIML Trades"
          className="w-full border border-gray-300 rounded p-2 text-sm bg-white"
        />
      </div>
      
      {REQUIRED_PLACEHOLDERS.map(placeholder => (
        <div key={placeholder} className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded border">
          <span className="font-mono text-sm font-semibold text-blue-600">{`{{${placeholder}}}`}</span>
          <select 
            className="border border-gray-300 rounded p-2 text-sm w-64 bg-white"
            onChange={(e) => handleMapChange(placeholder, e.target.value)}
          >
            <option value="">Select Excel Column...</option>
            {headers.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
      ))}

      <button 
        onClick={handleGenerate}
        disabled={
          isProcessing ||
          !eventId.trim() ||
          !REQUIRED_PLACEHOLDERS.every((placeholder) => Boolean(mapping[placeholder]))
        }
        className="w-full mt-4 bg-black text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-all"
      >
        {isProcessing ? "Sending to Queue..." : "Generate Certificates"}
      </button>
    </div>
  );
}