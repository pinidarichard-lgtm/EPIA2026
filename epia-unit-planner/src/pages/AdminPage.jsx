import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TABLE      = "eleves";
const COL_ID     = "id";
const COL_NOM    = "nom";
const COL_PRENOM = "prenom";
const COL_EMAIL  = "email";
const COL_ANNEE  = "annee_pd";
const COL_AUTH   = "auth_id";

function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789@#!";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function Initials({ user }) {
  return (
    <div style={{ width:38,height:38,borderRadius:"50%",background:"#E6F1FB",color:"#185FA5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:500,flexShrink:0 }}>
      {(user[COL_PRENOM]||"?")[0].toUpperCase()}{(user[COL_NOM]||"?")[0].toUpperCase()}
    </div>
  );
}

function Badge({ annee }) {
  const styles = {
    D2:      { background:"#EAF3DE", color:"#27500A", label:"D2 · 2025–2026" },
    diplome: { background:"#EEEDFE", color:"#3C3489", label:"Diplômé" },
    default: { background:"#E6F1FB", color:"#0C447C", label:"D1 · 2024–2025" },
  };
  const st = styles[annee] || styles.default;
  return <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:500, whiteSpace:"nowrap", background:st.background, color:st.color }}>{st.label}</span>;
}

export default function AdminPage() {
  const [tab,setTab]         = useState("annees");
  const [eleves,setEleves]   = useState([]);
  const [loading,setLoading] = useState(true);
  const [banner,setBanner]   = useState(null);
  const [searchA,setSearchA] = useState("");
  const [filterA,setFilterA] = useState("");
  const [searchM,setSearchM] = useState("");
  const [modalAnnee,setModalAnnee] = useState(null);
  const [editAnnee,setEditAnnee]   = useState("D1");
  const [modalPromo,setModalPromo] = useState(false);
  const [modalMdp,setModalMdp]     = useState(null);
  const [newPw,setNewPw]     = useState("");
  const [autoGen,setAutoGen] = useState(false);
  const [genPw,setGenPw]     = useState("");
  const [showPw,setShowPw]   = useState(false);
  const [copied,setCopied]   = useState(false);

  useEffect(()=>{ loadEleves(); },[]);

  async function loadEleves() {
    setLoading(true);
    const { data, error } = await supabaseAdmin.from(TABLE)
      .select(`${COL_ID},${COL_NOM},${COL_PRENOM},${COL_EMAIL},${COL_ANNEE},${COL_AUTH}`)
      .order(COL_NOM);
    if(error) showBanner("Erreur : "+error.message,"error");
    else setEleves(data||[]);
    setLoading(false);
  }

  function showBanner(msg,type){ setBanner({msg,type}); setTimeout(()=>setBanner(null),4500); }

  const filteredA = eleves.filter(u=>{
    const q = searchA.toLowerCase();
    const match = `${u[COL_NOM]} ${u[COL_PRENOM]} ${u[COL_EMAIL]||""}`.toLowerCase().includes(q);
    if(!filterA) return match;
    return match && u[COL_ANNEE]===filterA;
  });

  const filteredM = eleves.filter(u=>{
    const q = searchM.toLowerCase();
    return `${u[COL_NOM]} ${u[COL_PRENOM]} ${u[COL_EMAIL]||""}`.toLowerCase().includes(q);
  });

  async function saveAnnee(){
    const { error } = await supabaseAdmin.from(TABLE).update({[COL_ANNEE]:editAnnee}).eq(COL_ID,modalAnnee.user[COL_ID]);
    if(error){ showBanner("Erreur : "+error.message,"error"); return; }
    setEleves(prev=>prev.map(u=>u[COL_ID]===modalAnnee.user[COL_ID]?{...u,[COL_ANNEE]:editAnnee}:u));
    setModalAnnee(null);
    showBanner("✓ Année mise à jour.","success");
  }

  async function promouvoirPromo(){
    const { error } = await supabaseAdmin.from(TABLE).update({[COL_ANNEE]:"D2"}).eq(COL_ANNEE,"D1");
    if(error){ showBanner("Erreur : "+error.message,"error"); return; }
    setEleves(prev=>prev.map(u=>u[COL_ANNEE]==="D1"?{...u,[COL_ANNEE]:"D2"}:u));
    setModalPromo(false);
    showBanner("✓ Tous les D1 promus en D2.","success");
  }

  async function saveMdp(){
    const pw = autoGen ? genPw : newPw;
    if(!pw||pw.length<8){ showBanner("Minimum 8 caractères.","error"); return; }
    if(!modalMdp.user[COL_AUTH]){ showBanner("Cet élève n'a pas de compte Auth.","error"); return; }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(modalMdp.user[COL_AUTH],{password:pw});
    if(error){ showBanner("Erreur : "+error.message,"error"); return; }
    setModalMdp(null);
    showBanner("✓ Mot de passe mis à jour.","success");
  }

  function openMdpModal(user){ setModalMdp({user}); setNewPw(""); setAutoGen(false); setGenPw(""); setShowPw(false); }
  function handleAutoGen(c){ setAutoGen(c); if(c) setGenPw(generatePassword()); }
  function copyPw(){ navigator.clipboard.writeText(genPw); setCopied(true); setTimeout(()=>setCopied(false),2000); }

  const s = {
    wrap:{fontFamily:"sans-serif",padding:"1.5rem",maxWidth:820,margin:"0 auto"},
    title:{fontSize:20,fontWeight:500,margin:"0 0 1.5rem",color:"#111"},
    tabs:{display:"flex",gap:8,marginBottom:"1.5rem"},
    tab:(a)=>({padding:"8px 18px",border:"1px solid",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:a?500:400,background:a?"#E6F1FB":"transparent",color:a?"#185FA5":"#666",borderColor:a?"#B5D4F4":"#ddd"}),
    banner:(t)=>({padding:"10px 14px",borderRadius:8,fontSize:13,marginBottom:"1.25rem",background:t==="success"?"#EAF3DE":"#FCEBEB",color:t==="success"?"#27500A":"#A32D2D",border:`1px solid ${t==="success"?"#C0DD97":"#F7C1C1"}`}),
    promo:{background:"#f9f9f9",border:"1px solid #eee",borderRadius:12,padding:"1.25rem",marginBottom:"1.5rem"},
    card:{background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1rem 1.25rem",marginBottom:8},
    row:{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"},
    info:{flex:1,minWidth:0},
    name:{fontSize:14,fontWeight:500,margin:0,color:"#111"},
    email:{fontSize:12,color:"#888",margin:0},
    btnSm:{padding:"5px 12px",fontSize:12,border:"1px solid #ddd",borderRadius:8,background:"transparent",cursor:"pointer",whiteSpace:"nowrap"},
    btnP:{padding:"8px 18px",fontSize:13,border:"1px solid #B5D4F4",borderRadius:8,background:"#E6F1FB",color:"#185FA5",cursor:"pointer",fontWeight:500},
    btnG:{padding:"8px 18px",fontSize:13,border:"1px solid #C0DD97",borderRadius:8,background:"#EAF3DE",color:"#27500A",cursor:"pointer",fontWeight:500},
    sRow:{display:"flex",gap:8,marginBottom:"1rem"},
    count:{fontSize:12,color:"#888",marginBottom:"0.75rem"},
    inp:{padding:"8px 12px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"},
    sel:{padding:"8px 12px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"},
    modal:{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100},
    mBox:{background:"#fff",borderRadius:12,border:"1px solid #eee",padding:"1.5rem",width:380,maxWidth:"92vw"},
    mTitle:{fontSize:16,fontWeight:500,margin:"0 0 1.25rem",color:"#111"},
    field:{marginBottom:"1rem"},
    lbl:{display:"block",fontSize:13,color:"#555",marginBottom:4},
    mAct:{display:"flex",gap:8,justifyContent:"flex-end",marginTop:"1.25rem"},
    pwBox:{fontFamily:"monospace",fontSize:13,background:"#f9f9f9",padding:"8px 12px",borderRadius:8,border:"1px solid #eee",display:"flex",alignItems:"center",gap:8,marginTop:8},
  };

  const nbD1 = eleves.filter(u=>u[COL_ANNEE]==="D1").length;

  return (
    <div style={s.wrap}>
      <h1 style={s.title}>🛠️ Administration EPIA — {eleves.length} élève(s)</h1>
      {banner && <div style={s.banner(banner.type)}>{banner.msg}</div>}

      <div style={s.tabs}>
        <button style={s.tab(tab==="annees")} onClick={()=>setTab("annees")}>📅 Années (annee_pd)</button>
        <button style={s.tab(tab==="mdp")}    onClick={()=>setTab("mdp")}>🔒 Mots de passe</button>
      </div>

      {tab==="annees" && <>
        <div style={s.promo}>
          <p style={{fontWeight:500,margin:"0 0 4px",color:"#111"}}>Promotion collective D1 → D2</p>
          <p style={{fontSize:13,color:"#666",margin:"0 0 1rem"}}>{nbD1} élève(s) actuellement en D1.</p>
          <button style={s.btnSm} onClick={()=>setModalPromo(true)}>👥 Promouvoir tous les D1 → D2</button>
        </div>
        <div style={s.sRow}>
          <input style={{...s.inp,flex:1}} placeholder="Rechercher..." value={searchA} onChange={e=>setSearchA(e.target.value)} />
          <select style={{...s.sel,width:170}} value={filterA} onChange={e=>setFilterA(e.target.value)}>
            <option value="">Toutes les années</option>
            <option value="D1">D1 · 2024–2025</option>
            <option value="D2">D2 · 2025–2026</option>
            <option value="diplome">Diplômés</option>
          </select>
        </div>
        <p style={s.count}>{loading?"Chargement...":`${filteredA.length} élève(s)`}</p>
        {filteredA.map(u=>(
          <div key={u[COL_ID]} style={s.card}>
            <div style={s.row}>
              <Initials user={u}/>
              <div style={s.info}>
                <p style={s.name}>{u[COL_PRENOM]} {u[COL_NOM]}</p>
                <p style={s.email}>{u[COL_EMAIL]||"—"}</p>
              </div>
              <Badge annee={u[COL_ANNEE]}/>
              <button style={s.btnSm} onClick={()=>{ setModalAnnee({user:u}); setEditAnnee(u[COL_ANNEE]||"D1"); }}>✏️ Modifier</button>
            </div>
          </div>
        ))}
      </>}

      {tab==="mdp" && <>
        <div style={{...s.promo,background:"#FFF9EC",borderColor:"#FAC775"}}>
          <p style={{fontSize:13,color:"#633806",margin:0}}>⚠️ La colonne <strong>auth_id</strong> doit être remplie pour changer le mot de passe d'un élève.</p>
        </div>
        <input style={{...s.inp,width:"100%",marginBottom:"1rem"}} placeholder="Rechercher..." value={searchM} onChange={e=>setSearchM(e.target.value)} />
        <p style={s.count}>{loading?"Chargement...":`${filteredM.length} élève(s)`}</p>
        {filteredM.map(u=>(
          <div key={u[COL_ID]} style={s.card}>
            <div style={s.row}>
              <Initials user={u}/>
              <div style={s.info}>
                <p style={s.name}>{u[COL_PRENOM]} {u[COL_NOM]}</p>
                <p style={s.email}>{u[COL_EMAIL]||"—"}</p>
              </div>
              <Badge annee={u[COL_ANNEE]}/>
              {u[COL_AUTH]
                ? <button style={s.btnSm} onClick={()=>openMdpModal(u)}>🔒 Changer mdp</button>
                : <span style={{fontSize:11,color:"#ccc"}}>pas de compte</span>
              }
            </div>
          </div>
        ))}
      </>}

      {modalAnnee && (
        <div style={s.modal} onClick={e=>e.target===e.currentTarget&&setModalAnnee(null)}>
          <div style={s.mBox}>
            <h3 style={s.mTitle}>✏️ Modifier l'année</h3>
            <div style={s.field}>
              <span style={s.lbl}>Élève</span>
              <p style={{fontWeight:500,fontSize:14,margin:0,color:"#111"}}>{modalAnnee.user[COL_PRENOM]} {modalAnnee.user[COL_NOM]}</p>
            </div>
            <div style={s.field}>
              <label style={s.lbl}>Année (annee_pd)</label>
              <select style={{...s.sel,width:"100%"}} value={editAnnee} onChange={e=>setEditAnnee(e.target.value)}>
                <option value="D1">D1 — 2024–2025</option>
                <option value="D2">D2 — 2025–2026</option>
                <option value="diplome">Diplômé</option>
              </select>
            </div>
            <div style={s.mAct}>
              <button style={s.btnSm} onClick={()=>setModalAnnee(null)}>Annuler</button>
              <button style={s.btnP} onClick={saveAnnee}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {modalPromo && (
        <div style={s.modal} onClick={e=>e.target===e.currentTarget&&setModalPromo(false)}>
          <div style={s.mBox}>
            <h3 style={s.mTitle}>👥 Promotion D1 → D2</h3>
            <p style={{fontSize:13,color:"#666",margin:"0 0 1rem"}}>
              <strong>{nbD1} élève(s) D1</strong> passeront en D2 (2025–2026).<br/>La colonne <code>annee_pd</code> sera mise à jour. Irréversible.
            </p>
            <div style={s.mAct}>
              <button style={s.btnSm} onClick={()=>setModalPromo(false)}>Annuler</button>
              <button style={s.btnG} onClick={promouvoirPromo}>✓ Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {modalMdp && (
        <div style={s.modal} onClick={e=>e.target===e.currentTarget&&setModalMdp(null)}>
          <div style={s.mBox}>
            <h3 style={s.mTitle}>🔒 Mot de passe</h3>
            <div style={s.field}>
              <span style={s.lbl}>Élève</span>
              <p style={{fontWeight:500,fontSize:14,margin:0,color:"#111"}}>{modalMdp.user[COL_PRENOM]} {modalMdp.user[COL_NOM]}</p>
              <p style={{fontSize:12,color:"#888",margin:"2px 0 0"}}>{modalMdp.user[COL_EMAIL]}</p>
            </div>
            <div style={s.field}>
              <label style={s.lbl}>Nouveau mot de passe</label>
              <div style={{position:"relative"}}>
                <input style={{...s.inp,width:"100%",paddingRight:38}} type={showPw?"text":"password"} placeholder="Minimum 8 caractères" value={newPw} disabled={autoGen} onChange={e=>setNewPw(e.target.value)} />
                <button onClick={()=>setShowPw(!showPw)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16}}>{showPw?"🙈":"👁️"}</button>
              </div>
            </div>
            <div style={s.field}>
              <label style={{fontSize:13,color:"#555",display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                <input type="checkbox" checked={autoGen} onChange={e=>handleAutoGen(e.target.checked)} style={{width:"auto"}} />
                Générer automatiquement
              </label>
              {autoGen && (
                <div style={s.pwBox}>
                  <span style={{flex:1}}>{genPw}</span>
                  <button style={{...s.btnSm,fontSize:11}} onClick={copyPw}>{copied?"✓ Copié":"📋 Copier"}</button>
                  <button style={{...s.btnSm,fontSize:11}} onClick={()=>setGenPw(generatePassword())}>🔄</button>
                </div>
              )}
            </div>
            <div style={s.mAct}>
              <button style={s.btnSm} onClick={()=>setModalMdp(null)}>Annuler</button>
              <button style={s.btnP} onClick={saveMdp}>✓ Appliquer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
