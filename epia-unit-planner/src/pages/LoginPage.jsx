import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email, password,
    });

    if (authError) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    // Redirection vers l'accueil après connexion
    navigate("/");
  }

  const s = {
    page:  { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f0f2f5", fontFamily:"sans-serif" },
    card:  { background:"#fff", borderRadius:16, border:"1px solid #eee", padding:"2.5rem 2rem", width:380, maxWidth:"94vw", boxShadow:"0 4px 24px rgba(0,0,0,0.07)" },
    logo:  { display:"flex", alignItems:"center", gap:12, marginBottom:"1.75rem" },
    logoImg: { width:44, height:44, borderRadius:10, background:"#1B3A6B", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:20 },
    logoText: { fontSize:16, fontWeight:600, color:"#1B3A6B", lineHeight:1.2 },
    logoSub:  { fontSize:12, color:"#888", fontWeight:400 },
    title: { fontSize:22, fontWeight:600, margin:"0 0 6px", color:"#111" },
    sub:   { fontSize:13, color:"#888", margin:"0 0 1.75rem" },
    field: { marginBottom:"1.1rem" },
    label: { display:"block", fontSize:13, color:"#444", marginBottom:5, fontWeight:500 },
    input: { width:"100%", padding:"10px 12px", border:"1px solid #ddd", borderRadius:9, fontSize:14, boxSizing:"border-box", outline:"none", transition:"border 0.15s" },
    btn:   { width:"100%", padding:"11px", background:"#1B3A6B", color:"#fff", border:"none", borderRadius:9, fontSize:14, fontWeight:600, cursor:"pointer", marginTop:"0.5rem", letterSpacing:"0.3px" },
    error: { background:"#FCEBEB", color:"#A32D2D", border:"1px solid #F7C1C1", borderRadius:8, padding:"9px 12px", fontSize:13, marginBottom:"1rem" },
    footer:{ fontSize:12, color:"#bbb", textAlign:"center", marginTop:"1.5rem" },
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoImg}>E</div>
          <div>
            <div style={s.logoText}>EPIA Lomé</div>
            <div style={s.logoSub}>Programme du Diplôme</div>
          </div>
        </div>

        <h1 style={s.title}>Connexion</h1>
        <p style={s.sub}>Accès réservé aux membres de l'EPIA.</p>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input
              style={s.input}
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>Mot de passe</label>
            <div style={{ position:"relative" }}>
              <input
                style={{ ...s.input, paddingRight:40 }}
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:17,color:"#aaa" }}
              >{showPw ? "🙈" : "👁️"}</button>
            </div>
          </div>
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p style={s.footer}>Contactez l'administrateur si vous avez oublié votre mot de passe.</p>
      </div>
    </div>
  );
}
