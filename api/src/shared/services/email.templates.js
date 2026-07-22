export function wrapBroadcastEmail({ firstName, bodyHtml }) {
  const name = firstName || 'there'
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0c0b0a;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;color:#f5f0e8;">
    <p style="color:#c9a962;letter-spacing:0.3em;font-size:14px;margin:0 0 24px;">MAREA</p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hello ${name},</p>
    <div style="font-size:15px;line-height:1.7;color:#f5f0e8;">${bodyHtml}</div>
    <p style="font-size:12px;color:#8a8278;margin-top:40px;border-top:1px solid rgba(201,169,98,0.2);padding-top:16px;">
      Marea Jewelry — handcrafted pieces for moments you keep forever.
    </p>
  </div>
</body>
</html>`
}

export function plainTextToHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

export function personalize(template, firstName) {
  const name = firstName || 'there'
  return template.replace(/\{\{name\}\}/gi, name)
}

export function wrapVerificationEmail({ firstName, code }) {
  const name = firstName || 'there'
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0c0b0a;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;color:#f5f0e8;">
    <p style="color:#c9a962;letter-spacing:0.3em;font-size:14px;margin:0 0 24px;">MAREA</p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hello ${name},</p>
    <p style="font-size:15px;line-height:1.7;color:#f5f0e8;">Use this code to verify your email and activate your account:</p>
    <p style="font-size:32px;letter-spacing:0.4em;font-weight:600;color:#c9a962;margin:32px 0;text-align:center;">${code}</p>
    <p style="font-size:13px;color:#8a8278;line-height:1.6;">This code expires in 15 minutes. If you did not create a Marea account, you can ignore this email.</p>
    <p style="font-size:12px;color:#8a8278;margin-top:40px;border-top:1px solid rgba(201,169,98,0.2);padding-top:16px;">
      Marea Jewelry
    </p>
  </div>
</body>
</html>`
}

export function wrapPasswordResetEmail({ firstName, code }) {
  const name = firstName || 'there'
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0c0b0a;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;color:#f5f0e8;">
    <p style="color:#c9a962;letter-spacing:0.3em;font-size:14px;margin:0 0 24px;">MAREA</p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hello ${name},</p>
    <p style="font-size:15px;line-height:1.7;color:#f5f0e8;">Use this code to reset your password:</p>
    <p style="font-size:32px;letter-spacing:0.4em;font-weight:600;color:#c9a962;margin:32px 0;text-align:center;">${code}</p>
    <p style="font-size:13px;color:#8a8278;line-height:1.6;">This code expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
    <p style="font-size:12px;color:#8a8278;margin-top:40px;border-top:1px solid rgba(201,169,98,0.2);padding-top:16px;">
      Marea Jewelry
    </p>
  </div>
</body>
</html>`
}
