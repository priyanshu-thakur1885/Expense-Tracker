const BugReport = require("../models/BugReport");

exports.createBugReport = async (req, res) => {
  try {
    const {
      title,
  description,
  severity,
  steps,
  userEmail,
  userName,
  userPhoto
    } = req.body;

    // Capture from headers/environment
    const userAgent = req.headers["user-agent"] || "Unknown";
    const url = req.headers["referer"] || "Unknown";

    // Handle attachments if any (Multer)
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        data: file.buffer,
      }));
    }

    const bug = new BugReport({
      title,
      description,
      severity: severity || "medium",
      steps,
      attachments,
      userEmail,
      userName,
      userPhoto,
      userAgent,
      url,
    });

    await bug.save();
    res.status(201).json({
      success: true,
      message: "Bug report created successfully",
      bug,
    });
  } catch (error) {
    console.error("Error creating bug report:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
