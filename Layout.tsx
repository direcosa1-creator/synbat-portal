import React from 'react'
export default function Layout({ children }: { children: React.ReactNode }){
  return <div style={{maxWidth:980,margin:'30px auto',padding:16,fontFamily:'system-ui,Segoe UI,Roboto,Arial'}}>
    <h1>SynBat v8.1</h1>
    <div style={{background:'#fff',border:'1px solid #eee',borderRadius:12,padding:16}}>{children}</div>
  </div>
}
