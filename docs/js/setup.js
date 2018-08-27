'use strict';

class DoomSetup {
    constructor(canvas, logger = console.log) {
        this.canvas = canvas;
        this.log = logger;

        this.log('setup.js init');
        this.wasmLoader = new Promise(resolve => {
            const s = document.createElement('script');
            s.async = true;
            s.src = 'js/chocolate-setup.js';
            s.onload = resolve;
            document.getElementsByTagName('body')[0].append(s);
        });
    }

    async run() {
        this.log('Waiting for WebAssembly to finish loading...');
        await this.wasmLoader;

        return new Promise(resolve => {
            this.log('Launching Chocolate Doom Setup');
            this.log('');

            const game = DoomSetupModule({
                print: s => this.log(s),
                printErr: s => this.log(s, 'error'),
                canvas: this.canvas
            });
            game.preRun.push(() => {
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
                resolve();
            };
        });
    }
};
