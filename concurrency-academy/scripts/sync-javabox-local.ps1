# Copies freshly built JavaBox WASM artifacts from the WSL build into the dev dir.
$dst = Join-Path $PSScriptRoot '..\.javabox-local'
New-Item -ItemType Directory -Force $dst | Out-Null
$src = '\\wsl$\Ubuntu\root\javabox-wasm'
foreach ($f in 'javabox-direct.mjs', 'javabox-direct.wasm', 'javabox-direct.data') {
  Copy-Item -Force (Join-Path $src $f) (Join-Path $dst $f)
}
Get-ChildItem $dst | Select-Object Name, Length, LastWriteTime
