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

export default function ProfDashboard() {
  const [prof,      setProf]      = useState(null);
  const [matieres,  setMatieres]  = useState([]);
  const [annees,    setAnnees]    = useState([]);
  const [selAnnee,  setSelAnnee]  = useState("");
  const [statsMap,  setStatsMap]  = useState({});
  const [loading,   setLoading]   = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadInit(); }, []);
  useEffect(() => { if (selAnnee && prof) loadStats(); }, [selAnnee, matieres]);

  async function loadInit() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profD } = await supabaseAdmin.from("profs").select("*").eq("auth_id", user.id).single();
    setProf(profD);

    const { data: a } = await supabaseAdmin.from("annees_scolaires").select("*").order("annee", { ascending:false });
    setAnnees(a || []);
    const active = (a||[]).find(x => x.active);
    const ann = active?.annee || a?.[0]?.annee || "2024-2025";
    setSelAnnee(ann);

    if (profD) {
      const { data: mat } = await supabaseAdmin.from("prof_matieres")
        .select("*").eq("prof_id", profD.id).eq("annee_scolaire", ann);
      setMatieres(mat || []);
    }
    setLoading(false);
  }

  async function loadStats() {
    if (!prof || matieres.length === 0) { setStatsMap({}); return; }
    const map = {};
    for (const m of matieres) {
      // Élèves de cette année_pd
      const { data: eleves } = await supabaseAdmin.from("eleves")
        .select("id").eq("annee_pd", m.annee_pd).eq("annee_scolaire", selAnnee).eq("actif", true);
      const ids = (eleves||[]).map(e => e.id);
      // Notes saisies pour cette matière
      const { data: notes } = ids.length > 0
        ? await supabaseAdmin.from("notes").select("*").in("eleve_id", ids).eq("matiere", m.matiere).eq("annee_scolaire", selAnnee)
        : { data: [] };
      const notes7 = (notes||[]).filter(n => n.note >= 1 && n.note <= 7);
      const moy = notes7.length > 0 ? (notes7.reduce((s,n)=>s+n.note,0)/notes7.length).toFixed(1) : null;
      map[`${m.matiere}-${m.niveau}-${m.annee_pd}`] = {
        nbEleves: ids.length,
        nbNotes:  notes7.length,
        moy,
        notes:    notes||[],
      };
    }
    setStatsMap(map);
  }

  async function changeAnnee(ann) {
    setSelAnnee(ann);
    if (prof) {
      const { data: mat } = await supabaseAdmin.from("prof_matieres")
        .select("*").eq("prof_id", prof.id).eq("annee_scolaire", ann);
      setMatieres(mat || []);
    }
  }

  async function logout() { await supabase.auth.signOut(); navigate("/login"); }

  const today = new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  const matD1 = matieres.filter(m => m.annee_pd === "D1");
  const matD2 = matieres.filter(m => m.annee_pd === "D2");
  const totalNotes = Object.values(statsMap).reduce((s,st) => s + st.nbNotes, 0);

  const S = {
    page:    { minHeight:"100vh", background:"#f5f7fa", fontFamily:"sans-serif" },
    nav:     { background:"#1B3A6B", padding:"0 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 },
    navL:    { display:"flex", alignItems:"center", gap:12 },
    navLogo: { width:36,height:36,borderRadius:9,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:16 },
    navT:    { color:"#fff", fontWeight:600, fontSize:15 },
    navS:    { color:"rgba(255,255,255,0.6)", fontSize:12 },
    navBtn:  { padding:"6px 14px",background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",borderRadius:7,fontSize:13,cursor:"pointer" },
    wrap:    { padding:"1.5rem", maxWidth:1100, margin:"0 auto" },
    welcome: { fontSize:22,fontWeight:700,color:"#111",margin:"0 0 4px" },
    sub:     { fontSize:14,color:"#888",margin:"0 0 1.5rem" },
    grid4:   { display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:"1.5rem" },
    statCard:{ background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1.25rem" },
    statN:   { fontSize:28,fontWeight:700,color:"#1B3A6B",display:"block",margin:"8px 0 2px" },
    statL:   { fontSize:13,color:"#888" },
    secT:    { fontSize:16,fontWeight:600,color:"#111",margin:"0 0 1rem",display:"flex",alignItems:"center",gap:8 },
    pdBadge: (pd) => ({ fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:600,background:pd==="D1"?"#E6F1FB":"#EAF3DE",color:pd==="D1"?"#1B3A6B":"#27500A" }),
    matCard: { background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1.25rem",marginBottom:10 },
    matTop:  { display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 },
    matName: { fontSize:15,fontWeight:600,color:"#111",margin:0 },
    matSub:  { fontSize:12,color:"#888",margin:"2px 0 0" },
    nivTag:  (n) => ({ fontSize:10,padding:"2px 8px",borderRadius:4,fontWeight:600,background:n==="NS"?"#FFF9EC":"#E6F1FB",color:n==="NS"?"#8B6914":"#185FA5",marginLeft:4 }),
    grid3:   { display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12 },
    miniStat:{ textAlign:"center",background:"#f9f9f9",borderRadius:8,padding:"8px" },
    miniN:   { fontSize:20,fontWeight:700,display:"block",margin:"0 0 2px" },
    miniL:   { fontSize:11,color:"#888" },
    btnP:    { padding:"7px 14px",background:"#1B3A6B",color:"#fff",border:"none",borderRadius:7,fontSize:12,fontWeight:500,cursor:"pointer" },
    btnSm:   { padding:"6px 12px",background:"transparent",color:"#555",border:"1px solid #ddd",borderRadius:7,fontSize:12,cursor:"pointer" },
    noMat:   { background:"#FFF9EC",border:"1px solid #FAC775",borderRadius:10,padding:"12px 16px",fontSize:13,color:"#633806",marginBottom:12 },
    quickBtn:{ display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderRadius:10,border:"1px solid #eee",background:"#fff",cursor:"pointer",fontSize:13,color:"#333",marginBottom:8,width:"100%",textAlign:"left",fontFamily:"sans-serif" },
    selAnn:  { padding:"6px 10px",border:"1px solid rgba(255,255,255,0.3)",borderRadius:7,background:"rgba(255,255,255,0.15)",color:"#fff",fontSize:13,outline:"none" },
  };

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh" }}>Chargement...</div>;

  function renderMatieres(list, pd) {
    if (list.length === 0) return (
      <div style={S.noMat}>Aucune matière {pd} assignée pour {selAnnee}. Contactez l'administrateur.</div>
    );
    return list.map(m => {
      const key  = `${m.matiere}-${m.niveau}-${m.annee_pd}`;
      const stat = statsMap[key] || { nbEleves:0, nbNotes:0, moy:null };
      const pct  = stat.nbEleves > 0 ? Math.round((stat.nbNotes/stat.nbEleves)*100) : 0;
      return (
        <div key={m.id} style={S.matCard}>
          <div style={S.matTop}>
            <div>
              <p style={S.matName}>
                {m.matiere}
                <span style={S.nivTag(m.niveau)}>{m.niveau}</span>
              </p>
              <p style={S.matSub}>{m.groupe_matiere?.split("—")[0]?.trim()}</p>
            </div>
            <button style={S.btnP} onClick={() => navigate("/prof/notes")}>
              ✏️ Saisir notes
            </button>
          </div>
          <div style={S.grid3}>
            <div style={S.miniStat}>
              <span style={{ ...S.miniN, color:"#1B3A6B" }}>{stat.nbEleves}</span>
              <span style={S.miniL}>Élèves</span>
            </div>
            <div style={S.miniStat}>
              <span style={{ ...S.miniN, color:"#27500A" }}>{stat.nbNotes}/{stat.nbEleves}</span>
              <span style={S.miniL}>Notes saisies</span>
            </div>
            <div style={S.miniStat}>
              <span style={{ ...S.miniN, color: stat.moy ? note7Color(Math.round(stat.moy)) : "#aaa" }}>
                {stat.moy ? `${stat.moy}/7` : "—"}
              </span>
              <span style={S.miniL}>Moyenne</span>
            </div>
          </div>
          {/* Barre de progression */}
          <div style={{ background:"#f0f0f0",borderRadius:20,height:6,overflow:"hidden" }}>
            <div style={{ height:"100%",borderRadius:20,background:pct===100?"#27500A":"#1B3A6B",width:`${pct}%`,transition:"width 0.3s" }} />
          </div>
          <p style={{ fontSize:11,color:"#888",margin:"4px 0 0" }}>{pct}% des notes saisies</p>
        </div>
      );
    });
  }

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={S.navL}>
          <div style={S.navLogo}>E</div>
          <div>
            <div style={S.navT}>EPIA Lomé — Espace Professeur</div>
            <div style={S.navS}>{prof?.prenom} {prof?.nom}</div>
          </div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <select style={S.selAnn} value={selAnnee} onChange={e => changeAnnee(e.target.value)}>
            {annees.map(a => <option key={a.id} value={a.annee} style={{ color:"#111" }}>{a.annee}{a.active?" ★":""}</option>)}
          </select>
          <button style={S.navBtn} onClick={logout}>Déconnexion</button>
        </div>
      </nav>

      <div style={S.wrap}>
        <h1 style={S.welcome}>Bonjour, {prof?.prenom} 👋</h1>
        <p style={S.sub}>{today}</p>

        {/* Stats globales */}
        <div style={S.grid4}>
          {[
            { icon:"📚", n: matieres.length,     l:"Matières assignées" },
            { icon:"👨‍🎓", n: matD1.length > 0 ? (statsMap[`${matD1[0]?.matiere}-${matD1[0]?.niveau}-D1`]?.nbEleves || "—") : "—", l:"Élèves D1" },
            { icon:"🎓", n: matD2.length > 0 ? (statsMap[`${matD2[0]?.matiere}-${matD2[0]?.niveau}-D2`]?.nbEleves || "—") : "—", l:"Élèves D2" },
            { icon:"📝", n: totalNotes,           l:"Notes saisies total" },
          ].map((st,i) => (
            <div key={i} style={S.statCard}>
              <span style={{ fontSize:24 }}>{st.icon}</span>
              <span style={S.statN}>{st.n}</span>
              <span style={S.statL}>{st.l}</span>
            </div>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:16 }}>
          <div>
            {/* Matières D1 */}
            {matD1.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <p style={S.secT}>
                  <span style={S.pdBadge("D1")}>D1</span>
                  Première année — {matD1.length} matière(s)
                </p>
                {renderMatieres(matD1, "D1")}
              </div>
            )}

            {/* Matières D2 */}
            <div>
              <p style={S.secT}>
                <span style={S.pdBadge("D2")}>D2</span>
                Deuxième année — {matD2.length} matière(s)
              </p>
              {renderMatieres(matD2, "D2")}
            </div>
          </div>

          {/* Actions rapides */}
          <div>
            <div style={{ background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1.25rem" }}>
              <p style={{ fontSize:14,fontWeight:600,color:"#111",margin:"0 0 12px" }}>⚡ Actions rapides</p>
              {[
                { icon:"📝", label:"Saisir des notes",    path:"/prof/notes" },
                { icon:"📋", label:"Faire l'appel",       path:"/appel" },
                { icon:"📖", label:"Cahier de textes",    path:"/cahier" },
              ].map((a,i) => (
                <button key={i} style={S.quickBtn} onClick={() => navigate(a.path)}>
                  <span style={{ fontSize:20 }}>{a.icon}</span>
                  {a.label}
                </button>
              ))}
            </div>

            {/* Info matières */}
            {matieres.length === 0 && (
              <div style={{ ...S.noMat, marginTop:12 }}>
                ℹ️ Aucune matière assignée. Contactez l'administrateur pour {selAnnee}.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
