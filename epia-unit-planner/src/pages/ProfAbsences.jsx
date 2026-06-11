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

export default function ProfAbsences() {
  const [prof,      setProf]      = useState(null);
  const [annees,    setAnnees]    = useState([]);
  const [matieres,  setMatieres]  = useState([]); // prof_matieres
  const [eleves,    setEleves]    = useState([]);
  const [absences,  setAbsences]  = useState([]);
  const [selAnnee,  setSelAnnee]  = useState("");
  const [selPd,     setSelPd]     = useState("D1");
  const [selMat,    setSelMat]    = useState(null);
  const [selDate,   setSelDate]   = useState(new Date().toISOString().split("T")[0]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [banner,    setBanner]    = useState(null);
  // presence[eleveId] = "present"|"absent"|"retard"
  const [presence,  setPresence]  = useState({});
  const [justifs,   setJustifs]   = useState({});
  const [view,      setView]      = useState("appel"); // "appel" | "historique"
  const navigate = useNavigate();

  useEffect(() => { loadInit(); }, []);
  useEffect(() => { if (selAnnee && prof) loadMatieres(); }, [selAnnee, selPd, prof]);
  useEffect(() => { if (selMat && eleves.length > 0) loadAbsences(); }, [selMat, selDate]);

  async function loadInit() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profD } = await supabaseAdmin.from("profs").select("*").eq("auth_id", user.id).single();
    setProf(profD);
    const { data: a } = await supabaseAdmin.from("annees_scolaires").select("*").order("annee", { ascending:false });
    setAnnees(a||[]);
    const active = (a||[]).find(x => x.active);
    const ann = active?.annee || a?.[0]?.annee || "2024-2025";
    setSelAnnee(ann);
    setLoading(false);
  }

  async function loadMatieres() {
    if (!prof) return;
    const { data: mat } = await supabaseAdmin.from("prof_matieres")
      .select("*").eq("prof_id", prof.id).eq("annee_scolaire", selAnnee).eq("annee_pd", selPd);
    setMatieres(mat||[]);
    const { data: e } = await supabaseAdmin.from("eleves")
      .select("*").eq("annee_pd", selPd).eq("annee_scolaire", selAnnee).eq("actif", true).order("nom");
    setEleves(e||[]);
    setSelMat(null);
    setPresence({});
  }

  async function loadAbsences() {
    if (!selMat) return;
    const ids = eleves.map(e => e.id);
    if (ids.length === 0) return;
    const { data } = await supabaseAdmin.from("absences")
      .select("*").in("eleve_id", ids)
      .eq("matiere", selMat.matiere).eq("annee_scolaire", selAnnee)
      .order("date_absence", { ascending:false });
    setAbsences(data||[]);

    // Pré-remplir appel du jour
    const today = (data||[]).filter(a => a.date_absence === selDate);
    const p = {}, j = {};
    eleves.forEach(e => { p[e.id] = "present"; });
    today.forEach(a => {
      p[a.eleve_id] = a.statut || "absent";
      j[a.eleve_id] = a.justifie || false;
    });
    setPresence(p);
    setJustifs(j);
  }

  async function saveAppel() {
    if (!selMat) { showBanner("Sélectionnez une matière.", "error"); return; }
    setSaving(true);
    const nomProf = prof ? `${prof.prenom} ${prof.nom}` : "";

    // Supprimer les absences existantes pour ce jour/matière
    const ids = eleves.map(e => e.id);
    await supabaseAdmin.from("absences").delete()
      .in("eleve_id", ids).eq("matiere", selMat.matiere)
      .eq("date_absence", selDate).eq("annee_scolaire", selAnnee);

    // Insérer les absents et retards
    const rows = eleves
      .filter(e => presence[e.id] === "absent" || presence[e.id] === "retard")
      .map(e => ({
        eleve_id:       e.id,
        date_absence:   selDate,
        matiere:        selMat.matiere,
        periode:        selPd,
        annee_pd:       selPd,
        annee_scolaire: selAnnee,
        statut:         presence[e.id],
        justifie:       justifs[e.id] || false,
        commentaire:    "",
      }));

    if (rows.length > 0) await supabaseAdmin.from("absences").insert(rows);
    await loadAbsences();
    setSaving(false);
    const nbAbs = rows.filter(r => r.statut==="absent").length;
    const nbRet = rows.filter(r => r.statut==="retard").length;
    showBanner(`✓ Appel enregistré — ${nbAbs} absent(s), ${nbRet} retard(s).`, "success");
  }

  async function toggleJustif(absId, current) {
    await supabaseAdmin.from("absences").update({ justifie: !current }).eq("id", absId);
    setAbsences(prev => prev.map(a => a.id === absId ? { ...a, justifie: !current } : a));
    showBanner("✓ Justification mise à jour.", "success");
  }

  function showBanner(msg, type) { setBanner({msg,type}); setTimeout(()=>setBanner(null),4000); }

  const nbAbsents = eleves.filter(e => presence[e.id] === "absent").length;
  const nbRetards = eleves.filter(e => presence[e.id] === "retard").length;
  const nbPresents = eleves.length - nbAbsents - nbRetards;

  // Historique groupé par date
  const histByDate = {};
  absences.forEach(a => {
    if (!histByDate[a.date_absence]) histByDate[a.date_absence] = [];
    histByDate[a.date_absence].push(a);
  });

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
    layout:  { display:"grid", gridTemplateColumns:"260px 1fr", gap:16 },
    card:    { background:"#fff", border:"1px solid #eee", borderRadius:12, padding:"1.25rem" },
    tabs:    { display:"flex", gap:6, marginBottom:10 },
    tab:     (a,c) => ({ padding:"7px 16px",border:"1px solid",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:a?600:400,background:a?c:"transparent",color:a?"#fff":"#555",borderColor:a?c:"#ddd" }),
    pdTab:   { display:"flex", gap:6, marginBottom:10 },
    selAnn:  { width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",marginBottom:8 },
    matBtn:  (sel) => ({ display:"block",width:"100%",textAlign:"left",padding:"8px 12px",border:`1px solid ${sel?"#1B3A6B":"#eee"}`,borderRadius:8,background:sel?"#E6F1FB":"#fff",cursor:"pointer",marginBottom:4,fontSize:13,fontFamily:"sans-serif" }),
    matName: { fontWeight:500, color:"#111", margin:0, fontSize:13 },
    matSub:  { fontSize:10, color:"#888", margin:"1px 0 0" },
    statRow: { display:"flex", gap:10, marginBottom:"1rem" },
    stat:    (c) => ({ flex:1,textAlign:"center",background:c+"15",border:`1px solid ${c}30`,borderRadius:8,padding:"8px",fontSize:13,color:c,fontWeight:600 }),
    statN:   { fontSize:22, fontWeight:700, display:"block" },
    table:   { width:"100%", borderCollapse:"collapse" },
    th:      { padding:"8px 10px",textAlign:"left",fontSize:11,fontWeight:600,color:"#888",borderBottom:"2px solid #eee",background:"#fafafa" },
    thC:     { padding:"8px 10px",textAlign:"center",fontSize:11,fontWeight:600,color:"#888",borderBottom:"2px solid #eee",background:"#fafafa" },
    td:      { padding:"8px 10px",fontSize:13,borderBottom:"1px solid #f5f5f5",color:"#111",verticalAlign:"middle" },
    tdC:     { padding:"8px 10px",fontSize:13,borderBottom:"1px solid #f5f5f5",textAlign:"center",verticalAlign:"middle" },
    presBtn: (status, type) => ({
      padding:"5px 12px", borderRadius:6, fontSize:12, fontWeight:500, cursor:"pointer",
      border:`1px solid ${status===type ? (type==="present"?"#27500A":type==="retard"?"#8B6914":"#A32D2D") : "#ddd"}`,
      background: status===type ? (type==="present"?"#EAF3DE":type==="retard"?"#FFF9EC":"#FCEBEB") : "transparent",
      color: status===type ? (type==="present"?"#27500A":type==="retard"?"#8B6914":"#A32D2D") : "#aaa",
    }),
    btnP:    { padding:"8px 20px",background:"#1B3A6B",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer" },
    nivTag:  (n) => ({ fontSize:10,padding:"2px 6px",borderRadius:4,fontWeight:600,background:n==="NS"?"#FFF9EC":"#E6F1FB",color:n==="NS"?"#8B6914":"#185FA5",marginLeft:4 }),
    dateInp: { padding:"7px 10px",border:"1px solid #ddd",borderRadius:7,fontSize:13,outline:"none" },
    histDate:{ fontWeight:600,fontSize:13,color:"#1B3A6B",padding:"6px 0",borderBottom:"1px solid #eee",marginBottom:6 },
    histRow: { display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",fontSize:13,borderBottom:"1px solid #f9f9f9" },
    justBtn: (on) => ({ fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:500,cursor:"pointer",border:`1px solid ${on?"#C0DD97":"#ddd"}`,background:on?"#EAF3DE":"transparent",color:on?"#27500A":"#888" }),
    absTag:  (s) => ({ fontSize:11,padding:"2px 8px",borderRadius:20,fontWeight:500,background:s==="absent"?"#FCEBEB":s==="retard"?"#FFF9EC":"#EAF3DE",color:s==="absent"?"#A32D2D":s==="retard"?"#8B6914":"#27500A" }),
  };

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh" }}>Chargement...</div>;

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={S.navL}>
          <div style={S.navLogo}>E</div>
          <div><div style={S.navT}>EPIA — Absences</div><div style={S.navS}>{prof?.prenom} {prof?.nom}</div></div>
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <button style={S.navBtn} onClick={() => navigate("/prof/dashboard")}>🏠 Dashboard</button>
          <button style={S.navBtn} onClick={async()=>{ await supabase.auth.signOut(); navigate("/login"); }}>Déconnexion</button>
        </div>
      </nav>

      <div style={S.wrap}>
        {banner && <div style={S.banner(banner.type)}>{banner.msg}</div>}

        <div style={S.layout}>

          {/* Colonne gauche */}
          <div>
            <select style={S.selAnn} value={selAnnee} onChange={e => setSelAnnee(e.target.value)}>
              {annees.map(a => <option key={a.id} value={a.annee}>{a.annee}{a.active?" ★":""}</option>)}
            </select>
            <div style={S.pdTab}>
              <button style={S.tab(selPd==="D1","#1B3A6B")} onClick={() => setSelPd("D1")}>D1</button>
              <button style={S.tab(selPd==="D2","#1a5c2a")} onClick={() => setSelPd("D2")}>D2</button>
            </div>
            <p style={{ fontSize:11,color:"#aaa",marginBottom:8 }}>Mes matières {selPd}</p>
            {matieres.length === 0
              ? <p style={{ fontSize:12,color:"#aaa",padding:"8px" }}>Aucune matière assignée.</p>
              : matieres.map(m => (
                <button key={m.id} style={S.matBtn(selMat?.id===m.id)} onClick={() => setSelMat(m)}>
                  <p style={S.matName}>{m.matiere.split("—")[0]?.trim()}<span style={S.nivTag(m.niveau)}>{m.niveau}</span></p>
                  <p style={S.matSub}>{absences.filter(a=>a.matiere===m.matiere).length} absence(s) enregistrée(s)</p>
                </button>
              ))
            }
          </div>

          {/* Colonne droite */}
          <div>
            {!selMat
              ? <div style={{ ...S.card,textAlign:"center",padding:"3rem",color:"#aaa" }}>
                  <p style={{ fontSize:32,margin:"0 0 8px" }}>📋</p>
                  <p style={{ fontSize:14 }}>Sélectionnez une matière pour faire l'appel.</p>
                </div>
              : <>
                  {/* Onglets Appel / Historique */}
                  <div style={{ ...S.tabs,marginBottom:"1rem" }}>
                    <button style={S.tab(view==="appel","#1B3A6B")} onClick={() => setView("appel")}>📋 Faire l'appel</button>
                    <button style={S.tab(view==="historique","#8B6914")} onClick={() => setView("historique")}>📅 Historique</button>
                  </div>

                  {view === "appel" && (
                    <div style={S.card}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:8 }}>
                        <div>
                          <h2 style={{ fontSize:16,fontWeight:600,margin:0,color:"#111" }}>
                            {selMat.matiere}<span style={S.nivTag(selMat.niveau)}>{selMat.niveau}</span>
                          </h2>
                          <p style={{ fontSize:12,color:"#888",margin:"2px 0 0" }}>{selPd} · {selAnnee}</p>
                        </div>
                        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                          <input type="date" style={S.dateInp} value={selDate} onChange={e => setSelDate(e.target.value)} />
                          <button style={S.btnP} onClick={saveAppel} disabled={saving}>
                            {saving?"Enregistrement...":"💾 Enregistrer l'appel"}
                          </button>
                        </div>
                      </div>

                      {/* Stats du jour */}
                      <div style={S.statRow}>
                        <div style={S.stat("#27500A")}><span style={S.statN}>{nbPresents}</span>Présents</div>
                        <div style={S.stat("#A32D2D")}><span style={S.statN}>{nbAbsents}</span>Absents</div>
                        <div style={S.stat("#8B6914")}><span style={S.statN}>{nbRetards}</span>Retards</div>
                        <div style={S.stat("#185FA5")}><span style={S.statN}>{eleves.length}</span>Total</div>
                      </div>

                      {eleves.length === 0
                        ? <p style={{ color:"#aaa",fontSize:13,textAlign:"center",padding:"2rem" }}>Aucun élève en {selPd}.</p>
                        : <table style={S.table}>
                            <thead>
                              <tr>
                                <th style={S.th}>#</th>
                                <th style={S.th}>Élève</th>
                                <th style={S.thC}>Présence</th>
                                <th style={S.thC}>Justifié</th>
                              </tr>
                            </thead>
                            <tbody>
                              {eleves.map((e,i) => (
                                <tr key={e.id} style={{ background:i%2===0?"#fff":"#fafafa" }}>
                                  <td style={{ ...S.tdC,color:"#aaa",fontSize:11 }}>{i+1}</td>
                                  <td style={S.td}>
                                    <div style={{ fontWeight:500 }}>{e.prenom} {e.nom}</div>
                                    <div style={{ fontSize:11,color:"#aaa" }}>{e.email}</div>
                                  </td>
                                  <td style={S.tdC}>
                                    <div style={{ display:"flex",gap:4,justifyContent:"center" }}>
                                      {["present","retard","absent"].map(type => (
                                        <button key={type} style={S.presBtn(presence[e.id]||"present", type)}
                                          onClick={() => setPresence(prev => ({ ...prev, [e.id]: type }))}>
                                          {type==="present"?"✓ Présent":type==="retard"?"⏰ Retard":"✗ Absent"}
                                        </button>
                                      ))}
                                    </div>
                                  </td>
                                  <td style={S.tdC}>
                                    {(presence[e.id]==="absent"||presence[e.id]==="retard") && (
                                      <button style={S.justBtn(justifs[e.id]||false)}
                                        onClick={() => setJustifs(prev => ({ ...prev, [e.id]: !prev[e.id] }))}>
                                        {justifs[e.id] ? "✓ Justifié" : "Non justifié"}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                      }
                    </div>
                  )}

                  {view === "historique" && (
                    <div style={S.card}>
                      <h2 style={{ fontSize:16,fontWeight:600,margin:"0 0 1rem",color:"#111" }}>
                        📅 Historique — {selMat.matiere}
                        <span style={{ fontSize:12,color:"#888",fontWeight:400,marginLeft:8 }}>{absences.length} absence(s) total</span>
                      </h2>
                      {Object.keys(histByDate).length === 0
                        ? <p style={{ color:"#aaa",fontSize:13,textAlign:"center",padding:"2rem" }}>Aucune absence enregistrée.</p>
                        : Object.entries(histByDate).sort((a,b) => b[0].localeCompare(a[0])).map(([date, abs]) => (
                          <div key={date} style={{ marginBottom:16 }}>
                            <p style={S.histDate}>
                              {new Date(date).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
                              <span style={{ fontSize:11,color:"#888",fontWeight:400,marginLeft:8 }}>{abs.length} élève(s)</span>
                            </p>
                            {abs.map(a => {
                              const eleve = eleves.find(e => e.id === a.eleve_id);
                              return (
                                <div key={a.id} style={S.histRow}>
                                  <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                                    <span style={S.absTag(a.statut)}>{a.statut==="absent"?"Absent":a.statut==="retard"?"Retard":"Présent"}</span>
                                    <span style={{ fontWeight:500 }}>{eleve?.prenom} {eleve?.nom}</span>
                                  </div>
                                  <button style={S.justBtn(a.justifie)} onClick={() => toggleJustif(a.id, a.justifie)}>
                                    {a.justifie ? "✓ Justifié" : "Justifier"}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ))
                      }
                    </div>
                  )}
                </>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
