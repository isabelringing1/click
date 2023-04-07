var sequences;
var currentObjects;
var currentSequence = null;
var currentLevel = null;
var started = false;
var moveDelay = 50;
var lastMousePos;
var levelFinished = true;

$(document).ready(function() {
    sequences = new Map();
    currentObjects = new Map();
    $.getJSON('data.json', function(data, status, xhr){
        for (var i = 0; i < data.sequences.length; i++){
            var levelMap = new Map();
            for (var j = 0; j < data.sequences[i].levels.length; j++){
                levelMap.set(data.sequences[i].levels[j].level, data.sequences[i].levels[j]);
            }
            data.sequences[i].levels = levelMap;
            sequences.set(data.sequences[i].name, data.sequences[i]);
        }
        addEventListener('mousemove', onMouseMove);

        $("#toggle").click(function(){
            $("#toggle").css({"display": "none"});
            $("#info").css({"display": "block"});
        });
    
        $("#info").click(function(){
            $("#toggle").css({"display": "block"});
            $("#info").css({"display": "none"});
        });
    });
});

function setSequence(sequenceName){
    currentSequence = sequences.get(sequenceName);
}

function setLevel(levelNum){    
    var level = currentSequence.levels.get(levelNum);
    levelFinished = false;
    currentLevel = level;
    for (var i = 0; i < level.objects.length; i++){
        var obj = level.objects[i];
        var div = document.createElement("div");
        var img = document.createElement("img");
        var glow = document.createElement("img");
        img.src = "images/" + obj.name + "." + obj.extension;
        glow.src = "images/" + obj.name + "." + obj.extension;
        img.classList.add("img");
        glow.classList.add("glow");

        var xDelta = 0;
        var yDelta = 0;
        var target = [level.targetX, level.targetY];
        $("#goal")[0].innerHTML = target;

        if (lastMousePos != null){
            xDelta = lastMousePos[0] - level.targetX;
            yDelta = lastMousePos[1] - level.targetY;
        }
        var dist = Math.sqrt(Math.pow(xDelta, 2) + Math.pow(yDelta, 2));
        var xPos = (xDelta * obj.xFollow) + level.targetX + obj.offsetTargetX;
        var yPos = (yDelta * obj.yFollow) + level.targetY + obj.offsetTargetY;
        div.style.top = yPos + "px";
        div.style.left = xPos + "px";
        
        console.log("Setting obj " + obj.name + " to " + xPos + ', ' + yPos);
        div.appendChild(img);
        div.appendChild(glow);

        div.classList.add("object");
        div.id = obj.name;
        obj.currentPos = [xPos, yPos];
        currentObjects.set(div.id, obj);
        $("#background").append(div);
    }
}

function onMouseMove(e){
    updateObjects(e.pageX, e.pageY);
}

function updateObjects(x, y){
    if (!started){
        lastMousePos = [x, y];
        setSequence("one");
        setLevel(1);
        started = true;
        return;
    }

    if (levelFinished){
        lastMousePos = [x, y];
        return;
    }
    
    var xDelta = 0;
    var yDelta = 0;
    if (lastMousePos != null){
        xDelta = x - lastMousePos[0];
        yDelta = y - lastMousePos[1];
    }
    var dist = Math.sqrt(Math.pow(x - currentLevel.targetX, 2) + Math.pow(y - currentLevel.targetY, 2));

    for (let [name, obj] of currentObjects) {
        var newLeft = obj.currentPos[0] + xDelta * obj.xFollow;
        var newTop = obj.currentPos[1] + yDelta * obj.yFollow;

        $("#" + name).css({
            left: newLeft,
            top: newTop,
        });
        obj.currentPos = [newLeft, newTop];
    }
    lastMousePos = [x, y];
    $("#coord")[0].innerHTML = lastMousePos;
    $("#dist")[0].innerHTML = dist;

    if (currentLevel != null && currentLevel.level > 0){
        if (currentLevel.targetX == x && currentLevel.targetY == y) {
            levelFinished = true;
            $("#coord")[0].innerHTML = "yay";
            $('.glow').addClass("winState");

        }
    }
}