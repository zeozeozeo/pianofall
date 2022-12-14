let canvas, ctx, canvasDiv, pianoUiDiv;
let canvasNotes = [];
let lastFrameTime = 0;
const NOTE_SPEED = 0.2; // px per frame * dt

document.addEventListener("DOMContentLoaded", () => {
    pianoUiDiv = document.getElementById("piano-ui");
    canvasDiv = document.getElementById("canvas-div");
    canvas = document.getElementById("piano-canvas");
    ctx = canvas.getContext("2d");
});

function resizeCanvas() {
    canvas.width = canvasDiv.clientWidth;
    canvas.height = canvasDiv.clientHeight;
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// draw loop
function drawCanvas(time) {
    clearCanvas(); // clear previous frame
    var dt = time - lastFrameTime;

    for (var i = 0; i < canvasNotes.length; i++) {
        var note = canvasNotes[i];

        // remove the note if it is offscreen
        if (note.y + note.height < 0) {
            canvasNotes.splice(i, 1);
            i--;
            continue;
        }

        if (note.doGrow) {
            note.height += NOTE_SPEED * dt;
            note.y = canvas.height - note.height;
        } else {
            note.y -= NOTE_SPEED * dt;
        }

        ctx.fillStyle = note.color;
        ctx.fillRect(note.x, note.y, note.width, note.height);
    }

    lastFrameTime = time;
    window.requestAnimationFrame(drawCanvas);
}

function canvasRectStart(x, width, noteIdx, color) {
    var rect = {
        x: x,
        y: canvas.height, // will be converted to screen y (TODO what about X? convert to rel now?)
        width: width,
        height: 0,
        noteIdx: noteIdx,
        doGrow: true,
        color: color,
    };
    canvasNotes.push(rect);
}

function canvasRectEnd(noteIdx) {
    for (var i = 0; i < canvasNotes.length; i++) {
        if (canvasNotes[i].noteIdx == noteIdx) {
            canvasNotes[i].doGrow = false;
        }
    }
}
