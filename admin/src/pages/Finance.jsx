import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { CreditCard, IndianRupee, ArrowDownRight, ArrowUpRight } from 'lucide-react';

const Finance = () => {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        const res = await api.get('/admin/financial-ledger');
        setLedger(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Transaction Ledger</h1>
        <p className="text-sm text-slate-500 mt-1">
          Immutable records stored strictly in integer paise. Off-platform deals produce zero app-held funds.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading ledger records...</div>
      ) : ledger.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No transactions recorded yet</h3>
          <p className="text-xs text-slate-400 mt-1">
            Vendor subscription and boost purchases will populate this ledger with source audit IDs.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">Vendor</th>
                <th className="py-4 px-6">Transaction Type</th>
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6 text-right">Amount (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledger.map((entry) => (
                <tr key={entry._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td className="py-4 px-6 font-semibold text-slate-900">
                    {entry.vendorId?.businessName || 'Platform Vendor'}
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                      {entry.transactionType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-600 max-w-sm">
                    {entry.description}
                  </td>
                  <td className="py-4 px-6 text-right font-extrabold text-slate-900">
                    ₹{(entry.amountPaise / 100).toFixed(2)}
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

export default Finance;
