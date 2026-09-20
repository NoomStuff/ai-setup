[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = $PSScriptRoot
$userHome = [Environment]::GetFolderPath('UserProfile')

$expectedAgents = Join-Path $repositoryRoot 'AGENTS.md'
$expectedSkillsRoot = Join-Path $repositoryRoot 'skills'

$instructionTargets = @(
    [PSCustomObject]@{
        Path = Join-Path $userHome '.codex\AGENTS.md'
        Name = 'Codex'
    },
    [PSCustomObject]@{
        Path = Join-Path $userHome '.zcode\AGENTS.md'
        Name = 'ZCode'
    },
    [PSCustomObject]@{
        Path = Join-Path $userHome '.claude\CLAUDE.md'
        Name = 'Claude'
    }
)

$skillTargets = @(
    [PSCustomObject]@{
        Path = Join-Path $userHome '.agents\skills'
        Name = 'Agents'
        ExcludedNames = @()
    },
    [PSCustomObject]@{
        Path = Join-Path $userHome '.codex\skills'
        Name = 'Codex'
        ExcludedNames = @('.system')
    },
    [PSCustomObject]@{
        Path = Join-Path $userHome '.zcode\skills'
        Name = 'ZCode'
        ExcludedNames = @()
    },
    [PSCustomObject]@{
        Path = Join-Path $userHome '.claude\skills'
        Name = 'Claude'
        ExcludedNames = @()
    }
)

$failures = [System.Collections.Generic.List[string]]::new()

function Get-NormalizedPath
{
    param(
        [Parameter(Mandatory)]
        [string] $Path
    )

    return [System.IO.Path]::GetFullPath($Path).TrimEnd([char[]]@('\', '/'))
}

function Test-ReparsePoint
{
    param(
        [Parameter(Mandatory)]
        [System.IO.FileSystemInfo] $Item
    )

    return ($Item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0
}

function Get-LinkTargets
{
    param(
        [Parameter(Mandatory)]
        [System.IO.FileSystemInfo] $Item
    )

    $targetProperty = $Item.PSObject.Properties['Target']

    if ($null -eq $targetProperty -or $null -eq $targetProperty.Value)
    {
        return @()
    }

    return @($targetProperty.Value)
}

function Test-LinkTarget
{
    param(
        [Parameter(Mandatory)]
        [string] $Path,

        [Parameter(Mandatory)]
        [string] $ExpectedTarget
    )

    if (-not (Test-Path -LiteralPath $Path))
    {
        $failures.Add("Missing: $Path")
        return
    }

    $item = Get-Item -LiteralPath $Path -Force

    if (-not (Test-ReparsePoint -Item $item))
    {
        $failures.Add("Not a link: $Path")
        return
    }

    $expected = Get-NormalizedPath -Path $ExpectedTarget
    $matches = $false

    foreach ($linkTarget in (Get-LinkTargets -Item $item))
    {
        if ([string]::IsNullOrWhiteSpace($linkTarget))
        {
            continue
        }

        if ([System.IO.Path]::IsPathRooted($linkTarget))
        {
            $candidate = $linkTarget
        }
        else
        {
            $candidate = Join-Path $item.Parent.FullName $linkTarget
        }

        if ([System.StringComparer]::OrdinalIgnoreCase.Equals(
            (Get-NormalizedPath -Path $candidate),
            $expected
        ))
        {
            $matches = $true
            break
        }
    }

    if (-not $matches)
    {
        $actualTargets = (Get-LinkTargets -Item $item) -join ';'
        $failures.Add("Wrong target: $Path -> $actualTargets")
    }
}

if (-not (Test-Path -LiteralPath $expectedAgents -PathType Leaf))
{
    throw "Missing source file: $expectedAgents"
}

if (-not (Test-Path -LiteralPath $expectedSkillsRoot -PathType Container))
{
    throw "Missing source directory: $expectedSkillsRoot"
}

$expectedSkills = @(
    Get-ChildItem -LiteralPath $expectedSkillsRoot -Directory -Force |
        Where-Object { $_.Name -ne '.system' }
)

if ($expectedSkills.Count -eq 0)
{
    throw "The source skill directory '$expectedSkillsRoot' contains no skills."
}

foreach ($skill in $expectedSkills)
{
    $skillFile = Join-Path $skill.FullName 'SKILL.md'

    if (-not (Test-Path -LiteralPath $skillFile -PathType Leaf))
    {
        $failures.Add("Skill '$($skill.Name)' has no SKILL.md.")
    }
}

$expectedAgentsHash = (Get-FileHash -LiteralPath $expectedAgents -Algorithm SHA256).Hash

foreach ($target in $instructionTargets)
{
    if (-not (Test-Path -LiteralPath $target.Path -PathType Leaf))
    {
        $failures.Add("Missing $($target.Name) instructions: $($target.Path)")
        continue
    }

    $actualHash = (Get-FileHash -LiteralPath $target.Path -Algorithm SHA256).Hash

    if ($expectedAgentsHash -ne $actualHash)
    {
        $failures.Add("Outdated $($target.Name) instructions: $($target.Path)")
    }
}

$expectedSkillNames = @($expectedSkills | ForEach-Object { $_.Name })

foreach ($target in $skillTargets)
{
    if (-not (Test-Path -LiteralPath $target.Path -PathType Container))
    {
        $failures.Add("Missing skill directory: $($target.Path)")
        continue
    }

    foreach ($skill in $expectedSkills)
    {
        Test-LinkTarget `
            -Path (Join-Path $target.Path $skill.Name) `
            -ExpectedTarget $skill.FullName
    }

    foreach ($item in Get-ChildItem -LiteralPath $target.Path -Force)
    {
        if ($target.ExcludedNames -contains $item.Name)
        {
            continue
        }

        if ($expectedSkillNames -notcontains $item.Name)
        {
            $failures.Add("Unexpected stale skill in $($target.Name): $($item.FullName)")
        }
    }
}

if ($failures.Count -gt 0)
{
    foreach ($failure in $failures)
    {
        Write-Error $failure
    }

    exit 1
}

Write-Host "Verified instruction files for Codex, ZCode and Claude."
Write-Host "Verified $($expectedSkills.Count) shared skills across Agents, Codex, ZCode and Claude."