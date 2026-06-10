import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const ACTIVITES = ["Tennis","Arts Martiaux","Équitation","Piscine","Dépassement de soi","Séjour linguistique","Voyage découvert"];
const TRONC_MATIERES = ["Théorie de la Connaissance (TdC)","Mémoire (Extended Essay)","CAS"];
const NIVEAUX_AE = ["A","B","C","D","E"];

export default function BulletinEdit() {
  const { eleveId } = useParams();
  const [params]    = useSearchParams();
  const annee       = params.get("annee") || "2024-2025";
  const sem         = params.get("sem") || "S1";
  const navigate    = useNavigate();

  const [eleve,    setEleve]    = useState(null);
  const [troncData,setTroncData]= useState({});
  const [saving,   setSaving]   = useState(false);
  const [banner,   setBanner]   = useState(null);
  const [loading,  setLoading]  = useState(true);

  // Formulaire bulletin
  const [fPoints,   setFPoints]   = useState(0);
  const [fProfil,   setFProfil]   = useState("");
  const [fAppréc,   setFAppréc]   = useState("");
  const [fProfPrin, setFProfPrin] = useState("");
  const [fCoord,    setFCoord]    = useState("");
  const [fDate,     setFDate]     = useState("");
  const [fParents,  setFParents]  = useState(false);
  const [fActivites,setFActivites]= useState({});

  // Infos élève
  const [eNaissance, setENaissance] = useState("");
  const [eLieu,      setELieu]      = useState("");
  const [eParent,    setEParent]    = useState("");
  const [eTelParent, setETelParent] = useState("");
  const [eEmailP,    setEEmailP]    = useState("");
  const [eRespo,     setERespo]     = useState("");
  const [eTelRespo,  setETelRespo]  = useState("");
  const [eConduite,  setEConduite]  = useState("Bonne");
  const [eRetards,   setERetards]   = useState(0);

  // Tronc commun
  const [tNiveauAE, setTNiveauAE]   = useState({});
  const [tComment,  setTComment]    = useState({});

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: el } = await supabaseAdmin.from("eleves").select("*").eq("id", eleveId).single();
    setEleve(el);
    if (el) {
      setENaissance(el.date_naissance || "");
      setELieu(el.lieu_naissance || "");
      setEParent(el.nom_parent || "");
      setETelParent(el.tel_parent || "");
      setEEmailP(el.email_parent || "");
      setERespo(el.responsable || "");
      setETelRespo(el.tel_responsable || "");
      setEConduite(el.conduite || "Bonne");
      setERetards(el.nb_retards || 0);
    }

    const { data: bul } = await supabaseAdmin.from("bulletins").select("*").eq("eleve_id", eleveId).eq("annee_scolaire", annee).eq("semestre", sem).single();
    if (bul) {
      setFPoints(bul.points_bonus || 0);
      setFProfil(bul.profil_apprenant || "");
      setFAppréc(bul.appreciation_generale || "");
      setFProfPrin(bul.professeur_principal || "");
      setFCoord(bul.coordinatrice || "");
      setFDate(bul.date_bulletin || "");
      setFParents(bul.parents_presents || false);
      setFActivites(bul.activites || {});
    }

    // Tronc commun
    const { data: tronc } = await supabaseAdmin.from("eleve_matieres").select("*").eq("eleve_id", eleveId).eq("annee_scolaire", annee).in("matiere", TRONC_MATIERES);
    const nv = {}, cm = {};
    (tronc||[]).forEach(t => { nv[t.matiere] = t.niveau_ae || ""; cm[t.matiere] = t.commentaire || ""; });
    setTNiveauAE(nv);
    setTComment(cm);
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    try {
      // Sauvegarder infos élève
      await supabaseAdmin.from("eleves").update({
        date_naissance: eNaissance || null,
        lieu_naissance: eLieu,
        nom_parent: eParent,
        tel_parent: eTelParent,
        email_parent: eEmailP,
        responsable: eRespo,
        tel_responsable: eTelRespo,
        conduite: eConduite,
        nb_retards: eRetards,
      }).eq("id", eleveId);

      // Sauvegarder bulletin
      const payload = {
        eleve_id: eleveId,
        annee_scolaire: annee,
        semestre: sem,
        points_bonus: fPoints,
        profil_apprenant: fProfil,
        appreciation_generale: fAppréc,
        professeur_principal: fProfPrin,
        coordinatrice: fCoord,
        date_bulletin: fDate || null,
        parents_presents: fParents,
        activites: fActivites,
        updated_at: new Date().toISOString(),
      };
      await supabaseAdmin.from("bulletins").upsert(payload, { onConflict: "eleve_id,annee_scolaire,semestre" });

      // Sauvegarder tronc commun
      for (const mat of TRONC_MATIERES) {
        const existing = await supabaseAdmin.from("eleve_matieres").select("id").eq("eleve_id", eleveId).eq("annee_scolaire", annee).eq("matiere", mat).single();
        if (existing.data) {
          await supabaseAdmin.from("eleve_matieres").update({ niveau_ae: tNiveauAE[mat]||null, commentaire: tComment[mat]||"" }).eq("id", existing.data.id);
        } else {
          await supabaseAdmin.from("eleve_matieres").insert({ eleve_id: eleveId, annee_scolaire: annee, matiere: mat, groupe_matiere: "Tronc commun", niveau_ae: tNiveauAE[mat]||null, commentaire: tComment[mat]||"" });
        }
      }

      showBanner("✓ Bulletin enregistré.", "success");
    } catch(e) { showBanner("Erreur : " + e.message, "error"); }
    setSaving(false);
  }

  function showBanner(msg, type) { setBanner({msg,type}); setTimeout(()=>setBanner(null),4000); }
  function toggleAct(a) { setFActivites(prev => ({ ...prev, [a]: !prev[a] })); }

  const S = {
    page:   { minHeight:"100vh", background:"#f5f7fa", fontFamily:"sans-serif" },
    nav:    { background:"#1B3A6B", padding:"0 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 },
    navL:   { display:"flex", alignItems:"center", gap:12 },
    navLogo:{ width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700 },
    navT:   { color:"#fff", fontWeight:600, fontSize:15 },
    navS:   { color:"rgba(255,255,255,0.6)", fontSize:12 },
    navBtn: { padding:"6px 14px",background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",borderRadius:7,fontSize:13,cursor:"pointer" },
    wrap:   { padding:"1.5rem", maxWidth:900, margin:"0 auto" },
    banner: (t) => ({ padding:"10px 14px",borderRadius:8,fontSize:13,marginBottom:"1rem",background:t==="success"?"#EAF3DE":"#FCEBEB",color:t==="success"?"#27500A":"#A32D2D",border:`1px solid ${t==="success"?"#C0DD97":"#F7C1C1"}` }),
    card:   { background:"#fff", border:"1px solid #eee", borderRadius:12, padding:"1.5rem", marginBottom:16 },
    cardT:  { fontSize:15, fontWeight:600, color:"#111", margin:"0 0 1rem", paddingBottom:8, borderBottom:"1px solid #eee" },
    grid2:  { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
    grid3:  { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 },
    field:  { marginBottom:"1rem" },
    lbl:    { display:"block", fontSize:13, color:"#555", marginBottom:4, fontWeight:500 },
    inp:    { width:"100%", padding:"8px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box" },
    sel:    { width:"100%", padding:"8px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box" },
    ta:     { width:"100%", padding:"8px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box", resize:"vertical", minHeight:80 },
    btnP:   { padding:"10px 24px", background:"#1B3A6B", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" },
    actGrid:{ display:"flex", gap:10, flexWrap:"wrap" },
    actBtn: (on) => ({ padding:"6px 14px", border:`1px solid ${on?"#1B3A6B":"#ddd"}`, borderRadius:8, background:on?"#E6F1FB":"transparent", color:on?"#1B3A6B":"#555", cursor:"pointer", fontSize:13, fontWeight:on?500:400 }),
    troncCard:{ border:"1px solid #eee", borderRadius:8, padding:"1rem", marginBottom:10 },
  };

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh" }}>Chargement...</div>;

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={S.navL}>
          <div style={S.navLogo}>E</div>
          <div><div style={S.navT}>EPIA — Bulletin</div><div style={S.navS}>{eleve?.prenom} {eleve?.nom} · {annee} · {sem}</div></div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button style={S.navBtn} onClick={() => navigate(`/admin/bulletin/${eleveId}`)}>👁️ Voir bulletin</button>
          <button style={S.navBtn} onClick={() => navigate("/admin")}>← Admin</button>
        </div>
      </nav>

      <div style={S.wrap}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
          <h1 style={{ fontSize:20,fontWeight:600,margin:0,color:"#111" }}>✏️ Modifier le bulletin — {eleve?.prenom} {eleve?.nom}</h1>
          <button style={S.btnP} onClick={save} disabled={saving}>{saving?"Enregistrement...":"💾 Enregistrer tout"}</button>
        </div>

        {banner && <div style={S.banner(banner.type)}>{banner.msg}</div>}

        {/* Infos élève */}
        <div style={S.card}>
          <p style={S.cardT}>👤 Informations de l'élève</p>
          <div style={S.grid3}>
            <div style={S.field}><label style={S.lbl}>Date de naissance</label><input style={S.inp} type="date" value={eNaissance} onChange={e=>setENaissance(e.target.value)} /></div>
            <div style={S.field}><label style={S.lbl}>Lieu de naissance</label><input style={S.inp} placeholder="Lomé" value={eLieu} onChange={e=>setELieu(e.target.value)} /></div>
            <div style={S.field}><label style={S.lbl}>Conduite</label>
              <select style={S.sel} value={eConduite} onChange={e=>setEConduite(e.target.value)}>
                <option>Très bonne</option><option>Bonne</option><option>Passable</option><option>Mauvaise</option>
              </select>
            </div>
            <div style={S.field}><label style={S.lbl}>Nom parent/tuteur</label><input style={S.inp} placeholder="AGBEKO Foli" value={eParent} onChange={e=>setEParent(e.target.value)} /></div>
            <div style={S.field}><label style={S.lbl}>Tél parent</label><input style={S.inp} placeholder="90028868" value={eTelParent} onChange={e=>setETelParent(e.target.value)} /></div>
            <div style={S.field}><label style={S.lbl}>Email parent</label><input style={S.inp} type="email" placeholder="parent@email.com" value={eEmailP} onChange={e=>setEEmailP(e.target.value)} /></div>
            <div style={S.field}><label style={S.lbl}>Responsable scolaire</label><input style={S.inp} placeholder="GNANSA Tchaa Julien" value={eRespo} onChange={e=>setERespo(e.target.value)} /></div>
            <div style={S.field}><label style={S.lbl}>Tél responsable</label><input style={S.inp} placeholder="90 19 98 62" value={eTelRespo} onChange={e=>setETelRespo(e.target.value)} /></div>
            <div style={S.field}><label style={S.lbl}>Nombre de retards</label><input style={S.inp} type="number" min={0} value={eRetards} onChange={e=>setERetards(Number(e.target.value))} /></div>
          </div>
        </div>

        {/* Activités */}
        <div style={S.card}>
          <p style={S.cardT}>🎯 Vie extrascolaire</p>
          <div style={S.actGrid}>
            {ACTIVITES.map(a => (
              <button key={a} style={S.actBtn(!!fActivites[a])} onClick={() => toggleAct(a)}>{fActivites[a]?"✓ ":""}{a}</button>
            ))}
          </div>
          <div style={{ marginTop:12, display:"flex", alignItems:"center", gap:8 }}>
            <input type="checkbox" id="parents" checked={fParents} onChange={e=>setFParents(e.target.checked)} style={{ width:"auto" }} />
            <label htmlFor="parents" style={{ fontSize:13, cursor:"pointer" }}>Les parents ont participé aux entretiens avec les professeurs</label>
          </div>
        </div>

        {/* Tronc commun */}
        <div style={S.card}>
          <p style={S.cardT}>🎓 Tronc commun — Niveaux et commentaires</p>
          {TRONC_MATIERES.map(t => (
            <div key={t} style={S.troncCard}>
              <p style={{ fontWeight:600, fontSize:13, margin:"0 0 10px", color:"#1B3A6B" }}>{t}</p>
              <div style={S.grid2}>
                <div style={S.field}>
                  <label style={S.lbl}>Niveau (A-E)</label>
                  <select style={S.sel} value={tNiveauAE[t]||""} onChange={e=>setTNiveauAE(prev=>({...prev,[t]:e.target.value}))}>
                    <option value="">-- Choisir --</option>
                    {NIVEAUX_AE.map(n=><option key={n} value={n}>{n}</option>)}
                    <option value="SATISFAISANT">SATISFAISANT</option>
                    <option value="EN COURS">EN COURS</option>
                  </select>
                </div>
                <div style={{ fontSize:12, color:"#888", padding:"8px 0" }}>
                  A = Excellent · B = Très bien · C = Bien · D = Satisfaisant · E = En cours
                </div>
              </div>
              <div style={S.field}>
                <label style={S.lbl}>Commentaire de l'enseignant</label>
                <textarea style={S.ta} rows={4} value={tComment[t]||""} onChange={e=>setTComment(prev=>({...prev,[t]:e.target.value}))} placeholder={`Commentaire pour ${t}...`} />
              </div>
            </div>
          ))}
          <div style={S.field}>
            <label style={S.lbl}>Points bonus (/3)</label>
            <input style={{ ...S.inp, width:100 }} type="number" min={0} max={3} value={fPoints} onChange={e=>setFPoints(Number(e.target.value))} />
          </div>
        </div>

        {/* Profil et appréciation */}
        <div style={S.card}>
          <p style={S.cardT}>📝 Profil et appréciations</p>
          <div style={S.field}>
            <label style={S.lbl}>Profil de l'apprenant</label>
            <textarea style={S.ta} rows={4} value={fProfil} onChange={e=>setFProfil(e.target.value)} placeholder="Description du profil de l'apprenant IB..." />
          </div>
          <div style={S.field}>
            <label style={S.lbl}>Appréciation générale du conseil de classe</label>
            <textarea style={S.ta} rows={4} value={fAppréc} onChange={e=>setFAppréc(e.target.value)} placeholder="Appréciation générale..." />
          </div>
        </div>

        {/* Signatures */}
        <div style={S.card}>
          <p style={S.cardT}>✍️ Signatures et validation</p>
          <div style={S.grid3}>
            <div style={S.field}><label style={S.lbl}>Professeur principal</label><input style={S.inp} placeholder="TCHAMDJA Lélénda" value={fProfPrin} onChange={e=>setFProfPrin(e.target.value)} /></div>
            <div style={S.field}><label style={S.lbl}>Coordinatrice PD</label><input style={S.inp} placeholder="Mme KECHIE Afi Mawuko" value={fCoord} onChange={e=>setFCoord(e.target.value)} /></div>
            <div style={S.field}><label style={S.lbl}>Date du bulletin</label><input style={S.inp} type="date" value={fDate} onChange={e=>setFDate(e.target.value)} /></div>
          </div>
        </div>

        <div style={{ textAlign:"right", marginBottom:"2rem" }}>
          <button style={S.btnP} onClick={save} disabled={saving}>{saving?"Enregistrement...":"💾 Enregistrer tout"}</button>
        </div>
      </div>
    </div>
  );
}
