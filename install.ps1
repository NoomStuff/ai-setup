[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = $PSScriptRoot
$sourceAgents = Join-Path $repositoryRoot 'AGENTS.md'
$sourceSkills = Join-Path $repositoryRoot 'skills'
$userHome = [Environment]::GetFolderPath('UserProfile')
$backupRoot = Join-Path $userHome ('.ai-setup-backup\' + (Get-Date -Format 'yyyyMMdd-HHmmss'))

$agentsTargets = @(
    (Join-Path $userHome '.codex\AGENTS.md'),
    (Join-Path $userHome '.zcode\AGENTS.md')
)

$skillTargets = @(
    (Join-Path $userHome '.agents\skills'),
    (Join-Path $userHome '.zcode\skills')
)

$legacyCodexSkills = Join-Path $userHome '.codex\skills'

function Backup-Item {
    param(
        [Parameter(Mandatory)]
        [string] $Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    $relative = $Path.Substring($userHome.Length).TrimStart('\')
    $destination = Join-Path $backupRoot $relative
    $destinationParent = Split-Path -Parent $destination
    New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
    Copy-Item -LiteralPath $Path -Destination $destination -Recurse -Force
}

function Remove-ManagedItem {
    param(
        [Parameter(Mandatory)]
        [string] $Path,

        [Parameter(Mandatory)]
        [string] $ExpectedTarget
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    $item = Get-Item -LiteralPath $Path -Force
    $actualTarget = @($item.Target) -join ';'
    if ($item.LinkType -and $actualTarget -eq $ExpectedTarget) {
        Remove-Item -LiteralPath $Path -Force
        return
    }

    Backup-Item -Path $Path
    Remove-Item -LiteralPath $Path -Recurse -Force
}

if (-not (Test-Path -LiteralPath $sourceAgents -PathType Leaf)) {
    throw "Missing source file: $sourceAgents"
}

$skills = @(Get-ChildItem -LiteralPath $sourceSkills -Directory -Force)
foreach ($skill in $skills) {
    $skillFile = Join-Path $skill.FullName 'SKILL.md'
    if (-not (Test-Path -LiteralPath $skillFile -PathType Leaf)) {
        throw "Skill '$($skill.Name)' has no SKILL.md."
    }
}

foreach ($target in $agentsTargets) {
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    if (Test-Path -LiteralPath $target) {
        $sourceHash = (Get-FileHash -LiteralPath $sourceAgents -Algorithm SHA256).Hash
        $targetHash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
        if ($sourceHash -ne $targetHash) {
            Backup-Item -Path $target
        }
    }
    Copy-Item -LiteralPath $sourceAgents -Destination $target -Force
}

foreach ($targetRoot in $skillTargets) {
    New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null
    foreach ($skill in $skills) {
        $target = Join-Path $targetRoot $skill.Name
        Remove-ManagedItem -Path $target -ExpectedTarget $skill.FullName
        New-Item -ItemType Junction -Path $target -Target $skill.FullName | Out-Null
    }
}

# Remove the old personal Codex copies after they have been backed up. Codex's
# bundled .system directory is deliberately excluded.
foreach ($skill in $skills) {
    $legacyPath = Join-Path $legacyCodexSkills $skill.Name
    if (Test-Path -LiteralPath $legacyPath) {
        Backup-Item -Path $legacyPath
        Remove-Item -LiteralPath $legacyPath -Recurse -Force
    }
}

Write-Host 'Installed AGENTS.md copies and shared skills for Codex and ZCode.'
if (Test-Path -LiteralPath $backupRoot) {
    Write-Host "Previous files were backed up to $backupRoot"
}
