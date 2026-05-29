$root = $PSScriptRoot
$runner = Join-Path $root 'dev-runner.ps1'

Start-Process powershell -ArgumentList "-NoExit", "-File", $runner, "-Title", "`"PNPM: BackEnd`"", "-PnpmScript", "dev:backend"
Start-Process powershell -ArgumentList "-NoExit", "-File", $runner, "-Title", "`"PNPM: FrontEnd`"", "-PnpmScript", "dev:frontend"
