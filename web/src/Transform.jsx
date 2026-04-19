const MODELS = [
  { name:'stg_orders',    time:'~42s',    status:'ok' },
  { name:'stg_users',     time:'~18s',    status:'ok' },
  { name:'fact_orders',   time:'~1m 12s', status:'ok' },
  { name:'dim_customers', time:'~33s',    status:'ok' },
]

const SCHEMA = [
  { col:'order_id',   type:'VARCHAR',   typeColor:'#00e5ff' },
  { col:'user_id',    type:'VARCHAR',   typeColor:'#00e5ff' },
  { col:'amount_usd', type:'FLOAT',     typeColor:'#10b981' },
  { col:'ordered_at', type:'TIMESTAMP', typeColor:'#f59e0b' },
]

const CODE = [
  { line:1,  code:'-- Staging model for orders',                        type:'comment' },
  { line:2,  code:'WITH source AS (',                                   type:'keyword' },
  { line:3,  code:"  SELECT * FROM {{ source('postgres', 'orders') }}", type:'function' },
  { line:4,  code:'),',                                                  type:'normal' },
  { line:5,  code:'renamed AS (',                                        type:'keyword' },
  { line:6,  code:'  SELECT',                                            type:'keyword' },
  { line:7,  code:'    id AS order_id,',                                 type:'normal' },
  { line:8,  code:'    user_id,',                                        type:'normal' },
  { line:9,  code:'    total_amount / 100.0 AS amount_usd,',             type:'normal' },
  { line:10, code:'    CAST(created_at AS TIMESTAMP) AS ordered_at',     type:'normal' },
  { line:11, code:'  FROM source',                                       type:'keyword' },
  { line:12, code:')',                                                    type:'normal' },
  { line:13, code:'SELECT * FROM renamed',                               type:'keyword' },
]

const CODE_COLOR = {
  comment:  '#4b5563',
  keyword:  '#c084fc',
  function: '#60a5fa',
  normal:   '#a5b4fc',
}

export default function Transform() {
  return (
    <div style={{padding:'24px', display:'flex', flexDirection:'column', gap:'16px'}}>

      {/* Top row */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 340px', gap:'16px'}}>

        {/* Code Editor */}
        <div style={{background:'#111118', border:'1px solid #2a2a38', borderRadius:'14px', overflow:'hidden'}}>
          <div style={{padding:'14px 18px', borderBottom:'1px solid #2a2a38', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <div style={{fontSize:'13px', fontWeight:'700', color:'#e8e8f0'}}>
              ⚙️ Active Transform: <span style={{color:'#00e5ff'}}>stg_orders</span>
            </div>
            <button style={{padding:'5px 14px', borderRadius:'8px', border:'none', background:'#7c3aed', color:'#fff', cursor:'pointer', fontSize:'12px', fontWeight:'600', boxShadow:'0 0 12px rgba(124,58,237,0.4)'}}>▶ Run Now</button>
          </div>

          {/* Code */}
          <div style={{background:'#0a0a0f', margin:'16px', borderRadius:'8px', padding:'14px', fontFamily:'monospace', fontSize:'12px', lineHeight:'1.8', border:'1px solid #2a2a38'}}>
            {CODE.map(row => (
              <div key={row.line} style={{display:'flex', gap:'16px'}}>
                <span style={{color:'#2a2a38', minWidth:'20px', textAlign:'right', userSelect:'none'}}>{row.line}</span>
                <span style={{color:CODE_COLOR[row.type]}}>{row.code}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{display:'flex', gap:'8px', padding:'0 16px 16px'}}>
            {['+ Add Column', '🔧 Add Filter', '🔗 Add Join'].map(btn => (
              <button key={btn} style={{flex:1, padding:'8px', borderRadius:'8px', border:'1px solid #2a2a38', background:'transparent', color:'#6b6b80', cursor:'pointer', fontSize:'12px', fontWeight:'600'}}>
                {btn}
              </button>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>

          {/* dbt Models */}
          <div style={{background:'#111118', border:'1px solid #2a2a38', borderRadius:'14px', overflow:'hidden'}}>
            <div style={{padding:'14px 18px', borderBottom:'1px solid #2a2a38', fontSize:'13px', fontWeight:'700', color:'#e8e8f0'}}>dbt Models</div>
            <div style={{padding:'12px', display:'flex', flexDirection:'column', gap:'6px'}}>
              {MODELS.map(m => (
                <div key={m.name} style={{display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', background:'#17171f', borderRadius:'8px', cursor:'pointer'}}>
                  <div style={{width:'8px', height:'8px', borderRadius:'50%', background:'#10b981', boxShadow:'0 0 6px #10b981', flexShrink:0}}></div>
                  <div style={{flex:1, fontSize:'12px', fontWeight:'600', color:'#e8e8f0'}}>{m.name}</div>
                  <div style={{fontSize:'11px', color:'#6b6b80', fontFamily:'monospace'}}>{m.time}</div>
                  <div style={{fontSize:'10px', padding:'2px 8px', borderRadius:'20px', background:'rgba(16,185,129,0.15)', color:'#10b981', fontWeight:'700'}}>✓ OK</div>
                </div>
              ))}
            </div>
          </div>

          {/* Schema Preview */}
          <div style={{background:'#111118', border:'1px solid #2a2a38', borderRadius:'14px', overflow:'hidden'}}>
            <div style={{padding:'14px 18px', borderBottom:'1px solid #2a2a38', fontSize:'13px', fontWeight:'700', color:'#e8e8f0'}}>Schema Output</div>
            <div style={{padding:'12px', fontFamily:'monospace', fontSize:'11px'}}>
              <div style={{display:'flex', gap:'16px', color:'#6b6b80', borderBottom:'1px solid #2a2a38', paddingBottom:'6px', marginBottom:'8px'}}>
                <span style={{flex:1}}>column</span>
                <span>type</span>
              </div>
              {SCHEMA.map(s => (
                <div key={s.col} style={{display:'flex', gap:'16px', marginBottom:'6px'}}>
                  <span style={{flex:1, color:'#00e5ff'}}>{s.col}</span>
                  <span style={{color:s.typeColor}}>{s.type}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}