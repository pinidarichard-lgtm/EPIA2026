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
  if (n >= 6) return "#27500A";
  if (n >= 4) return "#185FA5";
  if (n >= 3) return "#8B6914";
  return "#A32D2D";
}

export default function EleveNotes() {
  const [eleve,    setEleve]    = useState(null);
  const [matieres, setMatieres] = useState([]);
  const [notes,    setNotes]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selAnnee, setSelAnnee] = useState("");
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: eleveData } = await supabaseAdmin.from("eleves").select("*").eq("auth_id", user.id).single();
    setEleve(eleveData);
    setSelAnnee(eleveData?.annee_scolaire || "");

    if (!eleveData) { setLoading(false); return; }

    const [{ data: mat }, { data: notesData }] = await Promise.all([
      supabaseAdmin.from("eleve_matieres").select("*").eq("eleve_id", eleveData.id),
      supabaseAdmin.from("notes").select("*").eq("eleve_id", eleveData.id).order("created_at", { ascending: false }),
    ]);
    setMatieres(mat || []);
    setNotes(notesData || []);
    setLoading(false);
  }

  // Grouper notes par matière
  const notesByMatiere = {};
  notes.forEach(n => {
    if (!notesByMatiere[n.matiere]) notesByMatiere[n.matiere] = [];
    notesByMatiere[n.matiere].push(n);
  });

  // Moyenne générale sur 7
  const notes7 = notes.filter(n => n.note >= 1 && n.note <= 7);
  const moy7 = notes7.length > 0 ? (notes7.reduce((s,n) => s+n.note,0)/notes7.length).toFixed(2) : "—";

  // Total points (sur 42 pour les 6 matières)
  const matieresPrincipales = matieres.filter(m => m.groupe_matiere !== "Tronc commun");
  const notesParMatiere = matieresPrincipales.map(m => {
    const ns = notes.filter(n => n.matiere === m.matiere && n.note <= 7);
    const last = ns[0];
    return { ...m, note: last?.note || null };
  });
  const totalPoints = notesParMatiere.reduce((s,m) => s + (m.note||0), 0);

  const s = {
    page:   { minHeight:"100vh", background:"#f5f7fa", fontFamily:"sans-serif" },
    nav:    { background:"#1B3A6B", padding:"0 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 },
    navL:   { display:"flex", alignItems:"center", gap:12 },
    navLogo:{ width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700 },
    navT:   { color:"#fff", fontWeight:600, fontSize:15 },
    navS:   { color:"rgba(255,255,255,0.6)", fontSize:12 },
    navBtn: { padding:"6px 14px",background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",borderRadius:7,fontSize:13,cursor:"pointer" },
    wrap:   { padding:"1.5rem", maxWidth:1000, margin:"0 auto" },
    title:  { fontSize:20,fontWeight:600,color:"#111",margin:"0 0 1.5rem" },
    grid3:  { display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:"1.5rem" },
    stat:   { background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1.25rem" },
    statN:  { fontSize:28,fontWeight:700,color:"#1B3A6B",display:"block",margin:"8px 0 2px" },
    statL:  { fontSize:13,color:"#888" },
    card:   { background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1.25rem",marginBottom:10 },
    cardT:  { fontSize:15,fontWeight:600,color:"#111",margin:"0 0 1rem" },
    matRow: { display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f5f5f5" },
    matN:   { fontSize:13,fontWeight:500,color:"#111",margin:0 },
    matS:   { fontSize:11,color:"#aaa",margin:"2px 0 0" },
    note7:  (n) => ({ fontSize:22,fontWeight:700,color:note7Color(n),minWidth:32,textAlign:"center" }),
    badge:  { fontSize:11,padding:"2px 8px",borderRadius:20,fontWeight:500,background:"#EEEDFE",color:"#3C3489" },
    badgeNS:{ fontSize:11,padding:"2px 8px",borderRadius:20,fontWeight:500,background:"#FFF9EC",color:"#8B6914" },
    detRow: { display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f9f9f9",fontSize:12 },
  };

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh" }}>Chargement...</div>;

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navL}>
          <div style={s.navLogo}>E</div>
          <div><div style={s.navT}>EPIA Lomé</div><div style={s.navS}>Mes notes</div></div>
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <button style={s.navBtn} onClick={() => navigate("/eleve/dashboard")}>← Dashboard</button>
          <button style={s.navBtn} onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}>Déconnexion</button>
        </div>
      </nav>

      <div style={s.wrap}>
        <h1 style={s.title}>📝 Mes notes — {eleve?.prenom} {eleve?.nom}</h1>

        {/* Stats */}
        <div style={s.grid3}>
          {[
            { icon:"📊", n: moy7,        l:"Moyenne /7" },
            { icon:"🎯", n: `${totalPoints}/42`, l:"Total points" },
            { icon:"📚", n: matieresPrincipales.length, l:"Matières" },
            { icon:"📝", n: notes.length, l:"Évaluations" },
          ].map((st,i) => (
            <div key={i} style={s.stat}>
              <span style={{ fontSize:22 }}>{st.icon}</span>
              <span style={s.statN}>{st.n}</span>
              <span style={s.statL}>{st.l}</span>
            </div>
          ))}
        </div>

        {/* Notes par matière */}
        <div style={s.card}>
          <p style={s.cardT}>📚 Notes par matière</p>
          {notesParMatiere.length === 0
            ? <p style={{ fontSize:13,color:"#aaa" }}>Aucune matière assignée.</p>
            : notesParMatiere.map((m,i) => {
                const notesM = (notesByMatiere[m.matiere]||[]);
                const [open, setOpen] = useState(false);
                return (
                  <div key={i}>
                    <div style={s.matRow} onClick={() => setOpen(!open)} >
                      <div style={{ flex:1,cursor:"pointer" }}>
                        <p style={s.matN}>{m.matiere}</p>
                        <p style={s.matS}>
                          {m.groupe_matiere?.split("—")[0]?.trim()} ·{" "}
                          <span style={m.niveau==="NS"?s.badgeNS:s.badge}>{m.niveau}</span>
                        </p>
                      </div>
                      <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                        <span style={s.note7(m.note)}>{m.note || "—"}</span>
                        <span style={{ fontSize:12,color:"#aaa" }}>{open?"▲":"▼"}</span>
                      </div>
                    </div>
                    {open && (
                      <div style={{ background:"#fafafa",borderRadius:8,padding:"10px 12px",marginBottom:6 }}>
                        {notesM.length === 0
                          ? <p style={{ fontSize:12,color:"#aaa",margin:0 }}>Aucune note enregistrée.</p>
                          : notesM.map((n,j) => (
                            <div key={j} style={s.detRow}>
                              <div>
                                <span style={{ fontWeight:500,color:"#333" }}>{n.periode}</span>
                                {n.commentaire && <span style={{ color:"#aaa",marginLeft:8 }}>— {n.commentaire}</span>}
                              </div>
                              <div style={{ display:"flex",gap:12,alignItems:"center" }}>
                                {n.epreuves_detail && (
                                  <span style={{ color:"#888" }}>
                                    {Object.entries(n.epreuves_detail).map(([ep,v]) => `${ep}: ${v}`).join(" · ")}
                                  </span>
                                )}
                                <span style={{ fontWeight:700,color:note7Color(n.note),fontSize:14 }}>{n.note}/7</span>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                );
              })
          }
        </div>

        {/* Tronc commun */}
        <div style={s.card}>
          <p style={s.cardT}>🎓 Tronc commun</p>
          {["Théorie de la Connaissance (TdC)", "Mémoire (Extended Essay)", "CAS"].map((t,i) => {
            const inscrit = matieres.find(m => m.matiere === t);
            return (
              <div key={i} style={s.matRow}>
                <p style={s.matN}>{t}</p>
                <span style={{ fontSize:11,padding:"2px 8px",borderRadius:20,fontWeight:500,background:inscrit?"#EAF3DE":"#f5f5f5",color:inscrit?"#27500A":"#aaa" }}>
                  {inscrit ? "✓ Inscrit" : "Non inscrit"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
