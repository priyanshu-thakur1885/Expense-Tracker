const mongoose = require('mongoose');

const bugReportSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  steps: {
    type: String,
    trim: true
  },
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    data: {
      type: Buffer,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // User information
  userEmail: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userPhoto: {
    type: String
  },
  // Technical information
  userAgent: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  // Status tracking
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  // Admin response
  adminNotes: {
    type: String,
    trim: true
  },
  assignedTo: {
    type: String,
    trim: true
  },
  // Timestamps
  reportedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for better query performance
bugReportSchema.index({ status: 1, severity: 1, reportedAt: -1 });
bugReportSchema.index({ userEmail: 1, reportedAt: -1 });

// Update lastUpdated on save
bugReportSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('BugReport', bugReportSchema);
