import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { ShieldCheck, CheckCircle2, XCircle, AlertCircle, FileText, ExternalLink } from 'lucide-react';

const Verifications = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('submitted');
  const [selectedCase, setSelectedCase] = useState(null);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/verifications?status=${activeTab}`);
      setCases(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [activeTab]);

  const handleReview = async (status) => {
    if (!selectedCase) return;
    setActionLoading(true);
    try {
      await api.put(`/admin/verifications/${selectedCase._id}`, {
        status,
        reviewNotes: notes,
        badgesToGrant: {
          isIdentityVerified: selectedCase.verificationType === 'identity' && status === 'approved',
          isBankVerified: selectedCase.verificationType === 'bank' && status === 'approved',
          isServiceQualified: selectedCase.verificationType === 'service_qualification' && status === 'approved',
          isPropertyAuthorized: selectedCase.verificationType === 'property_authority' && status === 'approved',
        },
      });
      setSelectedCase(null);
      setNotes('');
      fetchCases();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Vendor Verification Queue</h1>
          <p className="text-sm text-slate-500 mt-1">
            Separate badges for Identity, Bank validation, Service qualifications, and Property authority.
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex bg-slate-200/70 p-1 rounded-xl">
          {['submitted', 'approved', 'rejected', 'changes_requested'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading verification records...</div>
      ) : cases.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No {activeTab} verification cases</h3>
          <p className="text-xs text-slate-400 mt-1">All applications in this queue have been processed.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-4 px-6">Vendor Business</th>
                <th className="py-4 px-6">Verification Type</th>
                <th className="py-4 px-6">Submitted Documents</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cases.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-slate-900">
                    {c.vendorId?.businessName || 'Business Name'}
                    <span className="block text-xs text-slate-400 font-normal">
                      {c.vendorId?.businessPhone}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 uppercase">
                      {c.verificationType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-500">
                    {c.documents?.length || 0} document(s) uploaded
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize bg-amber-50 text-amber-700 border border-amber-200">
                      {c.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-400">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => {
                        setSelectedCase(c);
                        setNotes(c.reviewNotes || '');
                      }}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-all"
                    >
                      Review Case
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Review Verification — {selectedCase.vendorId?.businessName}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Type: <strong className="uppercase">{selectedCase.verificationType.replace('_', ' ')}</strong>
            </p>

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Submitted Verification Documents (Private Storage)
              </label>
              {selectedCase.documents?.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>{doc.docType || 'Document'}</span>
                  </div>
                  <a
                    href={`http://localhost:5000/api/upload/private-document/${doc.filePath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-brand-600 hover:underline font-semibold"
                  >
                    <span>View Secure Proof</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Audited Reviewer Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="State clear reasons if changes are requested or rejected..."
                className="w-full h-24 p-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedCase(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={() => handleReview('rejected')}
                className="px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl border border-red-200"
              >
                Reject Case
              </button>
              <button
                disabled={actionLoading}
                onClick={() => handleReview('changes_requested')}
                className="px-4 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50 rounded-xl border border-amber-200"
              >
                Request Changes
              </button>
              <button
                disabled={actionLoading}
                onClick={() => handleReview('approved')}
                className="px-4 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-sm"
              >
                Approve & Grant Badge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Verifications;
