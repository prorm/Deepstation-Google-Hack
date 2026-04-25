import ExcelUploader from "../components/ExcelUploader";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-extrabold text-gray-900 text-center">
          Certificate Generation Engine
        </h1>
        <ExcelUploader />
      </div>
    </main>
  );
}