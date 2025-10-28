const BugReport = require("../models/BugReport");

exports.createBugReport = async (req, res) => {
  try {
    const bug = new BugReport(req.body);
    await bug.save();
    res.status(201).json({ success: true, message: "Bug report created successfully" });
  } catch (error) {
    console.error("Error creating bug report:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.getAllBugReports = async (req, res) => {
  try {
    const bugs = await BugReport.find().sort({ reportedAt: -1 });
    res.json({ success: true, bugReports: bugs });
  } catch (error) {
    console.error("Error fetching bug reports:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.closeBugReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { remark } = req.body;

    const bug = await BugReport.findById(id);
    if (!bug) {
      return res.status(404).json({ success: false, message: "Bug report not found" });
    }

    bug.status = "closed";
    bug.adminRemark = remark || "No remark provided";
    bug.closedAt = new Date();

    await bug.save();
    res.json({ success: true, message: "Bug report closed successfully", bug });
  } catch (error) {
    console.error("Error closing bug report:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
