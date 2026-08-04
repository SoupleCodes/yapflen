function http(method, route, body, callback) {
    var xhr = null;
    if (window.XMLHttpRequest) {
        xhr = new XMLHttpRequest();
    } else {
        if (window.ActiveXObject) {
            try {
                xhr = new ActiveXObject("Msxml2.XMLHTTP");
            } catch (e) {
                try {
                    xhr = new ActiveXObject("Microsoft.XMLHTTP");
                } catch (e) {}
            }
        }
    }
    if (!xhr) {
        return false;
    }
    xhr.open(method, route, false)
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')

    xhr.onload = function() {
        if (typeof callback == 'function') {
            callback(xhr.responseText)
        }
    }
    xhr.onerror = function() {
        console.log(xhr)
    }

    xhr.send()
}