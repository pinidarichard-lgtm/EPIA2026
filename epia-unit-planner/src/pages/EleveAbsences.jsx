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

export default function EleveAbsences() {
  const [eleve,    setEleve]    = useState(null);
  const [absences, setAbsences] = useState([]);
  const [annees,   setAnnees]   = useState([]);
  const [selAnnee, setSelAnnee] = useState("");
  const [filtre,   setFiltre]   = useState("tout"); // "tout"|"absent"|"retard"|"justifie"|"non_justifie"
  const [loading,  setLoading]  = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (selAnnee && eleve) loadAbsences(eleve.id, selAnnee); }, [selAnnee]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: e } = await supabaseAdmin.from("eleves").select("*").eq("auth_id", user.id).single();
    setEleve(e);
    const { data: a } = await supabaseAdmin.from("annees_scolaires").select("*").order("annee", { ascending:false });
    setAnnees(a||[]);
    const ann = e?.annee_scolaire || (a||[])[0]?.annee || "2024-2025";
    setSelAnnee(ann);
    if (e) await loadAbsences(e.id, ann);
    setLoading(false);
  }

  async function loadAbsences(eleveId, annee) {
    const { data } = await supabaseAdmin.from("absences")
      .select("*").eq("eleve_id", eleveId).eq("annee_scolaire", annee)
      .order("date_absence", { ascending:false });
    setAbsences(data||[]);
  }

  const filtered = absences.filter(a => {
    if (filtre === "absent")      return a.statut === "absent";
    if (filtre === "retard")      return a.statut === "retard";
    if (filtre === "justifie")    return a.justifie;
    if (filtre === "non_justifie")return !a.justifie && a.statut === "absent";
    return true;
  });

  const nbAbsents  = absences.filter(a => a.statut==="absent").length;
  const nbRetards  = absences.filter(a => a.statut==="retard").length;
  const nbJustif   = absences.filter(a => a.justifie).length;
  const nbNonJust  = absences.filter(a => !a.justifie && a.statut==="absent").length;

  // Grouper par matière
  const parMatiere = {};
  absences.forEach(a => {
    if (!parMatiere[a.matiere]) parMatiere[a.matiere] = { abs:0, ret:0 };
    if (a.statut==="absent") parMatiere[a.matiere].abs++;
    if (a.statut==="retard") parMatiere[a.matiere].ret++;
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
    grid4:   { display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:"1.5rem" },
    stat:    { background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1.25rem",textAlign:"center" },
    statN:   { fontSize:28,fontWeight:700,display:"block",margin:"8px 0 2px" },
    statL:   { fontSize:13,color:"#888" },
    card:    { background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1.25rem",marginBottom:12 },
    cardT:   { fontSize:15,fontWeight:600,color:"#111",margin:"0 0 1rem" },
    filtRow: { display:"flex",gap:6,flexWrap:"wrap",marginBottom:"1rem" },
    fBtn:    (on) => ({ padding:"5px 14px",border:`1px solid ${on?"#1B3A6B":"#ddd"}`,borderRadius:20,background:on?"#1B3A6B":"transparent",color:on?"#fff":"#555",cursor:"pointer",fontSize:12,fontWeight:on?500:400 }),
    table:   { width:"100%",borderCollapse:"collapse" },
    th:      { padding:"8px 10px",textAlign:"left",fontSize:11,fontWeight:600,color:"#888",borderBottom:"2px solid #eee",background:"#fafafa" },
    thC:     { padding:"8px 10px",textAlign:"center",fontSize:11,fontWeight:600,color:"#888",borderBottom:"2px solid #eee",background:"#fafafa" },
    td:      { padding:"8px 10px",fontSize:13,borderBottom:"1px solid #f5f5f5",color:"#111" },
    tdC:     { padding:"8px 10px",fontSize:13,borderBottom:"1px solid #f5f5f5",textAlign:"center" },
    absTag:  (s) => ({ fontSize:11,padding:"2px 8px",borderRadius:20,fontWeight:500,background:s==="absent"?"#FCEBEB":s==="retard"?"#FFF9EC":"#EAF3DE",color:s==="absent"?"#A32D2D":s==="retard"?"#8B6914":"#27500A" }),
    justTag: (on) => ({ fontSize:10,padding:"2px 7px",borderRadius:20,background:on?"#EAF3DE":"#f5f5f5",color:on?"#27500A":"#aaa",fontWeight:500 }),
    matRow:  { display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f5f5f5",fontSize:13,alignItems:"center" },
    sel:     { padding:"6px 10px",border:"1px solid rgba(255,255,255,0.3)",borderRadius:7,background:"rgba(255,255,255,0.15)",color:"#fff",fontSize:13,outline:"none" },
  };

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh" }}>Chargement...</div>;

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={S.navL}>
          <div style={S.navLogo}>E</div>
          <div><div style={S.navT}>EPIA Lomé</div><div style={S.navS}>Mes absences</div></div>
        </div>
        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
          <select style={S.sel} value={selAnnee} onChange={e => setSelAnnee(e.target.value)}>
            {annees.map(a => <option key={a.id} value={a.annee} style={{ color:"#111" }}>{a.annee}</option>)}
          </select>
          <button style={S.navBtn} onClick={() => navigate("/eleve/dashboard")}>🏠 Dashboard</button>
          <button style={S.navBtn} onClick={async()=>{ await supabase.auth.signOut(); navigate("/login"); }}>Déconnexion</button>
        </div>
      </nav>

      <div style={S.wrap}>
        <h1 style={{ fontSize:20,fontWeight:600,color:"#111",margin:"0 0 1.5rem" }}>
          📋 Mes absences — {eleve?.prenom} {eleve?.nom}
        </h1>

        {/* Stats */}
        <div style={S.grid4}>
          {[
            { n:nbAbsents,  l:"Absences",         c:"#A32D2D" },
            { n:nbRetards,  l:"Retards",           c:"#8B6914" },
            { n:nbJustif,   l:"Justifiées",        c:"#27500A" },
            { n:nbNonJust,  l:"Non justifiées",    c:"#185FA5" },
          ].map((st,i) => (
            <div key={i} style={S.stat}>
              <span style={{ ...S.statN, color:st.c }}>{st.n}</span>
              <span style={S.statL}>{st.l}</span>
            </div>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:12 }}>
          <div>
            {/* Filtres */}
            <div style={S.filtRow}>
              {[
                { key:"tout",        label:"Tout" },
                { key:"absent",      label:"Absences" },
                { key:"retard",      label:"Retards" },
                { key:"justifie",    label:"Justifiées" },
                { key:"non_justifie",label:"Non justifiées" },
              ].map(f => (
                <button key={f.key} style={S.fBtn(filtre===f.key)} onClick={() => setFiltre(f.key)}>{f.label}</button>
              ))}
            </div>

            <div style={S.card}>
              <p style={S.cardT}>Liste des absences ({filtered.length})</p>
              {filtered.length === 0
                ? <p style={{ color:"#aaa",fontSize:13,textAlign:"center",padding:"2rem" }}>Aucune absence pour ce filtre.</p>
                : <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Date</th>
                        <th style={S.th}>Matière</th>
                        <th style={S.thC}>Statut</th>
                        <th style={S.thC}>Justification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((a,i) => (
                        <tr key={a.id} style={{ background:i%2===0?"#fff":"#fafafa" }}>
                          <td style={S.td}>{new Date(a.date_absence).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}</td>
                          <td style={S.td}>{a.matiere}</td>
                          <td style={S.tdC}><span style={S.absTag(a.statut)}>{a.statut==="absent"?"Absent":a.statut==="retard"?"Retard":"Présent"}</span></td>
                          <td style={S.tdC}><span style={S.justTag(a.justifie)}>{a.justifie?"✓ Justifiée":"Non justifiée"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              }
            </div>
          </div>

          {/* Par matière */}
          <div style={S.card}>
            <p style={S.cardT}>📚 Par matière</p>
            {Object.keys(parMatiere).length === 0
              ? <p style={{ color:"#aaa",fontSize:13 }}>Aucune absence.</p>
              : Object.entries(parMatiere).map(([mat, st]) => (
                <div key={mat} style={S.matRow}>
                  <span style={{ fontWeight:500,fontSize:12 }}>{mat.split("—")[0]?.trim()}</span>
                  <div style={{ display:"flex",gap:4 }}>
                    {st.abs > 0 && <span style={S.absTag("absent")}>{st.abs} abs.</span>}
                    {st.ret > 0 && <span style={S.absTag("retard")}>{st.ret} ret.</span>}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
