import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { COULEURS_GROUPES, getGroupeMatiere, getPeriodes } from '../lib/matieres'

export default function SuiviElevePage() {
  const [eleves, setEleves] = useState([])
  const [selectedEleve, setSelectedEleve] = useState(null)
  const [notes, setNotes] = useState([])
  const [absences, setAbsences] = useState([])
  const [commentaires, setCommentaires] = useState([])
  const [loading, setLoading] = useState(false)
  const [annee_pd, setAnneePd] = useState('D1')
  const [showAddComment, setShowAddComment] = useState(false)
  const [commentForm, setCommentForm] = useState({ enseignant: '', matiere: '', periode: 'T1', commentaire: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchEleves() }, [annee_pd])

  async function fetchEleves() {
    const { data } = await supabase.from('eleves').select('*').eq('annee_pd', annee_pd).eq('actif', true).order('nom')
    setEleves(data || [])
    setSelectedEleve(null)
    setNotes([]); setAbsences([]); setCommentaires([])
  }

  async function fetchEleveData(eleve) {
    setSelectedEleve(eleve)
    setLoading(true)
    const [{ data: n }, { data: a }, { data: c }] = await Promise.all([
      supabase.from('notes').select('*').eq('eleve_id', eleve.id).order('periode'),
      supabase.from('absences').select('*').eq('eleve_id', eleve.id).order('date_absence', { ascending: false }),
      supabase.from('commentaires_eleves').select('*').eq('eleve_id', eleve.id).order('created_at', { ascending: false }),
    ])
    setNotes(n || []); setAbsences(a || []); setCommentaires(c || [])
    setLoading(false)
  }

  async function addCommentaire() {
    setSaving(true)
    const payload = { ...commentForm, eleve_id: selectedEleve.id, annee_pd, annee_scolaire: '2025-2026' }
    const { error } = await supabase.from('commentaires_eleves').insert([payload])
    if (!error) {
      setShowAddComment(false)
      setCommentForm({ enseignant: '', matiere: '', periode: annee_pd === 'D1' ? 'T1' : 'S1', commentaire: '' })
      fetchEleveData(selectedEleve)
    }
    setSaving(false)
  }

  const periodes = getPeriodes(annee_pd)

  // Stats absences par période
  function getStatsAbsences() {
    const stats = {}
    periodes.forEach(p => {
      const abs = absences.filter(a => a.periode === p.id)
      stats[p.id] = {
        label: p.label,
        total: abs.length,
        absences: abs.filter(a => a.statut === 'absent').length,
        retards: abs.filter(a => a.statut === 'retard').length,
        justifies: abs.filter(a => a.justifie).length,
      }
    })
    return stats
  }

  // Moyenne par période
  function getMoyennePeriode(periodeId) {
    const n = notes.filter(n => n.periode === periodeId && n.note !== null)
    if (!n.length) return null
    return (n.reduce((s, x) => s + x.note, 0) / n.length).toFixed(1)
  }

  function getNoteColor(note) {
    if (!note) return '#888'
    const v = parseFloat(note)
    if (v >= 5) return '#1a6b4a'
    if (v >= 3) return '#856404'
    return '#991b1b'
  }

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Suivi individuel des élèves</h1>
        <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Notes, absences et commentaires par élève</p>
      </div>

      {/* Sélection promotion */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        {[['D1', '#1a3a5c'], ['D2', '#1a6b4a']].map(([key, color]) => (
          <button key={key} onClick={() => setAnneePd(key)} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', background: annee_pd === key ? color : '#e8e6e0', color: annee_pd === key ? '#fff' : '#555', fontWeight: 700, fontSize: 15 }}>
            {key} — {key === 'D1' ? '2024-2025' : '2025-2026'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Liste élèves */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8e6e0', overflow: 'hidden' }}>
          <div style={{ background: '#1a3a5c', padding: '10px 14px', color: '#fff', fontWeight: 700, fontSize: 14 }}>
            👥 Élèves — {annee_pd} ({eleves.length})
          </div>
          {eleves.length === 0 && (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#888', fontSize: 14 }}>
              <p>Aucun élève dans {annee_pd}</p>
              <a href="/eleves" style={{ color: '#1a3a5c', fontWeight: 600 }}>→ Ajouter</a>
            </div>
          )}
          {eleves.map((eleve, idx) => (
            <div key={eleve.id} onClick={() => fetchEleveData(eleve)}
              style={{ padding: '10px 14px', cursor: 'pointer', background: selectedEleve?.id === eleve.id ? '#eef2f7' : idx % 2 === 0 ? '#fff' : '#f8f7f4', borderBottom: '1px solid #eee', borderLeft: selectedEleve?.id === eleve.id ? '3px solid #1a3a5c' : '3px solid transparent' }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: selectedEleve?.id === eleve.id ? '#1a3a5c' : '#1a1a1a' }}>{eleve.nom.toUpperCase()} {eleve.prenom}</div>
            </div>
          ))}
        </div>

        {/* Fiche élève */}
        <div>
          {!selectedEleve && (
            <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: 10, border: '1px solid #e8e6e0' }}>
              <div style={{ fontSize: 40, marginBottom: '1rem' }}>👆</div>
              <p style={{ color: '#888' }}>Sélectionnez un élève pour voir son suivi</p>
            </div>
          )}

          {selectedEleve && loading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>Chargement...</div>
          )}

          {selectedEleve && !loading && (
            <div>
              {/* En-tête élève */}
              <div style={{ background: '#1a3a5c', borderRadius: 10, padding: '1.25rem', color: '#fff', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: 22, fontWeight: 700 }}>{selectedEleve.nom.toUpperCase()} {selectedEleve.prenom}</h2>
                <p style={{ opacity: 0.75, fontSize: 14, marginTop: 4 }}>Promotion {annee_pd} — {annee_pd === 'D1' ? '2024-2025' : '2025-2026'}</p>
              </div>

              {/* Stats absences par période */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: '0.75rem', color: '#1a1a1a' }}>📅 Absences par période</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  {Object.entries(getStatsAbsences()).map(([periodeId, stats]) => (
                    <div key={periodeId} style={{ background: '#fff', borderRadius: 8, border: '1px solid #e8e6e0', padding: '1rem', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a3a5c', marginBottom: 8 }}>{stats.label}</div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: stats.absences > 5 ? '#991b1b' : stats.absences > 2 ? '#856404' : '#1a6b4a' }}>{stats.absences}</div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>absence{stats.absences > 1 ? 's' : ''}</div>
                      {stats.retards > 0 && <div style={{ fontSize: 12, color: '#856404', marginTop: 4 }}>{stats.retards} retard{stats.retards > 1 ? 's' : ''}</div>}
                      {stats.justifies > 0 && <div style={{ fontSize: 11, color: '#1a6b4a', marginTop: 2 }}>{stats.justifies} justifié{stats.justifies > 1 ? 's' : ''}</div>}
                      <div style={{ borderTop: '1px solid #eee', marginTop: 8, paddingTop: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: getNoteColor(getMoyennePeriode(periodeId)) }}>
                          Moy. {getMoyennePeriode(periodeId) ? `${getMoyennePeriode(periodeId)}/7` : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes par matière */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: '0.75rem', color: '#1a1a1a' }}>📊 Notes par matière</h3>
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8e6e0', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: `1fr ${periodes.map(() => '80px').join(' ')}`, background: '#1a3a5c', padding: '8px 14px', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                    <span>Matière</span>
                    {periodes.map(p => <span key={p.id} style={{ textAlign: 'center' }}>{p.id}</span>)}
                  </div>
                  {notes.length === 0 && <div style={{ padding: '1.5rem', textAlign: 'center', color: '#aaa', fontSize: 14 }}>Aucune note saisie.</div>}
                  {[...new Set(notes.map(n => n.matiere))].map((matiere, idx) => {
                    const couleur = COULEURS_GROUPES[getGroupeMatiere(matiere)] || '#1a3a5c'
                    return (
                      <div key={matiere} style={{ display: 'grid', gridTemplateColumns: `1fr ${periodes.map(() => '80px').join(' ')}`, padding: '8px 14px', background: idx % 2 === 0 ? '#fff' : '#f8f7f4', borderBottom: '1px solid #eee', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{matiere}</span>
                          <span style={{ marginLeft: 8, fontSize: 11, background: couleur + '20', color: couleur, padding: '1px 7px', borderRadius: 20 }}>{getGroupeMatiere(matiere).split(' — ')[0]}</span>
                        </div>
                        {periodes.map(p => {
                          const n = notes.find(x => x.matiere === matiere && x.periode === p.id)
                          return (
                            <div key={p.id} style={{ textAlign: 'center' }}>
                              <span style={{ fontWeight: 700, fontSize: 16, color: getNoteColor(n?.note) }}>
                                {n?.note !== null && n?.note !== undefined ? n.note : '—'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Commentaires */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>💬 Commentaires enseignants ({commentaires.length})</h3>
                  <button onClick={() => setShowAddComment(!showAddComment)} style={{ background: '#1a3a5c', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                    {showAddComment ? '✕' : '+ Ajouter'}
                  </button>
                </div>

                {showAddComment && (
                  <div style={{ background: '#f8f7f4', border: '1px solid #e8e6e0', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Enseignant</label>
                        <input value={commentForm.enseignant} onChange={e => setCommentForm(p => ({ ...p, enseignant: e.target.value }))} placeholder="Nom" style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: 5, fontSize: 13 }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Matière</label>
                        <input value={commentForm.matiere} onChange={e => setCommentForm(p => ({ ...p, matiere: e.target.value }))} placeholder="Matière" style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: 5, fontSize: 13 }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Période</label>
                        <select value={commentForm.periode} onChange={e => setCommentForm(p => ({ ...p, periode: e.target.value }))} style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: 5, fontSize: 13 }}>
                          {periodes.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <textarea value={commentForm.commentaire} onChange={e => setCommentForm(p => ({ ...p, commentaire: e.target.value }))} rows={3} placeholder="Commentaire sur l'élève..." style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 5, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', marginBottom: '10px' }} />
                    <button onClick={addCommentaire} disabled={saving || !commentForm.commentaire} style={{ background: '#1a3a5c', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: !commentForm.commentaire ? 0.5 : 1 }}>
                      {saving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                )}

                {commentaires.length === 0 && !showAddComment && (
                  <div style={{ padding: '1.5rem', background: '#fff', borderRadius: 8, border: '1px solid #e8e6e0', textAlign: 'center', color: '#aaa', fontSize: 14 }}>Aucun commentaire pour cet élève.</div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {commentaires.map(c => (
                    <div key={c.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 8, padding: '0.875rem', borderLeft: '3px solid #1a3a5c' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: '4px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {c.enseignant && <span style={{ fontSize: 12, fontWeight: 700, color: '#1a3a5c' }}>👤 {c.enseignant}</span>}
                          {c.matiere && <span style={{ fontSize: 12, background: '#eef2f7', color: '#1a3a5c', padding: '1px 8px', borderRadius: 20 }}>{c.matiere}</span>}
                          {c.periode && <span style={{ fontSize: 12, background: '#f0f4f8', color: '#555', padding: '1px 8px', borderRadius: 20 }}>{c.periode}</span>}
                        </div>
                        <span style={{ fontSize: 11, color: '#aaa' }}>{new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <p style={{ fontSize: 14, color: '#333', lineHeight: 1.6, margin: 0 }}>{c.commentaire}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
