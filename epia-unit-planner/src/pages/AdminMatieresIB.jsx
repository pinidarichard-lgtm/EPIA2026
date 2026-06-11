import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const GROUPES = [
  { num:1, label:"Groupe 1 — Langue et littérature",  matieres:["Français A — Langue et littérature","Anglais A — Langue et littérature","Autre langue A"] },
  { num:2, label:"Groupe 2 — Acquisition de langues", matieres:["Anglais B","Français B","Espagnol B","Autre langue B"] },
  { num:3, label:"Groupe 3 — Individus et sociétés",  matieres:["Histoire","Économie","Géographie","Psychologie","Philosophie","Informatique"] },
  { num:4, label:"Groupe 4 — Sciences",               matieres:["Biologie","Chimie","Physique","Sciences de l'environnement","Informatique"] },
  { num:5, label:"Groupe 5 — Mathématiques",          matieres:["Mathématiques : Analyse et approches","Mathématiques : Applications et interprétation"] },
  { num:6, label:"Groupe 6 — Arts / Option",          matieres:["Arts visuels","Théâtre","Musique","Cinéma","Danse"] },
];

const ANNEES_PD = ["D1","D2"];
const NIVEAUX   = ["NS","NM"];
const DEFAULT_FRONTIERES = { 7:80, 6:70, 5:60, 4:50, 3:40, 2:30, 1:0 };

function EpreuvesEditor({ epreuves, onChange }) {
  function add() { onChange([...epreuves, { nom:`Épreuve ${epreuves.length+1}`, bareme:20, pourcentage:0 }]); }
  function remove(i) { onChange(epreuves.filter((_,j) => j!==i)); }
  function update(i, key, val) { onChange(epreuves.map((e,j) => j===i ? { ...e, [key]: key==="nom"?val:Number(val) } : e)); }
  const total = epreuves.reduce((s,e) => s+Number(e.pourcentage), 0);
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 80px 80px 30px", gap:6, marginBottom:4 }}>
        <span style={{ fontSize:11, color:"#888", fontWeight:500 }}>Épreuve</span>
        <span style={{ fontSize:11, color:"#888", textAlign:"center" }}>Barème</span>
        <span style={{ fontSize:11, color:"#888", textAlign:"center" }}>%</span>
        <span/>
      </div>
      {epreuves.map((ep,i) => (
        <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 80px 80px 30px", gap:6, marginBottom:5 }}>
          <input style={inpStyle} value={ep.nom} onChange={e => update(i,"nom",e.target.value)} placeholder="Ex: Épreuve 1" />
          <input style={{ ...inpStyle, textAlign:"center" }} type="number" min={1} value={ep.bareme} onChange={e => update(i,"bareme",e.target.value)} />
          <input style={{ ...inpStyle, textAlign:"center" }} type="number" min={0} max={100} value={ep.pourcentage} onChange={e => update(i,"pourcentage",e.target.value)} />
          <button onClick={() => remove(i)} style={{ background:"#FCEBEB", border:"1px solid #F7C1C1", borderRadius:5, cursor:"pointer", fontSize:11, color:"#A32D2D" }}>✕</button>
        </div>
      ))}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:4 }}>
        <button onClick={add} style={{ fontSize:11, padding:"3px 10px", border:"1px solid #ddd", borderRadius:5, background:"transparent", cursor:"pointer" }}>+ Ajouter</button>
        <span style={{ fontSize:11, fontWeight:600, color:Math.abs(total-100)>0.1?"#A32D2D":"#27500A" }}>Total : {total}% {Math.abs(total-100)>0.1?"⚠":"✓"}</span>
      </div>
    </div>
  );
}

function FrontieresEditor({ front, onChange }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6 }}>
      {[7,6,5,4,3,2,1].map(n => (
        <div key={n} style={{ textAlign:"center" }}>
          <div style={{ fontSize:15, fontWeight:700, color:n>=5?"#27500A":n>=3?"#8B6914":"#A32D2D", marginBottom:3 }}>{n}</div>
          <input style={{ ...inpStyle, textAlign:"center", padding:"5px 4px", fontSize:12 }}
            type="number" min={0} max={100}
            value={front[n]||0}
            onChange={e => onChange({ ...front, [n]: Number(e.target.value) })}
          />
          <div style={{ fontSize:9, color:"#aaa", marginTop:2 }}>%</div>
        </div>
      ))}
    </div>
  );
}

const inpStyle = { width:"100%", padding:"7px 10px", border:"1px solid #ddd", borderRadius:7, fontSize:13, outline:"none", boxSizing:"border-box" };

export default function AdminMatieresIB() {
  const [configs,   setConfigs]   = useState([]);
  const [annees,    setAnnees]    = useState([]);
  const [selAnnee,  setSelAnnee]  = useState("");
  const [selPd,     setSelPd]     = useState("D1");
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [banner,    setBanner]    = useState(null);
  const [modal,     setModal]     = useState(false);
  const [editId,    setEditId]    = useState(null);

  // Form fields
  const [fGroupe,   setFGroupe]   = useState("");
  const [fMatiere,  setFMatiere]  = useState("");
  const [fNiveau,   setFNiveau]   = useState("NM");
  const [fAnnee,    setFAnnee]    = useState("2024-2025");
  const [fPd,       setFPd]       = useState("D1");
  const [fEpreuves, setFEpreuves] = useState([
    { nom:"Épreuve 1", bareme:20, pourcentage:30 },
    { nom:"Épreuve 2", bareme:20, pourcentage:40 },
    { nom:"Évaluation Interne", bareme:20, pourcentage:30 },
  ]);
  const [fFront,    setFFront]    = useState({ ...DEFAULT_FRONTIERES });

  const navigate = useNavigate();

  useEffect(() => { loadInit(); }, []);
  useEffect(() => { if (selAnnee) loadConfigs(); }, [selAnnee]);

  async function loadInit() {
    const { data: a } = await supabaseAdmin.from("annees_scolaires").select("*").order("annee", { ascending:false });
    setAnnees(a || []);
    const active = (a||[]).find(x => x.active);
    const ann = active?.annee || a?.[0]?.annee || "2024-2025";
    setSelAnnee(ann);
    setLoading(false);
  }

  async function loadConfigs() {
    const { data } = await supabaseAdmin.from("ib_matieres_config")
      .select("*")
      .eq("annee_scolaire", selAnnee)
      .eq("actif", true)
      .order("groupe_matiere")
      .order("matiere")
      .order("niveau");
    setConfigs(data || []);
  }

  function openAdd() {
    setEditId(null);
    setFGroupe("");
    setFMatiere("");
    setFNiveau("NM");
    setFAnnee(selAnnee);
    setFPd(selPd); // <-- utilise l'onglet actif D1 ou D2
    setFEpreuves([
      { nom:"Épreuve 1", bareme:20, pourcentage:30 },
      { nom:"Épreuve 2", bareme:20, pourcentage:40 },
      { nom:"Évaluation Interne", bareme:20, pourcentage:30 },
    ]);
    setFFront({ ...DEFAULT_FRONTIERES });
    setModal(true);
  }

  function openEdit(c) {
    setEditId(c.id);
    const grp = GROUPES.find(g => g.label === c.groupe_matiere || g.matieres.includes(c.matiere));
    setFGroupe(grp?.label || "");
    setFMatiere(c.matiere); setFNiveau(c.niveau || "NM");
    setFAnnee(c.annee_scolaire || selAnnee);
    setFPd(c.annee_pd || selPd);
    setFEpreuves(c.epreuves || []);
    setFFront(c.frontieres || { ...DEFAULT_FRONTIERES });
    setModal(true);
  }

  async function save() {
    if (!fMatiere) { showBanner("Sélectionnez une matière.", "error"); return; }
    const total = fEpreuves.reduce((s,e) => s+Number(e.pourcentage), 0);
    if (Math.abs(total-100) > 0.1) { showBanner(`Total des % = ${total} (doit être 100).`, "error"); return; }
    setSaving(true);
    const payload = {
      matiere: fMatiere,
      groupe_matiere: fGroupe,
      niveau: fNiveau,
      annee_scolaire: fAnnee,
      annee_pd: fPd,
      epreuves: fEpreuves,
      frontieres: fFront,
      actif: true,
    };
    if (editId) {
      await supabaseAdmin.from("ib_matieres_config").update(payload).eq("id", editId);
    } else {
      await supabaseAdmin.from("ib_matieres_config").insert(payload);
    }
    await loadConfigs();
    setModal(false);
    setSaving(false);
    showBanner("✓ Configuration enregistrée.", "success");
  }

  async function deleteConfig(id) {
    await supabaseAdmin.from("ib_matieres_config").delete().eq("id", id);
    setConfigs(prev => prev.filter(c => c.id !== id));
    showBanner("✓ Supprimé.", "success");
  }

  // Duplicate NS config → NM or vice versa
  async function duplicate(c) {
    const newNiv = c.niveau === "NS" ? "NM" : "NS";
    const { error } = await supabaseAdmin.from("ib_matieres_config").insert({
      matiere: c.matiere,
      groupe_matiere: c.groupe_matiere,
      niveau: newNiv,
      annee_scolaire: c.annee_scolaire,
      annee_pd: c.annee_pd,
      epreuves: c.epreuves,
      frontieres: c.frontieres,
      actif: true,
    });
    if (error) { showBanner("Erreur : " + error.message, "error"); return; }
    await loadConfigs();
    showBanner(`✓ Dupliqué en ${newNiv} avec succès.`, "success");
  }

  function showBanner(msg, type) { setBanner({msg,type}); setTimeout(()=>setBanner(null),4000); }

  // Group configs by groupe
  const filteredConfigs = configs.filter(c => c.annee_pd === selPd);
  const byGroupe = {};
  filteredConfigs.forEach(c => {
    const k = c.groupe_matiere || "Autre";
    if (!byGroupe[k]) byGroupe[k] = [];
    byGroupe[k].push(c);
  });

  const S = {
    page:    { minHeight:"100vh", background:"#f5f7fa", fontFamily:"sans-serif" },
    nav:     { background:"#1B3A6B", padding:"0 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 },
    navL:    { display:"flex", alignItems:"center", gap:12 },
    navLogo: { width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700 },
    navT:    { color:"#fff", fontWeight:600, fontSize:15 },
    navS:    { color:"rgba(255,255,255,0.6)", fontSize:12 },
    navBtn:  { padding:"6px 14px",background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",borderRadius:7,fontSize:13,cursor:"pointer" },
    wrap:    { padding:"1.5rem", maxWidth:1000, margin:"0 auto" },
    banner:  (t) => ({ padding:"10px 14px",borderRadius:8,fontSize:13,marginBottom:"1rem",background:t==="success"?"#EAF3DE":"#FCEBEB",color:t==="success"?"#27500A":"#A32D2D",border:`1px solid ${t==="success"?"#C0DD97":"#F7C1C1"}` }),
    tabs:    { display:"flex", gap:8, marginBottom:"1.5rem" },
    tab:     (a,c) => ({ padding:"10px 24px",border:"1px solid",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:a?600:400,background:a?c:"transparent",color:a?"#fff":"#555",borderColor:a?c:"#ddd" }),
    card:    { background:"#fff", border:"1px solid #eee", borderRadius:12, padding:"1.25rem", marginBottom:10 },
    grpHead: { fontSize:13, fontWeight:700, color:"#1B3A6B", margin:"0 0 10px", padding:"6px 10px", background:"#E6F1FB", borderRadius:7 },
    cfgRow:  { display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"10px 0", borderBottom:"1px solid #f5f5f5" },
    cfgL:    { flex:1 },
    cfgT:    { fontSize:13, fontWeight:600, color:"#111", margin:0 },
    cfgS:    { fontSize:11, color:"#888", margin:"3px 0" },
    tag:     (niv) => ({ fontSize:11,padding:"2px 8px",borderRadius:20,fontWeight:500,background:niv==="NS"?"#FFF9EC":"#E6F1FB",color:niv==="NS"?"#8B6914":"#185FA5",marginRight:4 }),
    epTag:   { fontSize:10,padding:"2px 8px",borderRadius:20,background:"#f5f5f5",color:"#555",marginRight:4,marginBottom:3,display:"inline-block" },
    frTag:   (n) => ({ fontSize:10,padding:"2px 7px",borderRadius:4,fontWeight:500,marginRight:3,background:n>=5?"#EAF3DE":n>=3?"#FFF9EC":"#FCEBEB",color:n>=5?"#27500A":n>=3?"#8B6914":"#A32D2D" }),
    btnSm:   { padding:"4px 10px",fontSize:11,border:"1px solid #ddd",borderRadius:6,background:"transparent",cursor:"pointer" },
    btnP:    { padding:"8px 16px",background:"#1B3A6B",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer" },
    modal:   { position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100 },
    mBox:    { background:"#fff",borderRadius:14,border:"1px solid #eee",padding:"1.75rem",width:560,maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto" },
    mTitle:  { fontSize:17,fontWeight:600,margin:"0 0 1.25rem",color:"#111" },
    field:   { marginBottom:"1rem" },
    lbl:     { display:"block",fontSize:13,color:"#555",marginBottom:4,fontWeight:500 },
    sel:     { width:"100%",padding:"8px 12px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box" },
    grid2:   { display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 },
    grid4:   { display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10 },
    sep:     { borderTop:"1px solid #eee",margin:"1rem 0" },
    mAct:    { display:"flex",gap:8,justifyContent:"flex-end",marginTop:"1.25rem" },
    selMain: { padding:"8px 12px",border:"1px solid rgba(255,255,255,0.3)",borderRadius:7,background:"rgba(255,255,255,0.15)",color:"#fff",fontSize:13,outline:"none" },
  };

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh" }}>Chargement...</div>;

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={S.navL}>
          <div style={S.navLogo}>E</div>
          <div><div style={S.navT}>EPIA — Admin</div><div style={S.navS}>Configuration IB</div></div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <select style={S.selMain} value={selAnnee} onChange={e => setSelAnnee(e.target.value)}>
            {annees.map(a => <option key={a.id} value={a.annee} style={{ color:"#111" }}>{a.annee}{a.active?" ★":""}</option>)}
          </select>
          <button style={S.navBtn} onClick={() => navigate("/admin")}>← Admin</button>
        </div>
      </nav>

      <div style={S.wrap}>
        {banner && <div style={S.banner(banner.type)}>{banner.msg}</div>}

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem", flexWrap:"wrap", gap:10 }}>
          <h1 style={{ fontSize:20, fontWeight:600, margin:0, color:"#111" }}>⚙️ Configuration des matières IB</h1>
          <button style={S.btnP} onClick={openAdd}>+ Ajouter une matière</button>
        </div>

        {/* Onglets D1 / D2 */}
        <div style={S.tabs}>
          <button style={S.tab(selPd==="D1","#1B3A6B")} onClick={() => setSelPd("D1")}>
            📚 D1 — Première année
            <span style={{ fontSize:11, marginLeft:8, opacity:0.8 }}>({configs.filter(c=>c.annee_pd==="D1").length} matières)</span>
          </button>
          <button style={S.tab(selPd==="D2","#1a5c2a")} onClick={() => setSelPd("D2")}>
            🎓 D2 — Deuxième année
            <span style={{ fontSize:11, marginLeft:8, opacity:0.8 }}>({configs.filter(c=>c.annee_pd==="D2").length} matières)</span>
          </button>
        </div>

        {/* Info D1 vs D2 */}
        <div style={{ background: selPd==="D1"?"#E6F1FB":"#EAF3DE", border:`1px solid ${selPd==="D1"?"#B5D4F4":"#C0DD97"}`, borderRadius:10, padding:"10px 14px", fontSize:12, color: selPd==="D1"?"#185FA5":"#27500A", marginBottom:"1.25rem" }}>
          {selPd==="D1"
            ? "📚 D1 — Bulletin sur 42 points. Le tronc commun n'est pas encore noté, juste une appréciation."
            : "🎓 D2 — Bulletin sur 45 points. Le tronc commun est noté (A-E) + points bonus /3."}
        </div>

        {filteredConfigs.length === 0
          ? <div style={{ ...S.card, textAlign:"center", padding:"3rem", color:"#aaa" }}>
              <p style={{ fontSize:32, margin:"0 0 8px" }}>⚙️</p>
              <p style={{ fontSize:14 }}>Aucune matière configurée pour {selPd} — {selAnnee}.</p>
              <button style={{ ...S.btnP, marginTop:12 }} onClick={openAdd}>+ Ajouter une première matière</button>
            </div>
          : Object.entries(byGroupe).map(([grp, items]) => (
            <div key={grp} style={S.card}>
              <p style={S.grpHead}>{grp}</p>
              {items.map((c,i) => (
                <div key={c.id} style={S.cfgRow}>
                  <div style={S.cfgL}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                      <p style={S.cfgT}>{c.matiere}</p>
                      <span style={S.tag(c.niveau)}>{c.niveau}</span>
                      <span style={{ fontSize:10, color:"#aaa" }}>{c.annee_pd}</span>
                    </div>
                    <div style={{ marginBottom:4 }}>
                      {(c.epreuves||[]).map((ep,j) => (
                        <span key={j} style={S.epTag}>{ep.nom} — {ep.bareme}pts · {ep.pourcentage}%</span>
                      ))}
                    </div>
                    <div>
                      {[7,6,5,4,3,2,1].map(n => (
                        <span key={n} style={S.frTag(n)}>{n}≥{c.frontieres?.[n]}%</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:5, marginLeft:12, flexShrink:0 }}>
                    <button style={S.btnSm} onClick={() => duplicate(c)} title={`Dupliquer en ${c.niveau==="NS"?"NM":"NS"}`}>
                      📋 → {c.niveau==="NS"?"NM":"NS"}
                    </button>
                    <button style={S.btnSm} onClick={() => openEdit(c)}>✏️</button>
                    <button style={{ ...S.btnSm, color:"#A32D2D", borderColor:"#F7C1C1", background:"#FCEBEB" }} onClick={() => deleteConfig(c.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          ))
        }
      </div>

      {/* ══ MODAL ══ */}
      {modal && (
        <div style={S.modal} onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div style={S.mBox}>
            <h3 style={S.mTitle}>{editId?"✏️ Modifier":"➕ Ajouter"} une matière IB</h3>

            <div style={S.grid4}>
              <div style={S.field}>
                <label style={S.lbl}>Année PD</label>
                <select style={S.sel} value={fPd} onChange={e => setFPd(e.target.value)}>
                  <option value="D1">D1</option>
                  <option value="D2">D2</option>
                </select>
              </div>
              <div style={S.field}>
                <label style={S.lbl}>Niveau</label>
                <select style={S.sel} value={fNiveau} onChange={e => setFNiveau(e.target.value)}>
                  <option value="NM">NM — Niveau Moyen</option>
                  <option value="NS">NS — Niveau Supérieur</option>
                </select>
              </div>
              <div style={{ ...S.field, gridColumn:"span 2" }}>
                <label style={S.lbl}>Année scolaire</label>
                <select style={S.sel} value={fAnnee} onChange={e => setFAnnee(e.target.value)}>
                  {annees.map(a => <option key={a.id} value={a.annee}>{a.annee}</option>)}
                </select>
              </div>
            </div>

            <div style={S.grid2}>
              <div style={S.field}>
                <label style={S.lbl}>Groupe</label>
                <select style={S.sel} value={fGroupe} onChange={e => { setFGroupe(e.target.value); setFMatiere(""); }}>
                  <option value="">-- Groupe --</option>
                  {GROUPES.map(g => <option key={g.num} value={g.label}>{g.label}</option>)}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.lbl}>Matière</label>
                <select style={S.sel} value={fMatiere} onChange={e => setFMatiere(e.target.value)} disabled={!fGroupe}>
                  <option value="">-- Matière --</option>
                  {(GROUPES.find(g => g.label===fGroupe)?.matieres||[]).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div style={S.sep}/>

            {/* Épreuves */}
            <div style={S.field}>
              <label style={S.lbl}>📋 Épreuves et pondérations</label>
              <div style={{ fontSize:11, color:"#888", marginBottom:8 }}>Barème = note max · % = poids dans la note finale (total doit = 100%)</div>
              <div style={{ background:"#fafafa", borderRadius:8, padding:"10px" }}>
                <EpreuvesEditor epreuves={fEpreuves} onChange={setFEpreuves} />
              </div>
            </div>

            <div style={S.sep}/>

            {/* Frontières */}
            <div style={S.field}>
              <label style={S.lbl}>🎯 Frontières des notes /7</label>
              <div style={{ fontSize:11, color:"#888", marginBottom:8 }}>% minimum pour obtenir chaque note (de 7 à 1)</div>
              <FrontieresEditor front={fFront} onChange={setFFront} />
            </div>

            <div style={S.mAct}>
              <button style={{ ...S.btnSm, fontSize:13, padding:"7px 16px" }} onClick={() => setModal(false)}>Annuler</button>
              <button style={S.btnP} onClick={save} disabled={saving}>{saving?"Enregistrement...":"✓ Enregistrer"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
