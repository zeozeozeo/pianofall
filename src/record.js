let isRecording = false;
let isPlayingBack = false;
let lastActionTime = 0;
let recordingStartTime = 0;
let recordingActions = [];

function initRecordButton() {
    recordButton.on("change", (value) => {
        if (value && !isPlayingBack) {
            isRecording = true;
            recordingStartTime = performance.now();
            recordingActions = [];
        } else {
            isRecording = false;
            saveRecording();
        }
    });

    importButton.on("change", (value) => {
        if (value) {
            importRecording();
        }
    });
}

function recordAction(note, toggle) {
    if (!isRecording || isPlayingBack) return;
    var timeNow = performance.now();
    var timeBetweenAction = timeNow - lastActionTime - recordingStartTime;
    lastActionTime = timeNow - recordingStartTime;

    recordingActions.push({
        timeBetween: timeBetweenAction,
        note: note,
        toggle: toggle,
        instrument: currentInstrumentString,
    });
}

function saveRecording() {
    if (isPlayingBack) {
        Swal.fire("Cannot record while playing back");
        return;
    }
    if (recordingActions.length === 0) {
        Swal.fire("Cannot save empty recording!");
        return;
    }

    var randomString = (Math.random() + 1).toString(36).substring(7);
    var blob = new Blob([JSON.stringify(recordingActions)], {
        type: "text/plain;charset=utf-8",
    });
    saveAs(blob, "song-" + randomString + ".json");
}

function verifyRecording(actions) {
    if (actions.length === 0) return false;
    actions.forEach((action) => {
        if (
            !action.hasOwnProperty("timeBetween") ||
            !action.hasOwnProperty("note") ||
            !action.hasOwnProperty("toggle") ||
            !action.hasOwnProperty("instrument")
        ) {
            return false;
        }
    });
    return true;
}

function importRecording() {
    if (isPlayingBack) {
        Swal.fire("Cannot import a song while playing an another song");
        return;
    }
    var fileInput = document.createElement("input");
    fileInput.type = "file";

    fileInput.onchange = (e) => {
        importFromFile(e.target.files[0]);
    };

    fileInput.click();
}

function importFromFile(file) {
    // read the file
    var reader = new FileReader();

    reader.onload = (e) => {
        try {
            var actions = JSON.parse(e.target.result);
        } catch (err) {
            console.error(err);
            Swal.fire(err.toString());
            return;
        }
        importButton.state = false;

        if (verifyRecording(actions)) {
            recordingActions = actions;
            releaseAllKeys();
            playRecording();
        } else {
            Swal.fire("Invalid recording!");
        }
    };
    reader.readAsText(file);
}

function playAction() {
    if (recordingActions.length === 0) {
        isPlayingBack = false;
        return;
    }
    var action = recordingActions[0];
    if (recordingActions.length > 1) {
        var nextAction = recordingActions[1];
    } else {
        var nextAction = action;
    }
    isPlayingBack = true;

    // change instrument if needed
    if (
        action.instrument != currentInstrumentString &&
        INSTRUMENTS.includes(action.instrument)
    ) {
        currentInstrument = samples[action.instrument];
        currentInstrumentString = action.instrument;
    }

    piano.toggleIndex(action.note - START_NOTE, action.toggle);
    triggerNote(action.toggle, action.note);
    recordingActions.shift();
    setTimeout(playAction, nextAction.timeBetween);
}
let playRecording = playAction;

function releaseAllKeys() {
    for (var i = START_NOTE; i <= END_NOTE; i++) {
        piano.toggleIndex(i - START_NOTE, false);
        triggerNote(false, i);
    }
}

// drag and drop
document.addEventListener("dragover", (event) => {
    event.stopPropagation();
    event.preventDefault();
});

document.addEventListener("drop", (event) => {
    event.stopPropagation();
    event.preventDefault();
    importFromFile(event.dataTransfer.files[0]);
});
