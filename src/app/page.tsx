import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const cars = [
  {
    id: 1,
    year: 2020,
    make: "Ferrari",
    model: "812 Superfast",
    image: "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=600&q=80",
    mileage: 3450,
    nextService: "Oil Change in 2 weeks",
    issues: 2,
  },
  {
    id: 2,
    year: 2018,
    make: "Porsche",
    model: "911 Carrera S",
    image: "https://images.unsplash.com/photo-1511918984145-48de785d4c4e?auto=format&fit=crop&w=600&q=80",
    mileage: 8920,
    nextService: "Annual Service in 1 month",
    issues: 0,
  },
  {
    id: 3,
    year: 2015,
    make: "BMW",
    model: "M3 Competition",
    image: "https://images.unsplash.com/photo-1461632830798-3adb3034e4c8?auto=format&fit=crop&w=600&q=80",
    mileage: 15230,
    nextService: "Major Service in 3 months",
    issues: 1,
  },
];

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center text-slate-800 drop-shadow-sm">🚗 Car Collection Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {cars.map((car) => (
            <Card key={car.id} className="shadow-lg hover:shadow-2xl transition-shadow duration-300 border-0 bg-white/80 backdrop-blur rounded-2xl">
              <CardHeader className="p-0 overflow-hidden rounded-t-2xl">
                <img
                  src={car.image}
                  alt={`${car.year} ${car.make} ${car.model}`}
                  className="w-full h-40 object-cover object-center"
                  style={{ borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}
                />
              </CardHeader>
              <CardContent className="p-6">
                <CardTitle className="text-2xl font-semibold mb-1">{car.year} {car.make} {car.model}</CardTitle>
                <CardDescription className="mb-2 text-slate-600">Mileage: {car.mileage.toLocaleString()} miles</CardDescription>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-blue-700 font-medium bg-blue-100 px-2 py-1 rounded">{car.nextService}</span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${car.issues === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{car.issues} Issue{car.issues !== 1 ? 's' : ''}</span>
                </div>
                <button className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg shadow transition">View Details</button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
} 