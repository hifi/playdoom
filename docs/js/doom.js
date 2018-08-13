// uh oh, I'm no JS developer
var Doom = function(canvas, logger) {
    zip.workerScriptsPath = "js/zip/";

    var loadFile = function(path, cb) {
        var r = new XMLHttpRequest();
        r.responseType = 'arraybuffer';
        r.open('GET', path);
        r.addEventListener('load', function() {
            cb(r.response);
        });
        r.send();
    };

    var log = function(text) {
        logger.append(text + "\n");
        logger.scrollTop = logger.scrollHeight;
    };

    var unzip = function(data, files, callback) {
        var out = [];

        zip.createReader(new zip.BlobReader(new Blob([data], { type: 'application/zip' })), function(reader) {
            reader.getEntries(function(entries) {
                for (var i in entries) {
                    var e = entries[i];
                    if (files.indexOf(e.filename) > -1) {
                        (function(e) {
                            log('... ' + e.filename);
                            e.getData(new zip.BlobWriter(), function(edata) {
                                out[e.filename] = edata;
                                if (Object.keys(out).length == files.length) {
                                    callback(out);
                                }
                            });
                        })(e);
                    }
                }
            });
        });
    };

    var joinBlobsAsArrayBuffer = function(blobs, callback) {
        var out = [];
        var train = [];

        train[blobs.length] = function() {
            var totalSize = 0;
            for (var i in out) {
                totalSize += out[i].byteLength;
            }

            var joined = new Uint8Array(totalSize);

            var pos = 0;
            for (var i in out) {
                joined.set(new Uint8Array(out[i]), pos);
                pos += out[i].byteLength;
            }

            callback(joined.buffer);
        };

        for (var i = blobs.length - 1; i >= 0; i--) {
            train[i] = (function(b, next) {
                return function() {
                    var r = new FileReader();
                    r.onload = function(e) {
                        out.push(e.target.result);
                        next();
                    };
                    r.readAsArrayBuffer(b);
                };
            })(blobs[i], train[i + 1]);
        }

        train[0]();
    };

    var startChocolateDoom = function(iwad) {
        log('Preload completed, launching Chocolate-Doom');
        log('');

        window.Module = {
            print: log,
            printErr: log,
            canvas: document.getElementById('game'),
            preRun: [
            ]
        };
        Module["preRun"].push(function() {
            FS.writeFile('/doom1.wad', new Uint8Array(iwad));
            FS.writeFile('/default.cfg', [
                "use_mouse 0",
            ].join("\n"));
            FS.writeFile('/chocolate-doom.cfg', [
                "fullscreen 0",
                "grabmouse 0"
            ].join("\n"));
        });
        var s = document.createElement('script');
        s.src = 'js/chocolate-doom.js';
        document.getElementsByTagName('body')[0].append(s);
    };

    log('doom.js init');

    log('Loading doom19s.zip...');

    loadFile('doom19s.zip', function(file) {
        log('Extracting doom19s.zip...');

        unzip(file, ['DOOMS_19.1', 'DOOMS_19.2'], function(files) {
            log('Combining DOOMS_19.1 and DOOMS_19.2 as DOOM_19.zip...');

            joinBlobsAsArrayBuffer([ files['DOOMS_19.1'], files['DOOMS_19.2'] ], function(innerZip) {
                log('Extracting DOOM1.WAD from DOOMS_19.zip...');
                unzip(innerZip, ['DOOM1.WAD'], function(innerFiles) {
                    joinBlobsAsArrayBuffer([ innerFiles['DOOM1.WAD'] ], startChocolateDoom);
                });
            });
        });
    });
};
