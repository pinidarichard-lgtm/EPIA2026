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

const TRONC_MATIERES = ["Théorie de la Connaissance (TdC)","Mémoire (Extended Essay)","CAS"];

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

function getPeriodeLabel(anneePd, periode) {
  if (anneePd === "D1") {
    const map = { T1:"PREMIER TRIMESTRE", T2:"DEUXIÈME TRIMESTRE", T3:"TROISIÈME TRIMESTRE" };
    return map[periode] || "TRIMESTRE";
  }
  return periode === "S1" ? "PREMIER SEMESTRE" : "DEUXIÈME SEMESTRE";
}

export default function Bulletin() {
  const { eleveId } = useParams();
  const [eleve,     setEleve]     = useState(null);
  const [matieres,  setMatieres]  = useState([]);
  const [notes,     setNotes]     = useState([]);
  const [configs,   setConfigs]   = useState([]);
  const [absences,  setAbsences]  = useState([]);
  const [bulletin,  setBulletin]  = useState(null);
  const [troncData, setTroncData] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selPeriode,setSelPeriode]= useState("");
  const [selAnnee,  setSelAnnee]  = useState("");
  const [annees,    setAnnees]    = useState([]);
  const [isAP,      setIsAP]      = useState(false);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (selAnnee && eleve && selPeriode) reloadAll(eleve.id, selAnnee, selPeriode); }, [selAnnee, selPeriode]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: adminD }, { data: profD }] = await Promise.all([
      supabaseAdmin.from("admins").select("id").eq("auth_id", user.id).single(),
      supabaseAdmin.from("profs").select("id").eq("auth_id", user.id).single(),
    ]);
    const isAdminOrProf = !!(adminD || profD);
    setIsAP(isAdminOrProf);

    let eleveData;
    if (eleveId && isAdminOrProf) {
      const { data } = await supabaseAdmin.from("eleves").select("*").eq("id", eleveId).single();
      eleveData = data;
    } else {
      const { data } = await supabaseAdmin.from("eleves").select("*").eq("auth_id", user.id).single();
      eleveData = data;
    }
    setEleve(eleveData);
    if (!eleveData) { setLoading(false); return; }

    const annee = eleveData.annee_scolaire || "2024-2025";
    const defaultPeriode = eleveData.annee_pd === "D1" ? "T1" : "S1";
    setSelAnnee(annee);
    setSelPeriode(defaultPeriode);

    const [{ data: a }, { data: cfg }] = await Promise.all([
      supabaseAdmin.from("annees_scolaires").select("*").order("annee", { ascending: false }),
      supabaseAdmin.from("ib_matieres_config").select("*").eq("actif", true),
    ]);
    setAnnees(a || []);
    setConfigs(cfg || []);

    await reloadAll(eleveData.id, annee, defaultPeriode, cfg || []);
    setLoading(false);
  }

  async function reloadAll(eid, annee, periode, cfgOverride) {
    const cfg = cfgOverride || configs;
    const [{ data: mat }, { data: n }, { data: abs }, { data: bul }] = await Promise.all([
      supabaseAdmin.from("eleve_matieres").select("*").eq("eleve_id", eid).eq("annee_scolaire", annee),
      supabaseAdmin.from("notes").select("*").eq("eleve_id", eid).eq("annee_scolaire", annee),
      supabaseAdmin.from("absences").select("*").eq("eleve_id", eid).eq("annee_scolaire", annee),
      supabaseAdmin.from("bulletins").select("*").eq("eleve_id", eid).eq("annee_scolaire", annee).eq("periode", periode).single(),
    ]);
    setMatieres(mat || []);
    setNotes(n || []);
    setAbsences(abs || []);
    setBulletin(bul || null);
    setTroncData((mat || []).filter(m => m.groupe_matiere === "Tronc commun"));
  }

  const matieresPrincipales = matieres.filter(m => m.groupe_matiere !== "Tronc commun");

  const lignes = matieresPrincipales.map(m => {
    const cfg       = configs.find(c => c.matiere === m.matiere && c.niveau === m.niveau);
    const noteM     = notes.find(n => n.matiere === m.matiere);
    const eprDetail = noteM?.epreuves_detail || {};
    const epreuves  = cfg?.epreuves || [];
    return { ...m, cfg, noteM, epreuves, eprDetail };
  });

  const notes7    = lignes.map(l => l.noteM?.note).filter(n => n && n >= 1 && n <= 7);
  const total42   = notes7.reduce((s, n) => s + n, 0);
  const nbAbs     = absences.length;
  const nbRetard  = eleve?.nb_retards || 0;
  const activites = bulletin?.activites || {};
  const pointsBonus = bulletin?.points_bonus || 0;
  const totalIB   = total42 + pointsBonus;
  const periodes  = eleve ? getPeriodes(eleve.annee_pd) : [];

  const css = `
    @media print {
      .no-print { display: none !important; }
      body { margin: 0; background: white; }
      .bul-page { page-break-after: always; }
      .bul-page:last-child { page-break-after: avoid; }
      @page { margin: 10mm; }
    }
    .bul-wrap { font-family: Arial, sans-serif; font-size: 11px; color: #000; max-width: 210mm; margin: 0 auto; background: white; }
    .bul-table { width: 100%; border-collapse: collapse; }
    .bul-table td, .bul-table th { border: 1px solid #000; padding: 3px 5px; vertical-align: top; }
    .bul-title { text-align: center; font-size: 14px; font-weight: bold; border: 2px solid #000; padding: 5px; margin: 5px 0; }
    .sec-title { background: #000; color: #fff; text-align: center; font-weight: bold; font-size: 10px; padding: 2px; }
    .mat-nom { font-weight: bold; font-size: 10px; }
    .niv-tag { font-size: 9px; }
    .note7c { font-size: 16px; font-weight: bold; text-align: center; vertical-align: middle; }
    .ep-val { font-size: 10px; font-weight: bold; text-align: center; }
    .ep-lbl { font-size: 8px; color: #555; text-align: center; }
    .comment { font-size: 10px; line-height: 1.4; }
    .total-r td { font-weight: bold; background: #eee; }
    .cb-row { display: flex; gap: 8px; flex-wrap: wrap; font-size: 9px; margin-top: 2px; }
    .cb-item { display: flex; align-items: center; gap: 2px; }
    .cb-box { width: 9px; height: 9px; border: 1px solid #000; display: inline-flex; align-items: center; justify-content: center; font-size: 7px; flex-shrink: 0; }
    .profil-box { font-size: 10px; line-height: 1.5; padding: 5px; border: 1px solid #000; margin: 3px 0; }
    .page-n { text-align: right; font-size: 9px; padding: 2px; }
    .header-box { display: flex; border: 1px solid #000; margin-bottom: 3px; }
    .school-col { padding: 6px; width: 45%; border-right: 1px solid #000; display: flex; gap: 6px; align-items: flex-start; }
    .eleve-col { padding: 6px; width: 55%; }
    .logo-box { width: 55px; height: 55px; flex-shrink: 0; }
    .logo-img { width: 55px; height: 55px; object-fit: contain; }
  `;

  function renderHeader() {
    return (
      <div className="header-box">
        <div className="school-col">
          <div className="logo-box">
            <img className="logo-img" src="/logo-epia.png" alt="Logo EPIA"
              onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
            <div style={{ display:"none", width:55, height:55, background:"#1B3A6B", borderRadius:4, alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:9, textAlign:"center" }}>ÉCOLE<br/>ALPHA</div>
          </div>
          <div>
            <div style={{ fontWeight:"bold", fontSize:11 }}>ÉCOLE PILOTE INNOVANTE ALPHA (E.P.I.A)</div>
            <div style={{ fontSize:9, marginTop:1 }}>ADRESSE :</div>
            <div style={{ fontSize:9 }}>QUARTIER AGOE COUR D'APPEL . BP: 13651 LOMÉ-TOGO</div>
            <div style={{ fontSize:9, marginTop:1 }}>TÉLÉPHONE</div>
            <div style={{ fontSize:9 }}>( 00228) 22 22 24 68 / (00228) 99 11 11 11</div>
            <div style={{ fontSize:9 }}>92 11 11 11 / 71 11 11 11</div>
            <div style={{ fontSize:9, marginTop:1 }}>Email : ecolealpha95@yahoo.fr</div>
          </div>
        </div>
        <div className="eleve-col">
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:10 }}>
            <tbody>
              <tr>
                <td style={{ padding:"1px 4px", width:"35%" }}><b>ÉLÈVE</b></td>
                <td style={{ padding:"1px 4px" }}><b>ANNEE SCOLAIRE : {selAnnee}</b></td>
              </tr>
              <tr><td style={{ padding:"1px 4px" }}>Nom :</td><td style={{ padding:"1px 4px", fontWeight:"bold" }}>{eleve?.nom}</td></tr>
              <tr><td style={{ padding:"1px 4px" }}>Prénom(s) :</td><td style={{ padding:"1px 4px" }}>{eleve?.prenom}</td></tr>
              <tr><td style={{ padding:"1px 4px" }}>Né(e) le :</td><td style={{ padding:"1px 4px" }}>{eleve?.date_naissance ? new Date(eleve.date_naissance).toLocaleDateString("fr-FR") : "—"}</td></tr>
              <tr><td style={{ padding:"1px 4px" }}>À :</td><td style={{ padding:"1px 4px" }}>{eleve?.lieu_naissance || "—"}</td></tr>
              <tr>
                <td colSpan={2} style={{ padding:"3px 4px", fontWeight:"bold", fontSize:11 }}>
                  PROGRAMME DU DIPLÔME {eleve?.annee_pd === "D2" ? "DEUXIÈME ANNÉE" : "PREMIÈRE ANNÉE"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderVieScolaire() {
    return (
      <table className="bul-table" style={{ marginBottom:3 }}>
        <tbody>
          <tr>
            <td style={{ width:"50%", padding:"3px 5px" }}>
              <div style={{ fontWeight:"bold", textDecoration:"underline", marginBottom:2, fontSize:10 }}>Vie scolaire</div>
              <div style={{ fontSize:10 }}>Responsable <b>{eleve?.responsable || "—"}</b></div>
              <div style={{ fontSize:9 }}>Tél: {eleve?.tel_responsable || "—"}</div>
              <div style={{ fontWeight:"bold", textDecoration:"underline", marginTop:3, fontSize:10 }}>Assiduité de l'élève</div>
              <div style={{ fontSize:10 }}>NBRE D'ABSENCE : <b>{nbAbs}</b> &nbsp; NBRE DE RETARD : <b>{nbRetard}</b> &nbsp; Conduite : <b>{eleve?.conduite || "Bonne"}</b></div>
            </td>
            <td style={{ width:"50%", padding:"3px 5px" }}>
              <div style={{ fontWeight:"bold", textDecoration:"underline", marginBottom:2, fontSize:10 }}>Parents ou Tuteurs</div>
              <div style={{ fontSize:10 }}>M/Mme : <b>{eleve?.nom_parent || "—"}</b></div>
              <div style={{ fontSize:10 }}>Tél : {eleve?.tel_parent || "—"}</div>
              <div style={{ fontSize:10 }}>Email : {eleve?.email_parent || "—"}</div>
              <div style={{ fontSize:9, marginTop:3 }}>
                <span className="cb-box" style={{ marginRight:4 }}>{bulletin?.parents_presents ? "✓" : ""}</span>
                Les parents ont participé aux entretiens avec les professeurs
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  function renderVieExtra() {
    return (
      <table className="bul-table" style={{ marginBottom:3 }}>
        <tbody>
          <tr>
            <td style={{ width:"50%", padding:"3px 5px" }}>
              <div style={{ fontSize:9, fontWeight:"bold", textDecoration:"underline" }}>Vie extrascolaire</div>
              <div style={{ fontSize:9 }}>Participe aux activités extrascolaires</div>
              <div className="cb-row">
                {["Tennis","Arts Martiaux","Équitation","Piscine"].map(a => (
                  <div key={a} className="cb-item"><span className="cb-box">{activites[a]?"✓":""}</span><span>{a}</span></div>
                ))}
              </div>
            </td>
            <td style={{ width:"50%", padding:"3px 5px" }}>
              <div style={{ fontSize:9 }}>Participe aux activités récréatives</div>
              <div className="cb-row">
                {["Dépassement de soi","Séjour linguistique","Voyage découvert"].map(a => (
                  <div key={a} className="cb-item"><span className="cb-box">{activites[a]?"✓":""}</span><span>{a}</span></div>
                ))}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  const GROUPES_ORDER = [
    { key:"G1", label:"ÉTUDES EN LANGUE ET LITTÉRATURE",    test: g => g.includes("Groupe 1") },
    { key:"G2", label:"ACQUISITION DE LANGUES",             test: g => g.includes("Groupe 2") },
    { key:"G5", label:"MATHÉMATIQUES",                      test: g => g.includes("Groupe 5") },
    { key:"G3", label:"INDIVIDUS ET SOCIÉTÉS",              test: g => g.includes("Groupe 3") },
    { key:"G4", label:"SCIENCES",                           test: g => g.includes("Groupe 4") || g.includes("Groupe 6") },
  ];

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",fontFamily:"sans-serif" }}>Chargement du bulletin...</div>;
  if (!eleve)  return <div style={{ padding:"2rem",textAlign:"center",color:"#aaa" }}>Élève introuvable.</div>;

  return (
    <div style={{ background:"#e8e8e8", minHeight:"100vh", fontFamily:"sans-serif" }}>
      <style>{css}</style>

      {/* Barre contrôle */}
      <div className="no-print" style={{ background:"#1B3A6B", padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
        <div style={{ color:"#fff", fontWeight:600, fontSize:14 }}>
          📊 Bulletin — {eleve.prenom} {eleve.nom}
          <span style={{ fontSize:11, opacity:0.7, marginLeft:8 }}>{eleve.annee_pd} · {selAnnee}</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <select style={{ padding:"5px 10px", borderRadius:6, border:"none", fontSize:12 }} value={selAnnee} onChange={e => setSelAnnee(e.target.value)}>
            {annees.map(a => <option key={a.id} value={a.annee}>{a.annee}</option>)}
          </select>
          <select style={{ padding:"5px 10px", borderRadius:6, border:"none", fontSize:12 }} value={selPeriode} onChange={e => setSelPeriode(e.target.value)}>
            {periodes.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {isAP && <button onClick={() => navigate(`/admin/bulletin-edit/${eleve.id}?annee=${selAnnee}&periode=${selPeriode}`)} style={{ padding:"5px 14px", background:"#E6F1FB", color:"#185FA5", border:"none", borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:500 }}>✏️ Modifier</button>}
          <button onClick={() => window.print()} style={{ padding:"5px 14px", background:"#EAF3DE", color:"#27500A", border:"none", borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:500 }}>🖨️ Imprimer</button>
          <button onClick={() => navigate(-1)} style={{ padding:"5px 14px", background:"rgba(255,255,255,0.2)", color:"#fff", border:"1px solid rgba(255,255,255,0.3)", borderRadius:6, cursor:"pointer", fontSize:12 }}>← Retour</button>
        </div>
      </div>

      <div style={{ padding:"16px", display:"flex", justifyContent:"center" }}>
        <div className="bul-wrap">

          {/* ══ PAGE 1 ══ */}
          <div className="bul-page">
            {renderHeader()}
            <div className="bul-title">BULLETIN DU {getPeriodeLabel(eleve.annee_pd, selPeriode)}</div>
            {renderVieScolaire()}
            {renderVieExtra()}

            {/* Tableau matières */}
            <table className="bul-table">
              <thead>
                <tr>
                  <th style={{ width:"20%", textAlign:"left", fontSize:10 }}>GROUPE DE MATIÈRES</th>
                  <th style={{ width:"7%", textAlign:"center", fontSize:10 }}>NIVEAU /7</th>
                  <th style={{ width:"73%", textAlign:"center", fontSize:10 }}>COMMENTAIRE DE L'ENSEIGNANT</th>
                </tr>
              </thead>
              <tbody>
                {GROUPES_ORDER.map(grp => {
                  const lignesGrp = lignes.filter(l => grp.test(l.groupe_matiere || ""));
                  if (lignesGrp.length === 0) return null;
                  return [
                    <tr key={grp.key+"-h"}>
                      <td colSpan={3} className="sec-title">{grp.label}</td>
                    </tr>,
                    ...lignesGrp.map((l, i) => (
                      <tr key={l.matiere+i}>
                        <td style={{ verticalAlign:"top", padding:"3px 5px" }}>
                          <div className="mat-nom">{l.matiere.split("—")[0]?.trim().toUpperCase()}</div>
                          <div className="niv-tag">NIVEAU {l.niveau === "NS" ? "SUPÉRIEUR" : "MOYEN"}</div>
                          {/* Épreuves */}
                          {l.epreuves.length > 0 && (
                            <table style={{ width:"100%", borderCollapse:"collapse", marginTop:4 }}>
                              <thead>
                                <tr>{l.epreuves.map((ep,j) => <td key={j} className="ep-lbl">{ep.nom.replace("Évaluation Interne","Éval. Interne").replace("Épreuve","Ép.")}</td>)}</tr>
                              </thead>
                              <tbody>
                                <tr>{l.epreuves.map((ep,j) => {
                                  const v = l.eprDetail[ep.nom];
                                  return <td key={j} className="ep-val">{v !== undefined && v !== "" ? `${v}/${ep.bareme}` : "--/--"}</td>;
                                })}</tr>
                              </tbody>
                            </table>
                          )}
                          <div style={{ fontSize:8, color:"#666", marginTop:3 }}>{l.noteM?.enseignant || ""}</div>
                        </td>
                        <td className="note7c">{l.noteM?.note || "—"}</td>
                        <td style={{ padding:"3px 5px" }}>
                          <div className="comment">{l.noteM?.commentaire || ""}</div>
                        </td>
                      </tr>
                    ))
                  ];
                })}
                <tr className="total-r">
                  <td colSpan={2} style={{ textAlign:"center", padding:"5px", fontSize:11 }}>TOTAL GROUPES DE MATIÈRES</td>
                  <td style={{ textAlign:"center", fontSize:15, fontWeight:"bold" }}>{total42}/42</td>
                </tr>
              </tbody>
            </table>
            <div className="page-n">1/2</div>
          </div>

          {/* ══ PAGE 2 ══ */}
          <div className="bul-page" style={{ marginTop:16 }}>
            {renderHeader()}
            <div className="bul-title">BULLETIN DU {getPeriodeLabel(eleve.annee_pd, selPeriode)}</div>
            {renderVieScolaire()}
            {renderVieExtra()}

            {/* Tronc commun */}
            <table className="bul-table" style={{ marginBottom:4 }}>
              <thead>
                <tr>
                  <th style={{ width:"22%", textAlign:"left", fontSize:10 }}>DISCIPLINE DU TRONC COMMUN</th>
                  <th style={{ width:"10%", textAlign:"center", fontSize:10 }}>NIVEAU (A-E)</th>
                  <th style={{ width:"68%", textAlign:"center", fontSize:10 }}>COMMENTAIRE DE L'ENSEIGNANT</th>
                </tr>
              </thead>
              <tbody>
                {TRONC_MATIERES.map(t => {
                  const row = troncData.find(r => r.matiere === t);
                  const label = t === "Théorie de la Connaissance (TdC)" ? "T.D.C" : t === "Mémoire (Extended Essay)" ? "MÉMOIRE" : "C.A.S";
                  return (
                    <tr key={t}>
                      <td style={{ padding:"3px 5px", verticalAlign:"top" }}>
                        <div className="mat-nom">{label}</div>
                        <div style={{ fontSize:8, color:"#666", marginTop:20 }}>{row?.enseignant || ""}</div>
                      </td>
                      <td style={{ textAlign:"center", fontWeight:"bold", fontSize:13, verticalAlign:"middle" }}>{row?.niveau_ae || "—"}</td>
                      <td style={{ padding:"3px 5px" }}>
                        <div className="comment">{row?.commentaire || ""}</div>
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={2} style={{ textAlign:"center", fontWeight:"bold", padding:"4px", fontSize:11 }}>POINTS BONUS</td>
                  <td style={{ textAlign:"center", fontWeight:"bold", fontSize:14 }}>{pointsBonus}/3</td>
                </tr>
                <tr style={{ background:"#eee" }}>
                  <td colSpan={2} style={{ textAlign:"center", fontWeight:"bold", fontSize:12, padding:"5px" }}>NIVEAU TOTAL IB</td>
                  <td style={{ textAlign:"center", fontWeight:"bold", fontSize:16 }}>{totalIB}/45</td>
                </tr>
              </tbody>
            </table>

            {/* Profil */}
            <div style={{ marginBottom:4 }}>
              <div style={{ fontWeight:"bold", textDecoration:"underline", fontSize:10, marginBottom:2 }}>PROFIL DE L'APPRENANT :</div>
              <div className="profil-box">{bulletin?.profil_apprenant || ""}</div>
            </div>

            {/* Appréciation */}
            <div style={{ marginBottom:4 }}>
              <div style={{ fontWeight:"bold", textDecoration:"underline", fontSize:10, marginBottom:2 }}>APPRECIATION GENERALE DU CONSEIL DE CLASSE :</div>
              <div className="profil-box">{bulletin?.appreciation_generale || ""}</div>
            </div>

            {/* Prof principal */}
            <div style={{ fontSize:10, marginBottom:10 }}>
              <b>PROFESSEUR PRINCIPAL : {bulletin?.professeur_principal || "—"}</b>
            </div>

            {/* Signature */}
            <div style={{ display:"flex", justifyContent:"flex-end", fontSize:10 }}>
              <div style={{ textAlign:"center", minWidth:200 }}>
                <div>Fait à Lomé, le {bulletin?.date_bulletin ? new Date(bulletin.date_bulletin).toLocaleDateString("fr-FR") : "—"}</div>
                <div style={{ marginTop:5 }}>La Coordinatrice ,</div>
                <div style={{ marginTop:25, borderTop:"1px solid #000", paddingTop:3 }}>{bulletin?.coordinatrice || "—"}</div>
              </div>
            </div>

            <div className="page-n">2/2</div>
          </div>

        </div>
      </div>
    </div>
  );
}
