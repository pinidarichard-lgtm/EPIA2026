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

export default function EleveDashboard() {
  const [eleve, setEleve]       = useState(null);
  const [notes, setNotes]       = useState([]);
  const [absences, setAbsences] = useState([]);
  const [cahier, setCahier]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: eleveData } = await supabaseAdmin
      .from("eleves").select("*").eq("auth_id", user.id).single();
    setEleve(eleveData);

    if (!eleveData) return;

    const [{ data: notesData }, { data: absData }, { data: cahierData }] = await Promise.all([
      supabaseAdmin.from("notes").select("*").eq("eleve_id", eleveData.id).order("created_at", { ascending:false }).limit(10),
      supabaseAdmin.from("absences").select("*").eq("eleve_id", eleveData.id).order("date_absence", { ascending:false }).limit(5),
      supabaseAdmin.from("cahier_textes").select("*").eq("annee_pd", eleveData.annee_pd).order("date_cours", { ascending:false }).limit(5),
    ]);

    setNotes(notesData || []);
    setAbsences(absData || []);
    setCahier(cahierData || []);
    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  // Moyenne générale
  const moyenne = notes.length > 0
    ? (notes.reduce((s, n) => s + parseFloat(n.note), 0) / notes.length).toFixed(2)
    : "—";

  const nbJustif = absences.filter(a => a.justifie).length;

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
    grid4:   { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:12, marginBottom:"1.5rem" },
    statCard:{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"1.25rem" },
    statN:   { fontSize:28, fontWeight:700, color:"#1B3A6B", display:"block", margin:"8px 0 2px" },
    statL:   { fontSize:13, color:"#888" },
    grid2:   { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 },
    card:    { background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"1.25rem" },
    cardT:   { fontSize:15, fontWeight:600, color:"#111", margin:"0 0 1rem" },
    noteRow: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #f5f5f5" },
    noteMat: { fontSize:13, fontWeight:500, color:"#111", margin:0 },
    noteSub: { fontSize:11, color:"#aaa", margin:0 },
    badge:   (ok) => ({ fontSize:11, padding:"2px 8px", borderRadius:20, fontWeight:500, background: ok?"#EAF3DE":"#FCEBEB", color: ok?"#27500A":"#A32D2D" }),
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
            <div style={s.navSub}>Espace Élève</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ color:"rgba(255,255,255,0.8)", fontSize:13 }}>{eleve?.prenom} {eleve?.nom}</span>
          <button style={s.navBtn} onClick={logout}>Déconnexion</button>
        </div>
      </nav>

      <div style={s.wrap}>
        <h1 style={s.welcome}>Bonjour, {eleve?.prenom} 👋</h1>
        <p style={s.sub}>{today} · {eleve?.annee_pd} — {eleve?.annee_scolaire}</p>

        <div style={s.grid4}>
          {[
            { icon:"📊", n: moyenne,          l:"Moyenne générale" },
            { icon:"📝", n: notes.length,     l:"Notes reçues" },
            { icon:"📋", n: absences.length,  l:"Absences" },
            { icon:"✅", n: nbJustif,         l:"Justifiées" },
          ].map((st, i) => (
            <div key={i} style={s.statCard}>
              <span style={{ fontSize:22 }}>{st.icon}</span>
              <span style={s.statN}>{st.n}</span>
              <span style={s.statL}>{st.l}</span>
            </div>
          ))}
        </div>

        <div style={s.grid2}>
          <div style={s.card}>
            <p style={s.cardT}>📝 Mes dernières notes</p>
            {notes.length === 0
              ? <p style={{ fontSize:13, color:"#aaa" }}>Aucune note disponible.</p>
              : notes.slice(0,6).map((n, i) => (
                <div key={i} style={s.noteRow}>
                  <div>
                    <p style={s.noteMat}>{n.matiere}</p>
                    <p style={s.noteSub}>{n.periode} · {n.enseignant}</p>
                  </div>
                  <span style={{ fontSize:16, fontWeight:700, color: n.note>=10?"#27500A":"#A32D2D" }}>{n.note}/20</span>
                </div>
              ))
            }
          </div>

          <div style={s.card}>
            <p style={s.cardT}>📋 Mes absences récentes</p>
            {absences.length === 0
              ? <p style={{ fontSize:13, color:"#aaa" }}>Aucune absence enregistrée.</p>
              : absences.map((a, i) => (
                <div key={i} style={s.noteRow}>
                  <div>
                    <p style={s.noteMat}>{new Date(a.date_absence).toLocaleDateString("fr-FR")}</p>
                    <p style={s.noteSub}>{a.matiere} · {a.periode}</p>
                  </div>
                  <span style={s.badge(a.justifie)}>{a.justifie ? "Justifiée" : "Non just."}</span>
                </div>
              ))
            }
          </div>
        </div>

        <div style={s.card}>
          <p style={s.cardT}>📖 Cahier de textes récent</p>
          {cahier.length === 0
            ? <p style={{ fontSize:13, color:"#aaa" }}>Aucune entrée récente.</p>
            : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:10 }}>
                {cahier.map((c, i) => (
                  <div key={i} style={{ background:"#f9f9f9", borderRadius:9, border:"1px solid #eee", padding:"10px 12px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:500, color:"#111" }}>{c.matiere}</span>
                      <span style={{ fontSize:11, color:"#aaa" }}>{new Date(c.date_cours).toLocaleDateString("fr-FR")}</span>
                    </div>
                    <p style={{ fontSize:12, color:"#555", margin:"0 0 4px" }}>{c.contenu?.slice(0,80)}...</p>
                    {c.devoirs && <p style={{ fontSize:12, color:"#1B3A6B", margin:0 }}>📌 {c.devoirs?.slice(0,60)}...</p>}
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  );
}
