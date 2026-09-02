param(
  [Parameter(Mandatory = $true)]
  [string]$WorkbookPath,
  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

$taskExcel = New-Object -ComObject Excel.Application
$taskExcel.Visible = $false
$taskExcel.DisplayAlerts = $false

function Convert-ExcelDate($value) {
  if ($null -eq $value -or "$value" -eq '') { return $null }
  if ($value -is [double] -or $value -is [int]) {
    return [DateTime]::FromOADate([double]$value).ToString('yyyy-MM-dd')
  }
  $parsed = [DateTime]::MinValue
  if ([DateTime]::TryParse("$value", [ref]$parsed)) { return $parsed.ToString('yyyy-MM-dd') }
  return $null
}

function Convert-Percent($value) {
  if ($null -eq $value -or "$value" -eq '') { return 0 }
  $text = "$value".Trim().Replace('%', '')
  $number = 0.0
  if (-not [double]::TryParse($text, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$number)) { return 0 }
  if ($number -le 1) { $number *= 100 }
  return [Math]::Round($number)
}

try {
  $taskBook = $taskExcel.Workbooks.Open($WorkbookPath, 0, $true)
  $taskSheet = $taskBook.Worksheets.Item('CRONOGRAMA')
  $historySheet = $taskBook.Worksheets.Item('Historial de avance')
  $timelineValues = $taskSheet.Range('Y9:HK209').Value2
  $records = @()
  $history = @()

  for ($row = 10; $row -le 209; $row++) {
    $agency = "$($taskSheet.Cells.Item($row, 2).Text)".Trim()
    $provider = "$($taskSheet.Cells.Item($row, 3).Text)".Trim()
    if (-not $agency -or -not $provider) { continue }

    $progressValue = $taskSheet.Cells.Item($row, 12).Value2
    $progress = if ($null -eq $progressValue -or "$progressValue" -eq '') { 0 } else { [Math]::Round([double]$progressValue * 100) }
    $status = if ($progress -ge 100) { 'Terminada' } elseif ($progress -gt 0) { 'En proceso' } else { 'No empezada' }
    $timelineFirstColumn = $null
    $timelineLastColumn = $null
    $timelineRow = $row - 8
    for ($timelineColumn = 1; $timelineColumn -le 195; $timelineColumn++) {
      $marker = "$($timelineValues[$timelineRow, $timelineColumn])".Trim()
      if ($marker -match '^X') {
        if ($null -eq $timelineFirstColumn) { $timelineFirstColumn = $timelineColumn }
        $timelineLastColumn = $timelineColumn
      }
    }

    $records += [ordered]@{
      id = [int]$taskSheet.Cells.Item($row, 1).Value2
      agency = $agency
      provider = $provider
      group = "$($taskSheet.Cells.Item($row, 4).Text)".Trim()
      location = "$($taskSheet.Cells.Item($row, 5).Text)".Trim()
      district = "$($taskSheet.Cells.Item($row, 6).Text)".Trim()
      newConduit = Convert-Percent $taskSheet.Cells.Item($row, 7).Value2
      newCabling = Convert-Percent $taskSheet.Cells.Item($row, 8).Value2
      installation = Convert-Percent $taskSheet.Cells.Item($row, 9).Value2
      commissioning = Convert-Percent $taskSheet.Cells.Item($row, 10).Value2
      dismantling = Convert-Percent $taskSheet.Cells.Item($row, 11).Value2
      progress = $progress
      status = $status
      supervisor = "$($taskSheet.Cells.Item($row, 14).Text)".Trim()
      startDate = Convert-ExcelDate $taskSheet.Cells.Item($row, 22).Value2
      endDate = Convert-ExcelDate $taskSheet.Cells.Item($row, 23).Value2
      days = if ($null -eq $taskSheet.Cells.Item($row, 24).Value2) { $null } else { [int]$taskSheet.Cells.Item($row, 24).Value2 }
      timelineStart = if ($null -eq $timelineFirstColumn) { $null } else { Convert-ExcelDate $timelineValues[1, $timelineFirstColumn] }
      timelineEnd = if ($null -eq $timelineLastColumn) { $null } else { Convert-ExcelDate $timelineValues[1, $timelineLastColumn] }
    }
  }

  for ($row = 2; $row -le $historySheet.UsedRange.Rows.Count; $row++) {
    $historyAgency = "$($historySheet.Cells.Item($row, 3).Text)".Trim()
    $historyDate = "$($historySheet.Cells.Item($row, 1).Text)".Trim()
    if (-not $historyAgency -or -not $historyDate) { continue }

    $history += [ordered]@{
      date = $historyDate
      item = [int]$historySheet.Cells.Item($row, 2).Value2
      agency = $historyAgency
      supervisor = "$($historySheet.Cells.Item($row, 4).Text)".Trim()
      newConduit = Convert-Percent $historySheet.Cells.Item($row, 5).Value2
      newCabling = Convert-Percent $historySheet.Cells.Item($row, 6).Value2
      installation = Convert-Percent $historySheet.Cells.Item($row, 7).Value2
      commissioning = Convert-Percent $historySheet.Cells.Item($row, 8).Value2
      dismantling = Convert-Percent $historySheet.Cells.Item($row, 9).Value2
      progress = Convert-Percent $historySheet.Cells.Item($row, 10).Value2
      status = "$($historySheet.Cells.Item($row, 11).Text)".Trim()
    }
  }

  $payload = [ordered]@{
    source = 'CRONOGRAMA'
    workbook = [System.IO.Path]::GetFileName($WorkbookPath)
    extractedAt = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssK')
    scheduleStart = Convert-ExcelDate $timelineValues[1, 1]
    scheduleEnd = Convert-ExcelDate $timelineValues[1, 195]
    records = $records
    history = $history
  }

  $targetDirectory = [System.IO.Path]::GetDirectoryName($OutputPath)
  [System.IO.Directory]::CreateDirectory($targetDirectory) | Out-Null
  [System.IO.File]::WriteAllText($OutputPath, ($payload | ConvertTo-Json -Depth 6), [System.Text.UTF8Encoding]::new($false))
  $taskBook.Close($false)
  Write-Output "Extracted $($records.Count) records and $($history.Count) history points to $OutputPath"
}
finally {
  $taskExcel.Quit()
  [Runtime.InteropServices.Marshal]::ReleaseComObject($taskExcel) | Out-Null
}
