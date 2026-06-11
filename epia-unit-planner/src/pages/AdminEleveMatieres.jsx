import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TRONC = ["Théorie de la Connaissance (TdC)","Mémoire (Extended Essay)","CAS"];

export default function AdminEleveMatieres() {
  const [eleves,       setEleves]       = useState([]);
  const [annees,       setAnnees]       = useState([]);
  const [ecoleMatieres,setEcoleMatieres]= useState([]); // from ecole_matieres
  const [selEleve,     setSelEleve]     = useState(null);
  const [selAnnee,     setSelAnnee]     = useState("");
  const [assignments,  setAssignments]  = useState({}); // { "G1-matiere": "NS"|"NM"|null }
  const [tronc,        setTronc]        = useState({});
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [banner,       setBanner]       = useState(null);
  const [search,       setSearch]       = useState("");
  const navigate = useNavigate();

  useEffect(() => { loadInit(); }, []);

  async function loadInit() {
    setLoading(true);
    const [{ data: e }, { data: a }] = await Promise.all([
      supabaseAdmin.from("eleves").select("*").eq("actif", true).order("nom"),
      supabaseAdmin.from("annees_scolaires").select("*").order("annee", { ascending: false }),
    ]);
    setEleves(e || []);
    setAnnees(a || []);
    const active = (a||[]).find(x => x.active);
    const ann = active?.annee || a?.[0]?.annee || "2024-2025";
    setSelAnnee(ann);
    setLoading(false);
  }

  async function loadEcoleMatieres(annee, anneePd) {
    const { data } = await supabaseAdmin.from("ecole_matieres")
      .select("*").eq("annee_scolaire", annee).eq("annee_pd", anneePd).eq("actif", true).order("groupe_num");
    setEcoleMatieres(data || []);
  }

  async function loadAssignments(eleveId, annee) {
    const { data } = await supabaseAdmin.from("eleve_matieres")
      .select("*").eq("eleve_id", eleveId).eq("annee_scolaire", annee);
    const a = {}, t = {};
    TRONC.forEach(m => { t[m] = false; });
    (data||[]).forEach(row => {
      if (TRONC.includes(row.matiere)) {
        t[row.matiere] = true;
      } else {
        const key = `${row.groupe_num || 0}-${row.matiere}`;
        a[key] = row.niveau;
      }
    });
    setAssignments(a);
    setTronc(t);
  }

  async function selectEleve(eleve) {
    setSelEleve(eleve);
    setAssignments({});
    setTronc(Object.fromEntries(TRONC.map(t => [t, false])));
    await Promise.all([
      loadEcoleMatieres(selAnnee, eleve.annee_pd),
      loadAssignments(eleve.id, selAnnee),
    ]);
  }

  function toggleMatiere(groupeNum, matiere, niveau) {
    const key = `${groupeNum}-${matiere}`;
    setAssignments(prev => {
      const current = prev[key];
      if (current === niveau) return { ...prev, [key]: null }; // deselect
      return { ...prev, [key]: niveau };
    });
  }

  async function save() {
    if (!selEleve) return;

    // Validate: exactly 6 matières (1 per groupe, each with NS or NM)
    const groupes = [...new Set(ecoleMatieres.map(m => m.groupe_num))];
    const assigned = ecoleMatieres.filter(m => assignments[`${m.groupe_num}-${m.matiere}`] === m.niveau);

    // Check 1 per groupe
    const parGroupe = {};
    assigned.forEach(m => {
      if (!parGroupe[m.groupe_num]) parGroupe[m.groupe_num] = [];
      parGroupe[m.groupe_num].push(m);
    });

    const nbGroupes = Object.keys(parGroupe).length;
    if (nbGroupes < groupes.length) {
      showBanner(`Assignez une matière pour chaque groupe (${nbGroupes}/${groupes.length} groupes remplis).`, "error");
      return;
    }

    // Check NS/NM balance: 3 NS + 3 NM
    const nivList = assigned.map(m => m.niveau);
    const nbNS = nivList.filter(n => n === "NS").length;
    const nbNM = nivList.filter(n => n === "NM").length;
    if (nbNS !== 3 || nbNM !== 3) {
      showBanner(`Il faut exactement 3 NS et 3 NM (actuellement ${nbNS} NS, ${nbNM} NM).`, "error");
      return;
    }

    setSaving(true);
    await supabaseAdmin.from("eleve_matieres").delete().eq("eleve_id", selEleve.id).eq("annee_scolaire", selAnnee);

    const rows = [];
    assigned.forEach(m => {
      rows.push({ eleve_id:selEleve.id, matiere:m.matiere, groupe_matiere:m.groupe_label, groupe_num:m.groupe_num, niveau:m.niveau, annee_scolaire:selAnnee });
    });
    TRONC.forEach(t => {
      if (tronc[t]) rows.push({ eleve_id:selEleve.id, matiere:t, groupe_matiere:"Tronc commun", niveau:null, annee_scolaire:selAnnee });
    });

    if (rows.length > 0) await supabaseAdmin.from("eleve_matieres").insert(rows);
    setSaving(false);
    showBanner(`✓ Matières de ${selEleve.prenom} ${selEleve.nom} enregistrées.`, "success");
  }

  function showBanner(msg, type) { setBanner({msg,type}); setTimeout(()=>setBanner(null),5000); }

  const filteredEleves = eleves.filter(e => `${e.nom} ${e.prenom}`.toLowerCase().includes(search.toLowerCase()));
  const groupes = [...new Set(ecoleMatieres.map(m => m.groupe_num))].sort();
  const assigned = ecoleMatieres.filter(m => assignments[`${m.groupe_num}-${m.matiere}`] === m.niveau);
  const nbNS = assigned.filter(m => m.niveau === "NS").length;
  const nbNM = assigned.filter(m => m.niveau === "NM").length;
  const parGroupe = {};
  assigned.forEach(m => { if (!parGroupe[m.groupe_num]) parGroupe[m.groupe_num] = []; parGroupe[m.groupe_num].push(m); });

  const S = {
    page:    { minHeight:"100vh", background:"#f5f7fa", fontFamily:"sans-serif" },
    nav:     { background:"#1B3A6B", padding:"0 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 },
    navL:    { display:"flex", alignItems:"center", gap:12 },
    navLogo: { width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700 },
    navT:    { color:"#fff", fontWeight:600, fontSize:15 },
    navS:    { color:"rgba(255,255,255,0.6)", fontSize:12 },
    navBtn:  { padding:"6px 14px",background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",borderRadius:7,fontSize:13,cursor:"pointer" },
    wrap:    { padding:"1.5rem", maxWidth:1100, margin:"0 auto" },
    banner:  (t) => ({ padding:"10px 14px",borderRadius:8,fontSize:13,marginBottom:"1rem",background:t==="success"?"#EAF3DE":"#FCEBEB",color:t==="success"?"#27500A":"#A32D2D",border:`1px solid ${t==="success"?"#C0DD97":"#F7C1C1"}` }),
    eCard:   (sel) => ({ background:sel?"#E6F1FB":"#fff", border:`1px solid ${sel?"#B5D4F4":"#eee"}`, borderRadius:10, padding:"10px 12px", marginBottom:6, cursor:"pointer" }),
    eName:   { fontSize:13, fontWeight:500, margin:0, color:"#111" },
    eSub:    { fontSize:11, color:"#888", margin:"2px 0 0" },
    grpCard: { background:"#fff", border:"1px solid #eee", borderRadius:10, padding:"1rem", marginBottom:8 },
    grpT:    { fontSize:13, fontWeight:600, color:"#1B3A6B", margin:"0 0 8px", display:"flex", alignItems:"center", gap:6 },
    grpNum:  { background:"#1B3A6B", color:"#fff", borderRadius:5, padding:"1px 8px", fontSize:11 },
    matRow:  { display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:"1px solid #f9f9f9" },
    matName: { flex:1, fontSize:13, color:"#333" },
    nivBtn:  (on, niv) => ({
      padding:"3px 10px", borderRadius:5, fontSize:11, fontWeight:500, cursor:"pointer",
      border:`1px solid ${on?(niv==="NS"?"#FAC775":"#B5D4F4"):"#eee"}`,
      background:on?(niv==="NS"?"#FFF9EC":"#E6F1FB"):"transparent",
      color:on?(niv==="NS"?"#8B6914":"#185FA5"):"#bbb",
    }),
    badge:   (ok) => ({ fontSize:11, padding:"3px 8px", borderRadius:20, fontWeight:500, background:ok?"#EAF3DE":"#f5f5f5", color:ok?"#27500A":"#aaa" }),
    btnP:    { padding:"8px 16px", background:"#1B3A6B", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" },
    inp:     { width:"100%", padding:"8px 10px", border:"1px solid #ddd", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box" },
    sel:     { padding:"8px 10px", border:"1px solid #ddd", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box" },
    tcRow:   { display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:"1px solid #f5f5f5" },
  };

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh" }}>Chargement...</div>;

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={S.navL}>
          <div style={S.navLogo}>E</div>
          <div><div style={S.navT}>EPIA — Admin</div><div style={S.navS}>Matières des élèves</div></div>
        </div>
        <button style={S.navBtn} onClick={() => navigate("/admin")}>← Admin</button>
      </nav>

      <div style={S.wrap}>
        {banner && <div style={S.banner(banner.type)}>{banner.msg}</div>}

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:8 }}>
          <h1 style={{ fontSize:20, fontWeight:600, margin:0, color:"#111" }}>📚 Matières des élèves</h1>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:13, color:"#555" }}>Année :</span>
            <select style={S.sel} value={selAnnee} onChange={e => { setSelAnnee(e.target.value); if(selEleve) { loadEcoleMatieres(e.target.value, selEleve.annee_pd); loadAssignments(selEleve.id, e.target.value); } }}>
              {annees.map(a => <option key={a.id} value={a.annee}>{a.annee}{a.active?" ★":""}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", gap:16 }}>

          {/* Liste élèves */}
          <div>
            <input style={{ ...S.inp, marginBottom:8 }} placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
            {/* D1 group */}
            <div style={{ fontSize:11, fontWeight:600, color:"#1B3A6B", padding:"4px 8px", background:"#E6F1FB", borderRadius:6, marginBottom:4 }}>
              D1 — {filteredEleves.filter(e => e.annee_pd==="D1").length} élève(s)
            </div>
            {filteredEleves.filter(e => e.annee_pd==="D1").map(e => (
              <div key={e.id} style={S.eCard(selEleve?.id===e.id)} onClick={() => selectEleve(e)}>
                <p style={S.eName}>{e.prenom} {e.nom}</p>
                <p style={S.eSub}>{e.annee_scolaire}</p>
              </div>
            ))}
            <div style={{ fontSize:11, fontWeight:600, color:"#27500A", padding:"4px 8px", background:"#EAF3DE", borderRadius:6, margin:"8px 0 4px" }}>
              D2 — {filteredEleves.filter(e => e.annee_pd==="D2").length} élève(s)
            </div>
            {filteredEleves.filter(e => e.annee_pd==="D2").map(e => (
              <div key={e.id} style={S.eCard(selEleve?.id===e.id)} onClick={() => selectEleve(e)}>
                <p style={S.eName}>{e.prenom} {e.nom}</p>
                <p style={S.eSub}>{e.annee_scolaire}</p>
              </div>
            ))}
          </div>

          {/* Assignation */}
          <div>
            {!selEleve
              ? <div style={{ background:"#fff", border:"1px solid #eee", borderRadius:12, padding:"3rem", textAlign:"center", color:"#aaa" }}>
                  <p style={{ fontSize:32, margin:"0 0 8px" }}>👈</p>
                  <p style={{ fontSize:14 }}>Sélectionnez un élève.</p>
                  {ecoleMatieres.length === 0 && selEleve === null && (
                    <p style={{ fontSize:12, color:"#FAC775", marginTop:8 }}>
                      ⚠️ Configurez d'abord les <button style={{ background:"none", border:"none", color:"#185FA5", cursor:"pointer", fontSize:12, textDecoration:"underline" }} onClick={() => navigate("/admin/matieres-ecole")}>matières offertes par l'école</button>.
                    </p>
                  )}
                </div>
              : <>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem", flexWrap:"wrap", gap:8 }}>
                    <div>
                      <h2 style={{ fontSize:17, fontWeight:600, margin:0, color:"#111" }}>{selEleve.prenom} {selEleve.nom}</h2>
                      <p style={{ fontSize:13, color:"#888", margin:"2px 0 0" }}>{selEleve.annee_pd} · {selAnnee}</p>
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                      <span style={S.badge(Object.keys(parGroupe).length === groupes.length)}>{Object.keys(parGroupe).length}/{groupes.length} groupes</span>
                      <span style={S.badge(nbNS===3)}>NS: {nbNS}/3</span>
                      <span style={S.badge(nbNM===3)}>NM: {nbNM}/3</span>
                      <button style={S.btnP} onClick={save} disabled={saving}>{saving?"Enregistrement...":"💾 Enregistrer"}</button>
                    </div>
                  </div>

                  {ecoleMatieres.length === 0
                    ? <div style={{ background:"#FFF9EC", border:"1px solid #FAC775", borderRadius:10, padding:"14px 16px", fontSize:13, color:"#633806" }}>
                        ⚠️ Aucune matière configurée pour {selEleve.annee_pd} — {selAnnee}. 
                        <button style={{ marginLeft:8, background:"none", border:"none", color:"#185FA5", cursor:"pointer", fontSize:13, textDecoration:"underline" }} onClick={() => navigate("/admin/matieres-ecole")}>
                          Configurer les matières →
                        </button>
                      </div>
                    : groupes.map(gNum => {
                        const grpMatieres = ecoleMatieres.filter(m => m.groupe_num === gNum);
                        const grpLabel = grpMatieres[0]?.groupe_label || `Groupe ${gNum}`;
                        const grpAssigned = parGroupe[gNum] || [];
                        return (
                          <div key={gNum} style={{ ...S.grpCard, borderColor: grpAssigned.length > 0 ? "#B5D4F4":"#eee" }}>
                            <p style={S.grpT}>
                              <span style={S.grpNum}>Groupe {gNum}</span>
                              {grpLabel.split("—")[1]?.trim()}
                              {grpAssigned.length > 0 && <span style={{ fontSize:11, color:"#185FA5", fontWeight:400 }}>· {grpAssigned.length} sélectionnée(s)</span>}
                            </p>
                            {grpMatieres.map(m => {
                              const key = `${m.groupe_num}-${m.matiere}`;
                              const isOn = assignments[key] === m.niveau;
                              return (
                                <div key={`${m.matiere}-${m.niveau}`} style={S.matRow}>
                                  <span style={S.matName}>{m.matiere}</span>
                                  <button style={S.nivBtn(isOn, m.niveau)} onClick={() => toggleMatiere(m.groupe_num, m.matiere, m.niveau)}>
                                    {isOn ? "✓ " : ""}{m.niveau}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })
                  }

                  {/* Tronc commun */}
                  <div style={S.grpCard}>
                    <p style={S.grpT}>🎓 Tronc commun</p>
                    {TRONC.map(t => (
                      <div key={t} style={S.tcRow}>
                        <input type="checkbox" id={t} checked={tronc[t]||false} onChange={e => setTronc(prev=>({...prev,[t]:e.target.checked}))} style={{ width:"auto", cursor:"pointer" }} />
                        <label htmlFor={t} style={{ fontSize:13, color:"#333", cursor:"pointer" }}>{t}</label>
                      </div>
                    ))}
                  </div>
                </>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
