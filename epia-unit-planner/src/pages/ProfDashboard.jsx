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

export default function ProfDashboard() {
  const [prof, setProf]         = useState(null);
  const [stats, setStats]       = useState({ notes:0, absences:0, cahier:0, eleves:0 });
  const [recent, setRecent]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profData } = await supabaseAdmin
      .from("profs").select("*").eq("auth_id", user.id).single();
    setProf(profData);

    const nom = profData ? `${profData.prenom} ${profData.nom}` : "";

    const [{ count: nbNotes }, { count: nbAbs }, { count: nbCahier }, { count: nbEleves }, { data: recentNotes }] = await Promise.all([
      supabaseAdmin.from("notes").select("*", { count:"exact", head:true }).eq("enseignant", nom),
      supabaseAdmin.from("absences").select("*", { count:"exact", head:true }),
      supabaseAdmin.from("cahier_textes").select("*", { count:"exact", head:true }).eq("enseignant", nom),
      supabaseAdmin.from("eleves").select("*", { count:"exact", head:true }).eq("actif", true),
      supabaseAdmin.from("notes").select("*").eq("enseignant", nom).order("created_at", { ascending:false }).limit(5),
    ]);

    setStats({ notes: nbNotes||0, absences: nbAbs||0, cahier: nbCahier||0, eleves: nbEleves||0 });
    setRecent(recentNotes || []);
    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  const s = {
    page:    { minHeight:"100vh", background:"#f5f7fa", fontFamily:"sans-serif" },
    nav:     { background:"#1B3A6B", padding:"0 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 },
    navL:    { display:"flex", alignItems:"center", gap:12 },
    navLogo: { width:32, height:32, borderRadius:8, background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:16 },
    navTitle:{ color:"#fff", fontWeight:600, fontSize:15 },
    navSub:  { color:"rgba(255,255,255,0.6)", fontSize:12 },
    navBtn:  { padding:"6px 14px", background:"rgba(255,255,255,0.15)", color:"#fff", border:"1px solid rgba(255,255,255,0.3)", borderRadius:7, fontSize:13, cursor:"pointer" },
    wrap:    { padding:"1.5rem", maxWidth:1000, margin:"0 auto" },
    welcome: { fontSize:22, fontWeight:600, color:"#111", margin:"0 0 4px" },
    sub:     { fontSize:14, color:"#888", margin:"0 0 1.5rem" },
    grid4:   { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:12, marginBottom:"1.5rem" },
    statCard:{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"1.25rem", display:"flex", flexDirection:"column", gap:4 },
    statN:   { fontSize:28, fontWeight:700, color:"#1B3A6B" },
    statL:   { fontSize:13, color:"#888" },
    grid2:   { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
    card:    { background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"1.25rem" },
    cardT:   { fontSize:15, fontWeight:600, color:"#111", margin:"0 0 1rem" },
    menuBtn: { display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:9, border:"1px solid #eee", background:"#fff", cursor:"pointer", fontSize:13, color:"#333", marginBottom:8, width:"100%", textAlign:"left" },
    menuIcon:{ fontSize:20 },
    tag:     { fontSize:11, padding:"2px 8px", borderRadius:20, fontWeight:500 },
  };

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>Chargement...</div>;

  const today = new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" });

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navL}>
          <div style={s.navLogo}>E</div>
          <div>
            <div style={s.navTitle}>EPIA Lomé</div>
            <div style={s.navSub}>Espace Professeur</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ color:"rgba(255,255,255,0.8)", fontSize:13 }}>{prof?.prenom} {prof?.nom}</span>
          <button style={s.navBtn} onClick={logout}>Déconnexion</button>
        </div>
      </nav>

      <div style={s.wrap}>
        <h1 style={s.welcome}>Bonjour, {prof?.prenom} 👋</h1>
        <p style={s.sub}>{today}</p>

        <div style={s.grid4}>
          {[
            { n: stats.eleves,   l: "Élèves actifs",     icon:"👨‍🎓" },
            { n: stats.notes,    l: "Notes saisies",      icon:"📝" },
            { n: stats.absences, l: "Absences totales",   icon:"📋" },
            { n: stats.cahier,   l: "Entrées cahier",     icon:"📖" },
          ].map((st, i) => (
            <div key={i} style={s.statCard}>
              <span style={{ fontSize:24 }}>{st.icon}</span>
              <span style={s.statN}>{st.n}</span>
              <span style={s.statL}>{st.l}</span>
            </div>
          ))}
        </div>

        <div style={s.grid2}>
          <div style={s.card}>
            <p style={s.cardT}>📌 Actions rapides</p>
            {[
              { icon:"📝", label:"Saisir des notes",         path:"/prof/notes" },
              { icon:"📋", label:"Faire l'appel",            path:"/appel" },
              { icon:"📖", label:"Cahier de textes",         path:"/cahier" },
              { icon:"👨‍🎓", label:"Liste des élèves",        path:"/eleves" },
            ].map((m, i) => (
              <button key={i} style={s.menuBtn} onClick={() => navigate(m.path)}>
                <span style={s.menuIcon}>{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>

          <div style={s.card}>
            <p style={s.cardT}>📝 Dernières notes saisies</p>
            {recent.length === 0
              ? <p style={{ fontSize:13, color:"#aaa" }}>Aucune note saisie récemment.</p>
              : recent.map((n, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #f5f5f5" }}>
                  <div>
                    <p style={{ fontSize:13, fontWeight:500, margin:0, color:"#111" }}>{n.matiere}</p>
                    <p style={{ fontSize:11, color:"#aaa", margin:0 }}>{n.periode} · {n.annee_pd}</p>
                  </div>
                  <span style={{ fontSize:16, fontWeight:700, color:"#1B3A6B" }}>{n.note}/20</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
