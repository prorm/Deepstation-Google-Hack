import { prisma } from "@/lib/prisma";

// Ensure Next.js doesn't cache this page so it updates in real-time
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  // Fetch all participants and include their linked certificate data
  const participants = await prisma.participant.findMany({
    include: {
      certificate: true,
    },
    orderBy: {
      id: "desc", // Show the newest uploads first
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Certificate Dashboard</h1>
          <div className="bg-white px-4 py-2 rounded-lg shadow border border-gray-200">
            <span className="text-sm font-semibold text-gray-600">Total Records: {participants.length}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Participant Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {participants.map((p) => {
                // Safely extract the name from the JSON metadata
                const metadata = p.metadata as { participantName?: string } | null;
                const name = metadata?.participantName || "Unknown";
                const status = p.certificate?.status || "UNKNOWN";
                const fileUrl = p.certificate?.fileUrl;

                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {p.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${status === 'COMPLETED' ? 'bg-green-100 text-green-800' : ''}
                        ${status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${status === 'FAILED' ? 'bg-red-100 text-red-800' : ''}
                        ${status === 'UNKNOWN' ? 'bg-gray-100 text-gray-800' : ''}
                      `}>
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {status === "COMPLETED" && fileUrl ? (
                        <a 
                          href={fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 px-4 py-2 rounded-md transition-colors"
                        >
                          View PDF
                        </a>
                      ) : (
                        <span className="text-gray-400 italic">Processing...</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {participants.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No participants found. Go upload an Excel sheet!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}