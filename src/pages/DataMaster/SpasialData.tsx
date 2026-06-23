import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap, useMapEvents, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import PageMeta from '../../components/common/PageMeta';
import { mandalaService, MandalaSchool } from '../../services/mandalaService';
import Select from '../../components/form/Select';
import Badge from '../../components/ui/badge/Badge';

// Fix Leaflet's default icon issue with Webpack/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons dynamically depending on the school type
const createCustomIcon = (bentukClass: string) => {
  return new L.DivIcon({
    html: `
      <div class="custom-pin ${bentukClass}">
        <div class="pin-pulse"></div>
        <svg class="pin-svg" viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const pinIcons = {
  sma: createCustomIcon('pin-sma'),
  smk: createCustomIcon('pin-smk'),
  slb: createCustomIcon('pin-slb'),
  others: createCustomIcon('pin-others'),
};

const getSchoolIcon = (school: MandalaSchool) => {
  const bentuk = (school.bentuk_pendidikan_id_str || school.bentuk_pendidikan_is_str || '').toLowerCase();
  if (bentuk.includes('sma')) return pinIcons.sma;
  if (bentuk.includes('smk')) return pinIcons.smk;
  if (bentuk.includes('slb')) return pinIcons.slb;
  return pinIcons.others;
};

// Haversine formula for distance calculation between two coords in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateTotalDistance(coords: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += calculateDistance(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
  }
  return total;
}

function DistanceMeasurer({
  active,
  points,
  setPoints,
}: {
  active: boolean;
  points: [number, number][];
  setPoints: React.Dispatch<React.SetStateAction<[number, number][]>>;
}) {
  useMapEvents({
    click(e) {
      if (!active) return;
      setPoints((prev) => [...prev, [e.latlng.lat, e.latlng.lng]]);
    },
  });

  if (!active || points.length === 0) return null;

  return (
    <>
      <Polyline positions={points} color="#ef4444" weight={3} dashArray="5, 10" />
      {points.map((p, idx) => {
        const totalDist = calculateTotalDistance(points.slice(0, idx + 1));
        return (
          <CircleMarker
            key={idx}
            center={p}
            radius={6}
            pathOptions={{ fillColor: '#ef4444', color: '#ffffff', weight: 2, fillOpacity: 1 }}
          >
            <Tooltip permanent direction="top" offset={[0, -5]} className="font-semibold text-xs rounded shadow-md border-gray-200">
              <span>
                {idx === 0 ? 'Mulai' : `${totalDist.toFixed(2)} km`}
              </span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}

// Component to dynamically re-center map
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

export default function SpasialData() {
  const [schools, setSchools] = useState<MandalaSchool[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [kabKotaFilter, setKabKotaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jenjangFilter, setJenjangFilter] = useState("all");

  // Options
  const [kabKotaOptions, setKabKotaOptions] = useState([{ value: "all", label: "Semua Wilayah" }]);
  const [statusOptions, setStatusOptions] = useState([{ value: "all", label: "Semua Status" }]);
  const [jenjangOptions, setJenjangOptions] = useState([{ value: "all", label: "Semua Jenjang" }]);

  // Map state
  const [mapCenter, setMapCenter] = useState<[number, number]>([-6.9204, 107.6046]); // Default West Java
  const [mapZoom, setMapZoom] = useState(8);

  // Map settings and overlay toggles
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  
  // Distance measurement tool
  const [isMeasureActive, setIsMeasureActive] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);

  // Search feature
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MandalaSchool[]>([]);
  const [activePopupSchool, setActivePopupSchool] = useState<MandalaSchool | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
    } else {
      const q = searchQuery.toLowerCase();
      const results = schools.filter(s => 
        (s.nama && s.nama.toLowerCase().includes(q)) || 
        (s.npsn && s.npsn.toLowerCase().includes(q))
      );
      setSearchResults(results.slice(0, 5));
    }
  }, [searchQuery, schools]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await mandalaService.getSchools();
      
      let fetchedSchools: MandalaSchool[] = [];
      if (response && (response.status === 'success' || response.success === true)) {
        fetchedSchools = response.data || [];
      } else if (Array.isArray(response)) {
        fetchedSchools = response;
      }

      // Filter only schools that have valid lintang & bujur
      const validGeoSchools = fetchedSchools.filter(s => 
        s.lintang && s.bujur && 
        !isNaN(parseFloat(s.lintang.toString())) && 
        !isNaN(parseFloat(s.bujur.toString()))
      );

      setSchools(validGeoSchools);

      if (validGeoSchools.length > 0) {
        // Auto center map to the first valid school
        const firstSchool = validGeoSchools[0];
        setMapCenter([parseFloat(firstSchool.lintang as string), parseFloat(firstSchool.bujur as string)]);
        setMapZoom(11);

        // Extract unique filters
        const uniqueKab = [...new Set(validGeoSchools.map(s => s.kabupaten_kota || s.kabupate_kota))].filter(Boolean);
        setKabKotaOptions([
          { value: "all", label: "Semua Wilayah" },
          ...uniqueKab.map(val => ({ value: val as string, label: val as string }))
        ]);

        const uniqueStatus = [...new Set(validGeoSchools.map(s => s.status_sekolah))].filter(Boolean);
        setStatusOptions([
          { value: "all", label: "Semua Status" },
          ...uniqueStatus.map(val => ({ value: val as string, label: val as string }))
        ]);

        const uniqueJenjang = [...new Set(validGeoSchools.map(s => s.bentuk_pendidikan_id_str || s.bentuk_pendidikan_is_str))].filter(Boolean);
        setJenjangOptions([
          { value: "all", label: "Semua Jenjang" },
          ...uniqueJenjang.map(val => ({ value: val as string, label: val as string }))
        ]);
      }
    } catch (err) {
      console.error('Gagal mengambil data spasial sekolah:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSearchSchool = (school: MandalaSchool) => {
    const lat = parseFloat(school.lintang as string);
    const lng = parseFloat(school.bujur as string);
    if (!isNaN(lat) && !isNaN(lng)) {
      setMapCenter([lat, lng]);
      setMapZoom(16);
      setActivePopupSchool(school);
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  // Apply Filters
  const filteredSchools = schools.filter(s => {
    let match = true;
    if (kabKotaFilter !== "all" && (s.kabupaten_kota || s.kabupate_kota) !== kabKotaFilter) match = false;
    if (statusFilter !== "all" && s.status_sekolah !== statusFilter) match = false;
    if (jenjangFilter !== "all" && (s.bentuk_pendidikan_id_str || s.bentuk_pendidikan_is_str) !== jenjangFilter) match = false;
    return match;
  });

  return (
    <>
      <PageMeta
        title="Data Spasial Satuan Pendidikan | SIMAK Admin Panel"
        description="Visualisasi peta dan koordinat satuan pendidikan Mandala"
      />
      <div className="space-y-6 flex flex-col h-[calc(100vh-100px)]">
        {/* Header Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print shrink-0">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Data Spasial Satuan Pendidikan
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Pemetaan titik lokasi seluruh sekolah yang terhubung dengan pusat data Mandala. Anda dapat mengubah tampilan antara Peta Satelit beresolusi tinggi dan Peta Jalan di ikon sudut kanan atas peta.
          </p>
        </div>

        {/* Map Container Wrapper */}
        <div className={`rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm dark:border-gray-800 relative z-0 flex flex-col ${isFullscreen ? 'map-fullscreen-wrapper p-4 z-[99999]' : 'flex-1'}`}>
          {loading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
               <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent mb-3"></div>
               <p className="font-medium text-gray-600 dark:text-gray-300">Memuat Peta Spasial...</p>
            </div>
          )}

          {/* Floating Search Bar */}
          <div className="absolute top-3 left-14 z-[2000] w-72">
            <div className="relative">
              <div className="flex items-center bg-white dark:bg-gray-950 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 px-3 py-2">
                <svg className="h-5 w-5 text-gray-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Cari sekolah atau NPSN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:ring-0 focus:border-transparent p-0"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                  {searchResults.map((school) => (
                    <button
                      key={school.sekolah_id}
                      onClick={() => handleSelectSearchSchool(school)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 border-b border-gray-100 dark:border-gray-800/50 last:border-b-0 transition flex flex-col"
                    >
                      <span className="font-semibold text-sm text-gray-800 dark:text-white/90 line-clamp-1">{school.nama}</span>
                      <span className="text-xs text-gray-400 mt-0.5">NPSN: {school.npsn} • {school.bentuk_pendidikan_id_str || "Jenjang"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Measurement Tool Overlay */}
          {isMeasureActive && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[2000] bg-white dark:bg-gray-900 px-4 py-2 rounded-full shadow-xl border border-red-200 dark:border-red-900/50 flex items-center gap-3">
              <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Mode Ukur Jarak: <strong className="text-red-500">{calculateTotalDistance(measurePoints).toFixed(2)} km</strong> ({measurePoints.length} titik)
              </span>
              <button 
                onClick={() => setMeasurePoints([])}
                className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
              >
                Reset
              </button>
              <button 
                onClick={() => {
                  setIsMeasureActive(false);
                  setMeasurePoints([]);
                }}
                className="text-xs px-2 py-1 rounded bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/30 text-red-600 transition"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Custom Map Toolbar */}
          <div className="absolute top-24 right-3 z-[2000] flex flex-col gap-2 no-print">
            {/* Filter Toggle */}
            <button
              onClick={() => {
                setIsFilterOpen(!isFilterOpen);
                setIsLegendOpen(false);
              }}
              title="Filter Data Spasial"
              className={`p-2.5 rounded-xl shadow-lg border transition ${isFilterOpen ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5'}`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 8.293A1 1 0 013 7.586V4z" />
              </svg>
            </button>

            {/* Legend Toggle */}
            <button
              onClick={() => {
                setIsLegendOpen(!isLegendOpen);
                setIsFilterOpen(false);
              }}
              title="Tampilkan Legenda"
              className={`p-2.5 rounded-xl shadow-lg border transition ${isLegendOpen ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5'}`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>

            {/* Distance Measure Toggle */}
            <button
              onClick={() => {
                setIsMeasureActive(!isMeasureActive);
                if (!isMeasureActive) setMeasurePoints([]);
              }}
              title="Ukur Jarak"
              className={`p-2.5 rounded-xl shadow-lg border transition ${isMeasureActive ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5'}`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title="Layar Penuh"
              className="p-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl shadow-lg transition dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
            >
              {isFullscreen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
              )}
            </button>
          </div>

          {/* Floating Filter Panel Overlay */}
          {isFilterOpen && (
            <div className="absolute top-24 right-16 z-[2000] w-64 bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col gap-3">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">Filter Titik Peta</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Wilayah / Kabupaten</label>
                  <Select
                    options={kabKotaOptions}
                    defaultValue={kabKotaFilter}
                    onChange={(value) => {
                      setKabKotaFilter(value);
                      const regionSchools = schools.filter(s => (s.kabupaten_kota || s.kabupate_kota) === value);
                      if (regionSchools.length > 0) {
                        setMapCenter([parseFloat(regionSchools[0].lintang as string), parseFloat(regionSchools[0].bujur as string)]);
                        setMapZoom(12);
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Status Sekolah</label>
                  <Select
                    options={statusOptions}
                    defaultValue={statusFilter}
                    onChange={(value) => setStatusFilter(value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Jenjang Pendidikan</label>
                  <Select
                    options={jenjangOptions}
                    defaultValue={jenjangFilter}
                    onChange={(value) => setJenjangFilter(value)}
                  />
                </div>
              </div>
              <div className="text-center pt-2 border-t border-gray-100 dark:border-gray-800">
                <Badge color="info" size="sm">Menampilkan {filteredSchools.length} Sekolah</Badge>
              </div>
            </div>
          )}

          {/* Floating Legend Overlay */}
          {isLegendOpen && (
            <div className="absolute bottom-3 left-3 z-[2000] bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 w-44">
              <h4 className="text-xs font-bold text-gray-800 dark:text-white/90 uppercase tracking-wide mb-2.5">Legenda Satuan Pendidikan</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm font-bold text-[8px]"></span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">SMA (Biru)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm font-bold text-[8px]"></span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">SMK (Merah)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-purple-500 text-white shadow-sm font-bold text-[8px]"></span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">SLB (Ungu)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm font-bold text-[8px]"></span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Lainnya (Hijau)</span>
                </div>
              </div>
            </div>
          )}
          
          <MapContainer 
             center={mapCenter} 
             zoom={mapZoom} 
             style={{ height: '100%', width: '100%', zIndex: 1 }}
             scrollWheelZoom={true}
             maxZoom={22}
          >
            <MapUpdater center={mapCenter} zoom={mapZoom} />
            
            <DistanceMeasurer active={isMeasureActive} points={measurePoints} setPoints={setMeasurePoints} />
            
            <LayersControl position="topright">
              {/* Google Maps Hybrid - Checked by default as it is rich & sharp at deep zoom */}
              <LayersControl.BaseLayer checked name="🌐 Google Maps - Satelit (Hybrid)">
                <TileLayer
                  attribution='&copy; Google Maps'
                  url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                  maxNativeZoom={20}
                  maxZoom={22}
                />
              </LayersControl.BaseLayer>

              {/* Google Maps Satellite */}
              <LayersControl.BaseLayer name="🛰️ Google Maps - Satelit (Murni)">
                <TileLayer
                  attribution='&copy; Google Maps'
                  url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                  maxNativeZoom={20}
                  maxZoom={22}
                />
              </LayersControl.BaseLayer>

              {/* Google Maps Roadmap */}
              <LayersControl.BaseLayer name="🛣️ Google Maps - Peta Jalan">
                <TileLayer
                  attribution='&copy; Google Maps'
                  url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                  maxNativeZoom={20}
                  maxZoom={22}
                />
              </LayersControl.BaseLayer>

              {/* Google Maps Terrain */}
              <LayersControl.BaseLayer name="⛰️ Google Maps - Medan (Terrain)">
                <TileLayer
                  attribution='&copy; Google Maps'
                  url="https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}"
                  maxNativeZoom={20}
                  maxZoom={22}
                />
              </LayersControl.BaseLayer>

              {/* Esri World Imagery */}
              <LayersControl.BaseLayer name="🌌 Esri World Imagery">
                <TileLayer
                  attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxNativeZoom={18}
                  maxZoom={21}
                />
              </LayersControl.BaseLayer>

              {/* OpenStreetMap Standard */}
              <LayersControl.BaseLayer name="🧭 OpenStreetMap (OSM)">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            {/* Controlled standalone popup for search selection */}
            {activePopupSchool && (
              <Popup 
                position={[parseFloat(activePopupSchool.lintang as string), parseFloat(activePopupSchool.bujur as string)]}
                eventHandlers={{ remove: () => setActivePopupSchool(null) }}
              >
                <div className="p-1 text-gray-800">
                  <h4 className="font-bold text-sm mb-1 text-brand-600">{activePopupSchool.nama}</h4>
                  <p className="text-xs text-gray-500 font-mono mb-3">NPSN: {activePopupSchool.npsn}</p>
                  
                  <div className="flex gap-2 mb-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${activePopupSchool.status_sekolah === 'Negeri' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                      {activePopupSchool.status_sekolah || "Status"}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600">
                      {activePopupSchool.bentuk_pendidikan_id_str || activePopupSchool.bentuk_pendidikan_is_str || "Jenjang"}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 mb-3 border-t border-gray-100 pt-3">
                    <p className="mb-1.5"><span className="text-gray-400 block mb-0.5 text-[10px] uppercase">Alamat</span> {activePopupSchool.alamat || activePopupSchool.desa_kelurahan || "Tidak tersedia"}</p>
                    <p><span className="text-gray-400 block mb-0.5 text-[10px] uppercase">Wilayah</span> {activePopupSchool.kecamatan}, {activePopupSchool.kabupaten_kota || activePopupSchool.kabupate_kota}</p>
                  </div>

                  <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-2 text-gray-700 bg-gray-50 -mx-1 px-2 -mb-1 pb-1 rounded-b-lg">
                    <div className="flex flex-col">
                       <span className="text-[10px] text-gray-400">Siswa</span>
                       <span className="font-bold">{activePopupSchool.total_siswa || 0}</span>
                    </div>
                    <div className="w-px h-6 bg-gray-200"></div>
                    <div className="flex flex-col text-right">
                       <span className="text-[10px] text-gray-400">Guru & Tendik</span>
                       <span className="font-bold">{activePopupSchool.total_gtk || 0}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            )}

            {filteredSchools.map((school) => {
              const lat = parseFloat(school.lintang as string);
              const lng = parseFloat(school.bujur as string);
              
              if (isNaN(lat) || isNaN(lng)) return null;

              return (
                <Marker key={school.sekolah_id} position={[lat, lng]} icon={getSchoolIcon(school)}>
                  <Popup className="rounded-xl shadow-md min-w-[220px]">
                    <div className="p-1 text-gray-800">
                      <h4 className="font-bold text-sm mb-1 text-brand-600">{school.nama}</h4>
                      <p className="text-xs text-gray-500 font-mono mb-3">NPSN: {school.npsn}</p>
                      
                      <div className="flex gap-2 mb-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${school.status_sekolah === 'Negeri' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                          {school.status_sekolah || "Status"}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600">
                          {school.bentuk_pendidikan_id_str || school.bentuk_pendidikan_is_str || "Jenjang"}
                        </span>
                      </div>

                      <div className="text-xs text-gray-600 mb-3 border-t border-gray-100 pt-3">
                        <p className="mb-1.5"><span className="text-gray-400 block mb-0.5 text-[10px] uppercase">Alamat</span> {school.alamat || school.desa_kelurahan || "Tidak tersedia"}</p>
                        <p><span className="text-gray-400 block mb-0.5 text-[10px] uppercase">Wilayah</span> {school.kecamatan}, {school.kabupaten_kota || school.kabupate_kota}</p>
                      </div>

                      <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-2 text-gray-700 bg-gray-50 -mx-1 px-2 -mb-1 pb-1 rounded-b-lg">
                        <div className="flex flex-col">
                           <span className="text-[10px] text-gray-400">Siswa</span>
                           <span className="font-bold">{school.total_siswa || 0}</span>
                        </div>
                        <div className="w-px h-6 bg-gray-200"></div>
                        <div className="flex flex-col text-right">
                           <span className="text-[10px] text-gray-400">Guru & Tendik</span>
                           <span className="font-bold">{school.total_gtk || 0}</span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </>
  );
}
