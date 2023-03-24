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
        console.log(sequences);
        addEventListener('mousemove', onMouseMove);
    });
});

function setSequence(sequenceName){
    if (!sequences.has(sequenceName)){
        console.log("Cannot set sequence " + sequenceName);
        return;
    }
    currentSequence = sequences.get(sequenceName);
    $(".debug").css({"display": "block"});
    console.log("Current sequence set to " + sequenceName);
}

function setLevel(levelNum){
    for (let id of currentObjects.keys()) {
        $("#" + id)[0].remove();
    }
    currentObjects.clear();

    if (currentSequence == null || !currentSequence.levels.has(levelNum)){
        console.log(levelNum, currentSequence.levels.size)
        if (levelNum >= currentSequence.levels.size){
            localStorage.setItem(currentSequence.name, "done");
            if (currentSequence.nextSequence != null){
                localStorage.setItem(currentSequence.nextSequence, "unlocked");
            }
        }
        openMenu();
        return;
    }
    
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
        level.targetX = getPixelValue(level.targetX);
        level.targetY = getPixelValue(level.targetY);
        console.log(level.targetX, level.targetY)
        var target = [level.targetX, level.targetY];
        $("#goal")[0].innerHTML = target;

        obj.offsetTargetX = getPixelValue(obj.offsetTargetX);
        obj.offsetTargetY = getPixelValue(obj.offsetTargetY);
        if (lastMousePos != null){
            xDelta = lastMousePos[0] - level.targetX;
            yDelta = lastMousePos[1] - level.targetY;
        }
        var dist = Math.sqrt(Math.pow(xDelta, 2) + Math.pow(yDelta, 2));
        var xPos = (xDelta * obj.xFollow) + level.targetX + obj.offsetTargetX;
        var yPos = (yDelta * obj.yFollow) + level.targetY + obj.offsetTargetY;
        div.style.top = yPos + "px";
        div.style.left = xPos + "px";
        div.style.rotate = (dist * obj.rotation % 360) + "deg";
        div.style.filter = 'blur(' + (dist * obj.blur / 100) + 'px)';
        var scaleX = obj.hasOwnProperty("scaleX") ? (1 + (dist * obj.scaleX / 1000)) : 1;
        var scaleY = obj.hasOwnProperty("scaleY") ? (1 + (dist * obj.scaleY / 1000)) : 1;
        if (scaleX != 1 || scaleY != 1){
            div.style.transform = "translate(-50%, -50%) scale(" + scaleX + ", " + scaleY + ")";
        }
        
        console.log("Setting obj " + obj.name + " to " + xPos + ', ' + yPos);
        div.appendChild(img);
        div.appendChild(glow);

        if (currentLevel.hasOwnProperty("glow") && currentLevel.glow == "off"){
            glow.style.transform = "scale(0)";
        }

        div.classList.add("object");
        var number = obj.number == null ? "" : obj.number;
        div.id = obj.name + number;
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
        if (localStorage.getItem("Intro") == "done"){
            openMenu();
        }
        else{
            setSequence("Intro");
            setLevel(1);
        }
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
        var newRot = (dist * obj.rotation % 360) + "deg";
        var newBlur = 'blur(' + (dist * obj.blur / 100) + 'px)';

        var scaleX = obj.hasOwnProperty("scaleX") ? (1 + (dist * obj.scaleX / 1000)) : 1;
        var scaleY = obj.hasOwnProperty("scaleY") ? (1 + (dist * obj.scaleY / 1000)) : 1;
        if (scaleX != 1 || scaleY != 1){
            document.getElementById(name).style.transform = "translate(-50%, -50%) scale(" + scaleX + ", " + scaleY + ")";
        }
        
        
        $("#" + name).css({
            left: newLeft,
            top: newTop,
            rotate: newRot,
            filter: newBlur, '-webkit-filter': newBlur, '-moz-filter': newBlur, '-o-filter': newBlur, '-ms-filter': newBlur,
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
            setTimeout(() => {
                $('.glow').removeClass("winState")
                setLevel(currentLevel.level + 1);
            }, 1000);
        }
        if (currentLevel.hasOwnProperty("leeway") && dist < currentLevel.leeway){
            updateObjects(currentLevel.targetX, currentLevel.targetY);
        }
    }
}

function openMenu(){
    $("#menu").css({"display": "flex"});
    $(".debug").css({"display": "none"});

    $("#logo").click(function(){
        closeMenu();
        setSequence("Intro");
        setLevel(1);
    });

    for (let name of sequences.keys()) {
        if (document.getElementById(name) != null){
            var status = localStorage.getItem(name);
            console.log("Status of " + name + " is "+ status);
            if (status == null){
                $("#" + name).attr("class","level locked");
                $("#" + name).click(null);
            }
            else if (status == "unlocked"){
                $("#" + name).attr("class","level unlocked");
                $("#" + name).click(function(){
                    closeMenu();
                    setSequence(name);
                    setLevel(1);
                });
            }
            else if (status == "done"){
                $("#" + name).attr("class","level done");
                $("#" + name).click(function(){
                    closeMenu();
                    setSequence(name);
                    setLevel(1);
                });
            }
        }   
    }
}

function closeMenu(){
    $("#menu").css({"display": "none"});
    $(".debug").css({"display": "block"});
}

function getPixelValue(value){
    if (!isNaN(value)){
        return value;
    }
    // otherwise it's a percentage
    var percent = Number(value.slice(0, -2));

    var dim = value.slice(-1)[0];
    if (dim == 'w'){
        return Math.floor(percent / 100 * window.innerWidth);
    }
    else if (dim == 'h'){
        return Math.floor(percent / 100 * window.innerHeight);
    }
}