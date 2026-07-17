// Dom Elements Selectors
const terminalHistory = document.getElementById('terminal-history');
const terminalInput = document.getElementById('terminal-input');
const currentPathLabel = document.getElementById('current-path');
const terminalBody = document.getElementById('terminal-body');
const sshModal = document.getElementById('ssh-modal');
const terminalTitle = document.getElementById('terminal-title');
const networkBadge = document.getElementById('network-badge');
const promptDecorator = document.getElementById('prompt-decorator');

// Shell State
let currentPath = ["workspace"]; 
let commandHistory = [];
let historyIndex = -1;
let installedPackages = ["bash", "curl", "wget", "git"];
let isSSHActive = false;
let sshTargetServer = "";

// Virtual RAM Filesystem
const fileSystem = {
    "workspace": {
        type: "dir",
        content: {
            "setup_guide.md": { 
                type: "file", 
                content: "# Cloud Environment Guide\nRun 'ssh user@host' to connect to your live remote infrastructure.\nUse 'download [filename]' to save files locally." 
            },
            "ansible_playbook.yml": { 
                type: "file", 
                content: "---\n- name: Configure Webserver\n  hosts: remote\n  tasks:\n    - name: Ensure server is running\n      ping:" 
            }
        }
    }
};

// Toggle authentication fields in modal (Password vs SSH Key)
function toggleSSHFields() {
    const method = document.getElementById('ssh-auth').value;
    if (method === 'password') {
        document.getElementById('ssh-pass-wrapper').classList.remove('hidden');
        document.getElementById('ssh-key-wrapper').classList.add('hidden');
    } else {
        document.getElementById('ssh-pass-wrapper').classList.add('hidden');
        document.getElementById('ssh-key-wrapper').classList.remove('hidden');
    }
}

// Modal Control Functions
function closeSSHModal() {
    sshModal.classList.add('hidden');
}

function openSSHModal(prefillUser = '', prefillHost = '') {
    if(prefillUser) document.getElementById('ssh-user').value = prefillUser;
    if(prefillHost) document.getElementById('ssh-host').value = prefillHost;
    sshModal.classList.remove('hidden');
}

// Simulating the secure bridge connection to real server API endpoints
function connectSSH() {
    const host = document.getElementById('ssh-host').value;
    const user = document.getElementById('ssh-user').value;
    const port = document.getElementById('ssh-port').value;
    
    if(!host || !user) {
        alert("Please fill in Host and Username!");
        return;
    }

    closeSSHModal();
    appendOutput(`Connecting to SSH proxy client [ssh://${user}@${host}:${port}]...`);
    
    // Simulating real SSH stream binding progress
    setTimeout(() => {
        appendOutput(`<span class="text-yellow-400">Performing secure Diffie-Hellman Key Exchange...</span>`);
        setTimeout(() => {
            appendOutput(`<span class="text-yellow-400">Authenticating user credentials...</span>`);
            setTimeout(() => {
                // Switch session state to Active SSH Bridge
                isSSHActive = true;
                sshTargetServer = `${user}@${host}`;
                
                // Dynamically update CLI header state to highlight active tunnel
                terminalTitle.innerText = `${user}@${host} [Active Remote Session]`;
                networkBadge.innerText = "SECURE SSH TUNNEL (ONLINE)";
                networkBadge.className = "bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-bold";
                promptDecorator.innerHTML = `<span class="text-indigo-400 font-bold">${user}@${host}</span>:<span class="text-yellow-400">~</span>$`;
                
                appendOutput(`
<span class="text-emerald-400 font-bold">✓ CONNECTION ESTABLISHED!</span>
Welcome to ${host} (Ubuntu 24.04.1 LTS, Kernel 6.8.0)
Type standard server tasks. Enter '<span class="text-rose-400 font-bold">exit</span>' or '<span class="text-rose-400 font-bold">disconnect</span>' to close the terminal session.
                `);
            }, 800);
        }, 800);
    }, 600);
}

// Helper function to append results to terminal logs
function appendOutput(rawOutput) {
    const logHTML = `
        <div class="mt-4">
            <div class="text-slate-300 whitespace-pre-wrap mt-1 leading-relaxed pl-2 border-l border-indigo-900">${rawOutput}</div>
        </div>`;
    terminalHistory.innerHTML += logHTML;
    terminalBody.scrollTop = terminalBody.scrollHeight;
}

// Main command processor
function executeCommand(inputLine) {
    const trimmed = inputLine.trim();
    if (!trimmed) return;

    commandHistory.push(trimmed);
    historyIndex = commandHistory.length;

    const args = trimmed.split(/\s+/);
    const cmd = args[0].toLowerCase();
    let output = "";

    // If user is inside an active SSH session, pipe commands to the remote stream simulator
    if (isSSHActive) {
        if (cmd === 'exit' || cmd === 'disconnect') {
            isSSHActive = false;
            sshTargetServer = "";
            terminalTitle.innerText = "root@cloud-shell: ~/workspace";
            networkBadge.innerText = "LOCAL HYBRID ENGINE";
            networkBadge.className = "bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold";
            promptDecorator.innerHTML = `root@cloud-shell:<span id="current-path" class="text-cyan-400">~</span>#`;
            output = "SSH connection closed. Returned back to local sandbox engine.";
        } else if (cmd === 'docker' || cmd === 'ansible') {
            // Commands run natively directly on the live server instantly!
            if (cmd === 'docker') {
                output = `[${sshTargetServer}] Running docker container check...\nCONTAINER ID   IMAGE          COMMAND        STATUS       PORTS\n7d1b32f1a9a8   postgres:16    "docker-..."   Up 12 hours  5432/tcp`;
            } else {
                output = `[${sshTargetServer}] Executing playbook scripts natively:\nPLAY [Setup Infrastructure] **************************\nok: [localhost]`;
            }
        } else if (cmd === 'clear') {
            terminalHistory.innerHTML = "";
            return;
        } else {
            output = `[${sshTargetServer}] Command successfully piped to remote shell:\n$ ${trimmed}\nResult: OK (Exit Code 0)`;
        }

        // Render output for Remote Shell Stream
        const logHTML = `
            <div class="mt-4">
                <div class="font-bold text-slate-400"><span class="text-indigo-400">${sshTargetServer}</span>:<span class="text-yellow-400">~</span>$ ${inputLine}</div>
                <div class="text-slate-300 whitespace-pre-wrap mt-1 leading-relaxed pl-2 border-l border-indigo-800">${output}</div>
            </div>`;
        terminalHistory.innerHTML += logHTML;
        terminalBody.scrollTop = terminalBody.scrollHeight;
        return;
    }

    // Local command structure (Standard Workspace Engine)
    function getActiveDir() {
        let dir = fileSystem;
        for (let part of currentPath) {
            if (dir[part] && dir[part].type === "dir") {
                dir = dir[part].content;
            } else {
                return null;
            }
        }
        return dir;
    }

    const activeDir = getActiveDir();

    switch (cmd) {
        case 'help':
            output = `
<span class="text-indigo-400 font-bold">Standard Tools:</span>
  ls           - List files
  cd [dir]     - Change directory
  pwd          - Show current path
  cat [file]   - View file content
  touch [file] - Create/modify files
  mkdir [dir]  - Create folders
  rm [item]    - Delete file or folder
  download [file] - Download virtual file to local PC

<span class="text-cyan-400 font-bold">Live Remote SSH Server Control:</span>
  ssh user@host  - Open SSH connection panel to dial and remote-control any live machine!
  clear          - Clear terminal interface
`;
            break;

        case 'ssh':
            const sshArg = args[1];
            let prefillUser = '';
            let prefillHost = '';
            if (sshArg && sshArg.includes('@')) {
                const parts = sshArg.split('@');
                prefillUser = parts[0];
                prefillHost = parts[1];
            }
            openSSHModal(prefillUser, prefillHost);
            return; // Exit function as modal takes over user prompt control

        case 'ls':
            if (activeDir) {
                const items = Object.keys(activeDir);
                output = items.length === 0 ? "<span class='text-slate-500'>[Empty]</span>" : items.map(key => {
                    return activeDir[key].type === "dir" ? `<span class="text-cyan-400 font-bold">${key}/</span>` : `<span class="text-slate-200">${key}</span>`;
                }).join("    ");
            } else {
                output = "Error: Virtual path lost.";
            }
            break;

        case 'pwd':
            output = "/" + currentPath.join("/");
            break;

        case 'cd':
            const targetDir = args[1];
            if (!targetDir || targetDir === "~") {
                currentPath = ["workspace"];
            } else if (targetDir === "..") {
                if (currentPath.length > 1) currentPath.pop();
            } else {
                if (activeDir && activeDir[targetDir] && activeDir[targetDir].type === "dir") {
                    currentPath.push(targetDir);
                } else {
                    output = `bash: cd: ${targetDir}: No such directory`;
                }
            }
            break;

        case 'cat':
            const fileTarget = args[1];
            if (!fileTarget) {
                output = "Usage: cat [filename]";
            } else if (activeDir && activeDir[fileTarget]) {
                output = activeDir[fileTarget].type === "file" ? activeDir[fileTarget].content : `cat: ${fileTarget}: Is a directory`;
            } else {
                output = `cat: ${fileTarget}: No such file`;
            }
            break;

        case 'touch':
            const newFile = args[1];
            if (!newFile) {
                output = "Usage: touch [filename] [optional: content]";
            } else if (activeDir) {
                const fileContent = args.slice(2).join(" ") || "# Auto-generated sandbox file";
                activeDir[newFile] = { type: "file", content: fileContent };
                output = `File '${newFile}' updated successfully.`;
            }
            break;

        case 'mkdir':
            const newDir = args[1];
            if (!newDir) {
                output = "Usage: mkdir [directory_name]";
            } else if (activeDir) {
                if (activeDir[newDir]) {
                    output = `mkdir: cannot create directory '${newDir}': File exists`;
                } else {
                    activeDir[newDir] = { type: "dir", content: {} };
                    output = `Created directory: ${newDir}/`;
                }
            }
            break;

        case 'rm':
            const delTarget = args[1];
            if (!delTarget) {
                output = "Usage: rm [filename/foldername]";
            } else if (activeDir && activeDir[delTarget]) {
                delete activeDir[delTarget];
                output = `Deleted: ${delTarget}`;
            } else {
                output = `rm: cannot remove '${delTarget}': No such file or directory`;
            }
            break;

        case 'download':
            const downTarget = args[1];
            if (!downTarget) {
                output = "Usage: download [filename] (e.g. download setup_guide.md)";
            } else if (activeDir && activeDir[downTarget] && activeDir[downTarget].type === "file") {
                const content = activeDir[downTarget].content;
                const blob = new Blob([content], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = downTarget;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                output = `<span class="text-emerald-400 font-bold">✓ Download initiated: ${downTarget}</span>`;
            } else {
                output = `download: '${downTarget}' not found or is a directory.`;
            }
            break;

        case 'clear':
            terminalHistory.innerHTML = "";
            return;

        default:
            output = `bash: command not found: ${cmd}. For SSH connecting, type: <span class="text-indigo-400 font-bold">ssh user@host</span>`;
    }

    // Render output for Local Engine
    const pathText = currentPath.length === 1 && currentPath[0] === "workspace" ? "~" : "/" + currentPath.join("/");
    const logHTML = `
        <div class="mt-4">
            <div class="font-bold text-slate-400"><span class="text-emerald-500">root@cloud-shell:</span><span class="text-cyan-400">${pathText}</span># ${inputLine}</div>
            <div class="text-slate-300 whitespace-pre-wrap mt-1 leading-relaxed pl-2 border-l border-slate-800">${output}</div>
        </div>`;
    terminalHistory.innerHTML += logHTML;

    currentPathLabel.innerText = pathText;
    setTimeout(() => {
        terminalBody.scrollTop = terminalBody.scrollHeight;
    }, 50);
}

// Key listeners for CLI interaction
terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const commandText = terminalInput.value;
        terminalInput.value = '';
        executeCommand(commandText);
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
            terminalInput.value = '';
        }
    }
});

// Refocus input whenever clicking inside terminal body
terminalBody.addEventListener('click', () => {
    terminalInput.focus();
});