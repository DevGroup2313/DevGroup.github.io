; EMPORIUM  |  Copyright (c) 2026 Yannie D. Forest. All rights reserved.
; NO LICENCE IS GRANTED. See LICENCE.txt.
;
; The Windows installer, made by Inno Setup on GitHub's Windows computer
; (.github/workflows/windows.yml). You do not run this file yourself.
;
; It installs Emporium for the current user only (no administrator password)
; into %LOCALAPPDATA%\Programs\Emporium, puts it in the Start menu (and on the
; Desktop if ticked), and registers an uninstaller in Settings, Apps.
;
; The books stay in %LOCALAPPDATA%\Emporium, a different folder that neither
; installing nor uninstalling ever deletes. Before installing, a copy of that
; folder is made in %LOCALAPPDATA%\Emporium\backups (the three newest copies
; are kept). The books are sealed: the copy is as unreadable as the original
; without the owner's password or the Master Key.
;
; The same design as the Forge's installer (the_forge.iss, 9s80), which follows
; Inkwell's: per user, no Ready page, WebView2 checked, a running copy asked to
; close before an uninstall, and an update that starts clean.

#ifndef AppVersion
  #define AppVersion "Build 0"
#endif
#ifndef AppNumeric
  #define AppNumeric "1.0.0.0"
#endif
#ifndef ProgramDir
  #define ProgramDir "..\..\dist\Emporium"
#endif
#ifndef OutputDir
  #define OutputDir "..\..\dist"
#endif
#ifndef SetupName
  #define SetupName "Emporium-Windows-Setup"
#endif

[Setup]
AppId=com.yannieforest.emporium.windows
AppName=Emporium
AppVersion={#AppVersion}
AppVerName=Emporium {#AppVersion}
AppPublisher=Yannie D. Forest
AppCopyright=Copyright (c) 2026 Yannie D. Forest. All rights reserved.
VersionInfoVersion={#AppNumeric}
VersionInfoCompany=Yannie D. Forest
VersionInfoDescription=Emporium installer
VersionInfoProductName=Emporium
VersionInfoProductVersion={#AppNumeric}
VersionInfoCopyright=Copyright (c) 2026 Yannie D. Forest. All rights reserved.
DefaultDirName={localappdata}\Programs\Emporium
DefaultGroupName=Emporium
DisableProgramGroupPage=yes
DisableDirPage=yes
DisableReadyPage=yes
PrivilegesRequired=lowest
OutputDir={#OutputDir}
OutputBaseFilename={#SetupName}
SetupIconFile=emporium.ico
UninstallDisplayIcon={app}\Emporium.exe
UninstallDisplayName=Emporium
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
RestartApplications=no
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
SetupLogging=yes

[Tasks]
Name: "desktopicon"; Description: "Put Emporium on the Desktop"; GroupDescription: "Shortcuts:"

[InstallDelete]
; The program's own libraries are cleared before the new ones are copied, so an
; update leaves nothing stale behind. The books are not in this folder.
Type: filesandordirs; Name: "{app}\_internal"
; An update starts clean: a run the update itself interrupted does not count as
; a bad ending. Only this one small file; the books beside it are not touched.
Type: files; Name: "{localappdata}\Emporium\storage\emporium_session.flag"

[Files]
Source: "{#ProgramDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{userprograms}\Emporium"; Filename: "{app}\Emporium.exe"; WorkingDir: "{app}"; Comment: "Emporium {#AppVersion}"
Name: "{userdesktop}\Emporium"; Filename: "{app}\Emporium.exe"; WorkingDir: "{app}"; Comment: "Emporium {#AppVersion}"; Tasks: desktopicon

[Run]
Filename: "{app}\Emporium.exe"; Description: "Open Emporium now"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Ask Emporium to close, not forcefully, so it records a clean ending.
Filename: "{sys}\taskkill.exe"; Parameters: "/IM ""Emporium.exe"""; Flags: runhidden; RunOnceId: "CloseEmporium"

[Code]
var
  WebView2Page: TOutputMsgWizardPage;
  WebView2Missing: Boolean;

{ Microsoft's documented test for the Edge WebView2 Runtime: the pv value under
  one of these keys, present and greater than 0.0.0.0. The program makes the
  same test when it starts (emporium_app.py, _webview2_runtime). }
function WebView2Present: Boolean;
var
  Version: String;
begin
  Result := False;
  Version := '';
  if RegQueryStringValue(HKEY_LOCAL_MACHINE, 'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) then
    if (Trim(Version) <> '') and (Trim(Version) <> '0.0.0.0') then
      Result := True;
  if not Result then
  begin
    Version := '';
    if RegQueryStringValue(HKEY_CURRENT_USER, 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) then
      if (Trim(Version) <> '') and (Trim(Version) <> '0.0.0.0') then
        Result := True;
  end;
end;

procedure OpenWebView2Download(Sender: TObject);
var
  ErrorCode: Integer;
begin
  ShellExecAsOriginalUser('open', 'https://developer.microsoft.com/microsoft-edge/webview2/consumer/', '', '', SW_SHOWNORMAL, ewNoWait, ErrorCode);
end;

procedure InitializeWizard;
var
  Button: TNewButton;
begin
  try
    WebView2Missing := not WebView2Present;
  except
    WebView2Missing := False;
  end;
  if WebView2Missing then
    Log('Microsoft Edge WebView2 Runtime: not found in the registry.')
  else
    Log('Microsoft Edge WebView2 Runtime: present (or not checkable).');
  WebView2Page := CreateOutputMsgPage(wpWelcome,
    'Microsoft Edge WebView2',
    'One free part of Windows is missing on this PC.',
    'Emporium draws its window with Microsoft Edge WebView2, a free part of Windows. It is not on this PC.' + #13#10#13#10 +
    'You can carry on. Emporium installs now, and opens in your browser until WebView2 is added.' + #13#10#13#10 +
    'To add it: open Microsoft''s page, click Download WebView2, and run the file. Then open Emporium again.' + #13#10#13#10 +
    'https://developer.microsoft.com/microsoft-edge/webview2/consumer/');
  Button := TNewButton.Create(WebView2Page);
  Button.Caption := 'Open Microsoft''s page';
  Button.Width := ScaleX(180);
  Button.Height := ScaleY(23);
  Button.Top := WebView2Page.MsgLabel.Top + WebView2Page.MsgLabel.Height + ScaleY(12);
  Button.OnClick := @OpenWebView2Download;
  Button.Parent := WebView2Page.Surface;
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := (PageID = WebView2Page.ID) and not WebView2Missing;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = wpSelectTasks then
    WizardForm.NextButton.Caption := SetupMessage(msgButtonInstall);
end;

function ProgramIsRunning: Boolean;
var
  Code: Integer;
begin
  Result := False;
  if Exec(ExpandConstant('{cmd}'), '/C ' + ExpandConstant('{sys}\tasklist.exe') + ' /FI "IMAGENAME eq Emporium.exe" /FO CSV /NH | ' +
          ExpandConstant('{sys}\find.exe') + ' /I "Emporium.exe"',
          '', SW_HIDE, ewWaitUntilTerminated, Code) then
    Result := (Code = 0);
end;

{ Uninstalling while Emporium is open: ask it to close, not forcefully, and give
  it up to 15 seconds, before any file is removed. }
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  Code, Tries: Integer;
begin
  if CurUninstallStep = usUninstall then
  begin
    if ProgramIsRunning then
    begin
      Exec(ExpandConstant('{sys}\taskkill.exe'), '/IM "Emporium.exe"', '', SW_HIDE, ewWaitUntilTerminated, Code);
      Tries := 0;
      while ProgramIsRunning and (Tries < 30) do
      begin
        Sleep(500);
        Tries := Tries + 1;
      end;
      if ProgramIsRunning then
        Log('Emporium was still open after 15 seconds; some of its files may stay until it closes.')
      else
        Log('Emporium closed before its files were removed.');
    end;
  end;
end;

procedure KeepNewestBackups(Keep: Integer);
var
  Root: String;
  FindRec: TFindRec;
  Names: TStringList;
  I: Integer;
begin
  Root := ExpandConstant('{localappdata}\Emporium\backups');
  Names := TStringList.Create;
  try
    if FindFirst(Root + '\setup-*', FindRec) then
    begin
      try
        repeat
          if (FindRec.Attributes and FILE_ATTRIBUTE_DIRECTORY) <> 0 then
            Names.Add(FindRec.Name);
        until not FindNext(FindRec);
      finally
        FindClose(FindRec);
      end;
    end;
    Names.Sort;
    for I := 0 to Names.Count - 1 - Keep do
      DelTree(Root + '\' + Names[I], True, True, True);
  finally
    Names.Free;
  end;
end;

{ Before anything changes: copy the folder that holds the books to
  backups\setup-<date>. A copy only; nothing is moved. The web view's caches
  are left out, because they are rebuilt by themselves. }
procedure CurStepChanged(CurStep: TSetupStep);
var
  Code: Integer;
  Src, Dst: String;
begin
  if CurStep = ssInstall then
  begin
    Src := ExpandConstant('{localappdata}\Emporium\storage');
    if DirExists(Src) then
    begin
      Dst := ExpandConstant('{localappdata}\Emporium\backups\setup-') + GetDateTimeString('yyyymmdd-hhnnss', #0, #0) + '\storage';
      Exec(ExpandConstant('{sys}\robocopy.exe'), '"' + Src + '" "' + Dst + '" /E /R:1 /W:1 /NFL /NDL /NJH /NJS /XD Cache "Code Cache" GPUCache DawnCache GrShaderCache ShaderCache',
           '', SW_HIDE, ewWaitUntilTerminated, Code);
      try
        KeepNewestBackups(3);
      except
        Log('Older backups could not be tidied: ' + GetExceptionMessage);
      end;
    end;
  end;
end;
