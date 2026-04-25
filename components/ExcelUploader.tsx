// components/ExcelUploader.tsx
"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import DataMapper from "./DataMapper"; 

export default function ExcelUploader() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [excelData, setExcelData] = useState<any[]>([]); // Changed to hold full data

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      if (jsonData.length > 0) {
        const columnHeaders = Object.keys(jsonData[0] as object);
        setHeaders(columnHeaders);
        setExcelData(jsonData); // Store the full array to pass to the mapper
      }
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="p-6 bg-white rounded-xl shadow-md border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Upload Participants</h2>
        <input 
          type="file" 
          accept=".xlsx, .xls, .csv" 
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
        />
      </div>

      {/* ONLY SHOW THE MAPPER IF WE HAVE HEADERS */}
      {headers.length > 0 && (
        <DataMapper headers={headers} excelData={excelData} />
      )}
    </div>
  );
}