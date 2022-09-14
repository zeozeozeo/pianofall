// the middle and the bottom row of a QWERTY keyboard
// (22 keys in total)
const MAIN_KEYS = "zxcvbnm,./asdfghjkl;'1234567890-=";
const TOP_KEYS = "qwertyuiop[]";
const START_NOTE = 21;
const END_NOTE = 21 + 56;

const COLORS = [
    "#4e61d8",
    "#8064c6",
    "#8064c6",
    "#a542b1",
    "#ed3883",
    "#ed3883",
    "#f75839",
    "#f7943d",
    "#f6be37",
    "#f6be37",
    "#d1c12e",
    "#95c631",
    "#95c631",
    "#4bb250",
    "#45b5a1",
    "#45b5a1",
    "#4598b6",
];

// const INSTRUMENTS = ["piano"];
// const INSTRUMENTS = SampleLibrary.list;
const INSTRUMENTS = [
    "piano",
    "saxophone",
    "cello",
    "bassoon",
    "bass-electric",
    "contrabass",
    "guitar-acoustic",
    "guitar-nylon",
    "organ",
    "trumpet",
];

let currentInstrument;
let currentInstrumentString;

// start loading samples
NProgress.start(); // start progress bar
var samples = SampleLibrary.load({
    instruments: INSTRUMENTS,
    baseUrl: "/pianofall/samples",
});

// called when all samples are loaded
Tone.loaded().then(() => {
    // stop progress bar
    NProgress.done();
    // remove loading text
    document.getElementById("loading").remove();

    // connect the samples to master output
    for (var property in samples) {
        if (
            samples.hasOwnProperty(property) &&
            typeof samples[property].toDestination == "function"
        ) {
            samples[property].toDestination();
        }
    }

    // the default instrument is the piano
    currentInstrument = samples["piano"];
    currentInstrumentString = "piano";

    // initialize the UI
    initUI();

    // when user selects a new instrument, change the current instrument
    instrumentSelector.on("change", (input) => {
        // convert the name back ("Some instrument" -> "some-instrument")
        var selectedInstrument = input.value.replace(" ", "-").toLowerCase();
        currentInstrument = samples[selectedInstrument];
        currentInstrumentString = selectedInstrument;
    });

    // nexus ui piano clicked
    piano.on("change", (note) => {
        // console.log(note);
        triggerNote(note.state, note.note);
    });

    // add keyboard listeners
    document.addEventListener("keydown", (event) => {
        if (event.key != "F11" && event.key != "F12") event.preventDefault();
        // don't play the note again if holding the key
        if (event.repeat) return;
        toggleByEvent(event, true);
    });

    document.addEventListener("keyup", (event) => {
        if (event.key != "F11" && event.key != "F12") event.preventDefault();
        if (event.repeat) return;
        toggleByEvent(event, false);
    });
});

function triggerNote(state, note) {
    if (state === true) {
        // console.log(Tone.Frequency(note, "midi").toNote());
        currentInstrument.triggerAttack(Tone.Frequency(note, "midi").toNote());

        var noteIdx = note - START_NOTE;
        // only change the color of this note
        var noteColor = getColorForNote(note);
        piano.keys[noteIdx].colors.accent = noteColor;
        // record this action (won't do anything if the recording hasn't started yet)
        recordAction(note, true);

        // get the position of the note on the screen (position.x
        // is relative to the parent)
        var position = getKeyPos(piano.keys[noteIdx]);
        canvasRectStart(position.x, position.width, noteIdx, noteColor);
    } else if (state === false) {
        currentInstrument.triggerRelease(Tone.Frequency(note, "midi").toNote());

        var noteIdx = note - START_NOTE;
        recordAction(note, false);
        canvasRectEnd(noteIdx);
    }
}

function keycodeToChar(event) {
    if (!isNaN(event.key)) return event.key;
    if ("'[]-_".indexOf(event.key) > -1) return event.key;
    var chrCode = event.keyCode - 48 * Math.floor(event.keyCode / 48);
    return String.fromCharCode(
        96 <= event.keyCode ? chrCode : event.keyCode
    ).toLowerCase();
}

function toggleByEvent(event, toggle) {
    var key = keycodeToChar(event);
    var keyIdx = MAIN_KEYS.indexOf(key);
    var actualKeyIdx = null;

    if (keyIdx !== -1 && keyIdx < whiteKeys.length) {
        actualKeyIdx = whiteKeys[keyIdx];
        piano.toggleIndex(actualKeyIdx, toggle);
    } else {
        // check black keys
        keyIdx = TOP_KEYS.indexOf(key);
        if (keyIdx !== -1 && keyIdx < blackKeys.length) {
            actualKeyIdx = blackKeys[keyIdx];
            piano.toggleIndex(blackKeys[keyIdx], toggle);
        }
    }
}

function getKeyPos(key) {
    var position = key.interactionTarget.getBoundingClientRect();
    // get position relative to parent
    position.x -= pianoUiDiv.getBoundingClientRect().x;
    return position;
}

function getColorForNote(noteNum) {
    // "roll over" the array if the index is bigger
    var colorIdx = (noteNum - START_NOTE) % COLORS.length;
    return COLORS[colorIdx];
}

function getRandomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}

let instrumentSelector, piano, recordButton, importButton;
let whiteKeys = [];
let blackKeys = [];

function initUI() {
    // convert instrument names ("some-instrument" -> "Some instrument")
    var instrumentNames = [];
    for (var inst of INSTRUMENTS) {
        inst = inst.charAt(0).toUpperCase() + inst.slice(1);
        inst = inst.replace("-", " ");
        instrumentNames.push(inst);
    }

    instrumentSelector = new Nexus.Select("#instrument-selector", {
        size: [300, 30],
        options: instrumentNames,
    });

    piano = new Nexus.Piano("#piano", {
        size: [window.innerWidth / 1.25, 125],
        mode: "button", // "button", "toggle" or "impulse"
        lowNote: START_NOTE,
        highNote: END_NOTE,
    });

    // array containing indexes of white/black keys
    for (var i = 0; i < piano.keys.length; i++) {
        if (piano.keys[i].color === "w") {
            whiteKeys.push(i);
        } else {
            blackKeys.push(i);
        }
    }

    recordButton = new Nexus.TextButton("#record-button", {
        size: [100, 30],
        state: false,
        text: "Record",
        alternateText: "Save",
    });
    importButton = new Nexus.TextButton("#import-button", {
        size: [100, 30],
        text: "Import",
    });
    pianoUiDiv.style.display = "block";
    initRecordButton();

    // resize the canvas
    resizeCanvas();
    // start the canvas draw loop
    window.requestAnimationFrame(drawCanvas);
}

// called when a window is resized
window.onresize = () => {
    if (typeof piano == "undefined") return;
    resizeCanvas();
    piano.resize(window.innerWidth / 1.25, 125);
};

window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("info-button").addEventListener("click", () => {
        Swal.fire({
            html: `
            <span style="font-size: xx-large">
                <i class="bi bi-github"></i>
                <a href="https://github.com/zeozeozeo/pianofall">GitHub</a>
            </span>
            <br/>&nbsp;<br/>
            <span style="font-size: xx-large">
                <i class="bi bi-mouse2-fill"></i>
                <span>Controls</span>
            </span>
            <br/>
            <ul>
                <li>
                    Click on piano keys or use the keyboard buttons to play.
                </li>
                <li>
                    You can use the number row (with -= and the numpad),
                    the qwertyuiop[] row, the asdfghjkl;' row,
                    and the zxcvbnm,./ row (assuming you have a QWERTY keyboard).
                </li>
                <li>
                    Use the dropdown menu to select instruments.
                </li>
                <li>
                    Click on the record button to start/stop recording the song.
                    You can use the import button to play it back.
                </li>
            </ul>
            `,
        });
    });
});
