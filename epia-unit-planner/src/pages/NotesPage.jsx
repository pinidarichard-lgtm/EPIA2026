import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { GROUPES_MATIERES, TOUTES_MATIERES, COULEURS_GROUPES, getGroupeMatiere, PERIODES_D1, PERIODES_D2, getPeriodes } from '../lib/matieres'

export default function NotesPage() {
  const [eleves, setEleves] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [annee_pd, setAnneePd] = useState('D1')
  const [periode, setPeriode] = useState('T1')
  const [filterGroupe, setFilterGroupe] = useState('')
  const [filterMatiere, setFilterMatiere] = useState('')
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    if (annee_pd === 'D1') setPeriode('T1')
    else setPeriode('S1')
  }, [annee_pd])

  useEffect(() => { fetchAll() }, [annee_pd, periode])

  async function fetchAll() {
    setLoading(true)
    const [{ data: elevesData }, { data: notesData }] = await Promise.all([
      supabase.from('eleves').select('*').eq('annee_pd', annee_pd).eq('actif', true).order('nom'),
      supabase.from('notes').select('*').eq('annee_pd', annee_pd).eq('periode', periode).eq('annee_scolaire', '2025-2026')
    ])
    setEleves(elevesData || [])
    setNotes(notesData || [])
    setLoading(false)
  }

  function getNote(eleveId, matiere) {
    return notes.find(n => n.eleve_id === eleveId && n.matiere === matiere)
  }

  async function saveNote(eleveId, matiere, value, commentaire = '') {
    const key = `${eleveId}_${matiere}`
    setSaving(p => ({ ...p, [key]: true }))
    const existing = getNote(eleveId, matiere)
    const payload = {
      eleve_id: eleveId, matiere,
      groupe_matiere: getGroupeMatiere(matiere),
      annee_pd, periode,
      note: value === '' ? null : parseFloat(value),
      commentaire,
      annee_scolaire: '2025-2026'
    }
    let err
    if (existing) {
      ;({ error: err } = await supabase.from('notes').update(payload).eq('id', existing.id))
    } else {
      ;({ error: err } = await supabase.from('notes').insert([payload]))
    }
    if (err) setError(err.message)
    else {
      setSaved(p => ({ ...p, [key]: true }))
      setTimeout(() => setSaved(p => ({ ...p, [key]: false })), 2000)
      await fetchAll()
    }
    setSaving(p => ({ ...p, [key]: false }))
  }

  const periodes = getPeriodes(annee_pd)
  const matieresFiltrees = filterGroupe ? GROUPES_MATIERES[filterGroupe] : (filterMatiere ? [filterMatiere] : TOUTES_MATIERES)

  // Calculer la moyenne sur 7 d'un élève pour une matière
  function getMoyenne(eleveId) {
    const notesEleve = notes.filter(n => n.eleve_id === eleveId && n.note !== null)
    if (!notesEleve.length) return null
    return (notesEleve.reduce((s, n) => s + n.note, 0) / notesEleve.length).toFixed(1)
  }

  function getNoteColor(note) {
    if (note === null || note === undefined) return '#888'
    if (note >= 5) return '#1a6b4a'
    if (note >= 3) return '#856404'
    return '#991b1b'
  }

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Saisie des notes</h1>
        <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Notes sur 7 — D1 par trimestre, D2 par semestre</p>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.75rem 1rem', color: '#991b1b', marginBottom: '1rem', fontSize: 14 }}>{error}</div>}

      {/* Sélecteurs */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 10, padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>Promotion</label>
            <select value={annee_pd} onChange={e => setAnneePd(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}>
              <option value="D1">D1 — 2024-2025</option>
              <option value="D2">D2 — 2025-2026</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>Période</label>
            <select value={periode} onChange={e => setPeriode(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}>
              {periodes.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>Groupe de matières</label>
            <select value={filterGroupe} onChange={e => { setFilterGroupe(e.target.value); setFilterMatiere('') }}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}>
              <option value="">Tous les groupes</option>
              {Object.keys(GROUPES_MATIERES).map(g => <option key={g} value={g}>{g.split(' — ')[0]}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>Matière</label>
            <select value={filterMatiere} onChange={e => setFilterMatiere(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}>
              <option value="">Toutes les matières</option>
              {(filterGroupe ? GROUPES_MATIERES[filterGroupe] : TOUTES_MATIERES).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>Chargement...</div>}

      {!loading && eleves.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: 10, border: '1px solid #e8e6e0' }}>
          <p style={{ color: '#888' }}>Aucun élève dans la promotion {annee_pd}.</p>
          <a href="/eleves" style={{ color: '#1a3a5c', fontSize: 14, fontWeight: 600 }}>→ Ajouter des élèves</a>
        </div>
      )}

      {/* Tableau de notes par matière */}
      {!loading && eleves.length > 0 && matieresFiltrees.map(matiere => {
        const couleur = COULEURS_GROUPES[getGroupeMatiere(matiere)] || '#1a3a5c'
        return (
          <div key={matiere} style={{ marginBottom: '1.5rem', background: '#fff', borderRadius: 10, border: '1px solid #e8e6e0', overflow: 'hidden' }}>
            <div style={{ background: couleur, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{matiere}</span>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{getGroupeMatiere(matiere).split(' — ')[0]}</span>
            </div>

            {/* En-tête tableau */}
            <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 100px 160px', background: '#f8f7f4', padding: '8px 16px', fontSize: 12, fontWeight: 700, color: '#666', borderBottom: '1px solid #eee' }}>
              <span>N°</span><span>NOM</span><span>PRÉNOM</span><span style={{ textAlign: 'center' }}>NOTE /7</span><span>COMMENTAIRE</span>
            </div>

            {eleves.map((eleve, idx) => {
              const noteObj = getNote(eleve.id, matiere)
              const key = `${eleve.id}_${matiere}`
              const [noteVal, setNoteVal] = useState(noteObj?.note !== null && noteObj?.note !== undefined ? String(noteObj.note) : '')
              const [commentVal, setCommentVal] = useState(noteObj?.commentaire || '')

              return (
                <div key={eleve.id} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 100px 160px', padding: '8px 16px', background: idx % 2 === 0 ? '#fff' : '#f8f7f4', borderBottom: '1px solid #eee', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#888' }}>{idx + 1}</span>
                  <span style={{ fontWeight: 600 }}>{eleve.nom.toUpperCase()}</span>
                  <span>{eleve.prenom}</span>
                  <div style={{ textAlign: 'center' }}>
                    <input
                      type="number" min="0" max="7" step="0.5"
                      value={noteVal}
                      onChange={e => setNoteVal(e.target.value)}
                      onBlur={() => saveNote(eleve.id, matiere, noteVal, commentVal)}
                      placeholder="—"
                      style={{ width: 60, padding: '5px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 15, fontWeight: 700, textAlign: 'center', color: getNoteColor(parseFloat(noteVal)) }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={commentVal}
                      onChange={e => setCommentVal(e.target.value)}
                      onBlur={() => saveNote(eleve.id, matiere, noteVal, commentVal)}
                      placeholder="Commentaire..."
                      style={{ flex: 1, padding: '5px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 12 }}
                    />
                    {saving[key] && <span style={{ fontSize: 10, color: '#888' }}>💾</span>}
                    {saved[key] && <span style={{ fontSize: 10, color: '#1a6b4a' }}>✓</span>}
                  </div>
                </div>
              )
            })}

            {/* Ligne moyennes */}
            <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 100px 160px', padding: '8px 16px', background: couleur + '15', borderTop: `2px solid ${couleur}33` }}>
              <span></span>
              <span style={{ fontSize: 12, fontWeight: 700, color: couleur, gridColumn: '2/4' }}>Moyenne de la classe</span>
              <span style={{ textAlign: 'center', fontWeight: 700, color: couleur }}>
                {(() => {
                  const notesMatiere = notes.filter(n => n.matiere === matiere && n.note !== null)
                  if (!notesMatiere.length) return '—'
                  return (notesMatiere.reduce((s, n) => s + n.note, 0) / notesMatiere.length).toFixed(1)
                })()}
              </span>
              <span></span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
