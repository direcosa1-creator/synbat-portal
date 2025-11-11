import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { useRouter } from 'next/router'

export default function Home(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [msg, setMsg] = useState('')
  const router = useRouter()
  const submit = async (e:any) => {
    e.preventDefault(); setMsg('')
    try{
      if(mode==='login'){
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if(error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if(error) throw error
      }
      router.push('/dashboard')
    }catch(err:any){ setMsg(err.message||'Errore') }
  }
  return <Layout>
    <form onSubmit={submit}>
      <h2>{mode==='login'?'Login':'Registrazione'}</h2>
      <div style={{display:'grid',gap:8}}>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      </div>
      <div style={{marginTop:12,display:'flex',gap:8}}>
        <button type="submit">{mode==='login'?'Entra':'Crea account'}</button>
        <button type="button" onClick={()=>setMode(mode==='login'?'signup':'login')}>
          {mode==='login'?'Oppure crea account':'Torna al login'}
        </button>
      </div>
      {msg && <p style={{color:'#b00'}}>{msg}</p>}
    </form>
  </Layout>
}
