export default function AProposPage() {
  return (
    <div style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>

      {/* Bannière principale */}
      <div style={{
        background: 'linear-gradient(135deg, #1a3a5c 0%, #2a5280 100%)',
        borderRadius: 16,
        padding: '3rem 2.5rem',
        color: '#fff',
        marginBottom: '2.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '2rem',
        flexWrap: 'wrap',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 250, height: 250, borderRadius: '50%',
          background: 'rgba(232,184,75,0.08)'
        }} />
        <img
          src="/logo-epia.png"
          alt="Logo EPIA"
          style={{ width: 120, height: 120, objectFit: 'contain', borderRadius: 12, flexShrink: 0 }}
        />
        <div>
          <div style={{
            display: 'inline-block',
            background: '#e8b84b', color: '#1a3a5c',
            fontSize: 11, fontWeight: 700, padding: '4px 14px',
            borderRadius: 20, letterSpacing: 1, marginBottom: '0.75rem'
          }}>ÉCOLE CANDIDATE IB</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, marginBottom: '0.5rem' }}>
            L'École Pilote Innovante Alpha
          </h1>
          <p style={{ fontSize: 15, opacity: 0.85, lineHeight: 1.6, maxWidth: 500 }}>
            Un établissement scolaire homologué par le Baccalauréat International,
            engagé pour une éducation internationale de grande qualité à Lomé, Togo.
          </p>
        </div>
      </div>

      {/* Grille 2 colonnes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>

        {/* Mission IB */}
        <InfoCard color="#1a3a5c" icon="🎓" title="Déclaration de mission de l'IB">
          <p>Le Baccalauréat International a pour but de développer chez les jeunes la curiosité intellectuelle, les connaissances et la sensibilité nécessaires pour contribuer à bâtir un monde meilleur et plus paisible, dans un esprit d'entente mutuelle et de respect interculturel.</p>
          <p style={{ marginTop: 10 }}>Ces programmes encouragent les élèves de tout pays à apprendre activement tout au long de leur vie, à être empreints de compassion, et à comprendre que les autres, en étant différents, puissent aussi être dans le vrai.</p>
        </InfoCard>

        {/* Vision école */}
        <InfoCard color="#1a6b4a" icon="🌍" title="Vision de l'école">
          <p>Offrir une meilleure éducation et une formation de qualité au plus grand nombre d'enfants avec un programme d'étude stimulant tout en intégrant des dispositifs dérogatoires qui ont fait la preuve de leur efficience.</p>
        </InfoCard>

        {/* Mission école */}
        <InfoCard color="#7a3e1a" icon="⭐" title="Mission de l'école">
          <p>Nous sommes nés pour apporter une contribution positive à une action novatrice devant conduire à la réussite de tous les élèves sans abandon. Ceci dans une ambiance et un environnement accueillant, esthétiques, fonctionnels et non laxistes.</p>
          <p style={{ marginTop: 10 }}>Dotée d'équipements performants, l'Ecole Alpha s'inscrira dans l'excellence.</p>
        </InfoCard>

        {/* Programme IB */}
        <InfoCard color="#2a5280" icon="📚" title="Programme du Diplôme IB">
          <p>L'École Alpha propose le <strong>Programme du Diplôme (PD)</strong>, reconnu mondialement. Ce programme de deux ans prépare les élèves âgés de 16 à 19 ans à l'enseignement supérieur et à la vie adulte.</p>
          <p style={{ marginTop: 10 }}>Seuls les établissements autorisés par l'Organisation du BI peuvent proposer ce programme.</p>
          <a href="http://www.ibo.org/fr/" target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-block', marginTop: 12,
            color: '#e8b84b', fontSize: 13, fontWeight: 600
          }}>→ En savoir plus sur ibo.org</a>
        </InfoCard>
      </div>

      {/* Section contact */}
      <div style={{
        background: '#1a3a5c',
        borderRadius: 16,
        padding: '2.5rem',
        color: '#fff',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>
          Nous contacter
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>

          <ContactCard icon="📞" title="Téléphone">
            <p>(00228) 22 22 24 68</p>
            <p>(00228) 99 11 11 11</p>
            <p>92 11 11 11 / 71 11 11 11</p>
          </ContactCard>

          <ContactCard icon="📍" title="Adresse">
            <p>Le complexe scolaire Alpha fonctionne sur trois sites :</p>
            <p style={{ marginTop: 6 }}>• <strong>Centre-ville</strong> — Tokoin Hôpital, Avenue de la Victoire</p>
            <p style={{ marginTop: 4 }}>• <strong>Nord</strong> — Agoényivé, quartier Cour d'Appel</p>
            <p style={{ marginTop: 4 }}>• <strong>Baguida</strong> — en face de la Mairie de Baguida</p>
            <p style={{ marginTop: 6, opacity: 0.7, fontSize: 12 }}>07BP: 13651 Lomé-TOGO</p>
          </ContactCard>

          <ContactCard icon="✉️" title="Email">
            <a href="mailto:ecolealpha1995@gmail.com" style={{ color: '#e8b84b', textDecoration: 'none' }}>
              ecolealpha1995@gmail.com
            </a>
            <br />
            <a href="mailto:infos@ecolealpha.com" style={{ color: '#e8b84b', textDecoration: 'none', marginTop: 4, display: 'block' }}>
              infos@ecolealpha.com
            </a>
          </ContactCard>

          <ContactCard icon="🌐" title="Site web">
            <a href="https://ecolealpha.com" target="_blank" rel="noopener noreferrer"
              style={{ color: '#e8b84b', textDecoration: 'none', fontWeight: 600 }}>
              ecolealpha.com
            </a>
          </ContactCard>

        </div>
      </div>

      {/* CTA retour */}
      <div style={{ textAlign: 'center' }}>
        <a href="/plans" style={{
          display: 'inline-block',
          background: '#e8b84b', color: '#1a3a5c',
          textDecoration: 'none', padding: '12px 28px',
          borderRadius: 8, fontWeight: 700, fontSize: 15
        }}>Accéder aux plans d'unité →</a>
      </div>
    </div>
  )
}

function InfoCard({ color, icon, title, children }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      border: '1px solid #e8e6e0',
      overflow: 'hidden'
    }}>
      <div style={{ background: color, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>{title}</h3>
      </div>
      <div style={{ padding: '1.25rem', fontSize: 14, color: '#444', lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  )
}

function ContactCard({ icon, title, children }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.08)',
      borderRadius: 10,
      padding: '1.25rem',
      border: '1px solid rgba(255,255,255,0.15)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h3 style={{ color: '#e8b84b', fontSize: 14, fontWeight: 700, margin: 0 }}>{title}</h3>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.85)' }}>
        {children}
      </div>
    </div>
  )
}
