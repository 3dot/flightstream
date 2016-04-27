var spawn = require('child_process').spawn,
    path = require('path'),
    fs = require('fs');

// Merges the current environment variables and custom params for the environment used by child_process.exec()
function createEnv(params) {
    var env = {};
    var item;

    for (item in process.env) {
        env[item] = process.env[item];
    }

    for (item in params) {
        env[item] = params[item];
    }

    return env;
}

// scriptFile must be a full path to a shell script
exports.exec = function (scriptFile, scriptArguments, workingDirectory, environment, callback) {
    var cmd;

    if (!workingDirectory) {
        return callback(new Error('workingDirectory cannot be null'), null, null);
    }

    if (scriptFile === null) {
        return callback(new Error('scriptFile cannot be null'), null, null);
    }

    // transform windows backslashes to forward slashes for use in cygwin on windows
    if (path.sep === '\\') {
        scriptFile = scriptFile.replace(/\\/g, '/');
        workingDirectory = workingDirectory.replace(/\\/g, '/');
    }

    // execute script within given project workspace
    var process = spawn(scriptFile, scriptArguments,
        {
            cwd: workingDirectory
        }
    );

    process.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
    });

    process.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });

    callback(null);
};