// components/DataMapper.tsx
"use client";

import { useState } from "react";

// The placeholders Swastik's engine expects
const REQUIRED_PLACEHOLDERS = ["participantName"]; 

export default function DataMapper({ 
  headers, 
  excelData 
}: { 
  headers: string[], 
  excelData: any[] 
}) {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMapChange = (placeholder: string, header: string) => {
    setMapping(prev => ({ ...prev, [placeholder]: header }));
  };

  const handleGenerate = async () => {
    setIsProcessing(true);
    
    // Transform the raw Excel rows using the user's mapping
    const formattedParticipants = excelData.map(row => {
      const metadata: any = {};
      
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

    // Hardcoded Event ID for this test run
    const dummyEventId = "test-event-123";

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: dummyEventId,
          participants: formattedParticipants
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`Success! Queued ${result.queued} certificates to the engine.`);
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
        disabled={isProcessing || Object.keys(mapping).length < REQUIRED_PLACEHOLDERS.length}
        className="w-full mt-4 bg-black text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-all"
      >
        {isProcessing ? "Sending to Queue..." : "Generate Certificates"}
      </button>
    </div>
  );
}