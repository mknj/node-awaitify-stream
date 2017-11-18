const fs = require('fs');
const aw = require('../lib/awaitify-stream.js');
const assert = require('assert');

const mainTestFile = 'test/txt/threeConstantLines.lftxt';
const expectedLines = ['foo\n', 'bar\n', 'baz\n'];
const constantLineLength = 4; // 3 letters and a newline character.

function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    })
}

// Do a second loop over all the tests to confirm that delays from asynchronous work don't affect reading or writing.
for (let readSlowly of [false, true]) {
    describe(`awaitify-stream (readSlowly: ${readSlowly})`, function() {
        describe(`just awaitify-stream`, function() {
            // Read constant-length lines without byline.
            async function readConstantLines(testFile) {
                let readStream = fs.createReadStream(testFile);
                readStream.setEncoding('utf8');

                let reader = aw.createReader(readStream);

                let line, lines = [];
                while (null !== (line = await reader.readAsync(constantLineLength))) {
                    lines.push(line);

                    if (readSlowly) {
                        await delay(100);
                    }
                }

                return lines;
            }

            it('should read test.js successfully', async function () {
                const testFile = 'test/test.js';

                let readStream = fs.createReadStream(testFile);
                let reader = aw.createReader(readStream);

                let chunk, chunkCount = 0;
                while (null !== (chunk = await reader.readAsync())) {
                    chunkCount++;

                    if (readSlowly) {
                        await delay(100);
                    }
                }

                assert.notEqual(chunkCount, 0, 'test.js should be one chunk or more.');
            });

            it('should read an empty file', async function() {
                const testFile = 'test/txt/empty.txt';

                let readStream = fs.createReadStream(testFile);
                let reader = aw.createReader(readStream);

                let chunk, chunkCount = 0;
                while (null !== (chunk = await reader.readAsync())) {
                    chunkCount++;

                    if (readSlowly) {
                        await delay(100);
                    }
                }

                assert.equal(chunkCount, 0, 'Empty file should have zero chunks.');
            });

            it('should read a one character file', async function () {
                const testFile = 'test/txt/oneChar.txt';

                let readStream = fs.createReadStream(testFile);
                let reader = aw.createReader(readStream);

                let chunk, chunkCount = 0;
                while (null !== (chunk = await reader.readAsync())) {
                    chunkCount++;

                    if (readSlowly) {
                        await delay(100);
                    }
                }

                assert.equal(chunkCount, 1, 'One character file should have one chunk.');
            });

            it('should read constant length lines', async function () {
                let lines = await readConstantLines(mainTestFile);

                assert.deepEqual(lines, expectedLines);
            });

            it('should write a file', async function () {
                const testFile = 'test/writeTest1.test_output';

                let writeStream = fs.createWriteStream(testFile);
                let writer = aw.createWriter(writeStream);

                for (let i = 0; i < expectedLines.length; i++) {
                    await writer.writeAsync(expectedLines[i]);

                    if (readSlowly) {
                        await delay(100);
                    }
                }

                // Indicate that we're done, and wait for all the data to be flushed and the 'finish' event.
                await writer.endAsync();

                // If we waited for everything to flush, then we won't lose any data by calling close.
                writeStream.close();

                // Check the contents of the file we just wrote.
                let lines = await readConstantLines(testFile);

                assert.deepEqual(lines, expectedLines);
            });

            it('should augment streams with new functions', async function () {
                const testFile = 'test/writeTest2.test_output';

                let writeStream = aw.addAsyncFunctions(fs.createWriteStream(testFile));

                for (let i = 0; i < expectedLines.length; i++) {
                    await writeStream.writeAsync(expectedLines[i]);

                    if (readSlowly) {
                        await delay(100);
                    }
                }

                // Indicate that we're done, and wait for all the data to be flushed and the 'finish' event.
                await writeStream.endAsync();

                // If we waited for everything to flush, then we won't lose any data by calling close.
                writeStream.close();

                // Check the contents of the file we just wrote.
                let readStream = aw.addAsyncFunctions(fs.createReadStream(testFile));
                readStream.setEncoding('utf8');

                let line, lines = [];
                while (null !== (line = await readStream.readAsync(constantLineLength))) {
                    lines.push(line);

                    if (readSlowly) {
                        await delay(100);
                    }
                }

                assert.deepEqual(lines, expectedLines);
            });
        });

        describe('awaitify-stream in conjunction with byline', function() {
            const byline = require('byline');

            async function readLines(testFile) {
                let readStream = fs.createReadStream(testFile);
                readStream.setEncoding('utf8');

                let lineStream = byline.createStream(readStream, { keepEmptyLines: true });
                let reader = aw.createReader(lineStream);

                let line, lines = [];
                while (null !== (line = await reader.readAsync())) {
                    lines.push(line);

                    if (readSlowly) {
                        await delay(100);
                    }
                }

                return lines;
            }

            it('should read an empty file', async function () {
                let lines = await readLines('test/txt/empty.txt');

                assert.deepEqual(lines, [], 'Empty file should have zero lines.');
            });

            it('should read a one character file', async function () {
                let lines = await readLines('test/txt/oneChar.txt');

                assert.deepEqual(lines, ['a'], 'One character file should have one line with just "a".');
            });

            it('should read a newline file', async function () {
                let lines = await readLines('test/txt/newline.txt');

                assert.deepEqual(lines, ['', '']);
            });

            it('should read a one line file', async function () {
                let lines = await readLines('test/txt/oneChar_and_newline.txt');

                assert.deepEqual(lines, ['a', '']);
            });

            it('should read a four-line file', async function () {
                let lines = await readLines(mainTestFile);

                assert.deepEqual(lines, ['foo', 'bar', 'baz', '']);
            });

            it('should read a four-line file without a trailing EOL', async function() {
                let lines = await readLines('test/txt/threeConstantLines_no_eol.lftxt');

                assert.deepEqual(lines, ['foo', 'bar', 'baz']);
            });

            it('should read blank lines', async function () {
                let lines = await readLines('test/txt/lines_and_blanks.txt');

                assert.deepEqual(lines, ['foo', 'bar', 'baz', '', 'qaz', '', 'fin', '']);
            });

            it('should read test.js successfully', async function () {
                let lines = await readLines('test/test.js');

                let matchingLines = lines.filter((line) => {
                    return line.indexOf('should read test.js successfully') > -1;
                })

                assert(lines.length > 100, 'There are at least 100 lines in this test file.');

                assert.equal(matchingLines.length, 4,
                    'There should be four lines that say "should read test.js successfully"');
            });
        });
    });
}