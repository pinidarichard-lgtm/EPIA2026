import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { GROUPES_MATIERES, TOUTES_MATIERES, COULEURS_GROUPES, getGroupeMatiere } from '../lib/matieres'

const INITIAL = {
  date_cours: new Date().toISOString().split('T')[0],
  matiere: '', groupe_matiere: '', enseignant: '',
  annee_pd: 'D1', niveau: '',
  contenu: '', devoirs: '', observations: '',
  annee_scolaire: '2025-2026'
}

export default function CahierPage() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [form, setForm] = useState(INITIAL)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [filterGroupe, setFilterGroupe] = useState('')
  const [filterMatiere, setFilterMatiere] = useState('')
  const [filterPromo, setFilterPromo] = useState('')
  const [viewMode, setViewMode] = useState('liste') // 'liste' ou 'groupes'

  useEffect(() => { fetchEntries() }, [])

  async function fetchEntries() {
    setLoading(true)
    const { data, error } = await supabase.from('cahier_textes').select('*').order('date_cours', { ascending: false })
    if (!error) setEntries(data || [])
    else setError(error.message)
    setLoading(false)
  }

  const set = f => e => {
    const val = e.target.value
    if (f === 'matiere') {
      setForm(p => ({ ...p, matiere: val, groupe_matiere: getGroupeMatiere(val) }))
    } else {
      setForm(p => ({ ...p, [f]: val }))
    }
  }

  async function saveEntry() {
    if (!form.matiere || !form.date_cours) { setError('Date et matière obligatoires'); return }
    setSaving(true); setError(null)
    let err
    if (editEntry) {
      ;({ error: err } = await supabase.from('cahier_textes').update(form).eq('id', editEntry.id))
    } else {
      ;({ error: err } = await supabase.from('cahier_textes').insert([form]))
    }
    if (err) setError(err.message)
    else {
      setSaved(true); setTimeout(() => setSaved(false), 3000)
      setShowForm(false); setEditEntry(null); setForm(INITIAL)
      fetchEntries()
    }
    setSaving(false)
  }

  async function deleteEntry(id) {
    if (!confirm('Supprimer cette entrée ?')) return
    await supabase.from('cahier_textes').delete().eq('id', id)
    fetchEntries()
  }

  function openEdit(e) {
    setEditEntry(e)
    setForm({ date_cours: e.date_cours, matiere: e.matiere, groupe_matiere: e.groupe_matiere || getGroupeMatiere(e.matiere), enseignant: e.enseignant || '', annee_pd: e.annee_pd || 'D1', niveau: e.niveau || '', contenu: e.contenu || '', devoirs: e.devoirs || '', observations: e.observations || '', annee_scolaire: e.annee_scolaire || '2025-2026' })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filtered = entries.filter(e => {
    const matchGroupe = !filterGroupe || (e.groupe_matiere || getGroupeMatiere(e.matiere)) === filterGroupe
    const matchMatiere = !filterMatiere || e.matiere === filterMatiere
    const matchPromo = !filterPromo || (e.annee_pd || '').includes(filterPromo)
    return matchGroupe && matchMatiere && matchPromo
  })

  // Grouper les entrées par groupe de matières
  const entriesParGroupe = {}
  filtered.forEach(e => {
    const g = e.groupe_matiere || getGroupeMatiere(e.matiere)
    if (!entriesParGroupe[g]) entriesParGroupe[g] = []
    entriesParGroupe[g].push(e)
  })

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, fontFamily: 'inherit' }

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Cahier de textes</h1>
          <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>{entries.length} entrée{entries.length > 1 ? 's' : ''} — D1 et D2</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditEntry(null); setForm(INITIAL) }}
          style={{ background: '#1a3a5c', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          {showForm ? '✕ Fermer' : '+ Nouvelle entrée'}
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 10, padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: '1rem', color: '#1a3a5c' }}>
            {editEntry ? 'Modifier l\'entrée' : 'Nouvelle entrée du cahier'}
          </h3>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '0.75rem', color: '#991b1b', marginBottom: '1rem', fontSize: 13 }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>Date *</label>
              <input type="date" value={form.date_cours} onChange={set('date_cours')} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>Promotion *</label>
              <select value={form.annee_pd} onChange={set('annee_pd')} style={inputStyle}>
                <option value="D1">D1 — 2024-2025</option>
                <option value="D2">D2 — 2025-2026</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>Groupe de matières *</label>
              <select value={form.groupe_matiere} onChange={e => setForm(p => ({ ...p, groupe_matiere: e.target.value, matiere: '' }))} style={inputStyle}>
                <option value="">Sélectionner...</option>
                {Object.keys(GROUPES_MATIERES).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>Matière *</label>
              <select value={form.matiere} onChange={set('matiere')} style={inputStyle}>
                <option value="">Sélectionner...</option>
                {(form.groupe_matiere ? GROUPES_MATIERES[form.groupe_matiere] : TOUTES_MATIERES).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>Enseignant(e)</label>
              <input value={form.enseignant} onChange={set('enseignant')} placeholder="Nom" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>Niveau</label>
              <select value={form.niveau} onChange={set('niveau')} style={inputStyle}>
                <option value="">—</option>
                <option value="NM">NM</option>
                <option value="NS">NS</option>
                <option value="NM/NS">NM et NS</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>📖 Contenu du cours</label>
            <textarea value={form.contenu} onChange={set('contenu')} rows={4} placeholder="Décrivez ce qui a été fait durant ce cours..." style={inputStyle} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>📝 Devoirs / Travaux à faire</label>
            <textarea value={form.devoirs} onChange={set('devoirs')} rows={3} placeholder="Exercices, lectures, révisions..." style={inputStyle} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>💬 Observations</label>
            <textarea value={form.observations} onChange={set('observations')} rows={2} placeholder="Remarques particulières..." style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={saveEntry} disabled={saving} style={{ background: '#1a3a5c', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 7, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              {saving ? 'Enregistrement...' : editEntry ? '✓ Modifier' : '✓ Enregistrer'}
            </button>
            <button onClick={() => { setShowForm(false); setEditEntry(null) }} style={{ background: '#f5f5f5', color: '#333', border: '1px solid #ddd', padding: '9px 16px', borderRadius: 7, fontSize: 14, cursor: 'pointer' }}>Annuler</button>
            {saved && <span style={{ color: '#1a6b4a', fontWeight: 600, fontSize: 14 }}>✓ Enregistré !</span>}
          </div>
        </div>
      )}

      {/* Filtres + mode vue */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterPromo} onChange={e => setFilterPromo(e.target.value)} style={{ padding: '9px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}>
          <option value="">D1 et D2</option>
          <option value="D1">D1 — 2024-2025</option>
          <option value="D2">D2 — 2025-2026</option>
        </select>
        <select value={filterGroupe} onChange={e => { setFilterGroupe(e.target.value); setFilterMatiere('') }} style={{ padding: '9px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}>
          <option value="">Tous les groupes</option>
          {Object.keys(GROUPES_MATIERES).map(g => <option key={g} value={g}>{g.split(' — ')[0]}</option>)}
        </select>
        <select value={filterMatiere} onChange={e => setFilterMatiere(e.target.value)} style={{ padding: '9px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}>
          <option value="">Toutes les matières</option>
          {(filterGroupe ? GROUPES_MATIERES[filterGroupe] : TOUTES_MATIERES).map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          {[['liste', '☰ Liste'], ['groupes', '⊞ Groupes']].map(([key, label]) => (
            <button key={key} onClick={() => setViewMode(key)} style={{ padding: '8px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', background: viewMode === key ? '#1a3a5c' : '#e8e6e0', color: viewMode === key ? '#fff' : '#555', fontWeight: 600, fontSize: 13 }}>{label}</button>
          ))}
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>Chargement...</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: 10, border: '1px solid #e8e6e0' }}>
          <div style={{ fontSize: 40, marginBottom: '1rem' }}>📒</div>
          <p style={{ color: '#888' }}>Aucune entrée dans le cahier de textes.</p>
        </div>
      )}

      {/* Vue par groupes */}
      {!loading && viewMode === 'groupes' && Object.entries(entriesParGroupe).map(([groupe, items]) => {
        const couleur = COULEURS_GROUPES[groupe] || '#1a3a5c'
        return (
          <div key={groupe} style={{ marginBottom: '2rem' }}>
            <div style={{ background: couleur, color: '#fff', padding: '10px 16px', borderRadius: '10px 10px 0 0', fontWeight: 700, fontSize: 15, display: 'flex', justifyContent: 'space-between' }}>
              <span>{groupe}</span>
              <span style={{ opacity: 0.75, fontSize: 13 }}>{items.length} entrée{items.length > 1 ? 's' : ''}</span>
            </div>
            <div style={{ border: `1px solid ${couleur}33`, borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
              {items.map((entry, idx) => <EntryRow key={entry.id} entry={entry} idx={idx} couleur={couleur} onEdit={openEdit} onDelete={deleteEntry} />)}
            </div>
          </div>
        )
      })}

      {/* Vue liste */}
      {!loading && viewMode === 'liste' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(entry => {
            const couleur = COULEURS_GROUPES[entry.groupe_matiere || getGroupeMatiere(entry.matiere)] || '#1a3a5c'
            return <EntryCard key={entry.id} entry={entry} couleur={couleur} onEdit={openEdit} onDelete={deleteEntry} />
          })}
        </div>
      )}
    </div>
  )
}

function EntryRow({ entry, idx, couleur, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background: idx % 2 === 0 ? '#fff' : '#f8f7f4', borderBottom: '1px solid #eee' }}>
      <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#888' }}>📅 {new Date(entry.date_cours).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{entry.matiere}</span>
          <span style={{ background: entry.annee_pd === 'D1' ? '#1a3a5c20' : '#1a6b4a20', color: entry.annee_pd === 'D1' ? '#1a3a5c' : '#1a6b4a', fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{entry.annee_pd}</span>
          {entry.enseignant && <span style={{ fontSize: 13, color: '#888' }}>· {entry.enseignant}</span>}
          {entry.devoirs && <span style={{ background: '#fff8e1', color: '#856404', fontSize: 11, padding: '2px 8px', borderRadius: 20, border: '1px solid #ffd54f' }}>📝 Devoirs</span>}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ color: '#aaa', fontSize: 18 }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: '0 16px 12px', borderTop: '1px solid #eee' }}>
          {entry.contenu && <div style={{ marginTop: 10 }}><div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#aaa', marginBottom: 4 }}>Contenu</div><p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{entry.contenu}</p></div>}
          {entry.devoirs && <div style={{ marginTop: 10, background: '#fffdf0', borderLeft: `3px solid #e8b84b`, padding: '8px 12px', borderRadius: '0 6px 6px 0' }}><div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#856404', marginBottom: 4 }}>Devoirs</div><p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{entry.devoirs}</p></div>}
          {entry.observations && <div style={{ marginTop: 10, background: '#f0f7ff', borderLeft: `3px solid ${couleur}`, padding: '8px 12px', borderRadius: '0 6px 6px 0' }}><div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: couleur, marginBottom: 4 }}>Observations</div><p style={{ fontSize: 14, lineHeight: 1.6 }}>{entry.observations}</p></div>}
          <div style={{ display: 'flex', gap: '6px', marginTop: 10 }}>
            <button onClick={() => onEdit(entry)} style={{ padding: '5px 12px', background: '#f0f4f8', color: '#1a3a5c', border: '1px solid #ddd', borderRadius: 5, fontSize: 12, cursor: 'pointer' }}>✏️ Modifier</button>
            <button onClick={() => onDelete(entry.id)} style={{ padding: '5px 12px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 5, fontSize: 12, cursor: 'pointer' }}>🗑️ Supprimer</button>
          </div>
        </div>
      )}
    </div>
  )
}

function EntryCard({ entry, couleur, onEdit, onDelete }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8e6e0', overflow: 'hidden' }}>
      <div style={{ background: couleur, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{entry.matiere}</span>
          <span style={{ background: 'rgba(232,184,75,0.3)', color: '#e8b84b', fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{entry.annee_pd}</span>
          {entry.niveau && <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, padding: '2px 8px', borderRadius: 20 }}>{entry.niveau}</span>}
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>📅 {new Date(entry.date_cours).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          {entry.enseignant && <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>· 👤 {entry.enseignant}</span>}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => onEdit(entry)} style={{ padding: '5px 12px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 5, fontSize: 12, cursor: 'pointer' }}>✏️ Modifier</button>
          <button onClick={() => onDelete(entry.id)} style={{ padding: '5px 12px', background: 'rgba(220,50,50,0.3)', color: '#ffcccc', border: '1px solid rgba(255,100,100,0.3)', borderRadius: 5, fontSize: 12, cursor: 'pointer' }}>🗑️</button>
        </div>
      </div>
      <div style={{ padding: '1rem 1.25rem' }}>
        {entry.contenu && <div style={{ marginBottom: '0.75rem' }}><div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#aaa', marginBottom: 4 }}>📖 Contenu</div><p style={{ fontSize: 14, color: '#333', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{entry.contenu}</p></div>}
        {entry.devoirs && <div style={{ marginBottom: '0.75rem', background: '#fffdf0', borderLeft: '3px solid #e8b84b', padding: '8px 12px', borderRadius: '0 6px 6px 0' }}><div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#856404', marginBottom: 4 }}>📝 Devoirs</div><p style={{ fontSize: 14, color: '#333', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{entry.devoirs}</p></div>}
        {entry.observations && <div style={{ background: '#f0f7ff', borderLeft: `3px solid ${couleur}`, padding: '8px 12px', borderRadius: '0 6px 6px 0' }}><div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: couleur, marginBottom: 4 }}>💬 Observations</div><p style={{ fontSize: 14, color: '#333', lineHeight: 1.65 }}>{entry.observations}</p></div>}
        {!entry.contenu && !entry.devoirs && !entry.observations && <p style={{ color: '#aaa', fontSize: 14, fontStyle: 'italic' }}>Aucun contenu renseigné.</p>}
      </div>
    </div>
  )
}
