function switchTab(event, el) {
    if (event.target.tagName!="A") {
        return null
    }

    var tabsParent = event.target.parentNode
    var tab = event.target
    var index = Array.prototype.indexOf.call(tabsParent.children, tab)
    var content = document.getElementById(el)

    tabsParent.querySelector('.selected').classList.remove('selected')
    tab.classList.add('selected')

    content.style.left = ((index * -100) ) + "%"
}

function adjustScrollableContent() {
    
}

function openPopup(content) {
    if (!document.getElementById('popup-window')) {
        const popupWin = document.createElement('div')
        popupWin.id = 'popup-window'

        const popupDialog = document.createElement('div')
        popupDialog.id = 'dialog'
        popupWin.appendChild(popupDialog)

        document.body.appendChild(popupWin)
    }

    let popupEl = document.getElementById('popup-window')
    popupEl.querySelector('#dialog').appendChild(content)

    setTimeout(() => {
        popupEl.style.opacity = 1
        popupEl.querySelector('#dialog').style.opacity = 1
    }, 500)

    popupEl.addEventListener("click", () => popupEl.remove() )
}


function authPopup() {
    var loginIframe = document.createElement("iframe")
    loginIframe.src = '/login'

    openPopup(loginIframe)
}

function adjustMasonry() {
    var scr_w = document.body.offsetWidth
    var mobile = scr_w < 770
    var body = document.body
    var masonryShrink = body.getAttribute('masonry-shrink')
    if ((masonryShrink!='false') == (mobile!=false)) {
        return false;
    }
    body.setAttribute('masonry-shrink', masonryShrink!='true')

    var postWrappers = document.querySelectorAll('.posts-wrapper')
    for (let i = 0; i < postWrappers.length; i++) {
        var el = postWrappers[i]
        var children = el.querySelectorAll('.post-container')
        var mobileEl = el.querySelector('.mobile')
        var column1 = el.querySelector('.column1')
        var column2 = el.querySelector('.column2')

        if (mobile) {
            column1.innerHTML = ''
            column1.classList.add('hidden')
            column2.innerHTML = ''
            column2.classList.add('hidden')
            mobileEl.classList.remove('hidden')

            Array.from(children)
            .sort((a, b) => 
                new Date(a.querySelector('.post-user-time').getAttribute('title')) < 
                new Date(b.querySelector('.post-user-time').getAttribute('title'))
            )
            .forEach(node => mobileEl.appendChild(node));
        } else {
            mobileEl.innerHTML = ''
            mobileEl.classList.add('hidden')
            column1.classList.remove('hidden')
            column2.classList.remove('hidden')

            Array.from(children)
                .forEach((node, index) => {
                    if (index%2) {
                        column2.appendChild(node)
                    } else {
                        column1.appendChild(node)
                    }
                })
        }
        
    } 
}

function addEventsToPost(el) {
    setTimeout(function() {
        el.classList.remove("new")
    },500)

    var imageSlider = el.querySelector('.post-image-slider')
    if (imageSlider) {
        imageSlider.addEventListener("click", function(e) {
            var targEl = e.target
            var targClass = e.target.classList
            var slideWrapperUL = el.querySelector('.post-image-slider-wrapper ul')
            var slidesLength = el.querySelectorAll('.post-image-slider-wrapper ul li').length
            var bullets = el.querySelectorAll('.pagination .bullet')
    
            if (targClass.contains("bullet")) {
                var index = Array.prototype.indexOf.call(targEl.parentNode.children, targEl)
                var activeBullet = el.querySelector('.bullet.active')
    
                slideWrapperUL.style.transform = 'translateX(' + (index * -100) + '%)'
                bullets[index].classList.add('active')
                activeBullet.classList.remove('active')
            } else 
            
            if (targClass.contains("next")||targClass.contains("prev")) {
                var activeBullet = el.querySelector('.bullet.active')
                var index = Array.prototype.indexOf.call(bullets, activeBullet)
                var nextOrPrev = ''
                if (targClass.contains("next")) {
                    nextOrPrev = 'next'
                } else {
                    nextOrPrev = 'prev'
                }
    
                activeBullet.classList.remove('active')
                if (nextOrPrev=='next') {
                    if (index + 1 > slidesLength - 1) { index = 0 } else {index++}
                } else {
                    if (index - 1 < 0) { index = slidesLength - 1 } else {index--}
                }
    
                bullets[index].classList.add('active')
                slideWrapperUL.style.transform = 'translateX(' + (index * -100) + '%)'
            }
    
            
        })

    }

    var postMessageEl = el.querySelector('.post-message-container')
    if (postMessageEl) {
        if (postMessageEl.offsetHeight < postMessageEl.scrollHeight ||
            postMessageEl.offsetWidth < postMessageEl.scrollWidth) {
                var linkEl = document.createElement("a")
                linkEl.href = '/post/' + el.getAttribute("id").split("post-")[1]
                linkEl.innerText = 'Read more...'
                linkEl.classList.add("post-readmore")
                postMessageEl.insertAdjacentElement("afterend", linkEl)
        }
    }

    var videoEl = el.querySelector('.video-player')
    if (videoEl) {
        makeVideoInter(videoEl)        
    }

    var attachmentEl = el.querySelector('.post-attachment')
    if (attachmentEl) {
        var imgEl = attachmentEl.querySelector('img')
        imgEl.addEventListener("click", function() {
            var newPopupEl = imgEl.cloneNode(true)
            var clientRect = imgEl.getBoundingClientRect()

            newPopupEl.classList.add("popup")
            newPopupEl.style.left = clientRect.left + "px"
            newPopupEl.style.right = clientRect.right + "px"
            newPopupEl.style.bottom = clientRect.bottom + "px"
            newPopupEl.style.top = clientRect.top + "px"
            newPopupEl.style.width = clientRect.width + "px"
            newPopupEl.style.height = clientRect.height + "px"

            openPopup(newPopupEl)
            setTimeout(function() {
                newPopupEl.classList.add("center")
            }, 500)
        })
    }
}

function infiniteScroll(me, group, id) {
    var wrapper = me
    var loadWrapper = wrapper.querySelector('.loading')
    var postsChildren = wrapper.querySelectorAll('.post-container')
    if (postsChildren.length > 500) {
        return null
    }
    var lastChild = postsChildren[postsChildren.length - 1]
    var page = Number(me.getAttribute("data-page")) + 1
    var body = document.body
    var masonryShrink = body.getAttribute('masonry-shrink')
    var bool
    if (masonryShrink!='true') {
        var column1 = me.querySelector('.column1')
        var column2 = me.querySelector('.column2')

        bool = (wrapper.scrollTop + wrapper.clientHeight > (Math.min(column1.scrollHeight, column2.scrollHeight) - 150))
    } else {
        bool = (wrapper.scrollTop  + wrapper.clientHeight > wrapper.scrollTopMax - lastChild.offsetHeight - 100)
    }

    if (bool) {
        if (!loadWrapper) {
            var newLoadWrapper = document.createElement('div')
            newLoadWrapper.classList.add('loading')

            me.appendChild(newLoadWrapper)

            var iframe = document.getElementById(me.id + '-iframe')
            if (group==='feed') {
                iframe.src = '/feed/render/&page=' + page
            } else {
                iframe.src = '/explore/render/&page=' + page + '/&mode=' + group
            }
            iframe.setAttribute('onload', 'loadPosts(this, false)')
        }
    }
}

function loadPosts(el, orderBool) {
    var iframeDoc = el.contentDocument
    if (iframeDoc.readyState == 'complete') {
        var frameContent = iframeDoc.body
        if (frameContent) {
            var children = [...frameContent.children]
            var length = 0
            var wrapper = el.parentNode
            var mobileEl = wrapper.querySelector('.mobile')
            var column1 = wrapper.querySelector('.column1')
            var column2 = wrapper.querySelector('.column2')

            if (children.length === 0) {
                return null
            }

            Array.from(children)
                .forEach(node => {
                    length = wrapper.querySelectorAll(".post-container").length

                    // Prevent duplicate posts (websocket, pagination)
                    if (wrapper.querySelector('#' + node.id)) {
                        return null
                    }
                    node.classList.add("new")
                    addEventsToPost(node)
                    if (mobileEl.classList.contains("hidden")) {
                        if (length%2) {
                            if (orderBool) {
                                column2.insertBefore(node, column2.children[0])
                            } else {
                                column2.appendChild(node)
                            }
                        } else {
                            if (orderBool) {
                                column1.insertBefore(node, column1.children[0])
                            } else {
                                column1.appendChild(node)
                            }
                        }
                    } else {
                        mobileEl.appendChild(node)
                    }
                })

            wrapper.setAttribute("data-page", Number(wrapper.getAttribute("data-page")) + 1 )
            if (wrapper.querySelector('.loading')) {
                wrapper.querySelector('.loading').remove()
            }
        }
    } else {
        window.setTimeout(loadPosts, 1000)
    }
}

function listenForNewPostID(el) {
    var iframeDoc = el.contentDocument
    if (iframeDoc.readyState == 'complete') {
        var frameContent = iframeDoc.body
        if (frameContent) {
            var innerText = frameContent.innerText
            if (innerText!='error') {
                var iframe = document.all["explore-posts-iframe"]
                iframe.src = '/post/render&posts=["' + innerText + '"]'
                if (!iframe.getAttribute('onload')) {
                    iframe.setAttribute('onload', 'loadPosts(this, true)')
                }
            }
        }
    }
}

document.addEventListener("DOMContentLoaded", function() {
    adjustMasonry()

    // Add events to posts
    document.querySelectorAll('.post-container').forEach((el) => {
        addEventsToPost(el)
    })

    // Focus and blur events for textarea
    document.querySelectorAll('.main-content').forEach((el) => {
        var parent = el
        var action = "write"
        var composer = parent.querySelector('.post-composer')

        function closeComposer() {
            parent.setAttribute("data-composer-active", false)
            parent.className = "main-content"
            document.querySelector('.composer-group.' + action).classList.add("inactive")
        }

        if (composer) {
            var textarea = composer.querySelector('textarea')
            var actionsEl = parent.querySelector('.post-composer-actions')
            var cancel = composer.querySelector('button.cancel')
            var submit = composer.querySelector('button.submit')
            
            textarea.addEventListener("focus", function() {
                action = "write"
                parent.classList.add(action)
                parent.setAttribute("data-composer-active", true)
                document.querySelector('.composer-group.' + action).classList.remove("inactive")
            })
            cancel.addEventListener("click", function() {
                closeComposer()
            })
            submit.addEventListener("click", function() {
                if (action=="write") {
                    closeComposer()
                    var iframe = document.all["post-iframe"]
                    if (!iframe.getAttribute('onload')) {
                        iframe.setAttribute('onload', 'listenForNewPostID(this)')
                    }
                }
            })
            /*
            composer.addEventListener("focusout", function(e) {
                if (e.currentTarget.contains(e.relatedTarget)) {
                    return null
                }
                parent.setAttribute("data-composer-active", false)
                parent.className = "main-content"
                document.querySelector('.composer-group.' + action).classList.add("inactive")
            })
            */
            actionsEl.addEventListener("click", function(e) {
                var targEl = e.target
                if (targEl.classList.contains("post-composer-actions-imagemap")) {
                    action = targEl.classList[1] || "write"
                    parent.classList.add(action)
                    parent.setAttribute("data-composer-active", true)
                    document.querySelector('.composer-group.' + action).classList.remove("inactive")
                }
            })
        }
    })

    // Dropdown
    document.querySelectorAll('.dropdown-wrapper').forEach((el) => {
        el.addEventListener("click", function(e) {
            e.preventDefault()

            var targEl = e.target
            var targClass = e.target.classList
            var ul = el.querySelector('ul')
            var input = el.querySelector('input')
            var button = el.querySelector('button')

            if (targClass.contains('dropdown')) {
                ul.classList.toggle('hidden')
            }
            if (targEl.tagName === 'LI') {
                var value = targEl.getAttribute('data-value')
                ul.classList.add('hidden')
                input.value = value
                button.textContent = targEl.innerText
            }
        })
    })


    // Listen for new posts
    var ws = new WebSocket("wss://v3.perox.dev/v3/darflen/posts/.ws"); 
    ws.onmessage = function(e) {
        var data = JSON.parse(e.data)
        var iframe = ""
        console.log(e)
        if (data.event=="post") {
            iframe = document.all["explore-posts-iframe"]
            iframe.src = '/post/render&posts=["' + data.data.id + '"]'
            if (!iframe.getAttribute('onload')) {
                iframe.setAttribute('onload', 'loadPosts(this, true)')
            }
        }
    }
    // '{"data":{"feed":"recent","id":"6831e1c6a1016983e55ee9bb"},"event":"post"}'
})