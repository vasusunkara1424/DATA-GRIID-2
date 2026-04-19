import { useState } from 'react'
import { useUser, UserButton } from '@clerk/clerk-react'

export default function Settings() {
  const { user } = useUser()
  const [saved, setSaved] = useState(false)
  const [notifications, setNotifications] = useState({
    email: true, slack: false, anomaly: true, weekly: true,
  })

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const Section = ({ title, children }) => (
    <div style={{background:'#111118', borderRadius:'12px', border:'1px solid #2a2a38', padding:'24px', marginBottom:'20px'}}>
      <h3 style={{fontSize:'15px', fontWeight:'700', marginBottom:'20px', paddingBottom:'12px', borderBottom:'1px solid #1a1a28'}}>{title}</h3>
      {children}
    </div>
  )

  const Toggle = ({ label, desc, value, onChange }) => (
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
      <div>
        <div style={{fontSize:'14px', fontWeight:'600'}}>{label}</div>
        {desc && <div style={{fontSize:'12px', color:'#6b6b80', marginTop:'2px'}}>{desc}</div>}
      </div>
      <div onClick={() => onChange(!value)}
        style={{width:'44px', height:'24px', borderRadius:'12px', background: value ? '#00e5ff' : '#2a2a38',
          cursor:'pointer', position:'relative', transition:'background 0.2s'}}>
        <div style={{position:'absolute', top:'3px', left: value ? '23px' : '3px', width:'18px', height:'18px',
          borderRadius:'50%', background:'#fff', transition:'left 0.2s'}}/>
      </div>
    </div>
  )

  return (
    <div style={{padding:'32px', maxWidth:'700px', margin:'0 auto'}}>
      <h2 style={{fontSize:'22px', fontWeight:'800', marginBottom:'4px'}}>Settings</h2>
      <p style={{color:'#6b6b80', marginBottom:'32px', fontSize:'14px'}}>Manage your account and preferences</p>

      <Section title="Profile">
        <div style={{display:'flex', alignItems:'center', gap:'16px', marginBottom:'20px'}}>
          <UserButton appearance={{elements:{avatarBox:{width:'56px', height:'56px'}}}}/>
          <div>
            <div style={{fontSize:'16px', fontWeight:'700'}}>{user?.fullName || 'Rudhra'}</div>
            <div style={{fontSize:'13px', color:'#6b6b80'}}>{user?.primaryEmailAddress?.emailAddress || ''}</div>
          </div>
        </div>
        <div style={{fontSize:'13px', color:'#6b6b80', padding:'12px', borderRadius:'8px', background:'#0a0a0f', border:'1px solid #1a1a28'}}>
          To update your name, email or password — click your avatar above.
        </div>
      </Section>

      <Section title="Notifications">
        <Toggle label="Email alerts" desc="Receive pipeline alerts via email" value={notifications.email} onChange={v => setNotifications({...notifications, email: v})}/>
        <Toggle label="Slack alerts" desc="Send alerts to your Slack workspace" value={notifications.slack} onChange={v => setNotifications({...notifications, slack: v})}/>
        <Toggle label="Anomaly detection alerts" desc="Get notified when AI detects an issue" value={notifications.anomaly} onChange={v => setNotifications({...notifications, anomaly: v})}/>
        <Toggle label="Weekly summary" desc="Receive a weekly digest of your pipelines" value={notifications.weekly} onChange={v => setNotifications({...notifications, weekly: v})}/>
      </Section>

      <Section title="Plan & Billing">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
          <div>
            <div style={{fontSize:'14px', fontWeight:'700'}}>Free Trial</div>
            <div style={{fontSize:'12px', color:'#6b6b80', marginTop:'2px'}}>14 days remaining</div>
          </div>
          <span style={{padding:'4px 12px', borderRadius:'20px', background:'rgba(0,229,255,0.1)', color:'#00e5ff', fontSize:'12px', fontWeight:'700'}}>TRIAL</span>
        </div>
        <button style={{width:'100%', padding:'12px', borderRadius:'8px', border:'none',
          background:'#00e5ff', color:'#000', fontWeight:'700', cursor:'pointer', fontSize:'14px'}}>
          Upgrade to Pro — $149/mo
        </button>
      </Section>

      <Section title="Danger Zone">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <div style={{fontSize:'14px', fontWeight:'600', color:'#ff5555'}}>Delete account</div>
            <div style={{fontSize:'12px', color:'#6b6b80', marginTop:'2px'}}>Permanently delete your account and all data</div>
          </div>
          <button style={{padding:'8px 16px', borderRadius:'8px', border:'1px solid #ff5555',
            background:'transparent', color:'#ff5555', cursor:'pointer', fontSize:'13px', fontWeight:'600'}}>
            Delete
          </button>
        </div>
      </Section>

      <button onClick={save} style={{width:'100%', padding:'14px', borderRadius:'10px', border:'none',
        background: saved ? '#00e564' : '#00e5ff', color:'#000', fontWeight:'700', cursor:'pointer', fontSize:'15px'}}>
        {saved ? 'Saved!' : 'Save Changes'}
      </button>
    </div>
  )
}
