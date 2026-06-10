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

// Convertit un % pondéré en note sur 7 selon les frontières
function calcNote7(pctFinal, frontieres) {
  if (!frontieres || isNaN(pctFinal)) return null;
  for (const n of [7,6,5,4,3,2,1]) {
    if (pctFinal >= Number(frontieres[n])) return n;
  }
  return 1;
}

// Calcule le % final pondéré à partir des notes saisies et de la config épreuves
function calcPctFinal(notesEpreuves, epreuves) {
  let total = 0, pctUsed = 0;
  for (const ep of epreuves) {
    const val = notesEpreuves[ep.nom];
    if (val === undefined || val === "" || isNaN(parseFloat(val))) continue;
    const pct = (parseFloat(val) / ep.bareme) * ep.pourcentage;
    total += pct;
    pctUsed += ep.pourcentage;
  }
  if (pctUsed === 0) return null;
  // Ramener sur 100% des épreuves saisies
  return (total / pctUsed) * 100;
}

export default function ProfNotes() {
  const [prof, setProf]         = useState(null);
  const [eleves, setEleves]     = useState([]);
  const [configs, setConfigs]   = useState([]);
  const [selConfig, setSelConfig] = useState(null);
  const [selAnnee,  setSelAnnee]  = useState("D1");
  const [selSco,    setSelSco]    = useState("2024-2025");
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [banner,    setBanner]    = useState(null);

  // saisie[eleveId][nomEpreuve] = valeur
  const [saisie, setSaisie]   = useState({});
  const [commentaires, setComm] = useState({});
  const [existingNotes, setExisting] = useState([]);

  const navigate = useNavigate();

  useEffect(() => { loadInit(); }, []);

  async function loadInit() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profData }  = await supabaseAdmin.from("profs").select("*").eq("auth_id", user.id).single();
    const { data: elevesData } = await supabaseAdmin.from("eleves").select("*").eq("actif", true).order("nom");
    const { data: cfgData }    = await supabaseAdmin.from("ib_matieres_config").select("*").eq("actif", true).order("matiere");
    setProf(profData);
    setEleves(elevesData || []);
    setConfigs(cfgData || []);
    setLoading(false);
  }

  async function loadExistingNotes(cfg, annee, sco) {
    if (!cfg) return;
    const ids = (eleves.filter(e => e.annee_pd === annee)).map(e => e.id);
    if (ids.length === 0) return;
    const { data } = await supabaseAdmin.from("notes")
      .select("*")
      .in("eleve_id", ids)
      .eq("matiere", cfg.matiere)
      .eq("annee_pd", annee)
      .eq("annee_scolaire", sco);
    setExisting(data || []);

    // Pré-remplir saisie depuis notes existantes
    const s = {}, c = {};
    (data || []).forEach(n => {
      if (n.epreuves_detail) s[n.eleve_id] = n.epreuves_detail;
      c[n.eleve_id] = n.commentaire || "";
    });
    setSaisie(s);
    setComm(c);
  }

  useEffect(() => {
    if (selConfig && eleves.length > 0) loadExistingNotes(selConfig, selAnnee, selSco);
  }, [selConfig, selAnnee, selSco]);

  async function saveNotes() {
    if (!selConfig) { showBanner("Sélectionnez une matière.", "error"); return; }
    setSaving(true);
    const nomProf = prof ? `${prof.prenom} ${prof.nom}` : "";
    const elevesF = eleves.filter(e => e.annee_pd === selAnnee);

    for (const eleve of elevesF) {
      const notesEp = saisie[eleve.id] || {};
      const hasAny  = Object.values(notesEp).some(v => v !== "" && v !== undefined);
      if (!hasAny) continue;

      const pctFinal  = calcPctFinal(notesEp, selConfig.epreuves);
      const note7     = calcNote7(pctFinal, selConfig.frontieres);
      const existing  = existingNotes.find(n => n.eleve_id === eleve.id);

      const payload = {
        eleve_id: eleve.id,
        matiere: selConfig.matiere,
        groupe_matiere: selConfig.groupe_matiere,
        annee_pd: selAnnee,
        annee_scolaire: selSco,
        periode: "Évaluation IB",
        note: note7 || 0,
        commentaire: commentaires[eleve.id] || "",
        enseignant: nomProf,
        epreuves_detail: notesEp,
      };

      if (existing) {
        await supabaseAdmin.from("notes").update(payload).eq("id", existing.id);
      } else {
        await supabaseAdmin.from("notes").insert(payload);
      }
    }

    await loadExistingNotes(selConfig, selAnnee, selSco);
    setSaving(false);
    showBanner("✓ Notes enregistrées avec succès !", "success");
  }

  function showBanner(msg, type) { setBanner({ msg, type }); setTimeout(() => setBanner(null), 4000); }

  const elevesF = eleves.filter(e => e.annee_pd === selAnnee);

  // Stats de classe
  const notes7 = elevesF.map(e => {
    const pct = calcPctFinal(saisie[e.id] || {}, selConfig?.epreuves || []);
    return calcNote7(pct, selConfig?.frontieres);
  }).filter(n => n !== null);
  const moy7 = notes7.length > 0 ? (notes7.reduce((a,b) => a+b,0)/notes7.length).toFixed(2) : "—";

  const s = {
    page:   { minHeight:"100vh", background:"#f5f7fa", fontFamily:"sans-serif" },
    nav:    { background:"#1B3A6B", padding:"0 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 },
    navL:   { display:"flex", alignItems:"center", gap:12 },
    navLogo:{ width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700 },
    navT:   { color:"#fff", fontWeight:600, fontSize:15 },
    navS:   { color:"rgba(255,255,255,0.6)", fontSize:12 },
    navBtn: { padding:"6px 14px",background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",borderRadius:7,fontSize:13,cursor:"pointer" },
    wrap:   { padding:"1.5rem", maxWidth:1100, margin:"0 auto" },
    title:  { fontSize:20, fontWeight:600, color:"#111", margin:"0 0 1.5rem" },
    banner: (t) => ({ padding:"10px 14px",borderRadius:8,fontSize:13,marginBottom:"1rem",background:t==="success"?"#EAF3DE":"#FCEBEB",color:t==="success"?"#27500A":"#A32D2D",border:`1px solid ${t==="success"?"#C0DD97":"#F7C1C1"}` }),
    filtre: { background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1.25rem",marginBottom:"1.25rem" },
    filtreT:{ fontSize:14,fontWeight:600,color:"#111",margin:"0 0 1rem" },
    grid3:  { display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10 },
    lbl:    { display:"block",fontSize:12,color:"#666",marginBottom:4,fontWeight:500 },
    sel:    { width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box" },
    btnP:   { padding:"9px 20px",background:"#1B3A6B",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer" },
    btnSm:  { padding:"6px 12px",background:"transparent",color:"#555",border:"1px solid #ddd",borderRadius:7,fontSize:12,cursor:"pointer" },
    table:  { width:"100%",borderCollapse:"collapse" },
    th:     { padding:"10px 10px",textAlign:"center",fontSize:11,fontWeight:600,color:"#888",borderBottom:"2px solid #eee",background:"#fafafa",whiteSpace:"nowrap" },
    thL:    { padding:"10px 12px",textAlign:"left",fontSize:11,fontWeight:600,color:"#888",borderBottom:"2px solid #eee",background:"#fafafa" },
    td:     { padding:"8px 10px",fontSize:13,borderBottom:"1px solid #f5f5f5",textAlign:"center",color:"#111" },
    tdL:    { padding:"8px 12px",fontSize:13,borderBottom:"1px solid #f5f5f5",textAlign:"left",color:"#111" },
    noteInp:{ width:64,padding:"5px 6px",border:"1px solid #ddd",borderRadius:7,fontSize:13,textAlign:"center",outline:"none" },
    commInp:{ width:"100%",padding:"5px 8px",border:"1px solid #ddd",borderRadius:7,fontSize:11,outline:"none",boxSizing:"border-box" },
    note7:  (n) => ({ fontSize:18,fontWeight:700,color:!n?"#ccc":n>=6?"#27500A":n>=4?"#185FA5":n>=3?"#8B6914":"#A32D2D" }),
    pct:    { fontSize:11,color:"#aaa" },
    avg:    { background:"#E6F1FB",border:"1px solid #B5D4F4",borderRadius:8,padding:"8px 14px",fontSize:13,color:"#185FA5",fontWeight:500,display:"inline-block",marginBottom:"1rem" },
  };

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh" }}>Chargement...</div>;

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navL}>
          <div style={s.navLogo}>E</div>
          <div><div style={s.navT}>EPIA Lomé</div><div style={s.navS}>Saisie des notes IB</div></div>
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <button style={s.navBtn} onClick={() => navigate("/prof/dashboard")}>← Dashboard</button>
          <button style={s.navBtn} onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}>Déconnexion</button>
        </div>
      </nav>

      <div style={s.wrap}>
        <h1 style={s.title}>📝 Saisie des notes IB</h1>
        {banner && <div style={s.banner(banner.type)}>{banner.msg}</div>}

        {configs.length === 0 && (
          <div style={{ background:"#FFF9EC",border:"1px solid #FAC775",borderRadius:10,padding:"12px 16px",fontSize:13,color:"#633806",marginBottom:"1.25rem" }}>
            ⚠️ Aucune matière configurée. Demandez à l'administrateur de configurer les matières IB d'abord.
          </div>
        )}

        {/* Filtres */}
        <div style={s.filtre}>
          <p style={s.filtreT}>Sélection</p>
          <div style={s.grid3}>
            <div>
              <label style={s.lbl}>Matière IB configurée</label>
              <select style={s.sel} value={selConfig?.id||""} onChange={e => setSelConfig(configs.find(c => c.id===e.target.value)||null)}>
                <option value="">-- Choisir une matière --</option>
                {configs.map(c => <option key={c.id} value={c.id}>{c.matiere} ({c.niveau}) — {c.annee_scolaire}</option>)}
              </select>
            </div>
            <div>
              <label style={s.lbl}>Année PD</label>
              <select style={s.sel} value={selAnnee} onChange={e => setSelAnnee(e.target.value)}>
                <option value="D1">D1 — 1ère année</option>
                <option value="D2">D2 — 2ème année</option>
              </select>
            </div>
            <div>
              <label style={s.lbl}>Année scolaire</label>
              <select style={s.sel} value={selSco} onChange={e => setSelSco(e.target.value)}>
                <option value="2024-2025">2024–2025</option>
                <option value="2025-2026">2025–2026</option>
              </select>
            </div>
          </div>
        </div>

        {selConfig && (
          <>
            {/* Info config */}
            <div style={{ background:"#f0f4ff",border:"1px solid #c7d5f5",borderRadius:10,padding:"10px 14px",marginBottom:"1rem",fontSize:12,color:"#2d3a8c" }}>
              <strong>{selConfig.matiere}</strong> · {selConfig.niveau} · Épreuves : {selConfig.epreuves.map(e => `${e.nom} (${e.bareme}pts, ${e.pourcentage}%)`).join(" | ")}
            </div>

            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem",flexWrap:"wrap",gap:8 }}>
              <div style={s.avg}>
                Moyenne de classe : <strong>{moy7}/7</strong> · {notes7.length}/{elevesF.length} notes calculées
              </div>
              <button style={s.btnP} onClick={saveNotes} disabled={saving}>
                {saving ? "Enregistrement..." : "💾 Enregistrer toutes les notes"}
              </button>
            </div>

            <div style={{ background:"#fff",border:"1px solid #eee",borderRadius:12,overflow:"auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.thL}>Élève</th>
                    {selConfig.epreuves.map((ep,i) => (
                      <th key={i} style={s.th}>
                        {ep.nom}<br/>
                        <span style={{ fontSize:10,color:"#aaa",fontWeight:400 }}>/{ep.bareme}pts · {ep.pourcentage}%</span>
                      </th>
                    ))}
                    <th style={s.th}>% final</th>
                    <th style={s.th}>Note /7</th>
                    <th style={{ ...s.th,textAlign:"left",minWidth:140 }}>Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  {elevesF.length === 0
                    ? <tr><td colSpan={selConfig.epreuves.length+4} style={{ ...s.td,color:"#aaa",padding:"2rem" }}>Aucun élève en {selAnnee}.</td></tr>
                    : elevesF.map((e,i) => {
                        const notesEp  = saisie[e.id] || {};
                        const pctFinal = calcPctFinal(notesEp, selConfig.epreuves);
                        const note7    = calcNote7(pctFinal, selConfig.frontieres);
                        return (
                          <tr key={e.id} style={{ background:i%2===0?"#fff":"#fafafa" }}>
                            <td style={s.tdL}><span style={{ fontWeight:500 }}>{e.prenom} {e.nom}</span></td>
                            {selConfig.epreuves.map((ep,j) => (
                              <td key={j} style={s.td}>
                                <input
                                  style={s.noteInp}
                                  type="number" min={0} max={ep.bareme} step={0.5}
                                  placeholder="—"
                                  value={notesEp[ep.nom] ?? ""}
                                  onChange={ev => setSaisie(prev => ({
                                    ...prev,
                                    [e.id]: { ...(prev[e.id]||{}), [ep.nom]: ev.target.value }
                                  }))}
                                />
                              </td>
                            ))}
                            <td style={s.td}>
                              <span style={s.pct}>{pctFinal !== null ? pctFinal.toFixed(1)+"%" : "—"}</span>
                            </td>
                            <td style={s.td}>
                              <span style={s.note7(note7)}>{note7 || "—"}</span>
                            </td>
                            <td style={{ ...s.td,textAlign:"left" }}>
                              <input
                                style={s.commInp}
                                type="text" placeholder="Commentaire..."
                                value={commentaires[e.id]||""}
                                onChange={ev => setComm(prev => ({ ...prev, [e.id]: ev.target.value }))}
                              />
                            </td>
                          </tr>
                        );
                      })
                  }
                </tbody>
              </table>
            </div>

            {/* Légende frontières */}
            <div style={{ marginTop:"1rem",display:"flex",gap:6,flexWrap:"wrap" }}>
              {[7,6,5,4,3,2,1].map(n => (
                <span key={n} style={{ fontSize:11,padding:"3px 10px",borderRadius:20,background:n>=5?"#EAF3DE":n>=3?"#FFF9EC":"#FCEBEB",color:n>=5?"#27500A":n>=3?"#8B6914":"#A32D2D",fontWeight:500 }}>
                  {n} ≥ {selConfig.frontieres?.[n]}%
                </span>
              ))}
            </div>
          </>
        )}

        {!selConfig && configs.length > 0 && (
          <div style={{ textAlign:"center",padding:"3rem",color:"#aaa",background:"#fff",borderRadius:12,border:"1px solid #eee" }}>
            <p style={{ fontSize:32,margin:"0 0 8px" }}>📝</p>
            <p style={{ fontSize:14 }}>Sélectionnez une matière configurée pour commencer la saisie.</p>
          </div>
        )}
      </div>
    </div>
  );
}
