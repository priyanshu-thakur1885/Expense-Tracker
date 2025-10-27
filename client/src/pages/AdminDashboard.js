import React, { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  DollarSign,
  BarChart3,
  Send,
  Eye,
  Crown,
  AlertCircle,
  CheckCircle,
  Info,
  MessageCircle,
  Bug,
  Filter,
  Download,
  ExternalLink
} from 'lucide-react';
import UserMessaging from '../components/UserMessaging';
import AdminPinProtection from '../components/AdminPinProtection';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const API_BASE = process.env.REACT_APP_API_URL || '';
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [notification, setNotification] = useState({
    title: '',
    message: '',
    type: 'info',
    personalUserId: null,
    isPersonal: false
  });
  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [bugReports, setBugReports] = useState([]);
  const [bugReportsLoading, setBugReportsLoading] = useState(false);
  const [bugReportFilters, setBugReportFilters] = useState({
    status: '',
    severity: '',
    page: 1,
    limit: 20
  });
  const [selectedBugReport, setSelectedBugReport] = useState(null);

  useEffect(() => {
    if (isPinVerified) {
      fetchAdminData();
      fetchBugReports();
    }
  }, [isPinVerified]);

  useEffect(() => {
    if (isPinVerified) {
      fetchBugReports();
    }
  }, [bugReportFilters]);

  const handlePinCorrect = () => {
    setIsPinVerified(true);
  };

  const handlePinCancel = () => {
    navigate('/dashboard');
  };

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      console.log('Fetching admin data with token:', localStorage.getItem('token'));
      
      const [usersRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/users`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }),
        fetch(`${API_BASE}/api/admin/stats`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);

      console.log('Users Response Status:', usersRes.status);
      console.log('Stats Response Status:', statsRes.status);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        console.log('Users Data:', usersData);
        setUsers(usersData.users || []);
      } else {
        const errorText = await usersRes.text();
        console.error('Users Response Error:', errorText);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        console.log('Stats Data:', statsData);
        setStats(statsData.stats || null);
      } else {
        const errorText = await statsRes.text();
        console.error('Stats Response Error:', errorText);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async () => {
    if (!notification.title || !notification.message) {
      alert('Please fill in both title and message');
      return;
    }

    if (notification.isPersonal && !notification.personalUserId) {
      alert('Please select a user for personal message');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/admin/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(notification)
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        setNotification({ 
          title: '', 
          message: '', 
          type: 'info',
          personalUserId: null,
          isPersonal: false
        });
      } else {
        alert('Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Error sending notification');
    }
  };

  const fetchReplies = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/notifications/replies`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReplies(data.notifications || []);
        setShowReplies(true);
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
    }
  };

  const fetchBugReports = async () => {
    try {
      setBugReportsLoading(true);
      const queryParams = new URLSearchParams();
      if (bugReportFilters.status) queryParams.append('status', bugReportFilters.status);
      if (bugReportFilters.severity) queryParams.append('severity', bugReportFilters.severity);
      queryParams.append('page', bugReportFilters.page);
      queryParams.append('limit', bugReportFilters.limit);

      const response = await fetch(`${API_BASE}/api/bugreport?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBugReports(data.bugReports || []);
      }
    } catch (error) {
      console.error('Error fetching bug reports:', error);
    } finally {
      setBugReportsLoading(false);
    }
  };

  const getUserDetails = async (userId) => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  // Show PIN protection if not verified
  if (!isPinVerified) {
    return <AdminPinProtection onPinCorrect={handlePinCorrect} onCancel={handlePinCancel} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Crown className="w-8 h-8 text-yellow-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Manage users and platform insights</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                Admin
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
              { id: 'users', name: 'Users', icon: Users },
              { id: 'bugreport', name: 'Bug Reports', icon: Bug },
              { id: 'messaging', name: 'Messaging', icon: MessageCircle },
              { id: 'notifications', name: 'Notifications', icon: Send }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <DollarSign className="w-8 h-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Spent</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalSpent)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalExpenses}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <BarChart3 className="w-8 h-8 text-orange-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Avg per User</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.averageSpentPerUser)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Spenders */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Top Spenders</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {stats.topSpenders?.slice(0, 5).map((spender, index) => (
                    <div key={spender.userId} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{spender.name}</p>
                          <p className="text-sm text-gray-500">{spender.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{formatCurrency(spender.total)}</p>
                        <p className="text-sm text-gray-500">{spender.count} expenses</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Category Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Spending by Category</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {stats.categoryStats?.slice(0, 5).map((category) => (
                      <div key={category._id} className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600 capitalize">{category._id}</span>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(category.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Spending by Food Court</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {stats.foodCourtStats?.slice(0, 5).map((court) => (
                      <div key={court._id} className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">{court._id}</span>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(court.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bug Reports Tab */}
        {activeTab === 'bugreport' && (
          <div className="space-y-6">
            {/* Bug Reports List */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Bug Reports</h3>
                  <div className="flex space-x-2">
                    <select
                      value={bugReportFilters.status}
                      onChange={(e) => setBugReportFilters({ ...bugReportFilters, status: e.target.value })}
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                    >
                      <option value="">All Status</option>
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    <select
                      value={bugReportFilters.severity}
                      onChange={(e) => setBugReportFilters({ ...bugReportFilters, severity: e.target.value })}
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                    >
                      <option value="">All Severity</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reporter</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bugReportsLoading ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="mt-2 text-sm text-gray-500">Loading bug reports...</p>
                        </td>
                      </tr>
                    ) : bugReports.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                          No bug reports found
                        </td>
                      </tr>
                    ) : (
                      bugReports.map((report) => (
                        <tr key={report._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                              {report.title}
                            </div>
                            <div className="text-sm text-gray-500 max-w-xs truncate">
                              {report.description}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              report.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              report.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                              report.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {report.severity}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              report.status === 'open' ? 'bg-blue-100 text-blue-800' :
                              report.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                              report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {report.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {report.userName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(report.reportedAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => setSelectedBugReport(report)}
                              className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">All Users</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recent (30d)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            {user.photo ? (
                              <img className="w-10 h-10 rounded-full" src={user.photo} alt={user.name} />
                            ) : (
                              <span className="text-sm font-medium text-gray-600">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(user.totalSpent)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.totalExpenses}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(user.recentSpent)} ({user.recentExpenses})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => getUserDetails(user.id)}
                          className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Messaging Tab */}
        {activeTab === 'messaging' && (
          <UserMessaging users={users} />
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            {/* Send Notification */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Send Notification</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="notificationType"
                        checked={!notification.isPersonal}
                        onChange={() => setNotification({ ...notification, isPersonal: false, personalUserId: null })}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Broadcast to All Users</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="notificationType"
                        checked={notification.isPersonal}
                        onChange={() => setNotification({ ...notification, isPersonal: true })}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Personal Message</span>
                    </label>
                  </div>

                  {notification.isPersonal && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Select User</label>
                      <select
                        value={notification.personalUserId || ''}
                        onChange={(e) => setNotification({ ...notification, personalUserId: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="">Select a user...</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                      type="text"
                      value={notification.title}
                      onChange={(e) => setNotification({ ...notification, title: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter notification title"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Message</label>
                    <textarea
                      value={notification.message}
                      onChange={(e) => setNotification({ ...notification, message: e.target.value })}
                      rows={4}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter notification message"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                      value={notification.type}
                      onChange={(e) => setNotification({ ...notification, type: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="info">Info</option>
                      <option value="success">Success</option>
                      <option value="warning">Warning</option>
                      <option value="error">Error</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={fetchReplies}
                      className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center space-x-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Replies</span>
                    </button>
                    <button
                      onClick={sendNotification}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>{notification.isPersonal ? 'Send Personal Message' : 'Send Notification'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Replies Section */}
            {showReplies && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">User Replies</h3>
                </div>
                <div className="p-6">
                  {replies.length > 0 ? (
                    <div className="space-y-4">
                      {replies.map((notification) => (
                        <div key={notification._id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{notification.title}</h4>
                            <span className="text-sm text-gray-500">
                              {new Date(notification.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-3">{notification.message}</p>
                          <div className="space-y-2">
                            <h5 className="font-medium text-gray-900">Replies:</h5>
                            {notification.replies.map((reply, index) => (
                              <div key={index} className="bg-gray-50 p-3 rounded">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-gray-900">{reply.userName}</span>
                                  <span className="text-sm text-gray-500">
                                    {new Date(reply.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-gray-700">{reply.message}</p>
                                <p className="text-xs text-gray-500 mt-1">{reply.userEmail}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No replies yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bug Report Details Modal */}
        {selectedBugReport && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Bug Report Details</h3>
                  <button
                    onClick={() => setSelectedBugReport(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Header Info */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-gray-900 mb-2">{selectedBugReport.title}</h4>
                      <div className="flex items-center space-x-4 mb-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedBugReport.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          selectedBugReport.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          selectedBugReport.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {selectedBugReport.severity} priority
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedBugReport.status === 'open' ? 'bg-blue-100 text-blue-800' :
                          selectedBugReport.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                          selectedBugReport.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedBugReport.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>Reported: {new Date(selectedBugReport.reportedAt).toLocaleString()}</p>
                      {selectedBugReport.lastUpdated && (
                        <p>Updated: {new Date(selectedBugReport.lastUpdated).toLocaleString()}</p>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Description</h5>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded whitespace-pre-wrap">{selectedBugReport.description}</p>
                  </div>

                  {/* Steps to Reproduce */}
                  {selectedBugReport.steps && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Steps to Reproduce</h5>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded whitespace-pre-wrap">{selectedBugReport.steps}</p>
                    </div>
                  )}

                  {/* Attachments */}
                  {selectedBugReport.attachments && selectedBugReport.attachments.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Attachments</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedBugReport.attachments.map((attachment, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {attachment.mimetype.startsWith('image/') ? (
                                  <img
                                    src={`${API_BASE}/api/bugreport/${selectedBugReport._id}/attachment/${attachment.filename}`}
                                    alt={attachment.originalName}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-300 rounded flex items-center justify-center">
                                    <span className="text-xs text-gray-600">VIDEO</span>
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium text-gray-900 truncate max-w-32">
                                    {attachment.originalName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {(attachment.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                              </div>
                              <a
                                href={`${API_BASE}/api/bugreport/${selectedBugReport._id}/attachment/${attachment.filename}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reporter Info */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">Reporter Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Name: <span className="font-medium">{selectedBugReport.userName}</span></p>
                        <p className="text-sm text-gray-600">Email: <span className="font-medium">{selectedBugReport.userEmail}</span></p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">URL: <span className="font-medium break-all">{selectedBugReport.url}</span></p>
                        <p className="text-sm text-gray-600">User Agent: <span className="font-medium break-all">{selectedBugReport.userAgent}</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Admin Notes */}
                  {selectedBugReport.adminNotes && (
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h5 className="font-medium text-gray-900 mb-2">Admin Notes</h5>
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedBugReport.adminNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Details Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">User Details</h3>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                      {selectedUser.photo ? (
                        <img className="w-16 h-16 rounded-full" src={selectedUser.photo} alt={selectedUser.name} />
                      ) : (
                        <span className="text-xl font-medium text-gray-600">
                          {selectedUser.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xl font-medium text-gray-900">{selectedUser.name}</h4>
                      <p className="text-gray-500">{selectedUser.email}</p>
                      <p className="text-sm text-gray-400">Joined: {new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Total Spent</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedUser.totalSpent)}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Total Expenses</p>
                      <p className="text-2xl font-bold text-gray-900">{selectedUser.totalExpenses}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-medium text-gray-900">Recent Expenses</h5>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedUser.expenses?.slice(0, 5).map((expense) => (
                        <div key={expense._id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{expense.description}</p>
                            <p className="text-xs text-gray-500">{expense.category} • {expense.foodCourt}</p>
                          </div>
                          <p className="text-sm font-medium text-gray-900">{formatCurrency(expense.amount)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
