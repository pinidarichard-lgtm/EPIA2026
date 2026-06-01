import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function AdminGuard({ children }) {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/admin-login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
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
