import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL + "/api/bugreport";

// ✅ Fetch all bug reports
export const getAllBugReports = async () => {
  const res = await axios.get(`${API_BASE}/all`);
  return res.data;
};

// ✅ Close a bug report
export const closeBugReport = async (id, remark) => {
  const res = await axios.put(`${API_BASE}/close/${id}`, { remark });
  return res.data;
};

// ✅ Create a new bug report
export const createBugReport = async (data) => {
  const res = await axios.post(`${API_BASE}/create`, data);
  return res.data;
};
