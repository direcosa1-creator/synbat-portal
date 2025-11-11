import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

export default function Upload(){
  const [org,setOrg]=useState<string>('')
  const [ownerType,setOT]=useState('COLLAB')
  const [ownerId,setOID]=useState('')
  const [tipo,setTipo]=useState('Generico')
  const [label,setLabel]=useState('')
  const [file,setFile]=useState<File|null>(null)
  const [msg,setMsg]=useState('')

  useEffect(()=>{(async()=>{
    const { data: { user } } = await supabase.auth.getUser()
    if(!user){ window.location.href='/'; return }
    const { data: mem } = await supabase.from('org_members').select('org_id').eq('user_id', user.id)
    setOrg(mem?.[0]?.org_id || (process.env.NEXT_PUBLIC_DEFAULT_ORG_ID as string))
  })()},[])

  const upload = async()=>{
    setMsg('')
    try{
      if(!file) throw new Error('Seleziona un file')
      if(!org) throw new Error('Org mancante')
      const path = `org/${org}/${ownerType}/${ownerId||'unknown'}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('docs').upload(path, file, { upsert: false })
      if(error) throw error
      const { error: dberr } = await supabase.from('documenti').insert({
        org_id: org, owner_type: ownerType, owner_id: ownerId || null,
        tipo: tipo, label: label || file.name, storage_path: path, mime: file.type
      } as any)
      if(dberr) throw dberr
      setMsg('Caricato!')
      setFile(null); (document.getElementById('f') as HTMLInputElement).value=''
    }catch(e:any){ setMsg(e.message||'Errore') }
  }

  return <Layout>
    <h2>Upload Documenti</h2>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
      <div>
        <label>OwnerType</label>
        <select value={ownerType} onChange={e=>setOT(e.target.value)}>
          <option value="COLLAB">COLLAB</option>
          <option value="AZIENDA">AZIENDA</option>
          <option value="CONTR">CONTR</option>
        </select>
      </div>
      <div>
        <label>OwnerId</label>
        <input value={ownerId} onChange={e=>setOID(e.target.value)} placeholder="id (facoltativo)"/>
      </div>
      <div>
        <label>Tipo</label>
        <input value={tipo} onChange={e=>setTipo(e.target.value)} placeholder="es. CI fronte, URSSAF, Contratto"/>
      </div>
      <div>
        <label>Etichetta</label>
        <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="nome documento"/>
      </div>
      <div>
        <label>File (PDF/JPG/PNG)</label>
        <input id="f" type="file" accept="image/*,application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/>
      </div>
      <div style={{display:'flex',alignItems:'end'}}>
        <button onClick={upload}>Carica</button>
      </div>
    </div>
    {msg && <p style={{color: msg==='Caricato!'?'#0a7c0a':'#b00'}}>{msg}</p>}
  </Layout>
}
