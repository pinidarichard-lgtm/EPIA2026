import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const GROUPES = [
  { num:1, label:"Groupe 1 — Langue et littérature", matieres:["Français A — Langue et littérature","Anglais A — Langue et littérature","Autre langue A"] },
  { num:2, label:"Groupe 2 — Acquisition de langues", matieres:["Anglais B","Français B","Espagnol B","Autre langue B"] },
  { num:3, label:"Groupe 3 — Individus et sociétés", matieres:["Histoire","Économie","Géographie","Psychologie","Philosophie","Informatique"] },
  { num:4, label:"Groupe 4 — Sciences", matieres:["Biologie","Chimie","Physique","Sciences de l'environnement","Informatique"] },
  { num:5, label:"Groupe 5 — Mathématiques", matieres:["Mathématiques : Analyse et approches","Mathématiques : Applications et interprétation"] },
  { num:6, label:"Groupe 6 — Arts", matieres:["Arts visuels","Théâtre","Musique","Cinéma","Danse"] },
];

// Matières optionnelles quand l'élève ne prend pas Arts
const OPTION_GROUPES = [
  { grp:3, label:"2ème matière Groupe 3 — Individus et sociétés", matieres:["Histoire","Économie","Géographie","Psychologie","Philosophie","Informatique"] },
  { grp:4, label:"2ème matière Groupe 4 — Sciences", matieres:["Biologie","Chimie","Physique","Sciences de l'environnement","Informatique"] },
];

const TRONC = ["Théorie de la Connaissance (TdC)","Mémoire (Extended Essay)","CAS"];
const NIVEAUX = ["NM","NS"];

export default function AdminEleveMatieres() {
  const [eleves,    setEleves]    = useState([]);
  const [annees,    setAnnees]    = useState([]);
  const [selEleve,  setSelEleve]  = useState(null);
  const [selAnnee,  setSelAnnee]  = useState("");
  const [matieres,  setMatieres]  = useState({}); // { groupeNum: { matiere, niveau } }
  const [prend6,    setPrend6]    = useState(true); // true = prend Arts, false = option autre groupe
  const [optGrp,    setOptGrp]    = useState(null); // { grp, matiere, niveau } si pas Arts
  const [tronc,     setTronc]     = useState({});
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [banner,    setBanner]    = useState(null);
  const [search,    setSearch]    = useState("");
  const navigate = useNavigate();

  useEffect(() => { loadInit(); }, []);

  async function loadInit() {
    setLoading(true);
    const [{ data:e }, { data:a }] = await Promise.all([
      supabaseAdmin.from("eleves").select("*").eq("actif",true).order("nom"),
      supabaseAdmin.from("annees_scolaires").select("*").order("annee",{ascending:false}),
    ]);
    setEleves(e||[]);
    setAnnees(a||[]);
    const active = (a||[]).find(x => x.active);
    if (active) setSelAnnee(active.annee);
    setLoading(false);
  }

  async function loadMatieres(eleveId, annee) {
    const { data } = await supabaseAdmin.from("eleve_matieres").select("*").eq("eleve_id",eleveId).eq("annee_scolaire",annee);
    const m = {}, tc = {};
    TRONC.forEach(t => { tc[t] = false; });
    let hasArts = false;
    let opt = null;

    (data||[]).forEach(row => {
      if (TRONC.includes(row.matiere)) {
        tc[row.matiere] = true;
        return;
      }
      const grp = GROUPES.find(g => g.matieres.includes(row.matiere));
      if (grp) {
        if (grp.num === 6) hasArts = true;
        if (m[grp.num] && grp.num !== 6) {
          // 2ème matière dans un groupe = option
          opt = { grp: grp.num, matiere: row.matiere, niveau: row.niveau||"NM" };
        } else {
          m[grp.num] = { matiere: row.matiere, niveau: row.niveau||"NM" };
        }
      } else {
        // Chercher dans OPTION_GROUPES
        const og = OPTION_GROUPES.find(og => og.matieres.includes(row.matiere));
        if (og && !m[og.grp]) {
          opt = { grp: og.grp, matiere: row.matiere, niveau: row.niveau||"NM" };
        }
      }
    });

    setMatieres(m);
    setTronc(tc);
    setPrend6(hasArts || !opt);
    setOptGrp(opt || { grp:3, matiere:"", niveau:"NM" });
  }

  async function selectEleve(eleve) {
    setSelEleve(eleve);
    setMatieres({});
    setTronc(Object.fromEntries(TRONC.map(t => [t,false])));
    setPrend6(true);
    setOptGrp({ grp:3, matiere:"", niveau:"NM" });
    if (selAnnee) await loadMatieres(eleve.id, selAnnee);
  }

  async function saveMatieres() {
    if (!selEleve || !selAnnee) { showBanner("Sélectionnez un élève et une année.","error"); return; }

    const groupesRemplis = [1,2,3,4,5].filter(n => matieres[n]?.matiere);
    if (groupesRemplis.length < 5) { showBanner(`Remplissez les groupes 1 à 5 (${groupesRemplis.length}/5).`,"error"); return; }

    if (prend6 && !matieres[6]?.matiere) { showBanner("Sélectionnez une matière pour le Groupe 6 (Arts).","error"); return; }
    if (!prend6 && !optGrp?.matiere) { showBanner("Sélectionnez la matière optionnelle (remplacement du Groupe 6).","error"); return; }

    // Vérifier NS/NM
    const allMatieres = [1,2,3,4,5].map(n => matieres[n]?.niveau);
    if (prend6) allMatieres.push(matieres[6]?.niveau);
    else allMatieres.push(optGrp?.niveau);

    const nbNS = allMatieres.filter(n => n==="NS").length;
    const nbNM = allMatieres.filter(n => n==="NM").length;
    if (nbNS !== 3 || nbNM !== 3) {
      showBanner(`Il faut exactement 3 NS et 3 NM. Actuellement : ${nbNS} NS, ${nbNM} NM.`,"error");
      return;
    }

    setSaving(true);
    await supabaseAdmin.from("eleve_matieres").delete().eq("eleve_id",selEleve.id).eq("annee_scolaire",selAnnee);

    const rows = [];
    // Groupes 1-5
    [1,2,3,4,5].forEach(n => {
      const g = GROUPES.find(g => g.num===n);
      rows.push({ eleve_id:selEleve.id, matiere:matieres[n].matiere, groupe_matiere:g.label, niveau:matieres[n].niveau, annee_scolaire:selAnnee });
    });

    // Groupe 6 ou option
    if (prend6) {
      rows.push({ eleve_id:selEleve.id, matiere:matieres[6].matiere, groupe_matiere:GROUPES[5].label, niveau:matieres[6].niveau, annee_scolaire:selAnnee });
    } else {
      const og = OPTION_GROUPES.find(og => og.grp===optGrp.grp);
      rows.push({ eleve_id:selEleve.id, matiere:optGrp.matiere, groupe_matiere:og.label+" (Option Gr.6)", niveau:optGrp.niveau, annee_scolaire:selAnnee });
    }

    // Tronc commun
    TRONC.forEach(t => {
      if (tronc[t]) rows.push({ eleve_id:selEleve.id, matiere:t, groupe_matiere:"Tronc commun", niveau:null, annee_scolaire:selAnnee });
    });

    await supabaseAdmin.from("eleve_matieres").insert(rows);
    setSaving(false);
    showBanner(`✓ Matières de ${selEleve.prenom} ${selEleve.nom} enregistrées.`,"success");
  }

  function setGrpMatiere(num, matiere) { setMatieres(prev => ({ ...prev, [num]:{ matiere, niveau:prev[num]?.niveau||"NM" } })); }
  function setGrpNiveau(num, niveau)   { setMatieres(prev => ({ ...prev, [num]:{ ...prev[num], niveau } })); }
  function showBanner(msg, type) { setBanner({msg,type}); setTimeout(()=>setBanner(null),5000); }

  const allNiveaux = [...[1,2,3,4,5].map(n => matieres[n]?.niveau), prend6 ? matieres[6]?.niveau : optGrp?.niveau].filter(Boolean);
  const nbNS = allNiveaux.filter(n=>n==="NS").length;
  const nbNM = allNiveaux.filter(n=>n==="NM").length;
  const nbRemplis = [1,2,3,4,5].filter(n=>matieres[n]?.matiere).length + (prend6 ? (matieres[6]?.matiere?1:0) : (optGrp?.matiere?1:0));

  const filteredEleves = eleves.filter(e => `${e.nom} ${e.prenom}`.toLowerCase().includes(search.toLowerCase()));

  const S = {
    page:    { minHeight:"100vh", background:"#f5f7fa", fontFamily:"sans-serif" },
    nav:     { background:"#1B3A6B", padding:"0 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 },
    navL:    { display:"flex", alignItems:"center", gap:12 },
    navLogo: { width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700 },
    navT:    { color:"#fff", fontWeight:600, fontSize:15 },
    navS:    { color:"rgba(255,255,255,0.6)", fontSize:12 },
    navBtn:  { padding:"6px 14px",background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",borderRadius:7,fontSize:13,cursor:"pointer" },
    wrap:    { padding:"1.5rem", maxWidth:1100, margin:"0 auto" },
    banner:  (t) => ({ padding:"10px 14px",borderRadius:8,fontSize:13,marginBottom:"1rem",background:t==="success"?"#EAF3DE":"#FCEBEB",color:t==="success"?"#27500A":"#A32D2D",border:`1px solid ${t==="success"?"#C0DD97":"#F7C1C1"}` }),
    grid:    { display:"grid", gridTemplateColumns:"280px 1fr", gap:16 },
    eCard:   (sel) => ({ background:sel?"#E6F1FB":"#fff", border:`1px solid ${sel?"#B5D4F4":"#eee"}`, borderRadius:12, padding:"10px 14px", marginBottom:8, cursor:"pointer" }),
    eName:   { fontSize:13, fontWeight:500, margin:0, color:"#111" },
    eSub:    { fontSize:11, color:"#888", margin:"2px 0 0" },
    grpCard: { background:"#fff", border:"1px solid #eee", borderRadius:12, padding:"1.25rem", marginBottom:10 },
    grpT:    { fontSize:13, fontWeight:600, color:"#1B3A6B", margin:"0 0 10px", display:"flex", alignItems:"center", gap:6 },
    grid2:   { display:"grid", gridTemplateColumns:"1fr 100px", gap:8 },
    lbl:     { display:"block", fontSize:12, color:"#666", marginBottom:3, fontWeight:500 },
    sel:     { width:"100%", padding:"8px 10px", border:"1px solid #ddd", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box" },
    inp:     { width:"100%", padding:"8px 10px", border:"1px solid #ddd", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box" },
    badge:   (ok) => ({ fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:500,background:ok?"#EAF3DE":"#f5f5f5",color:ok?"#27500A":"#aaa" }),
    btnP:    { padding:"9px 20px",background:"#1B3A6B",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer" },
    btnSm:   { padding:"5px 10px",background:"transparent",color:"#555",border:"1px solid #ddd",borderRadius:7,fontSize:12,cursor:"pointer" },
    tcRow:   { display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid #f5f5f5" },
    toggle:  (on) => ({ display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:9,border:`1px solid ${on?"#1B3A6B":"#ddd"}`,background:on?"#E6F1FB":"transparent",cursor:"pointer",fontSize:13,fontWeight:on?500:400,color:on?"#1B3A6B":"#555",marginRight:8 }),
  };

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh" }}>Chargement...</div>;

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={S.navL}>
          <div style={S.navLogo}>E</div>
          <div><div style={S.navT}>EPIA — Admin</div><div style={S.navS}>Matières des élèves</div></div>
        </div>
        <button style={S.navBtn} onClick={() => navigate("/admin")}>← Admin</button>
      </nav>

      <div style={S.wrap}>
        {banner && <div style={S.banner(banner.type)}>{banner.msg}</div>}

        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem",flexWrap:"wrap",gap:8 }}>
          <h1 style={{ fontSize:20,fontWeight:600,margin:0,color:"#111" }}>📚 Matières des élèves</h1>
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <span style={{ fontSize:13,color:"#555" }}>Année :</span>
            <select style={{ ...S.sel,width:140 }} value={selAnnee} onChange={e => { setSelAnnee(e.target.value); if(selEleve) loadMatieres(selEleve.id, e.target.value); }}>
              {annees.map(a => <option key={a.id} value={a.annee}>{a.annee}{a.active?" ★":""}</option>)}
            </select>
          </div>
        </div>

        <div style={S.grid}>
          {/* Liste élèves */}
          <div>
            <input style={{ ...S.inp,marginBottom:10 }} placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
            <div style={{ maxHeight:"calc(100vh - 220px)",overflowY:"auto" }}>
              {filteredEleves.map(e => (
                <div key={e.id} style={S.eCard(selEleve?.id===e.id)} onClick={() => selectEleve(e)}>
                  <p style={S.eName}>{e.prenom} {e.nom}</p>
                  <p style={S.eSub}>{e.annee_pd} · {e.annee_scolaire}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Assignation */}
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
                    <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
                      <span style={S.badge(nbRemplis===6)}>{nbRemplis}/6 matières</span>
                      <span style={S.badge(nbNS===3)}>NS: {nbNS}/3</span>
                      <span style={S.badge(nbNM===3)}>NM: {nbNM}/3</span>
                      <button style={S.btnP} onClick={saveMatieres} disabled={saving}>{saving?"Enregistrement...":"💾 Enregistrer"}</button>
                    </div>
                  </div>

                  {/* Groupes 1 à 5 */}
                  {GROUPES.filter(g => g.num <= 5).map(g => (
                    <div key={g.num} style={S.grpCard}>
                      <p style={S.grpT}>
                        <span style={{ background:"#1B3A6B",color:"#fff",borderRadius:6,padding:"2px 8px",fontSize:11 }}>Groupe {g.num}</span>
                        {g.label.split("—")[1]?.trim()}
                      </p>
                      <div style={S.grid2}>
                        <div>
                          <label style={S.lbl}>Matière</label>
                          <select style={S.sel} value={matieres[g.num]?.matiere||""} onChange={e => setGrpMatiere(g.num, e.target.value)}>
                            <option value="">-- Choisir --</option>
                            {g.matieres.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={S.lbl}>Niveau</label>
                          <select style={S.sel} value={matieres[g.num]?.niveau||"NM"} onChange={e => setGrpNiveau(g.num, e.target.value)} disabled={!matieres[g.num]?.matiere}>
                            <option value="NM">NM</option>
                            <option value="NS">NS</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Groupe 6 — Arts ou Option */}
                  <div style={{ ...S.grpCard, border:"1px solid #B5D4F4" }}>
                    <p style={S.grpT}>
                      <span style={{ background:"#185FA5",color:"#fff",borderRadius:6,padding:"2px 8px",fontSize:11 }}>Groupe 6</span>
                      Arts ou Matière optionnelle
                    </p>

                    {/* Toggle Arts / Option */}
                    <div style={{ display:"flex",marginBottom:"1rem" }}>
                      <button style={S.toggle(prend6)} onClick={() => setPrend6(true)}>🎨 Prend Arts</button>
                      <button style={S.toggle(!prend6)} onClick={() => setPrend6(false)}>📖 Option (autre groupe)</button>
                    </div>

                    {prend6 ? (
                      <div style={S.grid2}>
                        <div>
                          <label style={S.lbl}>Matière Arts</label>
                          <select style={S.sel} value={matieres[6]?.matiere||""} onChange={e => setGrpMatiere(6, e.target.value)}>
                            <option value="">-- Choisir --</option>
                            {GROUPES[5].matieres.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={S.lbl}>Niveau</label>
                          <select style={S.sel} value={matieres[6]?.niveau||"NM"} onChange={e => setGrpNiveau(6, e.target.value)} disabled={!matieres[6]?.matiere}>
                            <option value="NM">NM</option>
                            <option value="NS">NS</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ background:"#FFF9EC",border:"1px solid #FAC775",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#633806",marginBottom:10 }}>
                          ℹ️ L'élève ne prend pas Arts. Il/elle choisit une 2ème matière dans un autre groupe.
                        </div>
                        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 100px",gap:8 }}>
                          <div>
                            <label style={S.lbl}>Groupe de remplacement</label>
                            <select style={S.sel} value={optGrp?.grp||3} onChange={e => setOptGrp(prev => ({ ...prev, grp:Number(e.target.value), matiere:"" }))}>
                              {OPTION_GROUPES.map(og => <option key={og.grp} value={og.grp}>Groupe {og.grp}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={S.lbl}>2ème matière</label>
                            <select style={S.sel} value={optGrp?.matiere||""} onChange={e => setOptGrp(prev => ({ ...prev, matiere:e.target.value }))}>
                              <option value="">-- Choisir --</option>
                              {(OPTION_GROUPES.find(og => og.grp===optGrp?.grp)?.matieres||[])
                                .filter(m => m !== matieres[optGrp?.grp]?.matiere)
                                .map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={S.lbl}>Niveau</label>
                            <select style={S.sel} value={optGrp?.niveau||"NM"} onChange={e => setOptGrp(prev => ({ ...prev, niveau:e.target.value }))} disabled={!optGrp?.matiere}>
                              <option value="NM">NM</option>
                              <option value="NS">NS</option>
                            </select>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Tronc commun */}
                  <div style={S.grpCard}>
                    <p style={S.grpT}>🎓 Tronc commun</p>
                    {TRONC.map(t => (
                      <div key={t} style={S.tcRow}>
                        <input type="checkbox" id={t} checked={tronc[t]||false} onChange={e => setTronc(prev => ({ ...prev, [t]:e.target.checked }))} style={{ width:"auto",cursor:"pointer" }} />
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
