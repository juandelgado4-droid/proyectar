# get-media-stream.ps1 — Persistent SMTC reader (outputs JSON lines every ~500ms)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Runtime.WindowsRuntime

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

Function Await($WinRtTask, $ResultType) {
  $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
  $netTask = $asTask.Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  $netTask.Result
}

# Load the WinRT type once
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null

# Get the manager once — it stays valid for the lifetime of the process
$manager = $null
try {
  $manager = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
} catch {
  # If we can't even get the manager, output error and exit
  Write-Output "{`"error`":`"MANAGER_INIT_FAILED: $($_.Exception.Message)`"}"
  exit 1
}

# Persistent loop — Node.js reads each line as it arrives
while ($true) {
  try {
    $session = $manager.GetCurrentSession()
    if ($session) {
      $info = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
      $playback = $session.GetPlaybackInfo()
      $timeline = $session.GetTimelineProperties()
      $status = $playback.PlaybackStatus

      # SMTC Timeline.Position is not always "now" when the player is actively
      # playing, so we extrapolate it from LastUpdatedTime to get the real value.
      $posMs = [double]$timeline.Position.TotalMilliseconds
      $durMs = [double]$timeline.EndTime.TotalMilliseconds

      $lastUpdated = $timeline.LastUpdatedTime
      $now = [System.DateTimeOffset]::UtcNow
      $timestampMs = $now.ToUnixTimeMilliseconds()

      if ($status -eq "Playing" -and $null -ne $lastUpdated) {
        $elapsedMs = ($now - $lastUpdated).TotalMilliseconds
        if ($elapsedMs -gt 0) {
          $posMs += $elapsedMs
        }
      }

      # Extract playback rate (defaults to 1.0 if unavailable)
      $rate = 1.0
      try {
        if ($null -ne $playback.PlaybackRate) {
          $rate = [double]$playback.PlaybackRate
          if ($rate -le 0) { $rate = 1.0 }
        }
      } catch { $rate = 1.0 }

      # Extract source app identifier for per-player offset persistence
      $sourceApp = ""
      try {
        $sourceApp = $session.SourceAppUserModelId
        if ($null -eq $sourceApp) { $sourceApp = "" }
      } catch { $sourceApp = "" }

      $json = @{
        title        = $info.Title
        artist       = $info.Artist
        album        = $info.AlbumTitle
        status       = "$status"
        positionMs   = [long]([math]::Max(0, $posMs))
        durationMs   = [long]$durMs
        timestamp    = [long]$timestampMs
        playbackRate = $rate
        source       = "$sourceApp"
      } | ConvertTo-Json -Compress

      Write-Output $json
      [Console]::Out.Flush()

      # Poll quickly so lyric sync feels tight in live use
      Start-Sleep -Milliseconds 250
    } else {
      Write-Output '{"error":"NO_SESSION"}'
      [Console]::Out.Flush()

      # No active media — wait longer to save CPU
      Start-Sleep -Seconds 2
    }
  } catch {
    Write-Output "{`"error`":`"$($_.Exception.Message)`"}"
    [Console]::Out.Flush()
    Start-Sleep -Seconds 1
  }
}
