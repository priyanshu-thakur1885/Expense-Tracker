import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "https://expense-tracker-0ipq.onrender.com/api/bug-report";

export const closeBugReport = async (bugId, remark) => {
  try {
    const res = await axios.put(`${API_URL}/${bugId}`, {
      status: "resolved",
      adminNotes: remark,
    });
    return res.data;
  } catch (error) {
    console.error("Error closing bug:", error);
    return { success: false, message: "Failed to close bug" };
  }
};
