'use client';

import { useState } from 'react';
import { apiService } from '@/lib/api';
import { ConfirmDialog } from './ConfirmDialog';

export function DataManagement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  
  // Export options
  const [exportOptions, setExportOptions] = useState({
    includeCars: true,
    includeTodos: true,
    includeServiceIntervals: true,
    includeServiceHistory: true,
  });

  const handleExport = async () => {
    // Check if at least one option is selected
    if (!exportOptions.includeCars && !exportOptions.includeTodos && 
        !exportOptions.includeServiceIntervals && !exportOptions.includeServiceHistory) {
      setError('Please select at least one data type to export');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Call API to generate XML export with options
      const response = await apiService.exportData(exportOptions);
      
      // Extract XML data - axios returns the data in response.data
      const xmlData = typeof response.data === 'string' ? response.data : response;
      
      // Create blob and download
      const blob = new Blob([xmlData], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // The filename will be set by the backend based on what's included
      a.download = `car_collection_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setSuccess('Data exported successfully!');
      setLastBackupDate(new Date().toLocaleString());
    } catch (err: any) {
      setError('Failed to export data');
      console.error('Export error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('file', file);
      
      await apiService.importData(formData);
      
      setSuccess('Data imported successfully! The page will reload...');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError('Failed to import data. Please check the file format.');
      console.error('Import error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await apiService.clearAllData();
      
      setSuccess('All data cleared successfully! The page will reload...');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError('Failed to clear data');
      console.error('Clear data error:', err);
    } finally {
      setLoading(false);
      setShowClearConfirm(false);
      setConfirmText('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          📦 Data Management
        </h2>
      </div>
      
      <div className="p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}
        
        {success && (
          <div className="p-4 bg-green-100 border border-green-300 text-green-700 rounded-lg">
            {success}
            <button
              onClick={() => setSuccess(null)}
              className="float-right text-green-500 hover:text-green-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Backup Section */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-md font-medium text-gray-900 mb-4">Backup & Restore</h3>
          
          {lastBackupDate && (
            <p className="text-sm text-gray-600 mb-4">
              Last backup: {lastBackupDate}
            </p>
          )}
          
          <div className="space-y-4">
            <div>
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Select data to export:</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeCars}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setExportOptions({
                          ...exportOptions, 
                          includeCars: checked,
                          // If unchecking cars, also uncheck service-related options
                          includeServiceIntervals: checked ? exportOptions.includeServiceIntervals : false,
                          includeServiceHistory: checked ? exportOptions.includeServiceHistory : false,
                        });
                      }}
                      className="rounded border-gray-300 text-blue-600 mr-2"
                    />
                    <span className="text-sm text-gray-700">Cars</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeTodos}
                      onChange={(e) => setExportOptions({...exportOptions, includeTodos: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 mr-2"
                    />
                    <span className="text-sm text-gray-700">ToDos</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeServiceIntervals}
                      onChange={(e) => setExportOptions({...exportOptions, includeServiceIntervals: e.target.checked})}
                      disabled={!exportOptions.includeCars}
                      className="rounded border-gray-300 text-blue-600 mr-2 disabled:opacity-50"
                    />
                    <span className={`text-sm ${!exportOptions.includeCars ? 'text-gray-400' : 'text-gray-700'}`}>
                      Service Schedules {!exportOptions.includeCars && '(requires Cars)'}
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeServiceHistory}
                      onChange={(e) => setExportOptions({...exportOptions, includeServiceHistory: e.target.checked})}
                      disabled={!exportOptions.includeCars}
                      className="rounded border-gray-300 text-blue-600 mr-2 disabled:opacity-50"
                    />
                    <span className={`text-sm ${!exportOptions.includeCars ? 'text-gray-400' : 'text-gray-700'}`}>
                      Service History {!exportOptions.includeCars && '(requires Cars)'}
                    </span>
                  </label>
                </div>
              </div>
              
              <button
                onClick={handleExport}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow transition disabled:opacity-50"
              >
                {loading ? 'Exporting...' : '🔽 Export Selected Data'}
              </button>
              <p className="text-sm text-gray-600 mt-2">
                Download a backup of your selected data
              </p>
            </div>
            
            <div>
              <label className="cursor-pointer">
                <span className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg shadow transition inline-block">
                  🔄 Import Data from XML
                </span>
                <input
                  type="file"
                  accept=".xml"
                  onChange={handleImport}
                  disabled={loading}
                  className="hidden"
                />
              </label>
              <p className="text-sm text-gray-600 mt-2">
                Restore from a previous backup file
              </p>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="border border-red-300 rounded-lg p-4 bg-red-50">
          <h3 className="text-md font-medium text-red-900 mb-4">⚠️ Danger Zone</h3>
          
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg shadow transition disabled:opacity-50"
          >
            🗑️ Clear All My Data
          </button>
          <p className="text-sm text-red-700 mt-2">
            Permanently delete all your cars, service records, and tasks
          </p>
        </div>
      </div>

      {/* Clear Data Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-bold text-red-600 mb-4">
                ⚠️ Clear All Data
              </h3>
              <p className="text-gray-700 mb-4">
                This will permanently delete:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4">
                <li>All your cars</li>
                <li>All service history</li>
                <li>All service schedules</li>
                <li>All todos</li>
              </ul>
              <p className="text-gray-700 mb-4">
                This action cannot be undone. Type <span className="font-bold">DELETE</span> to confirm:
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
                placeholder="Type DELETE"
              />
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowClearConfirm(false);
                    setConfirmText('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearData}
                  disabled={confirmText !== 'DELETE' || loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Clearing...' : 'Clear All Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}