"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

export default function ExcelUploader() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const data = event.target?.result;
      // Parse the file
      const workbook = XLSX.read(data, { type: "binary" });
      
      // Grab the first sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      if (jsonData.length > 0) {
        // Extract the column headers from the first row
        const columnHeaders = Object.keys(jsonData[0] as object);
        setHeaders(columnHeaders);
        setPreviewData(jsonData.slice(0, 3)); // Keep a preview of the first 3 rows
        
        console.log("Extracted Headers:", columnHeaders);
        console.log("Parsed Data:", jsonData);
      }
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-md space-y-4 border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800">Upload Participants</h2>
      <p className="text-sm text-gray-500">Upload your Excel or CSV file to begin mapping.</p>
      
      <input 
        type="file" 
        accept=".xlsx, .xls, .csv" 
        onChange={handleFileUpload}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-md file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100 cursor-pointer"
      />

      {headers.length > 0 && (
        <div className="mt-4 p-4 bg-green-50 rounded-md border border-green-200">
          <h3 className="text-sm font-semibold text-green-800">File Parsed Successfully!</h3>
          <p className="text-xs text-green-600 mt-1">Found {headers.length} columns: {headers.join(", ")}</p>
        </div>
      )}
    </div>
  );
}