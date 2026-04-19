const PIPELINES = [
  { id:1, name:'ecommerce_analytics_v3', status:'running', records:'4.2M/hr',  latency:'89ms' },
  { id:2, name:'user_events_stream',     status:'running', records:'1.1M/hr',  latency:'44ms' },
  { id:3, name:'inventory_sync_daily',   status:'scheduled', records:'82K/hr', latency:'—' },
  { id:4, name:'postgres_to_warehouse',  status:'error',   records:'—',        latency:'—' },
  { id:5, name:'marketing_attribution',  status:'scheduled', records:'—',      latency:'—' },
]

const NODES = [
  { id:'postgres', label:'Postgres',  sub:'3.1M rows/hr', icon:'🐘', color:'#00e5ff', status:'running' },
  { id:'stripe',   label:'Stripe',    sub:'events stream', icon:'💳', color:'#00e5ff', status:'running' },
  { id:'transform',label:'Transform', sub:'dbt models',    icon:'⟳',  color:'#7c3aed', status:'running' },
  { id:'qa',       label:'QA Rules',  sub:'14 checks',     icon:'◉',  color:'#f59e0b', status:'running' },
  { id:'snowflake',label:'Snowflake', sub:'destination',   icon:'❄️', color:'#7c3aed', status:'running' },
  { id:'dashboard',label:'Dashboard', sub:'live metrics',  icon:'▲',  color:'#10b981', status:'running' },
]

const STATUS_COLOR = {
  running:   '#10b981',
  scheduled: '#00e5ff',
  error:     '#ef4444',
  idle:      '#6b6b80',
}

const STATUS_LABEL = {
  running:   '● Running',
  scheduled: '⏱ Scheduled',
  error:     '✕ Error',
  idle:      '— Idle',
}

export default function Pipeline() {
  return (
    <div style={{padding:'24px', display:'flex', flexDirection:'column', gap:'24px'}}>

      {/* Pipeline Canvas */}
      <div style={{background:'#111118', border:'1px solid #2a2a38', borderRadius:'14px', overflow:'hidden'}}>
        <div style={{padding:'14px 18px', borderBottom:'1px solid #2a2a38', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div style={{fontSize:'13px', fontWeight:'700', color:'#e8e8f0'}}>
            🔁 ecommerce_analytics_v3
            <span style={{marginLeft:'8px', fontSize:'10px', padding:'2px 8px', borderRadius:'20px', background:'rgba(16,185,129,0.15)', color:'#10b981', fontWeight:'700'}}>Running</span>
          </div>
          <span style={{fontSize:'12px', color:'#6b6b80', fontFamily:'monospace'}}>Last run: 2m ago</span>
        </div>

        {/* Nodes Row */}
        <div style={{padding:'28px 24px', display:'flex', alignItems:'center', overflowX:'auto', gap:'0'}}>
          {NODES.map((node, i) => (
            <div key={node.id} style={{display:'flex', alignItems:'center'}}>

              {/* Node */}
              <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', flexShrink:0}}>
                <div style={{width:'56px', height:'56px', borderRadius:'14px', background:`rgba(${node.color==='#00e5ff'?'0,229,255':node.color==='#7c3aed'?'124,58,237':node.color==='#f59e0b'?'245,158,11':'16,185,129'},0.08)`, border:`2px solid ${node.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', cursor:'pointer', position:'relative', boxShadow:`0 0 12px ${node.color}22`}}>
                  {node.icon}
                  {/* Status dot */}
                  <div style={{position:'absolute', top:'-4px', right:'-4px', width:'12px', height:'12px', borderRadius:'50%', background:STATUS_COLOR[node.status], border:'2px solid #111118', boxShadow:`0 0 6px ${STATUS_COLOR[node.status]}`}}></div>
                </div>
                <div style={{fontSize:'11px', fontWeight:'600', color:'#e8e8f0', textAlign:'center', whiteSpace:'nowrap'}}>{node.label}</div>
                <div style={{fontSize:'10px', color:'#6b6b80', fontFamily:'monospace', textAlign:'center'}}>{node.sub}</div>
              </div>

              {/* Arrow */}
              {i < NODES.length - 1 && (
                <div style={{width:'48px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'32px', position:'relative'}}>
                  <div style={{height:'2px', width:'100%', background:'linear-gradient(90deg, #00e5ff, #7c3aed)'}}></div>
                  <div style={{position:'absolute', right:'-4px', fontSize:'10px', color:'#7c3aed'}}>▶</div>
                </div>
              )}

            </div>
          ))}

          {/* Add step */}
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', marginLeft:'8px', flexShrink:0}}>
            <div style={{width:'44px', height:'44px', borderRadius:'12px', border:'2px dashed #2a2a38', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', color:'#6b6b80', cursor:'pointer'}}>+</div>
            <div style={{fontSize:'10px', color:'#6b6b80'}}>Add step</div>
          </div>
        </div>
      </div>

      {/* Pipeline List */}
      <div style={{background:'#111118', border:'1px solid #2a2a38', borderRadius:'14px', overflow:'hidden'}}>
        <div style={{padding:'14px 18px', borderBottom:'1px solid #2a2a38', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div style={{fontSize:'13px', fontWeight:'700', color:'#e8e8f0'}}>📋 All Pipelines</div>
          <button style={{padding:'4px 12px', borderRadius:'8px', border:'1px solid #2a2a38', background:'transparent', color:'#6b6b80', cursor:'pointer', fontSize:'11px', fontWeight:'600'}}>+ New</button>
        </div>
        <div style={{padding:'12px'}}>
          {PIPELINES.map(p => (
            <div key={p.id} style={{display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', background:'#17171f', borderRadius:'10px', marginBottom:'6px', cursor:'pointer', border:'1px solid transparent'}}>
              <div style={{width:'8px', height:'8px', borderRadius:'50%', background:STATUS_COLOR[p.status], boxShadow:`0 0 6px ${STATUS_COLOR[p.status]}`, flexShrink:0}}></div>
              <div style={{flex:1, fontSize:'13px', fontWeight:'600', color:'#e8e8f0'}}>{p.name}</div>
              <div style={{fontSize:'11px', color:'#6b6b80', fontFamily:'monospace'}}>{p.records}</div>
              <div style={{fontSize:'11px', color:'#6b6b80', fontFamily:'monospace'}}>{p.latency}</div>
              <div style={{fontSize:'10px', padding:'2px 8px', borderRadius:'20px', fontWeight:'700', background:`${STATUS_COLOR[p.status]}22`, color:STATUS_COLOR[p.status]}}>{STATUS_LABEL[p.status]}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}