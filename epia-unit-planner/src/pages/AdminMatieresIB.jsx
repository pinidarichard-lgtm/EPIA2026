import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

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

const NIVEAUX = ["NS", "NM"];
const ANNEES  = ["2024-2025", "2025-2026", "2026-2027"];

const DEFAULT_FRONTIERES = { 7:80, 6:70, 5:60, 4:50, 3:40, 2:30, 1:0 };

export default function AdminMatieresIB() {
  const [configs, setConfigs]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [banner, setBanner]     = useState(null);
  const [modal, setModal]       = useState(null); // null | "add" | "edit"
  const [saving, setSaving]     = useState(false);
  const navigate = useNavigate();

  // Formulaire
  const [fMatiere,   setFMatiere]   = useState("");
  const [fGroupe,    setFGroupe]    = useState("");
  const [fNiveau,    setFNiveau]    = useState("NM");
  const [fAnnee,     setFAnnee]     = useState("2024-2025");
  const [fEpreuves,  setFEpreuves]  = useState([
    { nom: "Épreuve 1", bareme: 20, pourcentage: 30 },
    { nom: "Épreuve 2", bareme: 20, pourcentage: 40 },
    { nom: "Évaluation Interne", bareme: 20, pourcentage: 30 },
  ]);
  const [fFront, setFFront] = useState({ ...DEFAULT_FRONTIERES });
  const [editId, setEditId] = useState(null);

  useEffect(() => { loadConfigs(); }, []);

  async function loadConfigs() {
    setLoading(true);
    const { data } = await supabaseAdmin.from("ib_matieres_config").select("*").order("matiere");
    setConfigs(data || []);
    setLoading(false);
  }

  function openAdd() {
    setEditId(null);
    setFMatiere(""); setFGroupe(""); setFNiveau("NM"); setFAnnee("2024-2025");
    setFEpreuves([
      { nom:"Épreuve 1", bareme:20, pourcentage:30 },
      { nom:"Épreuve 2", bareme:20, pourcentage:40 },
      { nom:"Évaluation Interne", bareme:20, pourcentage:30 },
    ]);
    setFFront({ ...DEFAULT_FRONTIERES });
    setModal("edit");
  }

  function openEdit(c) {
    setEditId(c.id);
    setFMatiere(c.matiere); setFGroupe(c.groupe_matiere||""); setFNiveau(c.niveau||"NM"); setFAnnee(c.annee_scolaire||"2024-2025");
    setFEpreuves(c.epreuves || []);
    setFFront(c.frontieres || { ...DEFAULT_FRONTIERES });
    setModal("edit");
  }

  async function saveConfig() {
    if (!fMatiere) { showBanner("Sélectionnez une matière.", "error"); return; }
    const totalPct = fEpreuves.reduce((s, e) => s + Number(e.pourcentage), 0);
    if (Math.abs(totalPct - 100) > 0.1) { showBanner(`Total des pourcentages = ${totalPct}% (doit être 100%).`, "error"); return; }
    setSaving(true);
    const payload = {
      matiere: fMatiere, groupe_matiere: fGroupe, niveau: fNiveau,
      annee_scolaire: fAnnee, epreuves: fEpreuves, frontieres: fFront, actif: true,
    };
    if (editId) {
      await supabaseAdmin.from("ib_matieres_config").update(payload).eq("id", editId);
    } else {
      await supabaseAdmin.from("ib_matieres_config").insert(payload);
    }
    await loadConfigs();
    setModal(null);
    setSaving(false);
    showBanner("✓ Configuration enregistrée.", "success");
  }

  async function deleteConfig(id) {
    await supabaseAdmin.from("ib_matieres_config").delete().eq("id", id);
    setConfigs(prev => prev.filter(c => c.id !== id));
    showBanner("✓ Configuration supprimée.", "success");
  }

  function addEpreuve() {
    setFEpreuves(prev => [...prev, { nom:"Nouvelle épreuve", bareme:20, pourcentage:0 }]);
  }
  function removeEpreuve(i) { setFEpreuves(prev => prev.filter((_,j) => j!==i)); }
  function updateEpreuve(i, key, val) {
    setFEpreuves(prev => prev.map((e,j) => j===i ? { ...e, [key]: key==="nom" ? val : Number(val) } : e));
  }
  function updateFront(note, val) { setFFront(prev => ({ ...prev, [note]: Number(val) })); }

  function showBanner(msg, type) { setBanner({ msg, type }); setTimeout(() => setBanner(null), 4000); }

  const totalPct = fEpreuves.reduce((s,e) => s + Number(e.pourcentage), 0);

  const s = {
    page:   { minHeight:"100vh", background:"#f5f7fa", fontFamily:"sans-serif" },
    nav:    { background:"#1B3A6B", padding:"0 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 },
    navL:   { display:"flex", alignItems:"center", gap:12 },
    navLogo:{ width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700 },
    navT:   { color:"#fff", fontWeight:600, fontSize:15 },
    navS:   { color:"rgba(255,255,255,0.6)", fontSize:12 },
    navBtn: { padding:"6px 14px",background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",borderRadius:7,fontSize:13,cursor:"pointer" },
    wrap:   { padding:"1.5rem", maxWidth:1000, margin:"0 auto" },
    title:  { fontSize:20, fontWeight:600, color:"#111", margin:"0 0 1.5rem" },
    banner: (t) => ({ padding:"10px 14px",borderRadius:8,fontSize:13,marginBottom:"1rem",background:t==="success"?"#EAF3DE":"#FCEBEB",color:t==="success"?"#27500A":"#A32D2D",border:`1px solid ${t==="success"?"#C0DD97":"#F7C1C1"}` }),
    card:   { background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1.25rem",marginBottom:10 },
    cardT:  { fontSize:14,fontWeight:600,color:"#111",margin:0 },
    cardS:  { fontSize:12,color:"#888",margin:"2px 0 0" },
    btnP:   { padding:"8px 16px",background:"#1B3A6B",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer" },
    btnSm:  { padding:"5px 10px",background:"transparent",color:"#555",border:"1px solid #ddd",borderRadius:7,fontSize:12,cursor:"pointer" },
    btnR:   { padding:"5px 10px",background:"#FCEBEB",color:"#A32D2D",border:"1px solid #F7C1C1",borderRadius:7,fontSize:12,cursor:"pointer" },
    modal:  { position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100 },
    mBox:   { background:"#fff",borderRadius:14,border:"1px solid #eee",padding:"1.75rem",width:560,maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto" },
    mTitle: { fontSize:17,fontWeight:600,margin:"0 0 1.25rem",color:"#111" },
    field:  { marginBottom:"1rem" },
    lbl:    { display:"block",fontSize:13,color:"#555",marginBottom:4,fontWeight:500 },
    inp:    { width:"100%",padding:"8px 12px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box" },
    sel:    { width:"100%",padding:"8px 12px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box" },
    grid2:  { display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 },
    grid3:  { display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:8,alignItems:"center" },
    sep:    { borderTop:"1px solid #eee",margin:"1.25rem 0" },
    mAct:   { display:"flex",gap:8,justifyContent:"flex-end",marginTop:"1.25rem" },
    tag:    (ok) => ({ fontSize:11,padding:"2px 8px",borderRadius:20,fontWeight:500,background:ok?"#EAF3DE":"#FCEBEB",color:ok?"#27500A":"#A32D2D" }),
    epRow:  { display:"grid",gridTemplateColumns:"2fr 80px 80px 32px",gap:8,alignItems:"center",marginBottom:6 },
    frGrid: { display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6 },
  };

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navL}>
          <div style={s.navLogo}>E</div>
          <div><div style={s.navT}>EPIA — Admin</div><div style={s.navS}>Configuration IB</div></div>
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <button style={s.navBtn} onClick={() => navigate("/admin")}>← Admin</button>
        </div>
      </nav>

      <div style={s.wrap}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem",flexWrap:"wrap",gap:8 }}>
          <h1 style={s.title}>⚙️ Configuration des matières IB</h1>
          <button style={s.btnP} onClick={openAdd}>+ Ajouter une matière</button>
        </div>

        {banner && <div style={s.banner(banner.type)}>{banner.msg}</div>}

        {loading ? <p style={{ color:"#aaa",fontSize:13 }}>Chargement...</p>
        : configs.length === 0
          ? <div style={{ ...s.card,textAlign:"center",padding:"3rem",color:"#aaa" }}>
              <p style={{ fontSize:32,margin:"0 0 8px" }}>⚙️</p>
              <p style={{ fontSize:14 }}>Aucune matière configurée. Cliquez "+ Ajouter une matière".</p>
            </div>
          : configs.map(c => (
            <div key={c.id} style={s.card}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
                    <p style={s.cardT}>{c.matiere}</p>
                    <span style={{ fontSize:11,padding:"2px 8px",borderRadius:20,background:"#E6F1FB",color:"#185FA5",fontWeight:500 }}>{c.niveau}</span>
                    <span style={{ fontSize:11,padding:"2px 8px",borderRadius:20,background:"#f5f5f5",color:"#888",fontWeight:500 }}>{c.annee_scolaire}</span>
                  </div>
                  <p style={s.cardS}>{c.groupe_matiere}</p>
                  <div style={{ display:"flex",gap:6,marginTop:8,flexWrap:"wrap" }}>
                    {(c.epreuves||[]).map((e,i) => (
                      <span key={i} style={{ fontSize:11,padding:"3px 10px",borderRadius:20,background:"#f9f9f9",border:"1px solid #eee",color:"#555" }}>
                        {e.nom} — {e.bareme}pts · {e.pourcentage}%
                      </span>
                    ))}
                  </div>
                  <div style={{ display:"flex",gap:4,marginTop:6,flexWrap:"wrap" }}>
                    {[7,6,5,4,3,2,1].map(n => (
                      <span key={n} style={{ fontSize:10,padding:"2px 6px",borderRadius:4,background:n>=5?"#EAF3DE":n>=3?"#FFF9EC":"#FCEBEB",color:n>=5?"#27500A":n>=3?"#8B6914":"#A32D2D",fontWeight:500 }}>
                        {n}≥{c.frontieres?.[n]}%
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display:"flex",gap:6 }}>
                  <button style={s.btnSm} onClick={() => openEdit(c)}>✏️ Modifier</button>
                  <button style={s.btnR}  onClick={() => deleteConfig(c.id)}>🗑️</button>
                </div>
              </div>
            </div>
          ))
        }
      </div>

      {/* ── MODAL ── */}
      {modal && (
        <div style={s.modal} onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div style={s.mBox}>
            <h3 style={s.mTitle}>{editId ? "✏️ Modifier" : "➕ Ajouter"} une matière IB</h3>

            <div style={s.grid2}>
              <div style={s.field}>
                <label style={s.lbl}>Groupe</label>
                <select style={s.sel} value={fGroupe} onChange={e => { setFGroupe(e.target.value); setFMatiere(""); }}>
                  <option value="">-- Groupe --</option>
                  {GROUPES_MATIERES.map(g => <option key={g.groupe} value={g.groupe}>{g.groupe}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.lbl}>Matière</label>
                <select style={s.sel} value={fMatiere} onChange={e => setFMatiere(e.target.value)} disabled={!fGroupe}>
                  <option value="">-- Matière --</option>
                  {(GROUPES_MATIERES.find(g => g.groupe===fGroupe)?.matieres||[]).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.lbl}>Niveau</label>
                <select style={s.sel} value={fNiveau} onChange={e => setFNiveau(e.target.value)}>
                  {NIVEAUX.map(n => <option key={n} value={n}>{n === "NS" ? "NS — Niveau Supérieur" : "NM — Niveau Moyen"}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.lbl}>Année scolaire</label>
                <select style={s.sel} value={fAnnee} onChange={e => setFAnnee(e.target.value)}>
                  {ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={s.sep}/>

            {/* Épreuves */}
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <label style={{ ...s.lbl,margin:0 }}>📋 Épreuves et pondérations</label>
              <button style={s.btnSm} onClick={addEpreuve}>+ Ajouter</button>
            </div>
            <div style={{ fontSize:11,color:"#888",marginBottom:8 }}>Barème = note max de l'épreuve. Pourcentage = poids dans la note finale.</div>
            <div style={{ background:"#fafafa",borderRadius:8,padding:"10px",marginBottom:6 }}>
              <div style={{ display:"grid",gridTemplateColumns:"2fr 80px 80px 32px",gap:8,marginBottom:6 }}>
                <span style={{ fontSize:11,color:"#888",fontWeight:500 }}>Nom de l'épreuve</span>
                <span style={{ fontSize:11,color:"#888",fontWeight:500,textAlign:"center" }}>Barème</span>
                <span style={{ fontSize:11,color:"#888",fontWeight:500,textAlign:"center" }}>%</span>
                <span/>
              </div>
              {fEpreuves.map((e,i) => (
                <div key={i} style={s.epRow}>
                  <input style={s.inp} value={e.nom} onChange={ev => updateEpreuve(i,"nom",ev.target.value)} placeholder="Ex: Épreuve 1" />
                  <input style={{ ...s.inp,textAlign:"center" }} type="number" min={1} value={e.bareme} onChange={ev => updateEpreuve(i,"bareme",ev.target.value)} />
                  <input style={{ ...s.inp,textAlign:"center" }} type="number" min={0} max={100} value={e.pourcentage} onChange={ev => updateEpreuve(i,"pourcentage",ev.target.value)} />
                  <button style={{ ...s.btnR,padding:"4px 8px" }} onClick={() => removeEpreuve(i)}>✕</button>
                </div>
              ))}
              <div style={{ fontSize:12,fontWeight:600,marginTop:6,color:Math.abs(totalPct-100)>0.1?"#A32D2D":"#27500A" }}>
                Total : {totalPct}% {Math.abs(totalPct-100)>0.1 ? "⚠️ doit être 100%" : "✓"}
              </div>
            </div>

            <div style={s.sep}/>

            {/* Frontières */}
            <label style={{ ...s.lbl,marginBottom:8 }}>🎯 Frontières des notes sur 7</label>
            <div style={{ fontSize:11,color:"#888",marginBottom:10 }}>Entrez le pourcentage minimum pour obtenir chaque note.</div>
            <div style={s.frGrid}>
              {[7,6,5,4,3,2,1].map(n => (
                <div key={n} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:16,fontWeight:700,color:n>=5?"#27500A":n>=3?"#8B6914":"#A32D2D",marginBottom:4 }}>{n}</div>
                  <input
                    style={{ ...s.inp,textAlign:"center",padding:"6px 4px",fontSize:13,fontWeight:500 }}
                    type="number" min={0} max={100}
                    value={fFront[n]||0}
                    onChange={e => updateFront(n, e.target.value)}
                  />
                  <div style={{ fontSize:10,color:"#aaa",marginTop:2 }}>%</div>
                </div>
              ))}
            </div>

            <div style={s.mAct}>
              <button style={s.btnSm} onClick={() => setModal(null)}>Annuler</button>
              <button style={s.btnP} onClick={saveConfig} disabled={saving}>{saving ? "Enregistrement..." : "✓ Enregistrer"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
