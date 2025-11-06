
import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Clock, AlertCircle } from 'lucide-react';

const MacroDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch real data from API
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch('/api/macro-data');
        const json = await response.json();
        
        if (json.error) {
          setError(json.message || 'Failed to fetch data');
        } else {
          setData(json);
          setError(null);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to connect to data source');
        setLoading(false);
      }
    }
    
    fetchData();
    // Refresh every 15 minutes
    const interval = setInterval(fetchData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Use real data or fallback to mock data
  const inflationTrend = (data?.history?.inflation || [
    { month: 'May', cpi: 4.2, core: 4.8 },
    { month: 'Jun', cpi: 3.9, core: 4.6 },
    { month: 'Jul', cpi: 3.6, core: 4.4 },
    { month: 'Aug', cpi: 3.4, core: 4.2 },
    { month: 'Sep', cpi: 3.2, core: 4.0 }
  ]).filter(d => d.cpi !== null && d.core !== null); // Filter out null values

  const rateTrend = (data?.history?.rates || [
    { month: 'May', rate: 5.33, yield: 4.18 },
    { month: 'Jun', rate: 5.33, yield: 4.25 },
    { month: 'Jul', rate: 5.33, yield: 4.35 },
    { month: 'Aug', rate: 5.33, yield: 4.45 },
    { month: 'Sep', rate: 5.33, yield: 4.57 }
  ]).filter(d => d.rate !== null && d.yield !== null); // Filter out null values

  const sectorData = data?.sectors || [
    { sector: 'Energy', sensitivity: 0.72 },
    { sector: 'Financials', sensitivity: 0.45 },
    { sector: 'Utilities', sensitivity: -0.35 },
    { sector: 'Consumer Disc.', sensitivity: -0.65 },
    { sector: 'Technology', sensitivity: -0.85 }
  ];

  const Metric = ({ label, value, change, unit = '' }) => (
    <div className="border border-gray-300 p-4 bg-white">
      <div className="text-xs text-gray-600 mb-1" style={{ fontFamily: 'Times New Roman, serif' }}>
        {label}
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold" style={{ fontFamily: 'Times New Roman, serif' }}>
          {value}{unit}
        </span>
        {change !== undefined && (
          <span className={`text-sm flex items-center ${change >= 0 ? 'text-gray-700' : 'text-gray-700'}`}>
            {change >= 0 ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
            {change > 0 ? '+' : ''}{change}{unit}
          </span>
        )}
      </div>
    </div>
  );

  // Show loading state
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ fontFamily: 'Times New Roman, serif' }}>
        <div className="text-center">
          <div className="text-xl mb-2">Loading macro data...</div>
          <div className="text-sm text-gray-600">Fetching latest indicators</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ fontFamily: 'Times New Roman, serif' }}>
        <div className="text-center max-w-md">
          <div className="text-xl mb-2 text-red-600">Error Loading Data</div>
          <div className="text-sm text-gray-600 mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="border border-gray-400 px-4 py-2 hover:bg-gray-100"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" style={{ fontFamily: 'Times New Roman, serif' }}>
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: 'Times New Roman, serif' }}>
              Macro-Market Context Dashboard
            </h1>
            <p className="text-sm text-gray-600">Real-time indicators via FRED & BLS APIs</p>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end text-sm text-gray-600 mb-1">
              <Clock size={14} className="mr-1" />
              {currentTime.toLocaleTimeString()}
            </div>
            <button 
              onClick={() => {
                setLoading(true);
                fetch('/api/macro-data').then(r => r.json()).then(setData).finally(() => setLoading(false));
              }}
              className="text-xs border border-gray-400 px-3 py-1 hover:bg-gray-100"
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Key Insight Box */}
        <div className="bg-white border-2 border-gray-900 p-4">
          <div className="flex items-start">
            <AlertCircle size={20} className="mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-bold mb-2" style={{ fontFamily: 'Times New Roman, serif' }}>Market Insight</h3>
              <p className="text-sm leading-relaxed" style={{ fontFamily: 'Times New Roman, serif' }}>
                Inflation {data?.metrics?.cpi?.value > 3.5 ? 'elevated' : 'declining'} with CPI at {data?.metrics?.cpi?.value?.toFixed(1) || '3.2'}%. 
                Real rates {data?.derived?.realRate?.value > 1.5 ? 'remain restrictive' : 'moderating'} at {data?.derived?.realRate?.value?.toFixed(2) || '2.13'}%, 
                suggesting {data?.derived?.realRate?.value > 1.5 ? 'continued pressure on growth sectors' : 'easing conditions'}. 
                Wage growth at {data?.metrics?.wageGrowth?.value?.toFixed(1) || '4.3'}% {data?.metrics?.wageGrowth?.value > data?.metrics?.cpi?.value ? 'exceeds' : 'trails'} inflation.
                {data?.cached && <span className="text-xs text-gray-500 block mt-2">Data cached {data.cacheAge} min ago</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Core Metrics Grid */}
        <div>
          <h2 className="text-xl font-bold mb-3" style={{ fontFamily: 'Times New Roman, serif' }}>Core Indicators</h2>
          <div className="grid grid-cols-4 gap-3">
            <Metric label="Consumer Price Index" value={data?.metrics?.cpi?.value?.toFixed(1) || "3.2"} unit="%" change={data?.metrics?.cpi?.change} />
            <Metric label="Core CPI (ex Food/Energy)" value={data?.metrics?.coreCPI?.value?.toFixed(1) || "4.0"} unit="%" change={data?.metrics?.coreCPI?.change} />
            <Metric label="Federal Funds Rate" value={data?.metrics?.fedRate?.value?.toFixed(2) || "5.33"} unit="%" />
            <Metric label="10Y Treasury Yield" value={data?.metrics?.treasury10y?.value?.toFixed(2) || "4.57"} unit="%" change={data?.metrics?.treasury10y?.change} />
            <Metric label="Wage Growth (YoY)" value={data?.metrics?.wageGrowth?.value?.toFixed(1) || "4.3"} unit="%" change={data?.metrics?.wageGrowth?.change} />
            <Metric label="Real Earnings Growth" value={data?.metrics?.realEarningsGrowth?.value?.toFixed(1) || "0.5"} unit="%" change={data?.metrics?.realEarningsGrowth?.change} />
            <Metric label="Unemployment Rate" value={data?.metrics?.unemployment?.value?.toFixed(1) || "3.8"} unit="%" change={data?.metrics?.unemployment?.change} />
            <Metric label="S&P 500 P/E Ratio" value={data?.metrics?.sp500PE?.value?.toFixed(1) || "19.2"} unit="x" change={data?.metrics?.sp500PE?.change} />
          </div>
        </div>

        {/* Derived Metrics */}
        <div>
          <h2 className="text-xl font-bold mb-3" style={{ fontFamily: 'Times New Roman, serif' }}>Derived Metrics</h2>
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Real Interest Rate (Fed - CPI)" value={data?.derived?.realRate?.value?.toFixed(2) || "2.13"} unit="%" change={data?.derived?.realRate?.change} />
            <Metric label="Inflation Momentum (MoM)" value={data?.derived?.inflationMomentum?.value?.toFixed(1) || "-0.5"} unit="%" change={data?.derived?.inflationMomentum?.change} />
            <Metric label="Inflation vs Expected (3.0%)" value={data?.derived?.inflationSurprise?.value?.toFixed(1) || "+0.2"} unit="%" />
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-2 gap-6">
          {/* Inflation Trend */}
          <div className="bg-white border border-gray-300 p-5">
            <h3 className="font-bold mb-4 text-sm" style={{ fontFamily: 'Times New Roman, serif' }}>
              Inflation Trend (5-Month)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={inflationTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="month" 
                  style={{ fontFamily: 'Times New Roman, serif', fontSize: '11px' }}
                  stroke="#333"
                />
                <YAxis 
                  style={{ fontFamily: 'Times New Roman, serif', fontSize: '11px' }}
                  stroke="#333"
                />
                <Tooltip 
                  contentStyle={{ 
                    fontFamily: 'Times New Roman, serif', 
                    fontSize: '12px',
                    border: '1px solid #ccc',
                    backgroundColor: 'white'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cpi" 
                  stroke="#000" 
                  strokeWidth={2}
                  name="CPI"
                  dot={{ fill: '#000', r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="core" 
                  stroke="#666" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Core CPI"
                  dot={{ fill: '#666', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Rate Environment */}
          <div className="bg-white border border-gray-300 p-5">
            <h3 className="font-bold mb-4 text-sm" style={{ fontFamily: 'Times New Roman, serif' }}>
              Rate Environment
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={rateTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="month" 
                  style={{ fontFamily: 'Times New Roman, serif', fontSize: '11px' }}
                  stroke="#333"
                />
                <YAxis 
                  style={{ fontFamily: 'Times New Roman, serif', fontSize: '11px' }}
                  stroke="#333"
                />
                <Tooltip 
                  contentStyle={{ 
                    fontFamily: 'Times New Roman, serif', 
                    fontSize: '12px',
                    border: '1px solid #ccc',
                    backgroundColor: 'white'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#000" 
                  strokeWidth={2}
                  name="Fed Funds"
                  dot={{ fill: '#000', r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="yield" 
                  stroke="#666" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="10Y Yield"
                  dot={{ fill: '#666', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sector Analysis */}
        <div className="bg-white border border-gray-300 p-5">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Times New Roman, serif' }}>
            Sector Rate Sensitivity Analysis
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={sectorData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis 
                type="number" 
                style={{ fontFamily: 'Times New Roman, serif', fontSize: '11px' }}
                stroke="#333"
              />
              <YAxis 
                type="category" 
                dataKey="sector" 
                width={120}
                style={{ fontFamily: 'Times New Roman, serif', fontSize: '11px' }}
                stroke="#333"
              />
              <Tooltip 
                contentStyle={{ 
                  fontFamily: 'Times New Roman, serif', 
                  fontSize: '12px',
                  border: '1px solid #ccc',
                  backgroundColor: 'white'
                }}
              />
              <Bar 
                dataKey="sensitivity" 
                fill="#000"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-600 mt-3" style={{ fontFamily: 'Times New Roman, serif' }}>
            Rate sensitivity coefficient: positive values benefit from rising rates, negative values face pressure
          </p>
        </div>

        {/* FOMC Section */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-300 p-4">
            <div className="text-xs text-gray-600 mb-2" style={{ fontFamily: 'Times New Roman, serif' }}>
              Next FOMC Meeting
            </div>
            <div className="text-xl font-bold" style={{ fontFamily: 'Times New Roman, serif' }}>
              {data?.fomc?.nextMeeting || 'Dec 17-18, 2024'}
            </div>
          </div>
          <div className="bg-white border border-gray-300 p-4 col-span-2">
            <div className="text-xs text-gray-600 mb-2" style={{ fontFamily: 'Times New Roman, serif' }}>
              Rate Decision Probability (CME FedWatch)
            </div>
            <div className="flex items-baseline">
              <span className="text-xl font-bold mr-2" style={{ fontFamily: 'Times New Roman, serif' }}>Hold</span>
              <span className="text-3xl font-bold" style={{ fontFamily: 'Times New Roman, serif' }}>
                {data?.fomc?.holdProbability || 88}%
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-300 pt-4 mt-6">
          <div className="flex justify-between items-center text-xs text-gray-600">
            <div style={{ fontFamily: 'Times New Roman, serif' }}>
              Data Sources: Federal Reserve Economic Data (FRED) • U.S. Bureau of Labor Statistics (BLS) • CME FedWatch
            </div>
            <div className="space-x-3">
              <button className="border border-gray-400 px-3 py-1 hover:bg-gray-100">Export PDF</button>
              <button className="border border-gray-400 px-3 py-1 hover:bg-gray-100">Export PNG</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MacroDashboard;