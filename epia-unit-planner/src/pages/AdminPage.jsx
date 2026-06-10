import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789@#!";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function Avatar({ nom, prenom, color }) {
  const bg = color || "#E6F1FB";
  const fg = color ? "#fff" : "#185FA5";
  return (
    <div style={{ width:38,height:38,borderRadius:"50%",background:bg,color:fg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,flexShrink:0 }}>
      {(prenom||"?")[0].toUpperCase()}{(nom||"?")[0].toUpperCase()}
    </div>
  );
}

function AnneeBadge({ annee }) {
  const map = {
    D2:      { bg:"#EAF3DE", color:"#27500A", label:"D2 · 2025–2026" },
    diplome: { bg:"#EEEDFE", color:"#3C3489", label:"Diplômé" },
  };
  const cfg = map[annee] || { bg:"#E6F1FB", color:"#0C447C", label:"D1 · 2024–2025" };
  return <span style={{ fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:500,whiteSpace:"nowrap",background:cfg.bg,color:cfg.color }}>{cfg.label}</span>;
}

export default function AdminPage() {
  const navigate = useNavigate();

  const [tab,     setTab]     = useState("eleves");
  const [eleves,  setEleves]  = useState([]);
  const [profs,   setProfs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner,  setBanner]  = useState(null);
  const [saving,  setSaving]  = useState(false);

  const [searchE, setSearchE] = useState("");
  const [filterA, setFilterA] = useState("");
  const [searchP, setSearchP] = useState("");

  const [modalAddEleve, setModalAddEleve] = useState(false);
  const [modalAddProf,  setModalAddProf]  = useState(false);
  const [modalAnnee,    setModalAnnee]    = useState(null);
  const [modalPromo,    setModalPromo]    = useState(false);
  const [modalMdp,      setModalMdp]      = useState(null);
  const [modalDel,      setModalDel]      = useState(null);

  const [fNom,    setFNom]    = useState("");
  const [fPrenom, setFPrenom] = useState("");
  const [fEmail,  setFEmail]  = useState("");
  const [fAnnee,  setFAnnee]  = useState("D1");
  const [fSco,    setFSco]    = useState("2024-2025");
  const [fPw,     setFPw]     = useState("");
  const [fAutoPw, setFAutoPw] = useState(true);

  const [pNom,    setPNom]    = useState("");
  const [pPrenom, setPPrenom] = useState("");
  const [pEmail,  setPEmail]  = useState("");
  const [pPw,     setPPw]     = useState("");
  const [pAutoPw, setPAutoPw] = useState(true);

  const [editAnnee, setEditAnnee] = useState("D1");
  const [editSco,   setEditSco]   = useState("2024-2025");

  const [newPw,  setNewPw]  = useState("");
  const [autoGen,setAutoGen]= useState(false);
  const [genPw,  setGenPw]  = useState("");
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState(false);

  const [anneesSco, setAnneesSco] = useState([]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: e }, { data: p }, { data: a }] = await Promise.all([
      supabaseAdmin.from("eleves").select("*").order("nom"),
      supabaseAdmin.from("profs").select("*").order("nom"),
      supabaseAdmin.from("annees_scolaires").select("*").order("annee", { ascending: false }),
    ]);
    setEleves(e || []);
    setProfs(p || []);
    setAnneesSco(a || []);
    setLoading(false);
  }

  function showBanner(msg, type) { setBanner({ msg, type }); setTimeout(() => setBanner(null), 5000); }

  async function addEleve() {
    if (!fNom || !fPrenom || !fEmail) { showBanner("Remplissez nom, prénom et email.", "error"); return; }
    const pw = fAutoPw ? generatePassword() : fPw;
    if (!pw || pw.length < 8) { showBanner("Mot de passe minimum 8 caractères.", "error"); return; }
    setSaving(true);
    try {
      const { data: auth, error: e1 } = await supabaseAdmin.auth.admin.createUser({ email:fEmail, password:pw, email_confirm:true });
      if (e1) throw e1;
      const { data: el, error: e2 } = await supabaseAdmin.from("eleves").insert({ nom:fNom, prenom:fPrenom, email:fEmail, annee_pd:fAnnee, annee_scolaire:fSco, auth_id:auth.user.id, actif:true }).select().single();
      if (e2) throw e2;
      setEleves(prev => [...prev, el].sort((a,b) => a.nom.localeCompare(b.nom)));
      setModalAddEleve(false);
      resetEleveForm();
      showBanner(`✓ ${fPrenom} ${fNom} ajouté(e). Mot de passe : ${pw}`, "success");
    } catch(err) { showBanner("Erreur : " + err.message, "error"); }
    setSaving(false);
  }

  async function addProf() {
    if (!pNom || !pPrenom || !pEmail) { showBanner("Remplissez nom, prénom et email.", "error"); return; }
    const pw = pAutoPw ? generatePassword() : pPw;
    if (!pw || pw.length < 8) { showBanner("Mot de passe minimum 8 caractères.", "error"); return; }
    setSaving(true);
    try {
      const { data: auth, error: e1 } = await supabaseAdmin.auth.admin.createUser({ email:pEmail, password:pw, email_confirm:true });
      if (e1) throw e1;
      const { data: pr, error: e2 } = await supabaseAdmin.from("profs").insert({ nom:pNom, prenom:pPrenom, email:pEmail, auth_id:auth.user.id, actif:true }).select().single();
      if (e2) throw e2;
      setProfs(prev => [...prev, pr].sort((a,b) => a.nom.localeCompare(b.nom)));
      setModalAddProf(false);
      resetProfForm();
      showBanner(`✓ ${pPrenom} ${pNom} ajouté(e). Mot de passe : ${pw}`, "success");
    } catch(err) { showBanner("Erreur : " + err.message, "error"); }
    setSaving(false);
  }

  async function saveAnnee() {
    const { error } = await supabaseAdmin.from("eleves").update({ annee_pd:editAnnee, annee_scolaire:editSco }).eq("id", modalAnnee.id);
    if (error) { showBanner("Erreur : " + error.message, "error"); return; }
    setEleves(prev => prev.map(u => u.id===modalAnnee.id ? { ...u, annee_pd:editAnnee, annee_scolaire:editSco } : u));
    setModalAnnee(null);
    showBanner("✓ Année mise à jour.", "success");
  }

  async function promouvoirPromo() {
    const { error } = await supabaseAdmin.from("eleves").update({ annee_pd:"D2", annee_scolaire:"2025-2026" }).eq("annee_pd","D1");
    if (error) { showBanner("Erreur : " + error.message, "error"); return; }
    setEleves(prev => prev.map(u => u.annee_pd==="D1" ? { ...u, annee_pd:"D2", annee_scolaire:"2025-2026" } : u));
    setModalPromo(false);
    showBanner("✓ Tous les D1 promus en D2.", "success");
  }

  async function saveMdp() {
    const pw = autoGen ? genPw : newPw;
    if (!pw || pw.length < 8) { showBanner("Minimum 8 caractères.", "error"); return; }
    if (!modalMdp.auth_id) { showBanner("Pas de compte Auth.", "error"); return; }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(modalMdp.auth_id, { password: pw });
    if (error) { showBanner("Erreur : " + error.message, "error"); return; }
    setModalMdp(null);
    showBanner("✓ Mot de passe mis à jour.", "success");
  }

  async function deleteUser() {
    const u = modalDel;
    if (u.auth_id) await supabaseAdmin.auth.admin.deleteUser(u.auth_id);
    if (u._type === "eleve") {
      await supabaseAdmin.from("eleves").delete().eq("id", u.id);
      setEleves(prev => prev.filter(e => e.id !== u.id));
    } else {
      await supabaseAdmin.from("profs").delete().eq("id", u.id);
      setProfs(prev => prev.filter(p => p.id !== u.id));
    }
    setModalDel(null);
    showBanner("✓ Utilisateur supprimé.", "success");
  }

  function resetEleveForm() { setFNom(""); setFPrenom(""); setFEmail(""); setFAnnee("D1"); setFSco("2024-2025"); setFPw(""); setFAutoPw(true); }
  function resetProfForm()  { setPNom(""); setPPrenom(""); setPEmail(""); setPPw(""); setPAutoPw(true); }
  function copyPw() { navigator.clipboard.writeText(genPw); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  const filteredE = eleves.filter(u => {
    const q = searchE.toLowerCase();
    const m = `${u.nom} ${u.prenom} ${u.email||""}`.toLowerCase().includes(q);
    return filterA ? m && u.annee_pd===filterA : m;
  });
  const filteredP = profs.filter(u => `${u.nom} ${u.prenom} ${u.email||""}`.toLowerCase().includes(searchP.toLowerCase()));
  const nbD1 = eleves.filter(u => u.annee_pd==="D1").length;

  const S = {
    wrap:   { fontFamily:"sans-serif", padding:"1.5rem", maxWidth:900, margin:"0 auto" },
    topBar: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.5rem", flexWrap:"wrap", gap:12 },
    title:  { fontSize:22, fontWeight:700, margin:0, color:"#111" },
    btnRow: { display:"flex", gap:8, flexWrap:"wrap" },
    btnIB:  { padding:"8px 14px", fontSize:12, border:"1px solid #B5D4F4", borderRadius:8, background:"#E6F1FB", color:"#185FA5", cursor:"pointer", fontWeight:500 },
    tabs:   { display:"flex", gap:8, marginBottom:"1.5rem", flexWrap:"wrap" },
    tab:    (a) => ({ padding:"8px 16px", border:"1px solid", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:a?600:400, background:a?"#1B3A6B":"transparent", color:a?"#fff":"#555", borderColor:a?"#1B3A6B":"#ddd" }),
    banner: (t) => ({ padding:"10px 14px", borderRadius:8, fontSize:13, marginBottom:"1.25rem", background:t==="success"?"#EAF3DE":"#FCEBEB", color:t==="success"?"#27500A":"#A32D2D", border:`1px solid ${t==="success"?"#C0DD97":"#F7C1C1"}` }),
    card:   { background:"#fff", border:"1px solid #eee", borderRadius:12, padding:"1rem 1.25rem", marginBottom:8 },
    row:    { display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" },
    info:   { flex:1, minWidth:0 },
    name:   { fontSize:14, fontWeight:500, margin:0, color:"#111" },
    sub:    { fontSize:12, color:"#888", margin:0 },
    btnSm:  { padding:"5px 10px", fontSize:12, border:"1px solid #ddd", borderRadius:7, background:"transparent", cursor:"pointer", whiteSpace:"nowrap" },
    btnP:   { padding:"8px 16px", fontSize:13, border:"1px solid #1B3A6B", borderRadius:8, background:"#1B3A6B", color:"#fff", cursor:"pointer", fontWeight:500 },
    btnG:   { padding:"8px 16px", fontSize:13, border:"1px solid #C0DD97", borderRadius:8, background:"#EAF3DE", color:"#27500A", cursor:"pointer", fontWeight:500 },
    btnR:   { padding:"5px 10px", fontSize:12, border:"1px solid #F7C1C1", borderRadius:7, background:"#FCEBEB", color:"#A32D2D", cursor:"pointer", whiteSpace:"nowrap" },
    promo:  { background:"#f9f9f9", border:"1px solid #eee", borderRadius:12, padding:"1.25rem", marginBottom:"1.5rem" },
    sRow:   { display:"flex", gap:8, marginBottom:"1rem", flexWrap:"wrap" },
    count:  { fontSize:12, color:"#888", marginBottom:"0.75rem" },
    inp:    { padding:"8px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box", width:"100%" },
    sel:    { padding:"8px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box" },
    modal:  { position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 },
    mBox:   { background:"#fff", borderRadius:14, border:"1px solid #eee", padding:"1.75rem", width:420, maxWidth:"94vw", maxHeight:"90vh", overflowY:"auto" },
    mTitle: { fontSize:17, fontWeight:600, margin:"0 0 1.25rem", color:"#111" },
    field:  { marginBottom:"1rem" },
    lbl:    { display:"block", fontSize:13, color:"#555", marginBottom:4, fontWeight:500 },
    mAct:   { display:"flex", gap:8, justifyContent:"flex-end", marginTop:"1.25rem" },
    grid2:  { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
    pwBox:  { fontFamily:"monospace", fontSize:13, background:"#f9f9f9", padding:"8px 12px", borderRadius:8, border:"1px solid #eee", display:"flex", alignItems:"center", gap:8, marginTop:8 },
  };

  return (
    <div style={S.wrap}>

      {/* ══ BARRE DU HAUT ══ */}
      <div style={S.topBar}>
        <h1 style={S.title}>🛠️ Administration EPIA</h1>
        <div style={S.btnRow}>
          <button style={S.btnIB} onClick={() => navigate("/admin/matieres-ib")}>
            ⚙️ Matières IB
          </button>
          <button style={S.btnIB} onClick={() => navigate("/admin/annees-scolaires")}>
            📅 Années scolaires
          </button>
          <button style={S.btnIB} onClick={() => navigate("/admin/eleve-matieres")}>
            📚 Matières élèves
          </button>
        </div>
      </div>

      {banner && <div style={S.banner(banner.type)}>{banner.msg}</div>}

      {/* ══ ONGLETS ══ */}
      <div style={S.tabs}>
        <button style={S.tab(tab==="eleves")}  onClick={() => setTab("eleves")}>👨‍🎓 Élèves ({eleves.length})</button>
        <button style={S.tab(tab==="profs")}   onClick={() => setTab("profs")}>👩‍🏫 Professeurs ({profs.length})</button>
        <button style={S.tab(tab==="annees")}  onClick={() => setTab("annees")}>📅 Années</button>
      </div>

      {/* ══ ONGLET ÉLÈVES ══ */}
      {tab==="eleves" && (
        <>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem", flexWrap:"wrap", gap:8 }}>
            <span style={{ fontSize:14, color:"#555" }}>{eleves.length} élève(s) enregistré(s)</span>
            <button style={S.btnP} onClick={() => { resetEleveForm(); setModalAddEleve(true); }}>+ Ajouter un élève</button>
          </div>
          <div style={S.sRow}>
            <input style={{ ...S.inp, flex:1, width:"auto" }} placeholder="Rechercher..." value={searchE} onChange={e => setSearchE(e.target.value)} />
            <select style={S.sel} value={filterA} onChange={e => setFilterA(e.target.value)}>
              <option value="">Toutes les années</option>
              <option value="D1">D1</option>
              <option value="D2">D2</option>
              <option value="diplome">Diplômés</option>
            </select>
          </div>
          <p style={S.count}>{loading ? "Chargement..." : `${filteredE.length} élève(s)`}</p>
          {filteredE.map(u => (
            <div key={u.id} style={S.card}>
              <div style={S.row}>
                <Avatar nom={u.nom} prenom={u.prenom} />
                <div style={S.info}>
                  <p style={S.name}>{u.prenom} {u.nom}</p>
                  <p style={S.sub}>{u.email||"—"} · {u.annee_scolaire||"—"}</p>
                </div>
                <AnneeBadge annee={u.annee_pd} />
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  <button style={S.btnSm} onClick={() => { setModalAnnee(u); setEditAnnee(u.annee_pd||"D1"); setEditSco(u.annee_scolaire||"2024-2025"); }}>✏️ Année</button>
                  <button style={S.btnSm} onClick={() => { setModalMdp(u); setNewPw(""); setAutoGen(false); setGenPw(""); setShowPw(false); }}>🔒 Mdp</button>
                  <button style={S.btnR}  onClick={() => setModalDel({ ...u, _type:"eleve" })}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
          {!loading && filteredE.length===0 && <p style={{ color:"#aaa", fontSize:13, textAlign:"center", marginTop:"2rem" }}>Aucun élève. Cliquez "+ Ajouter un élève".</p>}
        </>
      )}

      {/* ══ ONGLET PROFS ══ */}
      {tab==="profs" && (
        <>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem", flexWrap:"wrap", gap:8 }}>
            <span style={{ fontSize:14, color:"#555" }}>{profs.length} professeur(s)</span>
            <button style={S.btnP} onClick={() => { resetProfForm(); setModalAddProf(true); }}>+ Ajouter un prof</button>
          </div>
          <input style={{ ...S.inp, marginBottom:"1rem" }} placeholder="Rechercher..." value={searchP} onChange={e => setSearchP(e.target.value)} />
          <p style={S.count}>{loading ? "Chargement..." : `${filteredP.length} professeur(s)`}</p>
          {filteredP.map(u => (
            <div key={u.id} style={S.card}>
              <div style={S.row}>
                <Avatar nom={u.nom} prenom={u.prenom} color="#3C3489" />
                <div style={S.info}>
                  <p style={S.name}>{u.prenom} {u.nom}</p>
                  <p style={S.sub}>{u.email||"—"}</p>
                </div>
                <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:500, background:"#EEEDFE", color:"#3C3489" }}>Professeur</span>
                <div style={{ display:"flex", gap:6 }}>
                  <button style={S.btnSm} onClick={() => { setModalMdp(u); setNewPw(""); setAutoGen(false); setGenPw(""); setShowPw(false); }}>🔒 Mdp</button>
                  <button style={S.btnR}  onClick={() => setModalDel({ ...u, _type:"prof" })}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
          {!loading && filteredP.length===0 && <p style={{ color:"#aaa", fontSize:13, textAlign:"center", marginTop:"2rem" }}>Aucun professeur.</p>}
        </>
      )}

      {/* ══ ONGLET ANNÉES ══ */}
      {tab==="annees" && (
        <>
          <div style={S.promo}>
            <p style={{ fontWeight:600, margin:"0 0 4px", color:"#111" }}>Promotion collective D1 → D2</p>
            <p style={{ fontSize:13, color:"#666", margin:"0 0 1rem" }}>{nbD1} élève(s) en D1 passeront en D2 (2025–2026).</p>
            <button style={S.btnSm} onClick={() => setModalPromo(true)}>👥 Promouvoir tous les D1 → D2</button>
          </div>
          <div style={S.sRow}>
            <input style={{ ...S.inp, flex:1, width:"auto" }} placeholder="Rechercher..." value={searchE} onChange={e => setSearchE(e.target.value)} />
            <select style={S.sel} value={filterA} onChange={e => setFilterA(e.target.value)}>
              <option value="">Toutes les années</option>
              <option value="D1">D1</option>
              <option value="D2">D2</option>
              <option value="diplome">Diplômés</option>
            </select>
          </div>
          <p style={S.count}>{filteredE.length} élève(s)</p>
          {filteredE.map(u => (
            <div key={u.id} style={S.card}>
              <div style={S.row}>
                <Avatar nom={u.nom} prenom={u.prenom} />
                <div style={S.info}>
                  <p style={S.name}>{u.prenom} {u.nom}</p>
                  <p style={S.sub}>{u.annee_scolaire||"—"}</p>
                </div>
                <AnneeBadge annee={u.annee_pd} />
                <button style={S.btnSm} onClick={() => { setModalAnnee(u); setEditAnnee(u.annee_pd||"D1"); setEditSco(u.annee_scolaire||"2024-2025"); }}>✏️ Modifier</button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ══ MODAL AJOUTER ÉLÈVE ══ */}
      {modalAddEleve && (
        <div style={S.modal} onClick={e => e.target===e.currentTarget && setModalAddEleve(false)}>
          <div style={S.mBox}>
            <h3 style={S.mTitle}>👨‍🎓 Ajouter un élève</h3>
            <div style={S.grid2}>
              <div style={S.field}><label style={S.lbl}>Prénom *</label><input style={S.inp} placeholder="Kofi" value={fPrenom} onChange={e => setFPrenom(e.target.value)} /></div>
              <div style={S.field}><label style={S.lbl}>Nom *</label><input style={S.inp} placeholder="Ayivi" value={fNom} onChange={e => setFNom(e.target.value)} /></div>
            </div>
            <div style={S.field}><label style={S.lbl}>Email *</label><input style={S.inp} type="email" placeholder="kofi.ayivi@epia.tg" value={fEmail} onChange={e => setFEmail(e.target.value)} /></div>
            <div style={S.grid2}>
              <div style={S.field}>
                <label style={S.lbl}>Année PD</label>
                <select style={S.sel} value={fAnnee} onChange={e => setFAnnee(e.target.value)}>
                  <option value="D1">D1</option><option value="D2">D2</option><option value="diplome">Diplômé</option>
                </select>
              </div>
              <div style={S.field}>
                <label style={S.lbl}>Année scolaire</label>
                <select style={S.sel} value={fSco} onChange={e => setFSco(e.target.value)}>
                  {anneesSco.length > 0
                    ? anneesSco.map(a => <option key={a.id} value={a.annee}>{a.annee}{a.active?" ★":""}</option>)
                    : <><option value="2024-2025">2024–2025</option><option value="2025-2026">2025–2026</option></>
                  }
                </select>
              </div>
            </div>
            <div style={S.field}>
              <label style={S.lbl}>Mot de passe</label>
              <label style={{ fontSize:13, color:"#555", display:"flex", alignItems:"center", gap:6, cursor:"pointer", marginBottom:6 }}>
                <input type="checkbox" checked={fAutoPw} onChange={e => { setFAutoPw(e.target.checked); if(e.target.checked) setFPw(generatePassword()); }} style={{ width:"auto" }} />
                Générer automatiquement
              </label>
              {fAutoPw
                ? <div style={S.pwBox}><span style={{ flex:1 }}>{fPw||"—"}</span><button style={{ ...S.btnSm,fontSize:11 }} onClick={() => setFPw(generatePassword())}>🔄</button></div>
                : <input style={S.inp} type="text" placeholder="Min. 8 caractères" value={fPw} onChange={e => setFPw(e.target.value)} />
              }
            </div>
            <div style={S.mAct}>
              <button style={S.btnSm} onClick={() => setModalAddEleve(false)}>Annuler</button>
              <button style={S.btnP} onClick={addEleve} disabled={saving}>{saving?"Création...":"✓ Créer l'élève"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL AJOUTER PROF ══ */}
      {modalAddProf && (
        <div style={S.modal} onClick={e => e.target===e.currentTarget && setModalAddProf(false)}>
          <div style={S.mBox}>
            <h3 style={S.mTitle}>👩‍🏫 Ajouter un professeur</h3>
            <div style={S.grid2}>
              <div style={S.field}><label style={S.lbl}>Prénom *</label><input style={S.inp} placeholder="Marie" value={pPrenom} onChange={e => setPPrenom(e.target.value)} /></div>
              <div style={S.field}><label style={S.lbl}>Nom *</label><input style={S.inp} placeholder="Dupont" value={pNom} onChange={e => setPNom(e.target.value)} /></div>
            </div>
            <div style={S.field}><label style={S.lbl}>Email *</label><input style={S.inp} type="email" placeholder="marie.dupont@epia.tg" value={pEmail} onChange={e => setPEmail(e.target.value)} /></div>
            <div style={S.field}>
              <label style={S.lbl}>Mot de passe</label>
              <label style={{ fontSize:13, color:"#555", display:"flex", alignItems:"center", gap:6, cursor:"pointer", marginBottom:6 }}>
                <input type="checkbox" checked={pAutoPw} onChange={e => { setPAutoPw(e.target.checked); if(e.target.checked) setPPw(generatePassword()); }} style={{ width:"auto" }} />
                Générer automatiquement
              </label>
              {pAutoPw
                ? <div style={S.pwBox}><span style={{ flex:1 }}>{pPw||"—"}</span><button style={{ ...S.btnSm,fontSize:11 }} onClick={() => setPPw(generatePassword())}>🔄</button></div>
                : <input style={S.inp} type="text" placeholder="Min. 8 caractères" value={pPw} onChange={e => setPPw(e.target.value)} />
              }
            </div>
            <div style={S.mAct}>
              <button style={S.btnSm} onClick={() => setModalAddProf(false)}>Annuler</button>
              <button style={S.btnP} onClick={addProf} disabled={saving}>{saving?"Création...":"✓ Créer le prof"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL MODIFIER ANNÉE ══ */}
      {modalAnnee && (
        <div style={S.modal} onClick={e => e.target===e.currentTarget && setModalAnnee(null)}>
          <div style={S.mBox}>
            <h3 style={S.mTitle}>✏️ Modifier l'année</h3>
            <p style={{ fontSize:14, fontWeight:500, margin:"0 0 1rem", color:"#111" }}>{modalAnnee.prenom} {modalAnnee.nom}</p>
            <div style={S.grid2}>
              <div style={S.field}>
                <label style={S.lbl}>Année PD</label>
                <select style={S.sel} value={editAnnee} onChange={e => setEditAnnee(e.target.value)}>
                  <option value="D1">D1</option><option value="D2">D2</option><option value="diplome">Diplômé</option>
                </select>
              </div>
              <div style={S.field}>
                <label style={S.lbl}>Année scolaire</label>
                <select style={S.sel} value={editSco} onChange={e => setEditSco(e.target.value)}>
                  {anneesSco.length > 0
                    ? anneesSco.map(a => <option key={a.id} value={a.annee}>{a.annee}{a.active?" ★":""}</option>)
                    : <><option value="2024-2025">2024–2025</option><option value="2025-2026">2025–2026</option></>
                  }
                </select>
              </div>
            </div>
            <div style={S.mAct}>
              <button style={S.btnSm} onClick={() => setModalAnnee(null)}>Annuler</button>
              <button style={S.btnP} onClick={saveAnnee}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL PROMO ══ */}
      {modalPromo && (
        <div style={S.modal} onClick={e => e.target===e.currentTarget && setModalPromo(false)}>
          <div style={S.mBox}>
            <h3 style={S.mTitle}>👥 Promotion D1 → D2</h3>
            <p style={{ fontSize:13, color:"#666", margin:"0 0 1rem" }}><strong>{nbD1} élève(s) D1</strong> passeront en D2. Irréversible.</p>
            <div style={S.mAct}>
              <button style={S.btnSm} onClick={() => setModalPromo(false)}>Annuler</button>
              <button style={S.btnG} onClick={promouvoirPromo}>✓ Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL MOT DE PASSE ══ */}
      {modalMdp && (
        <div style={S.modal} onClick={e => e.target===e.currentTarget && setModalMdp(null)}>
          <div style={S.mBox}>
            <h3 style={S.mTitle}>🔒 Mot de passe</h3>
            <p style={{ fontSize:14, fontWeight:500, margin:"0 0 4px", color:"#111" }}>{modalMdp.prenom} {modalMdp.nom}</p>
            <p style={{ fontSize:12, color:"#888", margin:"0 0 1rem" }}>{modalMdp.email}</p>
            <div style={S.field}>
              <label style={S.lbl}>Nouveau mot de passe</label>
              <div style={{ position:"relative" }}>
                <input style={{ ...S.inp, paddingRight:38 }} type={showPw?"text":"password"} placeholder="Min. 8 caractères" value={newPw} disabled={autoGen} onChange={e => setNewPw(e.target.value)} />
                <button onClick={() => setShowPw(!showPw)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16 }}>{showPw?"🙈":"👁️"}</button>
              </div>
            </div>
            <div style={S.field}>
              <label style={{ fontSize:13, color:"#555", display:"flex", alignItems:"center", gap:6, cursor:"pointer" }}>
                <input type="checkbox" checked={autoGen} onChange={e => { setAutoGen(e.target.checked); if(e.target.checked) setGenPw(generatePassword()); }} style={{ width:"auto" }} />
                Générer automatiquement
              </label>
              {autoGen && (
                <div style={S.pwBox}>
                  <span style={{ flex:1 }}>{genPw}</span>
                  <button style={{ ...S.btnSm, fontSize:11 }} onClick={copyPw}>{copied?"✓ Copié":"📋 Copier"}</button>
                  <button style={{ ...S.btnSm, fontSize:11 }} onClick={() => setGenPw(generatePassword())}>🔄</button>
                </div>
              )}
            </div>
            <div style={S.mAct}>
              <button style={S.btnSm} onClick={() => setModalMdp(null)}>Annuler</button>
              <button style={S.btnP} onClick={saveMdp}>✓ Appliquer</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL SUPPRIMER ══ */}
      {modalDel && (
        <div style={S.modal} onClick={e => e.target===e.currentTarget && setModalDel(null)}>
          <div style={S.mBox}>
            <h3 style={S.mTitle}>🗑️ Supprimer</h3>
            <p style={{ fontSize:13, color:"#666", margin:"0 0 1rem" }}>
              Voulez-vous supprimer <strong>{modalDel.prenom} {modalDel.nom}</strong> ?<br/>Son compte sera aussi supprimé. Irréversible.
            </p>
            <div style={S.mAct}>
              <button style={S.btnSm} onClick={() => setModalDel(null)}>Annuler</button>
              <button style={{ ...S.btnP, background:"#A32D2D", borderColor:"#A32D2D" }} onClick={deleteUser}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
