import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

const ACTIVITES = ["Tennis","Arts Martiaux","Équitation","Piscine","Dépassement de soi","Séjour linguistique","Voyage découvert"];
const TRONC_MATIERES = ["Théorie de la Connaissance (TdC)","Mémoire (Extended Essay)","CAS"];

export default function Bulletin() {
  const { eleveId } = useParams();
  const [eleve,    setEleve]    = useState(null);
  const [matieres, setMatieres] = useState([]);
  const [notes,    setNotes]    = useState([]);
  const [configs,  setConfigs]  = useState([]);
  const [absences, setAbsences] = useState([]);
  const [bulletin, setBulletin] = useState(null);
  const [troncData,setTroncData]= useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selAnnee, setSelAnnee] = useState("");
  const [selSem,   setSelSem]   = useState("S1");
  const [annees,   setAnnees]   = useState([]);
  const [isAdminOrProf, setIsAdminOrProf] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (selAnnee && eleve) reloadAll(eleve.id, selAnnee, selSem); }, [selAnnee, selSem]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: adminD }, { data: profD }] = await Promise.all([
      supabaseAdmin.from("admins").select("id").eq("auth_id", user.id).single(),
      supabaseAdmin.from("profs").select("id").eq("auth_id", user.id).single(),
    ]);
    const isAP = !!(adminD || profD);
    setIsAdminOrProf(isAP);

    let eleveData;
    if (eleveId && isAP) {
      const { data } = await supabaseAdmin.from("eleves").select("*").eq("id", eleveId).single();
      eleveData = data;
    } else {
      const { data } = await supabaseAdmin.from("eleves").select("*").eq("auth_id", user.id).single();
      eleveData = data;
    }
    setEleve(eleveData);
    if (!eleveData) { setLoading(false); return; }

    const annee = eleveData.annee_scolaire || "2024-2025";
    setSelAnnee(annee);

    const [{ data: a }, { data: cfg }] = await Promise.all([
      supabaseAdmin.from("annees_scolaires").select("*").order("annee", { ascending: false }),
      supabaseAdmin.from("ib_matieres_config").select("*").eq("actif", true),
    ]);
    setAnnees(a || []);
    setConfigs(cfg || []);

    await reloadAll(eleveData.id, annee, "S1", cfg || []);
    setLoading(false);
  }

  async function reloadAll(eid, annee, sem, cfgOverride) {
    const cfg = cfgOverride || configs;
    const [{ data: mat }, { data: n }, { data: abs }, { data: bul }] = await Promise.all([
      supabaseAdmin.from("eleve_matieres").select("*").eq("eleve_id", eid).eq("annee_scolaire", annee),
      supabaseAdmin.from("notes").select("*").eq("eleve_id", eid).eq("annee_scolaire", annee),
      supabaseAdmin.from("absences").select("*").eq("eleve_id", eid).eq("annee_scolaire", annee),
      supabaseAdmin.from("bulletins").select("*").eq("eleve_id", eid).eq("annee_scolaire", annee).eq("semestre", sem).single(),
    ]);
    setMatieres(mat || []);
    setNotes(n || []);
    setAbsences(abs || []);
    setBulletin(bul || null);

    const tronc = (mat || []).filter(m => m.groupe_matiere === "Tronc commun");
    setTroncData(tronc);
  }

  // Construire les lignes du tableau
  const matieresPrincipales = matieres.filter(m => m.groupe_matiere !== "Tronc commun");

  const lignes = matieresPrincipales.map(m => {
    const cfg    = configs.find(c => c.matiere === m.matiere && c.niveau === m.niveau);
    const noteM  = notes.find(n => n.matiere === m.matiere);
    const eprDetail = noteM?.epreuves_detail || {};
    const epreuves  = cfg?.epreuves || [];
    return { ...m, cfg, noteM, epreuves, eprDetail };
  });

  const notes7 = lignes.map(l => l.noteM?.note).filter(n => n && n >= 1 && n <= 7);
  const total42 = notes7.reduce((s, n) => s + n, 0);
  const nbAbs   = absences.length;
  const nbRetard = eleve?.nb_retards || 0;
  const activites = bulletin?.activites || {};
  const pointsBonus = bulletin?.points_bonus || 0;
  const totalIB = total42 + pointsBonus;

  function handlePrint() { window.print(); }

  // ── Styles ──
  const css = `
    @media print {
      .no-print { display: none !important; }
      body { margin: 0; background: white; }
      .bulletin-page { page-break-after: always; }
      .bulletin-page:last-child { page-break-after: avoid; }
    }
    .bulletin-wrap { font-family: Arial, sans-serif; font-size: 12px; color: #000; max-width: 210mm; margin: 0 auto; }
    .bul-table { width: 100%; border-collapse: collapse; }
    .bul-table td, .bul-table th { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
    .header-top { display: flex; justify-content: space-between; border: 1px solid #000; margin-bottom: 4px; }
    .school-info { padding: 8px; width: 45%; border-right: 1px solid #000; }
    .eleve-info { padding: 8px; width: 55%; }
    .bulletin-title { text-align: center; font-size: 15px; font-weight: bold; border: 2px solid #000; padding: 6px; margin: 6px 0; background: #fff; }
    .section-title { background: #000; color: #fff; text-align: center; font-weight: bold; font-size: 11px; padding: 3px; }
    .matiere-nom { font-weight: bold; font-size: 11px; }
    .niveau-tag { font-size: 10px; color: #333; }
    .note7-cell { font-size: 18px; font-weight: bold; text-align: center; vertical-align: middle; }
    .ep-label { font-size: 9px; color: #666; }
    .ep-val { font-size: 11px; font-weight: bold; }
    .comment-text { font-size: 11px; line-height: 1.4; }
    .total-row td { font-weight: bold; background: #f0f0f0; }
    .sig-area { border-top: 1px solid #000; margin-top: 4px; padding-top: 4px; font-size: 11px; }
    .profil-text { font-size: 11px; line-height: 1.5; padding: 6px; border: 1px solid #000; margin: 4px 0; }
    .page-num { text-align: right; font-size: 10px; padding: 4px; }
    .checkbox-row { display: flex; gap: 10px; flex-wrap: wrap; font-size: 10px; }
    .cb-item { display: flex; align-items: center; gap: 3px; }
    .cb-box { width: 10px; height: 10px; border: 1px solid #000; display: inline-flex; align-items: center; justify-content: center; font-size: 8px; }
  `;

  if (loading) return <div style={{ padding:"2rem", textAlign:"center" }}>Chargement du bulletin...</div>;
  if (!eleve)  return <div style={{ padding:"2rem", textAlign:"center", color:"#aaa" }}>Élève introuvable.</div>;

  return (
    <div style={{ background:"#f5f5f5", minHeight:"100vh", fontFamily:"sans-serif" }}>
      <style>{css}</style>

      {/* Barre de contrôle */}
      <div className="no-print" style={{ background:"#1B3A6B", padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
        <div style={{ color:"#fff", fontWeight:600 }}>📊 Bulletin — {eleve.prenom} {eleve.nom}</div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <select style={{ padding:"5px 10px", borderRadius:6, border:"none", fontSize:13 }} value={selAnnee} onChange={e => setSelAnnee(e.target.value)}>
            {annees.map(a => <option key={a.id} value={a.annee}>{a.annee}</option>)}
          </select>
          <select style={{ padding:"5px 10px", borderRadius:6, border:"none", fontSize:13 }} value={selSem} onChange={e => setSelSem(e.target.value)}>
            <option value="S1">Semestre 1</option>
            <option value="S2">Semestre 2</option>
          </select>
          {isAdminOrProf && <button onClick={() => navigate(`/admin/bulletin-edit/${eleve.id}?annee=${selAnnee}&sem=${selSem}`)} style={{ padding:"5px 14px", background:"#E6F1FB", color:"#185FA5", border:"none", borderRadius:6, cursor:"pointer", fontSize:13, fontWeight:500 }}>✏️ Modifier</button>}
          <button onClick={handlePrint} style={{ padding:"5px 14px", background:"#EAF3DE", color:"#27500A", border:"none", borderRadius:6, cursor:"pointer", fontSize:13, fontWeight:500 }}>🖨️ Imprimer</button>
          <button onClick={() => navigate(-1)} style={{ padding:"5px 14px", background:"rgba(255,255,255,0.2)", color:"#fff", border:"1px solid rgba(255,255,255,0.3)", borderRadius:6, cursor:"pointer", fontSize:13 }}>← Retour</button>
        </div>
      </div>

      <div style={{ padding:"20px", display:"flex", justifyContent:"center" }}>
        <div className="bulletin-wrap">

          {/* ══ PAGE 1 ══ */}
          <div className="bulletin-page">

            {/* En-tête */}
            <div className="header-top">
              <div className="school-info">
                <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                  <div style={{ width:60, height:60, background:"#1B3A6B", borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:10, textAlign:"center", flexShrink:0 }}>ÉCOLE<br/>ALPHA</div>
                  <div>
                    <div style={{ fontWeight:"bold", fontSize:13 }}>ÉCOLE PILOTE INNOVANTE ALPHA (E.P.I.A)</div>
                    <div style={{ fontSize:10, marginTop:2 }}>ADRESSE :</div>
                    <div style={{ fontSize:10 }}>QUARTIER AGOE COUR D'APPEL . BP: 13651 LOMÉ-TOGO</div>
                    <div style={{ fontSize:10, marginTop:2 }}>TÉLÉPHONE</div>
                    <div style={{ fontSize:10 }}>( 00228) 22 22 24 68 / (00228) 99 11 11 11 / 92 11 11 11 / 71 11 11 11</div>
                    <div style={{ fontSize:10, marginTop:2 }}>Email : ecolealpha95@yahoo.fr</div>
                  </div>
                </div>
              </div>
              <div className="eleve-info">
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                  <tbody>
                    <tr>
                      <td style={{ padding:"2px 4px", width:"40%" }}><b>ÉLÈVE</b></td>
                      <td style={{ padding:"2px 4px" }}><b>ANNEE SCOLAIRE : {selAnnee}</b></td>
                    </tr>
                    <tr>
                      <td style={{ padding:"2px 4px" }}>Nom :</td>
                      <td style={{ padding:"2px 4px", fontWeight:"bold" }}>{eleve.nom}</td>
                    </tr>
                    <tr>
                      <td style={{ padding:"2px 4px" }}>Prénom(s) :</td>
                      <td style={{ padding:"2px 4px" }}>{eleve.prenom}</td>
                    </tr>
                    <tr>
                      <td style={{ padding:"2px 4px" }}>Né(e) le :</td>
                      <td style={{ padding:"2px 4px" }}>{eleve.date_naissance ? new Date(eleve.date_naissance).toLocaleDateString("fr-FR") : "—"}</td>
                    </tr>
                    <tr>
                      <td style={{ padding:"2px 4px" }}>À :</td>
                      <td style={{ padding:"2px 4px" }}>{eleve.lieu_naissance || "—"}</td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ padding:"4px 4px", fontWeight:"bold", fontSize:12 }}>PROGRAMME DU DIPLÔME {eleve.annee_pd === "D2" ? "DEUXIÈME ANNÉE" : "PREMIÈRE ANNÉE"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Titre */}
            <div className="bulletin-title">BULLETIN DU {selSem === "S1" ? "PREMIER" : "DEUXIÈME"} SEMESTRE</div>

            {/* Vie scolaire + Parents */}
            <table className="bul-table" style={{ marginBottom:4 }}>
              <tbody>
                <tr>
                  <td style={{ width:"50%", verticalAlign:"top", padding:"4px 6px" }}>
                    <div style={{ fontWeight:"bold", textDecoration:"underline", marginBottom:3 }}>Vie scolaire</div>
                    <div>Responsable : <b>{eleve.responsable || "—"}</b></div>
                    <div style={{ fontSize:10 }}>Tél: {eleve.tel_responsable || "—"}</div>
                    <div style={{ marginTop:4, fontWeight:"bold", textDecoration:"underline" }}>Assiduté de l'élève</div>
                    <div style={{ fontSize:11 }}>
                      NBRE D'ABSENCE : <b>{nbAbs}</b> &nbsp;&nbsp;
                      NBRE DE RETARD : <b>{nbRetard}</b> &nbsp;&nbsp;
                      Conduite : <b>{eleve.conduite || "Bonne"}</b>
                    </div>
                  </td>
                  <td style={{ width:"50%", verticalAlign:"top", padding:"4px 6px" }}>
                    <div style={{ fontWeight:"bold", textDecoration:"underline", marginBottom:3 }}>Parents ou Tuteurs</div>
                    <div>M/Mme : <b>{eleve.nom_parent || "—"}</b></div>
                    <div style={{ fontSize:11 }}>Tél : {eleve.tel_parent || "—"}</div>
                    <div style={{ fontSize:11 }}>Email : {eleve.email_parent || "—"}</div>
                    <div style={{ marginTop:4, fontSize:11 }}>
                      {bulletin?.parents_presents
                        ? "✅ Les parents ont participé aux entretiens avec les professeurs"
                        : "☐ Les parents ont participé aux entretiens avec les professeurs"}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Vie extrascolaire */}
            <table className="bul-table" style={{ marginBottom:4 }}>
              <tbody>
                <tr>
                  <td style={{ width:"50%", padding:"3px 6px" }}>
                    <div style={{ fontWeight:"bold", textDecoration:"underline", marginBottom:3, fontSize:11 }}>Vie extrascolaire</div>
                    <div style={{ fontSize:10 }}>Participe aux activités extrascolaires</div>
                    <div className="checkbox-row" style={{ marginTop:3 }}>
                      {["Tennis","Arts Martiaux","Équitation","Piscine"].map(a => (
                        <div key={a} className="cb-item">
                          <span className="cb-box">{activites[a] ? "✓" : ""}</span>
                          <span>{a}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ width:"50%", padding:"3px 6px" }}>
                    <div style={{ fontSize:10, marginBottom:3 }}>Participe aux activités récréatives</div>
                    <div className="checkbox-row">
                      {["Dépassement de soi","Séjour linguistique","Voyage découvert"].map(a => (
                        <div key={a} className="cb-item">
                          <span className="cb-box">{activites[a] ? "✓" : ""}</span>
                          <span>{a}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Tableau des matières */}
            <table className="bul-table">
              <thead>
                <tr>
                  <th style={{ width:"18%", textAlign:"left" }}>GROUPE DE MATIÈRES</th>
                  <th style={{ width:"6%", textAlign:"center" }}>NIVEAU /7</th>
                  <th style={{ width:"76%", textAlign:"center" }}>COMMENTAIRE DE L'ENSEIGNANT</th>
                </tr>
              </thead>
              <tbody>
                {["ÉTUDES EN LANGUE ET LITTÉRATURE","ACQUISITION DE LANGUES","MATHÉMATIQUES","INDIVIDUS ET SOCIÉTÉS","SCIENCES"].map(grpLabel => {
                  const lignesGrp = lignes.filter(l => {
                    const g = l.groupe_matiere || "";
                    if (grpLabel === "ÉTUDES EN LANGUE ET LITTÉRATURE") return g.includes("Groupe 1");
                    if (grpLabel === "ACQUISITION DE LANGUES") return g.includes("Groupe 2");
                    if (grpLabel === "MATHÉMATIQUES") return g.includes("Groupe 5");
                    if (grpLabel === "INDIVIDUS ET SOCIÉTÉS") return g.includes("Groupe 3");
                    if (grpLabel === "SCIENCES") return g.includes("Groupe 4") || g.includes("Groupe 6");
                    return false;
                  });
                  if (lignesGrp.length === 0) return null;
                  return [
                    <tr key={grpLabel+"-title"}>
                      <td colSpan={3} className="section-title">{grpLabel}</td>
                    </tr>,
                    ...lignesGrp.map((l, i) => (
                      <tr key={l.matiere}>
                        <td style={{ verticalAlign:"top", padding:"4px 6px" }}>
                          <div className="matiere-nom">{l.matiere.split("—")[0]?.trim()}</div>
                          <div className="niveau-tag">NIVEAU {l.niveau === "NS" ? "SUPÉRIEUR" : "MOYEN"}</div>
                          {/* Épreuves */}
                          <table style={{ width:"100%", borderCollapse:"collapse", marginTop:6 }}>
                            <thead>
                              <tr>
                                {(l.epreuves||[]).map((ep,j) => (
                                  <td key={j} style={{ fontSize:8, color:"#555", textAlign:"center", borderTop:"1px solid #ddd", padding:"1px 2px" }}>{ep.nom.replace("Évaluation","Éval.")}</td>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                {(l.epreuves||[]).map((ep,j) => {
                                  const v = l.eprDetail[ep.nom];
                                  return <td key={j} style={{ fontSize:10, fontWeight:"bold", textAlign:"center", padding:"1px 2px" }}>{v !== undefined && v !== "" ? `${v} /${ep.bareme}` : "-- /--"}</td>;
                                })}
                              </tr>
                            </tbody>
                          </table>
                          <div style={{ fontSize:9, color:"#888", marginTop:3 }}>{l.noteM?.enseignant || ""}</div>
                        </td>
                        <td className="note7-cell">{l.noteM?.note || "—"}</td>
                        <td style={{ padding:"4px 6px" }}>
                          <div className="comment-text">{l.noteM?.commentaire || ""}</div>
                        </td>
                      </tr>
                    ))
                  ];
                })}
                <tr className="total-row">
                  <td colSpan={2} style={{ textAlign:"center", padding:"6px" }}>TOTAL GROUPES DE MATIÈRES</td>
                  <td style={{ textAlign:"center", fontSize:16, fontWeight:"bold" }}>{total42}/42</td>
                </tr>
              </tbody>
            </table>

            <div className="page-num">1/2</div>
          </div>

          {/* ══ PAGE 2 ══ */}
          <div className="bulletin-page" style={{ marginTop:20 }}>

            {/* En-tête page 2 */}
            <div className="header-top">
              <div className="school-info">
                <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                  <div style={{ width:60, height:60, background:"#1B3A6B", borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:10, textAlign:"center", flexShrink:0 }}>ÉCOLE<br/>ALPHA</div>
                  <div>
                    <div style={{ fontWeight:"bold", fontSize:13 }}>ÉCOLE PILOTE INNOVANTE ALPHA (E.P.I.A)</div>
                    <div style={{ fontSize:10 }}>ADRESSE : QUARTIER AGOE COUR D'APPEL . BP: 13651 LOMÉ-TOGO</div>
                    <div style={{ fontSize:10 }}>TÉLÉPHONE : ( 00228) 22 22 24 68 / 99 11 11 11</div>
                    <div style={{ fontSize:10 }}>Email : ecolealpha95@yahoo.fr</div>
                  </div>
                </div>
              </div>
              <div className="eleve-info" style={{ padding:"8px" }}>
                <table style={{ width:"100%", fontSize:11 }}>
                  <tbody>
                    <tr><td>Nom :</td><td><b>{eleve.nom}</b></td></tr>
                    <tr><td>Prénom(s) :</td><td>{eleve.prenom}</td></tr>
                    <tr><td>Né(e) le :</td><td>{eleve.date_naissance ? new Date(eleve.date_naissance).toLocaleDateString("fr-FR") : "—"}</td></tr>
                    <tr><td colSpan={2}><b>PROGRAMME DU DIPLÔME {eleve.annee_pd === "D2" ? "DEUXIÈME ANNÉE" : "PREMIÈRE ANNÉE"}</b></td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bulletin-title">BULLETIN DU {selSem === "S1" ? "PREMIER" : "DEUXIÈME"} SEMESTRE</div>

            {/* Vie scolaire + Parents */}
            <table className="bul-table" style={{ marginBottom:4 }}>
              <tbody>
                <tr>
                  <td style={{ width:"50%", padding:"4px 6px" }}>
                    <div style={{ fontWeight:"bold", textDecoration:"underline", marginBottom:3 }}>Vie scolaire</div>
                    <div style={{ fontSize:11 }}>Responsable : <b>{eleve.responsable || "—"}</b> &nbsp; Tél: {eleve.tel_responsable || "—"}</div>
                    <div style={{ fontSize:11, marginTop:3 }}>NBRE D'ABSENCE : <b>{nbAbs}</b> &nbsp; NBRE DE RETARD : <b>{nbRetard}</b> &nbsp; Conduite : <b>{eleve.conduite || "Bonne"}</b></div>
                  </td>
                  <td style={{ width:"50%", padding:"4px 6px" }}>
                    <div style={{ fontWeight:"bold", textDecoration:"underline", marginBottom:3 }}>Parents ou Tuteurs</div>
                    <div style={{ fontSize:11 }}>M/Mme : <b>{eleve.nom_parent || "—"}</b> &nbsp; Tél : {eleve.tel_parent || "—"}</div>
                    <div style={{ fontSize:11 }}>Email : {eleve.email_parent || "—"}</div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Vie extrascolaire */}
            <table className="bul-table" style={{ marginBottom:4 }}>
              <tbody>
                <tr>
                  <td style={{ width:"50%", padding:"3px 6px" }}>
                    <div style={{ fontSize:10 }}>Participe aux activités extrascolaires</div>
                    <div className="checkbox-row" style={{ marginTop:3 }}>
                      {["Tennis","Arts Martiaux","Équitation","Piscine"].map(a => (
                        <div key={a} className="cb-item"><span className="cb-box">{activites[a]?"✓":""}</span><span>{a}</span></div>
                      ))}
                    </div>
                  </td>
                  <td style={{ width:"50%", padding:"3px 6px" }}>
                    <div style={{ fontSize:10 }}>Participe aux activités récréatives</div>
                    <div className="checkbox-row" style={{ marginTop:3 }}>
                      {["Dépassement de soi","Séjour linguistique","Voyage découvert"].map(a => (
                        <div key={a} className="cb-item"><span className="cb-box">{activites[a]?"✓":""}</span><span>{a}</span></div>
                      ))}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Tronc commun */}
            <table className="bul-table" style={{ marginBottom:4 }}>
              <thead>
                <tr>
                  <th style={{ width:"25%", textAlign:"left" }}>DISCIPLINE DU TRONC COMMUN</th>
                  <th style={{ width:"12%", textAlign:"center" }}>NIVEAU (A-E)</th>
                  <th style={{ width:"63%", textAlign:"center" }}>COMMENTAIRE DE L'ENSEIGNANT</th>
                </tr>
              </thead>
              <tbody>
                {TRONC_MATIERES.map(t => {
                  const row = troncData.find(r => r.matiere === t);
                  const label = t === "Théorie de la Connaissance (TdC)" ? "T.D.C" : t === "Mémoire (Extended Essay)" ? "MÉMOIRE" : "C.A.S";
                  return (
                    <tr key={t}>
                      <td style={{ padding:"4px 6px", verticalAlign:"top" }}>
                        <div className="matiere-nom">{label}</div>
                        {t === "Mémoire (Extended Essay)" && <div style={{ fontSize:10 }}>EN {lignes.find(l=>l.noteM?.enseignant)?.noteM?.enseignant?.split(" ")[0]?.toUpperCase()||""}</div>}
                        <div style={{ fontSize:9, color:"#888", marginTop:4 }}>{row?.commentaire?.split("\n")[0]?.slice(0,30) || ""}</div>
                      </td>
                      <td style={{ textAlign:"center", fontWeight:"bold", fontSize:14, verticalAlign:"middle" }}>{row?.niveau_ae || "—"}</td>
                      <td style={{ padding:"4px 6px" }}>
                        <div className="comment-text">{row?.commentaire || ""}</div>
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={2} style={{ textAlign:"center", fontWeight:"bold", padding:"5px" }}>POINTS BONUS</td>
                  <td style={{ textAlign:"center", fontWeight:"bold", fontSize:14 }}>{pointsBonus}/3</td>
                </tr>
                <tr style={{ background:"#f0f0f0" }}>
                  <td colSpan={2} style={{ textAlign:"center", fontWeight:"bold", fontSize:13, padding:"6px" }}>NIVEAU TOTAL IB</td>
                  <td style={{ textAlign:"center", fontWeight:"bold", fontSize:16 }}>{totalIB}/45</td>
                </tr>
              </tbody>
            </table>

            {/* Profil apprenant */}
            <div style={{ marginBottom:4 }}>
              <div style={{ fontWeight:"bold", textDecoration:"underline", fontSize:11, marginBottom:3 }}>PROFIL DE L'APPRENANT :</div>
              <div className="profil-text">{bulletin?.profil_apprenant || ""}</div>
            </div>

            {/* Appréciation générale */}
            <div style={{ marginBottom:4 }}>
              <div style={{ fontWeight:"bold", textDecoration:"underline", fontSize:11, marginBottom:3 }}>APPRECIATION GENERALE DU CONSEIL DE CLASSE :</div>
              <div className="profil-text">{bulletin?.appreciation_generale || ""}</div>
            </div>

            {/* Professeur principal */}
            <div style={{ fontSize:11, marginBottom:12 }}>
              <b>PROFESSEUR PRINCIPAL : {bulletin?.professeur_principal || "—"}</b>
            </div>

            {/* Signature */}
            <div style={{ display:"flex", justifyContent:"flex-end", fontSize:11 }}>
              <div style={{ textAlign:"center" }}>
                <div>Fait à Lomé, le {bulletin?.date_bulletin ? new Date(bulletin.date_bulletin).toLocaleDateString("fr-FR") : "—"}</div>
                <div style={{ marginTop:6 }}>La Coordinatrice ,</div>
                <div style={{ marginTop:30, borderTop:"1px solid #000", paddingTop:4 }}>{bulletin?.coordinatrice || "—"}</div>
              </div>
            </div>

            <div className="page-num">2/2</div>
          </div>

        </div>
      </div>
    </div>
  );
}
