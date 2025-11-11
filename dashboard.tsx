import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

export default function Dashboard(){
  const [email,setEmail] = useState('')
  const [orgId,setOrg] = useState<string>('')
  const [aziende,setAziende]=useState<any[]>([])
  const [collab,setCollab]=useState<any[]>([])

  useEffect(()=>{(async()=>{
    const { data: { user } } = await supabase.auth.getUser()
    if(!user){ window.location.href='/'; return }
    setEmail(user.email||'')
    const { data: mem } = await supabase.from('org_members').select('org_id').eq('user_id', user.id)
    setOrg(mem?.[0]?.org_id || (process.env.NEXT_PUBLIC_DEFAULT_ORG_ID as string))
  })()},[])

  useEffect(()=>{(async()=>{
    if(!orgId) return
    const { data: az } = await supabase.from('aziende').select('*').eq('org_id', orgId).limit(50)
    setAziende((az||[]) as any)
    const { data: co } = await supabase.from('collaboratori').select('id,nome,cognome').eq('org_id', orgId).limit(50)
    setCollab((co||[]) as any)
  })()},[orgId])

  const logout = async()=>{ await supabase.auth.signOut(); window.location.href='/' }

  return <Layout>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <div>
        <h2>Dashboard</h2>
        <div style={{color:'#555',fontSize:14}}>Utente: {email} • Org: {orgId||'(default)'}</div>
      </div>
      <div style={{display:'flex',gap:8}}>
        <a href="/upload" style={{textDecoration:'none'}}><button>Upload Documenti</button></a>
        <a href="/privacy" style={{textDecoration:'none'}}><button>Privacy</button></a>
        <a href="/terms" style={{textDecoration:'none'}}><button>Termini</button></a>
        <button onClick={logout}>Logout</button>
      </div>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:12}}>
      <div style={{border:'1px solid #eee',borderRadius:12,padding:12}}>
        <h3>Aziende</h3>
        <ul>{aziende.map(a=><li key={a.id}>{a.ragione || a.ragione_sociale || a.id}</li>)}</ul>
      </div>
      <div style={{border:'1px solid #eee',borderRadius:12,padding:12}}>
        <h3>Collaboratori</h3>
        <ul>{collab.map(c=><li key={c.id}>{c.cognome} {c.nome}</li>)}</ul>
      </div>
    </div>
  </Layout>
}
