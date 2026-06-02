import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function AuthGuard({ children }) {
  const [checking, setChecking] = useState(true);
  const [ok, setOk]             = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
      } else {
        setOk(true);
        setChecking(false);
      }
    }
    check();

    // Écouter les changements de session (déconnexion)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate("/login");
    });
    return () => subscription.unsubscribe();
  }, []);

  if (checking) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",fontFamily:"sans-serif",color:"#aaa",fontSize:14 }}>
      Chargement...
    </div>
  );

  return ok ? children : null;
}
