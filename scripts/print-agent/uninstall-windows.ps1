param(
  [string]$InstallDir = "$env:LOCALAPPDATA\AtivaFIX\PrintAgent",
  [string]$TaskName = "AtivaFIX Print Agent",
  [switch]$KeepFiles
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host "[AtivaFIX Print Agent] $Message"
}

$StartupShortcutPath = Join-Path ([Environment]::GetFolderPath("Startup")) "AtivaFIX Print Agent.lnk"

try {
  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($task) {
    Write-Step "Parando tarefa agendada..."
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Write-Step "Removendo tarefa agendada..."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  }
} catch {}

if (Test-Path $StartupShortcutPath) {
  Write-Step "Removendo atalho da inicializacao..."
  Remove-Item -Force $StartupShortcutPath -ErrorAction SilentlyContinue
}

$processes = Get-CimInstance Win32_Process |
  Where-Object {
    $_.CommandLine -and
    $_.CommandLine -match "agent\.cjs" -and
    ($_.CommandLine -match [regex]::Escape($InstallDir) -or $_.CommandLine -match "scripts\\print-agent\\agent\.cjs")
  }

foreach ($process in $processes) {
  try {
    Write-Step "Parando processo do agente (PID $($process.ProcessId))..."
    Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
  } catch {}
}

if (-not $KeepFiles -and (Test-Path $InstallDir)) {
  Write-Step "Removendo arquivos em $InstallDir..."
  Remove-Item -Recurse -Force $InstallDir
}

Write-Step "Desinstalacao concluida."
