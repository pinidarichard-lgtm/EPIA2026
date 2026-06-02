import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

// Client anon pour vérifier la session
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Client service_role pour lire la table admins sans RLS
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default function AdminGuard({ children }) {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed]   = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function check() {
      // 1. Récupérer la session courante
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/admin-login");
        return;
      }

      // 2. Vérifier dans admins avec service_role (contourne RLS)
      const { data, error } = await supabaseAdmin
        .from("admins")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (error || !data) {
        navigate("/admin-login");
        return;
      }

      setAllowed(true);
      setChecking(false);
    }
    check();
  }, []);

  if (checking) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "sans-serif", color: "#888" }}>
      Vérification en cours...
    </div>
  );

  return allowed ? children : null;
}
