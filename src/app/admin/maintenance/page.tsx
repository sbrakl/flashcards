"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Database, Calendar, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

export default function MaintenancePage() {
  
  const [totalReviews, setTotalReviews] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(true);
  const [daysThreshold, setDaysThreshold] = useState<string>('30');
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  // Fetch total count on mount
  useEffect(() => {
    fetchTotalReviews();
  }, []);

  async function fetchTotalReviews() {
    setLoadingCount(true);
    try {
      const { count, error } = await supabase
        .from('reviews') // Replace with your actual table name if different
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      setTotalReviews(count);
    } catch (error) {
      console.error('Error fetching count:', error);
      setStatus({ type: 'error', message: 'Failed to load review count.' });
    } finally {
      setLoadingCount(false);
    }
  }

  async function handleDeleteOldRecords() {
    const thresholdDays = parseInt(daysThreshold);
    if (isNaN(thresholdDays) || thresholdDays < 0) {
      setStatus({ type: 'error', message: 'Please enter a valid number of days.' });
      return;
    }

    setIsDeleting(true);
    setStatus(null);

    try {
      // Calculate the date threshold
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

      // 1. Count how many will be deleted (for feedback)
      const { count: deletedCount, error: countError } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', thresholdDate.toISOString());

      if (countError) throw countError;

      if (!deletedCount || deletedCount === 0) {
        setStatus({ type: 'info', message: 'No records found older than the specified period.' });
        setIsDeleting(false);
        return;
      }

      // 2. Perform deletion
      const { error: deleteError } = await supabase
        .from('reviews')
        .delete()
        .lt('created_at', thresholdDate.toISOString());

      if (deleteError) throw deleteError;

      setStatus({ 
        type: 'success', 
        message: `Successfully deleted ${deletedCount} old records.` 
      });
      
      // Refresh the total count
      await fetchTotalReviews();
    } catch (error: any) {
      console.error('Deletion error:', error);
      setStatus({ type: 'error', message: `Error: ${error.message}` });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-slate-90
          ">Database Maintenance</h1>
          <p className="text-slate-500">Manage and clean up your application data.</p>
        </header>

        {/* Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Database size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Reviews</p>
              <p className="text-2xl font-bold text-slate-900">
                {loadingCount ? <Loader2 className="animate-spin" size={24} /> : totalReviews?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        {/* Cleanup Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center">
              <Trash2 className="mr-2 text-red-500" size={20} />
              Cleanup Review History
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Permanently delete review records older than a specific number of days.
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center">
                  <Calendar className="mr-2" size={16} />
                  Days Threshold
                </label>
                <input
                  type="number"
                  value={daysThreshold}
                  onChange={(e) => setDaysThreshold(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                  placeholder="e.g. 30"
                />
              </div>
              <button
                onClick={handleDeleteOldRecords}
                disabled={isDeleting}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center min-w-[140px]"
              >
                {isDeleting ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                {isDeleting ? 'Deleting...' : 'Run Cleanup'}
              </button>
            </div>

            {/* Status Messages */}
            {status && (
              <div className={`p-4 rounded-lg flex items-center ${
                status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                status.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {status.type === 'success' ? <CheckCircle2 className="mr-2" size={20} /> : 
                 status.type === 'error' ? <AlertTriangle className="mr-2" size={20} /> : null}
                <span className="text-sm font-medium">{status.message}</span>
              </div>
            )}

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-3">
              <AlertTriangle className="text-amber-600 shrink-0" size={20} />
              <p className="text-sm text-amber-800">
                <strong>Warning:</strong> This action is permanent. Once records are deleted, they cannot be recovered.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}