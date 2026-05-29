param(
    [string]$Title,
    [string]$PnpmScript
)

Add-Type -TypeDefinition @"
using System.Threading;
using System.Runtime.InteropServices;
public class TitleKeeper {
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    public static extern bool SetConsoleTitle(string title);
    public static void Keep(string title) {
        new Thread(() => {
            while (true) {
                SetConsoleTitle(title);
                Thread.Sleep(200);
            }
        }) { IsBackground = true }.Start();
    }
}
"@

[TitleKeeper]::Keep($Title)
Set-Location $PSScriptRoot
pnpm $PnpmScript
