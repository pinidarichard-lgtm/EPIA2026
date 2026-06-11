import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default function AdminProfMatieres() {
  const [profs,     setProfs]     = useState([]);
  const [annees,    setAnnees]    = useState([]);
  const [configs,   setConfigs]   = useState([]);
  const [selProf,   setSelProf]   = useState(null);
  const [selAnnee,  setSelAnnee]  = useState("");
  const [selPd,     setSelPd]     = useState("D1");
  const [assigned,  setAssigned]  = useState({}); // { "matiere-niveau-annee_pd": true }
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [banner,    setBanner]    = useState(null);
  const [search,    setSearch]    = useState("");
  const navigate = useNavigate();

  useEffect(() => { loadInit(); }, []);
  useEffect(() => { if (selAnnee) loadConfigs(); }, [selAnnee]);
  useEffect(() => { if (selProf && selAnnee) loadAssigned(); }, [selProf, selAnnee]);

  async function loadInit() {
    setLoading(true);
    const [{ data: p }, { data: a }] = await Promise.all([
      supabaseAdmin.from("profs").select("*").eq("actif", true).order("nom"),
      supabaseAdmin.from("annees_scolaires").select("*").order("annee", { ascending: false }),
    ]);
    setProfs(p || []);
    setAnnees(a || []);
    const active = (a||[]).find(x => x.active);
    const ann = active?.annee || a?.[0]?.annee || "2024-2025";
    setSelAnnee(ann);
    setLoading(false);
  }

  async function loadConfigs() {
    const { data } = await supabaseAdmin.from("ib_matieres_config")
      .select("*").eq("annee_scolaire", selAnnee).eq("actif", true)
      .order("groupe_matiere").order("matiere").order("niveau");
    setConfigs(data || []);
  }

  async function loadAssigned() {
    const { data } = await supabaseAdmin.from("prof_matieres")
      .select("*").eq("prof_id", selProf.id).eq("annee_scolaire", selAnnee);
    const a = {};
    (data||[]).forEach(r => { a[`${r.matiere}-${r.niveau}-${r.annee_pd}`] = true; });
    setAssigned(a);
  }

  function toggle(cfg) {
    const key = `${cfg.matiere}-${cfg.niveau}-${cfg.annee_pd}`;
    setAssigned(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function save() {
    if (!selProf) return;
    setSaving(true);
    await supabaseAdmin.from("prof_matieres").delete()
      .eq("prof_id", selProf.id).eq("annee_scolaire", selAnnee);
    const rows = configs
      .filter(c => assigned[`${c.matiere}-${c.niveau}-${c.annee_pd}`])
      .map(c => ({
        prof_id: selProf.id, matiere: c.matiere, groupe_matiere: c.groupe_matiere,
        niveau: c.niveau, annee_pd: c.annee_pd, annee_scolaire: selAnnee,
      }));
    if (rows.length > 0) await supabaseAdmin.from("prof_matieres").insert(rows);
    setSaving(false);
    showBanner(`✓ ${rows.length} matière(s) assignée(s) à ${selProf.prenom} ${selProf.nom}.`, "success");
  }

  function showBanner(msg, type) { setBanner({msg,type}); setTimeout(()=>setBanner(null),4000); }

  const filteredProfs = profs.filter(p => `${p.nom} ${p.prenom}`.toLowerCase().includes(search.toLowerCase()));
  const configsD1 = configs.filter(c => c.annee_pd === "D1");
  const configsD2 = configs.filter(c => c.annee_pd === "D2");
  const byGroupeD1 = {}, byGroupeD2 = {};
  configsD1.forEach(c => { const k = c.groupe_matiere||"Autre"; if(!byGroupeD1[k]) byGroupeD1[k]=[]; byGroupeD1[k].push(c); });
  configsD2.forEach(c => { const k = c.groupe_matiere||"Autre"; if(!byGroupeD2[k]) byGroupeD2[k]=[]; byGroupeD2[k].push(c); });
  const totalAssigned = Object.values(assigned).filter(Boolean).length;

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
    grid:    { display:"grid", gridTemplateColumns:"260px 1fr", gap:16 },
    pCard:   (sel) => ({ background:sel?"#E6F1FB":"#fff", border:`1px solid ${sel?"#B5D4F4":"#eee"}`, borderRadius:10, padding:"10px 12px", marginBottom:6, cursor:"pointer" }),
    pName:   { fontSize:13, fontWeight:500, margin:0, color:"#111" },
    pSub:    { fontSize:11, color:"#888", margin:"2px 0 0" },
    card:    { background:"#fff", border:"1px solid #eee", borderRadius:12, padding:"1.25rem", marginBottom:10 },
    grpT:    { fontSize:12, fontWeight:700, color:"#1B3A6B", padding:"4px 8px", background:"#E6F1FB", borderRadius:6, marginBottom:6, display:"block" },
    matRow:  { display:"flex", alignItems:"center", gap:10, padding:"6px 0", borderBottom:"1px solid #f9f9f9" },
    matName: { flex:1, fontSize:13, color:"#333" },
    nivTag:  (n) => ({ fontSize:10,padding:"2px 6px",borderRadius:4,fontWeight:600,background:n==="NS"?"#FFF9EC":"#E6F1FB",color:n==="NS"?"#8B6914":"#185FA5" }),
    chkBtn:  (on) => ({ width:22,height:22,borderRadius:5,border:`2px solid ${on?"#1B3A6B":"#ddd"}`,background:on?"#1B3A6B":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,color:"#fff",fontSize:13 }),
    btnP:    { padding:"8px 16px",background:"#1B3A6B",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer" },
    inp:     { width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box" },
    sel:     { padding:"8px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box",width:"100%" },
    secT:    { fontSize:14,fontWeight:600,color:"#111",margin:"0 0 12px",display:"flex",alignItems:"center",gap:8 },
    pdBadge: (pd) => ({ fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:600,background:pd==="D1"?"#E6F1FB":"#EAF3DE",color:pd==="D1"?"#1B3A6B":"#27500A" }),
  };

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh" }}>Chargement...</div>;

  function renderGroup(byGroupe, pdLabel) {
    return (
      <div style={{ marginBottom:16 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
          <span style={S.pdBadge(pdLabel)}>{pdLabel}</span>
          <span style={{ fontSize:12,color:"#888" }}>{pdLabel==="D1"?"Première année":"Deuxième année"}</span>
        </div>
        {Object.keys(byGroupe).length === 0
          ? <p style={{ fontSize:12,color:"#aaa",padding:"8px" }}>Aucune matière configurée pour {pdLabel}.</p>
          : Object.entries(byGroupe).map(([grp, items]) => (
            <div key={grp} style={{ marginBottom:10 }}>
              <span style={S.grpT}>{grp.split("—")[0]?.trim()}</span>
              {items.map(cfg => {
                const key = `${cfg.matiere}-${cfg.niveau}-${cfg.annee_pd}`;
                const isOn = !!assigned[key];
                return (
                  <div key={cfg.id} style={S.matRow}>
                    <div style={S.chkBtn(isOn)} onClick={() => toggle(cfg)}>
                      {isOn && "✓"}
                    </div>
                    <span style={S.matName}>{cfg.matiere}</span>
                    <span style={S.nivTag(cfg.niveau)}>{cfg.niveau}</span>
                  </div>
                );
              })}
            </div>
          ))
        }
      </div>
    );
  }

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={S.navL}>
          <div style={S.navLogo}>E</div>
          <div><div style={S.navT}>EPIA — Admin</div><div style={S.navS}>Matières des professeurs</div></div>
        </div>
        <button style={S.navBtn} onClick={() => navigate("/admin")}>← Admin</button>
      </nav>

      <div style={S.wrap}>
        {banner && <div style={S.banner(banner.type)}>{banner.msg}</div>}

        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem",flexWrap:"wrap",gap:8 }}>
          <h1 style={{ fontSize:20,fontWeight:600,margin:0,color:"#111" }}>👩‍🏫 Matières des professeurs</h1>
          <select style={{ ...S.sel,width:150 }} value={selAnnee} onChange={e => setSelAnnee(e.target.value)}>
            {annees.map(a => <option key={a.id} value={a.annee}>{a.annee}{a.active?" ★":""}</option>)}
          </select>
        </div>

        <div style={S.grid}>
          {/* Liste profs */}
          <div>
            <input style={{ ...S.inp,marginBottom:8 }} placeholder="Rechercher un prof..." value={search} onChange={e => setSearch(e.target.value)} />
            <p style={{ fontSize:11,color:"#aaa",marginBottom:8 }}>{filteredProfs.length} professeur(s)</p>
            {filteredProfs.map(p => (
              <div key={p.id} style={S.pCard(selProf?.id===p.id)} onClick={() => setSelProf(p)}>
                <p style={S.pName}>{p.prenom} {p.nom}</p>
                <p style={S.pSub}>{p.email}</p>
              </div>
            ))}
          </div>

          {/* Assignation matières */}
          <div>
            {!selProf
              ? <div style={{ ...S.card,textAlign:"center",padding:"3rem",color:"#aaa" }}>
                  <p style={{ fontSize:32,margin:"0 0 8px" }}>👈</p>
                  <p style={{ fontSize:14 }}>Sélectionnez un professeur.</p>
                </div>
              : <div style={S.card}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem",flexWrap:"wrap",gap:8 }}>
                    <div>
                      <h2 style={{ fontSize:17,fontWeight:600,margin:0,color:"#111" }}>{selProf.prenom} {selProf.nom}</h2>
                      <p style={{ fontSize:12,color:"#888",margin:"2px 0 0" }}>{totalAssigned} matière(s) assignée(s) · {selAnnee}</p>
                    </div>
                    <button style={S.btnP} onClick={save} disabled={saving}>{saving?"Enregistrement...":"💾 Enregistrer"}</button>
                  </div>

                  {configs.length === 0
                    ? <div style={{ background:"#FFF9EC",border:"1px solid #FAC775",borderRadius:8,padding:"12px",fontSize:13,color:"#633806" }}>
                        ⚠️ Aucune matière IB configurée pour {selAnnee}.
                      </div>
                    : <>
                        {renderGroup(byGroupeD1, "D1")}
                        <hr style={{ border:"none",borderTop:"1px solid #eee",margin:"12px 0" }} />
                        {renderGroup(byGroupeD2, "D2")}
                      </>
                  }
                </div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
