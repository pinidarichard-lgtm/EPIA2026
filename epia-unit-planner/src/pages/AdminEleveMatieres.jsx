import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const GROUPES = [
  { num: 1, label: "Groupe 1 — Langue et littérature", matieres: ["Français A — Langue et littérature", "Anglais A — Langue et littérature", "Autre langue A"] },
  { num: 2, label: "Groupe 2 — Acquisition de langues", matieres: ["Anglais B", "Français B", "Espagnol B", "Autre langue B"] },
  { num: 3, label: "Groupe 3 — Individus et sociétés", matieres: ["Histoire", "Économie", "Géographie", "Psychologie", "Philosophie", "Informatique"] },
  { num: 4, label: "Groupe 4 — Sciences", matieres: ["Biologie", "Chimie", "Physique", "Sciences de l'environnement", "Informatique"] },
  { num: 5, label: "Groupe 5 — Mathématiques", matieres: ["Mathématiques : Analyse et approches", "Mathématiques : Applications et interprétation"] },
  { num: 6, label: "Groupe 6 — Arts / Option", matieres: ["Arts visuels", "Théâtre", "Musique", "Cinéma", "Option Groupe 3", "Option Groupe 4"] },
];

const TRONC_COMMUN = ["Théorie de la Connaissance (TdC)", "Mémoire (Extended Essay)", "CAS"];
const NIVEAUX = ["NS", "NM"];

export default function AdminEleveMatieres() {
  const [eleves,   setEleves]   = useState([]);
  const [annees,   setAnnees]   = useState([]);
  const [selEleve, setSelEleve] = useState(null);
  const [selAnnee, setSelAnnee] = useState("");
  const [matieres, setMatieres] = useState({}); 
  // { groupeNum: { matiere, niveau } }
  const [troncCommun, setTroncCommun] = useState({});
  // { "TdC": true/false, ... }
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [banner,   setBanner]   = useState(null);
  const [search,   setSearch]   = useState("");
  const navigate = useNavigate();

  useEffect(() => { loadInit(); }, []);

  async function loadInit() {
    setLoading(true);
    const [{ data: e }, { data: a }] = await Promise.all([
      supabaseAdmin.from("eleves").select("*").eq("actif", true).order("nom"),
      supabaseAdmin.from("annees_scolaires").select("*").order("annee", { ascending: false }),
    ]);
    setEleves(e || []);
    setAnnees(a || []);
    const active = (a || []).find(x => x.active);
    if (active) setSelAnnee(active.annee);
    setLoading(false);
  }

  async function loadMatieres(eleveId, annee) {
    const { data } = await supabaseAdmin
      .from("eleve_matieres")
      .select("*")
      .eq("eleve_id", eleveId)
      .eq("annee_scolaire", annee);

    const m = {}, tc = {};
    TRONC_COMMUN.forEach(t => { tc[t] = false; });

    (data || []).forEach(row => {
      if (TRONC_COMMUN.includes(row.matiere)) {
        tc[row.matiere] = true;
      } else {
        const grp = GROUPES.find(g => g.matieres.includes(row.matiere));
        if (grp) m[grp.num] = { matiere: row.matiere, niveau: row.niveau || "NM" };
      }
    });
    setMatieres(m);
    setTroncCommun(tc);
  }

  async function selectEleve(eleve) {
    setSelEleve(eleve);
    setMatieres({});
    setTroncCommun(Object.fromEntries(TRONC_COMMUN.map(t => [t, false])));
    if (selAnnee) await loadMatieres(eleve.id, selAnnee);
  }

  async function saveMatieres() {
    if (!selEleve || !selAnnee) { showBanner("Sélectionnez un élève et une année.", "error"); return; }

    // Vérifier 6 matières
    const nbGroupes = Object.keys(matieres).length;
    if (nbGroupes < 6) { showBanner(`Assignez les 6 matières (${nbGroupes}/6 assignées).`, "error"); return; }

    // Vérifier 3 NS et 3 NM
    const niveaux = Object.values(matieres).map(m => m.niveau);
    const nbNS = niveaux.filter(n => n === "NS").length;
    const nbNM = niveaux.filter(n => n === "NM").length;
    if (nbNS !== 3 || nbNM !== 3) {
      showBanner(`Il faut exactement 3 NS et 3 NM (actuellement ${nbNS} NS et ${nbNM} NM).`, "error");
      return;
    }

    setSaving(true);

    // Supprimer les anciens
    await supabaseAdmin.from("eleve_matieres")
      .delete()
      .eq("eleve_id", selEleve.id)
      .eq("annee_scolaire", selAnnee);

    // Insérer les nouvelles matières des 6 groupes
    const rows = [];
    GROUPES.forEach(g => {
      const sel = matieres[g.num];
      if (sel?.matiere) {
        rows.push({ eleve_id: selEleve.id, matiere: sel.matiere, groupe_matiere: g.label, niveau: sel.niveau, annee_scolaire: selAnnee });
      }
    });

    // Insérer le tronc commun coché
    TRONC_COMMUN.forEach(t => {
      if (troncCommun[t]) {
        rows.push({ eleve_id: selEleve.id, matiere: t, groupe_matiere: "Tronc commun", niveau: null, annee_scolaire: selAnnee });
      }
    });

    if (rows.length > 0) await supabaseAdmin.from("eleve_matieres").insert(rows);

    setSaving(false);
    showBanner(`✓ Matières de ${selEleve.prenom} ${selEleve.nom} enregistrées.`, "success");
  }

  function setGroupeMatiere(groupeNum, matiere) {
    setMatieres(prev => ({ ...prev, [groupeNum]: { matiere, niveau: prev[groupeNum]?.niveau || "NM" } }));
  }

  function setGroupeNiveau(groupeNum, niveau) {
    setMatieres(prev => ({ ...prev, [groupeNum]: { ...prev[groupeNum], niveau } }));
  }

  function showBanner(msg, type) { setBanner({ msg, type }); setTimeout(() => setBanner(null), 5000); }

  const nbNS = Object.values(matieres).filter(m => m.niveau === "NS").length;
  const nbNM = Object.values(matieres).filter(m => m.niveau === "NM").length;
  const nbGroupes = Object.values(matieres).filter(m => m.matiere).length;

  const filteredEleves = eleves.filter(e =>
    `${e.nom} ${e.prenom}`.toLowerCase().includes(search.toLowerCase())
  );

  const s = {
    page:   { minHeight:"100vh", background:"#f5f7fa", fontFamily:"sans-serif" },
    nav:    { background:"#1B3A6B", padding:"0 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 },
    navL:   { display:"flex", alignItems:"center", gap:12 },
    navLogo:{ width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700 },
    navT:   { color:"#fff", fontWeight:600, fontSize:15 },
    navS:   { color:"rgba(255,255,255,0.6)", fontSize:12 },
    navBtn: { padding:"6px 14px",background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",borderRadius:7,fontSize:13,cursor:"pointer" },
    wrap:   { padding:"1.5rem", maxWidth:1100, margin:"0 auto", display:"grid", gridTemplateColumns:"280px 1fr", gap:16 },
    banner: (t) => ({ padding:"10px 14px",borderRadius:8,fontSize:13,marginBottom:"1rem",background:t==="success"?"#EAF3DE":"#FCEBEB",color:t==="success"?"#27500A":"#A32D2D",border:`1px solid ${t==="success"?"#C0DD97":"#F7C1C1"}` }),
    card:   { background:"#fff", border:"1px solid #eee", borderRadius:12, padding:"1rem", marginBottom:8, cursor:"pointer" },
    cardA:  { background:"#E6F1FB", border:"1px solid #B5D4F4", borderRadius:12, padding:"1rem", marginBottom:8, cursor:"pointer" },
    name:   { fontSize:13, fontWeight:500, margin:0, color:"#111" },
    sub:    { fontSize:11, color:"#888", margin:"2px 0 0" },
    btnP:   { padding:"9px 20px",background:"#1B3A6B",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer" },
    btnSm:  { padding:"5px 10px",background:"transparent",color:"#555",border:"1px solid #ddd",borderRadius:7,fontSize:12,cursor:"pointer" },
    inp:    { width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box" },
    sel:    { width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box" },
    grpCard:{ background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1.25rem",marginBottom:10 },
    grpT:   { fontSize:13,fontWeight:600,color:"#1B3A6B",margin:"0 0 10px" },
    grid2:  { display:"grid",gridTemplateColumns:"1fr 100px",gap:8 },
    lbl:    { display:"block",fontSize:12,color:"#666",marginBottom:3,fontWeight:500 },
    badge:  (ok) => ({ fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:500,background:ok?"#EAF3DE":"#f5f5f5",color:ok?"#27500A":"#aaa" }),
    tcRow:  { display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid #f5f5f5" },
  };

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh" }}>Chargement...</div>;

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navL}>
          <div style={s.navLogo}>E</div>
          <div><div style={s.navT}>EPIA — Admin</div><div style={s.navS}>Matières des élèves</div></div>
        </div>
        <button style={s.navBtn} onClick={() => navigate("/admin")}>← Admin</button>
      </nav>

      <div style={{ padding:"1.5rem", maxWidth:1100, margin:"0 auto" }}>
        {banner && <div style={s.banner(banner.type)}>{banner.msg}</div>}

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:8 }}>
          <h1 style={{ fontSize:20,fontWeight:600,margin:0,color:"#111" }}>📚 Matières des élèves</h1>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:13,color:"#555" }}>Année :</span>
            <select style={{ ...s.sel,width:140 }} value={selAnnee} onChange={e => { setSelAnnee(e.target.value); if(selEleve) loadMatieres(selEleve.id, e.target.value); }}>
              {annees.map(a => <option key={a.id} value={a.annee}>{a.annee}{a.active?" (active)":""}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:16 }}>

          {/* Liste élèves */}
          <div>
            <input style={{ ...s.inp, marginBottom:10 }} placeholder="Rechercher un élève..." value={search} onChange={e => setSearch(e.target.value)} />
            <div style={{ maxHeight:"calc(100vh - 200px)", overflowY:"auto" }}>
              {filteredEleves.map(e => (
                <div key={e.id} style={selEleve?.id===e.id ? s.cardA : s.card} onClick={() => selectEleve(e)}>
                  <p style={s.name}>{e.prenom} {e.nom}</p>
                  <p style={s.sub}>{e.annee_pd} · {e.annee_scolaire}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Assignation matières */}
          <div>
            {!selEleve
              ? <div style={{ background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"3rem",textAlign:"center",color:"#aaa" }}>
                  <p style={{ fontSize:32,margin:"0 0 8px" }}>👈</p>
                  <p style={{ fontSize:14 }}>Sélectionnez un élève pour assigner ses matières.</p>
                </div>
              : <>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:8 }}>
                    <div>
                      <h2 style={{ fontSize:17,fontWeight:600,margin:0,color:"#111" }}>{selEleve.prenom} {selEleve.nom}</h2>
                      <p style={{ fontSize:13,color:"#888",margin:"2px 0 0" }}>{selEleve.annee_pd} · {selAnnee}</p>
                    </div>
                    <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                      <span style={s.badge(nbGroupes===6)}>{nbGroupes}/6 matières</span>
                      <span style={s.badge(nbNS===3)}>NS: {nbNS}/3</span>
                      <span style={s.badge(nbNM===3)}>NM: {nbNM}/3</span>
                      <button style={s.btnP} onClick={saveMatieres} disabled={saving}>{saving?"Enregistrement...":"💾 Enregistrer"}</button>
                    </div>
                  </div>

                  {/* 6 Groupes */}
                  {GROUPES.map(g => (
                    <div key={g.num} style={s.grpCard}>
                      <p style={s.grpT}>Groupe {g.num} — {g.label.split("—")[1]?.trim()}</p>
                      <div style={s.grid2}>
                        <div>
                          <label style={s.lbl}>Matière</label>
                          <select style={s.sel} value={matieres[g.num]?.matiere||""} onChange={e => setGroupeMatiere(g.num, e.target.value)}>
                            <option value="">-- Choisir --</option>
                            {g.matieres.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={s.lbl}>Niveau</label>
                          <select style={s.sel} value={matieres[g.num]?.niveau||"NM"} onChange={e => setGroupeNiveau(g.num, e.target.value)} disabled={!matieres[g.num]?.matiere}>
                            <option value="NM">NM</option>
                            <option value="NS">NS</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Tronc commun */}
                  <div style={s.grpCard}>
                    <p style={s.grpT}>🎓 Tronc commun</p>
                    {TRONC_COMMUN.map(t => (
                      <div key={t} style={s.tcRow}>
                        <input type="checkbox" id={t} checked={troncCommun[t]||false} onChange={e => setTroncCommun(prev => ({ ...prev, [t]: e.target.checked }))} style={{ width:"auto",cursor:"pointer" }} />
                        <label htmlFor={t} style={{ fontSize:13,color:"#333",cursor:"pointer" }}>{t}</label>
                      </div>
                    ))}
                  </div>
                </>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
