const http = require('node:http');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const PORT = Number(process.env.ATIVAFIX_PRINT_AGENT_PORT || 3333);
const HOST = process.env.ATIVAFIX_PRINT_AGENT_HOST || '127.0.0.1';
const TMP_DIR = path.join(os.tmpdir(), 'ativafix-print-agent');

fs.mkdirSync(TMP_DIR, { recursive: true });

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('Payload muito grande'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function htmlToText(html) {
  return decodeEntities(String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<(br|hr)\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|tr|table|section|article|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim());
}

function runPowerShell(args) {
  return new Promise((resolve, reject) => {
    const ps = spawn('powershell.exe', ['-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', ...args], {
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    ps.stdout.on('data', (data) => { stdout += data.toString(); });
    ps.stderr.on('data', (data) => { stderr += data.toString(); });
    ps.on('error', reject);
    ps.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || stdout || `PowerShell saiu com código ${code}`));
    });
  });
}

async function withTemporaryDefaultPrinter(printerName, callback) {
  if (!printerName) return callback();

  const { stdout } = await runPowerShell([
    '-Command',
    "(Get-CimInstance Win32_Printer | Where-Object {$_.Default -eq $true} | Select-Object -First 1 -ExpandProperty Name) | ConvertTo-Json",
  ]);
  const previous = JSON.parse(stdout || 'null');

  try {
    await runPowerShell(['-Command', `([wmiclass]'Win32_Printer').SetDefaultPrinter('${String(printerName).replace(/'/g, "''")}') | Out-Null`]);
    return await callback();
  } finally {
    if (previous) {
      await runPowerShell(['-Command', `([wmiclass]'Win32_Printer').SetDefaultPrinter('${String(previous).replace(/'/g, "''")}') | Out-Null`]).catch(() => {});
    }
  }
}

async function printHtml({ html, printerName, jobName }) {
  if (process.platform !== 'win32') {
    throw new Error('Esta primeira versão do agente imprime apenas no Windows.');
  }

  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const htmlPath = path.join(TMP_DIR, `${id}.html`);
  const scriptPath = path.join(TMP_DIR, `${id}.ps1`);
  const printScript = `
<script>
window.addEventListener('load', function () {
  window.setTimeout(function () {
    window.print();
    window.setTimeout(function () { window.close(); }, 750);
  }, 750);
});
</script>`;
  const printableHtml = /<\/body>/i.test(html || '')
    ? String(html || '').replace(/<\/body>/i, `${printScript}</body>`)
    : `${html || ''}${printScript}`;

  fs.writeFileSync(htmlPath, printableHtml, 'utf8');
  fs.writeFileSync(scriptPath, `
param(
  [string]$HtmlPath,
  [string]$JobName = "AtivaFIX"
)

$Candidates = @(
  "$env:ProgramFiles\\Google\\Chrome\\Application\\chrome.exe",
  "\${env:ProgramFiles(x86)}\\Google\\Chrome\\Application\\chrome.exe",
  "$env:LocalAppData\\Google\\Chrome\\Application\\chrome.exe",
  "$env:ProgramFiles\\Microsoft\\Edge\\Application\\msedge.exe",
  "\${env:ProgramFiles(x86)}\\Microsoft\\Edge\\Application\\msedge.exe",
  "$env:LocalAppData\\Microsoft\\Edge\\Application\\msedge.exe"
)

$BrowserPath = $Candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $BrowserPath) {
  foreach ($Command in @("chrome.exe", "msedge.exe")) {
    $Found = Get-Command $Command -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($Found) {
      $BrowserPath = $Found.Source
      break
    }
  }
}

if (-not $BrowserPath) {
  throw "Chrome ou Microsoft Edge não encontrado para renderizar o cupom HTML."
}

$ProfileDir = Join-Path $env:TEMP ("ativafix-print-agent-browser-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $ProfileDir | Out-Null

try {
  $FileUrl = (New-Object System.Uri((Resolve-Path $HtmlPath).Path)).AbsoluteUri
  $BrowserArgs = @(
    "--kiosk-printing",
    "--no-first-run",
    "--disable-extensions",
    "--disable-popup-blocking",
    "--disable-background-networking",
    "--user-data-dir=$ProfileDir",
    $FileUrl
  )

  $Process = Start-Process -FilePath $BrowserPath -ArgumentList $BrowserArgs -PassThru
  if (-not $Process.WaitForExit(15000)) {
    try { $Process.CloseMainWindow() | Out-Null } catch {}
    Start-Sleep -Seconds 1
    if (-not $Process.HasExited) {
      $Process.Kill()
    }
  }
} finally {
  Remove-Item -Recurse -Force $ProfileDir -ErrorAction SilentlyContinue
}
`, 'utf8');

  try {
    await withTemporaryDefaultPrinter(printerName, async () => {
      await runPowerShell(['-File', scriptPath, '-HtmlPath', htmlPath, '-JobName', jobName || 'AtivaFIX']);
    });
  } finally {
    fs.rmSync(htmlPath, { force: true });
    fs.rmSync(scriptPath, { force: true });
  }
}

async function printText({ text, printerName, jobName, fontSize = 9 }) {
  if (process.platform !== 'win32') {
    throw new Error('Esta primeira versão do agente imprime apenas no Windows.');
  }

  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const textPath = path.join(TMP_DIR, `${id}.txt`);
  const scriptPath = path.join(TMP_DIR, `${id}.ps1`);

  fs.writeFileSync(textPath, text || '', 'utf8');
  fs.writeFileSync(scriptPath, `
param(
  [string]$TextPath,
  [string]$PrinterName = "",
  [string]$JobName = "AtivaFIX",
  [int]$FontSize = 9
)

Add-Type -AssemblyName System.Drawing

$script:Lines = (Get-Content -Raw -Encoding UTF8 $TextPath) -split "\`r?\`n"
$script:LineIndex = 0

$Font = New-Object System.Drawing.Font("Consolas", $FontSize)
$Brush = [System.Drawing.Brushes]::Black
$Doc = New-Object System.Drawing.Printing.PrintDocument
$Doc.DocumentName = $JobName
$Doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(5, 5, 5, 5)

if ($PrinterName -and $PrinterName.Trim().Length -gt 0) {
  $Doc.PrinterSettings.PrinterName = $PrinterName
}

if (-not $Doc.PrinterSettings.IsValid) {
  throw "Impressora inválida ou não encontrada: $PrinterName"
}

$Doc.add_PrintPage({
  param($sender, $e)
  $Y = $e.MarginBounds.Top
  $X = $e.MarginBounds.Left
  $LineHeight = $Font.GetHeight($e.Graphics)

  while ($script:LineIndex -lt $script:Lines.Length) {
    if (($Y + $LineHeight) -gt $e.MarginBounds.Bottom) {
      $e.HasMorePages = $true
      return
    }
    $e.Graphics.DrawString($script:Lines[$script:LineIndex], $Font, $Brush, $X, $Y)
    $Y += $LineHeight
    $script:LineIndex++
  }

  $e.HasMorePages = $false
})

$Doc.Print()
`, 'utf8');

  try {
    await runPowerShell([
      '-File', scriptPath,
      '-TextPath', textPath,
      '-PrinterName', printerName || '',
      '-JobName', jobName || 'AtivaFIX',
      '-FontSize', String(fontSize || 9),
    ]);
  } finally {
    fs.rmSync(textPath, { force: true });
    fs.rmSync(scriptPath, { force: true });
  }
}

async function listPrinters() {
  if (process.platform !== 'win32') return [];
  const { stdout } = await runPowerShell([
    '-Command',
    'Get-Printer | Select-Object -ExpandProperty Name | ConvertTo-Json',
  ]);
  const parsed = JSON.parse(stdout || '[]');
  return Array.isArray(parsed) ? parsed : [parsed].filter(Boolean);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {});
  }

  try {
    if (req.method === 'GET' && req.url === '/health') {
      return sendJson(res, 200, {
        ok: true,
        name: 'AtivaFIX Print Agent',
        version: '0.1.0',
        platform: process.platform,
      });
    }

    if (req.method === 'GET' && req.url === '/printers') {
      return sendJson(res, 200, { ok: true, printers: await listPrinters() });
    }

    if (req.method === 'POST' && req.url === '/test') {
      const body = JSON.parse(await readBody(req) || '{}');
      await printText({
        text: [
          'ATIVAFIX PRINT AGENT',
          'Teste de impressao local',
          new Date().toLocaleString('pt-BR'),
          '',
          'Se voce esta lendo isto, o agente esta funcionando.',
        ].join('\n'),
        printerName: body.printerName || '',
        jobName: 'AtivaFIX - Teste',
      });
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && req.url === '/print') {
      const body = JSON.parse(await readBody(req) || '{}');
      const copies = Math.max(1, Math.min(Number(body.copies || 1), 5));
      const html = String(body.html || '');
      const text = String(body.text || '');
      if (!html.trim() && !text.trim()) throw new Error('Nada para imprimir.');

      for (let i = 0; i < copies; i++) {
        if (html.trim()) {
          await printHtml({
            html,
            printerName: body.printerName || '',
            jobName: body.jobName || 'AtivaFIX',
          });
        } else {
          await printText({
            text,
            printerName: body.printerName || '',
            jobName: body.jobName || 'AtivaFIX',
            fontSize: Number(body.fontSize || 9),
          });
        }
      }

      return sendJson(res, 200, { ok: true, copies });
    }

    return sendJson(res, 404, { ok: false, error: 'Rota não encontrada' });
  } catch (error) {
    console.error('[AtivaFIX Print Agent]', error);
    return sendJson(res, 500, { ok: false, error: error.message || String(error) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`AtivaFIX Print Agent rodando em http://${HOST}:${PORT}`);
  console.log('Rotas: GET /health, GET /printers, POST /test, POST /print');
});
