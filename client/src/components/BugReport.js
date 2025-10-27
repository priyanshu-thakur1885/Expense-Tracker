import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, X, Send, AlertTriangle, CheckCircle, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BugReport = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [bugReport, setBugReport] = useState({
    title: '',
    description: '',
    steps: '',
    severity: 'medium'
  });
  const [attachments, setAttachments] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBugReport(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!bugReport.title.trim() || !bugReport.description.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const API_BASE = process.env.REACT_APP_API_URL || '';
      const formData = new FormData();

      // Add bug report data
      Object.keys(bugReport).forEach(key => {
        formData.append(key, bugReport[key]);
      });

      // Add user data
      formData.append('userEmail', user?.email || '');
      formData.append('userName', user?.name || '');
      formData.append('userPhoto', user?.photo || '');
      formData.append('timestamp', new Date().toISOString());
      formData.append('userAgent', navigator.userAgent);
      formData.append('url', window.location.href);

      // Add attachments
      attachments.forEach((file, index) => {
        formData.append('attachments', file);
      });

      console.log('🐛 Submitting bug report to:', `${API_BASE}/api/bugreport`);
      console.log('📊 Form data being sent:', {
        title: bugReport.title,
        description: bugReport.description,
        severity: bugReport.severity,
        steps: bugReport.steps,
        userEmail: user?.email,
        userName: user?.name,
        attachmentsCount: attachments.length
      });

      const response = await fetch(`${API_BASE}/api/bugreport`, {
        method: 'POST',
        body: formData,
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Bug report submitted successfully:', responseData);
        setIsSubmitted(true);
        setTimeout(() => {
          onClose();
          setIsSubmitted(false);
          setBugReport({
            title: '',
            description: '',
            steps: '',
            severity: 'medium'
          });
          setAttachments([]);
        }, 2000);
      } else {
        const errorText = await response.text();
        console.error('❌ Bug report submission failed');
        console.error('❌ Status:', response.status);
        console.error('❌ Response:', errorText);

        let errorMessage = 'Failed to submit bug report';
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.message) {
            errorMessage = errorData.message;
          }
          console.error('❌ Parsed error data:', errorData);
        } catch (parseErr) {
          console.error('❌ Could not parse error response as JSON');
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error submitting bug report:', error);
      alert('Failed to submit bug report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setBugReport({
        title: '',
        description: '',
        steps: '',
        expected: '',
        actual: '',
        severity: 'medium'
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-red-100 p-2 rounded-full">
                    <Bug className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Report a Bug</h2>
                    <p className="text-sm text-gray-600">Help us improve by reporting issues</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {isSubmitted ? (
                <div className="text-center py-8">
                  <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Bug Report Sent!</h3>
                  <p className="text-gray-600">Thank you for helping us improve. We'll review your report and get back to you if needed.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Bug Title */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                      Bug Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={bugReport.title}
                      onChange={handleInputChange}
                      placeholder="Brief description of the bug"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 bg-white"
                      required
                    />
                  </div>

                  {/* Severity */}
                  <div>
                    <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-2">
                      Severity
                    </label>
                    <select
                      id="severity"
                      name="severity"
                      value={bugReport.severity}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 bg-white"
                    >
                      <option value="low">Low - Minor issue</option>
                      <option value="medium">Medium - Moderate issue</option>
                      <option value="high">High - Major issue</option>
                      <option value="critical">Critical - Blocks functionality</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={bugReport.description}
                      onChange={handleInputChange}
                      placeholder="Describe what happened and what you were trying to do"
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 bg-white"
                      required
                    />
                  </div>

                  {/* Steps to Reproduce */}
                  <div>
                    <label htmlFor="steps" className="block text-sm font-medium text-gray-700 mb-2">
                      Steps to Reproduce
                    </label>
                    <textarea
                      id="steps"
                      name="steps"
                      value={bugReport.steps}
                      onChange={handleInputChange}
                      placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 bg-white"
                    />
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attachments (Images/Videos)
                    </label>
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        isDragOver
                          ? 'border-red-400 bg-red-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        const files = Array.from(e.dataTransfer.files);
                        const validFiles = files.filter(file =>
                          file.type.startsWith('image/') || file.type.startsWith('video/')
                        );
                        if (validFiles.length !== files.length) {
                          alert('Only image and video files are allowed');
                        }
                        setAttachments(prev => [...prev, ...validFiles.slice(0, 5 - prev.length)]);
                      }}
                    >
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        onChange={(e) => {
                          const files = Array.from(e.target.files);
                          setAttachments(prev => [...prev, ...files.slice(0, 5 - prev.length)]);
                        }}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <div className="text-gray-600">
                          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <p className="mt-1 text-sm">
                            <span className="font-medium text-red-600 hover:text-red-500">
                              Upload files
                            </span>
                            {' '}or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF, MP4, MOV up to 10MB each</p>
                        </div>
                      </label>
                    </div>
                    {attachments.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {attachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="text-sm text-gray-700">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Report will be sent to admin</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Your report will be sent to the development team for review. We may contact you at {user?.email} if we need more information.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!bugReport.title.trim() || !bugReport.description.trim() || isSubmitting}
                      className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Bug Report
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BugReport;
