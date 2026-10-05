param(
    [string]$Message = "AI Agent membutuhkan perhatian Anda."
)

# Bunyi alarm
1..3 | ForEach-Object {
    [Console]::Beep(1000, 400)
    Start-Sleep -Milliseconds 150
}

# Tampilkan pesan di terminal
Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "🔔 AI AGENT NOTIFICATION" -ForegroundColor Yellow
Write-Host $Message -ForegroundColor White
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Windows Toast Notification
try {
    Add-Type -AssemblyName System.Windows.Forms

    $notify = New-Object System.Windows.Forms.NotifyIcon
    $notify.Icon = [System.Drawing.SystemIcons]::Information
    $notify.BalloonTipTitle = "AI Agent"
    $notify.BalloonTipText = $Message
    $notify.Visible = $true

    $notify.ShowBalloonTip(10000)

    Start-Sleep -Seconds 10

    $notify.Dispose()
}
catch {
    # Jika Windows notification gagal, bunyi + terminal notification tetap berjalan.
}