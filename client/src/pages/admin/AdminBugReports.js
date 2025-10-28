    import React, { useEffect, useState } from "react";
import { Bug } from "lucide-react";

const AdminBugReports = () => {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/api/bugreport`)
      .then((res) => res.json())
      .then((data) => setReports(data))
      .catch((err) => console.error("Error fetching bug reports:", err));
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold flex items-center mb-4">
        <Bug className="w-6 h-6 text-red-600 mr-2" /> Bug Reports
      </h2>
      <div className="space-y-4">
        {reports.map((report) => (
          <div key={report._id} className="border rounded-lg p-4 bg-white shadow">
            <h3 className="font-semibold text-lg text-gray-800">{report.title}</h3>
            <p className="text-sm text-gray-600">{report.description}</p>
            <p className="text-xs text-gray-500 mt-2">
              Reported by {report.userName} ({report.userEmail})
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminBugReports;
