import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Home, UserCheck, Calendar } from 'lucide-react';

const PropertyCases = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCases = async () => {
    try {
      const res = await api.get('/admin/property-cases');
      setCases(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Property Assistance Cases</h1>
        <p className="text-sm text-slate-500 mt-1">
          Vendor-funded 30-day packages & free customer requirement matchmaking.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading property cases...</div>
      ) : cases.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Home className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No active property cases</h3>
          <p className="text-xs text-slate-400 mt-1">
            Property assist workflows and customer requests will appear here for manager assignment.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-4 px-6">Customer / Requirement</th>
                <th className="py-4 px-6">Locality & Type</th>
                <th className="py-4 px-6">Assigned Manager</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cases.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-slate-900">
                    {c.customerId?.fullName || 'Customer'}
                    <span className="block text-xs text-slate-400 font-normal">
                      Budget: ₹{((c.customerRequirement?.budgetPaise || 0) / 100).toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-700">
                    <span className="font-semibold block">{c.customerRequirement?.locality || 'City'}</span>
                    <span className="capitalize text-slate-400">
                      {c.customerRequirement?.propertyType} • {c.customerRequirement?.transactionType}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-xs font-medium text-slate-700">
                    {c.assignedManagerId ? (
                      <span className="text-brand-600 font-bold">{c.assignedManagerId.fullName}</span>
                    ) : (
                      <span className="text-amber-600 font-semibold italic">Unassigned</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize bg-blue-50 text-blue-700 border border-blue-200">
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => alert(`Property Case ID: ${c._id}`)}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                    >
                      View Details
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

export default PropertyCases;
