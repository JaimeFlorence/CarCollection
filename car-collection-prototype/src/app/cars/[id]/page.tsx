"use client";
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from "react";
import { apiService, ToDo } from "../../../lib/api";
import ToDosTab from "../../../components/ToDosTab";
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

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiService.getCar(Number(id))
      .then(setCar)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const tabs = [
    { label: "Overview", key: "overview" },
    { label: "To-Dos", key: "todos" },
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
    <main className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-slate-800">
            {car.year} {car.make} {car.model}
          </h1>
          <Link href="/" className="text-blue-600 hover:underline">&larr; Back to Dashboard</Link>
        </div>
        <div className="flex border-b mb-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`px-4 py-2 -mb-px border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-600 font-semibold"
                  : "border-transparent text-gray-500 hover:text-blue-500"
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
        <div>
          {activeTab === "overview" && (
            <section id="tab-panel-overview" role="tabpanel" className="p-4 bg-white rounded shadow">
              <h2 className="text-xl font-semibold mb-2">Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <div className="mb-2 text-slate-700"><b>VIN:</b> {car.vin}</div>
                  <div className="mb-2 text-slate-700"><b>Mileage:</b> {car.mileage.toLocaleString()} miles</div>
                  <div className="mb-2 text-slate-700"><b>License Plate:</b> {car.license_plate}</div>
                  <div className="mb-2 text-slate-700"><b>Insurance:</b> {car.insurance_info}</div>
                  <div className="mb-2 text-slate-700"><b>Notes:</b> {car.notes}</div>
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
          {activeTab === "fuel" && (
            <section id="tab-panel-fuel" role="tabpanel" className="p-4 bg-white rounded shadow">
              <h2 className="text-xl font-semibold mb-2">Fuel</h2>
              <ul className="divide-y divide-slate-200">
                {car.fuel && car.fuel.map((f: any) => (
                  <li key={f.id} className="py-2 flex justify-between">
                    <span>{new Date(f.date).toLocaleDateString()}</span>
                    <span>{f.mileage?.toLocaleString?.() ?? ''} mi</span>
                    <span>{f.gallons} gal</span>
                    <span>${f.cost?.toFixed?.(2) ?? ''}</span>
                  </li>
                ))}
              </ul>
              <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Add Fuel Entry</button>
            </section>
          )}
          {activeTab === "service" && (
            <section id="tab-panel-service" role="tabpanel" className="p-4 bg-white rounded shadow">
              <h2 className="text-xl font-semibold mb-2">Service</h2>
              <ul className="divide-y divide-slate-200">
                {car.service && car.service.map((s: any) => (
                  <li key={s.id} className="py-2 flex justify-between">
                    <span>{new Date(s.date).toLocaleDateString()}</span>
                    <span>{s.type}</span>
                    <span className="text-xs text-slate-600">{s.notes}</span>
                  </li>
                ))}
              </ul>
              <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Add Service</button>
            </section>
          )}
          {activeTab === "repairs" && (
            <section id="tab-panel-repairs" role="tabpanel" className="p-4 bg-white rounded shadow">
              <h2 className="text-xl font-semibold mb-2">Repairs</h2>
              <ul className="divide-y divide-slate-200">
                {car.repairs && car.repairs.map((r: any) => (
                  <li key={r.id} className="py-2 flex justify-between">
                    <span>{new Date(r.date).toLocaleDateString()}</span>
                    <span>{r.description}</span>
                    <span>${r.cost?.toFixed?.(2) ?? ''}</span>
                  </li>
                ))}
              </ul>
              <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Add Repair</button>
            </section>
          )}
          {activeTab === "photos" && (
            <section id="tab-panel-photos" role="tabpanel" className="p-4 bg-white rounded shadow">
              <h2 className="text-xl font-semibold mb-2">Photos</h2>
              <p>Car photos and upload UI go here.</p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
} 