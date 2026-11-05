import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Users, Ban, CheckCircle } from 'lucide-react';

const UsersDirectory = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleSuspension = async (userId, currentSuspended) => {
    const reason = currentSuspended
      ? ''
      : prompt('Reason for suspending user account:') || 'Violation of marketplace terms';

    try {
      await api.put(`/admin/users/${userId}/suspension`, {
        isSuspended: !currentSuspended,
        suspensionReason: reason,
      });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Users & Roles</h1>
        <p className="text-sm text-slate-500 mt-1">
          Unified accounts acting as Customer, Vendor, Admin, Moderator, Manager, Finance, or Support.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading user records...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-4 px-6">User</th>
                <th className="py-4 px-6">Phone Number</th>
                <th className="py-4 px-6">Active Roles</th>
                <th className="py-4 px-6">Account Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-slate-900">
                    {u.fullName || 'Registered User'}
                    <span className="block text-xs text-slate-400 font-normal">
                      ID: {u._id}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-medium text-slate-700">
                    {u.phone}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1">
                      {u.roles?.map((r) => (
                        <span
                          key={r}
                          className="px-2 py-0.5 rounded text-xs font-bold capitalize bg-slate-100 text-slate-700"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {u.isSuspended ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                        Suspended
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => handleToggleSuspension(u._id, u.isSuspended)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        u.isSuspended
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      {u.isSuspended ? 'Reinstate' : 'Suspend'}
                    </button>
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

export default UsersDirectory;

