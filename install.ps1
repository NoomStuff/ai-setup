[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = $PSScriptRoot
$sourceAgents = Join-Path $repositoryRoot 'AGENTS.md'
$sourceSkills = Join-Path $repositoryRoot 'skills'

$userHome = [Environment]::GetFolderPath('UserProfile')
$backupRoot = Join-Path (Join-Path $userHome '.ai-setup-backup') (Get-Date -Format 'yyyyMMdd-HHmmss')

$agentsTargets = @(
    (Join-Path $userHome '.codex\AGENTS.md'),
    (Join-Path $userHome '.zcode\AGENTS.md'),
    (Join-Path $userHome '.claude\CLAUDE.md')
)

$skillTargets = @(
    [PSCustomObject]@{
        Path = Join-Path $userHome '.agents\skills'
        ExcludedNames = @()
    },
    [PSCustomObject]@{
        Path = Join-Path $userHome '.codex\skills'
        ExcludedNames = @('.system')
    },
    [PSCustomObject]@{
        Path = Join-Path $userHome '.zcode\skills'
        ExcludedNames = @()
    },
    [PSCustomObject]@{
        Path = Join-Path $userHome '.claude\skills'
        ExcludedNames = @()
    }
)

function Get-NormalizedPath
{
    param(
        [Parameter(Mandatory)]
        [string] $Path
    )

    return [System.IO.Path]::GetFullPath($Path).TrimEnd([char[]]@('\', '/'))
}

function Test-IsSameOrChildPath
{
    param(
        [Parameter(Mandatory)]
        [string] $Path,

        [Parameter(Mandatory)]
        [string] $ParentPath
    )

    $normalizedPath = Get-NormalizedPath -Path $Path
    $normalizedParent = Get-NormalizedPath -Path $ParentPath

    if ([System.StringComparer]::OrdinalIgnoreCase.Equals(
        $normalizedPath,
        $normalizedParent
    ))
    {
        return $true
    }

    $normalizedParent += [System.IO.Path]::DirectorySeparatorChar

    return $normalizedPath.StartsWith(
        $normalizedParent,
        [System.StringComparison]::OrdinalIgnoreCase
    )
}

function Get-ItemOrNull
{
    param(
        [Parameter(Mandatory)]
        [string] $Path
    )

    return Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
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
        [System.IO.FileSystemInfo] $Item,

        [Parameter(Mandatory)]
        [string] $ExpectedTarget
    )

    if (-not (Test-ReparsePoint -Item $Item))
    {
        return $false
    }

    $expected = Get-NormalizedPath -Path $ExpectedTarget

    foreach ($linkTarget in (Get-LinkTargets -Item $Item))
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
            $candidate = Join-Path $Item.Parent.FullName $linkTarget
        }

        if ([System.StringComparer]::OrdinalIgnoreCase.Equals(
            (Get-NormalizedPath -Path $candidate),
            $expected
        ))
        {
            return $true
        }
    }

    return $false
}

function Backup-Item
{
    param(
        [Parameter(Mandatory)]
        [string] $Path
    )

    $item = Get-ItemOrNull -Path $Path

    if ($null -eq $item)
    {
        return
    }

    $relative = $item.FullName.Substring($userHome.Length).TrimStart('\')
    $destination = Join-Path $backupRoot $relative
    $destinationParent = Split-Path -Parent $destination

    New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null

    if (Test-ReparsePoint -Item $item)
    {
        $linkTypeProperty = $item.PSObject.Properties['LinkType']

        if ($null -ne $linkTypeProperty)
        {
            $linkType = $linkTypeProperty.Value
        }
        else
        {
            $linkType = 'ReparsePoint'
        }

        @(
            "Original path: $($item.FullName)"
            "Link type: $linkType"
            'Target:'
            ((Get-LinkTargets -Item $item) -join [Environment]::NewLine)
        ) | Set-Content -LiteralPath ($destination + '.link.txt') -Encoding UTF8

        return
    }

    Copy-Item -LiteralPath $item.FullName -Destination $destination -Recurse -Force
}

function Remove-PathSafe
{
    param(
        [Parameter(Mandatory)]
        [string] $Path
    )

    $item = Get-ItemOrNull -Path $Path

    if ($null -eq $item)
    {
        return
    }

    if (Test-ReparsePoint -Item $item)
    {
        if (($item.Attributes -band [System.IO.FileAttributes]::Directory) -ne 0)
        {
            [System.IO.Directory]::Delete($item.FullName, $false)
        }
        else
        {
            [System.IO.File]::Delete($item.FullName)
        }

        return
    }

    if (-not $item.PSIsContainer)
    {
        Remove-Item -LiteralPath $item.FullName -Force
        return
    }

    foreach ($child in Get-ChildItem -LiteralPath $item.FullName -Force)
    {
        Remove-PathSafe -Path $child.FullName
    }

    [System.IO.Directory]::Delete($item.FullName, $false)
}

function Ensure-RealDirectory
{
    param(
        [Parameter(Mandatory)]
        [string] $Path
    )

    $item = Get-ItemOrNull -Path $Path

    if ($null -eq $item)
    {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
        return
    }

    if ($item.PSIsContainer -and -not (Test-ReparsePoint -Item $item))
    {
        return
    }

    Backup-Item -Path $Path
    Remove-PathSafe -Path $Path

    New-Item -ItemType Directory -Path $Path -Force | Out-Null
}

function Clear-SkillTarget
{
    param(
        [Parameter(Mandatory)]
        [string] $Path,

        [string[]] $ExcludedNames = @()
    )

    Ensure-RealDirectory -Path $Path

    foreach ($item in Get-ChildItem -LiteralPath $Path -Force)
    {
        if ($ExcludedNames -contains $item.Name)
        {
            Write-Verbose "Preserving excluded item: $($item.FullName)"
            continue
        }

        Backup-Item -Path $item.FullName
        Remove-PathSafe -Path $item.FullName
    }
}

function Install-SkillJunction
{
    param(
        [Parameter(Mandatory)]
        [string] $Source,

        [Parameter(Mandatory)]
        [string] $Destination
    )

    $existing = Get-ItemOrNull -Path $Destination

    if ($null -ne $existing)
    {
        if (-not (Test-LinkTarget -Item $existing -ExpectedTarget $Source))
        {
            Backup-Item -Path $Destination
        }

        Remove-PathSafe -Path $Destination
    }

    New-Item -ItemType Junction -Path $Destination -Target $Source | Out-Null

    $created = Get-ItemOrNull -Path $Destination

    if ($null -eq $created -or -not (Test-LinkTarget -Item $created -ExpectedTarget $Source))
    {
        throw "Failed to create junction '$Destination' -> '$Source'."
    }
}

if (-not (Test-Path -LiteralPath $sourceAgents -PathType Leaf))
{
    throw "Missing source file: $sourceAgents"
}

if (-not (Test-Path -LiteralPath $sourceSkills -PathType Container))
{
    throw "Missing source directory: $sourceSkills"
}

$skills = @(
    Get-ChildItem -LiteralPath $sourceSkills -Directory -Force |
        Where-Object { $_.Name -ne '.system' }
)

if ($skills.Count -eq 0)
{
    throw "The source skill directory '$sourceSkills' contains no skills. Nothing was changed."
}

foreach ($skill in $skills)
{
    $skillFile = Join-Path $skill.FullName 'SKILL.md'

    if (-not (Test-Path -LiteralPath $skillFile -PathType Leaf))
    {
        throw "Skill '$($skill.Name)' has no SKILL.md."
    }
}

foreach ($targetDefinition in $skillTargets)
{
    if (
        (Test-IsSameOrChildPath -Path $sourceSkills -ParentPath $targetDefinition.Path) -or
        (Test-IsSameOrChildPath -Path $targetDefinition.Path -ParentPath $sourceSkills)
    )
    {
        throw "Source skill directory '$sourceSkills' overlaps target directory '$($targetDefinition.Path)'. Refusing to continue."
    }
}

foreach ($target in $agentsTargets)
{
    Ensure-RealDirectory -Path (Split-Path -Parent $target)

    $existing = Get-ItemOrNull -Path $target

    if ($null -ne $existing)
    {
        $sourceHash = (Get-FileHash -LiteralPath $sourceAgents -Algorithm SHA256).Hash
        $targetHash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash

        if ($sourceHash -ne $targetHash)
        {
            Backup-Item -Path $target
        }
    }

    Copy-Item -LiteralPath $sourceAgents -Destination $target -Force
}

foreach ($targetDefinition in $skillTargets)
{
    Clear-SkillTarget `
        -Path $targetDefinition.Path `
        -ExcludedNames $targetDefinition.ExcludedNames

    foreach ($skill in $skills)
    {
        if ($targetDefinition.ExcludedNames -contains $skill.Name)
        {
            continue
        }

        Install-SkillJunction `
            -Source $skill.FullName `
            -Destination (Join-Path $targetDefinition.Path $skill.Name)
    }
}

Write-Host ''
Write-Host 'Installed instruction files:'

foreach ($target in $agentsTargets)
{
    Write-Host "  $target"
}

Write-Host ''
Write-Host 'Installed shared skills:'

foreach ($targetDefinition in $skillTargets)
{
    Write-Host "  $($targetDefinition.Path)"
}

if (Test-Path -LiteralPath $backupRoot)
{
    Write-Host ''
    Write-Host "Previous files were backed up to:"
    Write-Host "  $backupRoot"
}