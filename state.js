// state.js - Global State for Lastgang Analyse App

var allDatasets = [];
var activeDatasetIds = [0]; // Active dataset indices (Priority 3 - Multi-Comparison)
var rawData = []; // References the first selected dataset for navigation bounds
var chartTimeline = null;
var chartDailyProfile = null;
var chartAgnesDuration = null;
var chartAgnesCost = null;
var currentAggregation = '1M'; // 15m, 1h, 1d, 1w, 1M
var globalDateRange = { start: null, end: null, validMin: null, validMax: null };
window.globalDateRange = globalDateRange;
var isDarkMode = true;
var isMinimapZooming = false;
var isProgrammaticZoom = false;
var currentZoom = 'max';
var updateTimeout = null;

// --- Caching & Control States ---
let cachedAggregations = {}; // Map of cacheKey -> aggregatedData (Priority 3 - Multi-Comparison)
let isManualAggregation = true;
let displayUnit = 'kw'; // Global display unit: 'kw' (Leistung) or 'kwh' (Arbeit)
let tempParsedDatasets = []; // Temp storage for imported datasets awaiting unit selection confirmation
