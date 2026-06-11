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
const NIVEAUX_AE = ["A","B","C","D","E","SATISFAISANT","EN COURS"];

function getPeriodes(anneePd) {
  if (anneePd === "D1") return [
    { value:"T1", label:"Trimestre 1" },
    { value:"T2", label:"Trimestre 2" },
    { value:"T3", label:"Trimestre 3" },
  ];
  return [
    { value:"S1", label:"Semestre 1" },
    { value:"S2", label:"Semestre 2" },
  ];
}

export default function BulletinEdit() {
  const { eleveId } = useParams();
  const [params]    = useSearchParams();
  const annee       = params.get("annee") || "2024-2025";
  const [periode,   setPeriode] = useState(params.get("periode") || "S1");
  const navigate    = useNavigate();

  const [eleve,    setEleve]    = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [banner,   setBanner]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [annees,   setAnnees]   = useState([]);
  const [selAnnee, setSelAnnee] = useState(annee);

  // Bulletin fields
  const [fPoints,   setFPoints]   = useState(0);
  const [fProfil,   setFProfil]   = useState("");
  const [fApprec,   setFApprec]   = useState("");
  const [fProfPrin, setFProfPrin] = useState("");
  const [fCoord,    setFCoord]    = useState("");
  const [fDate,     setFDate]     = useState("");
  const [fParents,  setFParents]  = useState(false);
  const [fActivites,setFActivites]= useState({});

  // Élève fields
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
  const [tNiveauAE, setTNiveauAE] = useState({});
  const [tComment,  setTComment]  = useState({});
  const [tEnseignant, setTEnseignant] = useState({});

  // Notes profs — commentaires par matière
  const [notesData, setNotesData] = useState([]);
  const [matieres,  setMatieres]  = useState([]);

  useEffect(() => { loadInit(); }, []);
  useEffect(() => { if (eleve) loadBulletin(eleve.id, selAnnee, periode); }, [periode, selAnnee]);

  async function loadInit() {
    setLoading(true);
    const [{ data: el }, { data: a }] = await Promise.all([
      supabaseAdmin.from("eleves").select("*").eq("id", eleveId).single(),
      supabaseAdmin.from("annees_scolaires").select("*").order("annee", { ascending: false }),
    ]);
    setEleve(el);
    setAnnees(a || []);

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

      // Set default periode based on annee_pd
      const defaultPeriode = el.annee_pd === "D1" ? "T1" : "S1";
      setPeriode(params.get("periode") || defaultPeriode);

      await loadBulletin(el.id, selAnnee, params.get("periode") || defaultPeriode);
    }
    setLoading(false);
  }

  async function loadBulletin(eid, ann, per) {
    const [{ data: bul }, { data: mat }, { data: n }] = await Promise.all([
      supabaseAdmin.from("bulletins").select("*").eq("eleve_id", eid).eq("annee_scolaire", ann).eq("periode", per).single(),
      supabaseAdmin.from("eleve_matieres").select("*").eq("eleve_id", eid).eq("annee_scolaire", ann),
      supabaseAdmin.from("notes").select("*").eq("eleve_id", eid).eq("annee_scolaire", ann),
    ]);

    if (bul) {
      setFPoints(bul.points_bonus || 0);
      setFProfil(bul.profil_apprenant || "");
      setFApprec(bul.appreciation_generale || "");
      setFProfPrin(bul.professeur_principal || "");
      setFCoord(bul.coordinatrice || "");
      setFDate(bul.date_bulletin || "");
      setFParents(bul.parents_presents || false);
      setFActivites(bul.activites || {});
    } else {
      setFPoints(0); setFProfil(""); setFApprec(""); setFProfPrin(""); setFCoord(""); setFDate(""); setFParents(false); setFActivites({});
    }

    // Tronc commun
    const tronc = (mat || []).filter(m => m.groupe_matiere === "Tronc commun");
    const nv = {}, cm = {}, en = {};
    tronc.forEach(t => {
      nv[t.matiere] = t.niveau_ae || "";
      cm[t.matiere] = t.commentaire || "";
      en[t.matiere] = t.enseignant || "";
    });
    setTNiveauAE(nv); setTComment(cm); setTEnseignant(en);

    // Matières principales + leurs notes
    const principales = (mat || []).filter(m => m.groupe_matiere !== "Tronc commun");
    setMatieres(principales);
    setNotesData(n || []);
  }

  async function save() {
    setSaving(true);
    try {
      // Infos élève
      await supabaseAdmin.from("eleves").update({
        date_naissance:  eNaissance || null,
        lieu_naissance:  eLieu,
        nom_parent:      eParent,
        tel_parent:      eTelParent,
        email_parent:    eEmailP,
        responsable:     eRespo,
        tel_responsable: eTelRespo,
        conduite:        eConduite,
        nb_retards:      Number(eRetards),
      }).eq("id", eleveId);

      // Bulletin
      await supabaseAdmin.from("bulletins").upsert({
        eleve_id:              eleveId,
        annee_scolaire:        selAnnee,
        periode,
        points_bonus:          Number(fPoints),
        profil_apprenant:      fProfil,
        appreciation_generale: fApprec,
        professeur_principal:  fProfPrin,
        coordinatrice:         fCoord,
        date_bulletin:         fDate || null,
        parents_presents:      fParents,
        activites:             fActivites,
        updated_at:            new Date().toISOString(),
      }, { onConflict: "eleve_id,annee_scolaire,periode" });

      // Tronc commun
      for (const mat of TRONC_MATIERES) {
        const { data: ex } = await supabaseAdmin.from("eleve_matieres").select("id").eq("eleve_id", eleveId).eq("annee_scolaire", selAnnee).eq("matiere", mat).single();
        const payload = { niveau_ae: tNiveauAE[mat]||null, commentaire: tComment[mat]||"", enseignant: tEnseignant[mat]||"" };
        if (ex) {
          await supabaseAdmin.from("eleve_matieres").update(payload).eq("id", ex.id);
        } else {
          await supabaseAdmin.from("eleve_matieres").insert({ eleve_id:eleveId, annee_scolaire:selAnnee, matiere:mat, groupe_matiere:"Tronc commun", ...payload });
        }
      }

      showBanner("✓ Bulletin enregistré avec succès.", "success");
    } catch(e) { showBanner("Erreur : " + e.message, "error"); }
    setSaving(false);
  }

  function showBanner(msg, type) { setBanner({msg,type}); setTimeout(()=>setBanner(null),4000); }
  function toggleAct(a) { setFActivites(prev => ({ ...prev, [a]: !prev[a] })); }

  const periodes = eleve ? getPeriodes(eleve.annee_pd) : [];

  const S = {
    page:    { minHeight:"100vh", background:"#f5f7fa", fontFamily:"sans-serif" },
    nav:     { background:"#1B3A6B", padding:"0 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 },
    navL:    { display:"flex", alignItems:"center", gap:12 },
    navLogo: { width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700 },
    navT:    { color:"#fff", fontWeight:600, fontSize:15 },
    navS:    { color:"rgba(255,255,255,0.6)", fontSize:12 },
    navBtn:  { padding:"6px 14px",background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",borderRadius:7,fontSize:13,cursor:"pointer" },
    wrap:    { padding:"1.5rem", maxWidth:900, margin:"0 auto" },
    banner:  (t) => ({ padding:"10px 14px",borderRadius:8,fontSize:13,marginBottom:"1rem",background:t==="success"?"#EAF3DE":"#FCEBEB",color:t==="success"?"#27500A":"#A32D2D",border:`1px solid ${t==="success"?"#C0DD97":"#F7C1C1"}` }),
    card:    { background:"#fff", border:"1px solid #eee", borderRadius:12, padding:"1.5rem", marginBottom:14 },
    cardT:   { fontSize:15, fontWeight:600, color:"#111", margin:"0 0 1rem", paddingBottom:8, borderBottom:"1px solid #eee" },
    grid2:   { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
    grid3:   { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 },
    field:   { marginBottom:"1rem" },
    lbl:     { display:"block", fontSize:13, color:"#555", marginBottom:4, fontWeight:500 },
    inp:     { width:"100%", padding:"8px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box" },
    sel:     { width:"100%", padding:"8px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box" },
    ta:      { width:"100%", padding:"8px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box", resize:"vertical", minHeight:80, fontFamily:"Arial,sans-serif" },
    btnP:    { padding:"10px 24px", background:"#1B3A6B", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" },
    actBtn:  (on) => ({ padding:"6px 14px", border:`1px solid ${on?"#1B3A6B":"#ddd"}`, borderRadius:8, background:on?"#E6F1FB":"transparent", color:on?"#1B3A6B":"#555", cursor:"pointer", fontSize:13, fontWeight:on?500:400 }),
    troncC:  { border:"1px solid #eee", borderRadius:8, padding:"1rem", marginBottom:10, background:"#fafafa" },
    noteC:   { border:"1px solid #eee", borderRadius:8, padding:"1rem", marginBottom:8 },
    noteT:   { fontSize:13, fontWeight:600, color:"#1B3A6B", margin:"0 0 8px" },
  };

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh" }}>Chargement...</div>;

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={S.navL}>
          <div style={S.navLogo}>E</div>
          <div>
            <div style={S.navT}>EPIA — Modifier Bulletin</div>
            <div style={S.navS}>{eleve?.prenom} {eleve?.nom} · {selAnnee}</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button style={S.navBtn} onClick={() => navigate(`/admin/bulletin/${eleveId}?annee=${selAnnee}&periode=${periode}`)}>👁️ Voir bulletin</button>
          <button style={S.navBtn} onClick={() => navigate("/admin")}>← Admin</button>
        </div>
      </nav>

      <div style={S.wrap}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem", flexWrap:"wrap", gap:10 }}>
          <h1 style={{ fontSize:20, fontWeight:600, margin:0, color:"#111" }}>✏️ {eleve?.prenom} {eleve?.nom}</h1>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <select style={{ ...S.sel, width:140 }} value={selAnnee} onChange={e => setSelAnnee(e.target.value)}>
              {annees.map(a => <option key={a.id} value={a.annee}>{a.annee}</option>)}
            </select>
            <select style={{ ...S.sel, width:140 }} value={periode} onChange={e => setPeriode(e.target.value)}>
              {periodes.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <button style={S.btnP} onClick={save} disabled={saving}>{saving?"Enregistrement...":"💾 Enregistrer"}</button>
          </div>
        </div>

        {banner && <div style={S.banner(banner.type)}>{banner.msg}</div>}

        {/* Infos élève */}
        <div style={S.card}>
          <p style={S.cardT}>👤 Informations personnelles</p>
          <div style={S.grid3}>
            <div style={S.field}><label style={S.lbl}>Date de naissance</label><input style={S.inp} type="date" value={eNaissance} onChange={e=>setENaissance(e.target.value)} /></div>
            <div style={S.field}><label style={S.lbl}>Lieu de naissance</label><input style={S.inp} placeholder="Lomé" value={eLieu} onChange={e=>setELieu(e.target.value)} /></div>
            <div style={S.field}>
              <label style={S.lbl}>Conduite</label>
              <select style={S.sel} value={eConduite} onChange={e=>setEConduite(e.target.value)}>
                <option>Très bonne</option><option>Bonne</option><option>Passable</option><option>Mauvaise</option>
              </select>
            </div>
            <div style={S.field}><label style={S.lbl}>Responsable scolaire</label><input style={S.inp} placeholder="GNANSA Tchaa Julien" value={eRespo} onChange={e=>setERespo(e.target.value)} /></div>
            <div style={S.field}><label style={S.lbl}>Tél responsable</label><input style={S.inp} placeholder="90 19 98 62" value={eTelRespo} onChange={e=>setETelRespo(e.target.value)} /></div>
            <div style={S.field}><label style={S.lbl}>Nombre de retards</label><input style={S.inp} type="number" min={0} value={eRetards} onChange={e=>setERetards(e.target.value)} /></div>
            <div style={S.field}><label style={S.lbl}>Nom parent/tuteur</label><input style={S.inp} placeholder="AGBEKO Foli" value={eParent} onChange={e=>setEParent(e.target.value)} /></div>
            <div style={S.field}><label style={S.lbl}>Tél parent</label><input style={S.inp} placeholder="90028868" value={eTelParent} onChange={e=>setETelParent(e.target.value)} /></div>
            <div style={S.field}><label style={S.lbl}>Email parent</label><input style={S.inp} type="email" value={eEmailP} onChange={e=>setEEmailP(e.target.value)} /></div>
          </div>
        </div>

        {/* Activités */}
        <div style={S.card}>
          <p style={S.cardT}>🎯 Vie extrascolaire</p>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:12 }}>
            {ACTIVITES.map(a => (
              <button key={a} style={S.actBtn(!!fActivites[a])} onClick={() => toggleAct(a)}>
                {fActivites[a] ? "✓ " : ""}{a}
              </button>
            ))}
          </div>
          <label style={{ fontSize:13, color:"#555", display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
            <input type="checkbox" checked={fParents} onChange={e=>setFParents(e.target.checked)} style={{ width:"auto" }} />
            Les parents ont participé aux entretiens avec les professeurs
          </label>
        </div>

        {/* Commentaires notes par matière */}
        <div style={S.card}>
          <p style={S.cardT}>📝 Commentaires des enseignants (par matière)</p>
          <p style={{ fontSize:12, color:"#888", margin:"0 0 1rem" }}>Ces commentaires apparaissent dans le bulletin à côté de chaque matière.</p>
          {matieres.length === 0
            ? <p style={{ fontSize:13, color:"#aaa" }}>Aucune matière assignée pour cette année.</p>
            : matieres.map(m => {
                const note = notesData.find(n => n.matiere === m.matiere);
                return (
                  <div key={m.matiere} style={S.noteC}>
                    <p style={S.noteT}>{m.matiere} <span style={{ fontSize:11, color:"#888", fontWeight:400 }}>— {m.niveau}</span></p>
                    <div style={S.grid2}>
                      <div style={S.field}>
                        <label style={S.lbl}>Enseignant</label>
                        <input style={S.inp} value={note?.enseignant || ""} placeholder="Nom de l'enseignant"
                          onChange={async e => {
                            if (note) await supabaseAdmin.from("notes").update({ enseignant: e.target.value }).eq("id", note.id);
                          }} />
                      </div>
                      <div style={S.field}>
                        <label style={S.lbl}>Note /7</label>
                        <input style={S.inp} type="number" min={1} max={7} value={note?.note || ""} placeholder="—" readOnly style={{ ...S.inp, background:"#f9f9f9", color:"#666" }} />
                      </div>
                    </div>
                    <div style={S.field}>
                      <label style={S.lbl}>Commentaire de l'enseignant</label>
                      <textarea style={S.ta} rows={3}
                        defaultValue={note?.commentaire || ""}
                        placeholder="Commentaire de l'enseignant pour cette matière..."
                        onBlur={async e => {
                          if (note) await supabaseAdmin.from("notes").update({ commentaire: e.target.value }).eq("id", note.id);
                        }}
                      />
                    </div>
                  </div>
                );
              })
          }
        </div>

        {/* Tronc commun */}
        <div style={S.card}>
          <p style={S.cardT}>🎓 Tronc commun</p>
          {TRONC_MATIERES.map(t => (
            <div key={t} style={S.troncC}>
              <p style={{ fontWeight:600, fontSize:13, margin:"0 0 10px", color:"#1B3A6B" }}>
                {t === "Théorie de la Connaissance (TdC)" ? "T.D.C — Théorie de la Connaissance"
                 : t === "Mémoire (Extended Essay)" ? "Mémoire (Extended Essay)"
                 : "C.A.S"}
              </p>
              <div style={S.grid3}>
                <div style={S.field}>
                  <label style={S.lbl}>Niveau (A-E)</label>
                  <select style={S.sel} value={tNiveauAE[t]||""} onChange={e=>setTNiveauAE(prev=>({...prev,[t]:e.target.value}))}>
                    <option value="">-- Choisir --</option>
                    {NIVEAUX_AE.map(n=><option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div style={S.field}>
                  <label style={S.lbl}>Enseignant</label>
                  <input style={S.inp} placeholder="Nom enseignant" value={tEnseignant[t]||""} onChange={e=>setTEnseignant(prev=>({...prev,[t]:e.target.value}))} />
                </div>
                <div style={{ fontSize:11, color:"#888", paddingTop:20 }}>
                  A=Excellent · B=Très bien · C=Bien · D=Satisfaisant · E=En cours
                </div>
              </div>
              <div style={S.field}>
                <label style={S.lbl}>Commentaire</label>
                <textarea style={S.ta} rows={4} value={tComment[t]||""} onChange={e=>setTComment(prev=>({...prev,[t]:e.target.value}))} placeholder={`Commentaire pour ${t}...`} />
              </div>
            </div>
          ))}
          <div style={S.field}>
            <label style={S.lbl}>Points bonus (/3)</label>
            <input style={{ ...S.inp, width:100 }} type="number" min={0} max={3} value={fPoints} onChange={e=>setFPoints(e.target.value)} />
          </div>
        </div>

        {/* Profil et appréciations */}
        <div style={S.card}>
          <p style={S.cardT}>📋 Profil et appréciations</p>
          <div style={S.field}>
            <label style={S.lbl}>Profil de l'apprenant</label>
            <textarea style={S.ta} rows={4} value={fProfil} onChange={e=>setFProfil(e.target.value)} placeholder="Description du profil de l'apprenant IB..." />
          </div>
          <div style={S.field}>
            <label style={S.lbl}>Appréciation générale du conseil de classe</label>
            <textarea style={S.ta} rows={4} value={fApprec} onChange={e=>setFApprec(e.target.value)} placeholder="Appréciation générale..." />
          </div>
        </div>

        {/* Signatures */}
        <div style={S.card}>
          <p style={S.cardT}>✍️ Validation et signatures</p>
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
