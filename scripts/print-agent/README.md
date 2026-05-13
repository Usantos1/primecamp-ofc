# AtivaFIX Print Agent

Agente local para impressao silenciosa no Windows.

## Instalar no Windows

Para cliente final, gere o instalador `.exe`:

```powershell
npm run print-agent:build-installer
```

O arquivo sera gerado em:

```text
scripts\print-agent\dist\AtivaFIX-Print-Agent-Setup.exe
```

Esse `.exe` e o arquivo que o cliente pode baixar e executar.

Para publicar no app e permitir download pela tela de configuracao de impressao:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\print-agent\build-windows-installer.ps1 -OutputDir "public/downloads" -OutputName "AtivaFIX-Print-Agent-Setup.exe"
```

URL no app:

```text
/downloads/AtivaFIX-Print-Agent-Setup.exe
```

Para instalar manualmente sem gerar `.exe`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\print-agent\install-windows.ps1
```

O instalador:

- copia o agente para `%LOCALAPPDATA%\AtivaFIX\PrintAgent`;
- cria a tarefa agendada `AtivaFIX Print Agent`;
- inicia o agente automaticamente ao fazer login no Windows;
- roda em segundo plano, sem terminal aberto.

Requisitos do computador do caixa:

- internet na primeira instalacao, caso o Windows nao tenha Node.js;
- Google Chrome ou Microsoft Edge instalado para renderizar o cupom HTML com logo/QR Code;
- impressora instalada no Windows.

Se o Node.js nao estiver instalado, o instalador baixa automaticamente uma versao LTS portatil para:

```text
%LOCALAPPDATA%\AtivaFIX\PrintAgent\node
```

Por padrao ele sobe em:

```text
http://127.0.0.1:3333
```

## Desinstalar

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\print-agent\uninstall-windows.ps1
```

## Rodar manualmente para desenvolvimento

```powershell
npm run print-agent
```

## Testar

```powershell
Invoke-RestMethod http://127.0.0.1:3333/health
Invoke-RestMethod http://127.0.0.1:3333/test -Method POST -ContentType "application/json" -Body "{}"
```

Para escolher uma impressora especifica:

```powershell
Invoke-RestMethod http://127.0.0.1:3333/printers
Invoke-RestMethod http://127.0.0.1:3333/test -Method POST -ContentType "application/json" -Body '{"printerName":"NOME DA IMPRESSORA"}'
```

## Observacoes

- Quando recebe HTML, o agente usa Chrome/Edge em modo `kiosk-printing` para preservar o layout do cupom.
- Quando recebe texto puro, usa impressao basica do Windows como fallback.
- Para melhor resultado, configure a impressora termica como padrao do Windows ou selecione a impressora na configuracao do cupom.
- O agente aceita CORS para o navegador conseguir chamar `localhost`.
- Log do instalador: `%LOCALAPPDATA%\AtivaFIX\PrintAgent\agent.log`.
