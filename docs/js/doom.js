// uh oh, I'm no JS developer (but I'm getting better)
class Doom {
    constructor(canvas, logger) {
        this.canvas = canvas;
        this.logger = logger;
        zip.workerScriptsPath = "js/zip/";
        this.init();
    }

    async init() {
        this.log('doom.js init');
        this.log('Loading doom19s.zip...');

        var file = await Doom.loadFile('doom19s.zip');

        this.log('Extracting doom19s.zip...');

        var files = await this.unzip(new Blob([file], { type: 'application/zip' }), ['DOOMS_19.1', 'DOOMS_19.2']);

        this.log('Combining DOOMS_19.1 and DOOMS_19.2 as DOOM_19.zip...');
        var innerZip = new Blob([ files['DOOMS_19.1'], files['DOOMS_19.2'] ], { type: 'application/zip' });

        this.log('Extracting DOOM1.WAD from DOOMS_19.zip...');
        var innerFiles = await this.unzip(innerZip, ['DOOM1.WAD']);

        var iwad = await new Promise(resolve => {
            var r = new FileReader();
            r.onload = function(e) {
                resolve(e.target.result);
            };
            r.readAsArrayBuffer(innerFiles['DOOM1.WAD']);
        });

        this.run(iwad);
    }

    static loadFile(path, cb) {
        return new Promise(resolve => {
            var r = new XMLHttpRequest();
            r.responseType = 'arraybuffer';
            r.open('GET', path);
            r.addEventListener('load', function() {
                resolve(r.response);
            });
            r.send();
        });
    }

    log(text) {
        this.logger.append(text + "\n");
        this.logger.scrollTop = this.logger.scrollHeight;
    }

    unzip(data, files) {
        var d = this;
        return new Promise(resolve => {
            var out = [];

            zip.createReader(new zip.BlobReader(data), function(reader) {
                reader.getEntries(function(entries) {
                    for (var e of entries) {
                        if (files.indexOf(e.filename) == -1)
                            continue;

                        (function(e,d) {
                            d.log('... ' + e.filename);
                            e.getData(new zip.BlobWriter(), function(edata) {
                                out[e.filename] = edata;
                                if (Object.keys(out).length == files.length) {
                                    resolve(out);
                                }
                            });
                        })(e,d);
                    }
                });
            });
        });
    }

    run(iwad) {
        this.log('Preload completed, launching Chocolate-Doom');
        this.log('');

        var d = this;
        window.Module = {
            print: function(s) { d.log(s); },
            printErr: function(s) { d.log(s); },
            canvas: document.getElementById('game'),
            arguments: [ '-iwad',  '/doom1.wad' ],
            quit: function() {
                FS.syncfs(false, function(e) { console.log('syncfs false failed: ' + e); });
            },
            preRun: [
            ]
        };

        Module["preRun"].push(function() {
            FS.mkdir('/data');
            FS.mount(IDBFS, {}, '/data');
            FS.chdir('/data');

            FS.writeFile('/doom1.wad', new Uint8Array(iwad));
            runDependencies++;

            d.log('Going to sync config from IndexedDB...');
            FS.syncfs(true, function(e) {
                try {
                    FS.lookupPath('/data/default.cfg');
                } catch(e) {
                    console.log('Creating new default.cfg');
                    FS.writeFile('/data/default.cfg', [
                        "use_mouse 0",
                        "screenblocks 10",
                    ].join("\n"));
                }

                try {
                    FS.lookupPath('/data/chocolate-doom.cfg');
                } catch(e) {
                    console.log('Creating new chocolate-doom.cfg');
                    FS.writeFile('/data/chocolate-doom.cfg', [
                        "fullscreen 0",
                        "grabmouse 0"
                    ].join("\n"));
                }

                d.log('Sync from IndexedDB done, starting app.');
                runDependencies--;
                run();
            });
        });

        var s = document.createElement('script');
        s.src = 'js/chocolate-doom.js';
        document.getElementsByTagName('body')[0].append(s);
    }
};
