#Requires -Modules Az.Accounts, Az.Storage
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)]
    [string]$ResourceGroupName,

    [Parameter(Mandatory)]
    [string]$StorageAccountName,

    [switch]$Remediate
)

$ErrorActionPreference = "Stop"

$account = Get-AzStorageAccount `
    -ResourceGroupName $ResourceGroupName `
    -Name $StorageAccountName

$enabled = [bool]$account.AllowBlobPublicAccess

[pscustomobject]@{
    ResourceId             = $account.Id
    AllowBlobPublicAccess  = $enabled
    CheckedAtUtc           = (Get-Date).ToUniversalTime().ToString("o")
} | Format-List

if ($enabled -and $Remediate) {
    if ($PSCmdlet.ShouldProcess($account.Id, "Disable anonymous blob access")) {
        Set-AzStorageAccount `
            -ResourceGroupName $ResourceGroupName `
            -Name $StorageAccountName `
            -AllowBlobPublicAccess $false | Out-Null

        $verified = Get-AzStorageAccount `
            -ResourceGroupName $ResourceGroupName `
            -Name $StorageAccountName

        if ($verified.AllowBlobPublicAccess) {
            throw "Remediation verification failed: anonymous blob access remains enabled."
        }

        Write-Host "Remediation verified: AllowBlobPublicAccess is false."
    }
}
elseif ($enabled) {
    Write-Warning "Anonymous blob access is enabled. Re-run with -Remediate after confirming lab scope."
}
else {
    Write-Host "Storage account is already configured to block anonymous blob access."
}
