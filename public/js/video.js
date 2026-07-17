// Source - https://stackoverflow.com/a/7525760
// Posted by Tower, modified by community. See post 'Timeline' for change history
// Retrieved 2026-02-13, License - CC BY-SA 3.0
function requestFullScreen(element) {
    // Supports most browsers and their versions.
    var requestMethod = element.requestFullScreen||element.webkitRequestFullScreen||element.mozRequestFullScreen||element.msRequestFullScreen;

    if (requestMethod) { // Native full screen.
        requestMethod.call(element);
    } else if (typeof window.ActiveXObject !== "undefined") { // Older IE.
        var wscript = new ActiveXObject("WScript.Shell");
        if (wscript !== null) {
            wscript.SendKeys("{F11}");
        }
    }
}

// Source - https://stackoverflow.com/a/11820717
// Posted by mike nelson, modified by community. See post 'Timeline' for change history
// Retrieved 2026-02-13, License - CC BY-SA 4.0
function cancelFullScreen() {
    var el = document;
    var requestMethod = el.cancelFullScreen||el.webkitCancelFullScreen||el.mozCancelFullScreen||el.exitFullscreen||el.webkitExitFullscreen;
    if (requestMethod) { // cancel full screen.
        requestMethod.call(el);
    } else if (typeof window.ActiveXObject !== "undefined") { // Older IE.
        var wscript = new ActiveXObject("WScript.Shell");
        if (wscript !== null) {
            wscript.SendKeys("{F11}");
        }
    }
}

function makeVideoInter(el) {
    var playToggleEl = el.querySelector('.play-toggle')
    var fullscreenEl = el.querySelector('.fullscreen')
    var video = el.querySelector('video')
    function togglePlay() {
        var paused = el.getAttribute("data-paused")
        if (paused=='true') {
            video.play()
            playToggleEl.classList.remove('paused')
            console.log('Play video')
        } else {
            video.pause()
            playToggleEl.classList.add('paused')
            console.log('Pause video')
        }

        el.setAttribute("data-paused", paused!="true")
    }
    
    el.addEventListener("click", function(e) {
        var targEl = e.target
        if (targEl.classList.contains("play-toggle")) {
            togglePlay()
        } else if (targEl.classList.contains("fullscreen")) {
            var isInFullScreen = (document.fullScreenElement && document.fullScreenElement !== null) || (document.mozFullScreen || document.webkitIsFullScreen);

            if (isInFullScreen) {
                cancelFullScreen()
            } else {
                requestFullScreen(el)
            }
            fullscreenEl.classList.toggle('infullscreen')
            el.setAttribute("data-fullscreen",isInFullScreen!="true")
        }
        
    })
}