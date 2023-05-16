var sequences;
var currentObjects;
var currentSequence = null;
var currentLevel = null;
var started = false;
var moveDelay = 50;
var lastMousePos;
var levelFinished = true;
var handsReady = false;
var noseReady = false;
var videoShowing = false;
var video;
var videoDiv;
var canvas;
var ctx;
var detector;
var media_recorder;
var handsMode = false;
var noseMode = false;
var sidebarShown = false;
var debugOn = false;
var collisionId = "";
var cursorTimeout;
var cursorInterval;
var videoSetUp;
var lastIndexPos = [0, 0];
var lastNosePos = [0, 0];

var videoWidth = 640;
var videoHeight = 480;

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

        $("#hamburger").click(function(){
            toggleSidebar(true);
        });

        $(".dropdown-item").click(function(e){
            onDropdownItemClicked(e);
        });

        $("#control-dropdown").hover(function(){
            setControlDropdown();
        });

        $("#debug-dropdown").hover(function(){
            setDebugDropdown();
        });

        $("#menu-button").click(function(){
            openMenu();
            toggleSidebar(false);
        });

        $("#background").click(function(){
            if (sidebarShown){
                toggleSidebar(false);
            }
        });

        addEventListener("keypress", (e) => {
            if (e.key == "s"){
                trySkip();
            }
        });
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
        var offsetRot = obj.offsetRotation == null ? 0 : obj.offsetRotation;
        var rot = obj.rotation == null ? 0 : obj.rotation;
        div.style.rotate = (dist * rot + offsetRot) + "deg";
        div.style.filter = 'blur(' + (dist * obj.blur / 100) + 'px)';
        var scaleX = obj.hasOwnProperty("scaleX") ? (1 + (dist * obj.scaleX / 1000)) : 1;
        var scaleY = obj.hasOwnProperty("scaleY") ? (1 + (dist * obj.scaleY / 1000)) : 1;
        if (scaleX != 1 || scaleY != 1){
            div.style.transform = "translate(-50%, -50%) scale(" + scaleX + ", " + scaleY + ")";
        }
        
        div.appendChild(img);
        div.appendChild(glow);

        if ((currentLevel.hasOwnProperty("glow") && currentLevel.glow == "off") || (obj.hasOwnProperty("glow") && obj.glow == "off")){
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
    if (!handsMode && !noseMode){
        updateObjects(e.pageX, e.pageY);
    }
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
        var offsetRot = obj.offsetRotation == null ? 0 : obj.offsetRotation;
        var rot = obj.rotation == null ? 0 : obj.rotation;
        var newRot = (dist * rot + offsetRot) + "deg";
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
        if (noseMode || handsMode){
            if (currentLevel.hasOwnProperty("bodyLeeway") && dist < currentLevel.bodyLeeway){
                trySkip();
            }
        }
        else if (currentLevel.hasOwnProperty("leeway") && dist < currentLevel.leeway){
            trySkip();
        }
    }
}

function trySkip(){
    if (currentLevel != null && currentLevel.level > 0){
        updateObjects(currentLevel.targetX, currentLevel.targetY);
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
                $("#" + name).attr("class","level clickable locked");
                $("#" + name).click(null);
            }
            else if (status == "unlocked"){
                $("#" + name).attr("class","level clickable unlocked");
                $("#" + name).click(function(){
                    closeMenu();
                    setSequence(name);
                    setLevel(1);
                });
            }
            else if (status == "done"){
                $("#" + name).attr("class","level clickable done");
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
    // otherwise it's a (compound) percentage
    var split = value.split(',');
    var total = 0;
    for (var i = 0; i < split.length; i++){
        var num = Number(split[i].slice(0, -2));
        var dim = split[i].slice(-1)[0];
        if (dim == 'w'){
            total += Math.floor(num / 100 * window.innerWidth);
        }
        else if (dim == 'h'){
            total += Math.floor(num / 100 * window.innerHeight);
        }
        else if (dim == 'x'){
            total += num;
        }
    }

    return total;
}

async function setUpVideo(){
    videoDiv = document.getElementById('vid-div');
    video = document.getElementById('vid');
    canvas = document.getElementById('vid-canvas');
    ctx = canvas.getContext("2d");
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    video.style.width = videoWidth + "px";
    video.style.height = videoHeight + "px";
    videoDiv.style.display = "flex";

    addEventListener("keypress", (e) => {
        if (e.key == "h"){
            console.log("Toggling video");
            $('#vid-div').css( "zIndex", videoShowing ? "-1" : "1");
            videoShowing = !videoShowing;
        }
    });

    var camera_stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    video.srcObject = camera_stream;

    videoSetUp = true;
}

// Hands
async function setUpHands(){
    if (!videoSetUp){
        setUpVideo();
    }
    video = document.getElementById('vid');
    const model = handPoseDetection.SupportedModels.MediaPipeHands;
    const detectorConfig = {
        runtime: 'mediapipe',
        modelType: 'full',
        solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands/"
    };
    
    detector = await handPoseDetection.createDetector(model, detectorConfig);
   
    var camera_stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    video.srcObject = camera_stream;

    video.addEventListener("playing", function() {
        handsReady = true;
        $("#cursor").css({"display": "flex"});
    });
    
    setInterval(async () => {
        await readHands();
    }, 100);
}

function teardownHands(){
    detector.dispose();
    detector = null;
    handsReady = false;
    if (!noseMode){
        $("#cursor").css({"display": "none"});
    }
}

async function readHands(){
    let hands = null;
    if (detector != null && handsReady) {
        try {
            hands = await detector.estimateHands(video, {flipHorizontal: true});
        } catch (error) {
            console.log(error);
        }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById("vid-coords").innerHTML = "";
    var indexData = [];
    for (var i = 0; hands != null && i < hands.length; i++){
        for (var j = 0; j < hands[i].keypoints.length; j++){
            if (hands[i].keypoints[j].name == 'index_finger_tip'){
                indexData.push([hands[i].keypoints[j].x.toFixed(2), hands[i].keypoints[j].y.toFixed(2)]);
                break;
            }
        }
    }

    if (indexData.length == 0){
        lastIndexPos = [0, 0];
        return;
    }

    indexData.sort((a, b) => { 
       return dist(a, lastIndexPos) - dist(b, lastIndexPos);
    });

    lastIndexPos = indexData[0];
    renderIndexFinger(indexData[0], 0);
    processIndexPosition(indexData[0]);
}

function dist(coord1, coord2){
    var deltaX = Math.abs(coord1[0] - coord2[0]);
    var deltaY = Math.abs(coord1[1] - coord2[1]);
    return Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
}

function renderIndexFinger(coord, num){
    ctx.fillStyle = num == 0 ? "red" : "blue";
    ctx.fillRect(coord[0], coord[1], 5, 5);
    document.getElementById("vid-coords").innerHTML += coord[0] + ", " + coord[1] + "\n";
}

function processIndexPosition(coord){
    var x = coord[0] / videoWidth * window.innerWidth;
    var y = coord[1] / videoHeight * window.innerHeight;

    $("#cursor").css({left: x, top: y});

    var collisions = $("#cursor").collision(".clickable");
    if (collisions.length > 0 && collisionId != collisions[0].id){
        console.log(collisions[0]);
        startHover(collisions[0]);
    }
    else if (collisions.length == 0){
        stopHover();
    }

    updateObjects(Math.ceil(x), Math.ceil(y));
}

// Nose
async function setUpNose(){
    if (!videoSetUp){
        setUpVideo();
    }
    video = document.getElementById('vid');
    const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
    const detectorConfig = {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection',
    }
    detector = await faceDetection.createDetector(model, detectorConfig);
    
    video.addEventListener("playing", function() {
        noseReady = true;
        $("#cursor").css({"display": "flex"});
    });
    
    setInterval(async () => {
        await readNose();
    }, 50);
}

function teardownNose(){
    detector.dispose();
    detector = null;
    noseReady = false;
    if (!handsMode){
        $("#cursor").css({"display": "none"});
    }
}

async function readNose(){
    let faces = null;
    if (detector != null && noseReady) {
        try {
            faces = await detector.estimateFaces(video, {flipHorizontal: true});
        } catch (error) {
            console.log(error);
        }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById("vid-coords").innerHTML = "";
    var noseData = [];
    for (var i = 0; faces != null && i < faces.length && i < 2; i++){
        for (var j = 0; j < faces[i].keypoints.length; j++){
            if (faces[i].keypoints[j].name == 'noseTip'){
                noseData.push([faces[i].keypoints[j].x.toFixed(2), faces[i].keypoints[j].y.toFixed(2)]);
                break;
            }
        }
    }

    if (noseData.length == 0){
        lastNosePos = [0, 0];
        return;
    }

    noseData.sort((a, b) => { 
       return dist(a, lastNosePos) - dist(b, lastNosePos);
    });

    lastNosePos = noseData[0];
    renderIndexFinger(noseData[0], 0);
    processIndexPosition(noseData[0]);
}



function toggleSidebar(show){
    sidebarShown = show;
    if (show){
        $("#hamburger").css({"display": "none"});
        $("#side-bar").removeClass("hidden");
    }
    else{
        $("#hamburger").css({"display": "block"});
        $("#side-bar").addClass("hidden");
    }
}

function setControlDropdown(){
    if (handsMode){
        $("#dropdown-hand").css({"display": "none"});
        $("#dropdown-nose").css({"display": "block"});
        $("#dropdown-mouse").css({"display": "block"});
    }
    else if (noseMode){
        $("#dropdown-nose").css({"display": "none"});
        $("#dropdown-hand").css({"display": "block"});
        $("#dropdown-mouse").css({"display": "block"});
    }
    else{
        $("#dropdown-mouse").css({"display": "none"});
        $("#dropdown-nose").css({"display": "block"});
        $("#dropdown-hand").css({"display": "block"});
    }
}

function setDebugDropdown(){
    if (debugOn){
        $("#dropdown-on").css({"display": "none"});
        $("#dropdown-off").css({"display": "block"});
    }
    else {
        $("#dropdown-on").css({"display": "block"});
        $("#dropdown-off").css({"display": "none"});
    }
    
}

function onDropdownItemClicked(e){
    if (e.target.classList.contains("control")){
        if (e.target.id == "dropdown-hand"){
            if (noseMode){
                teardownNose();
            }
            handsMode = true;
            noseMode = false;
            setUpHands();
            $("#control-dropdown-current")[0].innerHTML = "index finger";
        }
        else if (e.target.id == "dropdown-nose"){
            if (handsMode){
                teardownHands();
            }
            noseMode = true;
            handsMode = false;
            setUpNose();
            $("#control-dropdown-current")[0].innerHTML = "nose";
        }
        else{
            if (noseMode){
                teardownNose();
            }
            else if (handsMode){
                teardownHands();
            }
            handsMode = false;
            noseMode = false;
            $("#control-dropdown-current")[0].innerHTML = "mouse";
        }
        setControlDropdown();
    }
    else if (e.target.classList.contains("debug-sidebar")){
        if (e.target.id == "dropdown-on"){
            $("#debug-dropdown-current")[0].innerHTML = "on";
            $("#info").css({"display": "block"});
            debugOn = true;
        }
        else {
            $("#debug-dropdown-current")[0].innerHTML = "off";
            $("#info").css({"display": "none"});
            debugOn = false;
        }
        setDebugDropdown();
    }
}

function startHover(collision){
    collisionId = collision.id;
    cursorTimeout = setTimeout(() => { $('#' + collisionId).click(); }, 1000);
    var percent = 0;
    cursorInterval = setInterval(() => {
        $('#cursor-border')[0].style.setProperty("--p", percent);
        percent += 5;
        if (percent >= 105){
            clearInterval(cursorInterval);
        }
    }, 25);
}

function stopHover(){
    if (collisionId == ""){
        return;
    }
    collisionId = "";
    clearInterval(cursorInterval);
    clearTimeout(cursorTimeout);
    $('#cursor-border')[0].style.setProperty("--p", "0");
}