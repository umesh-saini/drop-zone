#!/usr/bin/env node
/**
 * Reads xterm.js, xterm-addon-fit, and xterm.css from node_modules
 * and writes a self-contained terminal HTML string to src/terminalHtml.ts
 *
 * Run: node scripts/build-terminal-html.js
 */

const fs = require('fs');
const path = require('path');

const xtermJs = fs.readFileSync(path.join(__dirname, '../node_modules/xterm/lib/xterm.js'), 'utf8');
const fitJs = fs.readFileSync(
  path.join(__dirname, '../node_modules/xterm-addon-fit/lib/xterm-addon-fit.js'),
  'utf8'
);
const xtermCss = fs.readFileSync(
  path.join(__dirname, '../node_modules/xterm/css/xterm.css'),
  'utf8'
);

const html = `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
    <style>
${xtermCss}
      html, body {
        margin: 0;
        padding: 0;
        background-color: #0a0a0a;
        height: 100%;
        overflow: hidden;
      }
      #terminal {
        height: 100%;
        width: 100%;
        padding: 4px;
        box-sizing: border-box;
      }
    </style>
  </head>
  <body>
    <div id="terminal"></div>
    <script>
${xtermJs}
    </script>
    <script>
${fitJs}
    </script>
    <script>
      (function() {
        try {
          // xterm UMD sets Terminal on self/window
          var TerminalClass = window.Terminal || (typeof Terminal !== 'undefined' ? Terminal : null);
          var FitAddonClass = (window.FitAddon && window.FitAddon.FitAddon)
            || (typeof FitAddon !== 'undefined' ? FitAddon.FitAddon : null);

          if (!TerminalClass) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'Terminal class not found' }));
            return;
          }

          window.term = new TerminalClass({
            theme: {
              background: '#0a0a0a',
              foreground: '#f3f4f6',
              cursor: '#f3f4f6',
              cursorAccent: '#0a0a0a',
              selectionBackground: 'rgba(255,255,255,0.3)',
            },
            fontFamily: 'Menlo, Monaco, Courier New, monospace',
            fontSize: 14,
            cursorBlink: true,
            disableStdin: false,
          });

          if (FitAddonClass) {
            var fitAddon = new FitAddonClass();
            window.term.loadAddon(fitAddon);
            window.term.open(document.getElementById('terminal'));
            fitAddon.fit();

            window.addEventListener('resize', function() {
              fitAddon.fit();
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'resize',
                cols: window.term.cols,
                rows: window.term.rows,
              }));
            });
          } else {
            window.term.open(document.getElementById('terminal'));
          }

          window.term.onData(function(data) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'data', data: data }));
          });

          // Signal native that xterm is ready and send initial size
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'resize',
            cols: window.term.cols,
            rows: window.term.rows,
          }));
          window.term.focus();
        } catch(err) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: err.message }));
        }
      })();
    </script>
  </body>
</html>`;

// Escape backticks and template literal delimiters so it can sit inside a TS template literal
const escaped = html.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const output = `// AUTO-GENERATED — do not edit manually
// Run: node scripts/build-terminal-html.js
export const terminalHtml = \`${escaped}\`;
`;

const outPath = path.join(__dirname, '../src/terminalHtml.ts');
fs.writeFileSync(outPath, output, 'utf8');
console.log('Written to', outPath);
