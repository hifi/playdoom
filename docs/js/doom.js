// uh oh, I'm no JS developer (but I'm getting better)
class Doom {
    constructor(canvas, logger) {
        this.canvas = canvas;
        this.logger = logger;
    }

    static loadModule(path) {
        return new Promise(resolve => {
            const s = document.createElement('script');
            s.async = true;
            s.src = path;
            s.onload = resolve;
            document.getElementsByTagName('body')[0].append(s);
        });
    }

    static loadFile(path) {
        return new Promise(resolve => {
            const r = new XMLHttpRequest();
            r.responseType = 'blob';
            r.open('GET', path);
            r.addEventListener('load', function() {
                resolve(r.response);
            });
            r.send();
        });
    }

    async init() {
        this.log('doom.js init');
        this.log('Lazy loading chocolate-doom.js');
        this.wasmLoader = Doom.loadModule('js/chocolate-doom.js');

        this.log('Loading doom19s.zip...');
        const file = await Doom.loadFile('doom19s.zip');

        this.log('Extracting doom19s.zip...');
        const files = await this.unzip(file, ['DOOMS_19.1', 'DOOMS_19.2']);

        this.log('Combining DOOMS_19.1 and DOOMS_19.2 as DOOM_19.zip...');
        const innerZip = new Blob([ files['DOOMS_19.1'], files['DOOMS_19.2'] ], { type: 'application/zip' });

        this.log('Extracting DOOM1.WAD from DOOMS_19.zip...');
        const innerFiles = await this.unzip(innerZip, ['DOOM1.WAD']);

        this.iwad = await new Promise(resolve => {
            const r = new FileReader();
            r.onload = function(e) {
                resolve(e.target.result);
            };
            r.readAsArrayBuffer(innerFiles['DOOM1.WAD']);
        });
    }

    log(text) {
        this.logger.append(text + "\n");
        this.logger.scrollTop = this.logger.scrollHeight;
    }

    // this still needs a refactor
    unzip(data, files) {
        return new Promise(resolve => {
            let out = [];

            zip.createReader(new zip.BlobReader(data), reader => {
                reader.getEntries(entries => {
                    for (let e of entries) {
                        if (files.indexOf(e.filename) == -1)
                            continue;

                        this.log('... ' + e.filename);
                        e.getData(new zip.BlobWriter(), function(edata) {
                            out[e.filename] = edata;
                            if (Object.keys(out).length == files.length) {
                                resolve(out);
                            }
                        });
                    }
                });
            });
        });
    }

    async run() {
        this.log('Waiting for WebAssembly to finish loading...');
        await this.wasmLoader;

        this.log('Init completed, launching Chocolate Doom');
        this.log('');

        const game = DoomModule({
            print: s => this.log(s),
            printErr: s => this.log('E: ' + s),
            canvas: this.canvas,
            arguments: [ '-iwad',  '/doom1.wad' ],
        });
        game.preRun.push(() => {
            game.FS.writeFile('/doom1.wad', new Uint8Array(this.iwad));

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
