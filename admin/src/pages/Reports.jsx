import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { AlertTriangle, ShieldCheck, ShieldX } from 'lucide-react';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const res = await api.get('/reports');
      setReports(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleAction = async (reportId, actionTaken) => {
    const reason = prompt('Please enter the audited moderation justification:');
    if (!reason) return;

    try {
      await api.put(`/reports/${reportId}/action`, {
        status: 'resolved',
        actionTaken,
        reviewNotes: reason,
      });
      fetchReports();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Abuse & Moderation Reports</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review consumer and vendor complaints, prohibited listings, or misleading pricing.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading complaints queue...</div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No active complaints</h3>
          <p className="text-xs text-slate-400 mt-1">Content reported by users will be listed here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-4 px-6">Reporter</th>
                <th className="py-4 px-6">Target Vertical</th>
                <th className="py-4 px-6">Violation Category</th>
                <th className="py-4 px-6">User Description</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-slate-900">
                    {r.reporterUserId?.fullName || 'User'}
                    <span className="block text-xs text-slate-400 font-normal">
                      {r.reporterUserId?.phone}
                    </span>
                  </td>
                  <td className="py-4 px-6 capitalize font-medium text-slate-700">
                    {r.targetType}
                  </td>
                  <td className="py-4 px-6 text-xs">
                    <span className="px-2 py-1 rounded bg-red-50 text-red-600 font-bold uppercase">
                      {r.category.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-600 max-w-xs truncate">
                    {r.description}
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize bg-amber-50 text-amber-700 border border-amber-200">
                      {r.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    {r.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleAction(r._id, 'content_paused')}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold"
                        >
                          Pause Content
                        </button>
                        <button
                          onClick={() => handleAction(r._id, 'vendor_suspended')}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold"
                        >
                          Suspend Vendor
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">Action: {r.actionTaken}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Reports;

