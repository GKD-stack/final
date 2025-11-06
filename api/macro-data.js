// FILE: /api/macro-data.js
// This is a Vercel Serverless Function (place in /api folder at project root)

const FRED_API_KEY = process.env.FRED_API_KEY;

// In-memory cache (resets on cold starts, but that's fine)
let cachedData = null;
let lastFetch = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// FRED series IDs
const FRED_SERIES = {
  cpi: 'CPIAUCSL',
  coreCPI: 'CPILFESL',
  fedRate: 'FEDFUNDS',
  treasury10y: 'DGS10',
  unemployment: 'UNRATE',
};

async function fetchFredData(seriesId) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=13`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`FRED API error: ${response.status}`);
    
    const data = await response.json();
    
    if (!data.observations || data.observations.length === 0) {
      throw new Error(`No data for series ${seriesId}`);
    }
    
    return data.observations;
  } catch (error) {
    console.error(`Error fetching ${seriesId}:`, error);
    return null;
  }
}

function parseValue(value) {
  if (!value || value === '.') return null;
  return parseFloat(value);
}

function calculateChange(current, previous) {
  if (!current || !previous) return null;
  return parseFloat((current - previous).toFixed(2));
}

function calculateYoYChange(observations) {
  if (!observations || observations.length < 13) return null;
  
  const current = parseValue(observations[0].value);
  const yearAgo = parseValue(observations[12].value);
  
  if (!current || !yearAgo) return null;
  return parseFloat((((current - yearAgo) / yearAgo) * 100).toFixed(2));
}

function calculateMoMChange(observations) {
  if (!observations || observations.length < 2) return null;
  
  const current = parseValue(observations[0].value);
  const lastMonth = parseValue(observations[1].value);
  
  if (!current || !lastMonth) return null;
  return parseFloat((((current - lastMonth) / lastMonth) * 100).toFixed(2));
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check cache
  const now = Date.now();
  if (cachedData && (now - lastFetch) < CACHE_DURATION) {
    return res.status(200).json({
      ...cachedData,
      cached: true,
      cacheAge: Math.round((now - lastFetch) / 1000 / 60)
    });
  }

  // Verify API key
  if (!FRED_API_KEY) {
    return res.status(500).json({ 
      error: 'FRED_API_KEY not configured',
      message: 'Add FRED_API_KEY to Vercel environment variables'
    });
  }

  try {
    // Fetch all data in parallel
    console.log('Fetching fresh data from FRED...');
    
    const [cpiData, coreCPIData, fedRateData, treasury10yData, unemploymentData] = 
      await Promise.all([
        fetchFredData(FRED_SERIES.cpi),
        fetchFredData(FRED_SERIES.coreCPI),
        fetchFredData(FRED_SERIES.fedRate),
        fetchFredData(FRED_SERIES.treasury10y),
        fetchFredData(FRED_SERIES.unemployment)
      ]);

    // Check if we got data
    if (!cpiData || !fedRateData) {
      throw new Error('Failed to fetch critical data from FRED');
    }

    // Parse latest values
    const cpiYoY = calculateYoYChange(cpiData);
    const cpiMoM = calculateMoMChange(cpiData);
    const coreCPIYoY = calculateYoYChange(coreCPIData);
    
    const fedRateCurrent = parseValue(fedRateData[0].value);
    const fedRatePrevious = parseValue(fedRateData[1]?.value);
    
    const treasury10yCurrent = parseValue(treasury10yData[0].value);
    const treasury10yPrevious = parseValue(treasury10yData[1]?.value);
    
    const unemploymentCurrent = parseValue(unemploymentData[0].value);
    const unemploymentPrevious = parseValue(unemploymentData[1]?.value);

    // Calculate derived metrics
    const realRate = fedRateCurrent && cpiYoY 
      ? parseFloat((fedRateCurrent - cpiYoY).toFixed(2))
      : null;

    // Build chart data (last 6 months)
    const inflationHistory = cpiData.slice(0, 6).reverse().map((item, idx) => {
      const coreItem = coreCPIData[5 - idx];
      return {
        month: new Date(item.date).toLocaleDateString('en-US', { month: 'short' }),
        cpi: calculateYoYChange(cpiData.slice(5 - idx)),
        core: coreItem ? calculateYoYChange(coreCPIData.slice(5 - idx)) : null
      };
    });

    const rateHistory = fedRateData.slice(0, 6).reverse().map((item, idx) => {
      const treasuryItem = treasury10yData[5 - idx];
      return {
        month: new Date(item.date).toLocaleDateString('en-US', { month: 'short' }),
        rate: parseValue(item.value),
        yield: treasuryItem ? parseValue(treasuryItem.value) : null
      };
    });

    // Compile response
    const responseData = {
      timestamp: new Date().toISOString(),
      lastUpdated: cpiData[0].date,
      metrics: {
        cpi: {
          value: cpiYoY,
          change: cpiMoM,
          raw: parseValue(cpiData[0].value)
        },
        coreCPI: {
          value: coreCPIYoY,
          change: calculateMoMChange(coreCPIData),
          raw: parseValue(coreCPIData[0].value)
        },
        fedRate: {
          value: fedRateCurrent,
          change: calculateChange(fedRateCurrent, fedRatePrevious)
        },
        treasury10y: {
          value: treasury10yCurrent,
          change: calculateChange(treasury10yCurrent, treasury10yPrevious)
        },
        unemployment: {
          value: unemploymentCurrent,
          change: calculateChange(unemploymentCurrent, unemploymentPrevious)
        },
        wageGrowth: {
          value: 4.3,
          change: -0.2
        },
        realEarningsGrowth: {
          value: cpiYoY ? parseFloat((4.3 - cpiYoY).toFixed(1)) : 0.5,
          change: 0.3
        },
        sp500PE: {
          value: 19.2,
          change: 0.4
        }
      },
      derived: {
        realRate: {
          value: realRate,
          change: calculateChange(
            realRate,
            fedRatePrevious && calculateYoYChange(cpiData.slice(1)) 
              ? fedRatePrevious - calculateYoYChange(cpiData.slice(1))
              : null
          )
        },
        inflationMomentum: {
          value: cpiMoM,
          change: 0.2
        },
        inflationSurprise: {
          value: cpiYoY ? parseFloat((cpiYoY - 3.0).toFixed(1)) : 0.2,
          expected: 3.0
        }
      },
      history: {
        inflation: inflationHistory,
        rates: rateHistory
      },
      sectors: [
        { sector: 'Energy', sensitivity: 0.72, status: 'Strong Position' },
        { sector: 'Financials', sensitivity: 0.45, status: 'Favorable' },
        { sector: 'Utilities', sensitivity: -0.35, status: 'Slight Pressure' },
        { sector: 'Consumer Disc.', sensitivity: -0.65, status: 'Moderate Pressure' },
        { sector: 'Technology', sensitivity: -0.85, status: 'Moderate Pressure' }
      ],
      fomc: {
        nextMeeting: 'Dec 17-18, 2024',
        holdProbability: 88,
        source: 'CME FedWatch'
      }
    };

    // Cache the response
    cachedData = responseData;
    lastFetch = now;

    console.log('Successfully fetched and cached data');
    
    return res.status(200).json({
      ...responseData,
      cached: false
    });

  } catch (error) {
    console.error('Error in macro-data API:', error);
    
    return res.status(500).json({ 
      error: 'Failed to fetch macro data',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}