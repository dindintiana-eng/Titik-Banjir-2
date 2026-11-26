import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownToLine, ArrowRight, BarChart3, CloudRain, Crosshair,
  Droplets, Map as MapIcon, MapPin, Menu, Search, ShieldCheck, Truck
} from 'lucide-react';
import AdminPanel from './components/AdminPanel.jsx';
import MapView from './components/MapView.jsx';
import ReportForm from './components/ReportForm.jsx';
import { API_BASE, apiRequest } from './lib/api.js';

const initialSummary = {
  total_kejadian: 0,
  lokasi_terdampak: 0,
  rata_rata_durasi_jam: null,
  kejadian_bahaya: 0,
  potensi_gangguan: 0
};

const riskStyles = {
  Aman: 'risk-safe',
  Waspada: 'risk-watch',
  Bahaya: 'risk-danger',
  'Belum diketahui': 'risk-unknown'
};

function StatCard({ icon: Icon, label, value, suffix, tone }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className={`stat-icon ${tone}`}><Icon size={20} /></span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
          {value}<span className="ml-1 text-sm font-medium text-muted">{suffix}</span>
        </p>
      </div>
    </div>
  );
}

function App() {
  const [locations, setLocations] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [summary, setSummary] = useState(initialSummary);
  const [hotspots, setHotspots] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({ search: '', risk: '', condition: '', minDepth: '' });
  const [showAdmin, setShowAdmin] = useState(false);
  const [token, setToken] = useState(() => sessionStorage.getItem('webgis-admin-token') || '');
  const [pickCoordinate, setPickCoordinate] = useState(false);
  const [pickedCoordinate, setPickedCoordinate] = useState(null);

  const loadPublicData = useCallback(async (nextFilters = filters) => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    Object.entries(nextFilters).forEach(([key, value]) => value && params.set(key, value));
    try {
      const [locationResult, summaryResult, hotspotResult, routeResult] = await Promise.all([
        apiRequest(`/locations${params.size ? `?${params}` : ''}`),
        apiRequest('/analytics/summary'),
        apiRequest('/analytics/hotspots'),
        apiRequest('/analytics/routes')
      ]);
      setLocations(locationResult.data);
      setSummary(summaryResult.data || initialSummary);
      setHotspots(hotspotResult.data);
      setRoutes(routeResult.data);
      if (!nextFilters.search && !nextFilters.risk && !nextFilters.condition && !nextFilters.minDepth) {
        setAllLocations(locationResult.data);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadPublicData();
  }, []);

  useEffect(() => {
    if (token) sessionStorage.setItem('webgis-admin-token', token);
    else sessionStorage.removeItem('webgis-admin-token');
  }, [token]);

  function search(event) {
    event.preventDefault();
    const next = { ...filters, search: searchText.trim() };
    setFilters(next);
    loadPublicData(next);
  }

  function updateFilter(key, value) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    loadPublicData(next);
  }

  const conditionOptions = useMemo(() => {
    const values = new Set(allLocations.map((item) => item.kondisi_jalan).filter(Boolean));
    ['Tergenang', 'Sulit dilalui', 'Tidak dapat dilalui', 'Sudah surut'].forEach((item) => values.add(item));
    return Array.from(values).sort();
  }, [allLocations]);

  function pickOnMap() {
    setShowAdmin(true);
    setPickCoordinate(true);
  }

  function onCoordinatePicked(coordinate) {
    setPickedCoordinate(coordinate);
    setPickCoordinate(false);
  }

  function logout() {
    setToken('');
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-slate-200/70 bg-white/80">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 sm:px-7 lg:px-10">
          <a href="#" className="flex items-center gap-3">
            <span className="brand-mark"><Droplets size={23} strokeWidth={2.2} /></span>
            <span><span className="block text-lg font-bold tracking-tight text-ink">RuangAir</span><span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Peta risiko & operasional</span></span>
          </a>
          <nav className="hidden items-center gap-7 md:flex">
            <a href="#peta" className="nav-link">Peta risiko</a>
            <a href="#analitik" className="nav-link">Analitik</a>
            <a href="#laporan" className="nav-link">Lapor genangan</a>
          </nav>
          <button onClick={() => setShowAdmin((current) => !current)} className="button-secondary !px-3 !py-2.5">
            <ShieldCheck size={16} /> <span className="hidden sm:inline">{showAdmin ? 'Tutup admin' : 'Admin'}</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 pb-14 pt-7 sm:px-7 lg:px-10">
        <section className="relative mb-7 overflow-hidden rounded-[26px] bg-ink px-6 py-7 text-white sm:px-9 sm:py-9">
          <div className="hero-orb hero-orb-one" /><div className="hero-orb hero-orb-two" />
          <div className="relative z-10 max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-emerald-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Balunijuk – Kampak
            </div>
            <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-[40px]">
              Kenali risiko banjir.<br className="hidden sm:block" /> Jaga operasional tetap bergerak.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/75 sm:text-base">
              Informasi titik genangan terverifikasi, panduan akses logistik, dan data untuk keputusan usaha yang lebih siap.
            </p>
            <a href="#peta" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-emerald-200">
              Jelajahi peta <ArrowRight size={16} />
            </a>
          </div>
          <div className="hero-stats relative z-10 mt-7 grid max-w-2xl grid-cols-3 gap-3 sm:absolute sm:bottom-8 sm:right-8 sm:mt-0 sm:w-[390px]">
            <div><p className="text-2xl font-semibold">{summary.total_kejadian || 0}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-emerald-100/65 sm:text-xs">Kejadian tercatat</p></div>
            <div><p className="text-2xl font-semibold">{summary.lokasi_terdampak || 0}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-emerald-100/65 sm:text-xs">Lokasi terdampak</p></div>
            <div><p className="text-2xl font-semibold">{summary.rata_rata_durasi_jam == null ? '—' : Number(summary.rata_rata_durasi_jam).toFixed(1)}<span className="ml-1 text-sm">jam</span></p><p className="mt-1 text-[10px] uppercase tracking-wider text-emerald-100/65 sm:text-xs">Rata-rata surut</p></div>
          </div>
        </section>

        {error && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <span>{error}. Pastikan backend dan MySQL sudah berjalan.</span>
            <button onClick={() => loadPublicData()} className="font-semibold underline">Coba lagi</button>
          </div>
        )}

        {showAdmin && (
          <div className="mb-7">
            <AdminPanel
              token={token}
              onLogin={setToken}
              onLogout={logout}
              onPickCoordinate={pickOnMap}
              pickedCoordinate={pickedCoordinate}
            />
          </div>
        )}

        <section id="peta" className="scroll-mt-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><p className="eyebrow">Pantau kawasan</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Peta risiko banjir</h2></div>
            <div className="flex flex-wrap gap-3 text-xs font-medium text-muted">
              {Object.entries(riskStyles).map(([label, style]) => <span key={label} className="inline-flex items-center gap-1.5"><i className={`legend-dot ${style}`} />{label}</span>)}
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-[minmax(275px,0.76fr)_minmax(0,1.8fr)]">
            <aside className="card p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="icon-tile"><Crosshair size={19} /></span>
                <div><h3 className="font-semibold text-ink">Temukan titik</h3><p className="text-xs text-muted">Saring informasi wilayah</p></div>
              </div>
              <form onSubmit={search} className="relative">
                <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Cari nama atau alamat…" className="field-input !pl-10" />
                <button aria-label="Cari lokasi" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-ink p-2 text-white hover:bg-emerald-900"><ArrowRight size={15} /></button>
              </form>
              <div className="mt-4 space-y-3">
                <label className="field-label">Tingkat risiko
                  <select value={filters.risk} onChange={(event) => updateFilter('risk', event.target.value)} className="field-input">
                    <option value="">Semua tingkat</option><option>Aman</option><option>Waspada</option><option>Bahaya</option><option>Belum diketahui</option>
                  </select>
                </label>
                <label className="field-label">Kondisi jalan
                  <select value={filters.condition} onChange={(event) => updateFilter('condition', event.target.value)} className="field-input">
                    <option value="">Semua kondisi</option>{conditionOptions.map((condition) => <option key={condition}>{condition}</option>)}
                  </select>
                </label>
                <label className="field-label">Kedalaman minimum
                  <select value={filters.minDepth} onChange={(event) => updateFilter('minDepth', event.target.value)} className="field-input">
                    <option value="">Semua kedalaman</option><option value="1">Di atas 0 cm</option><option value="15">15 cm atau lebih</option><option value="30">30 cm atau lebih</option>
                  </select>
                </label>
              </div>
              <div className="my-5 border-t border-slate-100" />
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Akses operasional</p>
              <div className="space-y-2 text-xs text-slate-600">
                <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-safe" /> Aman untuk motor kurir</p>
                <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-watch" /> Kendaraan tinggi, hindari motor</p>
                <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-danger" /> Hentikan pengiriman sementara</p>
              </div>
              <p className="mt-4 rounded-xl bg-canvas p-3 text-[11px] leading-relaxed text-muted">Klasifikasi risiko adalah panduan awal berdasarkan kedalaman dan durasi; selalu utamakan kondisi lapangan terkini.</p>
            </aside>

            <div className="card overflow-hidden p-2">
              <div className="map-toolbar flex items-center justify-between px-3 py-2.5 sm:px-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink"><MapIcon size={17} /> Balunijuk – Kampak</div>
                <span className="text-xs text-muted">{loading ? 'Memuat titik…' : `${locations.length} titik ditampilkan`}</span>
              </div>
              <MapView locations={locations} pickCoordinate={pickCoordinate} onCoordinatePicked={onCoordinatePicked} />
              {pickCoordinate && <p className="px-3 py-2 text-center text-xs font-medium text-ink">Pilih koordinat dengan klik pada peta.</p>}
            </div>
          </div>
        </section>

        <section id="analitik" className="scroll-mt-6 pt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><p className="eyebrow">Wawasan operasional</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Data untuk keputusan bisnis</h2></div>
            <div className="flex gap-2">
              <a className="button-secondary !px-3" href={`${API_BASE}/exports/incidents.csv`}><ArrowDownToLine size={15} /> <span>CSV</span></a>
              <a className="button-secondary !px-3" href={`${API_BASE}/exports/incidents.pdf`}><ArrowDownToLine size={15} /> <span>PDF</span></a>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Activity} label="Kejadian terverifikasi" value={summary.total_kejadian || 0} suffix="kejadian" tone="tone-green" />
            <StatCard icon={MapPin} label="Lokasi terdampak" value={summary.lokasi_terdampak || 0} suffix="titik" tone="tone-blue" />
            <StatCard icon={CloudRain} label="Kejadian risiko bahaya" value={summary.kejadian_bahaya || 0} suffix="kejadian" tone="tone-red" />
            <StatCard icon={BarChart3} label="Potensi gangguan akses" value={summary.potensi_gangguan || 0} suffix="kejadian" tone="tone-amber" />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="card p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">Prioritas pemantauan</p><h3 className="mt-1 font-semibold text-ink">Titik paling sering terdampak</h3></div><BarChart3 size={19} className="text-muted" /></div>
              <div className="space-y-3">
                {hotspots.length ? hotspots.slice(0, 5).map((item, index) => (
                  <div key={item.id_lokasi} className="flex items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-canvas text-xs font-semibold text-ink">{String(index + 1).padStart(2, '0')}</span>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{item.nama_lokasi}</p><p className="text-xs text-muted">{item.alamat || 'Alamat tidak tersedia'}</p></div>
                    <div className="text-right"><p className="text-sm font-semibold text-ink">{item.frekuensi_banjir}×</p><p className="text-[10px] text-muted">kejadian</p></div>
                  </div>
                )) : <p className="rounded-xl bg-canvas p-4 text-sm text-muted">Belum ada cukup data terverifikasi.</p>}
              </div>
              <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-muted">Frekuensi historis membantu pertimbangan lokasi usaha, gudang, atau kos; bukan jaminan kondisi mendatang.</p>
            </div>
            <div className="card p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">Kurir & distribusi</p><h3 className="mt-1 font-semibold text-ink">Panduan akses terbaru</h3></div><Truck size={19} className="text-muted" /></div>
              <div className="space-y-3">
                {routes.length ? routes.slice(0, 5).map((route) => (
                  <div key={route.id_lokasi} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{route.nama_lokasi}</p><p className="mt-0.5 text-xs text-muted">{route.kondisi_jalan || 'Kondisi tidak tersedia'} · {route.tanggal_kejadian || 'Tanggal tidak tersedia'}</p></div>
                    <span className={`risk-pill ${riskStyles[route.risiko] || riskStyles['Belum diketahui']}`}>{route.rekomendasi}</span>
                  </div>
                )) : <p className="rounded-xl bg-canvas p-4 text-sm text-muted">Belum ada kejadian terverifikasi untuk panduan akses.</p>}
              </div>
              <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-muted">Rekomendasi berbasis kondisi per titik, bukan rute navigasi. Konfirmasi keadaan jalan sebelum berangkat.</p>
            </div>
          </div>
        </section>

        <section id="laporan" className="scroll-mt-6 pt-10">
          <div className="mb-4"><p className="eyebrow">Kolaborasi warga</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Laporkan genangan</h2><p className="mt-1 text-sm text-muted">Bantu komunitas dan pelaku usaha mendapatkan informasi yang lebih cepat.</p></div>
          <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
            <div className="card p-5 sm:p-6">
              {allLocations.length ? <ReportForm locations={allLocations} /> : <p className="rounded-xl bg-canvas p-4 text-sm text-muted">Belum ada lokasi terdaftar untuk menerima laporan.</p>}
            </div>
            <div className="flex flex-col justify-between rounded-2xl bg-[#e8f0e9] p-6 sm:p-8">
              <div>
                <span className="icon-tile"><ShieldCheck size={20} /></span>
                <h3 className="mt-5 max-w-sm text-xl font-semibold text-ink">Data yang baik membantu keputusan yang lebih aman.</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">Sertakan kedalaman, durasi, kondisi jalan, dan foto yang jelas. Tim pengelola akan memeriksa laporan sebelum informasi dipublikasikan.</p>
              </div>
              <div className="mt-8 rounded-xl bg-white/70 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Menu size={16} /> Panduan klasifikasi</div>
                <div className="mt-3 space-y-2 text-xs text-slate-600">
                  <p><b className="text-safe">Aman:</b> &lt;15 cm dan &lt;1 jam</p>
                  <p><b className="text-watch">Waspada:</b> mulai 15 cm atau 1 jam</p>
                  <p><b className="text-danger">Bahaya:</b> mulai 30 cm atau 3 jam</p>
                </div>
                <p className="mt-3 text-[10px] leading-relaxed text-muted">Ambang awal untuk informasi umum, bukan pengganti arahan keselamatan pihak berwenang.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-200 bg-white px-4 py-5 text-center text-xs text-muted">RuangAir · Sistem Informasi Geospasial Balunijuk–Kampak · Utamakan informasi keselamatan resmi.</footer>
    </div>
  );
}

export default App;
