const STATS = [
  { label:'Revenue MTD',    value:'$2.4M',  change:'+23%', color:'#00e5ff' },
  { label:'Orders MTD',     value:'18,291', change:'+11%', color:'#7c3aed' },
  { label:'Avg Order Value',value:'$131',   change:'+8%',  color:'#f59e0b' },
  { label:'Churn Rate',     value:'2.1%',   change:'-0.3%',color:'#10b981' },
]

const DONUT = [
  { label:'Postgres', pct:42, color:'#00e5ff' },
  { label:'Stripe',   pct:28, color:'#7c3aed' },
  { label:'Kafka',    pct:18, color:'#f59e0b' },
  { label:'S3',       pct:12, color:'#10b981' },
]

const POINTS = [120,100,90,85,75,80,60,55,65,45,40,35,30,28]
const W = 560
const H = 120
const maxP = Math.max(...POINTS)

function toX(i) { return (i / (POINTS.length-1)) * W }
function toY(v) { return H - (v / maxP) * (H - 10) + 5 }

const linePoints = POINTS.map((v,i) => `${toX(i)},${toY(v)}`).join(' ')
const areaPoints = `0,${H} ${linePoints} ${W},${H}`

export default function Visualize() {
  return (
    <div style={{padding:'24px', display:'flex', flexDirection:'column', gap:'16px'}}>

      {/* KPI Cards */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px'}}>
        {STATS.map(s => (
          <div key={s.label} style={{background:'#111118', border:'1px solid #2a2a38', borderRadius:'12px', padding:'16px 20px', position:'relative', overflow:'hidden'}}>
            <div style={{position:'absolute', top:0, left:0, right:0, height:'2px', background:s.color}}></div>
            <div style={{fontSize:'11px', fontWeight:'700', color:'#6b6b80', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px'}}>{s.label}</div>
            <div style={{fontSize:'28px', fontWeight:'800', color:s.color, fontFamily:'monospace'}}>{s.value}</div>
            <div style={{fontSize:'11px', color:'#10b981', marginTop:'4px'}}>{s.change} vs last month</div>
          </div>
        ))}
      </div>

      {/* Chart Row */}
      <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:'16px'}}>

        {/* Line Chart */}
        <div style={{background:'#111118', border:'1px solid #2a2a38', borderRadius:'14px', overflow:'hidden'}}>
          <div style={{padding:'14px 18px', borderBottom:'1px solid #2a2a38', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <div style={{fontSize:'13px', fontWeight:'700', color:'#e8e8f0'}}>📈 Revenue — Last 30 Days</div>
            <div style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', color:'#10b981', fontWeight:'700'}}>
              <div style={{width:'7px', height:'7px', borderRadius:'50%', background:'#10b981', boxShadow:'0 0 6px #10b981'}}></div>
              LIVE
            </div>
          </div>
          <div style={{padding:'20px'}}>
            <svg width="100%" viewBox={`0 0 ${W} ${H+20}`} preserveAspectRatio="none" style={{height:'140px'}}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#00e5ff" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <polygon points={areaPoints} fill="url(#areaGrad)"/>
              <polyline points={linePoints} fill="none" stroke="#00e5ff" strokeWidth="2.5" strokeLinejoin="round"/>
              {POINTS.map((v,i) => (
                <circle key={i} cx={toX(i)} cy={toY(v)} r="3" fill="#00e5ff" opacity={i===POINTS.length-1?1:0.4}/>
              ))}
            </svg>
            <div style={{display:'flex', gap:'16px', marginTop:'8px'}}>
              <div style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', color:'#6b6b80'}}>
                <div style={{width:'8px', height:'8px', borderRadius:'50%', background:'#00e5ff'}}></div>
                Revenue ($)
              </div>
            </div>
          </div>
        </div>

        {/* Donut */}
        <div style={{background:'#111118', border:'1px solid #2a2a38', borderRadius:'14px', overflow:'hidden'}}>
          <div style={{padding:'14px 18px', borderBottom:'1px solid #2a2a38', fontSize:'13px', fontWeight:'700', color:'#e8e8f0'}}>🍩 Source Breakdown</div>
          <div style={{padding:'20px', display:'flex', flexDirection:'column', alignItems:'center', gap:'16px'}}>
            {/* SVG Donut */}
            <svg width="100" height="100" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#17171f" strokeWidth="8"/>
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#00e5ff" strokeWidth="8" strokeDasharray="42 58" strokeDashoffset="25"/>
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#7c3aed" strokeWidth="8" strokeDasharray="28 72" strokeDashoffset="-17"/>
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f59e0b" strokeWidth="8" strokeDasharray="18 82" strokeDashoffset="-45"/>
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#10b981" strokeWidth="8" strokeDasharray="12 88" strokeDashoffset="-63"/>
            </svg>
            {/* Legend */}
            <div style={{width:'100%', display:'flex', flexDirection:'column', gap:'8px'}}>
              {DONUT.map(d => (
                <div key={d.label} style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  <div style={{width:'8px', height:'8px', borderRadius:'50%', background:d.color, flexShrink:0}}></div>
                  <span style={{flex:1, fontSize:'11px', color:'#e8e8f0'}}>{d.label}</span>
                  <div style={{height:'4px', width:`${d.pct}%`, maxWidth:'60px', borderRadius:'2px', background:d.color}}></div>
                  <span style={{fontSize:'11px', color:'#6b6b80', fontFamily:'monospace', minWidth:'32px', textAlign:'right'}}>{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Stats */}
      <div style={{background:'#111118', border:'1px solid #2a2a38', borderRadius:'12px', padding:'16px 20px', display:'flex', alignItems:'center', gap:'24px'}}>
        <div style={{fontSize:'12px', fontWeight:'700', color:'#6b6b80', textTransform:'uppercase', letterSpacing:'1px'}}>Data freshness</div>
        {[
          { source:'Postgres', ago:'2 min ago',  color:'#10b981' },
          { source:'Stripe',   ago:'1 min ago',  color:'#10b981' },
          { source:'Kafka',    ago:'30 sec ago',  color:'#10b981' },
          { source:'S3',       ago:'15 min ago', color:'#f59e0b' },
        ].map(d => (
          <div key={d.source} style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'12px'}}>
            <div style={{width:'7px', height:'7px', borderRadius:'50%', background:d.color, boxShadow:`0 0 5px ${d.color}`}}></div>
            <span style={{color:'#e8e8f0', fontWeight:'600'}}>{d.source}</span>
            <span style={{color:'#6b6b80'}}>{d.ago}</span>
          </div>
        ))}
      </div>

    </div>
  )
}