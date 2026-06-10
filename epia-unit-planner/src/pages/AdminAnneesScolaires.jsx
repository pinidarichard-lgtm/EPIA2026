import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default function AdminAnneesScolaires() {
  const [annees, setAnnees]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner]   = useState(null);
  const [modal, setModal]     = useState(false);
  const [editId, setEditId]   = useState(null);
  const [saving, setSaving]   = useState(false);
  const [fAnnee, setFAnnee]   = useState("");
  const [fDebut, setFDebut]   = useState("");
  const [fFin,   setFFin]     = useState("");
  const navigate = useNavigate();

  useEffect(() => { loadAnnees(); }, []);

  async function loadAnnees() {
    setLoading(true);
    const { data } = await supabaseAdmin.from("annees_scolaires").select("*").order("annee", { ascending: false });
    setAnnees(data || []);
    setLoading(false);
  }

  function openAdd() {
    setEditId(null); setFAnnee(""); setFDebut(""); setFFin(""); setModal(true);
  }

  function openEdit(a) {
    setEditId(a.id); setFAnnee(a.annee); setFDebut(a.date_debut||""); setFFin(a.date_fin||""); setModal(true);
  }

  async function save() {
    if (!fAnnee) { showBanner("Entrez une année scolaire.", "error"); return; }
    setSaving(true);
    const payload = { annee: fAnnee, date_debut: fDebut||null, date_fin: fFin||null };
    if (editId) {
      await supabaseAdmin.from("annees_scolaires").update(payload).eq("id", editId);
    } else {
      await supabaseAdmin.from("annees_scolaires").insert({ ...payload, active: false });
    }
    await loadAnnees();
    setModal(false);
    setSaving(false);
    showBanner("✓ Année scolaire enregistrée.", "success");
  }

  async function setActive(id) {
    // Désactiver toutes, activer celle-ci
    await supabaseAdmin.from("annees_scolaires").update({ active: false }).neq("id", id);
    await supabaseAdmin.from("annees_scolaires").update({ active: true }).eq("id", id);
    await loadAnnees();
    showBanner("✓ Année active mise à jour.", "success");
  }

  async function deleteAnnee(id) {
    await supabaseAdmin.from("annees_scolaires").delete().eq("id", id);
    setAnnees(prev => prev.filter(a => a.id !== id));
    showBanner("✓ Année supprimée.", "success");
  }

  function showBanner(msg, type) { setBanner({ msg, type }); setTimeout(() => setBanner(null), 4000); }

  const s = {
    page:   { minHeight:"100vh", background:"#f5f7fa", fontFamily:"sans-serif" },
    nav:    { background:"#1B3A6B", padding:"0 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 },
    navL:   { display:"flex", alignItems:"center", gap:12 },
    navLogo:{ width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700 },
    navT:   { color:"#fff", fontWeight:600, fontSize:15 },
    navS:   { color:"rgba(255,255,255,0.6)", fontSize:12 },
    navBtn: { padding:"6px 14px",background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",borderRadius:7,fontSize:13,cursor:"pointer" },
    wrap:   { padding:"1.5rem", maxWidth:700, margin:"0 auto" },
    banner: (t) => ({ padding:"10px 14px",borderRadius:8,fontSize:13,marginBottom:"1rem",background:t==="success"?"#EAF3DE":"#FCEBEB",color:t==="success"?"#27500A":"#A32D2D",border:`1px solid ${t==="success"?"#C0DD97":"#F7C1C1"}` }),
    card:   { background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1.25rem",marginBottom:10 },
    btnP:   { padding:"8px 16px",background:"#1B3A6B",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer" },
    btnSm:  { padding:"5px 10px",background:"transparent",color:"#555",border:"1px solid #ddd",borderRadius:7,fontSize:12,cursor:"pointer" },
    btnG:   { padding:"5px 10px",background:"#EAF3DE",color:"#27500A",border:"1px solid #C0DD97",borderRadius:7,fontSize:12,cursor:"pointer" },
    btnR:   { padding:"5px 10px",background:"#FCEBEB",color:"#A32D2D",border:"1px solid #F7C1C1",borderRadius:7,fontSize:12,cursor:"pointer" },
    modal:  { position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100 },
    mBox:   { background:"#fff",borderRadius:14,padding:"1.75rem",width:400,maxWidth:"94vw" },
    mTitle: { fontSize:17,fontWeight:600,margin:"0 0 1.25rem",color:"#111" },
    field:  { marginBottom:"1rem" },
    lbl:    { display:"block",fontSize:13,color:"#555",marginBottom:4,fontWeight:500 },
    inp:    { width:"100%",padding:"8px 12px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box" },
    mAct:   { display:"flex",gap:8,justifyContent:"flex-end",marginTop:"1.25rem" },
  };

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navL}>
          <div style={s.navLogo}>E</div>
          <div><div style={s.navT}>EPIA — Admin</div><div style={s.navS}>Années scolaires</div></div>
        </div>
        <button style={s.navBtn} onClick={() => navigate("/admin")}>← Admin</button>
      </nav>

      <div style={s.wrap}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem" }}>
          <h1 style={{ fontSize:20,fontWeight:600,margin:0,color:"#111" }}>📅 Années scolaires</h1>
          <button style={s.btnP} onClick={openAdd}>+ Nouvelle année</button>
        </div>

        {banner && <div style={s.banner(banner.type)}>{banner.msg}</div>}

        <div style={{ background:"#FFF9EC",border:"1px solid #FAC775",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#633806",marginBottom:"1.25rem" }}>
          ⚠️ L'année marquée <strong>Active</strong> est utilisée par défaut dans toute l'application.
        </div>

        {loading ? <p style={{ color:"#aaa",fontSize:13 }}>Chargement...</p>
        : annees.map(a => (
          <div key={a.id} style={s.card}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8 }}>
              <div>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
                  <span style={{ fontSize:16,fontWeight:600,color:"#111" }}>{a.annee}</span>
                  {a.active && <span style={{ fontSize:11,padding:"2px 10px",borderRadius:20,background:"#EAF3DE",color:"#27500A",fontWeight:600 }}>● Active</span>}
                </div>
                <span style={{ fontSize:12,color:"#888" }}>
                  {a.date_debut ? `Du ${new Date(a.date_debut).toLocaleDateString("fr-FR")}` : ""}
                  {a.date_fin   ? ` au ${new Date(a.date_fin).toLocaleDateString("fr-FR")}` : ""}
                  {!a.date_debut && !a.date_fin ? "Aucune date définie" : ""}
                </span>
              </div>
              <div style={{ display:"flex",gap:6 }}>
                {!a.active && <button style={s.btnG} onClick={() => setActive(a.id)}>✓ Activer</button>}
                <button style={s.btnSm} onClick={() => openEdit(a)}>✏️</button>
                {!a.active && <button style={s.btnR} onClick={() => deleteAnnee(a.id)}>🗑️</button>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div style={s.modal} onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div style={s.mBox}>
            <h3 style={s.mTitle}>{editId ? "✏️ Modifier" : "➕ Nouvelle"} année scolaire</h3>
            <div style={s.field}>
              <label style={s.lbl}>Année scolaire *</label>
              <input style={s.inp} placeholder="Ex: 2026-2027" value={fAnnee} onChange={e => setFAnnee(e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.lbl}>Date de début</label>
              <input style={s.inp} type="date" value={fDebut} onChange={e => setFDebut(e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.lbl}>Date de fin</label>
              <input style={s.inp} type="date" value={fFin} onChange={e => setFFin(e.target.value)} />
            </div>
            <div style={s.mAct}>
              <button style={s.btnSm} onClick={() => setModal(false)}>Annuler</button>
              <button style={s.btnP} onClick={save} disabled={saving}>{saving?"Enregistrement...":"✓ Enregistrer"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
