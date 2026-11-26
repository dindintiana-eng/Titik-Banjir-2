import { useMapEvents, MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { API_ORIGIN } from '../lib/api.js';

const riskColors = {
  Aman: '#26896e',
  Waspada: '#e49b31',
  Bahaya: '#d6604d',
  'Belum diketahui': '#8c9992'
};

function MapClick({ enabled, onClick }) {
  useMapEvents({
    click(event) {
      if (enabled) onClick(event.latlng);
    }
  });
  return null;
}

export default function MapView({ locations, pickCoordinate, onCoordinatePicked }) {
  return (
    <div className={`map-frame ${pickCoordinate ? 'map-picking' : ''}`}>
      <MapContainer center={[-2.075, 106.075]} zoom={12} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClick enabled={pickCoordinate} onClick={onCoordinatePicked} />
        {locations.map((location) => {
          const color = riskColors[location.risiko] || riskColors['Belum diketahui'];
          return (
            <CircleMarker
              key={location.id_lokasi}
              center={[Number(location.latitude), Number(location.longitude)]}
              radius={9}
              pathOptions={{ color: '#ffffff', weight: 3, fillColor: color, fillOpacity: 1 }}
            >
              <Popup>
                <div className="map-popup">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <strong>{location.nama_lokasi}</strong>
                    <span className="popup-risk" style={{ color }}>{location.risiko}</span>
                  </div>
                  <p>{location.alamat || 'Alamat belum tersedia'}</p>
                  {location.id_kejadian ? (
                    <>
                      <p className="mt-2">
                        {location.tanggal_kejadian} · {location.kedalaman_cm ?? '—'} cm ·{' '}
                        {location.durasi_jam ?? '—'} jam
                      </p>
                      <p>Kondisi jalan: {location.kondisi_jalan || 'Belum diketahui'}</p>
                      <p className="mt-1 font-semibold">{location.rekomendasi_akses}</p>
                      {location.foto && (
                        <img
                          src={`${API_ORIGIN}${location.foto}`}
                          alt={`Bukti genangan di ${location.nama_lokasi}`}
                          className="mt-2 max-h-36 w-full rounded-lg object-cover"
                        />
                      )}
                    </>
                  ) : (
                    <p className="mt-2 text-slate-500">Belum ada kejadian terverifikasi.</p>
                  )}
                  {location.keterangan_laporan && <p className="mt-2">{location.keterangan_laporan}</p>}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      {pickCoordinate && (
        <div className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white shadow-lg">
          Klik peta untuk memilih titik koordinat
        </div>
      )}
    </div>
  );
}
