import { useEffect, useState } from 'react';
import { Check, LogOut, MapPin, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { apiRequest, imageUrl } from '../lib/api.js';

const tabs = [
  { id: 'locations', label: 'Lokasi' },
  { id: 'incidents', label: 'Kejadian' },
  { id: 'reports', label: 'Laporan warga' }
];

function today() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function AdminPanel({ token, onLogin, onLogout, onPickCoordinate, pickedCoordinate }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState('locations');
  const [locations, setLocations] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [reports, setReports] = useState([]);
  const [locationForm, setLocationForm] = useState({ nama_lokasi: '', alamat: '', latitude: '', longitude: '' });
  const [incidentForm, setIncidentForm] = useState({
    id_lokasi: '', tanggal_kejadian: today(), kedalaman_cm: '', durasi_jam: '',
    kondisi_jalan: '', keterangan: ''
  });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [locationResult, incidentResult, reportResult] = await Promise.all([
      apiRequest('/admin/locations', { token }),
      apiRequest('/admin/incidents', { token }),
      apiRequest('/admin/reports', { token })
    ]);
    setLocations(locationResult.data);
    setIncidents(incidentResult.data);
    setReports(reportResult.data);
  }

  useEffect(() => {
    if (!token) return;
    refresh().catch((requestError) => setError(requestError.message));
  }, [token]);

  useEffect(() => {
    if (pickedCoordinate) {
      setLocationForm((current) => ({
        ...current,
        latitude: pickedCoordinate.lat.toFixed(7),
        longitude: pickedCoordinate.lng.toFixed(7)
      }));
      setNotice('Koordinat peta sudah dipilih.');
    }
  }, [pickedCoordinate]);

  async function login(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      onLogin(result.data.token);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function editLocation(location) {
    setEditing(location.id_lokasi);
    setTab('locations');
    setLocationForm({
      nama_lokasi: location.nama_lokasi,
      alamat: location.alamat || '',
      latitude: location.latitude,
      longitude: location.longitude
    });
  }

  function editIncident(incident) {
    setEditing(incident.id_kejadian);
    setTab('incidents');
    setIncidentForm({
      id_lokasi: incident.id_lokasi,
      tanggal_kejadian: incident.tanggal_kejadian,
      kedalaman_cm: incident.kedalaman_cm ?? '',
      durasi_jam: incident.durasi_jam ?? '',
      kondisi_jalan: incident.kondisi_jalan || '',
      keterangan: incident.keterangan || ''
    });
  }

  async function saveLocation(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const method = editing ? 'PUT' : 'POST';
      const suffix = editing ? `/${editing}` : '';
      await apiRequest(`/admin/locations${suffix}`, {
        token, method, body: JSON.stringify(locationForm)
      });
      setLocationForm({ nama_lokasi: '', alamat: '', latitude: '', longitude: '' });
      setEditing(null);
      setNotice('Data lokasi tersimpan.');
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function saveIncident(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const method = editing ? 'PUT' : 'POST';
      const suffix = editing ? `/${editing}` : '';
      await apiRequest(`/admin/incidents${suffix}`, {
        token, method, body: JSON.stringify(incidentForm)
      });
      setIncidentForm({
        id_lokasi: '', tanggal_kejadian: today(), kedalaman_cm: '', durasi_jam: '',
        kondisi_jalan: '', keterangan: ''
      });
      setEditing(null);
      setNotice('Data kejadian tersimpan.');
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function remove(path, label) {
    if (!window.confirm(`Hapus ${label}?`)) return;
    setError('');
    try {
      await apiRequest(path, { token, method: 'DELETE' });
      setNotice(`${label} berhasil dihapus.`);
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function setStatus(id, status) {
    setError('');
    try {
      await apiRequest(`/admin/reports/${id}/status`, {
        token, method: 'PATCH', body: JSON.stringify({ status })
      });
      setNotice('Status moderasi diperbarui.');
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (!token) {
    return (
      <section className="card mx-auto max-w-xl p-6 sm:p-8">
        <div className="mb-6 flex items-start gap-4">
          <span className="icon-tile"><ShieldCheck size={23} /></span>
          <div>
            <p className="eyebrow">Area pengelola</p>
            <h2 className="mt-1 text-2xl font-semibold text-ink">Login admin</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Masuk untuk mengelola titik, kejadian, dan laporan masyarakat.</p>
          </div>
        </div>
        {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <form onSubmit={login} className="space-y-4">
          <label className="field-label">Username<input value={username} onChange={(event) => setUsername(event.target.value)} required className="field-input" autoComplete="username" /></label>
          <label className="field-label">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="field-input" autoComplete="current-password" /></label>
          <button disabled={busy} className="button-primary w-full">{busy ? 'Memeriksa…' : 'Masuk dashboard'}</button>
        </form>
      </section>
    );
  }

  return (
    <section className="card p-5 sm:p-7">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Pengelolaan data</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">Dashboard admin</h2>
        </div>
        <button onClick={onLogout} className="button-secondary"><LogOut size={16} /> Keluar</button>
      </div>
      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-100 pb-4">
        {tabs.map((item) => (
          <button key={item.id} onClick={() => { setTab(item.id); setEditing(null); }} className={`tab-button ${tab === item.id ? 'tab-active' : ''}`}>
            {item.label}{item.id === 'reports' && <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800">{reports.filter((report) => report.status === 'pending').length}</span>}
          </button>
        ))}
      </div>

      {tab === 'locations' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(260px,0.8fr)_1.2fr]">
          <form onSubmit={saveLocation} className="space-y-3">
            <h3 className="section-title">{editing ? 'Edit lokasi' : 'Tambah lokasi'}</h3>
            <label className="field-label">Nama lokasi<input value={locationForm.nama_lokasi} onChange={(event) => setLocationForm({ ...locationForm, nama_lokasi: event.target.value })} required maxLength="100" className="field-input" /></label>
            <label className="field-label">Alamat<input value={locationForm.alamat} onChange={(event) => setLocationForm({ ...locationForm, alamat: event.target.value })} maxLength="255" className="field-input" /></label>
            <button type="button" onClick={onPickCoordinate} className="button-secondary w-full"><MapPin size={16} /> Pilih koordinat di peta</button>
            <div className="grid grid-cols-2 gap-3">
              <label className="field-label">Latitude<input type="number" step="any" min="-90" max="90" value={locationForm.latitude} onChange={(event) => setLocationForm({ ...locationForm, latitude: event.target.value })} required className="field-input" /></label>
              <label className="field-label">Longitude<input type="number" step="any" min="-180" max="180" value={locationForm.longitude} onChange={(event) => setLocationForm({ ...locationForm, longitude: event.target.value })} required className="field-input" /></label>
            </div>
            <button className="button-primary w-full">{editing ? 'Simpan perubahan' : <><Plus size={16} /> Tambah lokasi</>}</button>
          </form>
          <div className="space-y-2">
            <h3 className="section-title">Daftar titik <span className="ml-1 text-sm font-normal text-muted">({locations.length})</span></h3>
            {locations.map((location) => (
              <div key={location.id_lokasi} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                <div className="min-w-0"><p className="truncate font-semibold text-ink">{location.nama_lokasi}</p><p className="truncate text-xs text-muted">{location.alamat || `${location.latitude}, ${location.longitude}`}</p></div>
                <div className="flex shrink-0 gap-1">
                  <button aria-label="Edit lokasi" onClick={() => editLocation(location)} className="icon-button"><Pencil size={15} /></button>
                  <button aria-label="Hapus lokasi" onClick={() => remove(`/admin/locations/${location.id_lokasi}`, location.nama_lokasi)} className="icon-button text-red-600"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'incidents' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(260px,0.8fr)_1.2fr]">
          <form onSubmit={saveIncident} className="space-y-3">
            <h3 className="section-title">{editing ? 'Edit kejadian' : 'Tambah kejadian'}</h3>
            <label className="field-label">Lokasi<select value={incidentForm.id_lokasi} onChange={(event) => setIncidentForm({ ...incidentForm, id_lokasi: event.target.value })} required className="field-input"><option value="">Pilih lokasi</option>{locations.map((location) => <option key={location.id_lokasi} value={location.id_lokasi}>{location.nama_lokasi}</option>)}</select></label>
            <label className="field-label">Tanggal<input type="date" value={incidentForm.tanggal_kejadian} onChange={(event) => setIncidentForm({ ...incidentForm, tanggal_kejadian: event.target.value })} required className="field-input" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="field-label">Kedalaman (cm)<input type="number" min="0" step="0.1" value={incidentForm.kedalaman_cm} onChange={(event) => setIncidentForm({ ...incidentForm, kedalaman_cm: event.target.value })} className="field-input" /></label>
              <label className="field-label">Durasi (jam)<input type="number" min="0" step="0.1" value={incidentForm.durasi_jam} onChange={(event) => setIncidentForm({ ...incidentForm, durasi_jam: event.target.value })} className="field-input" /></label>
            </div>
            <label className="field-label">Kondisi jalan<input value={incidentForm.kondisi_jalan} onChange={(event) => setIncidentForm({ ...incidentForm, kondisi_jalan: event.target.value })} maxLength="100" className="field-input" /></label>
            <label className="field-label">Keterangan<textarea rows="2" value={incidentForm.keterangan} onChange={(event) => setIncidentForm({ ...incidentForm, keterangan: event.target.value })} maxLength="5000" className="field-input" /></label>
            <button className="button-primary w-full">{editing ? 'Simpan perubahan' : <><Plus size={16} /> Tambah kejadian</>}</button>
          </form>
          <div className="space-y-2">
            <h3 className="section-title">Riwayat kejadian ({incidents.length})</h3>
            {incidents.map((incident) => (
              <div key={incident.id_kejadian} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                <div className="min-w-0"><p className="truncate font-semibold text-ink">{incident.nama_lokasi}</p><p className="text-xs text-muted">{incident.tanggal_kejadian} · {incident.kedalaman_cm ?? '—'} cm · {incident.durasi_jam ?? '—'} jam</p></div>
                <div className="flex shrink-0 gap-1">
                  <button aria-label="Edit kejadian" onClick={() => editIncident(incident)} className="icon-button"><Pencil size={15} /></button>
                  <button aria-label="Hapus kejadian" onClick={() => remove(`/admin/incidents/${incident.id_kejadian}`, 'kejadian')} className="icon-button text-red-600"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-3">
          <h3 className="section-title">Laporan masuk ({reports.length})</h3>
          {reports.map((report) => (
            <article key={report.id_laporan} className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 sm:flex-row">
              {report.foto && <a href={imageUrl(report.foto)} target="_blank" rel="noreferrer" className="h-28 w-full shrink-0 overflow-hidden rounded-xl bg-canvas sm:w-36"><img src={imageUrl(report.foto)} alt="Bukti laporan" className="h-full w-full object-cover" /></a>}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-ink">{report.nama_lokasi}</h4><span className={`status-chip status-${report.status}`}>{report.status}</span></div>
                <p className="mt-1 text-sm text-muted">{report.tanggal_kejadian} · {report.kedalaman_cm ?? '—'} cm · {report.durasi_jam ?? '—'} jam · {report.kondisi_jalan || '—'}</p>
                <p className="mt-2 text-sm text-slate-600">{report.keterangan || 'Tanpa keterangan'} <span className="text-xs text-muted">— {report.sumber_laporan || 'Anonim'}</span></p>
              </div>
              <div className="flex shrink-0 flex-wrap items-start gap-2">
                <select aria-label="Status laporan" value={report.status} onChange={(event) => setStatus(report.id_laporan, event.target.value)} className="field-input min-w-32 py-2">
                  <option value="pending">Menunggu</option><option value="verified">Verifikasi</option><option value="rejected">Tolak</option>
                </select>
                <button aria-label="Hapus laporan" onClick={() => remove(`/admin/reports/${report.id_laporan}`, 'laporan')} className="icon-button text-red-600"><Trash2 size={16} /></button>
                {report.status === 'verified' && <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><Check size={17} /></span>}
              </div>
            </article>
          ))}
          {!reports.length && <p className="rounded-xl bg-canvas p-6 text-center text-sm text-muted">Belum ada laporan masuk.</p>}
        </div>
      )}
    </section>
  );
}
