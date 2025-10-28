import React, { useState } from "react";
import axios from "axios";

function BugReportDetails({ bug, onClose }) {
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleCloseBug = async () => {
    if (!remark.trim()) {
      alert("Please add a remark before closing the bug.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/bugreport/close/${bug._id}`,
        { remark }
      );

      if (res.data.success) {
        setSuccessMsg("Bug closed successfully ✅");
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch (err) {
      console.error("Error closing bug:", err);
      alert("Failed to close the bug.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg w-[700px]">
      <h2 className="text-2xl font-semibold mb-4">{bug.title}</h2>

      <div className="mb-3">
        <p className="text-gray-500 text-sm">
          Reported on {new Date(bug.reportedAt).toLocaleString()}
        </p>
        <p className="mt-2">{bug.description}</p>
      </div>

      {/* Status and severity */}
      <div className="flex gap-3 mb-4">
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
          {bug.status}
        </span>
        <span
          className={`px-3 py-1 rounded-full text-sm ${
            bug.severity === "high"
              ? "bg-red-100 text-red-700"
              : bug.severity === "medium"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {bug.severity} priority
        </span>
      </div>

      {/* Close Bug Section */}
      {bug.status === "open" && (
        <div className="mt-5">
          <textarea
            placeholder="Add closing remark..."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:text-white"
          />
          <button
            onClick={handleCloseBug}
            disabled={loading}
            className="mt-3 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
          >
            {loading ? "Closing..." : "Close Bug"}
          </button>
        </div>
      )}

      {successMsg && (
        <p className="text-green-500 mt-3 font-medium">{successMsg}</p>
      )}

      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
      >
        ✖
      </button>
    </div>
  );
}

export default BugReportDetails;
