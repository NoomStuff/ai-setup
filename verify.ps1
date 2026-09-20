[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = $PSScriptRoot
$userHome = [Environment]::GetFolderPath('UserProfile')
$expectedAgents = Join-Path $repositoryRoot 'AGENTS.md'
$expectedSkills = Get-ChildItem -LiteralPath (Join-Path $repositoryRoot 'skills') -Directory -Force
$failures = [System.Collections.Generic.List[string]]::new()

function Test-LinkTarget {
    param(
        [Parameter(Mandatory)]
        [string] $Path,

        [Parameter(Mandatory)]
        [string] $ExpectedTarget
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        $failures.Add("Missing: $Path")
        return
    }

    $item = Get-Item -LiteralPath $Path -Force
    $actualTarget = @($item.Target) -join ';'
    if (-not $item.LinkType) {
        $failures.Add("Not a link: $Path")
    }
    elseif ($actualTarget -ne $ExpectedTarget) {
        $failures.Add("Wrong target: $Path -> $actualTarget")
    }
}

foreach ($agentsPath in @((Join-Path $userHome '.codex\AGENTS.md'), (Join-Path $userHome '.zcode\AGENTS.md'))) {
    if (-not (Test-Path -LiteralPath $agentsPath -PathType Leaf)) {
        $failures.Add("Missing: $agentsPath")
        continue
    }

    $expectedHash = (Get-FileHash -LiteralPath $expectedAgents -Algorithm SHA256).Hash
    $actualHash = (Get-FileHash -LiteralPath $agentsPath -Algorithm SHA256).Hash
    if ($expectedHash -ne $actualHash) {
        $failures.Add("Outdated AGENTS.md copy: $agentsPath")
    }
}

foreach ($root in @((Join-Path $userHome '.agents\skills'), (Join-Path $userHome '.zcode\skills'))) {
    foreach ($skill in $expectedSkills) {
        Test-LinkTarget -Path (Join-Path $root $skill.Name) -ExpectedTarget $skill.FullName
    }
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host "Verified both AGENTS.md copies and $($expectedSkills.Count) skills for Codex and ZCode."
