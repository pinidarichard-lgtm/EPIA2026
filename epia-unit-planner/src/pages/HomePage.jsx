import { Link } from 'react-router-dom'

const CARDS = [
  { to: '/plans', color: '#1a3a5c', icon: '📋', title: "Plans d'unité PD", desc: "Créez et consultez les plans d'unité en 3 phases (Recherche, Action, Réflexion)." },
  { to: '/cahier', color: '#1a6b4a', icon: '📒', title: 'Cahier de textes', desc: 'Enregistrez le contenu des cours par groupe de matières — D1 et D2.' },
  { to: '/eleves', color: '#2a5280', icon: '👥', title: 'Listes élèves', desc: 'Gérez les promotions D1 (2024–2025) et D2 (2025–2026).' },
  { to: '/absences', color: '#7a4a1a', icon: '📅', title: 'Absences & Appels', desc: 'Faites l\'appel et suivez les absences par trimestre (D1) et semestre (D2).' },
  { to: '/notes', color: '#5a2d82', icon: '🎯', title: 'Notes sur 7', desc: 'Saisie des notes IB par matière — trimestrielle D1, semestrielle D2.' },
  { to: '/suivi', color: '#1a5c4a', icon: '📈', title: 'Suivi individuel', desc: 'Fiche par élève : notes, absences et commentaires des enseignants.' },
]

export default function HomePage() {
  return (
    <div style={{ paddingTop: '2rem' }}>
      {/* Bannière */}
      <div style={{
        background: 'linear-gradient(135deg, #1a3a5c 0%, #2a5280 100%)',
        borderRadius: 16, padding: '3rem', color: '#fff',
        marginBottom: '2rem', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(232,184,75,0.1)' }} />
        <div style={{ position: 'absolute', bottom: -60, right: 100, width: 160, height: 160, borderRadius: '50%', background: 'rgba(232,184,75,0.06)' }} />
        <div style={{ display: 'inline-block', background: '#e8b84b', color: '#1a3a5c', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, marginBottom: '1rem', letterSpacing: 1 }}>
          PROGRAMME DU DIPLÔME IB · LOMÉ, TOGO
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: '0.5rem', lineHeight: 1.2 }}>
          Plateforme de gestion EPIA
        </h1>
        <p style={{ fontSize: 15, opacity: 0.85, maxWidth: 500, lineHeight: 1.7, marginBottom: '1.75rem' }}>
          Plans d'unité, cahier de textes, notes, absences et suivi des élèves D1 et D2 — tout en un seul endroit.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link to="/plans/new" style={{ background: '#e8b84b', color: '#1a3a5c', textDecoration: 'none', padding: '11px 22px', borderRadius: 8, fontWeight: 700, fontSize: 14 }}>
            + Nouveau plan d'unité
          </Link>
          <Link to="/notes" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', textDecoration: 'none', padding: '11px 22px', borderRadius: 8, fontWeight: 600, fontSize: 14, border: '1px solid rgba(255,255,255,0.3)' }}>
            Saisir des notes
          </Link>
          <Link to="/absences" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', textDecoration: 'none', padding: '11px 22px', borderRadius: 8, fontWeight: 600, fontSize: 14, border: '1px solid rgba(255,255,255,0.2)' }}>
            Faire l'appel
          </Link>
        </div>
      </div>

      {/* Grille des modules */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginBottom: '1rem' }}>Modules disponibles</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {CARDS.map(card => (
          <Link key={card.to} to={card.to} style={{
            background: '#fff', borderRadius: 12, padding: '1.5rem',
            border: '1px solid #e8e6e0', textDecoration: 'none', display: 'block',
            transition: 'box-shadow 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ background: card.color, color: '#fff', width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: '1rem' }}>
              {card.icon}
            </div>
            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: '0.5rem', color: '#1a1a1a' }}>{card.title}</h3>
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>{card.desc}</p>
          </Link>
        ))}
      </div>

      {/* Info D1/D2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
        <div style={{ background: '#1a3a5c', borderRadius: 10, padding: '1.25rem', color: '#fff' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, opacity: 0.7, marginBottom: 6 }}>PROMOTION D1</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>2024 – 2025</div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>Notation par <strong>trimestre</strong> (T1, T2, T3)</div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>Absences comptabilisées par trimestre</div>
        </div>
        <div style={{ background: '#1a6b4a', borderRadius: 10, padding: '1.25rem', color: '#fff' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, opacity: 0.7, marginBottom: 6 }}>PROMOTION D2</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>2025 – 2026</div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>Notation par <strong>semestre</strong> (S1, S2)</div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>Absences comptabilisées par semestre</div>
        </div>
      </div>
    </div>
  )
}
