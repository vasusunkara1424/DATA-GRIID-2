import { useState, useEffect } from 'react'
import { SignedIn, SignedOut, UserButton, useAuth } from '@clerk/clerk-react'
import { setAuthToken } from './services/api'
import Landing from './Landing'
import Ingestion from './Ingestion'
import Transform from './Transform'
import Monitor from './Monitor'
import Visualize from './Visualize'
import AI from './AI'
import Connectors from './pages/Connectors'
import Overview from './Overview'
import Teams from './Teams'
import Settings from './Settings'
import Pipeline from './Pipeline'

const TABS = [
  { id:'overview',   icon:'⬡', label:'Overview',     sub:'All systems operational' },
  { id:'ingestion',  icon:'↓', label:'Ingestion',    sub:'12 sources connected' },
  { id:'transform',  icon:'⟳', label:'Transform',    sub:'dbt models · 4 active' },
  { id:'monitor',    icon:'◉', label:'Monitoring',   sub:'1 alert requires attention' },
  { id:'visualize',  icon:'▲', label:'Visualize',    sub:'Live dashboards' },
  { id:'catalog',    icon:'▦', label:'Data Catalog', sub:'5 verified tables' },
  { id:'connectors', icon:'⌬', label:'Connectors',   sub:'8 integrations' },
  { id:'teams',      icon:'👥', label:'Teams',        sub:'Manage your workspace' },
  { id:'settings',   icon:'⚙', label:'Settings',     sub:'Account & preferences' },
]

const Logo = () => (
  <svg width="28" height="28" viewBox="0 0 680 420" xmlns="http://www.w3.org/2000/svg">
    <line x1="100" y1="185" x2="380" y2="185" stroke="#e8e8f0" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="100" y1="172" x2="100" y2="198" stroke="#e8e8f0" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="380" y1="172" x2="380" y2="198" stroke="#e8e8f0" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="230" y1="80"  x2="230" y2="290" stroke="#e8e8f0" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="218" y1="80"  x2="242" y2="80"  stroke="#e8e8f0" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="218" y1="290" x2="242" y2="290" stroke="#e8e8f0" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="100" y1="218" x2="380" y2="218" stroke="#e8e8f0" strokeWidth="1.2" opacity="0.5"/>
    <path d="M230,130 C240,160 265,185 230,185 C265,185 240,210 230,240 C220,210 195,185 230,185 C195,185 220,160 230,130Z" fill="#e8e8f0" opacity="0.9"/>
    <circle cx="310" cy="185" r="14" fill="#00e5ff"/>
    <circle cx="310" cy="185" r="6" fill="#080810"/>
  </svg>
)

function AppContent() {
  const [active, setActive] = useState('overview')
  const [tokenReady, setTokenReady] = useState(false)
  const { getToken, isSignedIn } = useAuth()
  const current = TABS.find(t => t.id === active)

  // Get Clerk token and set it in API client
  useEffect(() => {
    if (!isSignedIn) return

    const syncToken = async () => {
      try {
        const token = await getToken()
        if (token) {
          setAuthToken(token)
          // Initialize workspace for new user
          if (user?.id) {
            fetch(`http://localhost:4000/api/init/workspace`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.id,
                email: user.primaryEmailAddress?.emailAddress || 'user@example.com'
              })
            }).catch(err => console.error('Workspace init failed:', err))
          }
          setTokenReady(true)
        }
      } catch (err) {
        console.error('Failed to get Clerk token:', err)
      }
    }
    
    syncToken()
    // Refresh token every 5 minutes to stay fresh
    const interval = setInterval(syncToken, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [getToken, isSignedIn])

  // Don't render main content until token is ready
  if (!tokenReady) {
    return (
      <div style={{display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', background:'#0a0a0f', color:'#e8e8f0'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'32px', marginBottom:'16px'}}>⟳</div>
          <div>Loading DataGrid...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{display:'flex', height:'100vh', overflow:'hidden', background:'#0a0a0f', color:'#e8e8f0', fontFamily:'Syne, sans-serif'}}>

      <aside style={{width:'220px', background:'#111118', borderRight:'1px solid #2a2a38', display:'flex', flexDirection:'column'}}>
        <div style={{padding:'16px 20px', borderBottom:'1px solid #2a2a38', display:'flex', alignItems:'center', gap:'10px'}}>
          <Logo />
          <span style={{fontSize:'16px', fontWeight:'700', color:'#00e5ff', letterSpacing:'-0.5px'}}>DataGriid</span>
        </div>

        <nav style={{flex:1, overflowY:'auto', padding:'12px 0'}}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActive(tab.id)}
              style={{width:'100%', padding:'10px 20px', border:'none', background:'none',
                color: active === tab.id ? '#e8e8f0' : '#6b6b80',
                cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:'12px',
                borderLeft: active === tab.id ? '2px solid #00e5ff' : '2px solid transparent',
                backgroundColor: active === tab.id ? 'rgba(0,229,255,0.06)' : 'transparent'}}>
              <span style={{fontSize:'16px'}}>{tab.icon}</span>
              <div style={{fontSize:'13px', fontWeight: active === tab.id ? '700' : '500'}}>{tab.label}</div>
              {active === tab.id && <div style={{marginLeft:'auto', width:'6px', height:'6px', borderRadius:'50%', background:'#00e5ff'}}/>}
            </button>
          ))}
        </nav>

        <div style={{padding:'16px 20px', borderTop:'1px solid #2a2a38', display:'flex', alignItems:'center', gap:'10px'}}>
          <UserButton/>
          <div style={{fontSize:'12px', color:'#6b6b80'}}>Account</div>
        </div>
      </aside>

      <div style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden'}}>
        <header style={{padding:'0 24px', height:'56px', borderBottom:'1px solid #2a2a38', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#111118'}}>
          <span style={{fontSize:'16px', fontWeight:'700'}}>{current?.label}</span>
          <button style={{padding:'8px 16px', borderRadius:'8px', border:'none', background:'#00e5ff', color:'#000', fontWeight:'700', cursor:'pointer', fontSize:'13px'}}>+ Pipeline</button>
        </header>

        <main style={{flex:1, overflowY:'auto'}}>
          {active === 'overview'   && <Overview />}
          {active === 'ingestion'  && <Ingestion />}
          {active === 'transform'  && <Transform />}
          {active === 'monitor'    && <Monitor />}
          {active === 'visualize'  && <Visualize />}
          {active === 'catalog'    && <AI />}
          {active === 'connectors' && <Connectors />}
          {active === 'teams'      && <Teams />}
          {active === 'settings'   && <Settings />}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <>
      <SignedOut><Landing /></SignedOut>
      <SignedIn><AppContent /></SignedIn>
    </>
  )
}
