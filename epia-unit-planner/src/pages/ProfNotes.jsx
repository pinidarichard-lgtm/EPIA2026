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

function calcPct(eprDetail, epreuves) {
  if (!epreuves || epreuves.length === 0) return null;
  let total = 0, pctUsed = 0;
  epreuves.forEach(ep => {
    const v = parseFloat(eprDetail[ep.nom]);
    if (!isNaN(v)) { total += (v / ep.bareme) * ep.pourcentage; pctUsed += ep.pourcentage; }
  });
  if (pctUsed === 0) return null;
  return (total / pctUsed) * 100;
}

function calcNote7(pct, frontieres) {
  if (pct === null || !frontieres) return null;
  for (const n of [7,6,5,4,3,2,1]) {
    if (pct >= Number(frontieres[n])) return n;
  }
  return 1;
}

function note7Color(n) {
  if (!n) return "#aaa";
  if (n >= 6) return "#27500A"; if (n >= 4) return "#185FA5";
  if (n >= 3) return "#8B6914"; return "#A32D2D";
}

export default function ProfNotes() {
  const [prof,      setProf]      = useState(null);
  const [annees,    setAnnees]    = useState([]);
  const [configs,   setConfigs]   = useState([]); // ib_matieres_config
  const [eleves,    setEleves]    = useState([]);
  const [selConfig, setSelConfig] = useState(null);
  const [selAnnee,  setSelAnnee]  = useState("");
  const [selPd,     setSelPd]     = useState("D1");
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [banner,    setBanner]    = useState(null);
  // saisie[eleveId][nomEpreuve] = valeur
  const [saisie,    setSaisie]    = useState({});
  const [comments,  setComments]  = useState({});
  const [existing,  setExisting]  = useState([]);
  const navigate = useNavigate();

  useEffect(() => { loadInit(); }, []);
  useEffect(() => { if (selAnnee && prof) loadConfigs(); }, [selAnnee, selPd, prof]);
  useEffect(() => { if (selConfig && eleves.length > 0) loadExisting(); }, [selConfig, selAnnee]);

  async function loadInit() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profD } = await supabaseAdmin.from("profs").select("*").eq("auth_id", user.id).single();
    setProf(profD);
    const { data: a } = await supabaseAdmin.from("annees_scolaires").select("*").order("annee", { ascending:false });
    setAnnees(a || []);
    const active = (a||[]).find(x => x.active);
    const ann = active?.annee || a?.[0]?.annee || "2024-2025";
    setSelAnnee(ann);
    setLoading(false);
  }

  async function loadConfigs() {
    if (!prof) return;
    // 1. Matières assignées au prof
    const { data: profMat } = await supabaseAdmin.from("prof_matieres")
      .select("*").eq("prof_id", prof.id).eq("annee_scolaire", selAnnee).eq("annee_pd", selPd);
    if (!profMat || profMat.length === 0) {
      setConfigs([]); setEleves([]); setSelConfig(null); setSaisie({}); setComments({}); setExisting([]);
      return;
    }
    // 2. Charger les configs IB correspondantes
    const matiereIds = profMat.map(m => m.matiere);
    const niveauIds  = profMat.map(m => m.niveau);
    const { data: cfg } = await supabaseAdmin.from("ib_matieres_config")
      .select("*").eq("annee_scolaire", selAnnee).eq("annee_pd", selPd).eq("actif", true)
      .in("matiere", matiereIds).order("groupe_matiere").order("matiere");
    // Filtrer par niveau aussi
    const filtered = (cfg||[]).filter(c => profMat.some(pm => pm.matiere===c.matiere && pm.niveau===c.niveau));
    // 3. Élèves
    const { data: e } = await supabaseAdmin.from("eleves")
      .select("*").eq("annee_pd", selPd).eq("annee_scolaire", selAnnee).eq("actif", true).order("nom");
    setConfigs(filtered);
    setEleves(e || []);
    setSelConfig(null);
    setSaisie({});
    setComments({});
    setExisting([]);
  }

  async function loadExisting() {
    if (!selConfig) return;
    const ids = eleves.map(e => e.id);
    if (ids.length === 0) return;
    const { data } = await supabaseAdmin.from("notes")
      .select("*").in("eleve_id", ids)
      .eq("matiere", selConfig.matiere).eq("annee_scolaire", selAnnee);
    setExisting(data || []);
    // Pré-remplir
    const s = {}, c = {};
    (data||[]).forEach(n => {
      if (n.epreuves_detail) s[n.eleve_id] = n.epreuves_detail;
      c[n.eleve_id] = n.commentaire || "";
    });
    setSaisie(s);
    setComments(c);
  }

  async function saveNotes() {
    if (!selConfig) { showBanner("Sélectionnez une matière.", "error"); return; }
    setSaving(true);
    const nomProf = prof ? `${prof.prenom} ${prof.nom}` : "";
    let saved = 0;
    for (const eleve of eleves) {
      const eprDetail = saisie[eleve.id] || {};
      const hasVal = Object.values(eprDetail).some(v => v !== "" && v !== undefined);
      if (!hasVal) continue;
      const pct   = calcPct(eprDetail, selConfig.epreuves);
      const note7 = calcNote7(pct, selConfig.frontieres);
      const ex    = existing.find(n => n.eleve_id === eleve.id);
      const payload = {
        eleve_id:       eleve.id,
        matiere:        selConfig.matiere,
        groupe_matiere: selConfig.groupe_matiere,
        annee_pd:       selPd,
        annee_scolaire: selAnnee,
        periode:        "Évaluation IB",
        note:           note7 || 0,
        commentaire:    comments[eleve.id] || "",
        enseignant:     nomProf,
        epreuves_detail: eprDetail,
      };
      if (ex) await supabaseAdmin.from("notes").update(payload).eq("id", ex.id);
      else    await supabaseAdmin.from("notes").insert(payload);
      saved++;
    }
    await loadExisting();
    setSaving(false);
    showBanner(`✓ ${saved} note(s) enregistrée(s).`, "success");
  }

  function showBanner(msg, type) { setBanner({msg,type}); setTimeout(()=>setBanner(null),4000); }

  // Stats
  const notes7 = eleves.map(e => {
    const pct = calcPct(saisie[e.id]||{}, selConfig?.epreuves||[]);
    return calcNote7(pct, selConfig?.frontieres);
  }).filter(n => n !== null);
  const moy7 = notes7.length > 0 ? (notes7.reduce((a,b)=>a+b,0)/notes7.length).toFixed(2) : "—";
  const savedCount = existing.length;

  // Group configs by groupe
  const byGroupe = {};
  configs.forEach(c => {
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
    wrap:    { padding:"1.5rem", maxWidth:1200, margin:"0 auto" },
    banner:  (t) => ({ padding:"10px 14px",borderRadius:8,fontSize:13,marginBottom:"1rem",background:t==="success"?"#EAF3DE":"#FCEBEB",color:t==="success"?"#27500A":"#A32D2D",border:`1px solid ${t==="success"?"#C0DD97":"#F7C1C1"}` }),
    layout:  { display:"grid", gridTemplateColumns:"280px 1fr", gap:16 },
    tabs:    { display:"flex", gap:6, marginBottom:12 },
    tab:     (a,c) => ({ padding:"7px 16px",border:"1px solid",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:a?600:400,background:a?c:"transparent",color:a?"#fff":"#555",borderColor:a?c:"#ddd" }),
    selAnn:  { padding:"8px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",width:"100%",marginBottom:10 },
    grpLabel:{ fontSize:11,fontWeight:700,color:"#888",padding:"4px 8px",background:"#f5f5f5",borderRadius:5,marginBottom:4,display:"block" },
    cfgBtn:  (sel) => ({ display:"block",width:"100%",textAlign:"left",padding:"8px 12px",border:`1px solid ${sel?"#1B3A6B":"#eee"}`,borderRadius:8,background:sel?"#E6F1FB":"#fff",cursor:"pointer",marginBottom:4,fontSize:13 }),
    cfgName: { fontWeight:500,color:"#111",margin:0,fontSize:13 },
    cfgSub:  { fontSize:10,color:"#888",margin:"1px 0 0" },
    card:    { background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1.25rem" },
    topRow:  { display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:8 },
    statRow: { display:"flex",gap:10,flexWrap:"wrap",marginBottom:"1rem" },
    stat:    (c) => ({ background:c+"15",border:`1px solid ${c}30`,borderRadius:8,padding:"6px 14px",fontSize:13,color:c,fontWeight:500 }),
    table:   { width:"100%",borderCollapse:"collapse" },
    th:      { padding:"8px 10px",textAlign:"left",fontSize:11,fontWeight:600,color:"#888",borderBottom:"2px solid #eee",background:"#fafafa",whiteSpace:"nowrap" },
    thC:     { padding:"8px 10px",textAlign:"center",fontSize:11,fontWeight:600,color:"#888",borderBottom:"2px solid #eee",background:"#fafafa",whiteSpace:"nowrap" },
    td:      { padding:"7px 10px",fontSize:13,borderBottom:"1px solid #f5f5f5",color:"#111",verticalAlign:"middle" },
    tdC:     { padding:"7px 10px",fontSize:13,borderBottom:"1px solid #f5f5f5",textAlign:"center",verticalAlign:"middle" },
    epInp:   { width:64,padding:"5px 6px",border:"1px solid #ddd",borderRadius:6,fontSize:12,textAlign:"center",outline:"none" },
    cmInp:   { width:"100%",padding:"5px 8px",border:"1px solid #ddd",borderRadius:6,fontSize:11,outline:"none",boxSizing:"border-box" },
    note7:   (n) => ({ display:"inline-flex",alignItems:"center",justifyContent:"center",width:32,height:32,borderRadius:7,fontSize:15,fontWeight:700,background:n?note7Color(n)+"20":"#f5f5f5",color:note7Color(n) }),
    pct:     { fontSize:10,color:"#aaa" },
    btnP:    { padding:"8px 20px",background:"#1B3A6B",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer" },
    btnSm:   { padding:"5px 12px",background:"transparent",color:"#555",border:"1px solid #ddd",borderRadius:7,fontSize:12,cursor:"pointer" },
    empty:   { textAlign:"center",padding:"3rem",color:"#aaa" },
    nivTag:  (n) => ({ fontSize:10,padding:"2px 6px",borderRadius:4,fontWeight:600,background:n==="NS"?"#FFF9EC":"#E6F1FB",color:n==="NS"?"#8B6914":"#185FA5",marginLeft:4 }),
    saved:   { fontSize:10,padding:"2px 6px",borderRadius:10,background:"#EAF3DE",color:"#27500A",fontWeight:500 },
  };

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh" }}>Chargement...</div>;

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={S.navL}>
          <div style={S.navLogo}>E</div>
          <div><div style={S.navT}>EPIA — Saisie des notes</div><div style={S.navS}>{prof?.prenom} {prof?.nom}</div></div>
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <button style={S.navBtn} onClick={() => navigate("/prof/dashboard")}>🏠 Dashboard</button>
          <button style={S.navBtn} onClick={async()=>{ await supabase.auth.signOut(); navigate("/login"); }}>Déconnexion</button>
        </div>
      </nav>

      <div style={S.wrap}>
        {banner && <div style={S.banner(banner.type)}>{banner.msg}</div>}

        <div style={S.layout}>

          {/* ── Colonne gauche : sélection matière ── */}
          <div>
            {/* Année */}
            <select style={S.selAnn} value={selAnnee} onChange={e => setSelAnnee(e.target.value)}>
              {annees.map(a => <option key={a.id} value={a.annee}>{a.annee}{a.active?" ★":""}</option>)}
            </select>

            {/* D1 / D2 tabs */}
            <div style={S.tabs}>
              <button style={S.tab(selPd==="D1","#1B3A6B")} onClick={() => setSelPd("D1")}>D1</button>
              <button style={S.tab(selPd==="D2","#1a5c2a")} onClick={() => setSelPd("D2")}>D2</button>
            </div>

            {/* Liste matières par groupe */}
            {configs.length === 0
              ? <div style={{ fontSize:12,color:"#FFF9EC",background:"#FFF9EC",border:"1px solid #FAC775",borderRadius:8,padding:"10px",color:"#633806" }}>
                  {prof ? "Aucune matière assignée pour " + selPd + " — " + selAnnee + ". Contactez l'administrateur." : "Chargement..."}
                </div>
              : Object.entries(byGroupe).map(([grp, items]) => (
                <div key={grp} style={{ marginBottom:12 }}>
                  <span style={S.grpLabel}>{grp.split("—")[0]?.trim()}</span>
                  {items.map(cfg => {
                    const isSel = selConfig?.id === cfg.id;
                    const hasSaved = existing.filter(n => n.matiere===cfg.matiere).length;
                    return (
                      <button key={cfg.id} style={S.cfgBtn(isSel)} onClick={() => setSelConfig(cfg)}>
                        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                          <p style={S.cfgName}>{cfg.matiere.split("—")[0]?.trim()}</p>
                          <span style={S.nivTag(cfg.niveau)}>{cfg.niveau}</span>
                        </div>
                        <p style={S.cfgSub}>
                          {cfg.epreuves?.length||0} épreuve(s)
                          {hasSaved > 0 && <span style={{ ...S.saved,marginLeft:6 }}>✓ {hasSaved} saisie(s)</span>}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ))
            }
          </div>

          {/* ── Colonne droite : tableau de saisie ── */}
          <div>
            {!selConfig
              ? <div style={{ ...S.card, ...S.empty }}>
                  <p style={{ fontSize:32,margin:"0 0 8px" }}>📝</p>
                  <p style={{ fontSize:14 }}>Sélectionnez une matière à gauche pour commencer la saisie.</p>
                </div>
              : <div style={S.card}>
                  <div style={S.topRow}>
                    <div>
                      <h2 style={{ fontSize:17,fontWeight:600,margin:0,color:"#111" }}>
                        {selConfig.matiere}
                        <span style={S.nivTag(selConfig.niveau)}>{selConfig.niveau}</span>
                      </h2>
                      <p style={{ fontSize:12,color:"#888",margin:"3px 0 0" }}>
                        {selConfig.groupe_matiere} · {selPd} · {selAnnee}
                      </p>
                    </div>
                    <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
                      <div style={S.stat("#185FA5")}>Moy. classe : {moy7}/7</div>
                      <div style={S.stat("#27500A")}>{notes7.length}/{eleves.length} calculées</div>
                      <div style={S.stat("#8B6914")}>{savedCount} sauvegardées</div>
                      <button style={S.btnP} onClick={saveNotes} disabled={saving}>
                        {saving?"Enregistrement...":"💾 Enregistrer"}
                      </button>
                    </div>
                  </div>

                  {/* Info frontières */}
                  <div style={{ display:"flex",gap:4,flexWrap:"wrap",marginBottom:"1rem" }}>
                    {[7,6,5,4,3,2,1].map(n => (
                      <span key={n} style={{ fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:500,background:n>=5?"#EAF3DE":n>=3?"#FFF9EC":"#FCEBEB",color:n>=5?"#27500A":n>=3?"#8B6914":"#A32D2D" }}>
                        {n} ≥ {selConfig.frontieres?.[n]}%
                      </span>
                    ))}
                  </div>

                  {eleves.length === 0
                    ? <p style={{ color:"#aaa",fontSize:13,textAlign:"center",padding:"2rem" }}>Aucun élève en {selPd} pour {selAnnee}.</p>
                    : <div style={{ overflowX:"auto" }}>
                        <table style={S.table}>
                          <thead>
                            <tr>
                              <th style={S.th}>#</th>
                              <th style={S.th}>Élève</th>
                              {selConfig.epreuves.map((ep,i) => (
                                <th key={i} style={S.thC}>
                                  {ep.nom.replace("Évaluation Interne","EI").replace("Épreuve","Ép.")}
                                  <div style={{ fontSize:9,color:"#aaa",fontWeight:400 }}>/{ep.bareme} · {ep.pourcentage}%</div>
                                </th>
                              ))}
                              <th style={S.thC}>% final</th>
                              <th style={S.thC}>Note /7</th>
                              <th style={{ ...S.th,minWidth:160 }}>Commentaire</th>
                              <th style={S.thC}>Statut</th>
                            </tr>
                          </thead>
                          <tbody>
                            {eleves.map((e,i) => {
                              const eprDetail = saisie[e.id] || {};
                              const pct   = calcPct(eprDetail, selConfig.epreuves);
                              const note7 = calcNote7(pct, selConfig.frontieres);
                              const isSaved = existing.some(n => n.eleve_id === e.id);
                              return (
                                <tr key={e.id} style={{ background:i%2===0?"#fff":"#fafafa" }}>
                                  <td style={{ ...S.tdC,color:"#aaa",fontSize:11 }}>{i+1}</td>
                                  <td style={S.td}>
                                    <div style={{ fontWeight:500 }}>{e.prenom} {e.nom}</div>
                                    <div style={{ fontSize:11,color:"#aaa" }}>{e.email}</div>
                                  </td>
                                  {selConfig.epreuves.map((ep,j) => (
                                    <td key={j} style={S.tdC}>
                                      <input
                                        style={S.epInp}
                                        type="number" min={0} max={ep.bareme} step={0.5}
                                        placeholder="—"
                                        value={eprDetail[ep.nom] ?? ""}
                                        onChange={ev => setSaisie(prev => ({
                                          ...prev,
                                          [e.id]: { ...(prev[e.id]||{}), [ep.nom]: ev.target.value }
                                        }))}
                                      />
                                    </td>
                                  ))}
                                  <td style={S.tdC}>
                                    <span style={S.pct}>{pct !== null ? pct.toFixed(1)+"%" : "—"}</span>
                                  </td>
                                  <td style={S.tdC}>
                                    <span style={S.note7(note7)}>{note7 || "—"}</span>
                                  </td>
                                  <td style={S.td}>
                                    <input
                                      style={S.cmInp}
                                      type="text" placeholder="Commentaire..."
                                      value={comments[e.id]||""}
                                      onChange={ev => setComments(prev=>({...prev,[e.id]:ev.target.value}))}
                                    />
                                  </td>
                                  <td style={S.tdC}>
                                    {isSaved
                                      ? <span style={S.saved}>✓ Sauvé</span>
                                      : <span style={{ fontSize:10,color:"#ccc" }}>—</span>
                                    }
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                  }

                  <div style={{ textAlign:"right",marginTop:"1rem" }}>
                    <button style={S.btnP} onClick={saveNotes} disabled={saving}>
                      {saving?"Enregistrement...":"💾 Enregistrer toutes les notes"}
                    </button>
                  </div>
                </div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
