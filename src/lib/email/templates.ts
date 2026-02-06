/**
 * Génère le HTML de base pour un email
 */
export function generateEmailHtml(body: string, advisorName?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      border-bottom: 2px solid #0ea5e9;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #0ea5e9;
    }
    .content {
      white-space: pre-wrap;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Nomadays</div>
  </div>
  <div class="content">
${body}
  </div>
  <div class="footer">
    <p>${advisorName ? `${advisorName} - ` : ''}Votre conseiller voyage Nomadays</p>
    <p>Cet email a été envoyé par Nomadays. Pour répondre, utilisez simplement la fonction répondre de votre messagerie.</p>
  </div>
</body>
</html>
`
}
