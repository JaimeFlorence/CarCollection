"use client";
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from "react";
import { apiService, ToDo, ServiceInterval, ServiceIntervalCreate } from "../../../lib/api";
import { DEFAULT_SERVICE_INTERVALS } from "../../../lib/defaultServiceIntervals";
import ToDosTab from "../../../components/ToDosTab";
import ServiceIntervalList from "../../../components/ServiceIntervalList";
import ServiceIntervalEditModal from "../../../components/ServiceIntervalEditModal";
import ServiceIntervalAddModal from "../../../components/ServiceIntervalAddModal";
import EngineTypeDialog from "../../../components/EngineTypeDialog";
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import { Header } from "../../../components/Header";
import React from "react";

// Placeholder for fetching car data (replace with real API call later)
async function getCar(id: string) {
  // Simulate loading
  await new Promise((r) => setTimeout(r, 200));
  return {
    id,
    year: 2020,
    make: 'Porsche',
    model: '911 Carrera S',
    vin: 'WP0AB2A99LS123456',
    mileage: 12000,
    license_plate: 'ABC123',
    insurance_info: 'Geico, Policy #123456',
    notes: 'Track car, ceramic brakes',
    photos: [],
    todos: [
      { id: 1, title: 'Oil Change', due_date: '2024-08-01', priority: 'high', status: 'open', description: 'Use Mobil 1', resolved_at: null },
      { id: 2, title: 'Replace tires', due_date: '2024-09-15', priority: 'medium', status: 'open', description: '', resolved_at: null },
    ],
    fuel: [
      { id: 1, date: '2024-06-01', mileage: 11800, gallons: 15.2, cost: 68.00 },
      { id: 2, date: '2024-06-15', mileage: 12000, gallons: 14.8, cost: 66.50 },
    ],
    service: [
      { id: 1, date: '2024-05-01', type: 'Annual Service', notes: 'Dealer service, all fluids changed' },
    ],
    repairs: [
      { id: 1, date: '2023-12-10', description: 'Replaced battery', cost: 350 },
    ],
  };
}

export default function CarDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [car, setCar] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [groups, setGroups] = useState<string[]>([]);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [serviceIntervals, setServiceIntervals] = useState<ServiceInterval[]>([]);
  const [loadingIntervals, setLoadingIntervals] = useState(false);
  const [researchingIntervals, setResearchingIntervals] = useState(false);
  const [editingInterval, setEditingInterval] = useState<ServiceInterval | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [serviceRefreshTrigger, setServiceRefreshTrigger] = useState(0);
  const [showEngineTypeDialog, setShowEngineTypeDialog] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    // Load car data, groups, and service intervals
    Promise.all([
      apiService.getCar(Number(id)),
      apiService.getCarGroups(),
      apiService.getServiceIntervals(Number(id))
    ])
      .then(([carData, groupsData, intervalsData]) => {
        setCar(carData);
        setGroups(groupsData);
        setServiceIntervals(intervalsData);
        setSelectedGroup(carData.group_name || 'Daily Drivers');
      })
      .catch((err) => {
        setError(err.message);
        // If service intervals fail, still show the car
        if (err.message.includes('service')) {
          apiService.getCar(Number(id))
            .then(carData => {
              setCar(carData);
              setSelectedGroup(carData.group_name || 'Daily Drivers');
            })
            .catch(() => {});
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleGroupSave = async () => {
    try {
      await apiService.updateCar(Number(id), { group_name: selectedGroup });
      setCar(prev => ({ ...prev, group_name: selectedGroup }));
      setIsEditingGroup(false);
    } catch (error) {
      console.error('Failed to update group:', error);
      setError('Failed to update group');
    }
  };

  const handleGroupCancel = () => {
    setSelectedGroup(car.group_name || 'Daily Drivers');
    setIsEditingGroup(false);
    setShowNewGroupInput(false);
    setNewGroupName('');
  };

  const handleGroupChange = (value: string) => {
    if (value === 'new') {
      setShowNewGroupInput(true);
    } else {
      setSelectedGroup(value);
      setShowNewGroupInput(false);
    }
  };

  const handleNewGroupSubmit = () => {
    if (newGroupName.trim()) {
      setSelectedGroup(newGroupName.trim());
      setShowNewGroupInput(false);
      setNewGroupName('');
    }
  };

  const handleEditServiceInterval = (interval: ServiceInterval) => {
    setEditingInterval(interval);
    setShowEditModal(true);
  };
  
  const handleSaveServiceInterval = async (updates: Partial<ServiceInterval>) => {
    if (!editingInterval) return;
    
    try {
      await apiService.updateServiceInterval(editingInterval.id, updates);
      // Refresh the intervals list
      const updatedIntervals = await apiService.getServiceIntervals(Number(id));
      setServiceIntervals(updatedIntervals);
      setShowEditModal(false);
      setEditingInterval(null);
    } catch (error) {
      console.error('Failed to update service interval:', error);
      throw error; // Let the modal handle the error
    }
  };

  const handleDeleteServiceInterval = async (interval: ServiceInterval) => {
    if (!confirm(`Are you sure you want to delete the service interval for "${interval.service_item}"?`)) {
      return;
    }
    
    console.log('Deleting service interval:', interval.id, 'for item:', interval.service_item);
    
    try {
      if (!interval.id) {
        throw new Error('Service interval ID is missing');
      }
      
      await apiService.deleteServiceInterval(interval.id);
      // Refresh service intervals
      const updatedIntervals = await apiService.getServiceIntervals(Number(id));
      setServiceIntervals(updatedIntervals);
      console.log('Successfully deleted service interval');
    } catch (error) {
      console.error('Failed to delete service interval:', error);
      alert(`Failed to delete service interval. Error: ${error.message}`);
    }
  };

  const handleAddServiceHistory = async (interval: ServiceInterval) => {
    // Create a proper service history entry
    const serviceData = {
      service_item: interval.service_item,
      performed_date: new Date().toISOString(),
      mileage: car.mileage || 0,
      cost: interval.cost_estimate_low ? Number(interval.cost_estimate_low) : undefined,
      notes: `Completed ${interval.service_item}`,
      next_due_mileage: interval.interval_miles ? (car.mileage || 0) + interval.interval_miles : undefined
    };
    
    try {
      await apiService.createServiceHistory(Number(id), serviceData);
      alert(`Service recorded: ${interval.service_item}\n\nThis has been logged to your service history.`);
      
      // Trigger refresh of the service schedule to update progress
      setServiceRefreshTrigger(prev => prev + 1);
      
      // Also refresh the intervals to ensure consistency
      const updatedIntervals = await apiService.getServiceIntervals(Number(id));
      setServiceIntervals(updatedIntervals);
    } catch (error) {
      console.error('Failed to record service:', error);
      console.error('Service data that failed:', serviceData);
      alert(`Failed to record service. Please try again.\n\nError: ${error.message}`);
    }
  };

  const handleAddServiceInterval = async (interval: ServiceIntervalCreate) => {
    try {
      await apiService.createServiceInterval(Number(id), interval);
      // Refresh the intervals list
      const updatedIntervals = await apiService.getServiceIntervals(Number(id));
      setServiceIntervals(updatedIntervals);
    } catch (error) {
      console.error('Failed to add service interval:', error);
      throw error; // Let the modal handle the error
    }
  };

  const handleApplyDefaultIntervals = async () => {
    const confirmation = confirm(
      `Apply standard maintenance schedule for your ${car.year} ${car.make} ${car.model}?\n\n` +
      `This will add ${DEFAULT_SERVICE_INTERVALS.length} common service intervals including:\n` +
      `- Oil changes every 5,000 miles\n` +
      `- Tire rotations every 7,500 miles\n` +
      `- Brake inspections every 20,000 miles\n` +
      `- And 7 other essential services\n\n` +
      `You can edit or remove any of these intervals after they're added.`
    );
    
    if (confirmation) {
      try {
        const defaultIntervals = DEFAULT_SERVICE_INTERVALS.map(interval => ({
          ...interval,
          car_id: Number(id)
        }));
        
        await apiService.createServiceIntervals(Number(id), defaultIntervals);
        
        // Refresh the intervals list
        const updatedIntervals = await apiService.getServiceIntervals(Number(id));
        setServiceIntervals(updatedIntervals);
        
        alert(`Successfully added ${DEFAULT_SERVICE_INTERVALS.length} standard service intervals to your schedule!`);
      } catch (error) {
        console.error('Failed to apply default intervals:', error);
        alert('Failed to apply default intervals. Please try again.');
      }
    }
  };

  const needsEngineTypeSelection = (make: string, model: string) => {
    const makeModel = `${make} ${model}`.toLowerCase();
    
    // Ford trucks
    if (makeModel.includes('f-250') || makeModel.includes('f250') ||
        makeModel.includes('f-350') || makeModel.includes('f350') ||
        makeModel.includes('super duty')) {
      return true;
    }
    
    // GM trucks
    if ((make.toLowerCase() === 'chevrolet' || make.toLowerCase() === 'gmc') &&
        (makeModel.includes('silverado') || makeModel.includes('sierra'))) {
      return true;
    }
    
    // European diesels
    if (['bmw', 'mercedes', 'audi', 'volkswagen'].includes(make.toLowerCase())) {
      return true;
    }
    
    return false;
  };

  const handleResearchIntervals = async (engineType?: string) => {
    setResearchingIntervals(true);
    
    try {
      const research = await apiService.researchServiceIntervals(Number(id), engineType);
      
      if (research.suggested_intervals.length > 0) {
        const confirmation = confirm(
          `Found ${research.total_intervals_found} service intervals from ${research.sources_checked.length} sources.\n\n` +
          `Would you like to add these to your service schedule?\n\n` +
          `Preview:\n` +
          research.suggested_intervals.slice(0, 3).map(i => 
            `- ${i.service_item} (every ${i.interval_miles || 'N/A'} miles/${i.interval_months || 'N/A'} months)`
          ).join('\n') +
          (research.suggested_intervals.length > 3 ? '\n... and more' : '')
        );
        
        if (confirmation) {
          // Convert research results to service interval creates
          const intervalsToCreate = research.suggested_intervals.map(result => ({
            car_id: Number(id),
            service_item: result.service_item,
            interval_miles: result.interval_miles,
            interval_months: result.interval_months,
            priority: result.priority,
            cost_estimate_low: result.cost_estimate_low,
            cost_estimate_high: result.cost_estimate_high,
            notes: result.notes,
            source: result.source
          }));
          
          // Create all intervals
          await apiService.createServiceIntervals(Number(id), intervalsToCreate);
          
          // Refresh the intervals list
          const updatedIntervals = await apiService.getServiceIntervals(Number(id));
          setServiceIntervals(updatedIntervals);
          
          alert(`Successfully added ${research.suggested_intervals.length} service intervals to your schedule!`);
        }
      } else {
        // No research results found, offer default intervals
        const useDefaults = confirm(
          `No specific service intervals found for your ${car.year} ${car.make} ${car.model}.\n\n` +
          `Would you like to apply a standard maintenance schedule instead?\n\n` +
          `This includes common services like:\n` +
          `- Oil changes every 5,000 miles\n` +
          `- Tire rotations every 7,500 miles\n` +
          `- Brake inspections every 20,000 miles\n` +
          `- And 7 other essential services\n\n` +
          `You can always modify these intervals later.`
        );
        
        if (useDefaults) {
          // Create intervals from defaults
          const defaultIntervals = DEFAULT_SERVICE_INTERVALS.map(interval => ({
            ...interval,
            car_id: Number(id)
          }));
          
          await apiService.createServiceIntervals(Number(id), defaultIntervals);
          
          // Refresh the intervals list
          const updatedIntervals = await apiService.getServiceIntervals(Number(id));
          setServiceIntervals(updatedIntervals);
          
          alert(`Successfully added ${DEFAULT_SERVICE_INTERVALS.length} standard service intervals to your schedule!`);
        } else {
          alert('No service intervals added. You can add custom intervals manually using the "Add Interval" button.');
        }
      }
    } catch (error) {
      console.error('Failed to research intervals:', error);
      alert('Failed to research service intervals. This feature may not be available at the moment. Please try again later or add intervals manually.');
    } finally {
      setResearchingIntervals(false);
    }
  };

  const tabs = [
    { label: "Overview", key: "overview" },
    { label: "To-Dos", key: "todos" },
    { label: "Service Schedule", key: "service-schedule" },
    { label: "Fuel", key: "fuel" },
    { label: "Service", key: "service" },
    { label: "Repairs", key: "repairs" },
    { label: "Photos", key: "photos" },
  ];

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center text-xl text-slate-500">Loading car...</main>;
  }
  if (error || !car) {
    return <main className="min-h-screen flex items-center justify-center text-xl text-red-500">{error || "Car not found."}</main>;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <Header />
        <main className="py-8 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-2">
                  {car.year} {car.make} {car.model}
                </h1>
                <p className="text-slate-600">
                  Manage your vehicle details and maintenance
                </p>
              </div>
              <Link 
                href="/dashboard" 
                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </Link>
            </div>
            {/* Tabs Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
              <div className="flex border-b border-slate-200 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    className={`px-6 py-4 font-medium transition-colors whitespace-nowrap relative ${
                      activeTab === tab.key
                        ? "text-blue-600 bg-blue-50 border-b-2 border-blue-600"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                    onClick={() => setActiveTab(tab.key)}
                    type="button"
                    aria-selected={activeTab === tab.key}
                    aria-controls={`tab-panel-${tab.key}`}
                    role="tab"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Tab Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              {activeTab === "overview" && (
                <section id="tab-panel-overview" role="tabpanel">
                  <h2 className="text-2xl font-semibold text-slate-900 mb-6">Vehicle Overview</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Vehicle Details */}
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-lg p-4">
                          <div className="text-sm text-slate-600 mb-1">VIN</div>
                          <div className="font-medium text-slate-900">{car.vin || 'Not specified'}</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4">
                          <div className="text-sm text-slate-600 mb-1">Mileage</div>
                          <div className="font-medium text-slate-900">{car.mileage?.toLocaleString() || 0} miles</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4">
                          <div className="text-sm text-slate-600 mb-1">License Plate</div>
                          <div className="font-medium text-slate-900">{car.license_plate || 'Not specified'}</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4">
                          <div className="text-sm text-slate-600 mb-1">Insurance</div>
                          <div className="font-medium text-slate-900">{car.insurance_info || 'Not specified'}</div>
                        </div>
                      </div>
                      
                      {/* Notes */}
                      {car.notes && (
                        <div className="bg-slate-50 rounded-lg p-4">
                          <div className="text-sm text-slate-600 mb-2">Notes</div>
                          <div className="text-slate-900">{car.notes}</div>
                        </div>
                      )}
                      
                      {/* Group Selection */}
                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="text-sm text-slate-600 mb-2">Group</div>
                        {!isEditingGroup ? (
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                              {car.group_name || 'Daily Drivers'}
                            </span>
                            <button
                              onClick={() => setIsEditingGroup(true)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                            >
                              Change Group
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {showNewGroupInput ? (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newGroupName}
                                  onChange={(e) => setNewGroupName(e.target.value)}
                                  placeholder="Enter new group name"
                                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                  onClick={handleNewGroupSubmit}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                                >
                                  Add
                                </button>
                                <button
                                  onClick={() => { setShowNewGroupInput(false); setNewGroupName(''); }}
                                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 text-sm font-medium"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <select
                                  value={selectedGroup}
                                  onChange={(e) => handleGroupChange(e.target.value)}
                                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  {groups.map(group => (
                                    <option key={group} value={group}>{group}</option>
                                  ))}
                                  <option value="new">+ Create New Group</option>
                                </select>
                                <button
                                  onClick={handleGroupSave}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handleGroupCancel}
                                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 text-sm font-medium"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className="w-40 h-28 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 mb-2">
                    {/* Placeholder for car photo */}
                    <span>Photo</span>
                  </div>
                  <button className="text-xs text-blue-600 hover:underline">Upload Photo</button>
                </div>
              </div>
            </section>
          )}
          {activeTab === "todos" && <ToDosTab carId={car.id} />}
          {activeTab === "service-schedule" && (
            <section id="tab-panel-service-schedule" role="tabpanel">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold text-slate-900">Service Schedule</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      Add Interval
                    </button>
                    <button
                      onClick={handleApplyDefaultIntervals}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Apply Standard
                    </button>
                    <button 
                      onClick={() => {
                        if (needsEngineTypeSelection(car.make, car.model)) {
                          setShowEngineTypeDialog(true);
                        } else {
                          handleResearchIntervals();
                        }
                      }}
                      disabled={researchingIntervals}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      {researchingIntervals ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Researching...
                        </>
                      ) : (
                        'Research Intervals'
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-slate-600 mb-4">
                  Track maintenance schedules and service intervals for your {car.year} {car.make} {car.model}
                </p>
              </div>
              <ServiceIntervalList
                car={car}
                intervals={serviceIntervals}
                onEdit={handleEditServiceInterval}
                onDelete={handleDeleteServiceInterval}
                onAddService={handleAddServiceHistory}
              />
            </section>
          )}
          {activeTab === "fuel" && (
            <section id="tab-panel-fuel" role="tabpanel">
              <h2 className="text-2xl font-semibold text-slate-900 mb-6">Fuel Records</h2>
              <div className="space-y-4">
                {car.fuel && car.fuel.length > 0 ? (
                  car.fuel.map((f: any) => (
                    <div key={f.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-blue-200 transition-colors">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm text-slate-600 mb-1">Date</div>
                          <div className="font-medium text-slate-900">{new Date(f.date).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-600 mb-1">Mileage</div>
                          <div className="font-medium text-slate-900">{f.mileage?.toLocaleString?.() ?? 'N/A'} mi</div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-600 mb-1">Gallons</div>
                          <div className="font-medium text-slate-900">{f.gallons} gal</div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-600 mb-1">Cost</div>
                          <div className="font-medium text-slate-900">${f.cost?.toFixed?.(2) ?? 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
                    <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-slate-500 mb-4">No fuel records found</p>
                  </div>
                )}
                <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Fuel Entry
                </button>
              </div>
            </section>
          )}
          {activeTab === "service" && (
            <section id="tab-panel-service" role="tabpanel">
              <h2 className="text-2xl font-semibold text-slate-900 mb-6">Service History</h2>
              <div className="space-y-4">
                {car.service && car.service.length > 0 ? (
                  car.service.map((s: any) => (
                    <div key={s.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-blue-200 transition-colors">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-slate-600 mb-1">Date</div>
                          <div className="font-medium text-slate-900">{new Date(s.date).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-600 mb-1">Service Type</div>
                          <div className="font-medium text-slate-900">{s.type}</div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-600 mb-1">Notes</div>
                          <div className="text-slate-800">{s.notes || 'No notes'}</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
                    <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-slate-500 mb-4">No service records found</p>
                  </div>
                )}
                <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Service Record
                </button>
              </div>
            </section>
          )}
          {activeTab === "repairs" && (
            <section id="tab-panel-repairs" role="tabpanel">
              <h2 className="text-2xl font-semibold text-slate-900 mb-6">Repair History</h2>
              <div className="space-y-4">
                {car.repairs && car.repairs.length > 0 ? (
                  car.repairs.map((r: any) => (
                    <div key={r.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-blue-200 transition-colors">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-slate-600 mb-1">Date</div>
                          <div className="font-medium text-slate-900">{new Date(r.date).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-600 mb-1">Description</div>
                          <div className="font-medium text-slate-900">{r.description}</div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-600 mb-1">Cost</div>
                          <div className="font-medium text-slate-900">${r.cost?.toFixed?.(2) ?? 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
                    <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <p className="text-slate-500 mb-4">No repair records found</p>
                  </div>
                )}
                <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Repair Record
                </button>
              </div>
            </section>
          )}
          {activeTab === "photos" && (
            <section id="tab-panel-photos" role="tabpanel">
              <h2 className="text-2xl font-semibold text-slate-900 mb-6">Photos</h2>
              <div className="space-y-6">
                {car.photos && car.photos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {car.photos.map((photo: any, index: number) => (
                      <div key={index} className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-blue-200 transition-colors">
                        <div className="aspect-video bg-slate-200 rounded-lg mb-3 flex items-center justify-center">
                          <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-sm text-slate-600 text-center">{photo.name || `Photo ${index + 1}`}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
                    <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-slate-500 mb-4">No photos uploaded yet</p>
                  </div>
                )}
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors bg-slate-50">
                  <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-slate-600 mb-2">Drop photos here or click to browse</p>
                  <p className="text-sm text-slate-500 mb-4">PNG, JPG, GIF up to 10MB</p>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2 mx-auto">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Upload Photos
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
          </div>
        </main>
        
        {/* Service Interval Edit Modal */}
        <ServiceIntervalEditModal
          interval={editingInterval}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingInterval(null);
          }}
          onSave={handleSaveServiceInterval}
        />
        
        {/* Service Interval Add Modal */}
        <ServiceIntervalAddModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddServiceInterval}
          carId={Number(id)}
        />
        
        {/* Engine Type Selection Dialog */}
        {showEngineTypeDialog && (
          <EngineTypeDialog
            make={car.make}
            model={car.model}
            year={car.year}
            onSelect={(engineType) => {
              setShowEngineTypeDialog(false);
              handleResearchIntervals(engineType);
            }}
            onCancel={() => {
              setShowEngineTypeDialog(false);
              setResearchingIntervals(false);
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
} 