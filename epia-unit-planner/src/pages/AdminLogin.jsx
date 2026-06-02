import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";

// Client normal pour la connexion Auth
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Client admin pour vérifier la table admins (contourne le RLS)
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default function AdminLogin() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 1. Connexion Auth
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    // 2. Vérifier dans la table admins avec la clé service_role
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from("admins")
      .select("id")
      .eq("auth_id", data.user.id)
      .single();

    if (adminError || !adminData) {
      await supabase.auth.signOut();
      setError("Accès refusé. Vous n'êtes pas administrateur.");
      setLoading(false);
      return;
    }

    // 3. Accès accordé
    navigate("/admin");
  }

  const s = {
    page:  { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5", fontFamily: "sans-serif" },
    card:  { background: "#fff", borderRadius: 16, border: "1px solid #eee", padding: "2rem", width: 360, maxWidth: "92vw" },
    logo:  { width: 48, height: 48, borderRadius: 12, background: "#1B3A6B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18, marginBottom: "1.25rem" },
    title: { fontSize: 20, fontWeight: 500, margin: "0 0 4px", color: "#111" },
    sub:   { fontSize: 13, color: "#888", margin: "0 0 1.5rem" },
    field: { marginBottom: "1rem" },
    label: { display: "block", fontSize: 13, color: "#555", marginBottom: 4 },
    input: { width: "100%", padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none" },
    btn:   { width: "100%", padding: "10px", background: "#1B3A6B", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", marginTop: "0.5rem" },
    error: { background: "#FCEBEB", color: "#A32D2D", border: "1px solid #F7C1C1", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: "1rem" },
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>E</div>
        <h1 style={s.title}>Espace administrateur</h1>
        <p style={s.sub}>EPIA Lomé — Programme du Diplôme</p>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={s.field}>
            <label style={s.label}>Mot de passe</label>
            <input style={s.input} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
