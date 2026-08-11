$ErrorActionPreference = "Stop"

$projectRoot = "D:\develop\GitProjects\Arataki_Itto_DesktopPet"
Set-Location $projectRoot

if (-not (Test-Path -LiteralPath "node_modules\electron\dist\electron.exe")) {
  npm install
}

npm start