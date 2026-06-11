import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const GROUPES = [
  { num:1, label:"Groupe 1 — Langue et littérature",   matieres:["Français A — Langue et littérature","Anglais A — Langue et littérature","Autre langue A"] },
  { num:2, label:"Groupe 2 — Acquisition de langues",  matieres:["Anglais B","Français B","Espagnol B","Autre langue B"] },
  { num:3, label:"Groupe 3 — Individus et sociétés",   matieres:["Histoire","Économie","Géographie","Psychologie","Philosophie","Informatique"] },
  { num:4, label:"Groupe 4 — Sciences",                matieres:["Biologie","Chimie","Physique","Sciences de l'environnement","Informatique"] },
  { num:5, label:"Groupe 5 — Mathématiques",           matieres:["Mathématiques : Analyse et approches","Mathématiques : Applications et interprétation"] },
  { num:6, label:"Groupe 6 — Arts / Option",           matieres:["Arts visuels","Théâtre","Musique","Cinéma","Danse"] },
];

export default function AdminMatieresEcole() {
  const [annees,    setAnnees]    = useState([]);
  const [selAnnee,  setSelAnnee]  = useState("");
  const [selPd,     setSelPd]     = useState("D1");
  const [matieres,  setMatieres]  = useState([]); // DB rows
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [banner,    setBanner]    = useState(null);
  // local state: { "G1-Français A-NS": true, ... }
  const [checks,    setChecks]    = useState({});
  const navigate = useNavigate();

  useEffect(() => { loadInit(); }, []);
  useEffect(() => { if (selAnnee) loadMatieres(); }, [selAnnee, selPd]);

  async function loadInit() {
    const { data: a } = await supabaseAdmin.from("annees_scolaires").select("*").order("annee", { ascending:false });
    setAnnees(a || []);
    const active = (a||[]).find(x => x.active);
    const ann = active?.annee || (a?.[0]?.annee) || "2024-2025";
    setSelAnnee(ann);
    setLoading(false);
  }

  async function loadMatieres() {
    const { data } = await supabaseAdmin.from("ecole_matieres")
      .select("*").eq("annee_pd", selPd).eq("annee_scolaire", selAnnee).eq("actif", true);
    setMatieres(data || []);
    // Build checks
    const c = {};
    (data||[]).forEach(r => { c[`${r.groupe_num}-${r.matiere}-${r.niveau}`] = true; });
    setChecks(c);
  }

  function toggle(groupeNum, matiere, niveau) {
    const key = `${groupeNum}-${matiere}-${niveau}`;
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function save() {
    setSaving(true);
    // Delete all for this annee_pd + annee_scolaire
    await supabaseAdmin.from("ecole_matieres")
      .delete().eq("annee_pd", selPd).eq("annee_scolaire", selAnnee);

    // Insert checked
    const rows = [];
    GROUPES.forEach(g => {
      g.matieres.forEach(m => {
        ["NS","NM"].forEach(niv => {
          const key = `${g.num}-${m}-${niv}`;
          if (checks[key]) {
            rows.push({ annee_pd:selPd, groupe_num:g.num, groupe_label:g.label, matiere:m, niveau:niv, annee_scolaire:selAnnee, actif:true });
          }
        });
      });
    });

    if (rows.length > 0) await supabaseAdmin.from("ecole_matieres").insert(rows);
    await loadMatieres();
    setSaving(false);
    showBanner(`✓ ${rows.length} matière(s) enregistrée(s) pour ${selPd} — ${selAnnee}.`, "success");
  }

  // Copy D1 → D2 or vice versa
  async function copyTo(targetPd) {
    const { data } = await supabaseAdmin.from("ecole_matieres")
      .select("*").eq("annee_pd", selPd).eq("annee_scolaire", selAnnee);
    if (!data || data.length === 0) { showBanner("Aucune matière à copier.", "error"); return; }
    await supabaseAdmin.from("ecole_matieres").delete().eq("annee_pd", targetPd).eq("annee_scolaire", selAnnee);
    const rows = data.map(r => ({ ...r, id: undefined, annee_pd: targetPd }));
    await supabaseAdmin.from("ecole_matieres").insert(rows);
    showBanner(`✓ Matières copiées vers ${targetPd}.`, "success");
  }

  function showBanner(msg, type) { setBanner({msg,type}); setTimeout(()=>setBanner(null),4000); }

  const totalChecked = Object.values(checks).filter(Boolean).length;

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
    topBar:  { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem", flexWrap:"wrap", gap:10 },
    tabs:    { display:"flex", gap:8, marginBottom:"1.5rem" },
    tab:     (a) => ({ padding:"10px 24px", border:"1px solid", borderRadius:8, cursor:"pointer", fontSize:14, fontWeight:a?600:400, background:a?"#1B3A6B":"transparent", color:a?"#fff":"#555", borderColor:a?"#1B3A6B":"#ddd" }),
    card:    { background:"#fff", border:"1px solid #eee", borderRadius:12, padding:"1.25rem", marginBottom:10 },
    grpT:    { fontSize:14, fontWeight:600, color:"#1B3A6B", margin:"0 0 10px", display:"flex", alignItems:"center", gap:8 },
    grpNum:  { background:"#1B3A6B", color:"#fff", borderRadius:6, padding:"2px 10px", fontSize:12 },
    matRow:  { display:"flex", alignItems:"center", gap:12, padding:"6px 0", borderBottom:"1px solid #f5f5f5" },
    matName: { flex:1, fontSize:13, color:"#333" },
    nivBtns: { display:"flex", gap:6 },
    nivBtn:  (on, niv) => ({
      padding:"4px 12px", borderRadius:6, fontSize:12, fontWeight:500, cursor:"pointer",
      border:`1px solid ${on?(niv==="NS"?"#FAC775":"#B5D4F4"):"#ddd"}`,
      background:on?(niv==="NS"?"#FFF9EC":"#E6F1FB"):"transparent",
      color:on?(niv==="NS"?"#8B6914":"#185FA5"):"#aaa",
    }),
    btnP:    { padding:"9px 20px", background:"#1B3A6B", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" },
    btnSm:   { padding:"6px 14px", background:"transparent", color:"#555", border:"1px solid #ddd", borderRadius:7, fontSize:12, cursor:"pointer" },
    sel:     { padding:"8px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box" },
    badge:   { fontSize:12, padding:"4px 12px", borderRadius:20, background:"#E6F1FB", color:"#185FA5", fontWeight:500 },
  };

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh" }}>Chargement...</div>;

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={S.navL}>
          <div style={S.navLogo}>E</div>
          <div><div style={S.navT}>EPIA — Admin</div><div style={S.navS}>Matières offertes par l'école</div></div>
        </div>
        <button style={S.navBtn} onClick={() => navigate("/admin")}>← Admin</button>
      </nav>

      <div style={S.wrap}>
        {banner && <div style={S.banner(banner.type)}>{banner.msg}</div>}

        <div style={S.topBar}>
          <h1 style={{ fontSize:20, fontWeight:600, margin:0, color:"#111" }}>📋 Matières offertes par l'école</h1>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize:13, color:"#555" }}>Année :</span>
            <select style={S.sel} value={selAnnee} onChange={e => setSelAnnee(e.target.value)}>
              {annees.map(a => <option key={a.id} value={a.annee}>{a.annee}{a.active?" ★":""}</option>)}
            </select>
            <button style={S.btnSm} onClick={() => copyTo(selPd === "D1" ? "D2" : "D1")}>
              📋 Copier vers {selPd === "D1" ? "D2" : "D1"}
            </button>
            <button style={S.btnP} onClick={save} disabled={saving}>
              {saving ? "Enregistrement..." : `💾 Enregistrer ${selPd}`}
            </button>
          </div>
        </div>

        <div style={{ background:"#FFF9EC", border:"1px solid #FAC775", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#633806", marginBottom:"1.25rem" }}>
          ℹ️ Cochez les matières que l'école offre cette année. Pour chaque matière, précisez si elle est proposée en <b>NS</b> (Niveau Supérieur) et/ou <b>NM</b> (Niveau Moyen).
        </div>

        {/* Onglets D1 / D2 */}
        <div style={S.tabs}>
          <button style={S.tab(selPd==="D1")} onClick={() => setSelPd("D1")}>👨‍🎓 D1 — Première année</button>
          <button style={S.tab(selPd==="D2")} onClick={() => setSelPd("D2")}>👨‍🎓 D2 — Deuxième année</button>
          <span style={{ ...S.badge, alignSelf:"center" }}>{totalChecked} matière(s) sélectionnée(s)</span>
        </div>

        {GROUPES.map(g => {
          const anyChecked = g.matieres.some(m => checks[`${g.num}-${m}-NS`] || checks[`${g.num}-${m}-NM`]);
          return (
            <div key={g.num} style={{ ...S.card, borderColor: anyChecked ? "#B5D4F4" : "#eee" }}>
              <p style={S.grpT}>
                <span style={S.grpNum}>Groupe {g.num}</span>
                {g.label.split("—")[1]?.trim()}
                {anyChecked && <span style={{ fontSize:11, color:"#185FA5", fontWeight:400 }}>
                  · {g.matieres.filter(m => checks[`${g.num}-${m}-NS`] || checks[`${g.num}-${m}-NM`]).length} matière(s) active(s)
                </span>}
              </p>
              {g.matieres.map(m => (
                <div key={m} style={S.matRow}>
                  <span style={S.matName}>{m}</span>
                  <div style={S.nivBtns}>
                    {["NS","NM"].map(niv => {
                      const on = !!checks[`${g.num}-${m}-${niv}`];
                      return (
                        <button key={niv} style={S.nivBtn(on, niv)} onClick={() => toggle(g.num, m, niv)}>
                          {on ? "✓ " : ""}{niv}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        <div style={{ textAlign:"right", marginTop:"1rem", marginBottom:"2rem" }}>
          <button style={S.btnP} onClick={save} disabled={saving}>
            {saving ? "Enregistrement..." : `💾 Enregistrer les matières ${selPd}`}
          </button>
        </div>
      </div>
    </div>
  );
}
