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

function note7Color(n) {
  if (!n) return "#aaa";
  if (n >= 6) return "#27500A"; if (n >= 4) return "#185FA5";
  if (n >= 3) return "#8B6914"; return "#A32D2D";
}
function note7Bg(n) {
  if (!n) return "#f5f5f5";
  if (n >= 6) return "#EAF3DE"; if (n >= 4) return "#E6F1FB";
  if (n >= 3) return "#FFF9EC"; return "#FCEBEB";
}

export default function EleveDashboard() {
  const [eleve,    setEleve]    = useState(null);
  const [matieres, setMatieres] = useState([]);
  const [notes,    setNotes]    = useState([]);
  const [absences, setAbsences] = useState([]);
  const [configs,  setConfigs]  = useState([]);
  const [annees,   setAnnees]   = useState([]);
  const [selAnnee, setSelAnnee] = useState("");
  const [loading,  setLoading]  = useState(true);
  const [openMat,  setOpenMat]  = useState(null);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (selAnnee && eleve) reloadAll(eleve.id, selAnnee); }, [selAnnee]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: e } = await supabaseAdmin.from("eleves").select("*").eq("auth_id", user.id).single();
    setEleve(e);
    const { data: a } = await supabaseAdmin.from("annees_scolaires").select("*").order("annee", { ascending:false });
    setAnnees(a||[]);
    const ann = e?.annee_scolaire || (a||[])[0]?.annee || "2024-2025";
    setSelAnnee(ann);
    if (e) await reloadAll(e.id, ann);
    setLoading(false);
  }

  async function reloadAll(eid, annee) {
    const [{ data: mat }, { data: n }, { data: abs }, { data: cfg }] = await Promise.all([
      supabaseAdmin.from("eleve_matieres").select("*").eq("eleve_id", eid).eq("annee_scolaire", annee),
      supabaseAdmin.from("notes").select("*").eq("eleve_id", eid).eq("annee_scolaire", annee),
      supabaseAdmin.from("absences").select("*").eq("eleve_id", eid).eq("annee_scolaire", annee),
      supabaseAdmin.from("ib_matieres_config").select("*").eq("annee_scolaire", annee).eq("actif", true),
    ]);
    setMatieres(mat||[]);
    setNotes(n||[]);
    setAbsences(abs||[]);
    setConfigs(cfg||[]);
  }

  async function logout() { await supabase.auth.signOut(); navigate("/login"); }

  const principales = (matieres||[]).filter(m => m.groupe_matiere !== "Tronc commun");
  const tronc       = (matieres||[]).filter(m => m.groupe_matiere === "Tronc commun");
  const notes7      = (notes||[]).filter(n => n.note >= 1 && n.note <= 7);
  const total42     = notes7.reduce((s,n) => s+n.note, 0);
  const moy7        = notes7.length > 0 ? (total42/notes7.length).toFixed(2) : "—";
  const nbAbs       = (absences||[]).filter(a => a.statut==="absent").length;
  const nbRet       = (absences||[]).filter(a => a.statut==="retard").length;

  const today = new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  const S = {
    page:    { minHeight:"100vh", background:"#f5f7fa", fontFamily:"sans-serif" },
    nav:     { background:"#1B3A6B", padding:"0 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 },
    navL:    { display:"flex", alignItems:"center", gap:12 },
    navLogo: { width:36,height:36,borderRadius:9,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:16 },
    navT:    { color:"#fff", fontWeight:600, fontSize:15 },
    navS:    { color:"rgba(255,255,255,0.6)", fontSize:12 },
    navBtn:  { padding:"6px 14px",background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",borderRadius:7,fontSize:13,cursor:"pointer" },
    wrap:    { padding:"1.5rem", maxWidth:1100, margin:"0 auto" },
    welcome: { fontSize:22,fontWeight:700,color:"#111",margin:"0 0 2px" },
    sub:     { fontSize:13,color:"#888",margin:"0 0 1.5rem" },
    grid4:   { display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:"1.5rem" },
    statCard:{ background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1.25rem" },
    statN:   (c) => ({ fontSize:28,fontWeight:700,color:c||"#1B3A6B",display:"block",margin:"8px 0 2px" }),
    statL:   { fontSize:13,color:"#888" },
    layout:  { display:"grid",gridTemplateColumns:"1fr 300px",gap:16 },
    secT:    { fontSize:16,fontWeight:600,color:"#111",margin:"0 0 1rem" },
    matCard: { background:"#fff",border:"1px solid #eee",borderRadius:12,marginBottom:8,overflow:"hidden" },
    matHead: (open) => ({ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",cursor:"pointer",background:open?"#f9f9f9":"#fff",borderBottom:open?"1px solid #eee":"none" }),
    matL:    { flex:1 },
    matName: { fontSize:14,fontWeight:600,color:"#111",margin:0 },
    matSub:  { fontSize:11,color:"#888",margin:"2px 0 0" },
    note7Box:(n) => ({ width:36,height:36,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,background:note7Bg(n),color:note7Color(n),flexShrink:0 }),
    matBody: { padding:"12px 16px" },
    epRow:   { display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #f9f9f9",fontSize:13 },
    epName:  { color:"#555",flex:1 },
    epVal:   (v, max) => ({ fontWeight:600,color:v!==null?(v/max>=0.7?"#27500A":v/max>=0.5?"#185FA5":"#A32D2D"):"#aaa" }),
    pctBar:  { height:5,borderRadius:3,background:"#eee",overflow:"hidden",marginTop:2 },
    pctFill: (pct,c) => ({ height:"100%",borderRadius:3,background:c,width:`${Math.min(pct,100)}%`,transition:"width 0.4s" }),
    troncRow:{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f5f5f5",fontSize:13 },
    niveauAE:{ fontSize:13,fontWeight:700,padding:"2px 10px",borderRadius:6,background:"#E6F1FB",color:"#185FA5" },
    card:    { background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1.25rem",marginBottom:12 },
    cardT:   { fontSize:14,fontWeight:600,color:"#111",margin:"0 0 12px" },
    quickBtn:{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:9,border:"1px solid #eee",background:"#fff",cursor:"pointer",fontSize:13,color:"#333",marginBottom:8,width:"100%",textAlign:"left",fontFamily:"sans-serif" },
    absRow:  { display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f5f5f5",fontSize:12 },
    absTag:  (s) => ({ fontSize:10,padding:"2px 7px",borderRadius:20,fontWeight:500,background:s==="absent"?"#FCEBEB":"#FFF9EC",color:s==="absent"?"#A32D2D":"#8B6914" }),
    nivTag:  (n) => ({ fontSize:10,padding:"2px 6px",borderRadius:4,fontWeight:600,background:n==="NS"?"#FFF9EC":"#E6F1FB",color:n==="NS"?"#8B6914":"#185FA5",marginLeft:6 }),
    sel:     { padding:"6px 10px",border:"1px solid rgba(255,255,255,0.3)",borderRadius:7,background:"rgba(255,255,255,0.15)",color:"#fff",fontSize:13,outline:"none" },
    progressWrap: { marginTop:8 },
    progressLabel:{ display:"flex",justifyContent:"space-between",fontSize:11,color:"#888",marginBottom:3 },
  };

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh" }}>Chargement...</div>;

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={S.navL}>
          <div style={S.navLogo}>E</div>
          <div>
            <div style={S.navT}>EPIA Lomé — Espace Élève</div>
            <div style={S.navS}>{eleve?.prenom} {eleve?.nom}</div>
          </div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <select style={S.sel} value={selAnnee} onChange={e => setSelAnnee(e.target.value)}>
            {annees.map(a => <option key={a.id} value={a.annee} style={{ color:"#111" }}>{a.annee}{a.active?" ★":""}</option>)}
          </select>
          <button style={S.navBtn} onClick={logout}>Déconnexion</button>
        </div>
      </nav>

      <div style={S.wrap}>
        <h1 style={S.welcome}>Bonjour, {eleve?.prenom} 👋</h1>
        <p style={S.sub}>{today} · {eleve?.annee_pd} · {selAnnee}</p>

        {/* Stats */}
        <div style={S.grid4}>
          {[
            { icon:"🎯", n:`${total42}/42`, l:"Total de points", c:note7Color(Math.round(total42/6)) },
            { icon:"📊", n:`${moy7}/7`,    l:"Moyenne générale", c:moy7!=="—"?note7Color(Math.round(parseFloat(moy7))):undefined },
            { icon:"📚", n:principales.length, l:"Matières", c:"#1B3A6B" },
            { icon:"📋", n:nbAbs,          l:"Absences", c:nbAbs>5?"#A32D2D":"#27500A" },
          ].map((st,i) => (
            <div key={i} style={S.statCard}>
              <span style={{ fontSize:24 }}>{st.icon}</span>
              <span style={S.statN(st.c)}>{st.n}</span>
              <span style={S.statL}>{st.l}</span>
            </div>
          ))}
        </div>

        <div style={S.layout}>
          {/* Colonne principale */}
          <div>
            <p style={S.secT}>📚 Mes matières</p>

            {principales.length === 0
              ? <div style={{ ...S.card,textAlign:"center",color:"#aaa",padding:"2rem" }}>
                  Aucune matière assignée. Contactez l'administrateur.
                </div>
              : principales.map(m => {
                  const note    = notes.find(n => n.matiere === m.matiere);
                  const cfg     = configs.find(c => c.matiere === m.matiere && c.niveau === m.niveau);
                  const isOpen  = openMat === m.matiere;
                  const eprDetail = note?.epreuves_detail || {};
                  return (
                    <div key={m.matiere} style={S.matCard}>
                      <div style={S.matHead(isOpen)} onClick={() => setOpenMat(isOpen ? null : m.matiere)}>
                        <div style={S.matL}>
                          <p style={S.matName}>
                            {m.matiere}
                            <span style={S.nivTag(m.niveau)}>{m.niveau}</span>
                          </p>
                          <p style={S.matSub}>
                            {m.groupe_matiere?.split("—")[0]?.trim()}
                            {note?.enseignant && <span style={{ marginLeft:8 }}>· {note.enseignant}</span>}
                          </p>
                        </div>
                        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                          <div style={S.note7Box(note?.note)}>{note?.note || "—"}</div>
                          <span style={{ fontSize:16,color:"#aaa" }}>{isOpen?"▲":"▼"}</span>
                        </div>
                      </div>

                      {isOpen && (
                        <div style={S.matBody}>
                          {!cfg
                            ? <p style={{ fontSize:12,color:"#aaa" }}>Pas de configuration d'épreuves.</p>
                            : <>
                                {/* Épreuves */}
                                {cfg.epreuves.map((ep,j) => {
                                  const v   = eprDetail[ep.nom];
                                  const pct = v !== undefined && v !== "" ? (parseFloat(v)/ep.bareme)*100 : null;
                                  return (
                                    <div key={j} style={S.epRow}>
                                      <div style={{ flex:1 }}>
                                        <div style={{ display:"flex",justifyContent:"space-between" }}>
                                          <span style={S.epName}>{ep.nom}</span>
                                          <span style={S.epVal(v!==undefined&&v!==""?parseFloat(v):null, ep.bareme)}>
                                            {v !== undefined && v !== "" ? `${v}/${ep.bareme}` : "—"}
                                          </span>
                                        </div>
                                        <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:"#aaa",marginTop:2 }}>
                                          <span>Poids : {ep.pourcentage}%</span>
                                          {pct !== null && <span>{pct.toFixed(1)}%</span>}
                                        </div>
                                        {pct !== null && (
                                          <div style={S.pctBar}>
                                            <div style={S.pctFill(pct, pct>=70?"#27500A":pct>=50?"#185FA5":"#A32D2D")} />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Frontières */}
                                <div style={{ marginTop:10,padding:"8px",background:"#f9f9f9",borderRadius:8 }}>
                                  <p style={{ fontSize:11,color:"#888",margin:"0 0 6px",fontWeight:600 }}>Frontières des notes</p>
                                  <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
                                    {[7,6,5,4,3,2,1].map(n => (
                                      <span key={n} style={{ fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:500,background:note?.note===n?note7Bg(n):"#f0f0f0",color:note?.note===n?note7Color(n):"#aaa",border:note?.note===n?`1px solid ${note7Color(n)}30`:"1px solid transparent" }}>
                                        {n}≥{cfg.frontieres?.[n]}%
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {/* Commentaire */}
                                {note?.commentaire && (
                                  <div style={{ marginTop:10,padding:"10px 12px",background:"#E6F1FB",borderRadius:8,fontSize:12,color:"#185FA5",borderLeft:"3px solid #1B3A6B" }}>
                                    <strong>Commentaire :</strong> {note.commentaire}
                                  </div>
                                )}
                              </>
                          }
                        </div>
                      )}
                    </div>
                  );
                })
            }

            {/* Tronc commun */}
            {tronc.length > 0 && (
              <div style={{ marginTop:16 }}>
                <p style={S.secT}>🎓 Tronc commun</p>
                <div style={S.card}>
                  {tronc.map((t,i) => (
                    <div key={i} style={S.troncRow}>
                      <span style={{ fontWeight:500 }}>{t.matiere}</span>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        {t.niveau_ae && <span style={S.niveauAE}>{t.niveau_ae}</span>}
                        <span style={{ fontSize:11,color:"#27500A",background:"#EAF3DE",padding:"2px 8px",borderRadius:20 }}>✓ Inscrit</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Colonne droite */}
          <div>
            {/* Total points */}
            <div style={{ ...S.card,background:"#1B3A6B",border:"none",marginBottom:12 }}>
              <p style={{ fontSize:13,color:"rgba(255,255,255,0.7)",margin:"0 0 4px" }}>Total de points</p>
              <p style={{ fontSize:32,fontWeight:700,color:"#fff",margin:"0 0 2px" }}>{total42}<span style={{ fontSize:14,opacity:0.6 }}>/42</span></p>
              <p style={{ fontSize:12,color:"rgba(255,255,255,0.6)",margin:0 }}>Moyenne : {moy7}/7</p>
              {/* Barre progression /42 */}
              <div style={{ marginTop:10,background:"rgba(255,255,255,0.2)",borderRadius:20,height:8,overflow:"hidden" }}>
                <div style={{ height:"100%",borderRadius:20,background:total42>=24?"#4CAF50":"#FF9800",width:`${(total42/42)*100}%`,transition:"width 0.5s" }} />
              </div>
              <p style={{ fontSize:10,color:"rgba(255,255,255,0.5)",margin:"4px 0 0" }}>
                {total42>=24?"✓ Conditions remplies (≥24 pts)":"⚠ Objectif : 24 points minimum"}
              </p>
            </div>

            {/* Actions rapides */}
            <div style={S.card}>
              <p style={S.cardT}>⚡ Actions rapides</p>
              {[
                { icon:"📝", label:"Mes notes",     path:"/eleve/notes" },
                { icon:"📋", label:"Mes absences",  path:"/eleve/absences" },
                { icon:"📖", label:"Cahier",        path:"/cahier" },
                { icon:"📊", label:"Mon bulletin",  path:"/eleve/bulletin" },
              ].map((a,i) => (
                <button key={i} style={S.quickBtn} onClick={() => navigate(a.path)}>
                  <span style={{ fontSize:18 }}>{a.icon}</span>{a.label}
                </button>
              ))}
            </div>

            {/* Absences récentes */}
            <div style={S.card}>
              <p style={S.cardT}>📋 Absences récentes</p>
              {absences.length === 0
                ? <p style={{ fontSize:12,color:"#aaa" }}>Aucune absence.</p>
                : <>
                    <div style={{ display:"flex",gap:8,marginBottom:10 }}>
                      <span style={{ fontSize:12,padding:"3px 10px",borderRadius:20,background:"#FCEBEB",color:"#A32D2D",fontWeight:500 }}>{nbAbs} absence(s)</span>
                      <span style={{ fontSize:12,padding:"3px 10px",borderRadius:20,background:"#FFF9EC",color:"#8B6914",fontWeight:500 }}>{nbRet} retard(s)</span>
                    </div>
                    {absences.slice(0,4).map((a,i) => (
                      <div key={i} style={S.absRow}>
                        <div>
                          <span style={{ fontWeight:500 }}>{a.matiere?.split("—")[0]?.trim()}</span>
                          <span style={{ fontSize:10,color:"#aaa",marginLeft:6 }}>{new Date(a.date_absence).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}</span>
                        </div>
                        <span style={S.absTag(a.statut)}>{a.statut==="absent"?"Absent":"Retard"}</span>
                      </div>
                    ))}
                    {absences.length > 4 && (
                      <button style={{ fontSize:12,color:"#185FA5",background:"none",border:"none",cursor:"pointer",marginTop:6,padding:0 }} onClick={() => navigate("/eleve/absences")}>
                        Voir tout ({absences.length}) →
                      </button>
                    )}
                  </>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
