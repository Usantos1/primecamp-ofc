param(
  [string]$InstallDir = "$env:LOCALAPPDATA\AtivaFIX\PrintAgent",
  [string]$TaskName = "AtivaFIX Print Agent",
  [int]$Port = 3333,
  [switch]$NoStart
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host "[AtivaFIX Print Agent] $Message"
}

function Stop-AgentProcesses([string]$AgentPath) {
  $processes = Get-CimInstance Win32_Process |
    Where-Object {
      $_.CommandLine -and
      $_.CommandLine -match "agent\.cjs" -and
      ($_.CommandLine -match [regex]::Escape($AgentPath) -or $_.CommandLine -match "scripts\\print-agent\\agent\.cjs")
    }

  foreach ($process in $processes) {
    try {
      Write-Step "Parando processo antigo do agente (PID $($process.ProcessId))..."
      Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    } catch {}
  }
}

function Install-PortableNode([string]$InstallDir) {
  $nodeDir = Join-Path $InstallDir "node"
  $nodePath = Join-Path $nodeDir "node.exe"

  if (Test-Path $nodePath) {
    return $nodePath
  }

  $nodeCommand = Get-Command "node.exe" -ErrorAction SilentlyContinue
  if ($nodeCommand) {
    return $nodeCommand.Source
  }

  Write-Step "Node.js nao encontrado. Baixando Node.js LTS portatil..."

  try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  } catch {}

  $arch = if ([Environment]::Is64BitOperatingSystem) { "win-x64" } else { "win-x86" }
  $nodeFile = "$arch-zip"
  $index = Invoke-RestMethod "https://nodejs.org/dist/index.json"
  $release = $index |
    Where-Object { $_.lts -and $_.files -contains $nodeFile } |
    Select-Object -First 1

  if (-not $release) {
    throw "Nao foi possivel encontrar uma versao LTS do Node.js para $nodeFile."
  }

  $version = $release.version
  $zipName = "node-$version-$arch.zip"
  $zipUrl = "https://nodejs.org/dist/$version/$zipName"
  $zipPath = Join-Path $env:TEMP $zipName
  $extractDir = Join-Path $env:TEMP ("ativafix-node-" + [guid]::NewGuid().ToString("N"))

  try {
    Write-Step "Baixando $zipName..."
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing

    Write-Step "Extraindo Node.js portatil..."
    Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

    $extractedNodeDir = Join-Path $extractDir "node-$version-$arch"
    if (-not (Test-Path (Join-Path $extractedNodeDir "node.exe"))) {
      throw "Arquivo node.exe nao encontrado no pacote baixado."
    }

    if (Test-Path $nodeDir) {
      Remove-Item -Recurse -Force $nodeDir
    }

    Move-Item -Force $extractedNodeDir $nodeDir
    return $nodePath
  } catch {
    throw "Nao foi possivel baixar o Node.js portatil. Verifique a internet deste computador e tente novamente. Detalhe: $($_.Exception.Message)"
  } finally {
    Remove-Item -Force $zipPath -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force $extractDir -ErrorAction SilentlyContinue
  }
}

function New-StartupShortcut([string]$ShortcutPath, [string]$RunnerPath) {
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($ShortcutPath)
  $shortcut.TargetPath = "powershell.exe"
  $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$RunnerPath`""
  $shortcut.WorkingDirectory = Split-Path -Parent $RunnerPath
  $shortcut.WindowStyle = 7
  $shortcut.Description = "AtivaFIX Print Agent"
  $shortcut.Save()
}

if ($env:OS -notlike "*Windows*") {
  throw "Este instalador e apenas para Windows."
}

$SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AgentSource = Join-Path $SourceDir "agent.cjs"

if (-not (Test-Path $AgentSource)) {
  throw "agent.cjs nao encontrado em: $AgentSource"
}

$BrowserFound = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LocalAppData\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:LocalAppData\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if (-not $BrowserFound) {
  Write-Warning "Chrome ou Microsoft Edge nao encontrado. O agente instala, mas a impressao HTML silenciosa precisa de um deles."
}

Write-Step "Instalando em $InstallDir..."
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

$AgentPath = Join-Path $InstallDir "agent.cjs"
$RunnerPath = Join-Path $InstallDir "start-agent.ps1"
$NodePathFile = Join-Path $InstallDir "node-path.txt"
$LogPath = Join-Path $InstallDir "agent.log"
$StartupShortcutPath = Join-Path ([Environment]::GetFolderPath("Startup")) "AtivaFIX Print Agent.lnk"

Copy-Item -Force $AgentSource $AgentPath
$NodePath = Install-PortableNode $InstallDir
Set-Content -Path $NodePathFile -Value $NodePath -Encoding UTF8

Set-Content -Path $RunnerPath -Encoding UTF8 -Value @'
$ErrorActionPreference = "Stop"

$InstallDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AgentPath = Join-Path $InstallDir "agent.cjs"
$NodePathFile = Join-Path $InstallDir "node-path.txt"
$LogPath = Join-Path $InstallDir "agent.log"
$NodePath = (Get-Content -Raw -Path $NodePathFile).Trim()

if (-not (Test-Path $NodePath)) {
  $NodeCommand = Get-Command "node.exe" -ErrorAction SilentlyContinue
  if (-not $NodeCommand) {
    throw "Node.js nao encontrado."
  }
  $NodePath = $NodeCommand.Source
}

if (-not $env:ATIVAFIX_PRINT_AGENT_PORT) {
  $env:ATIVAFIX_PRINT_AGENT_PORT = "3333"
}

if (-not $env:ATIVAFIX_PRINT_AGENT_HOST) {
  $env:ATIVAFIX_PRINT_AGENT_HOST = "127.0.0.1"
}

Set-Location $InstallDir
& $NodePath $AgentPath *> $LogPath
'@

try {
  $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($existingTask) {
    Write-Step "Atualizando tarefa agendada existente..."
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  }
} catch {}

Stop-AgentProcesses $AgentPath
Remove-Item -Force $StartupShortcutPath -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$RunnerPath`""

$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Days 365)

$scheduledTaskCreated = $false
try {
  Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Description "Agente local do AtivaFIX para impressao silenciosa." | Out-Null
  $scheduledTaskCreated = $true
} catch {
  Write-Step "Nao foi possivel criar tarefa agendada sem permissao elevada. Criando atalho na inicializacao do Windows..."
  New-StartupShortcut $StartupShortcutPath $RunnerPath
}

if (-not $NoStart) {
  Write-Step "Iniciando agente..."
  if ($scheduledTaskCreated) {
    Start-ScheduledTask -TaskName $TaskName
  } else {
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$RunnerPath`"" -WindowStyle Hidden
  }
  Start-Sleep -Seconds 2
}

Write-Step "Instalacao concluida."
Write-Host ""
Write-Host "URL do agente: http://127.0.0.1:$Port"
Write-Host "Log: $LogPath"
if ($scheduledTaskCreated) {
  Write-Host "Tarefa agendada: $TaskName"
} else {
  Write-Host "Inicializacao: $StartupShortcutPath"
}
Write-Host ""
Write-Host "Para testar:"
Write-Host "  Invoke-RestMethod http://127.0.0.1:$Port/health"
