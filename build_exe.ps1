# 构建 Windows 单文件启动程序 PsychPlatform.exe
# 用法：在仓库根目录用 PowerShell 运行  ./build_exe.ps1
# 需要本机已安装 Python 3.12 与 Node 20。

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "[1/3] 构建前端静态文件 (vite build)..."
Push-Location "$root\frontend"
if (-not (Test-Path node_modules)) { npm install }
npm run build
Pop-Location

Write-Host "[2/3] 安装后端与打包依赖..."
Push-Location "$root\backend"
python -m pip install -r requirements.txt
python -m pip install pyinstaller

Write-Host "[3/3] 使用 PyInstaller 打包单文件 exe..."
pyinstaller --noconfirm --onefile --name PsychPlatform `
  --add-data "..\frontend\dist;webdist" `
  --collect-all uvicorn `
  --collect-submodules app `
  --hidden-import jose.backends `
  --hidden-import jose.backends.native `
  --hidden-import passlib.handlers.bcrypt `
  launcher.py
Pop-Location

Write-Host ""
Write-Host "完成：$root\backend\dist\PsychPlatform.exe"
Write-Host "双击该 exe 即可启动平台（首次运行会在 exe 同目录生成 psych_platform.db 并写入演示数据）。"
