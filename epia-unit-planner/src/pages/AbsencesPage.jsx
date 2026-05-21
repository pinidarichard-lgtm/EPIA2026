import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TOUTES_MATIERES, getPeriodes } from '../lib/matieres'

export default function AbsencesPage() {
  const [eleves, setEleves] = useState([])
  const [annee_pd, setAnneePd] = useState('D1')
  const [matiere, setMatiere] = useState('')
  const [dateAbsence, setDateAbsence] = useState(new Date().toISOString().split('T')[0])
  const [periode, setPeriode] = useState('T1')
  const [presences, setPresences] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('saisie')
  const [statsData, setStatsData] = useState([])
  const [loadingStats, setLoadingStats] = useState(false)

  useEffect(() => {
    if (annee_pd === 'D1') setPeriode('T1')
    else setPeriode('S1')
  }, [annee_pd])

  useEffect(() => { fetchEleves() }, [annee_pd])
  useEffect(() => { if (tab === 'stats') fetchStats() }, [tab, annee_pd])

  async function fetchEleves() {
    const { data } = await supabase.from('eleves').select('*').eq('annee_pd', annee_pd).eq('actif', true).order('nom')
    setEleves(data || [])
    const init = {}
    ;(data || []).forEach(e => { init[e.id] = 'P' })
    setPresences(init)
  }

  async function fetchStats() {
    setLoadingStats(true)
    const { data: elevesData } = await supabase.from('eleves').select('*').eq('annee_pd', annee_pd).eq('actif', true).order('nom')
    const { data: absData } = await supabase.from('absences').select('*').eq('annee_pd', annee_pd)
    const periodes = getPeriodes(annee_pd)
    const stats = (elevesData || []).map(eleve => {
      const abs = (absData || []).filter(a => a.eleve_id === eleve.id)
      const parPeriode = {}
      periodes.forEach(p => {
        const absPeriode = abs.filter(a => a.periode === p.id)
        parPeriode[p.id] = {
          absences: absPeriode.filter(a => a.statut === 'absent').length,
          retards: absPeriode.filter(a => a.statut === 'retard').length,
          justifies: absPeriode.filter(a => a.justifie).length,
        }
      })
      return { eleve, parPeriode, total: abs.filter(a => a.statut === 'absent').length }
    })
    setStatsData(stats)
    setLoadingStats(false)
  }

  function toggleStatut(eleveId) {
    setPresences(prev => {
      const current = prev[eleveId] || 'P'
      const next = current === 'P' ? 'A' : current === 'A' ? 'R' : 'P'
      return { ...prev, [eleveId]: next }
    })
  }

  async function saveAppel() {
    if (!matiere) { setError('Veuillez sélectionner une matière'); return }
    setSaving(true); setError(null)
    const absentsRetards = Object.entries(presences).filter(([_, s]) => s !== 'P')
    if (absentsRetards.length > 0) {
      const toInsert = absentsRetards.map(([eleveId, statut]) => ({
        eleve_id: eleveId, date_absence: dateAbsence,
        matiere, periode, annee_pd, statut: statut === 'A' ? 'absent' : 'retard',
        annee_scolaire: '2025-2026', justifie: false
      }))
      const { error: err } = await supabase.from('absences').insert(toInsert)
      if (err) { setError(err.message); setSaving(false); return }
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    const init = {}
    eleves.forEach(e => { init[e.id] = 'P' })
    setPresences(init)
    setSaving(false)
  }

  const STATUTS = { P: { label: 'Présent', color: '#1a6b4a', bg: '#e8f5e9' }, A: { label: 'Absent', color: '#991b1b', bg: '#fef2f2' }, R: { label: 'Retard', color: '#856404', bg: '#fff8e1' } }
  const periodes = getPeriodes(annee_pd)
  const absents = eleves.filter(e => presences[e.id] === 'A')
  const retards = eleves.filter(e => presences[e.id] === 'R')
  const presents = eleves.filter(e => !presences[e.id] || presences[e.id] === 'P')

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Absences & Appels</h1>
        <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>D1 par trimestre · D2 par semestre</p>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '1.5rem' }}>
        {[['saisie', '📋 Faire l\'appel'], ['stats', '📊 Bilan absences']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ padding: '9px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', background: tab === key ? '#1a3a5c' : '#e8e6e0', color: tab === key ? '#fff' : '#555', fontWeight: 600, fontSize: 14 }}>{label}</button>
        ))}
      </div>

      {tab === 'saisie' && (
        <>
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 10, padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>Promotion</label>
                <select value={annee_pd} onChange={e => setAnneePd(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}>
                  <option value="D1">D1 — 2024-2025</option>
                  <option value="D2">D2 — 2025-2026</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>Période</label>
                <select value={periode} onChange={e => setPeriode(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}>
                  {periodes.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>Date</label>
                <input type="date" value={dateAbsence} onChange={e => setDateAbsence(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>Matière *</label>
                <select value={matiere} onChange={e => setMatiere(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: `1px solid ${!matiere ? '#fca5a5' : '#ddd'}`, borderRadius: 6, fontSize: 14 }}>
                  <option value="">Sélectionner...</option>
                  {TOUTES_MATIERES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.75rem', color: '#991b1b', marginBottom: '1rem', fontSize: 14 }}>{error}</div>}

          {eleves.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {[{ label: 'Présents', count: presents.length, color: '#1a6b4a', bg: '#e8f5e9' },
                { label: 'Absents', count: absents.length, color: '#991b1b', bg: '#fef2f2' },
                { label: 'Retards', count: retards.length, color: '#856404', bg: '#fff8e1' }].map(s => (
                <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}33`, borderRadius: 8, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.count}</span>
                  <span style={{ fontSize: 13, color: s.color, fontWeight: 600 }}>{s.label}</span>
                </div>
              ))}
              <button onClick={() => { const init = {}; eleves.forEach(e => { init[e.id] = 'P' }); setPresences(init) }}
                style={{ padding: '8px 14px', background: '#f0f4f8', color: '#1a3a5c', border: '1px solid #c5d5e8', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                ✅ Tous présents
              </button>
            </div>
          )}

          {eleves.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: 10, border: '1px solid #e8e6e0' }}><p style={{ color: '#888' }}>Aucun élève dans {annee_pd}. <a href="/eleves" style={{ color: '#1a3a5c', fontWeight: 600 }}>Ajouter des élèves →</a></p></div>}

          {eleves.length > 0 && (
            <>
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8e6e0', overflow: 'hidden', marginBottom: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 140px', background: '#1a3a5c', color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700 }}>
                  <span>N°</span><span>NOM</span><span>PRÉNOM</span><span style={{ textAlign: 'center' }}>STATUT</span>
                </div>
                {eleves.map((eleve, idx) => {
                  const statut = presences[eleve.id] || 'P'
                  const s = STATUTS[statut]
                  return (
                    <div key={eleve.id} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 140px', padding: '10px 16px', background: statut === 'A' ? '#fff5f5' : statut === 'R' ? '#fffdf0' : idx % 2 === 0 ? '#fff' : '#f8f7f4', borderBottom: '1px solid #eee', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#888' }}>{idx + 1}</span>
                      <span style={{ fontWeight: 600 }}>{eleve.nom.toUpperCase()}</span>
                      <span>{eleve.prenom}</span>
                      <div style={{ textAlign: 'center' }}>
                        <button onClick={() => toggleStatut(eleve.id)} style={{ padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', background: s.bg, color: s.color, fontWeight: 700, fontSize: 13, minWidth: 90 }}>{s.label}</button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={saveAppel} disabled={saving} style={{ background: '#1a6b4a', color: '#fff', border: 'none', padding: '11px 24px', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                  {saving ? 'Enregistrement...' : '💾 Enregistrer l\'appel'}
                </button>
                {saved && <span style={{ color: '#1a6b4a', fontWeight: 600 }}>✓ Appel enregistré !</span>}
              </div>
            </>
          )}
        </>
      )}

      {tab === 'stats' && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
            {['D1','D2'].map(p => (
              <button key={p} onClick={() => setAnneePd(p)} style={{ padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', background: annee_pd === p ? '#1a3a5c' : '#e8e6e0', color: annee_pd === p ? '#fff' : '#555', fontWeight: 600 }}>{p}</button>
            ))}
          </div>

          {loadingStats && <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Chargement...</div>}

          {!loadingStats && statsData.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8e6e0', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `50px 1fr 1fr ${periodes.map(() => '110px').join(' ')} 80px`, background: '#1a3a5c', color: '#fff', padding: '10px 16px', fontSize: 12, fontWeight: 700 }}>
                <span>N°</span><span>NOM</span><span>PRÉNOM</span>
                {periodes.map(p => <span key={p.id} style={{ textAlign: 'center' }}>{p.label}</span>)}
                <span style={{ textAlign: 'center' }}>TOTAL</span>
              </div>
              {statsData.map((item, idx) => (
                <div key={item.eleve.id} style={{ display: 'grid', gridTemplateColumns: `50px 1fr 1fr ${periodes.map(() => '110px').join(' ')} 80px`, padding: '9px 16px', background: idx % 2 === 0 ? '#fff' : '#f8f7f4', borderBottom: '1px solid #eee', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#888' }}>{idx + 1}</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{item.eleve.nom.toUpperCase()}</span>
                  <span style={{ fontSize: 14 }}>{item.eleve.prenom}</span>
                  {periodes.map(p => {
                    const s = item.parPeriode[p.id]
                    return (
                      <div key={p.id} style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: s.absences > 5 ? '#991b1b' : s.absences > 2 ? '#856404' : '#1a6b4a' }}>{s.absences}</span>
                        <span style={{ fontSize: 11, color: '#888' }}> abs</span>
                        {s.retards > 0 && <div style={{ fontSize: 10, color: '#856404' }}>{s.retards} ret.</div>}
                      </div>
                    )
                  })}
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: item.total > 10 ? '#991b1b' : item.total > 5 ? '#856404' : '#333' }}>{item.total}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loadingStats && statsData.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: 10, border: '1px solid #e8e6e0' }}>
              <p style={{ color: '#888' }}>Aucune donnée d'absence pour {annee_pd}.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
