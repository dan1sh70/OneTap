import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Gift, CheckCircle2, XCircle, Clock } from 'lucide-react';

const BenefitRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [notes, setNotes] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/benefit-requests');
      setRequests(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleReview = async (status) => {
    if (!selectedReq) return;
    setActionLoading(true);
    try {
      await api.put(`/admin/benefit-requests/${selectedReq._id}/review`, {
        status,
        reviewNotes: notes,
        durationDays: Number(durationDays),
      });
      setSelectedReq(null);
      setNotes('');
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Vendor Extra-Benefit Requests</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review requests for extra listing slots, promotional boost days, or plan extensions with audit logging.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading benefit requests...</div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Gift className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No benefit requests pending</h3>
          <p className="text-xs text-slate-400 mt-1">Vendor requests will appear here for staff audit.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-4 px-6">Vendor</th>
                <th className="py-4 px-6">Benefit Requested</th>
                <th className="py-4 px-6">Quantity</th>
                <th className="py-4 px-6">Vendor Reason</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-slate-900">
                    {r.vendorId?.businessName}
                    <span className="block text-xs text-slate-400 font-normal">
                      {r.vendorId?.businessPhone}
                    </span>
                  </td>
                  <td className="py-4 px-6 capitalize font-medium text-slate-700">
                    {r.requestedByType.replace(/_/g, ' ')}
                  </td>
                  <td className="py-4 px-6 font-bold text-brand-600">
                    +{r.quantity}
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-500 max-w-xs truncate">
                    {r.reason}
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                        r.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : r.status === 'rejected'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    {r.status === 'pending' ? (
                      <button
                        onClick={() => setSelectedReq(r)}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                      >
                        Review
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedReq && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Audit Benefit Request
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Vendor: <strong>{selectedReq.vendorId?.businessName}</strong>
            </p>

            <div className="space-y-4 mb-6">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <p className="text-slate-500 mb-1">Requested Allowance:</p>
                <p className="font-bold text-slate-800 text-sm">
                  {selectedReq.quantity} {selectedReq.requestedByType.replace(/_/g, ' ')}
                </p>
                <p className="mt-2 text-slate-500">Vendor Reason:</p>
                <p className="italic text-slate-700">{selectedReq.reason}</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Validity Duration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Reviewer Justification
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record required audit reason for approval/rejection..."
                  className="w-full h-20 p-2.5 text-xs border border-slate-300 rounded-xl focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedReq(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={() => handleReview('rejected')}
                className="px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl border border-red-200"
              >
                Reject Request
              </button>
              <button
                disabled={actionLoading}
                onClick={() => handleReview('approved')}
                className="px-4 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-sm"
              >
                Approve & Grant Entitlement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BenefitRequests;
