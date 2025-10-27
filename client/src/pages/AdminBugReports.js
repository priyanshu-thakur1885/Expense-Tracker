import React, { useEffect, useState } from "react";
import { Bug, Mail, Loader2, AlertTriangle, CheckCircle } from "lucide-react";

const AdminBugReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const API_BASE = process.env.REACT_APP_API_URL || "";
        const res = await fetch(`${API_BASE}/api/bugreport`);
        const data = await res.json();
        setReports(data);
      } catch (err) {
        console.error("Error fetching bug reports:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-red-500" />
        <span className="ml-2 text-gray-600">Loading bug reports...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Bug className="text-red-500" /> Bug Reports
      </h1>

      {reports.length === 0 ? (
        <p className="text-gray-500 text-center mt-10">No bug reports found.</p>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <div
              key={report._id}
              className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition cursor-pointer"
              onClick={() => setSelectedReport(report)}
            >
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  {report.title}
                </h2>
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    report.severity === "critical"
                      ? "bg-red-100 text-red-700"
                      : report.severity === "high"
                      ? "bg-orange-100 text-orange-700"
                      : report.severity === "medium"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {report.severity}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                {report.description}
              </p>
              <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                <Mail className="w-3 h-3" /> {report.userEmail}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Details */}
      {selectedReport && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Bug className="text-red-500" /> {selectedReport.title}
            </h2>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Severity:</strong> {selectedReport.severity}
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Description:</strong> {selectedReport.description}
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Steps:</strong> {selectedReport.steps || "N/A"}
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Reported by:</strong> {selectedReport.userName} (
              {selectedReport.userEmail})
            </p>
            <p className="text-xs text-gray-500 mb-4">
              {new Date(selectedReport.createdAt).toLocaleString()}
            </p>

            {selectedReport.attachments?.length > 0 && (
              <div className="mb-4">
                <strong className="text-sm text-gray-700">Attachments:</strong>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {selectedReport.attachments.map((file, i) => (
                    <a
                      key={i}
                      href={file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline truncate"
                    >
                      {file.split("/").pop()}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedReport(null)}
              className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBugReports;
