import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const GROUPES_MATIERES = [
  { groupe: "Groupe 1 — Langue et littérature", matieres: ["Français A — Langue et littérature", "Anglais A — Langue et littérature"] },
  { groupe: "Groupe 2 — Acquisition de langues", matieres: ["Anglais B", "Français B", "Espagnol B"] },
  { groupe: "Groupe 3 — Individus et sociétés", matieres: ["Histoire", "Économie", "Géographie", "Psychologie", "Philosophie"] },
  { groupe: "Groupe 4 — Sciences", matieres: ["Biologie", "Chimie", "Physique", "Sciences de l'environnement"] },
  { groupe: "Groupe 5 — Mathématiques", matieres: ["Mathématiques : Analyse et approches", "Mathématiques : Applications et interprétation"] },
  { groupe: "Groupe 6 — Arts", matieres: ["Arts visuels", "Théâtre", "Musique"] },
];

const PERIODES = ["Trimestre 1", "Trimestre 2", "Trimestre 3", "Semestre 1", "Semestre 2", "Examen blanc", "Évaluation finale"];
const NIVEAUX  = ["NS", "NM"];

export default function ProfNotes() {
  const [prof, setProf]         = useState(null);
  const [eleves, setEleves]     = useState([]);
  const [notes, setNotes]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [banner, setBanner]     = useState(null);

  // Filtres
  const [selMatiere,  setSelMatiere]  = useState("");
  const [selGroupe,   setSelGroupe]   = useState("");
  const [selAnnee,    setSelAnnee]    = useState("D1");
  const [selPeriode,  setSelPeriode]  = useState("Trimestre 1");
  const [selNiveau,   setSelNiveau]   = useState("NM");
  const [selScolaire, setSelScolaire] = useState("2024-2025");

  // Saisie en cours (noteId ou eleveId → valeur)
  const [saisie, setSaisie]   = useState({});
  const [commentaires, setCommentaires] = useState({});

  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profData } = await supabaseAdmin
      .from("profs").select("*").eq("auth_id", user.id).single();
    setProf(profData);
    const { data: elevesData } = await supabaseAdmin
      .from("eleves").select("*").eq("actif", true).order("nom");
    setEleves(elevesData || []);
    setLoading(false);
  }

  async function loadNotes() {
    if (!selMatiere || !selPeriode) return;
    const elevesFiltered = eleves.filter(e => e.annee_pd === selAnnee);
    const ids = elevesFiltered.map(e => e.id);
    if (ids.length === 0) return;
    const { data } = await supabaseAdmin
      .from("notes")
      .select("*")
      .in("eleve_id", ids)
      .eq("matiere", selMatiere)
      .eq("periode", selPeriode)
      .eq("annee_pd", selAnnee)
      .eq("annee_scolaire", selScolaire);
    setNotes(data || []);
    // Pré-remplir la saisie
    const s = {}, c = {};
    (data || []).forEach(n => { s[n.eleve_id] = n.note; c[n.eleve_id] = n.commentaire || ""; });
    setSaisie(s);
    setCommentaires(c);
  }

  useEffect(() => { if (selMatiere && selPeriode && eleves.length > 0) loadNotes(); }, [selMatiere, selPeriode, selAnnee, selScolaire]);

  async function saveNotes() {
    if (!selMatiere || !selPeriode) { showBanner("Sélectionnez une matière et une période.", "error"); return; }
    setSaving(true);
    const nomProf = prof ? `${prof.prenom} ${prof.nom}` : "";
    const elevesFiltered = eleves.filter(e => e.annee_pd === selAnnee);

    for (const eleve of elevesFiltered) {
      const val = saisie[eleve.id];
      if (val === undefined || val === "") continue;
      const note = parseFloat(val);
      if (isNaN(note) || note < 0 || note > 20) continue;

      const existing = notes.find(n => n.eleve_id === eleve.id);
      const payload = {
        eleve_id: eleve.id,
        matiere: selMatiere,
        groupe_matiere: selGroupe,
        annee_pd: selAnnee,
        annee_scolaire: selScolaire,
        periode: selPeriode,
        note,
        commentaire: commentaires[eleve.id] || "",
        enseignant: nomProf,
      };

      if (existing) {
        await supabaseAdmin.from("notes").update(payload).eq("id", existing.id);
      } else {
        await supabaseAdmin.from("notes").insert(payload);
      }
    }

    await loadNotes();
    setSaving(false);
    showBanner("✓ Notes enregistrées avec succès !", "success");
  }

  function showBanner(msg, type) { setBanner({ msg, type }); setTimeout(() => setBanner(null), 4000); }

  const elevesFiltered = eleves.filter(e => e.annee_pd === selAnnee);
  const moyenne = elevesFiltered.length > 0
    ? (() => {
        const vals = elevesFiltered.map(e => parseFloat(saisie[e.id])).filter(v => !isNaN(v));
        return vals.length > 0 ? (vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(2) : "—";
      })()
    : "—";

  const s = {
    page:    { minHeight:"100vh", background:"#f5f7fa", fontFamily:"sans-serif" },
    nav:     { background:"#1B3A6B", padding:"0 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 },
    navL:    { display:"flex", alignItems:"center", gap:12 },
    navLogo: { width:32, height:32, borderRadius:8, background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700 },
    navTitle:{ color:"#fff", fontWeight:600, fontSize:15 },
    navSub:  { color:"rgba(255,255,255,0.6)", fontSize:12 },
    navBtn:  { padding:"6px 14px", background:"rgba(255,255,255,0.15)", color:"#fff", border:"1px solid rgba(255,255,255,0.3)", borderRadius:7, fontSize:13, cursor:"pointer" },
    wrap:    { padding:"1.5rem", maxWidth:1000, margin:"0 auto" },
    title:   { fontSize:20, fontWeight:600, color:"#111", margin:"0 0 1.5rem" },
    banner:  (t) => ({ padding:"10px 14px", borderRadius:8, fontSize:13, marginBottom:"1rem", background:t==="success"?"#EAF3DE":"#FCEBEB", color:t==="success"?"#27500A":"#A32D2D", border:`1px solid ${t==="success"?"#C0DD97":"#F7C1C1"}` }),
    filtre:  { background:"#fff", border:"1px solid #eee", borderRadius:12, padding:"1.25rem", marginBottom:"1.25rem" },
    filtreT: { fontSize:14, fontWeight:600, color:"#111", margin:"0 0 1rem" },
    grid3:   { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:10 },
    lbl:     { display:"block", fontSize:12, color:"#666", marginBottom:4, fontWeight:500 },
    sel:     { width:"100%", padding:"8px 10px", border:"1px solid #ddd", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box" },
    table:   { width:"100%", borderCollapse:"collapse" },
    th:      { padding:"10px 12px", textAlign:"left", fontSize:12, fontWeight:600, color:"#888", borderBottom:"2px solid #eee", background:"#fafafa" },
    td:      { padding:"8px 12px", fontSize:13, borderBottom:"1px solid #f5f5f5", color:"#111" },
    noteInp: { width:60, padding:"5px 8px", border:"1px solid #ddd", borderRadius:7, fontSize:13, textAlign:"center", outline:"none" },
    commInp: { width:"100%", padding:"5px 8px", border:"1px solid #ddd", borderRadius:7, fontSize:12, outline:"none", boxSizing:"border-box" },
    btnP:    { padding:"9px 20px", background:"#1B3A6B", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" },
    btnSm:   { padding:"6px 12px", background:"transparent", color:"#555", border:"1px solid #ddd", borderRadius:7, fontSize:12, cursor:"pointer" },
    avg:     { background:"#E6F1FB", border:"1px solid #B5D4F4", borderRadius:8, padding:"8px 14px", fontSize:13, color:"#185FA5", fontWeight:500, display:"inline-block", marginBottom:"1rem" },
  };

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>Chargement...</div>;

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navL}>
          <div style={s.navLogo}>E</div>
          <div>
            <div style={s.navTitle}>EPIA Lomé</div>
            <div style={s.navSub}>Saisie des notes</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button style={s.navBtn} onClick={() => navigate("/prof/dashboard")}>← Dashboard</button>
          <button style={s.navBtn} onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}>Déconnexion</button>
        </div>
      </nav>

      <div style={s.wrap}>
        <h1 style={s.title}>📝 Saisie des notes</h1>
        {banner && <div style={s.banner(banner.type)}>{banner.msg}</div>}

        {/* Filtres */}
        <div style={s.filtre}>
          <p style={s.filtreT}>Sélection</p>
          <div style={s.grid3}>
            <div>
              <label style={s.lbl}>Groupe de matière</label>
              <select style={s.sel} value={selGroupe} onChange={e => { setSelGroupe(e.target.value); setSelMatiere(""); }}>
                <option value="">-- Choisir un groupe --</option>
                {GROUPES_MATIERES.map(g => <option key={g.groupe} value={g.groupe}>{g.groupe}</option>)}
              </select>
            </div>
            <div>
              <label style={s.lbl}>Matière</label>
              <select style={s.sel} value={selMatiere} onChange={e => setSelMatiere(e.target.value)} disabled={!selGroupe}>
                <option value="">-- Choisir --</option>
                {(GROUPES_MATIERES.find(g => g.groupe === selGroupe)?.matieres || []).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={s.lbl}>Niveau</label>
              <select style={s.sel} value={selNiveau} onChange={e => setSelNiveau(e.target.value)}>
                {NIVEAUX.map(n => <option key={n} value={n}>{n === "NS" ? "NS — Niveau Supérieur" : "NM — Niveau Moyen"}</option>)}
              </select>
            </div>
            <div>
              <label style={s.lbl}>Année PD</label>
              <select style={s.sel} value={selAnnee} onChange={e => setSelAnnee(e.target.value)}>
                <option value="D1">D1 — 1ère année</option>
                <option value="D2">D2 — 2ème année</option>
              </select>
            </div>
            <div>
              <label style={s.lbl}>Année scolaire</label>
              <select style={s.sel} value={selScolaire} onChange={e => setSelScolaire(e.target.value)}>
                <option value="2024-2025">2024–2025</option>
                <option value="2025-2026">2025–2026</option>
              </select>
            </div>
            <div>
              <label style={s.lbl}>Période</label>
              <select style={s.sel} value={selPeriode} onChange={e => setSelPeriode(e.target.value)}>
                {PERIODES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Tableau de saisie */}
        {selMatiere && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.75rem", flexWrap:"wrap", gap:8 }}>
              <div style={s.avg}>
                Moyenne de classe : <strong>{moyenne}</strong>/20 · {elevesFiltered.filter(e => saisie[e.id] !== undefined && saisie[e.id] !== "").length}/{elevesFiltered.length} notes saisies
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button style={s.btnSm} onClick={() => { setSaisie({}); setCommentaires({}); }}>🗑️ Effacer</button>
                <button style={s.btnP} onClick={saveNotes} disabled={saving}>
                  {saving ? "Enregistrement..." : "💾 Enregistrer toutes les notes"}
                </button>
              </div>
            </div>

            <div style={{ background:"#fff", border:"1px solid #eee", borderRadius:12, overflow:"hidden" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>#</th>
                    <th style={s.th}>Élève</th>
                    <th style={s.th} width={80}>Note /20</th>
                    <th style={s.th}>Commentaire</th>
                    <th style={s.th} width={60}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {elevesFiltered.length === 0
                    ? <tr><td colSpan={5} style={{ ...s.td, textAlign:"center", color:"#aaa", padding:"2rem" }}>Aucun élève en {selAnnee}.</td></tr>
                    : elevesFiltered.map((e, i) => {
                        const val = saisie[e.id];
                        const note = parseFloat(val);
                        const couleur = isNaN(note) ? "#111" : note >= 14 ? "#27500A" : note >= 10 ? "#185FA5" : note >= 7 ? "#8B6914" : "#A32D2D";
                        return (
                          <tr key={e.id} style={{ background: i%2===0 ? "#fff" : "#fafafa" }}>
                            <td style={{ ...s.td, color:"#aaa", width:36 }}>{i+1}</td>
                            <td style={s.td}>
                              <span style={{ fontWeight:500 }}>{e.prenom} {e.nom}</span>
                            </td>
                            <td style={s.td}>
                              <input
                                style={{ ...s.noteInp, color: couleur, fontWeight: !isNaN(note) ? 600 : 400, borderColor: !isNaN(note) ? "#B5D4F4" : "#ddd" }}
                                type="number"
                                min={0} max={20} step={0.5}
                                placeholder="—"
                                value={saisie[e.id] ?? ""}
                                onChange={ev => setSaisie(prev => ({ ...prev, [e.id]: ev.target.value }))}
                              />
                            </td>
                            <td style={s.td}>
                              <input
                                style={s.commInp}
                                type="text"
                                placeholder="Commentaire optionnel..."
                                value={commentaires[e.id] || ""}
                                onChange={ev => setCommentaires(prev => ({ ...prev, [e.id]: ev.target.value }))}
                              />
                            </td>
                            <td style={s.td}>
                              {notes.find(n => n.eleve_id === e.id)
                                ? <span style={{ fontSize:11, padding:"2px 7px", borderRadius:20, background:"#EAF3DE", color:"#27500A", fontWeight:500 }}>✓</span>
                                : <span style={{ fontSize:11, padding:"2px 7px", borderRadius:20, background:"#f5f5f5", color:"#aaa" }}>—</span>
                              }
                            </td>
                          </tr>
                        );
                      })
                  }
                </tbody>
              </table>
            </div>
          </>
        )}

        {!selMatiere && (
          <div style={{ textAlign:"center", padding:"3rem", color:"#aaa", background:"#fff", borderRadius:12, border:"1px solid #eee" }}>
            <p style={{ fontSize:32, margin:"0 0 8px" }}>📝</p>
            <p style={{ fontSize:14 }}>Sélectionnez un groupe de matière et une matière pour commencer la saisie.</p>
          </div>
        )}
      </div>
    </div>
  );
}
