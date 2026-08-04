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

function banrHeight() {
    var banrEl = document.getElementById('profile-banner-container')
    var tabsParent = document.getElementById('tabs-bar')
    var targTab = tabsParent.querySelector('.selected')
    var index = Array.prototype.indexOf.call(tabsParent.children, targTab)
    var contentDiv = document.getElementById('scrollable-content').children[index]


    var divScrollTop = contentDiv.scrollTop
    var banrHeight = banrEl.clientHeight
    if (banrHeight - divScrollTop > 400) {
        return null
    }
    if (divScrollTop > 400) {
        banrEl.style.height = "0px"
    } else {
        contentDiv.style.paddingTop = divScrollTop + 10
        banrEl.style.height = (400 - divScrollTop) + "px"
    }
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

function adjustMasonry(v) {
    var scr_w = document.body.offsetWidth
    var mobile = scr_w < 770
    var body = document.body
    var masonryShrink = body.getAttribute('masonry-shrink')
    if (((masonryShrink!='false') == (mobile!=false))&&!v) {
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

function cloneNodeAtExactPos(el) {
    var newPopupEl = el.cloneNode(true)
    var clientRect = el.getBoundingClientRect()

    newPopupEl.style.left = clientRect.left + "px"
    newPopupEl.style.right = clientRect.right + "px"
    newPopupEl.style.bottom = clientRect.bottom + "px"
    newPopupEl.style.top = clientRect.top + "px"
    newPopupEl.style.width = clientRect.width + "px"
    newPopupEl.style.height = clientRect.height + "px"

    return newPopupEl
}

function addEventsToPostComments(el) {
    var comments = el.querySelectorAll('.comment')
    Array.from(comments).forEach(node => {
        var replyToggle = node.querySelector('.reply-toggle a')
        var repliesWrapper = node.querySelector('.replies-wrapper')
        var repliesEl = node.querySelector('.replies')

        if (replyToggle && repliesWrapper) {
            var height = repliesEl.getBoundingClientRect().height + 15
            repliesWrapper.style.maxHeight = height + 'px'
            replyToggle.addEventListener("click", function(e) {
                e.preventDefault()

                var closed = repliesWrapper.classList.contains('collapsed')
                if (closed) {
                    replyToggle.textContent = 'Close replies ↑'
                    repliesWrapper.style.height = repliesWrapper.style.maxHeight
                    repliesWrapper.classList.remove('collapsed')
                } else {
                    replyToggle.textContent = 'Open replies ↓'
                    repliesWrapper.style.height = '0px'
                    repliesWrapper.classList.add('collapsed')
                }
            })
        }
    })
}

function addEventsToPost(el, popup) {
    var postId = el.getAttribute("id").split("post-")[1]
    setTimeout(function() {
        el.classList.remove("new")
    },500)

    
    var postReplyAreaWrapper = el.querySelector('.post-reply-area-wrapper')
    var postReplyArea = el.querySelector('.post-reply-area')
    var postCancel = el.querySelector('.cancel')
    var postSubmit = el.querySelector('.submit')

    var postContent = el.querySelector('.comment-reply-wrapper textarea')
    var txtArea = el.querySelector('.post-actions-textarea')
    var replyTxtArea = el.querySelector('.post-reply-area .post-actions-textarea')
    
    var replyWrapper = el.querySelector('.comment-reply-wrapper')
    var commentsEl = el.querySelector('.comments')

    function addComment(response) {
        commentsEl.insertAdjacentHTML("afterBegin", response)
        txtArea.classList.remove('hidden')
        replyTxtArea.classList.remove('hidden')
        replyWrapper.classList.add('hidden')

        var height = postReplyArea.getBoundingClientRect().height
        postReplyAreaWrapper.classList.add('thin')

        setTimeout(function() {
            postReplyAreaWrapper.classList.remove('thin')
            postReplyAreaWrapper.style.height = height + 'px'
        },500)
    }

    if (txtArea) {
        txtArea.addEventListener("click", function() {
            if (postReplyArea) {
                postReplyAreaWrapper.classList.remove('thin')
                txtArea.classList.add('hidden')

                if (el.querySelector('.comments') && !el.querySelector('.comment')) {
                    http("GET", '/comments/&post_id=' + postId, null, function(html){
                        commentsEl.insertAdjacentHTML("beforeEnd", html)
                        addEventsToPostComments(commentsEl)
                    })
                }
            }
        })
        postCancel.addEventListener("click", function() {
            if (el.querySelector('.comment')) {
                replyWrapper.classList.add('hidden')
                replyTxtArea.classList.remove('hidden')
            } else {
                postReplyAreaWrapper.classList.add('thin')
                txtArea.classList.remove('hidden')
            }
        })
        postSubmit.addEventListener("click", function() {
            http("POST", '/post/comment/&post_id=' + postId + '&textarea=' + escape(postContent.value), null, addComment)
        })
        replyTxtArea.addEventListener("click", function() {
            replyTxtArea.classList.add('hidden')
            postReplyArea.appendChild(replyWrapper)
            replyWrapper.classList.remove('hidden')
        })
    }

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
                linkEl.href = '/post/' + postId
                linkEl.innerText = 'Read more...'
                linkEl.classList.add("post-readmore")
                postMessageEl.insertAdjacentElement("afterend", linkEl)
        }
        postMessageEl.addEventListener("click", function() {
            var postPopup = document.getElementById("post-popup")
            if (!postPopup && !popup) {
                postPopup = cloneNodeAtExactPos(el)
                addEventsToPost(postPopup, true)
                var popupPostWrapper = document.createElement('div')
                popupPostWrapper.id = 'post-container-wrapper'
                popupPostWrapper.appendChild(postPopup)

                popupPostWrapper.addEventListener("click", function(e) {
                    if (e.target.id!=='post-container-wrapper') {
                        return null
                    }

                    popupPostWrapper.scroll({ behavior: 'instant', top: 0 })
                    postPopup.classList.remove('post-popup')
                    postPopup.style.height = 'fit-content'
                    postPopup.style.height = 'max-content'
                    var newPost
                    setTimeout(function() {
                        document.getElementById("main").classList.remove('transparent')
                        newPost = postPopup.cloneNode(true)
                        newPost.style = ''
                        addEventsToPost(newPost)
                        el.insertAdjacentElement('afterEnd', newPost)
                        el.remove()
                        newPost.querySelector('.comments').scrollTop = postPopup.querySelector('.comments').scrollTop
                    },500)
                    setTimeout(function () {
                        postPopup.remove()
                        popupPostWrapper.remove()
                        addEventsToPostComments(newPost.querySelector('.comments'))
                    }, 750)
                })

                document.body.appendChild(popupPostWrapper)
                postPopup.querySelector('.comments').scrollTop = commentsEl.scrollTop
                setTimeout(function() {
                    addEventsToPostComments(postPopup.querySelector('.comments'))
                    postPopup.classList.add('post-popup')
                },500)
                document.getElementById("main").classList.add('transparent')
            }
        })
    }

    var videoEl = el.querySelector('.video-player')
    if (videoEl) {
        makeVideoInter(videoEl)        
    }

    var attachmentEl = el.querySelector('.post-attachment')
    if (attachmentEl) {
        var imgEl = attachmentEl.querySelector('img')
        if (imgEl) {
            imgEl.addEventListener("click", function() {
                var newPopupEl = cloneNodeAtExactPos(imgEl)
                newPopupEl.classList.add("popup")
    
                openPopup(newPopupEl)
                setTimeout(function() {
                    newPopupEl.classList.add("center")
                }, 500)
            })
        }
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
            } else if (group==='search') {
                iframe.src = '/search/render/&page=' + page + '/&q=' + document.all['q'].value
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

function loadAutocomplete(el) {
    if (el.src == window.location.href) {
        return null
    }

    var iframeDoc = el.contentDocument
    var resultsEl = document.getElementById("search-results")
    if (iframeDoc.readyState == 'complete') {
        var frameContent = iframeDoc.body
        if (frameContent) {
            resultsEl.innerHTML = frameContent.innerHTML
            resultsEl.classList.remove('hidden')
        }
    }
}


document.addEventListener("DOMContentLoaded", function() {
    adjustMasonry(true)

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
            cancel.addEventListener("click", function(e) {
                e.preventDefault()
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
                if (el.classList.contains('redirect')) {
                    window.location.href = '/' + value
                }
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