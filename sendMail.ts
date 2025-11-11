import type { NextApiRequest, NextApiResponse } from 'next'
import nodemailer from 'nodemailer'
export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'})
  const { to, subject, text, html } = req.body || {}
  if(!to || !subject || (!text && !html)) return res.status(400).json({error:'Missing fields'})
  try{
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT||587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })
    await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text, html })
    res.status(200).json({ ok: true })
  }catch(e:any){ res.status(500).json({ error: e.message || 'sendMail error' }) }
}
