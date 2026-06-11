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

export default function EleveCahier() {
  const [eleve,    setEleve]    = useState(null);
  const [cahier,   setCahier]   = useState([]);
  const [rendus,   setRendus]   = useState([]);
  const [annees,   setAnnees]   = useState([]);
  const [selAnnee, setSelAnnee] = useState("");
  const [selMat,   setSelMat]   = useState("tout");
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null); // cahier entry
  const [renduText,setRenduText]= useState("");
  const [saving,   setSaving]   = useState(false);
  const [banner,   setBanner]   = useState(null);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (selAnnee && eleve) reloadCahier(eleve.id, selAnnee); }, [selAnnee]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: e } = await supabaseAdmin.from("eleves").select("*").eq("auth_id", user.id).single();
    setEleve(e);
    const { data: a } = await supabaseAdmin.from("annees_scolaires").select("*").order("annee", { ascending:false });
    setAnnees(a||[]);
    const ann = e?.annee_scolaire || (a||[])[0]?.annee || "2024-2025";
    setSelAnnee(ann);
    if (e) await reloadCahier(e.id, ann);
    setLoading(false);
  }

  async function reloadCahier(eleveId, annee) {
    const { data: mat } = await supabaseAdmin.from("eleve_matieres")
      .select("matiere").eq("eleve_id", eleveId).eq("annee_scolaire", annee)
      .neq("groupe_matiere", "Tronc commun");
    const matieresList = (mat||[]).map(m => m.matiere);

    const [{ data: c }, { data: r }] = await Promise.all([
      matieresList.length > 0
        ? supabaseAdmin.from("cahier_textes").select("*").eq("annee_scolaire", annee)
            .in("matiere", matieresList).order("date_cours", { ascending:false })
        : { data: [] },
      supabaseAdmin.from("devoirs_rendus").select("*").eq("eleve_id", eleveId).eq("annee_scolaire", annee),
    ]);
    setCahier(c||[]);
    setRendus(r||[]);
  }

  async function submitDevoir() {
    if (!modal || !renduText.trim()) { showBanner("Écrivez votre devoir avant de soumettre.", "error"); return; }
    setSaving(true);
    const existing = rendus.find(r => r.cahier_id === modal.id);
    const payload = {
      cahier_id: modal.id, eleve_id: eleve.id,
      contenu: renduText, statut: "rendu", annee_scolaire: selAnnee,
    };
    if (existing) {
      await supabaseAdmin.from("devoirs_rendus").update(payload).eq("id", existing.id);
    } else {
      await supabaseAdmin.from("devoirs_rendus").insert(payload);
    }
    await reloadCahier(eleve.id, selAnnee);
    setModal(null);
    setRenduText("");
    setSaving(false);
    showBanner("✓ Devoir soumis avec succès !", "success");
  }

  function showBanner(msg, type) { setBanner({msg,type}); setTimeout(()=>setBanner(null),4000); }

  const matieres = [...new Set(cahier.map(c => c.matiere))];
  const filtered  = cahier.filter(c => selMat === "tout" || c.matiere === selMat);
  const avecDevoir = cahier.filter(c => c.devoirs);
  const rendusCount = rendus.length;

  const S = {
    page:    { minHeight:"100vh", background:"#f5f7fa", fontFamily:"sans-serif" },
    nav:     { background:"#1B3A6B", padding:"0 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 },
    navL:    { display:"flex", alignItems:"center", gap:12 },
    navLogo: { width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700 },
    navT:    { color:"#fff", fontWeight:600, fontSize:15 },
    navS:    { color:"rgba(255,255,255,0.6)", fontSize:12 },
    navBtn:  { padding:"6px 14px",background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",borderRadius:7,fontSize:13,cursor:"pointer" },
    wrap:    { padding:"1.5rem", maxWidth:1000, margin:"0 auto" },
    banner:  (t) => ({ padding:"10px 14px",borderRadius:8,fontSize:13,marginBottom:"1rem",background:t==="success"?"#EAF3DE":"#FCEBEB",color:t==="success"?"#27500A":"#A32D2D",border:`1px solid ${t==="success"?"#C0DD97":"#F7C1C1"}` }),
    grid3:   { display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:"1.5rem" },
    stat:    { background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1.25rem",textAlign:"center" },
    statN:   { fontSize:26,fontWeight:700,color:"#1B3A6B",display:"block",margin:"6px 0 2px" },
    statL:   { fontSize:12,color:"#888" },
    filtRow: { display:"flex",gap:6,flexWrap:"wrap",marginBottom:"1.25rem" },
    fBtn:    (on) => ({ padding:"6px 14px",border:`1px solid ${on?"#1B3A6B":"#ddd"}`,borderRadius:20,background:on?"#1B3A6B":"transparent",color:on?"#fff":"#555",cursor:"pointer",fontSize:12,fontWeight:on?500:400 }),
    card:    { background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1.25rem",marginBottom:10 },
    cardTop: { display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 },
    cardT:   { fontSize:14,fontWeight:600,color:"#111",margin:0 },
    cardS:   { fontSize:11,color:"#888",margin:"3px 0 0" },
    date:    { fontSize:11,color:"#aaa",textAlign:"right" },
    contenu: { fontSize:13,color:"#444",lineHeight:1.6,margin:"8px 0" },
    devoir:  { background:"#FFF9EC",border:"1px solid #FAC775",borderRadius:8,padding:"10px 12px",fontSize:13,color:"#633806",marginTop:8 },
    renduTag:(s) => ({ fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:500,background:s==="rendu"?"#EAF3DE":s==="noté"?"#E6F1FB":"#f5f5f5",color:s==="rendu"?"#27500A":s==="noté"?"#185FA5":"#aaa" }),
    btnP:    { padding:"7px 14px",background:"#1B3A6B",color:"#fff",border:"none",borderRadius:7,fontSize:12,fontWeight:500,cursor:"pointer" },
    btnSm:   { padding:"5px 12px",background:"transparent",color:"#555",border:"1px solid #ddd",borderRadius:7,fontSize:12,cursor:"pointer" },
    modal:   { position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100 },
    mBox:    { background:"#fff",borderRadius:14,padding:"1.75rem",width:520,maxWidth:"94vw",maxHeight:"90vh",overflowY:"auto" },
    mTitle:  { fontSize:16,fontWeight:600,margin:"0 0 4px",color:"#111" },
    mSub:    { fontSize:12,color:"#888",margin:"0 0 1.25rem" },
    ta:      { width:"100%",padding:"10px 12px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box",resize:"vertical",minHeight:120,fontFamily:"sans-serif",lineHeight:1.6 },
    mAct:    { display:"flex",gap:8,justifyContent:"flex-end",marginTop:"1rem" },
    sel:     { padding:"6px 10px",border:"1px solid rgba(255,255,255,0.3)",borderRadius:7,background:"rgba(255,255,255,0.15)",color:"#fff",fontSize:13,outline:"none" },
  };

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh" }}>Chargement...</div>;

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={S.navL}>
          <div style={S.navLogo}>E</div>
          <div><div style={S.navT}>EPIA Lomé</div><div style={S.navS}>Cahier de textes</div></div>
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
        {banner && <div style={S.banner(banner.type)}>{banner.msg}</div>}

        <h1 style={{ fontSize:20,fontWeight:600,color:"#111",margin:"0 0 1.5rem" }}>
          📖 Cahier de textes — {eleve?.prenom} {eleve?.nom}
        </h1>

        {/* Stats */}
        <div style={S.grid3}>
          {[
            { icon:"📖", n:cahier.length,      l:"Cours enregistrés" },
            { icon:"📝", n:avecDevoir.length,  l:"Devoirs à faire" },
            { icon:"✅", n:rendusCount,         l:"Devoirs rendus" },
          ].map((st,i) => (
            <div key={i} style={S.stat}>
              <span style={{ fontSize:22 }}>{st.icon}</span>
              <span style={S.statN}>{st.n}</span>
              <span style={S.statL}>{st.l}</span>
            </div>
          ))}
        </div>

        {/* Filtres matières */}
        <div style={S.filtRow}>
          <button style={S.fBtn(selMat==="tout")} onClick={() => setSelMat("tout")}>Toutes les matières</button>
          {matieres.map(m => (
            <button key={m} style={S.fBtn(selMat===m)} onClick={() => setSelMat(m)}>
              {m.split("—")[0]?.trim()}
            </button>
          ))}
        </div>

        {filtered.length === 0
          ? <div style={{ ...S.card,textAlign:"center",padding:"3rem",color:"#aaa" }}>
              <p style={{ fontSize:32,margin:"0 0 8px" }}>📖</p>
              <p style={{ fontSize:14 }}>Aucun cours enregistré pour cette matière.</p>
            </div>
          : filtered.map(c => {
              const rendu = rendus.find(r => r.cahier_id === c.id);
              return (
                <div key={c.id} style={S.card}>
                  <div style={S.cardTop}>
                    <div>
                      <p style={S.cardT}>{c.matiere}</p>
                      <p style={S.cardS}>{c.enseignant} · {c.niveau || c.annee_pd}</p>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <p style={S.date}>{new Date(c.date_cours).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"long"})}</p>
                    </div>
                  </div>

                  {c.contenu && (
                    <div style={S.contenu}>{c.contenu}</div>
                  )}

                  {c.observations && (
                    <div style={{ fontSize:12,color:"#888",fontStyle:"italic",marginBottom:6 }}>
                      📌 {c.observations}
                    </div>
                  )}

                  {c.devoirs && (
                    <div style={S.devoir}>
                      <div style={{ fontWeight:600,marginBottom:4 }}>📝 Devoir à faire :</div>
                      <div>{c.devoirs}</div>
                      <div style={{ marginTop:10,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                        {rendu
                          ? <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                              <span style={S.renduTag(rendu.statut)}>
                                {rendu.statut==="rendu"?"✓ Rendu":rendu.statut==="noté"?"📊 Noté":"Rendu"}
                              </span>
                              {rendu.note && <span style={{ fontSize:12,fontWeight:600,color:"#185FA5" }}>Note : {rendu.note}/20</span>}
                              <button style={S.btnSm} onClick={() => { setModal(c); setRenduText(rendu.contenu||""); }}>✏️ Modifier</button>
                            </div>
                          : <span style={{ fontSize:12,color:"#A32D2D",fontWeight:500 }}>⚠ Non rendu</span>
                        }
                        <button style={S.btnP} onClick={() => { setModal(c); setRenduText(rendu?.contenu||""); }}>
                          {rendu ? "✏️ Modifier le devoir" : "📤 Rendre le devoir"}
                        </button>
                      </div>
                      {rendu?.commentaire_prof && (
                        <div style={{ marginTop:8,padding:"8px",background:"#E6F1FB",borderRadius:6,fontSize:12,color:"#185FA5" }}>
                          💬 <strong>Commentaire du prof :</strong> {rendu.commentaire_prof}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
        }
      </div>

      {/* Modal rendre devoir */}
      {modal && (
        <div style={S.modal} onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div style={S.mBox}>
            <h3 style={S.mTitle}>📤 Rendre le devoir</h3>
            <p style={S.mSub}>{modal.matiere} · {new Date(modal.date_cours).toLocaleDateString("fr-FR")}</p>
            <div style={{ background:"#FFF9EC",border:"1px solid #FAC775",borderRadius:8,padding:"10px",fontSize:13,color:"#633806",marginBottom:"1rem" }}>
              <strong>Devoir :</strong> {modal.devoirs}
            </div>
            <textarea
              style={S.ta}
              placeholder="Écrivez votre réponse ici..."
              value={renduText}
              onChange={e => setRenduText(e.target.value)}
            />
            <div style={S.mAct}>
              <button style={S.btnSm} onClick={() => setModal(null)}>Annuler</button>
              <button style={S.btnP} onClick={submitDevoir} disabled={saving}>
                {saving ? "Envoi..." : "📤 Soumettre"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
