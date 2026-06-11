import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function note7Color(n) {
  if (!n) return "#aaa";
  if (n >= 6) return "#27500A";
  if (n >= 4) return "#185FA5";
  if (n >= 3) return "#8B6914";
  return "#A32D2D";
}

function StatCard({ icon, value, label, color }) {
  return (
    <div style={{ background:"#fff", border:"1px solid #eee", borderRadius:12, padding:"1.25rem" }}>
      <span style={{ fontSize:24 }}>{icon}</span>
      <div style={{ fontSize:28, fontWeight:700, color: color||"#1B3A6B", margin:"8px 0 2px" }}>{value}</div>
      <div style={{ fontSize:13, color:"#888" }}>{label}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [tab,       setTab]       = useState("D1");
  const [annees,    setAnnees]    = useState([]);
  const [selAnnee,  setSelAnnee]  = useState("");
  const [loading,   setLoading]   = useState(true);
  const [data,      setData]      = useState({ D1:{}, D2:{} });
  const navigate = useNavigate();

  useEffect(() => { loadInit(); }, []);
  useEffect(() => { if (selAnnee) loadStats(selAnnee); }, [selAnnee]);

  async function loadInit() {
    const { data: a } = await supabaseAdmin.from("annees_scolaires").select("*").order("annee", { ascending:false });
    setAnnees(a || []);
    const active = (a||[]).find(x => x.active);
    const ann = active?.annee || a?.[0]?.annee || "2024-2025";
    setSelAnnee(ann);
    setLoading(false);
  }

  async function loadStats(annee) {
    setLoading(true);
    const [{ data: elevesD1 }, { data: elevesD2 }] = await Promise.all([
      supabaseAdmin.from("eleves").select("*").eq("annee_pd","D1").eq("annee_scolaire", annee).eq("actif", true),
      supabaseAdmin.from("eleves").select("*").eq("annee_pd","D2").eq("annee_scolaire", annee).eq("actif", true),
    ]);

    const idsD1 = (elevesD1||[]).map(e => e.id);
    const idsD2 = (elevesD2||[]).map(e => e.id);

    const [
      { data: notesD1 }, { data: notesD2 },
      { data: absD1 },   { data: absD2 },
      { data: profsData },
    ] = await Promise.all([
      idsD1.length > 0 ? supabaseAdmin.from("notes").select("*").in("eleve_id", idsD1).eq("annee_scolaire", annee) : { data: [] },
      idsD2.length > 0 ? supabaseAdmin.from("notes").select("*").in("eleve_id", idsD2).eq("annee_scolaire", annee) : { data: [] },
      idsD1.length > 0 ? supabaseAdmin.from("absences").select("*").in("eleve_id", idsD1).eq("annee_scolaire", annee) : { data: [] },
      idsD2.length > 0 ? supabaseAdmin.from("absences").select("*").in("eleve_id", idsD2).eq("annee_scolaire", annee) : { data: [] },
      supabaseAdmin.from("profs").select("*").eq("actif", true),
    ]);

    function computeStats(eleves, notes, abs) {
      const notes7 = (notes||[]).filter(n => n.note >= 1 && n.note <= 7);
      const moy7   = notes7.length > 0 ? (notes7.reduce((s,n) => s+n.note, 0) / notes7.length).toFixed(2) : "—";

      // Par élève : total /42
      const parEleve = (eleves||[]).map(e => {
        const notesE   = (notes||[]).filter(n => n.eleve_id === e.id && n.note >= 1 && n.note <= 7);
        const total    = notesE.reduce((s,n) => s+n.note, 0);
        const absE     = (abs||[]).filter(a => a.eleve_id === e.id).length;
        return { ...e, total, nbNotes: notesE.length, absences: absE };
      }).sort((a,b) => b.total - a.total);

      // Distribution des notes
      const dist = { 7:0, 6:0, 5:0, 4:0, 3:0, 2:0, 1:0 };
      notes7.forEach(n => { if (dist[Math.round(n.note)] !== undefined) dist[Math.round(n.note)]++; });

      // Admissibles D2 (total >= 24)
      const admissibles = parEleve.filter(e => e.total >= 24).length;

      return { eleves: eleves||[], notes: notes||[], abs: abs||[], moy7, parEleve, dist, admissibles };
    }

    setData({
      D1: computeStats(elevesD1, notesD1, absD1),
      D2: computeStats(elevesD2, notesD2, absD2),
      profs: profsData||[],
    });
    setLoading(false);
  }

  const S = {
    page:   { minHeight:"100vh", background:"#f5f7fa", fontFamily:"sans-serif" },
    nav:    { background:"#1B3A6B", padding:"0 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 },
    navL:   { display:"flex", alignItems:"center", gap:12 },
    navLogo:{ width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700 },
    navT:   { color:"#fff", fontWeight:600, fontSize:15 },
    navS:   { color:"rgba(255,255,255,0.6)", fontSize:12 },
    navBtn: { padding:"6px 14px",background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",borderRadius:7,fontSize:13,cursor:"pointer" },
    wrap:   { padding:"1.5rem", maxWidth:1100, margin:"0 auto" },
    tabs:   { display:"flex", gap:8, marginBottom:"1.5rem" },
    tab:    (a,c) => ({ padding:"10px 24px", border:"1px solid", borderRadius:8, cursor:"pointer", fontSize:14, fontWeight:a?600:400, background:a?c:"transparent", color:a?"#fff":"#555", borderColor:a?c:"#ddd" }),
    grid4:  { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12, marginBottom:"1.5rem" },
    grid2:  { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 },
    card:   { background:"#fff", border:"1px solid #eee", borderRadius:12, padding:"1.25rem", marginBottom:12 },
    cardT:  { fontSize:15, fontWeight:600, color:"#111", margin:"0 0 1rem" },
    table:  { width:"100%", borderCollapse:"collapse" },
    th:     { padding:"8px 10px", textAlign:"left", fontSize:11, fontWeight:600, color:"#888", borderBottom:"2px solid #eee", background:"#fafafa" },
    thC:    { padding:"8px 10px", textAlign:"center", fontSize:11, fontWeight:600, color:"#888", borderBottom:"2px solid #eee", background:"#fafafa" },
    td:     { padding:"8px 10px", fontSize:13, borderBottom:"1px solid #f5f5f5", color:"#111" },
    tdC:    { padding:"8px 10px", fontSize:13, borderBottom:"1px solid #f5f5f5", textAlign:"center" },
    btnSm:  { padding:"4px 10px", fontSize:11, border:"1px solid #ddd", borderRadius:6, background:"transparent", cursor:"pointer" },
    distBar:{ display:"flex", gap:4, alignItems:"flex-end", height:80, marginTop:8 },
    bar:    (h, c) => ({ flex:1, background:c, borderRadius:"4px 4px 0 0", height:`${h}%`, minHeight:4, transition:"height 0.3s" }),
    barLbl: { display:"flex", gap:4, marginTop:4 },
    barL:   { flex:1, textAlign:"center", fontSize:10, color:"#888" },
    sel:    { padding:"6px 10px", border:"1px solid rgba(255,255,255,0.3)", borderRadius:7, background:"rgba(255,255,255,0.15)", color:"#fff", fontSize:13, outline:"none" },
  };

  const d = data[tab] || {};
  const color = tab === "D1" ? "#185FA5" : "#27500A";
  const bgColor = tab === "D1" ? "#1B3A6B" : "#1a5c2a";
  const maxDist = Math.max(...Object.values(d.dist||{}), 1);
  const distColors = { 7:"#27500A", 6:"#4CAF50", 5:"#8BC34A", 4:"#185FA5", 3:"#FFC107", 2:"#FF9800", 1:"#F44336" };

  return (
    <div style={S.page}>
      <nav style={{ ...S.nav, background: bgColor }}>
        <div style={S.navL}>
          <div style={S.navLogo}>E</div>
          <div><div style={S.navT}>EPIA — Tableau de bord</div><div style={S.navS}>Vue d'ensemble {tab}</div></div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <select style={S.sel} value={selAnnee} onChange={e => setSelAnnee(e.target.value)}>
            {annees.map(a => <option key={a.id} value={a.annee} style={{ color:"#111" }}>{a.annee}{a.active?" ★":""}</option>)}
          </select>
          <button style={S.navBtn} onClick={() => navigate("/admin")}>⚙️ Admin</button>
        </div>
      </nav>

      <div style={S.wrap}>
        <div style={S.tabs}>
          <button style={S.tab(tab==="D1","#1B3A6B")} onClick={() => setTab("D1")}>
            👨‍🎓 D1 — Première année {data.D1?.eleves?.length !== undefined ? `(${data.D1.eleves.length})` : ""}
          </button>
          <button style={S.tab(tab==="D2","#1a5c2a")} onClick={() => setTab("D2")}>
            🎓 D2 — Deuxième année {data.D2?.eleves?.length !== undefined ? `(${data.D2.eleves.length})` : ""}
          </button>
        </div>

        {loading
          ? <div style={{ textAlign:"center", padding:"3rem", color:"#aaa" }}>Chargement...</div>
          : <>
              {/* Stats */}
              <div style={S.grid4}>
                <StatCard icon="👨‍🎓" value={d.eleves?.length||0}    label="Élèves" color={color} />
                <StatCard icon="📊" value={`${d.moy7}/7`}           label="Moyenne générale" color={color} />
                <StatCard icon="📝" value={d.notes?.length||0}       label="Notes saisies" />
                <StatCard icon="📋" value={d.abs?.length||0}         label="Absences totales" />
                {tab==="D2" && <StatCard icon="🎯" value={`${d.admissibles||0}/${d.eleves?.length||0}`} label="Admissibles (≥24 pts)" color="#27500A" />}
              </div>

              <div style={S.grid2}>
                {/* Classement élèves */}
                <div style={S.card}>
                  <p style={S.cardT}>🏆 Classement des élèves</p>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>#</th>
                        <th style={S.th}>Élève</th>
                        <th style={S.thC}>Total /42</th>
                        <th style={S.thC}>Notes</th>
                        <th style={S.thC}>Abs.</th>
                        <th style={S.thC}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(d.parEleve||[]).length === 0
                        ? <tr><td colSpan={6} style={{ ...S.td, textAlign:"center", color:"#aaa", padding:"2rem" }}>Aucun élève.</td></tr>
                        : (d.parEleve||[]).map((e,i) => (
                          <tr key={e.id} style={{ background:i%2===0?"#fff":"#fafafa" }}>
                            <td style={{ ...S.tdC, fontWeight:700, color:i<3?color:"#aaa" }}>{i+1}</td>
                            <td style={S.td}>
                              <div style={{ fontWeight:500 }}>{e.prenom} {e.nom}</div>
                            </td>
                            <td style={S.tdC}>
                              <span style={{ fontWeight:700, color:e.total>=24?color:"#A32D2D" }}>{e.total||"—"}</span>
                            </td>
                            <td style={S.tdC}>{e.nbNotes}</td>
                            <td style={{ ...S.tdC, color:e.absences>5?"#A32D2D":"#111" }}>{e.absences}</td>
                            <td style={S.tdC}>
                              <button style={S.btnSm} onClick={() => navigate(`/admin/bulletin/${e.id}`)}>📊</button>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>

                {/* Graphique + infos */}
                <div>
                  <div style={S.card}>
                    <p style={S.cardT}>📊 Distribution des notes /7</p>
                    <div style={S.distBar}>
                      {[7,6,5,4,3,2,1].map(n => {
                        const count = d.dist?.[n] || 0;
                        const pct   = maxDist > 0 ? (count/maxDist)*100 : 0;
                        return (
                          <div key={n} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
                            <span style={{ fontSize:10, color:"#aaa", marginBottom:2 }}>{count}</span>
                            <div style={S.bar(pct, distColors[n])} title={`Note ${n}: ${count} élève(s)`} />
                          </div>
                        );
                      })}
                    </div>
                    <div style={S.barLbl}>
                      {[7,6,5,4,3,2,1].map(n => <span key={n} style={{ ...S.barL, color:distColors[n], fontWeight:600 }}>{n}</span>)}
                    </div>
                  </div>

                  <div style={S.card}>
                    <p style={S.cardT}>👩‍🏫 Professeurs actifs</p>
                    {(data.profs||[]).map((p,i) => (
                      <div key={p.id} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #f5f5f5", fontSize:13 }}>
                        <span style={{ fontWeight:500 }}>{p.prenom} {p.nom}</span>
                        <span style={{ fontSize:11, color:"#888" }}>{p.email}</span>
                      </div>
                    ))}
                    {(data.profs||[]).length === 0 && <p style={{ fontSize:13, color:"#aaa" }}>Aucun professeur.</p>}
                  </div>

                  {tab === "D2" && (
                    <div style={{ ...S.card, background:"#f0f7f0", borderColor:"#C0DD97" }}>
                      <p style={{ ...S.cardT, color:"#27500A" }}>🎯 Prévision résultats IB</p>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                        <div style={{ textAlign:"center", background:"#EAF3DE", borderRadius:8, padding:"10px" }}>
                          <div style={{ fontSize:24, fontWeight:700, color:"#27500A" }}>{d.admissibles||0}</div>
                          <div style={{ fontSize:12, color:"#555" }}>Admissibles (≥24 pts)</div>
                        </div>
                        <div style={{ textAlign:"center", background:"#FCEBEB", borderRadius:8, padding:"10px" }}>
                          <div style={{ fontSize:24, fontWeight:700, color:"#A32D2D" }}>{(d.eleves?.length||0)-(d.admissibles||0)}</div>
                          <div style={{ fontSize:12, color:"#555" }}>En dessous ({"<"}24 pts)</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
        }
      </div>
    </div>
  );
}
