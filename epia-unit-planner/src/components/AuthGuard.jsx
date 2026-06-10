import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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

export { supabase, supabaseAdmin };

export default function AuthGuard({ children }) {
  const [checking, setChecking] = useState(true);
  const [ok, setOk] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    async function detectRole() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      // Vérifier admin
      const { data: admin } = await supabaseAdmin
        .from("admins").select("id").eq("auth_id", user.id).single();
      if (admin) {
        if (!location.pathname.startsWith("/admin")) navigate("/admin");
        setOk(true); setChecking(false); return;
      }

      // Vérifier prof
      const { data: prof } = await supabaseAdmin
        .from("profs").select("id").eq("auth_id", user.id).single();
      if (prof) {
        if (!location.pathname.startsWith("/prof")) navigate("/prof/dashboard");
        setOk(true); setChecking(false); return;
      }

      // Vérifier élève
      const { data: eleve } = await supabaseAdmin
        .from("eleves").select("id").eq("auth_id", user.id).single();
      if (eleve) {
        if (!location.pathname.startsWith("/eleve")) navigate("/eleve/dashboard");
        setOk(true); setChecking(false); return;
      }

      // Aucun rôle trouvé
      await supabase.auth.signOut();
      navigate("/login");
    }

    detectRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate("/login");
    });
    return () => subscription.unsubscribe();
  }, []);

  if (checking) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", fontFamily:"sans-serif", color:"#aaa", gap:12 }}>
      <div style={{ width:36, height:36, border:"3px solid #E6F1FB", borderTop:"3px solid #1B3A6B", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontSize:14 }}>Chargement...</span>
    </div>
  );

  return ok ? children : null;
}
