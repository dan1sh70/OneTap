import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { FileText, Shield } from 'lucide-react';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/admin/audit-logs');
        setLogs(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Audit Trail</h1>
        <p className="text-sm text-slate-500 mt-1">
          Complete compliance trail capturing administrative actions, lead unlocks, and verification changes.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading audit records...</div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No audit events logged yet</h3>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">Staff Member</th>
                <th className="py-4 px-6">Action</th>
                <th className="py-4 px-6">Entity</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-4 px-6 font-semibold text-slate-900">
                    {log.performedByUserId?.fullName || 'Staff'}
                    <span className="block text-xs text-slate-400 font-normal">
                      {log.performedByUserId?.phone}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-mono text-xs font-bold text-indigo-600">
                    {log.action}
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-700">
                    {log.resourceType}
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right text-xs text-slate-500 font-mono max-w-xs truncate">
                    {JSON.stringify(log.details || {})}
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

export default AuditLogs;

