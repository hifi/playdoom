'use strict';

// Target browsers based on included WebAssembly support:
//   Edge 16+
//   Firefox 52+ (excluding 52 ESR)
//   Chrome 57+ (includes WebView)
//   macOS Safari 11+
//   OS Safari 11.2+

// Tested browsers: Firefox 61, Chromium 68, Edge 17

class Doom {
    constructor(canvas, logger = console.log) {
        this.canvas = canvas;
        this.log = logger;

        this.log('doom.js init');
        this.wasmLoader = new Promise(resolve => {
            const s = document.createElement('script');
            s.async = true;
            s.src = 'js/chocolate-doom.js';
            s.onload = resolve;
            document.getElementsByTagName('body')[0].append(s);
        });
    }

    async run(iwad) {
        this.log('Waiting for WebAssembly to finish loading...');
        await this.wasmLoader;

        this.log('Launching Chocolate Doom');
        this.log('');

        const game = DoomModule({
            print: s => this.log(s),
            printErr: s => this.log(s, 'error'),
            canvas: this.canvas,
            arguments: [ '-iwad',  '/game.wad' ],
        });
        game.preRun.push(() => {
            game.FS.writeFile('/game.wad', iwad);

            game.FS.writeFile('/default.cfg', JSON.parse(localStorage.getItem('default.cfg')) || [
                "use_mouse 0",
                "screenblocks 10",
            ].join("\n"));

            game.FS.writeFile('/chocolate-doom.cfg', JSON.parse(localStorage.getItem('chocolate-doom.cfg')) || [
                "fullscreen 0",
                "grabmouse 0"
            ].join("\n"));
        });
        game.quit = () => {
            localStorage.setItem(
                'default.cfg',
                JSON.stringify(game.FS.readFile('/default.cfg', { encoding: 'utf8' }))
            );
            localStorage.setItem(
                'chocolate-doom.cfg',
                JSON.stringify(game.FS.readFile('/chocolate-doom.cfg', { encoding: 'utf8' }))
            );
        };
    }
};
