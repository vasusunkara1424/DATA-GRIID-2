import { useState, useEffect } from 'react'
import { SignInButton, SignedIn, SignedOut } from '@clerk/clerk-react'

export default function Landing() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const features = [
    { title: 'Change Data Capture', desc: 'Stream every database change the moment it happens. Zero polling, zero latency — pure real-time.' },
    { title: 'AI-Powered SQL', desc: 'Ask questions in plain English. DataGriid writes the SQL, runs it, and returns results instantly.' },
    { title: 'Anomaly Detection', desc: 'Machine learning watches your pipelines around the clock and alerts you before users notice.' },
    { title: 'Team Workspaces', desc: 'Invite engineers, analysts, and stakeholders. Control access with role-based permissions.' },
    { title: 'Native Connectors', desc: 'One-click integrations with Postgres, Stripe, Snowflake, S3, BigQuery, and 40+ more.' },
    { title: 'Live Dashboards', desc: 'Charts and KPIs that update in real time. No refresh button needed.' },
  ]

  const plans = [
    { name: 'Starter', price: '$49', desc: 'For small teams getting started', features: ['5 pipelines', '3 sources', 'AI SQL queries', 'Email alerts', '1 workspace'] },
    { name: 'Pro', price: '$149', desc: 'For growing data teams', popular: true, features: ['Unlimited pipelines', '20 sources', 'Anomaly detection', 'Slack + email alerts', '5 workspaces', 'Priority support'] },
    { name: 'Enterprise', price: '$299', desc: 'For large organizations', features: ['Everything in Pro', 'Unlimited sources', 'Custom connectors', 'SSO / SAML', 'Unlimited workspaces', 'Dedicated support'] },
  ]

  return (
    <div style={{background:'#080810', color:'#e8e8f0', fontFamily:'Inter, system-ui, sans-serif', minHeight:'100vh', overflowX:'hidden'}}>

      {/* Gradient orb background */}
      <div style={{position:'fixed', top:'-200px', left:'50%', transform:'translateX(-50%)', width:'800px', height:'800px', background:'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)', pointerEvents:'none', zIndex:0}}/>

      {/* Nav */}
      <nav style={{position:'fixed', top:0, left:0, right:0, zIndex:100, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 48px', height:'64px', background: scrollY > 20 ? 'rgba(8,8,16,0.9)' : 'transparent', backdropFilter: scrollY > 20 ? 'blur(12px)' : 'none', borderBottom: scrollY > 20 ? '1px solid rgba(255,255,255,0.06)' : 'none', transition:'all 0.3s'}}>
        <div style={{fontSize:'18px', fontWeight:'700', letterSpacing:'-0.5px'}}>
        </div>
        <div style={{display:'flex', gap:'32px', fontSize:'14px', color:'#6b6b80'}}>
          {['Features', 'Pricing', 'Docs', 'Blog'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} style={{color:'#6b6b80', textDecoration:'none', transition:'color 0.2s'}}
              onMouseEnter={e => e.target.style.color = '#e8e8f0'}
              onMouseLeave={e => e.target.style.color = '#6b6b80'}>
              {item}
            </a>
          ))}
        </div>
        <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
          <SignedOut>
            <SignInButton mode="modal">
              <button style={{padding:'8px 16px', borderRadius:'6px', border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'#a0a0b8', cursor:'pointer', fontSize:'14px', transition:'all 0.2s'}}>
                Sign in
              </button>
            </SignInButton>
            <SignInButton mode="modal">
              <button style={{padding:'8px 16px', borderRadius:'6px', border:'none', background:'#00e5ff', color:'#000', cursor:'pointer', fontSize:'14px', fontWeight:'600'}}>
                Get started
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <a href="/">
              <button style={{padding:'8px 16px', borderRadius:'6px', border:'none', background:'#00e5ff', color:'#000', cursor:'pointer', fontSize:'14px', fontWeight:'600'}}>
                Open app
              </button>
            </a>
          </SignedIn>
        </div>
      </nav>

      {/* Hero */}
      <div style={{position:'relative', zIndex:1, textAlign:'center', padding:'160px 48px 120px'}}>
        <div style={{display:'inline-flex', alignItems:'center', gap:'8px', padding:'6px 14px', borderRadius:'6px', background:'rgba(0,229,255,0.08)', border:'1px solid rgba(0,229,255,0.15)', color:'#00e5ff', fontSize:'12px', fontWeight:'600', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'32px'}}>
          Now in public beta
        </div>
        <h1 style={{fontSize:'72px', fontWeight:'800', lineHeight:'1.05', letterSpacing:'-2px', marginBottom:'24px', maxWidth:'900px', margin:'0 auto 24px'}}>
          The data platform<br/>
          <span style={{background:'linear-gradient(135deg, #00e5ff, #7c3aed)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'}}>built for speed</span>
        </h1>
        <p style={{fontSize:'18px', color:'#6b6b80', maxWidth:'520px', margin:'0 auto 40px', lineHeight:'1.7', fontWeight:'400'}}>
          Real-time pipelines, AI-powered queries, and intelligent monitoring — at a fraction of what Fivetran charges.
        </p>
        <div style={{display:'flex', gap:'12px', justifyContent:'center'}}>
          <SignInButton mode="modal">
            <button style={{padding:'14px 28px', borderRadius:'8px', border:'none', background:'#00e5ff', color:'#000', cursor:'pointer', fontSize:'15px', fontWeight:'700', letterSpacing:'-0.3px'}}>
              Start for free
            </button>
          </SignInButton>
          <a href="#features">
            <button style={{padding:'14px 28px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'#a0a0b8', cursor:'pointer', fontSize:'15px', fontWeight:'500'}}>
              See how it works
            </button>
          </a>
        </div>
        <p style={{color:'#3a3a50', fontSize:'13px', marginTop:'16px', letterSpacing:'0.2px'}}>Free 14-day trial · No credit card required</p>

        {/* Metrics */}
        <div style={{display:'flex', gap:'64px', justifyContent:'center', marginTop:'80px', paddingTop:'64px', borderTop:'1px solid rgba(255,255,255,0.05)'}}>
          {[['50+', 'Native connectors'], ['< 10ms', 'Average latency'], ['99.9%', 'Uptime SLA'], ['10x', 'Cheaper than Fivetran']].map(([val, label]) => (
            <div key={label} style={{textAlign:'center'}}>
              <div style={{fontSize:'28px', fontWeight:'800', letterSpacing:'-1px', color:'#e8e8f0'}}>{val}</div>
              <div style={{fontSize:'13px', color:'#4a4a60', marginTop:'6px', fontWeight:'500'}}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div id="features" style={{position:'relative', zIndex:1, padding:'80px 48px', maxWidth:'1100px', margin:'0 auto'}}>
        <div style={{marginBottom:'64px'}}>
          <p style={{color:'#00e5ff', fontSize:'12px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'12px'}}>Features</p>
          <h2 style={{fontSize:'40px', fontWeight:'800', letterSpacing:'-1px', marginBottom:'16px'}}>Everything your data team needs</h2>
          <p style={{color:'#6b6b80', fontSize:'16px', maxWidth:'480px', lineHeight:'1.7'}}>Built by data engineers, for data engineers. No BI bloat, no unnecessary complexity.</p>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1px', background:'rgba(255,255,255,0.06)', borderRadius:'16px', overflow:'hidden'}}>
          {features.map((f, i) => (
            <div key={f.title} style={{padding:'32px', background:'#080810', transition:'background 0.2s'}}
              onMouseEnter={e => e.currentTarget.style.background = '#0d0d1a'}
              onMouseLeave={e => e.currentTarget.style.background = '#080810'}>
              <div style={{width:'32px', height:'2px', background:'#00e5ff', marginBottom:'20px', borderRadius:'1px'}}/>
              <h3 style={{fontSize:'16px', fontWeight:'700', marginBottom:'10px', letterSpacing:'-0.3px'}}>{f.title}</h3>
              <p style={{color:'#6b6b80', fontSize:'14px', lineHeight:'1.7'}}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" style={{position:'relative', zIndex:1, padding:'80px 48px', maxWidth:'1100px', margin:'0 auto'}}>
        <div style={{marginBottom:'64px'}}>
          <p style={{color:'#00e5ff', fontSize:'12px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'12px'}}>Pricing</p>
          <h2 style={{fontSize:'40px', fontWeight:'800', letterSpacing:'-1px', marginBottom:'16px'}}>Simple, transparent pricing</h2>
          <p style={{color:'#6b6b80', fontSize:'16px', lineHeight:'1.7'}}>No surprise bills. No per-connector fees. Just one flat price.</p>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px'}}>
          {plans.map(plan => (
            <div key={plan.name} style={{padding:'32px', borderRadius:'12px', border: plan.popular ? '1px solid rgba(0,229,255,0.3)' : '1px solid rgba(255,255,255,0.06)', background: plan.popular ? 'rgba(0,229,255,0.03)' : '#0d0d1a', position:'relative'}}>
              {plan.popular && (
                <div style={{position:'absolute', top:'16px', right:'16px', padding:'3px 10px', borderRadius:'4px', background:'rgba(0,229,255,0.15)', color:'#00e5ff', fontSize:'11px', fontWeight:'700', letterSpacing:'0.5px'}}>
                  POPULAR
                </div>
              )}
              <p style={{color:'#6b6b80', fontSize:'13px', marginBottom:'8px'}}>{plan.name}</p>
              <div style={{fontSize:'36px', fontWeight:'800', letterSpacing:'-1px', marginBottom:'4px'}}>{plan.price}<span style={{fontSize:'14px', color:'#6b6b80', fontWeight:'400'}}>/mo</span></div>
              <p style={{color:'#4a4a60', fontSize:'13px', marginBottom:'24px'}}>{plan.desc}</p>
              <div style={{height:'1px', background:'rgba(255,255,255,0.06)', marginBottom:'24px'}}/>
              {plan.features.map(f => (
                <div key={f} style={{display:'flex', gap:'10px', alignItems:'center', marginBottom:'10px'}}>
                  <div style={{width:'16px', height:'16px', borderRadius:'50%', background:'rgba(0,229,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                    <div style={{width:'6px', height:'6px', borderRadius:'50%', background:'#00e5ff'}}/>
                  </div>
                  <span style={{fontSize:'13px', color:'#a0a0b8'}}>{f}</span>
                </div>
              ))}
              <SignInButton mode="modal">
                <button style={{width:'100%', padding:'12px', borderRadius:'6px', border: plan.popular ? 'none' : '1px solid rgba(255,255,255,0.1)', marginTop:'24px', background: plan.popular ? '#00e5ff' : 'transparent', color: plan.popular ? '#000' : '#a0a0b8', cursor:'pointer', fontSize:'14px', fontWeight:'600'}}>
                  Get started
                </button>
              </SignInButton>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{position:'relative', zIndex:1, textAlign:'center', padding:'120px 48px', borderTop:'1px solid rgba(255,255,255,0.05)'}}>
        <h2 style={{fontSize:'48px', fontWeight:'800', letterSpacing:'-1.5px', marginBottom:'16px'}}>Ready to ship faster?</h2>
        <p style={{color:'#6b6b80', marginBottom:'32px', fontSize:'18px', lineHeight:'1.7'}}>Join data teams who moved from Fivetran to DataGriid.</p>
        <SignInButton mode="modal">
          <button style={{padding:'16px 40px', borderRadius:'8px', border:'none', background:'#00e5ff', color:'#000', cursor:'pointer', fontSize:'16px', fontWeight:'700', letterSpacing:'-0.3px'}}>
            Start for free
          </button>
        </SignInButton>
      </div>

      {/* Footer */}
      <div style={{borderTop:'1px solid rgba(255,255,255,0.05)', padding:'32px 48px', display:'flex', justifyContent:'space-between', color:'#3a3a50', fontSize:'13px', position:'relative', zIndex:1}}>
        <span style={{fontWeight:'600', color:'#4a4a60'}}>Data<span style={{color:'#00e5ff'}}>Griid</span></span>
        <span>© 2026 DataGriid. Built by Rudhra.</span>
      </div>
    </div>
  )
}
