import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useScrollIntoView } from '../useScrollIntoView.js'
import RunForm from './RunForm.jsx'

export default function RunsTab({ buildId }) {
  const [runs, setRuns] = useState([])
  const [profiles, setProfiles] = useState([])
  const [softwareList, setSoftwareList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(null) // { type: 'success' | 'warning', text }

  const [formOpen, setFormOpen] = useState(false)
  const [noteEdit, setNoteEdit] = useState(null) // notu düzenlenen test
  const [noteDraft, setNoteDraft] = useState('')
  // Aşağıdaki bir testin notunu düzenleyince form üstte kalıp kaybolmasın
  const noteFormRef = useScrollIntoView([noteEdit])

  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  // Testler ve profil adları (tabloda ve formda kullanılır) birlikte çekilir
  useEffect(() => {
    Promise.all([
      api.get(`/builds/${buildId}/runs/`),
      api.get(`/builds/${buildId}/profiles/`),
      api.get('/software/'),
    ])
      .then(([runList, profileList, softwareData]) => {
        setRuns(runList)
        setProfiles(profileList)
        setSoftwareList(softwareData)
        setError('')
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [buildId, reloadKey])

  function handleSaved(saved) {
    setFormOpen(false)
    setError('')
    if (saved.throttled) {
      setMessage({
        type: 'warning',
        text: `Test eklendi. Termal darboğaz tespit edildi: ${saved.throttle_reason}`,
      })
    } else {
      setMessage({ type: 'success', text: 'Test eklendi. Termal darboğaz yok.' })
    }
    reload()
  }

  function startNoteEdit(run) {
    setNoteEdit(run)
    setNoteDraft(run.notes)
    setMessage(null)
    setError('')
  }

  async function saveNote(e) {
    e.preventDefault()
    try {
      // Test sonucunda sadece not değiştirilebilir (PATCH)
      await api.patch(`/runs/${noteEdit.id}/`, { notes: noteDraft })
      setNoteEdit(null)
      setMessage({ type: 'success', text: 'Not güncellendi.' })
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(run) {
    if (!window.confirm(`"${run.software_name}" test sonucu silinsin mi?`)) return
    setError('')
    setMessage(null)
    try {
      await api.delete(`/runs/${run.id}/`)
      setMessage({ type: 'success', text: 'Test silindi.' })
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const profileName = (id) => profiles.find((p) => p.id === id)?.name ?? '-'
  const show = (v) => (v === null || v === undefined ? '-' : v)

  return (
    <div>
      <div className="page-header">
        <h3>Benchmark Testleri</h3>
        {!formOpen && (
          <button className="btn" onClick={() => setFormOpen(true)}>
            Yeni Test
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {message && <p className={message.type}>{message.text}</p>}

      {formOpen && (
        <RunForm
          buildId={buildId}
          profiles={profiles}
          softwareList={softwareList}
          onSaved={handleSaved}
          onCancel={() => setFormOpen(false)}
        />
      )}

      {noteEdit && (
        <form className="card" ref={noteFormRef} onSubmit={saveNote}>
          <h3>Notu Düzenle: {noteEdit.software_name}</h3>
          <p className="hint">Ölçüm değerleri sonradan değiştirilemez, sadece not güncellenebilir.</p>
          <textarea rows="2" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
          <div className="actions">
            <button type="submit">Kaydet</button>
            <button type="button" className="secondary" onClick={() => setNoteEdit(null)}>
              Vazgeç
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Yükleniyor...</p>
      ) : runs.length === 0 ? (
        <p>Bu sistem için henüz test sonucu yok.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Yazılım</th>
              <th>Skor</th>
              <th>CPU °C</th>
              <th>GPU °C</th>
              <th>Profil</th>
              <th>Durum</th>
              <th>Not</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className={r.throttled ? 'throttled-row' : ''}>
                <td>{new Date(r.created_at).toLocaleString('tr-TR')}</td>
                <td>{r.software_name}</td>
                <td>
                  {r.score} {r.score_unit}
                </td>
                <td>{show(r.max_cpu_temp_c)}</td>
                <td>{show(r.max_gpu_temp_c)}</td>
                <td>{r.profile ? profileName(r.profile) : '-'}</td>
                <td>
                  {r.throttled ? (
                    <>
                      <span className="badge bad">Throttle</span>
                      <div className="reason">{r.throttle_reason}</div>
                    </>
                  ) : (
                    <span className="badge ok">Normal</span>
                  )}
                </td>
                <td>{r.notes || '-'}</td>
                <td className="row-actions">
                  <button className="small" onClick={() => startNoteEdit(r)}>
                    Notu düzenle
                  </button>
                  <button className="small danger" onClick={() => handleDelete(r)}>
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
