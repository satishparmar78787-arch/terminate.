// Environment registers for custom commands
        const systemAliases = {};
        const systemEnv = { PATH: "/bin:/usr/bin", USER: "root", SHELL: "/bin/bash" };

        // Vim State Machine Properties
        let isVimActive = false;
        let vimFilePath = "";
        let vimLines = [""];
        let vimCursorRow = 0;
        let vimCursorCol = 0;
        let vimMode = "NORMAL"; // NORMAL, INSERT, COMMAND
        let vimCommandText = "";
        let vimClipboard = "";

        // Perform tab auto-fill completion
        function completeInputWithTab() {
            if (autocompleteSuggestion.innerText) {
                terminalInput.value = autocompleteSuggestion.innerText;
                autocompleteSuggestion.innerText = "";
            }
        }

        // Get directory contents based on active path
        function getActiveDir() {
            const dir = fileSystem[currentPath[0]];
            return dir ? dir.content : null;
        }

        // Output formatting printer helper
        function appendOutput(text, colorClass = "slate-300") {
            const line = document.createElement('div');
            line.className = `leading-relaxed text-${colorClass} font-mono text-sm whitespace-pre-wrap`;
            line.innerHTML = text;
            terminalHistory.appendChild(line);
            terminalHistory.scrollTop = terminalHistory.scrollHeight;
        }

        // Terminal command processor loop
        function executeCommand(cmdStr) {
            let trimmed = cmdStr.trim();
            if (!trimmed) return;

            // Check Aliases
            if (systemAliases[trimmed]) {
                trimmed = systemAliases[trimmed];
            }

            // Push to session history
            commandHistory.push(trimmed);
            historyIndex = commandHistory.length;

            // Render Prompt Line
            const pathText = "/" + currentPath.join("/");
            const userPromptText = isSSHActive 
                ? `<span class="text-indigo-400 font-bold">${sshTargetServer}</span>:<span class="text-cyan-400">${pathText}</span># ${trimmed}`
                : `<span class="text-emerald-400 font-bold">root@cloud-shell</span>:<span class="text-cyan-400">${pathText}</span># ${trimmed}`;
            
            appendOutput(userPromptText, "slate-400");
            terminalInput.value = "";
            autocompleteSuggestion.innerText = "";

            const parts = trimmed.split(/\s+/);
            const cmd = parts[0].toLowerCase();
            const args = parts.slice(1);

            switch(cmd) {
                case "help":
                    showHelp();
                    break;
                case "ls":
                    listDirectory();
                    break;
                case "cd":
                    changeDirectory(args[0]);
                    break;
                case "pwd":
                    appendOutput("/" + currentPath.join("/"), "indigo-400");
                    break;
                case "cat":
                    catFile(args[0]);
                    break;
                case "touch":
                    touchFile(args[0]);
                    break;
                case "mkdir":
                    createDirectory(args[0]);
                    break;
                case "rm":
                    removeTarget(args[0]);
                    break;
                case "nano":
                    openNano(args[0]);
                    break;
                case "vim":
                case "vi":
                    openVim(args[0]);
                    break;
                case "tree":
                    showTree();
                    break;
                case "neofetch":
                    showNeofetch();
                    break;
                case "clear":
                    terminalHistory.innerHTML = "";
                    break;
                case "theme":
                    if (args[0]) {
                        const availableThemes = ["default", "dracula", "matrix", "cyberpunk", "ocean"];
                        if (availableThemes.includes(args[0].toLowerCase())) {
                            switchTheme(args[0].toLowerCase());
                        } else {
                            appendOutput(`Theme not found. Try: default, dracula, matrix, cyberpunk, ocean`, "rose-400");
                        }
                    } else {
                        appendOutput("Usage: theme [default|dracula|matrix|cyberpunk|ocean]", "amber-500");
                    }
                    break;
                case "ping":
                    runPing(args[0]);
                    break;
                case "curl":
                    runCurl(args[0]);
                    break;
                case "ssh":
                    handleSSHCommand(args);
                    break;
                case "htop":
                    runHtop();
                    break;
                case "bash":
                    runScript(args[0]);
                    break;
                case "download":
                    downloadFile(args[0]);
                    break;
                case "whoami":
                    appendOutput(systemEnv.USER, "indigo-300");
                    break;
                case "ps":
                    runPs();
                    break;
                case "grep":
                    runGrep(args);
                    break;
                case "find":
                    runFind(args[0]);
                    break;
                case "chmod":
                    runChmod(args);
                    break;
                case "wget":
                    runWget(args[0]);
                    break;
                case "cp":
                    runCp(args[0], args[1]);
                    break;
                case "mv":
                    runMv(args[0], args[1]);
                    break;
                case "head":
                    runHead(args);
                    break;
                case "tail":
                    runTail(args);
                    break;
                case "diff":
                    runDiff(args[0], args[1]);
                    break;
                case "history":
                    runHistory();
                    break;
                case "alias":
                    runAlias(args);
                    break;
                case "export":
                    runExport(args);
                    break;
                case "exit":
                    if (isSSHActive) {
                        isSSHActive = false;
                        sshTargetServer = "";
                        terminalTitle.innerText = "root@cloud-shell: ~/workspace";
                        networkBadge.innerText = "LOCAL ENGINE";
                        networkBadge.className = "bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold text-[10px] tracking-wide border border-emerald-500/20 font-mono transition-all duration-300";
                        promptDecorator.innerHTML = `root@cloud-shell:<span id="current-path" class="text-cyan-400">/${currentPath.join("/")}</span>#`;
                        appendOutput("SSH session ended. Returned to local engine host shell.", "emerald-400");
                    } else {
                        appendOutput("Local shell exit requested. (Reload window page to clear virtual RAM completely).", "amber-400");
                    }
                    break;
                default:
                    appendOutput(`Command not found: ${cmd}. Type 'help' for active commands.`, "rose-400");
            }
        }

        // Custom help sheet builder
        function showHelp() {
            appendOutput(`
<div class="space-y-1">
  <p class="font-bold text-indigo-400">Available commands inside cloud-shell:</p>
  <p><span class="text-emerald-400 w-32 inline-block">ls</span> List files in active directory</p>
  <p><span class="text-emerald-400 w-32 inline-block">cd [dir]</span> Switch directories</p>
  <p><span class="text-emerald-400 w-32 inline-block">pwd</span> Print working directory path</p>
  <p><span class="text-emerald-400 w-32 inline-block">cat [file]</span> Render file text content</p>
  <p><span class="text-emerald-400 w-32 inline-block">touch [file]</span> Create a new empty file</p>
  <p><span class="text-emerald-400 w-32 inline-block">nano [file]</span> Launch visual fullscreen editor</p>
  <p><span class="text-emerald-400 w-32 inline-block">vim [file]</span> Launch full-modal visual <span class="text-pink-400 font-bold">Vim Editor</span></p>
  <p><span class="text-emerald-400 w-32 inline-block">mkdir [dir]</span> Create directory folder</p>
  <p><span class="text-emerald-400 w-32 inline-block">rm [file]</span> Delete file or directory folder</p>
  <p><span class="text-emerald-400 w-32 inline-block">tree</span> Visual file explorer tree layout</p>
  <p><span class="text-emerald-400 w-32 inline-block">neofetch</span> System and theme properties sheet</p>
  <p><span class="text-emerald-400 w-32 inline-block">htop</span> Simulated real-time interactive task viewer</p>
  <p><span class="text-emerald-400 w-32 inline-block">ping [ip]</span> Simulate icmp network packets</p>
  <p><span class="text-emerald-400 w-32 inline-block">curl [url]</span> Make an emulated HTTP API call</p>
  <p><span class="text-emerald-400 w-32 inline-block">bash [script]</span> Run automated task scripts (.sh)</p>
  <p><span class="text-emerald-400 w-32 inline-block">download [file]</span> Save file to your real host machine</p>
  <p><span class="text-emerald-400 w-32 inline-block">whoami</span> Output the current session user ID</p>
  <p><span class="text-emerald-400 w-32 inline-block">ps</span> Render currently running simulated task tree</p>
  <p><span class="text-emerald-400 w-32 inline-block">grep [pat] [file]</span> Extract matching search strings</p>
  <p><span class="text-emerald-400 w-32 inline-block">find [name]</span> Search directories recursively</p>
  <p><span class="text-emerald-400 w-32 inline-block">chmod [perm] [file]</span> Mock permission configuration</p>
  <p><span class="text-emerald-400 w-32 inline-block">wget [url]</span> Fetch file asset into workspace</p>
  <p><span class="text-emerald-400 w-32 inline-block">cp [src] [dst]</span> Copy files inside virtual environment</p>
  <p><span class="text-emerald-400 w-32 inline-block">mv [src] [dst]</span> Move or rename virtual items</p>
  <p><span class="text-emerald-400 w-32 inline-block">head -n [f]</span> Render the top lines of a document</p>
  <p><span class="text-emerald-400 w-32 inline-block">tail -n [f]</span> Render the tailing lines of a document</p>
  <p><span class="text-emerald-400 w-32 inline-block">diff [f1] [f2]</span> Check differences line-by-line</p>
  <p><span class="text-emerald-400 w-32 inline-block">history</span> Print execution console command log</p>
  <p><span class="text-emerald-400 w-32 inline-block">alias [k="v"]</span> Manage command shortcuts</p>
  <p><span class="text-emerald-400 w-32 inline-block">export [k=v]</span> Set shell session environments</p>
  <p><span class="text-emerald-400 w-32 inline-block">ssh [host]</span> Establish encrypted simulated host bridges</p>
  <p><span class="text-emerald-400 w-32 inline-block">theme [style]</span> Swap active terminal visual style</p>
  <p><span class="text-emerald-400 w-32 inline-block">clear</span> Purge current line outputs</p>
  <p><span class="text-emerald-400 w-32 inline-block">exit</span> Close active SSH bridge</p>
</div>
            `);
        }

        // list current active folder files
        function listDirectory() {
            const dirContent = getActiveDir();
            if (!dirContent || Object.keys(dirContent).length === 0) {
                appendOutput("Directory is empty.", "slate-400");
                return;
            }
            let result = "";
            Object.keys(dirContent).forEach(key => {
                const item = dirContent[key];
                if (item.type === "dir") {
                    result += `<span class="text-cyan-400 font-bold mr-4">📁 ${key}/</span>`;
                } else {
                    const mode = item.mode || "rw-r--r--";
                    result += `<span class="text-slate-200 mr-4" title="perms: ${mode}">📄 ${key}</span>`;
                }
            });
            appendOutput(result);
        }

        // Swapping directories inside RAMFS
        function changeDirectory(dir) {
            if (!dir || dir === "~" || dir === "workspace") {
                currentPath = ["workspace"];
            } else if (dir === "etc") {
                currentPath = ["etc"];
            } else if (fileSystem[dir] && fileSystem[dir].type === "dir") {
                currentPath = [dir];
            } else {
                appendOutput(`cd: no such file or directory: ${dir}`, "rose-400");
                return;
            }
            const pathText = "/" + currentPath.join("/");
            currentPathLabel.innerText = pathText;
            promptDecorator.innerHTML = isSSHActive 
                ? `${sshTargetServer}:<span class="text-cyan-400">${pathText}</span>#`
                : `root@cloud-shell:<span id="current-path" class="text-cyan-400">${pathText}</span>#`;
        }

        // Cat utility to parse files
        function catFile(filePath) {
            if (!filePath) {
                appendOutput("Usage: cat [filename]", "amber-500");
                return;
            }
            let folder = currentPath[0];
            let file = filePath;
            if (filePath.includes('/')) {
                const parts = filePath.split('/');
                folder = parts[0];
                file = parts[1];
            }

            if (fileSystem[folder] && fileSystem[folder].content[file]) {
                const item = fileSystem[folder].content[file];
                if (item.type === "file") {
                    const safeContent = item.content
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/\n/g, "<br>");
                    appendOutput(safeContent);
                } else {
                    appendOutput(`cat: ${filePath}: Is a directory`, "rose-400");
                }
            } else {
                appendOutput(`cat: ${filePath}: No such file or directory`, "rose-400");
            }
        }

        // File creation inside current tree
        function touchFile(filePath) {
            if (!filePath) {
                appendOutput("Usage: touch [filename]", "amber-500");
                return;
            }
            const dirContent = getActiveDir();
            if (dirContent) {
                if (!dirContent[filePath]) {
                    dirContent[filePath] = { type: "file", content: "", mode: "rw-r--r--" };
                    refreshFileExplorer();
                    appendOutput(`Created empty file: ${filePath}`, "emerald-400");
                } else {
                    appendOutput(`File ${filePath} updated timestamp.`, "amber-400");
                }
            }
        }

        // Directory creation inside virtual environment
        function createDirectory(dirPath) {
            if (!dirPath) {
                appendOutput("Usage: mkdir [directory_name]", "amber-500");
                return;
            }
            if (fileSystem[dirPath]) {
                appendOutput(`mkdir: cannot create directory '${dirPath}': File or directory exists`, "rose-400");
            } else {
                fileSystem[dirPath] = { type: "dir", content: {} };
                refreshFileExplorer();
                appendOutput(`Created directory: ${dirPath}`, "emerald-400");
            }
        }

        // RM logic deletes workspace entities
        function removeTarget(targetPath) {
            if (!targetPath) {
                appendOutput("Usage: rm [file_or_directory]", "amber-500");
                return;
            }
            const dirContent = getActiveDir();
            if (dirContent && dirContent[targetPath]) {
                delete dirContent[targetPath];
                refreshFileExplorer();
                appendOutput(`Removed file: ${targetPath}`, "emerald-400");
            } else if (fileSystem[targetPath] && fileSystem[targetPath].type === "dir") {
                delete fileSystem[targetPath];
                refreshFileExplorer();
                appendOutput(`Removed directory: ${targetPath}`, "emerald-400");
            } else {
                appendOutput(`rm: cannot remove '${targetPath}': No such file or directory`, "rose-400");
            }
        }

        // Render structured directory graph
        function showTree() {
            let output = ".<br>";
            Object.keys(fileSystem).forEach((dir, dirIndex, dirArr) => {
                const isLastDir = dirIndex === dirArr.length - 1;
                const dirPrefix = isLastDir ? "└── " : "├── ";
                output += `${dirPrefix}<span class="text-cyan-400 font-bold">${dir}/</span><br>`;
                
                const files = Object.keys(fileSystem[dir].content);
                files.forEach((file, fileIndex) => {
                    const isLastFile = fileIndex === files.length - 1;
                    const fileLinePrefix = isLastDir ? "    " : "│   ";
                    const filePrefix = isLastFile ? "└── " : "├── ";
                    output += `${fileLinePrefix}${filePrefix}<span class="text-slate-300">${file}</span><br>`;
                });
            });
            appendOutput(output);
        }

        // Standard custom visual dashboard specifications sheet
        function showNeofetch() {
            appendOutput(`
<div class="flex gap-4 items-center mt-2">
  <div class="text-indigo-400 font-bold font-mono whitespace-pre text-xs leading-none">
   /\\_/\\
  ( o.o )
   &gt; ^ &lt;
  [NEO-X]
  </div>
  <div class="text-xs space-y-0.5 font-mono">
    <p class="font-bold text-indigo-400">root@cloud-shell</p>
    <p class="text-slate-700">-------------------------</p>
    <p><span class="font-semibold text-slate-400">OS:</span> CloudConsole Simulator Suite v3.1</p>
    <p><span class="font-semibold text-slate-400">Kernel:</span> WebAssembly Sandbox Ring-0 VM</p>
    <p><span class="font-semibold text-slate-400">Uptime:</span> Online</p>
    <p><span class="font-semibold text-slate-400">Shell:</span> custom-bash-sh v4.2</p>
    <p><span class="font-semibold text-slate-400">Terminal Theme:</span> ${currentActiveTheme.toUpperCase()}</p>
    <p><span class="font-semibold text-slate-400">Memory:</span> 512MB Virtual RAMFS Allocated</p>
  </div>
</div>
            `);
        }

        // Visual inline text editor commands and interface operations
        function openNano(filePath) {
            if (!filePath) {
                appendOutput("Usage: nano [filename]", "amber-500");
                return;
            }
            activeEditorFilePath = filePath;
            let content = "";
            
            let folder = currentPath[0];
            let file = filePath;
            if (filePath.includes('/')) {
                const parts = filePath.split('/');
                folder = parts[0];
                file = parts[1];
            }

            if (fileSystem[folder] && fileSystem[folder].content[file]) {
                content = fileSystem[folder].content[file].content;
            }

            nanoFilename.innerText = filePath;
            nanoTextarea.value = content;
            nanoEditor.classList.remove('hidden');
            nanoTextarea.focus();
            isInputLocked = true;
        }

        function saveNano() {
            if (!activeEditorFilePath) return;
            
            let folder = currentPath[0];
            let file = activeEditorFilePath;
            if (activeEditorFilePath.includes('/')) {
                const parts = activeEditorFilePath.split('/');
                folder = parts[0];
                file = parts[1];
            }

            if (!fileSystem[folder]) {
                fileSystem[folder] = { type: "dir", content: {} };
            }

            fileSystem[folder].content[file] = {
                type: "file",
                content: nanoTextarea.value,
                mode: "rw-r--r--"
            };

            refreshFileExplorer();
            showToast(`Saved ${activeEditorFilePath} successfully!`, "success");
        }

        function closeNano() {
            nanoEditor.classList.add('hidden');
            isInputLocked = false;
            activeEditorFilePath = null;
            terminalInput.focus();
        }

        // ==========================================
        // VIM TEXT EDITOR SIMULATOR COMPONENT ENGINE
        // ==========================================
        function openVim(filePath) {
            if (!filePath) {
                appendOutput("Usage: vim [filename]", "amber-500");
                return;
            }
            vimFilePath = filePath;
            isVimActive = true;
            isInputLocked = true;
            vimMode = "NORMAL";
            vimCommandText = "";
            vimCursorRow = 0;
            vimCursorCol = 0;

            let folder = currentPath[0];
            let file = filePath;
            if (filePath.includes('/')) {
                const parts = filePath.split('/');
                folder = parts[0];
                file = parts[1];
            }

            let initialContent = "";
            if (fileSystem[folder] && fileSystem[folder].content[file]) {
                initialContent = fileSystem[folder].content[file].content;
            }

            vimLines = initialContent ? initialContent.split('\n') : [""];
            renderVimScreen();
        }

        function renderVimScreen() {
            let container = document.getElementById('vim-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'vim-container';
                container.className = "fixed inset-0 bg-slate-950 text-slate-100 font-mono text-sm z-50 flex flex-col p-4 border border-slate-800 shadow-2xl";
                document.body.appendChild(container);
            } else {
                container.classList.remove('hidden');
            }

            let screenLinesHTML = "";
            for (let i = 0; i < 24; i++) {
                if (i < vimLines.length) {
                    let line = vimLines[i];
                    let formattedLine = "";
                    for (let j = 0; j <= line.length; j++) {
                        const char = line[j] || " ";
                        if (i === vimCursorRow && j === vimCursorCol) {
                            formattedLine += `<span class="bg-indigo-500 text-slate-900 animate-pulse font-bold">${char === " " ? "&nbsp;" : char}</span>`;
                        } else {
                            formattedLine += char === " " ? "&nbsp;" : char.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                        }
                    }
                    screenLinesHTML += `<div class="flex"><span class="text-slate-600 select-none mr-4 w-6 text-right">${i + 1}</span><span class="flex-1">${formattedLine}</span></div>`;
                } else {
                    screenLinesHTML += `<div class="flex"><span class="text-slate-600 select-none mr-4 w-6 text-right">~</span><span class="text-slate-700 flex-1"></span></div>`;
                }
            }

            let bottomBar = "";
            if (vimMode === "NORMAL") {
                bottomBar = `<div class="bg-indigo-900 text-slate-100 px-2 py-0.5 font-bold flex justify-between">
                    <span>-- NORMAL --</span>
                    <span>${vimFilePath} [Lines: ${vimLines.length}]</span>
                    <span>Ln ${vimCursorRow + 1}, Col ${vimCursorCol + 1}</span>
                </div>`;
            } else if (vimMode === "INSERT") {
                bottomBar = `<div class="bg-emerald-900 text-slate-100 px-2 py-0.5 font-bold flex justify-between">
                    <span>-- INSERT --</span>
                    <span>Editing File Mode</span>
                    <span>Ln ${vimCursorRow + 1}, Col ${vimCursorCol + 1}</span>
                </div>`;
            } else if (vimMode === "COMMAND") {
                bottomBar = `<div class="bg-slate-900 text-indigo-400 px-2 py-0.5 font-bold flex justify-between border-t border-slate-800">
                    <span>${vimCommandText}</span>
                    <span>COMMAND PANEL</span>
                </div>`;
            }

            container.innerHTML = `
                <div class="flex justify-between items-center border-b border-slate-800 pb-2 mb-2 text-indigo-400 text-xs font-bold">
                    <span>VIM - VI VIRTUAL FILE CLONE (WASM Shell)</span>
                    <span>[Press Esc for NORMAL Mode] [:wq to save]</span>
                </div>
                <div class="flex-1 overflow-y-auto space-y-0.5 leading-tight">${screenLinesHTML}</div>
                <div class="mt-2">${bottomBar}</div>
            `;
        }

        function handleVimKey(e) {
            e.preventDefault();
            const key = e.key;

            if (vimMode === "NORMAL") {
                if (key === "i" || key === "I") {
                    vimMode = "INSERT";
                } else if (key === ":") {
                    vimMode = "COMMAND";
                    vimCommandText = ":";
                } else if (key === "h") { // Movement left
                    if (vimCursorCol > 0) vimCursorCol--;
                } else if (key === "l") { // Movement right
                    const maxCol = vimLines[vimCursorRow].length;
                    if (vimCursorCol < maxCol) vimCursorCol++;
                } else if (key === "k") { // Movement up
                    if (vimCursorRow > 0) {
                        vimCursorRow--;
                        vimCursorCol = Math.min(vimCursorCol, vimLines[vimCursorRow].length);
                    }
                } else if (key === "j") { // Movement down
                    if (vimCursorRow < vimLines.length - 1) {
                        vimCursorRow++;
                        vimCursorCol = Math.min(vimCursorCol, vimLines[vimCursorRow].length);
                    }
                } else if (key === "g") {
                    // Quick top jump simulation
                    vimCursorRow = 0;
                    vimCursorCol = 0;
                } else if (key === "G") {
                    // Quick bottom jump simulation
                    vimCursorRow = vimLines.length - 1;
                    vimCursorCol = 0;
                } else if (key === "d") {
                    // Line deletion simulation
                    vimClipboard = vimLines[vimCursorRow];
                    vimLines.splice(vimCursorRow, 1);
                    if (vimLines.length === 0) vimLines = [""];
                    vimCursorRow = Math.min(vimCursorRow, vimLines.length - 1);
                    vimCursorCol = 0;
                } else if (key === "y") {
                    // Copy line (yank)
                    vimClipboard = vimLines[vimCursorRow];
                    showToast("Yanked 1 line", "info");
                } else if (key === "p") {
                    // Paste line
                    if (vimClipboard) {
                        vimLines.splice(vimCursorRow + 1, 0, vimClipboard);
                        vimCursorRow++;
                        vimCursorCol = 0;
                    }
                }
            } else if (vimMode === "INSERT") {
                if (key === "Escape") {
                    vimMode = "NORMAL";
                } else if (key === "Backspace") {
                    let currentLine = vimLines[vimCursorRow];
                    if (vimCursorCol > 0) {
                        vimLines[vimCursorRow] = currentLine.slice(0, vimCursorCol - 1) + currentLine.slice(vimCursorCol);
                        vimCursorCol--;
                    } else if (vimCursorRow > 0) {
                        // Merge with previous line
                        vimCursorCol = vimLines[vimCursorRow - 1].length;
                        vimLines[vimCursorRow - 1] += currentLine;
                        vimLines.splice(vimCursorRow, 1);
                        vimCursorRow--;
                    }
                } else if (key === "Enter") {
                    let currentLine = vimLines[vimCursorRow];
                    let leftPart = currentLine.slice(0, vimCursorCol);
                    let rightPart = currentLine.slice(vimCursorCol);
                    vimLines[vimCursorRow] = leftPart;
                    vimLines.splice(vimCursorRow + 1, 0, rightPart);
                    vimCursorRow++;
                    vimCursorCol = 0;
                } else if (key.length === 1) {
                    let currentLine = vimLines[vimCursorRow];
                    vimLines[vimCursorRow] = currentLine.slice(0, vimCursorCol) + key + currentLine.slice(vimCursorCol);
                    vimCursorCol++;
                }
            } else if (vimMode === "COMMAND") {
                if (key === "Escape") {
                    vimMode = "NORMAL";
                } else if (key === "Backspace") {
                    if (vimCommandText.length > 1) {
                        vimCommandText = vimCommandText.slice(0, -1);
                    } else {
                        vimMode = "NORMAL";
                    }
                } else if (key === "Enter") {
                    parseVimCommand(vimCommandText);
                } else if (key.length === 1) {
                    vimCommandText += key;
                }
            }

            renderVimScreen();
        }

        function parseVimCommand(cmd) {
            const raw = cmd.slice(1).trim();
            if (raw === "w") {
                saveVimData();
                vimMode = "NORMAL";
            } else if (raw === "q") {
                closeVimView();
            } else if (raw === "wq" || raw === "x") {
                saveVimData();
                closeVimView();
            } else if (raw === "q!") {
                closeVimView();
            } else {
                showToast("Vim error: command unrecognized", "error");
                vimMode = "NORMAL";
            }
        }

        function saveVimData() {
            let folder = currentPath[0];
            let file = vimFilePath;
            if (vimFilePath.includes('/')) {
                const parts = vimFilePath.split('/');
                folder = parts[0];
                file = parts[1];
            }
            if (!fileSystem[folder]) {
                fileSystem[folder] = { type: "dir", content: {} };
            }
            fileSystem[folder].content[file] = {
                type: "file",
                content: vimLines.join('\n'),
                mode: "rw-r--r--"
            };
            refreshFileExplorer();
            showToast(`Vim successfully saved ${vimFilePath}`, "success");
        }

        function closeVimView() {
            isVimActive = false;
            isInputLocked = false;
            const container = document.getElementById('vim-container');
            if (container) container.classList.add('hidden');
            terminalInput.focus();
        }

        // ==========================================
        // ADVANCED UNIX UTILITIES SIMULATION
        // ==========================================
        function runPs() {
            appendOutput(`
<div class="font-mono text-xs">
  <table class="w-full text-slate-300">
    <tr class="text-emerald-400 font-bold text-left">
      <th>PID</th>
      <th>TTY</th>
      <th>TIME</th>
      <th>CMD</th>
    </tr>
    <tr><td>1</td><td>tty1</td><td>00:00:03</td><td>init/wasm-kernel</td></tr>
    <tr><td>22</td><td>tty1</td><td>00:00:00</td><td>bash</td></tr>
    <tr><td>148</td><td>tty1</td><td>00:00:01</td><td>ps-daemon-suite</td></tr>
  </table>
</div>
            `);
        }

        function runGrep(args) {
            if (args.length < 2) {
                appendOutput("Usage: grep [pattern] [filename]", "amber-500");
                return;
            }
            const pattern = args[0];
            const filePath = args[1];

            let folder = currentPath[0];
            let file = filePath;
            if (filePath.includes('/')) {
                const parts = filePath.split('/');
                folder = parts[0];
                file = parts[1];
            }

            if (fileSystem[folder] && fileSystem[folder].content[file]) {
                const item = fileSystem[folder].content[file];
                if (item.type === "file") {
                    const lines = item.content.split('\n');
                    let count = 0;
                    lines.forEach(line => {
                        if (line.includes(pattern)) {
                            const highlighted = line.replace(new RegExp(pattern, 'g'), `<span class="bg-yellow-500 text-slate-950 font-bold">${pattern}</span>`);
                            appendOutput(highlighted);
                            count++;
                        }
                    });
                    if (count === 0) {
                        appendOutput(`Pattern matching '${pattern}' not found inside file.`, "slate-400");
                    }
                } else {
                    appendOutput(`grep: ${filePath}: Is a directory`, "rose-400");
                }
            } else {
                appendOutput(`grep: ${filePath}: No such file or directory`, "rose-400");
            }
        }

        function runFind(fileName) {
            if (!fileName) {
                appendOutput("Usage: find [filename_pattern]", "amber-500");
                return;
            }
            appendOutput(`Searching virtual RAM disk...`, "slate-500");
            let found = false;
            Object.keys(fileSystem).forEach(dir => {
                Object.keys(fileSystem[dir].content).forEach(file => {
                    if (file.toLowerCase().includes(fileName.toLowerCase())) {
                        appendOutput(`./${dir}/${file}`, "cyan-400");
                        found = true;
                    }
                });
            });
            if (!found) appendOutput("No matching file paths identified.", "slate-500");
        }

        function runChmod(args) {
            if (args.length < 2) {
                appendOutput("Usage: chmod [octal/permissions] [filename]", "amber-500");
                return;
            }
            const perms = args[0];
            const filePath = args[1];

            let folder = currentPath[0];
            let file = filePath;
            if (filePath.includes('/')) {
                const parts = filePath.split('/');
                folder = parts[0];
                file = parts[1];
            }

            if (fileSystem[folder] && fileSystem[folder].content[file]) {
                fileSystem[folder].content[file].mode = perms;
                appendOutput(`Successfully set permission of '${file}' to [${perms}]`, "emerald-400");
            } else {
                appendOutput(`chmod: ${filePath}: File not found`, "rose-400");
            }
        }

        function runWget(url) {
            if (!url) {
                appendOutput("Usage: wget [url]", "amber-500");
                return;
            }
            appendOutput(`Connecting to ${url}... [Mock Connection]`, "slate-400");
            isInputLocked = true;

            setTimeout(() => {
                const fileName = url.split('/').pop() || "downloaded_index.html";
                const dirContent = getActiveDir();
                if (dirContent) {
                    dirContent[fileName] = {
                        type: "file",
                        content: `<!-- Downloaded mock content from ${url} -->\n<!DOCTYPE html>\n<html><body><h1>Wget Successful Download Sync</h1></body></html>`,
                        mode: "rw-r--r--"
                    };
                    refreshFileExplorer();
                    appendOutput(`200 OK Connection Established.\nSaved virtual asset into current workspace as: ${fileName}`, "emerald-400");
                }
                isInputLocked = false;
                terminalInput.focus();
            }, 1500);
        }

        function runCp(src, dst) {
            if (!src || !dst) {
                appendOutput("Usage: cp [source_file] [destination_file]", "amber-500");
                return;
            }
            let folder = currentPath[0];
            if (fileSystem[folder] && fileSystem[folder].content[src]) {
                const fileObj = fileSystem[folder].content[src];
                fileSystem[folder].content[dst] = {
                    type: "file",
                    content: fileObj.content,
                    mode: fileObj.mode || "rw-r--r--"
                };
                refreshFileExplorer();
                appendOutput(`Successfully copied ${src} -> ${dst}`, "emerald-400");
            } else {
                appendOutput(`cp: ${src}: File not found`, "rose-400");
            }
        }

        function runMv(src, dst) {
            if (!src || !dst) {
                appendOutput("Usage: mv [source] [destination]", "amber-500");
                return;
            }
            let folder = currentPath[0];
            if (fileSystem[folder] && fileSystem[folder].content[src]) {
                const fileObj = fileSystem[folder].content[src];
                fileSystem[folder].content[dst] = {
                    type: "file",
                    content: fileObj.content,
                    mode: fileObj.mode || "rw-r--r--"
                };
                delete fileSystem[folder].content[src];
                refreshFileExplorer();
                appendOutput(`Moved ${src} to ${dst}`, "emerald-400");
            } else {
                appendOutput(`mv: source file not found`, "rose-400");
            }
        }

        function runHead(args) {
            if (args.length === 0) {
                appendOutput("Usage: head [-n lines] [filename]", "amber-500");
                return;
            }
            let linesToRead = 5;
            let fileIdx = 0;
            if (args[0] === "-n" && args[1]) {
                linesToRead = parseInt(args[1]);
                fileIdx = 2;
            }
            const filePath = args[fileIdx];

            let folder = currentPath[0];
            if (fileSystem[folder] && fileSystem[folder].content[filePath]) {
                const lines = fileSystem[folder].content[filePath].content.split('\n');
                const out = lines.slice(0, linesToRead).join('\n');
                appendOutput(out);
            } else {
                appendOutput(`head: ${filePath}: File not found`, "rose-400");
            }
        }

        function runTail(args) {
            if (args.length === 0) {
                appendOutput("Usage: tail [-n lines] [filename]", "amber-500");
                return;
            }
            let linesToRead = 5;
            let fileIdx = 0;
            if (args[0] === "-n" && args[1]) {
                linesToRead = parseInt(args[1]);
                fileIdx = 2;
            }
            const filePath = args[fileIdx];

            let folder = currentPath[0];
            if (fileSystem[folder] && fileSystem[folder].content[filePath]) {
                const lines = fileSystem[folder].content[filePath].content.split('\n');
                const out = lines.slice(-linesToRead).join('\n');
                appendOutput(out);
            } else {
                appendOutput(`tail: ${filePath}: File not found`, "rose-400");
            }
        }

        function runDiff(f1, f2) {
            if (!f1 || !f2) {
                appendOutput("Usage: diff [file1] [file2]", "amber-500");
                return;
            }
            let folder = currentPath[0];
            const item1 = fileSystem[folder]?.content[f1];
            const item2 = fileSystem[folder]?.content[f2];

            if (!item1 || !item2) {
                appendOutput("diff: target files are missing", "rose-400");
                return;
            }

            const lines1 = item1.content.split('\n');
            const lines2 = item2.content.split('\n');
            let result = "";

            const maxLen = Math.max(lines1.length, lines2.length);
            for (let i = 0; i < maxLen; i++) {
                if (lines1[i] !== lines2[i]) {
                    if (lines1[i] !== undefined) result += `<span class="text-rose-400">&lt; line ${i+1}: ${lines1[i]}</span><br>`;
                    if (lines2[i] !== undefined) result += `<span class="text-emerald-400">&gt; line ${i+1}: ${lines2[i]}</span><br>`;
                }
            }
            appendOutput(result || "No differences detected. Files match.");
        }

        function runHistory() {
            let output = "";
            commandHistory.forEach((cmd, idx) => {
                output += `${idx + 1}  ${cmd}<br>`;
            });
            appendOutput(output);
        }

        function runAlias(args) {
            if (args.length === 0) {
                let output = "Active user shortcuts:<br>";
                Object.keys(systemAliases).forEach(k => {
                    output += `alias ${k}='${systemAliases[k]}'<br>`;
                });
                appendOutput(output || "No active aliases setup.");
                return;
            }
            const pair = args.join(" ").split("=");
            if (pair.length === 2) {
                const k = pair[0].trim();
                const v = pair[1].replace(/['"]/g, "").trim();
                systemAliases[k] = v;
                appendOutput(`Created alias command: ${k} -> ${v}`, "emerald-400");
            } else {
                appendOutput("Usage: alias key='value'", "amber-500");
            }
        }

        function runExport(args) {
            if (args.length === 0) {
                let output = "";
                Object.keys(systemEnv).forEach(k => {
                    output += `declare -x ${k}="${systemEnv[k]}"<br>`;
                });
                appendOutput(output);
                return;
            }
            const pair = args.join(" ").split("=");
            if (pair.length === 2) {
                const k = pair[0].trim();
                const v = pair[1].replace(/['"]/g, "").trim();
                systemEnv[k] = v;
                appendOutput(`Exported Env: ${k}=${v}`, "emerald-400");
            } else {
                appendOutput("Usage: export key=value", "amber-500");
            }
        }

        // Network simulation utilities (ping)
        function runPing(ip) {
            if (!ip) {
                appendOutput("Usage: ping [ip_or_host]", "amber-500");
                return;
            }
            appendOutput(`PING ${ip} (56 data bytes)...`, "slate-400");
            isInputLocked = true;
            let count = 0;
            
            runningProcessInterval = setInterval(() => {
                const rtt = (Math.random() * 15 + 5).toFixed(1);
                appendOutput(`64 bytes from ${ip}: icmp_seq=${count + 1} ttl=64 time=${rtt} ms`);
                count++;
                if (count >= 4) {
                    clearInterval(runningProcessInterval);
                    appendOutput("<br>--- " + ip + " ping statistics ---", "slate-400");
                    appendOutput(`4 packets transmitted, 4 received, 0% packet loss, time 3004ms`, "emerald-400");
                    isInputLocked = false;
                    terminalInput.focus();
                }
            }, 800);
        }

        // Web API network request testing simulations (curl)
        function runCurl(url) {
            if (!url) {
                appendOutput("Usage: curl [url]", "amber-500");
                return;
            }
            appendOutput(`Connecting to ${url}...`, "slate-400");
            isInputLocked = true;
            
            setTimeout(() => {
                appendOutput(`HTTP/1.1 200 OK<br>Content-Type: application/json<br>Server: MockCloudNode/3.1.0<br>Connection: close<br><br>{<br>&nbsp;&nbsp;"status": "online",<br>&nbsp;&nbsp;"latency": "4ms",<br>&nbsp;&nbsp;"payload": "Hello from Cloud-Shell virtual host API client response"<br>}`, "emerald-400");
                isInputLocked = false;
                terminalInput.focus();
            }, 1000);
        }

        // Automated execution parser engine (.sh)
        function runScript(filePath) {
            if (!filePath) {
                appendOutput("Usage: bash [script_name]", "amber-500");
                return;
            }
            let folder = currentPath[0];
            let file = filePath;
            if (filePath.includes('/')) {
                const parts = filePath.split('/');
                folder = parts[0];
                file = parts[1];
            }

            if (fileSystem[folder] && fileSystem[folder].content[file]) {
                const script = fileSystem[folder].content[file];
                if (script.type === "file") {
                    const lines = script.content.split('\n');
                    let lineIdx = 0;
                    isInputLocked = true;
                    
                    function runNextLine() {
                        if (lineIdx >= lines.length) {
                            isInputLocked = false;
                            terminalInput.focus();
                            return;
                        }
                        const line = lines[lineIdx].trim();
                        lineIdx++;
                        
                        if (line && !line.startsWith('#')) {
                            if (line.startsWith('echo ')) {
                                let msg = line.substring(5).replace(/['"]/g, '');
                                appendOutput(msg, "slate-200");
                                setTimeout(runNextLine, 500);
                            } else if (line.startsWith('sleep ')) {
                                const sec = parseInt(line.substring(6)) * 1000 || 1000;
                                setTimeout(runNextLine, sec);
                            } else {
                                executeCommand(line);
                                setTimeout(runNextLine, 500);
                            }
                        } else {
                            runNextLine();
                        }
                    }
                    runNextLine();
                } else {
                    appendOutput(`bash: ${filePath}: Is a directory`, "rose-400");
                }
            } else {
                appendOutput(`bash: ${filePath}: No such script or file found`, "rose-400");
            }
        }

        // Save a virtual file locally
        function downloadFile(filePath) {
            if (!filePath) {
                appendOutput("Usage: download [filename]", "amber-500");
                return;
            }
            let folder = currentPath[0];
            let file = filePath;
            if (filePath.includes('/')) {
                const parts = filePath.split('/');
                folder = parts[0];
                file = parts[1];
            }

            if (fileSystem[folder] && fileSystem[folder].content[file]) {
                const item = fileSystem[folder].content[file];
                if (item.type === "file") {
                    const blob = new Blob([item.content], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = file;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    showToast(`Initiated download of ${file}`, "success");
                    appendOutput(`Success: File downloaded to host system (${file})`, "emerald-400");
                } else {
                    appendOutput(`download: ${filePath}: Is a directory`, "rose-400");
                }
            } else {
                appendOutput(`download: ${filePath}: No such file or directory`, "rose-400");
            }
        }

        // Real-time task dashboard loop (htop)
        function runHtop() {
            isInputLocked = true;
            appendOutput("Initializing simulated task monitor htop...", "slate-400");
            
            let counter = 0;
            runningProcessInterval = setInterval(() => {
                counter++;
                if (counter === 1) {
                    terminalHistory.innerHTML = "";
                    appendOutput(`
<div class="font-mono text-xs space-y-2">
  <p class="text-emerald-400 font-bold">[CPU]  ||||||||||||||||||||||||||||||||| 58.2%</p>
  <p class="text-indigo-400 font-bold">[Mem]  |||||||||||||||||              32.4M/512.0M</p>
  <p class="text-slate-500">Tasks: 21, 3 running, 18 sleeping</p>
  <br>
  <table class="w-full text-slate-300">
    <tr class="text-emerald-400 font-bold text-left border-b border-slate-800">
      <th class="pb-1">PID</th>
      <th class="pb-1">USER</th>
      <th class="pb-1">CPU%</th>
      <th class="pb-1">MEM%</th>
      <th class="pb-1">COMMAND</th>
    </tr>
    <tr>
      <td>1012</td>
      <td>root</td>
      <td>41.2</td>
      <td>5.1</td>
      <td>/usr/bin/sim-kernel</td>
    </tr>
    <tr>
      <td>2145</td>
      <td>root</td>
      <td>12.4</td>
      <td>2.3</td>
      <td>systemd-virtual</td>
    </tr>
    <tr>
      <td>3258</td>
      <td>root</td>
      <td>4.6</td>
      <td>0.8</td>
      <td>htop --mock</td>
    </tr>
  </table>
  <br>
  <p class="text-amber-500 font-bold animate-pulse">Press [Ctrl+C] to terminate process view streams...</p>
</div>
                    `);
                }
                if (counter >= 10) {
                    clearInterval(runningProcessInterval);
                    appendOutput("<br>Process runtime completed.", "amber-400");
                    isInputLocked = false;
                    terminalInput.focus();
                }
            }, 1000);
        }

        // Secure Bridge SSH connections
        function handleSSHCommand(args) {
            if (args.length === 0) {
                openSSHModal();
            } else {
                const connStr = args[0];
                if (connStr.includes('@')) {
                    const parts = connStr.split('@');
                    openSSHModal(parts[0], parts[1]);
                } else {
                    openSSHModal('root', connStr);
                }
            }
        }

        function connectSSH() {
            const host = document.getElementById('ssh-host').value;
            const user = document.getElementById('ssh-user').value;
            if (!host || !user) {
                showToast("Username and Host are required!", "error");
                return;
            }
            
            closeSSHModal();
            appendOutput(`Establishing SSH secure connection to ${user}@${host}...`, "slate-400");
            isInputLocked = true;
            
            setTimeout(() => {
                isSSHActive = true;
                sshTargetServer = `${user}@${host}`;
                terminalTitle.innerText = `${sshTargetServer}: ~/workspace`;
                networkBadge.innerText = "REMOTE CONNECTION";
                networkBadge.className = "bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-bold text-[10px] tracking-wide border border-indigo-500/30 font-mono transition-all duration-300";
                
                promptDecorator.innerHTML = `${sshTargetServer}:<span class="text-cyan-400">/workspace</span>#`;
                
                appendOutput(`Connection Established. Remote system virtual architecture synced.`, "emerald-400");
                showToast(`Connected to remote host: ${host}`, "success");
                isInputLocked = false;
                terminalInput.focus();
            }, 1500);
        }

        // Keyboard inputs listener handler
        document.addEventListener('keydown', (e) => {
            // Check first if Vim interceptor takes priority
            if (isVimActive) {
                handleVimKey(e);
                return;
            }

            if (isInputLocked) {
                if (e.ctrlKey && e.key === 'c') {
                    if (runningProcessInterval) {
                        clearInterval(runningProcessInterval);
                        appendOutput("<br>^C Process interrupted by user.", "rose-400");
                        isInputLocked = false;
                        terminalInput.focus();
                    }
                }
                return;
            }

            // Standard Shell Keybinds Intercept
            if (document.activeElement === terminalInput) {
                if (e.key === 'Enter') {
                    const cmd = terminalInput.value;
                    executeCommand(cmd);
                } else if (e.key === 'Tab') {
                    e.preventDefault();
                    completeInputWithTab();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (historyIndex > 0) {
                        historyIndex--;
                        terminalInput.value = commandHistory[historyIndex];
                    }
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (historyIndex < commandHistory.length - 1) {
                        historyIndex++;
                        terminalInput.value = commandHistory[historyIndex];
                    } else {
                        historyIndex = commandHistory.length;
                        terminalInput.value = "";
                    }
                }
            }
        });

        terminalInput.addEventListener('input', () => {
            handleAutocomplete();
        });

        // Nano Keydown Listener (Ctrl+X and Ctrl+O and Indents)
        nanoTextarea.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key.toLowerCase() === 'x') {
                e.preventDefault();
                closeNano();
            } else if (e.ctrlKey && e.key.toLowerCase() === 'o') {
                e.preventDefault();
                saveNano();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.selectionStart;
                const end = this.selectionEnd;
                this.value = this.value.substring(0, start) + "    " + this.value.substring(end);
                this.selectionStart = this.selectionEnd = start + 4;
            }
        });

        // Focus shell on clicking container background workspace
        document.getElementById('terminal-workspace').addEventListener('click', (e) => {
            if (!isInputLocked && !isVimActive && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SPAN' && e.target.tagName !== 'TEXTAREA') {
                terminalInput.focus();
            }
        });

        // Initial setup routines
        window.addEventListener('DOMContentLoaded', () => {
            refreshFileExplorer();
            terminalInput.focus();
        });
    </script>
</body>
</html>
