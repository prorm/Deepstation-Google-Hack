// components/DataMapper.tsx
"use client";

import { useState, useEffect } from "react";

interface PlaceholderConfig {
  key: string;
  label: string;
  description: string;
  required: boolean;
  patterns: RegExp[];
}

const PLACEHOLDERS: PlaceholderConfig[] = [
  {
    key: "participantName",
    label: "Participant Name",
    description: "Full name printed on certificate",
    required: true,
    patterns: [/name/i, /participant/i, /student/i, /attendee/i],
  },
  {
    key: "track",
    label: "Track / Category",
    description: "Track name (Sovereign AI, Wellness, Cybersecurity, Open Innovation, Volunteer, Judge) or 1-6",
    required: false,
    patterns: [/track/i, /category/i, /role/i, /design/i, /domain/i],
  },
  {
    key: "usn",
    label: "USN / Registration No.",
    description: "Student USN (e.g. 1MS21AI001) - shown on Tracks 1-5",
    required: false,
    patterns: [/usn/i, /roll/i, /reg/i, /id/i],
  },
  {
    key: "teamName",
    label: "Team Name / Domain",
    description: "Team name for participants or Committee for volunteers",
    required: false,
    patterns: [/team/i, /group/i, /dept/i, /department/i],
  },
  {
    key: "email",
    label: "Email Address",
    description: "Recipient email address for dispatch",
    required: false,
    patterns: [/email/i, /mail/i],
  },
];

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
  const [defaultTrack, setDefaultTrack] = useState("1");
  const [eventId, setEventId] = useState("async-2026");
  const [eventName, setEventName] = useState("ASYNC '26 Hackathon");
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-detect and pre-map columns on header change
  useEffect(() => {
    const initialMapping: Record<string, string> = {};
    PLACEHOLDERS.forEach((placeholder) => {
      const match = headers.find((h) => 
        placeholder.patterns.some((pattern) => pattern.test(h.trim()))
      );
      if (match) {
        initialMapping[placeholder.key] = match;
      }
    });
    setMapping(initialMapping);
  }, [headers]);

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

    if (!mapping["participantName"]) {
      alert("Please map the 'Participant Name' column.");
      return;
    }

    setIsProcessing(true);
    
    // Transform the raw Excel rows using the user's mapping
    const formattedParticipants = excelData.map(row => {
      const metadata: Record<string, unknown> = {};
      
      // Save mapped fields
      PLACEHOLDERS.forEach(placeholder => {
        const mappedHeader = mapping[placeholder.key];
        if (mappedHeader && row[mappedHeader] != null) {
          metadata[placeholder.key] = row[mappedHeader];
        }
      });

      // Default track if track column isn't mapped or cell is empty
      if (!metadata["track"]) {
        metadata["track"] = defaultTrack;
      }

      // Preserve all other unmapped fields in metadata
      headers.forEach(header => {
        if (!Object.values(mapping).includes(header)) {
          metadata[header] = row[header];
        }
      });

      const emailHeader = mapping["email"];
      const resolvedEmail = emailHeader && row[emailHeader]
        ? String(row[emailHeader])
        : String(row["Email"] || row["email"] || "participant@test.com");

      return {
        email: resolvedEmail, 
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
          alert(`Success! Queued ${result.queued} certificates.`);
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
      <h3 className="text-xl font-bold mb-2 text-gray-900">Map CSV / Excel Columns to Certificate Fields</h3>
      <p className="text-sm text-gray-600 mb-6">
        The system dynamically loads designs 1 to 6 from <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800">Participation_volunteer_certificate</code> based on the participant's track.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div>
          <label htmlFor="event-id" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
            Event ID
          </label>
          <input
            id="event-id"
            type="text"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            placeholder="example: async-2026"
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>

        <div>
          <label htmlFor="event-name" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
            Event Name
          </label>
          <input
            id="event-name"
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="example: ASYNC '26 Hackathon"
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>
      </div>

      <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <label htmlFor="default-track" className="block text-xs font-bold text-blue-900 mb-1">
          Default Track / Design (Fallback if not present in CSV row)
        </label>
        <select
          id="default-track"
          value={defaultTrack}
          onChange={(e) => setDefaultTrack(e.target.value)}
          className="w-full border border-blue-300 rounded p-2 text-sm bg-white text-gray-800 font-medium"
        >
          <option value="1">1 - Sovereign AI Track (Participation)</option>
          <option value="2">2 - Wellness and Lifestyle Track (Participation)</option>
          <option value="3">3 - Cybersecurity and Defense Track (Participation)</option>
          <option value="4">4 - Open Innovation Track (Participation)</option>
          <option value="5">5 - Volunteering Certificate</option>
          <option value="6">6 - Judge Appreciation Certificate</option>
        </select>
      </div>

      <div className="space-y-3">
        {PLACEHOLDERS.map((field) => (
          <div 
            key={field.key} 
            className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition gap-2"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-gray-900">{field.label}</span>
                {field.required ? (
                  <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">REQUIRED</span>
                ) : (
                  <span className="text-[10px] bg-gray-200 text-gray-600 font-medium px-1.5 py-0.5 rounded">OPTIONAL</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{field.description}</p>
            </div>

            <select 
              className="border border-gray-300 rounded-lg p-2 text-sm w-full sm:w-64 bg-white text-gray-800 font-medium focus:ring-2 focus:ring-blue-500"
              value={mapping[field.key] || ""}
              onChange={(e) => handleMapChange(field.key, e.target.value)}
            >
              <option value="">-- Do Not Map --</option>
              {headers.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <button 
        onClick={handleGenerate}
        disabled={isProcessing || !eventId.trim() || !mapping["participantName"]}
        className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm tracking-wide uppercase"
      >
        {isProcessing ? "Processing & Generating..." : "Generate Certificates"}
      </button>
    </div>
  );
}