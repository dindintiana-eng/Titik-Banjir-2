import { useState } from 'react';
import { ArrowUpRight, Camera, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../lib/api.js';

function localDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function ReportForm({ locations }) {
  const [values, setValues] = useState({
    id_lokasi: '',
    tanggal_kejadian: localDate(),
    kedalaman_cm: '',
    durasi_jam: '',
    kondisi_jalan: 'Tergenang',
    sumber_laporan: '',
    keterangan: ''
  });
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function update(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const body = new FormData();
      Object.entries(values).forEach(([key, value]) => body.append(key, value));
      if (photo) body.append('foto', photo);
      const result = await apiRequest('/reports', { method: 'POST', body });
      setMessage(result.message);
      setValues((current) => ({
        ...current,
        kedalaman_cm: '',
        durasi_jam: '',
        sumber_laporan: '',
        keterangan: ''
      }));
      setPhoto(null);
      event.target.reset();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {message && (
        <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <label className="field-label">
        Titik lokasi
        <select name="id_lokasi" value={values.id_lokasi} onChange={update} required className="field-input">
          <option value="">Pilih lokasi terdaftar</option>
          {locations.map((location) => (
            <option key={location.id_lokasi} value={location.id_lokasi}>
              {location.nama_lokasi}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="field-label">
          Tanggal kejadian
          <input name="tanggal_kejadian" type="date" value={values.tanggal_kejadian} onChange={update} required className="field-input" />
        </label>
        <label className="field-label">
          Kedalaman (cm)
          <input name="kedalaman_cm" type="number" min="0" step="0.1" value={values.kedalaman_cm} onChange={update} required placeholder="Contoh: 20" className="field-input" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="field-label">
          Durasi (jam)
          <input name="durasi_jam" type="number" min="0" step="0.1" value={values.durasi_jam} onChange={update} required placeholder="Contoh: 2" className="field-input" />
        </label>
        <label className="field-label">
          Kondisi jalan
          <select name="kondisi_jalan" value={values.kondisi_jalan} onChange={update} className="field-input">
            <option>Tergenang</option>
            <option>Sulit dilalui</option>
            <option>Tidak dapat dilalui</option>
            <option>Sudah surut</option>
          </select>
        </label>
      </div>
      <label className="field-label">
        Nama / sumber laporan <span className="font-normal text-muted">(opsional)</span>
        <input name="sumber_laporan" value={values.sumber_laporan} onChange={update} maxLength="100" placeholder="Warga, kurir, mahasiswa..." className="field-input" />
      </label>
      <label className="field-label">
        Keterangan
        <textarea name="keterangan" value={values.keterangan} onChange={update} rows="2" maxLength="5000" placeholder="Ceritakan situasi di lokasi" className="field-input resize-y" />
      </label>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-600 transition hover:border-ink">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-canvas text-ink"><Camera size={19} /></span>
        <span className="min-w-0 flex-1 truncate">{photo ? photo.name : 'Tambahkan foto bukti (opsional)'}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => setPhoto(event.target.files?.[0] || null)}
        />
      </label>
      <p className="text-xs leading-relaxed text-muted">
        Laporan diperiksa admin dan tidak langsung ditampilkan pada peta publik.
      </p>
      <button disabled={busy || locations.length === 0} className="button-primary w-full">
        {busy ? 'Mengirim laporan…' : <>Kirim laporan <ArrowUpRight size={16} /></>}
      </button>
    </form>
  );
}
