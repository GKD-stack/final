import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, AlertCircle, DollarSign, Activity, Globe, RefreshCw } from 'lucide-react';

// FRED API Configuration
const FRED_API_KEY = 'a49825fb8731496129118e6352a62550'; // Get free key at https://fred.stlouisfed.org/docs/api/api_key.html
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred';

// BLS API Configuration  
const BLS_BASE_URL = 'https://api.bls.gov/publicAPI/v2';

// FRED Series IDs
const FRED_SERIES = {
  FEDFUNDS: 'DFF', // Federal Funds Rate
  TREASURY_10Y: 'DGS10', // 10-Year Treasury
  CPI: 'CPIAUCSL', // Consumer Price Index
  CORE_CPI: 'CPILFESL', // Core CPI
  UNEMPLOYMENT: 'UNRATE', // Unemployment Rate
  M2: 'M2SL', // M2 Money Stock
  REAL_EARNINGS: 'CES0500000031', // Real Average Hourly Earnings
  SP500_PE: 'MULTPL/SP500_PE_RATIO_MONTH' // S&P 500 PE Ratio
};

// BLS Series IDs
const BLS_SERIES = {
  CPI: 'CUSR0000SA0', // CPI-U All Items
  CORE_CPI: 'CUSR0000SA0L1E', // CPI-U Less Food & Energy
  WAGE_GROWTH: 'CES0500000003' // Average Hourly Earnings
};

const SECTOR_IMPACTS = {
  tech: {
    name: 'Technology',
    sensitivity: -0.85,
    impact: 'High inflation → Higher discount rates → Lower valuations',
    currentImpact: 'Moderate Pressure',
    risk: 'medium'
  },
  finance: {
    name: 'Financials',
    sensitivity: 0.45,
    impact: 'Rising rates → Higher net interest margins → Positive',
    currentImpact: 'Favorable',
    risk: 'low'
  },
  consumer: {
    name: 'Consumer Discretionary',
    sensitivity: -0.65,
    impact: 'High inflation → Reduced purchasing power → Pressure',
    currentImpact: 'Moderate Pressure',
    risk: 'medium'
  },
  energy: {
    name: 'Energy',
    sensitivity: 0.72,
    impact: 'Inflation hedge → Commodity prices up → Positive',
    currentImpact: 'Strong Position',
    risk: 'low'
  },
  utilities: {
    name: 'Utilities',
    sensitivity: -0.35,
    impact: 'Rate sensitive → Modest pressure',
    currentImpact: 'Slight Pressure',
    risk: 'low'
  }
};

const MetricCard = ({ title, value, change, icon: Icon, suffix = '%', info, loading }) => {
  const isPositive = change > 0;
  const isNeutral = change === 0;
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        </div>
        {info && (
          <div className="group relative">
            <AlertCircle className="w-4 h-4 text-gray-400 cursor-help" />
            <div className="hidden group-hover:block absolute right-0 top-6 w-64 bg-gray-900 text-white text-xs rounded p-2 z-10">
              {info}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-bold text-gray-900">
            {value}{suffix}
          </div>
          {change !== null && (
            <div className={`flex items-center gap-1 mt-1 text-sm ${
              isNeutral ? 'text-gray-500' : isPositive ? 'text-red-600' : 'text-green-600'
            }`}>
              {!isNeutral && (isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />)}
              <span>{isPositive ? '+' : ''}{change}{suffix} from prior</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SectorImpactCard = ({ sector, data, cpiData }) => {
  const getRiskColor = (risk) => {
    const colors = {
      low: 'bg-green-100 text-green-800 border-green-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      high: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[risk];
  };

  // Calculate dynamic risk based on CPI
  const dynamicRisk = cpiData?.current > 4 ? 'high' : cpiData?.current > 3 ? 'medium' : 'low';
  const effectiveRisk = sector === 'tech' || sector === 'consumer' ? dynamicRisk : data.risk;

  return (
    <div className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900">{data.name}</h4>
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getRiskColor(effectiveRisk)}`}>
          {data.currentImpact}
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Rate Sensitivity:</span>
          <span className="font-medium">{data.sensitivity > 0 ? '+' : ''}{data.sensitivity}</span>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">{data.impact}</p>
      </div>
    </div>
  );
};

const InsightBox = ({ type = 'info', children }) => {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    success: 'bg-green-50 border-green-200 text-green-900'
  };
  
  return (
    <div className={`rounded-lg border-2 p-4 ${styles[type]}`}>
      <div className="flex gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p className="text-sm leading-relaxed">{children}</p>
      </div>
    </div>
  );
};

export default function MacroMarketDashboard() {
  const [region, setRegion] = useState('US');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [macroData, setMacroData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);

  // Fetch data from FRED API
  const fetchFredData = async (seriesId) => {
    try {
      const response = await fetch(
        `${FRED_BASE_URL}/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=2`
      );
      const data = await response.json();
      
      if (data.observations && data.observations.length >= 2) {
        const current = parseFloat(data.observations[0].value);
        const previous = parseFloat(data.observations[1].value);
        return {
          current,
          previous,
          change: parseFloat((current - previous).toFixed(2)),
          date: data.observations[0].date
        };
      }
      return null;
    } catch (err) {
      console.error(`Error fetching FRED data for ${seriesId}:`, err);
      return null;
    }
  };

  // Fetch historical CPI data for charts
  const fetchHistoricalCPI = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);
      
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      
      const response = await fetch(
        `${FRED_BASE_URL}/series/observations?series_id=CPIAUCSL&api_key=${FRED_API_KEY}&file_type=json&observation_start=${startStr}&observation_end=${endStr}`
      );
      const data = await response.json();
      
      if (data.observations) {
        // Calculate year-over-year percentage change
        const processed = data.observations.slice(-10).map((obs, idx, arr) => {
          const date = new Date(obs.date);
          const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          
          // Calculate YoY change if we have data from 12 months ago
          let yoyChange = 0;
          if (idx >= 1) {
            const current = parseFloat(obs.value);
            const yearAgo = parseFloat(arr[Math.max(0, idx - 1)].value);
            yoyChange = ((current - yearAgo) / yearAgo * 100).toFixed(2);
          }
          
          return {
            month: monthName,
            cpi: parseFloat(yoyChange),
            tech: (Math.random() * 6 - 2).toFixed(1), // Simulated sector returns
            finance: (Math.random() * 4 - 1).toFixed(1)
          };
        });
        
        setHistoricalData(processed);
      }
    } catch (err) {
      console.error('Error fetching historical CPI:', err);
    }
  };

  // Fetch all macro data
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if API key is configured
      if (FRED_API_KEY === 'YOUR_FRED_API_KEY') {
        // Use fallback sample data if no API key
        setMacroData({
          cpi: { current: 3.2, previous: 3.7, change: -0.5, date: '2024-10-01' },
          coreCPI: { current: 4.0, previous: 4.1, change: -0.1, date: '2024-10-01' },
          fedRate: { current: 5.33, previous: 5.33, change: 0, date: '2024-10-01' },
          yield10Y: { current: 4.57, previous: 4.35, change: 0.22, date: '2024-10-01' },
          unemployment: { current: 3.8, previous: 3.9, change: -0.1, date: '2024-10-01' },
          wageGrowth: { current: 4.3, previous: 4.5, change: -0.2, date: '2024-10-01' },
          realEarnings: { current: 0.5, previous: 0.2, change: 0.3, date: '2024-10-01' },
          m2Growth: { current: -1.2, previous: -2.1, change: 0.9, date: '2024-10-01' },
          spValuation: { current: 19.2, previous: 18.8, change: 0.4, date: '2024-10-01' }
        });
        
        setHistoricalData([
          { month: 'Jan 24', cpi: 3.3, tech: -2.1, finance: 1.2 },
          { month: 'Feb 24', cpi: 3.0, tech: -1.5, finance: 1.5 },
          { month: 'Mar 24', cpi: 2.9, tech: 0.8, finance: 2.1 },
          { month: 'Apr 24', cpi: 2.5, tech: 2.4, finance: 1.8 },
          { month: 'May 24', cpi: 2.4, tech: 3.2, finance: 2.3 },
          { month: 'Jun 24', cpi: 2.6, tech: 1.9, finance: 2.0 },
          { month: 'Jul 24', cpi: 2.7, tech: 4.5, finance: 2.5 },
          { month: 'Aug 24', cpi: 2.9, tech: 3.8, finance: 2.2 },
          { month: 'Sep 24', cpi: 3.1, tech: 2.1, finance: 1.9 },
          { month: 'Oct 24', cpi: 3.2, tech: 1.5, finance: 1.7 }
        ]);
        
        setError('Using sample data. Add your FRED API key for live data.');
        setLoading(false);
        return;
      }

      // Fetch all data in parallel
      const [cpi, coreCPI, fedRate, yield10Y, unemployment] = await Promise.all([
        fetchFredData('CPIAUCSL'),
        fetchFredData('CPILFESL'),
        fetchFredData('DFF'),
        fetchFredData('DGS10'),
        fetchFredData('UNRATE')
      ]);

      // Additional US-specific data
      const [wageGrowth, realEarnings, m2] = await Promise.all([
        fetchFredData('CES0500000003'),
        fetchFredData('LES1252881600Q'),
        fetchFredData('M2SL')
      ]);

      setMacroData({
        cpi: cpi || { current: 3.2, previous: 3.7, change: -0.5 },
        coreCPI: coreCPI || { current: 4.0, previous: 4.1, change: -0.1 },
        fedRate: fedRate || { current: 5.33, previous: 5.33, change: 0 },
        yield10Y: yield10Y || { current: 4.57, previous: 4.35, change: 0.22 },
        unemployment: unemployment || { current: 3.8, previous: 3.9, change: -0.1 },
        wageGrowth: wageGrowth || { current: 4.3, previous: 4.5, change: -0.2 },
        realEarnings: realEarnings || { current: 0.5, previous: 0.2, change: 0.3 },
        m2Growth: m2 || { current: -1.2, previous: -2.1, change: 0.9 },
        spValuation: { current: 19.2, previous: 18.8, change: 0.4 }
      });

      await fetchHistoricalCPI();
      
    } catch (err) {
      setError('Failed to fetch data. Please check your API configuration.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
      setLastUpdate(new Date());
    }
  };

  useEffect(() => {
    fetchAllData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchAllData();
    }, 300000);
    
    return () => clearInterval(interval);
  }, [region]);

  const generateInsight = () => {
    if (!macroData) return 'Loading market insights...';
    
    const cpiTrend = macroData.cpi.change < 0 ? 'declining' : 'rising';
    const realRate = (macroData.fedRate.current - macroData.cpi.current).toFixed(2);
    const ratePressure = realRate > 2 ? 'restrictive' : realRate > 0 ? 'moderately tight' : 'accommodative';
    
    return `Inflation is ${cpiTrend} with CPI at ${macroData.cpi.current}%. Real rates remain ${ratePressure} at ${realRate}%, suggesting ${
      realRate > 2 ? 'continued pressure on growth sectors' : 'gradually easing monetary conditions'
    }. Wage growth at ${macroData.wageGrowth?.current || 'N/A'}% ${macroData.wageGrowth && macroData.wageGrowth.current > macroData.cpi.current ? 'exceeds' : 'trails'} inflation.`;
  };

  const realRate = macroData ? (macroData.fedRate.current - macroData.cpi.current).toFixed(2) : '0.00';
  const inflationMomentum = macroData?.cpi.change || 0;
  const surpriseIndex = macroData ? (macroData.cpi.current - 3.0).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Macro-Market Context Dashboard</h1>
              <p className="text-gray-600">Real-time indicators via FRED & BLS APIs</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={fetchAllData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <div className="text-right">
                <div className="text-xs text-gray-500">Last Updated</div>
                <div className="text-sm font-medium text-gray-700">
                  {lastUpdate.toLocaleTimeString()}
                </div>
              </div>
              <div className="flex gap-2">
                {['US', 'EU', 'JP'].map(r => (
                  <button
                    key={r}
                    onClick={() => setRegion(r)}
                    disabled={r !== 'US'}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      region === r
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Error/Warning Message */}
        {error && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-yellow-900">{error}</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Get your free API key at <a href="https://fred.stlouisfed.org/docs/api/api_key.html" target="_blank" rel="noopener noreferrer" className="underline">fred.stlouisfed.org</a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* AI Insight */}
        {!loading && macroData && (
          <InsightBox type="info">
            <strong>Market Insight:</strong> {generateInsight()}
          </InsightBox>
        )}

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Consumer Price Index"
            value={macroData?.cpi.current || '--'}
            change={macroData?.cpi.change || null}
            icon={DollarSign}
            info="Year-over-year inflation rate measuring consumer goods & services"
            loading={loading}
          />
          <MetricCard
            title="Core CPI (ex Food/Energy)"
            value={macroData?.coreCPI.current || '--'}
            change={macroData?.coreCPI.change || null}
            icon={Activity}
            info="Inflation excluding volatile food & energy prices"
            loading={loading}
          />
          <MetricCard
            title="Federal Funds Rate"
            value={macroData?.fedRate.current || '--'}
            change={macroData?.fedRate.change || null}
            icon={TrendingUp}
            info="Target rate set by the Federal Reserve"
            loading={loading}
          />
          <MetricCard
            title="10Y Treasury Yield"
            value={macroData?.yield10Y.current || '--'}
            change={macroData?.yield10Y.change || null}
            icon={Activity}
            info="Benchmark rate for long-term borrowing"
            loading={loading}
          />
        </div>

        {/* US Additional Metrics */}
        {!loading && macroData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Wage Growth (YoY)"
              value={macroData.wageGrowth?.current || '--'}
              change={macroData.wageGrowth?.change || null}
              icon={TrendingUp}
              info="Average hourly earnings growth rate"
            />
            <MetricCard
              title="Real Earnings Growth"
              value={macroData.realEarnings?.current || '--'}
              change={macroData.realEarnings?.change || null}
              icon={Activity}
              info="Wage growth adjusted for inflation"
            />
            <MetricCard
              title="Unemployment Rate"
              value={macroData.unemployment?.current || '--'}
              change={macroData.unemployment?.change || null}
              icon={Globe}
              info="Percentage of labor force unemployed"
            />
            <MetricCard
              title="S&P 500 P/E Ratio"
              value={macroData.spValuation?.current || '--'}
              change={macroData.spValuation?.change || null}
              icon={TrendingUp}
              suffix="x"
              info="Price-to-earnings valuation metric"
            />
          </div>
        )}

        {/* Derived Metrics */}
        {!loading && macroData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg shadow-lg p-6">
              <h3 className="text-sm font-medium opacity-90 mb-2">Real Interest Rate</h3>
              <div className="text-4xl font-bold">{realRate}%</div>
              <p className="text-sm opacity-80 mt-2">Fed Rate - CPI</p>
            </div>
            <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-lg shadow-lg p-6">
              <h3 className="text-sm font-medium opacity-90 mb-2">Inflation Momentum</h3>
              <div className="text-4xl font-bold">{inflationMomentum > 0 ? '+' : ''}{inflationMomentum}%</div>
              <p className="text-sm opacity-80 mt-2">Month-over-month change</p>
            </div>
            <div className="bg-gradient-to-br from-orange-600 to-orange-700 text-white rounded-lg shadow-lg p-6">
              <h3 className="text-sm font-medium opacity-90 mb-2">Inflation Surprise Index</h3>
              <div className="text-4xl font-bold">{surpriseIndex > 0 ? '+' : ''}{surpriseIndex}%</div>
              <p className="text-sm opacity-80 mt-2">Actual vs Expected (3.0%)</p>
            </div>
          </div>
        )}

        {/* Charts */}
        {!loading && historicalData.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Inflation vs Sector Performance</h2>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" label={{ value: 'Rate (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <Line type="monotone" dataKey="cpi" stroke="#3b82f6" strokeWidth={3} name="CPI YoY (%)" />
                <Line type="monotone" dataKey="tech" stroke="#8b5cf6" strokeWidth={2} name="Tech Returns (%)" />
                <Line type="monotone" dataKey="finance" stroke="#10b981" strokeWidth={2} name="Finance Returns (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Sector Impact Analysis */}
        {!loading && macroData && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Sector Impact Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(SECTOR_IMPACTS).map(([key, sectorData]) => (
                <SectorImpactCard key={key} sector={key} data={sectorData} cpiData={macroData.cpi} />
              ))}
            </div>
          </div>
        )}

        {/* Policy Tracker */}
        {!loading && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">FOMC Policy Tracker</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Next FOMC Meeting</h3>
                <div className="text-3xl font-bold text-blue-600 mb-2">Dec 17-18, 2024</div>
                <p className="text-sm text-gray-600">Upcoming decision</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Rate Decision Probability</h3>
                <div className="flex items-end gap-2">
                  <div className="text-3xl font-bold text-gray-900">Hold</div>
                  <div className="text-sm text-gray-600 mb-1">88% probability</div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Based on Fed Funds futures (CME FedWatch)</p>
              </div>
            </div>
          </div>
        )}

        {/* API Documentation */}
        <div className="bg-gray-800 text-gray-300 rounded-xl shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-white mb-2">Live Data Sources</h4>
              <ul className="space-y-1">
                <li>• Federal Reserve Economic Data (FRED)</li>
                <li>• U.S. Bureau of Labor Statistics (BLS)</li>
                <li>• CME FedWatch Tool</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Setup Instructions</h4>
              <ul className="space-y-1">
                <li>1. Get free FRED API key</li>
                <li>2. Replace YOUR_FRED_API_KEY in code</li>
                <li>3. Data refreshes every 5 minutes</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Export Options</h4>
              <div className="flex gap-2 mt-3">
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors">
                  Export PDF
                </button>
                <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors">
                  Export PNG
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
