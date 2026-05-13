param(
  [string]$OutputDir = "$PSScriptRoot\dist",
  [string]$OutputName = "AtivaFIX-Print-Agent-Setup.exe"
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host "[AtivaFIX Print Agent Builder] $Message"
}

function Convert-FileToBase64([string]$Path) {
  [Convert]::ToBase64String([IO.File]::ReadAllBytes($Path))
}

if ($env:OS -notlike "*Windows*") {
  throw "Este builder e apenas para Windows."
}

$SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AgentPath = Join-Path $SourceDir "agent.cjs"
$InstallPath = Join-Path $SourceDir "install-windows.ps1"
$UninstallPath = Join-Path $SourceDir "uninstall-windows.ps1"

foreach ($file in @($AgentPath, $InstallPath, $UninstallPath)) {
  if (-not (Test-Path $file)) {
    throw "Arquivo obrigatorio nao encontrado: $file"
  }
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$OutputExe = Join-Path $OutputDir $OutputName
$BuildDir = Join-Path $env:TEMP ("ativafix-print-agent-builder-" + [guid]::NewGuid().ToString("N"))
$SourcePath = Join-Path $BuildDir "AtivaFixPrintAgentSetup.cs"

try {
  New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null

  $agentBase64 = Convert-FileToBase64 $AgentPath
  $installBase64 = Convert-FileToBase64 $InstallPath
  $uninstallBase64 = Convert-FileToBase64 $UninstallPath

  $source = @"
using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

public static class AtivaFixPrintAgentSetup
{
    private class PayloadFile
    {
        public string Name;
        public string Base64;
    }

    [STAThread]
    public static int Main()
    {
        string tempDir = Path.Combine(Path.GetTempPath(), "ativafix-print-agent-setup-" + Guid.NewGuid().ToString("N"));

        try
        {
            Directory.CreateDirectory(tempDir);

            PayloadFile[] files = new PayloadFile[]
            {
                new PayloadFile { Name = "agent.cjs", Base64 = @"$agentBase64" },
                new PayloadFile { Name = "install-windows.ps1", Base64 = @"$installBase64" },
                new PayloadFile { Name = "uninstall-windows.ps1", Base64 = @"$uninstallBase64" }
            };

            foreach (PayloadFile file in files)
            {
                File.WriteAllBytes(Path.Combine(tempDir, file.Name), Convert.FromBase64String(file.Base64));
            }

            string installScript = Path.Combine(tempDir, "install-windows.ps1");
            ProcessStartInfo startInfo = new ProcessStartInfo();
            startInfo.FileName = "powershell.exe";
            startInfo.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"" + installScript + "\"";
            startInfo.UseShellExecute = false;
            startInfo.CreateNoWindow = true;
            startInfo.WorkingDirectory = tempDir;
            startInfo.RedirectStandardOutput = true;
            startInfo.RedirectStandardError = true;

            using (Process process = Process.Start(startInfo))
            {
                string output = process.StandardOutput.ReadToEnd();
                string error = process.StandardError.ReadToEnd();
                process.WaitForExit();
                if (process.ExitCode != 0)
                {
                    string details = (output + "\n" + error).Trim();
                    if (details.Length > 1800)
                    {
                        details = details.Substring(0, 1800) + "\n...";
                    }

                    MessageBox.Show(
                        "Nao foi possivel instalar o AtivaFIX Print Agent.\n\n" + details,
                        "AtivaFIX Print Agent",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return process.ExitCode;
                }
            }

            MessageBox.Show(
                "AtivaFIX Print Agent instalado com sucesso.",
                "AtivaFIX Print Agent",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information
            );

            return 0;
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                "Erro ao instalar o AtivaFIX Print Agent:\n\n" + ex.Message,
                "AtivaFIX Print Agent",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );
            return 1;
        }
        finally
        {
            try
            {
                if (Directory.Exists(tempDir))
                {
                    Directory.Delete(tempDir, true);
                }
            }
            catch {}
        }
    }
}
"@

  Set-Content -Path $SourcePath -Encoding UTF8 -Value $source

  if (Test-Path $OutputExe) {
    try {
      Remove-Item -Force $OutputExe
    } catch {
      $baseName = [IO.Path]::GetFileNameWithoutExtension($OutputName)
      $extension = [IO.Path]::GetExtension($OutputName)
      $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
      $OutputExe = Join-Path $OutputDir "$baseName-$timestamp$extension"
      Write-Step "Arquivo anterior esta em uso. Gerando como $OutputExe..."
    }
  }

  Write-Step "Compilando instalador em $OutputExe..."
  Add-Type `
    -TypeDefinition $source `
    -Language CSharp `
    -OutputAssembly $OutputExe `
    -OutputType WindowsApplication `
    -ReferencedAssemblies @("System.Windows.Forms.dll")

  if (-not (Test-Path $OutputExe)) {
    throw "O instalador nao foi gerado."
  }

  Write-Step "Instalador gerado com sucesso."
  Write-Host $OutputExe
} finally {
  Remove-Item -Recurse -Force $BuildDir -ErrorAction SilentlyContinue
}
