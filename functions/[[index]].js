import { buildPost } from "../templates/post/.js"
import { getToken, updatePageWithCookie } from '../cookie.js'
import { renderNotification } from "../templates/notification/.js"
import { renderResult } from "../templates/result/.js"

export async function httpFetch(route, method, body, responseType, token) {
    let link = 'https://api.darflen.com'

    try {
        var json = {}
        json.method = method || "GET"
        json.headers = {}
        if (token) {
            json.headers['Authorization'] = 'Bearer ' + token
        }
        if (!(method=="GET") && !(method=="HEAD")) {
            if (responseType=='formdata') {
                json.body = body
            } else {
                json.body = JSON.stringify(body) || {}
            }
        }
        var response = await fetch(link + route, json)
        if (responseType == 'text') {
            return await response.text()
        } else {
            return await response.json()
        }
    } catch (error) {
        console.error(error)
    }
}


export async function onRequest(context) {
    const { request, env } = context
    const assetUrl = new URL('/index.html', request.url);
    let response = await env.ASSETS.fetch(assetUrl);
    const path = context.functionPath
    const rewriter = new HTMLRewriter()
    const timezone = request.cf.timezone

    const url = request.url
    const searchParams = new URLSearchParams(url)
    const cookie = request.headers.get("Cookie")
    const { user, token } = getToken(cookie)

    String.prototype.startsWith = function( str ){
        return ( this.indexOf( str ) === 0 );
    };

    function insertPostsAtEl(posts, el, rewriter) {
        rewriter.on(el, {
            async element(el) {
                for (let i = 0; i < posts.length; i++) {
                    var post = posts[i]
                    el.append(await buildPost(post, timezone, null, token), { 
                        html: true, 
                        contentOptions: 'after' 
                    })
                }
            }
        })
    }

    if (path) {
        var html = ''
        let page

        switch (true) {
            case path.startsWith('/auth/login'):
                const loginData = await request.text()
                const formData = new URLSearchParams(loginData)

                const loginApiResponse = await httpFetch('/auth/login', 'POST', formData, 'formdata')
                if (loginApiResponse.email||loginApiResponse.password)
                    return new Response('Missing email or password!')

                // Create our cookie
                const newCookie = `user=${loginApiResponse.username}||${loginApiResponse.token}; Expires=${new Date(new Date().getTime() + 20000000).toUTCString()}; secure; HttpOnly; Path=/; SameSite=Strict; Cache-Control=no-cache;`
                const response = await fetch(assetUrl);
                const newResponse = new Response(response.body, response);

                newResponse.headers.append("Set-Cookie", newCookie)
                return newResponse
            case path.startsWith('/new/post'):
                const postData = await request.text()
                const parsed = new URLSearchParams(postData)
                const postResponse = await httpFetch('/posts/create', 'POST', parsed, 'formdata', token)
                console.log(postResponse)
                
                if (postResponse.post_id) {
                    return new Response(postResponse.post_id, {headers: {'Content-Type': 'text/html'}})
                }

                return new Response("error", {headers: {'Content-Type': 'text/html'}})
            case path.startsWith('/explore/render'):
                page = searchParams.get('page')
                var mode = searchParams.get('mode')
                if (mode==='explore') {
                    mode = 'recent'
                }

                let explorePagePosts = await httpFetch('/explore/' + mode + '/get/' + page, 'GET', null)
                explorePagePosts = explorePagePosts.posts
                for (let i = 0; i < explorePagePosts.length; i++) {
                    var post = explorePagePosts[i]
                    html += await buildPost(post, timezone, null, token)
                }
                return new Response(html, {headers: {'Content-Type': 'text/html'}})
            case path.startsWith('/feed/render'):
                page = searchParams.get('page')

                let feedPosts = await httpFetch('/feed/get?page=' + page, 'GET', null, 'json', token)
                feedPosts = feedPosts.posts
                for (let i = 0; i < feedPosts.length; i++) {
                    var post = feedPosts[i]
                    html += await buildPost(post, timezone, null, token)
                }
                return new Response(html, {headers: {'Content-Type': 'text/html'}})
            case path.startsWith('/post/render'):
                let postsArr = JSON.parse(searchParams.get('posts'))
                for (let i = 0; i < postsArr.length; i++) {
                    var id = postsArr[i]
                    var fetchResult = await httpFetch('/posts/' + id, 'GET', null)

                    html += await buildPost(fetchResult.post, timezone, null, token)
                }
                return new Response(html, {headers: {'Content-Type': 'text/html'}})
            case path.startsWith('/search/render'):
                page = Number(searchParams.get('page')) - 1
                var q = searchParams.get('q')

                let searchPosts = await httpFetch('/search/?q=' + q + '/&p' + page, 'GET', null, 'json', token)
                searchPosts = searchPosts.posts
                for (let i = 0; i < searchPosts.length; i++) {
                    var post = searchPosts[i]
                    html += await buildPost(post, timezone, null, token)
                }
                return new Response(html, {headers: {'Content-Type': 'text/html'}})
            case path.startsWith('/api/notifications'):
                const apiNotifs = await httpFetch('/notifications/get/1', 'GET', null, 'json', token)
                const notifications = apiNotifs.result
                html = '<link type="text/css" href="/styles/index.css" rel="stylesheet">'
                html += '<style>body{overflow: hidden;overflow-y: auto;scrollbar-width: none;-ms-overflow-style: none}</style>'
                for (let i = 0; i < notifications.length; i++) {
                    const notification = notifications[i]
                    html += await renderNotification(notification)
                }

                return new Response(html, {headers: {'Content-Type': 'text/html'}})
            case path.startsWith('/render/search/autocomplete'):
                html = ''
                async function renderSearchGroup(results, name) {
                    if (results.length<1) {
                        return null
                    }
                    var result = ''
                    for (let i = 0; i < results.length && i < 3; i++) {
                        result += await renderResult(results[i])
                    }

                    if (result) {
                        html += '<div class="search-result-group">'
                        if (name) {
                            html += '<small>' + name + '</small>'
                        }
                        html += result
                        html += '</div>'
                    }
                }

                let query = searchParams.get('query')
                if (query.trim()=='') {
                    return new Response("", {headers: {'Content-Type': 'text/html'}})
                }
                const [groupsResults, usersResults, postsResults] = await Promise.all([
                    httpFetch('/search/communities?q=' + query, 'GET', null),
                    httpFetch('/search/users?q=' + query, 'GET', null),
                    httpFetch('/search?q=' + query, 'GET', null)
                ])
                if (!groupsResults.communites
                    && !usersResults.users
                    && !postsResults.posts
                ) {
                    return new Response("", {headers: {'Content-Type': 'text/html'}})
                }
                await Promise.all([
                    renderSearchGroup(groupsResults.communities, 'Communities'),
                    renderSearchGroup(usersResults.users, 'People'),
                    renderSearchGroup(postsResults.posts, null)
                ])
                return new Response(html, {headers: {'Content-Type': 'text/html'}})
            case path.startsWith('/'):
                const [explorePosts, popularPosts, trendingPosts] = await Promise.all([
                    httpFetch('/explore/recent/get/1', 'GET', null),
                    httpFetch('/explore/popular/get/1', 'GET', null),
                    httpFetch('/explore/trending/get/1', 'GET', null)
                ])
                insertPostsAtEl(explorePosts.posts, '#explore-posts .mobile', rewriter)
                insertPostsAtEl(popularPosts.posts, '#popular-posts .mobile', rewriter)
                insertPostsAtEl(trendingPosts.posts, '#trending-posts .mobile', rewriter)

                if (token) {
                    let feedPostsResult = await httpFetch('/feed/get?page=1', 'GET', null, 'json', token)
                    insertPostsAtEl(feedPostsResult.posts, '#feed-posts .mobile', rewriter)
                } else {
                    rewriter.on('.post-composer', {
                        element(el) {
                            el.remove()
                        }
                    })
                    rewriter.on('#tabs-bar a:nth-child(2)', {
                        element(el) {
                            el.remove()
                        }
                    })
                    rewriter.on('#feed-posts', {
                        element(el) {
                            el.remove()
                        }
                    })
                }
                break;
            default:
                break;
        }
    }

    updatePageWithCookie(env, request, rewriter)
    return rewriter.transform(response)
}
/*
[{"type":"post_love","data":{"lover":"b15f9aad6d57ed2727e22d8f","post":"af33ea194c1e14059896c584","read":true,"miscellaneous":{"creation_time":1783886646},"hash":2855262723}},{"type":"post_love","data":{"lover":"ae3b56fa0cd439061997aaf8","post":"af33ea194c1e14059896c584","read":true,"miscellaneous":{"creation_time":1783874768},"hash":3576015167}},{"type":"comment","data":{"comment":"6c9396b0818bf28952db2b74","user":"7963f91bfc853c5ccf23441a","parent_user":"352fcdc3cf66d6769f3d3de3","parent_comment":"af33ea194c1e14059896c584","read":true,"miscellaneous":{"creation_time":1783873513}}},{"type":"comment","data":{"comment":"b1f1488d070b9902bb4a005c","user":"81f21d70618723116c24db09","parent_user":"352fcdc3cf66d6769f3d3de3","parent_comment":"af33ea194c1e14059896c584","read":true,"miscellaneous":{"creation_time":1783872639}}},{"type":"post_love","data":{"lover":"81f21d70618723116c24db09","post":"af33ea194c1e14059896c584","read":true,"miscellaneous":{"creation_time":1783872542},"hash":3999046893}},{"type":"reply","data":{"reply":"bd1f016f570ccb5ea096098a","user":"81f21d70618723116c24db09","parent_user":"352fcdc3cf66d6769f3d3de3","parent_reply":"825549f9659b5aab4a6c1851","read":true,"miscellaneous":{"creation_time":1783872532}}},{"type":"reply_love","data":{"lover":"81f21d70618723116c24db09","reply":"b9974829871d28378f8e0faa","parent":"825549f9659b5aab4a6c1851","read":true,"miscellaneous":{"creation_time":1783872513},"hash":2163479794}},{"type":"reply_love","data":{"lover":"81f21d70618723116c24db09","reply":"03fcfe1eb9fad0a31bca243d","parent":"825549f9659b5aab4a6c1851","read":true,"miscellaneous":{"creation_time":1783872506},"hash":1853170202}},{"type":"reply","data":{"reply":"9c4b8106956d937bef6ccf8c","user":"81f21d70618723116c24db09","parent_user":"352fcdc3cf66d6769f3d3de3","parent_reply":"825549f9659b5aab4a6c1851","read":true,"miscellaneous":{"creation_time":1783869557}}},{"type":"reply","data":{"reply":"9b68983e0bff57cefb1b6a54","user":"81f21d70618723116c24db09","parent_user":"352fcdc3cf66d6769f3d3de3","parent_reply":"825549f9659b5aab4a6c1851","read":true,"miscellaneous":{"creation_time":1783869539}}},{"type":"reply","data":{"reply":"c5983138698cf0c2d974bb5f","user":"81f21d70618723116c24db09","parent_user":"352fcdc3cf66d6769f3d3de3","parent_reply":"825549f9659b5aab4a6c1851","read":true,"miscellaneous":{"creation_time":1783869450}}},{"type":"reply","data":{"reply":"090e0d134fccd06d43f534d6","user":"81f21d70618723116c24db09","parent_user":"352fcdc3cf66d6769f3d3de3","parent_reply":"825549f9659b5aab4a6c1851","read":true,"miscellaneous":{"creation_time":1783869076}}},{"type":"reply_love","data":{"lover":"81f21d70618723116c24db09","reply":"f76a8fd968248b2cd9ffa9f4","parent":"a36e3866212eb7effc6408f2","read":true,"miscellaneous":{"creation_time":1783869005},"hash":2582651517}},{"type":"reply","data":{"reply":"1086690daa9a7ef9efce256a","user":"7963f91bfc853c5ccf23441a","parent_user":"7963f91bfc853c5ccf23441a","parent_reply":"0afe4b427a294c138d99b6df","read":true,"miscellaneous":{"creation_time":1783860048}}},{"type":"reply","data":{"reply":"6681491c1b45a1d7ce8d1f24","user":"7963f91bfc853c5ccf23441a","parent_user":"7963f91bfc853c5ccf23441a","parent_reply":"0afe4b427a294c138d99b6df","read":true,"miscellaneous":{"creation_time":1783859463}}},{"type":"reply","data":{"reply":"67337812afb79f37d44b3b86","user":"7963f91bfc853c5ccf23441a","parent_user":"7963f91bfc853c5ccf23441a","parent_reply":"0afe4b427a294c138d99b6df","read":true,"miscellaneous":{"creation_time":1783858921}}},{"type":"reply","data":{"reply":"09677d33e7514f604c99977a","user":"7963f91bfc853c5ccf23441a","parent_user":"7963f91bfc853c5ccf23441a","parent_reply":"0afe4b427a294c138d99b6df","read":true,"miscellaneous":{"creation_time":1783858459}}},{"type":"comment","data":{"comment":"19ca978dbea28e8eb38933b8","user":"81f21d70618723116c24db09","parent_user":"352fcdc3cf66d6769f3d3de3","parent_comment":"a36e3866212eb7effc6408f2","read":true,"miscellaneous":{"creation_time":1783850141}}},{"type":"post_love","data":{"lover":"81f21d70618723116c24db09","post":"07cd398ab4f37901f9652afd","read":true,"miscellaneous":{"creation_time":1783840686},"hash":1633782420}},{"type":"reply","data":{"reply":"6e29a655f21962dd4a0f2264","user":"00b7b9d1439f161233e2ac70","parent_user":"352fcdc3cf66d6769f3d3de3","parent_reply":"0e8f06a575e69db0ec2d4f2d","read":true,"miscellaneous":{"creation_time":1783827599}}},{"type":"comment_love","data":{"lover":"00b7b9d1439f161233e2ac70","comment":"ed23db4861d412cabdc45c14","parent":"0e8f06a575e69db0ec2d4f2d","read":true,"miscellaneous":{"creation_time":1783827584},"hash":96916016}},{"type":"post_love","data":{"lover":"1d4fc6254094b3867cacfaa1","post":"0afe4b427a294c138d99b6df","read":true,"miscellaneous":{"creation_time":1783814058},"hash":1955428146}},{"type":"post_love","data":{"lover":"1d4fc6254094b3867cacfaa1","post":"ee18f31b7713bc6ad263bc0c","read":true,"miscellaneous":{"creation_time":1783814017},"hash":4052721059}},{"type":"post_love","data":{"lover":"9abcd41b1ef49625d7f5cf6e","post":"ee18f31b7713bc6ad263bc0c","read":true,"miscellaneous":{"creation_time":1783810468},"hash":4045737644}},{"type":"post_love","data":{"lover":"1d4fc6254094b3867cacfaa1","post":"07cd398ab4f37901f9652afd","read":true,"miscellaneous":{"creation_time":1783809868},"hash":3985690042}},{"type":"post_love","data":{"lover":"1d4fc6254094b3867cacfaa1","post":"3793daee651141121aa1513a","read":true,"miscellaneous":{"creation_time":1783809865},"hash":1474370631}},{"type":"comment","data":{"comment":"464284b65da0029e43ab305f","user":"7963f91bfc853c5ccf23441a","parent_user":"352fcdc3cf66d6769f3d3de3","parent_comment":"0afe4b427a294c138d99b6df","read":true,"miscellaneous":{"creation_time":1783805430}}},{"type":"reply","data":{"reply":"daf819a05ad15cec9ec24775","user":"7963f91bfc853c5ccf23441a","parent_user":"352fcdc3cf66d6769f3d3de3","parent_reply":"36a5fcaaf0babd536cea1173","read":true,"miscellaneous":{"creation_time":1783796674}}},{"type":"comment_love","data":{"lover":"818b1f02e9a7b022000b3654","comment":"aa4309a7c46910a28cba56cf","parent":"056330196a26d559a9c98c97","read":true,"miscellaneous":{"creation_time":1783787294},"hash":821073130}},{"type":"comment_love","data":{"lover":"818b1f02e9a7b022000b3654","comment":"5a5a88090dd32616d1630fa0","parent":"056330196a26d559a9c98c97","read":true,"miscellaneous":{"creation_time":1783787293},"hash":3045303234}},{"type":"post_love","data":{"lover":"b15f9aad6d57ed2727e22d8f","post":"07cd398ab4f37901f9652afd","read":true,"miscellaneous":{"creation_time":1783786007},"hash":621988986}},{"type":"post_love","data":{"lover":"43a1548ad5ebdccc7a9cadb4","post":"3d5152f6a8bae259df2a9481","read":true,"miscellaneous":{"creation_time":1783785459},"hash":1510301162}},{"type":"comment","data":{"comment":"2468b9e06a6be15a246e9ced","user":"81f21d70618723116c24db09","parent_user":"352fcdc3cf66d6769f3d3de3","parent_comment":"a36e3866212eb7effc6408f2","read":true,"miscellaneous":{"creation_time":1783780787}}},{"type":"post_love","data":{"lover":"3a5ac05ec068235d4f64369b","post":"3d5152f6a8bae259df2a9481","read":true,"miscellaneous":{"creation_time":1783775908},"hash":1393441352}},{"type":"post_love","data":{"lover":"81f21d70618723116c24db09","post":"3d5152f6a8bae259df2a9481","read":true,"miscellaneous":{"creation_time":1783773321},"hash":1502190209}},{"type":"comment","data":{"comment":"1c6d0f618e6967ed3b641098","user":"3a5ac05ec068235d4f64369b","parent_user":"352fcdc3cf66d6769f3d3de3","parent_comment":"e116b36ef010a0a7a814c977","read":true,"miscellaneous":{"creation_time":1783772633}}},{"type":"post_love","data":{"lover":"3a5ac05ec068235d4f64369b","post":"e116b36ef010a0a7a814c977","read":true,"miscellaneous":{"creation_time":1783772615},"hash":2767496005}},{"type":"post_love","data":{"lover":"81f21d70618723116c24db09","post":"1aa9544351793e6df823c5cc","read":true,"miscellaneous":{"creation_time":1783749764},"hash":3738842965}},{"type":"repost","data":{"repost":"89a327454d202911cd751462","user":"65f9b819264ae91c7929ab00","parent_post":"e116b36ef010a0a7a814c977","parent_user":"352fcdc3cf66d6769f3d3de3","read":true,"miscellaneous":{"creation_time":1783743484}}},{"type":"post_love","data":{"lover":"1d4fc6254094b3867cacfaa1","post":"1aa9544351793e6df823c5cc","read":true,"miscellaneous":{"creation_time":1783729542},"hash":1378578555}},{"type":"post_love","data":{"lover":"1d4fc6254094b3867cacfaa1","post":"f84548665172f5f3210b6292","read":true,"miscellaneous":{"creation_time":1783729504},"hash":2528807967}},{"type":"post_love","data":{"lover":"1d4fc6254094b3867cacfaa1","post":"08fc68a23a7a7e03a4d71797","read":true,"miscellaneous":{"creation_time":1783729485},"hash":1842961321}},{"type":"comment","data":{"comment":"dd1a83623f0922faf6261538","user":"7963f91bfc853c5ccf23441a","parent_user":"352fcdc3cf66d6769f3d3de3","parent_comment":"1aa9544351793e6df823c5cc","read":true,"miscellaneous":{"creation_time":1783726792}}},{"type":"reply","data":{"reply":"65c4525dad2a59980d93fbc9","user":"818b1f02e9a7b022000b3654","parent_user":"818b1f02e9a7b022000b3654","parent_reply":"1a997bde329cc616c75b2ea4","read":true,"miscellaneous":{"creation_time":1783707405}}},{"type":"repost","data":{"repost":"28ed21e1a7f4253d733318c0","user":"7963f91bfc853c5ccf23441a","parent_post":"f84548665172f5f3210b6292","parent_user":"352fcdc3cf66d6769f3d3de3","read":true,"miscellaneous":{"creation_time":1783705728}}},{"type":"reply","data":{"reply":"023ea4f8476b7edd0f075513","user":"818b1f02e9a7b022000b3654","parent_user":"818b1f02e9a7b022000b3654","parent_reply":"1a997bde329cc616c75b2ea4","read":true,"miscellaneous":{"creation_time":1783701578}}},{"type":"reply","data":{"reply":"f7666d20b9b700ff857b523d","user":"818b1f02e9a7b022000b3654","parent_user":"818b1f02e9a7b022000b3654","parent_reply":"1a997bde329cc616c75b2ea4","read":true,"miscellaneous":{"creation_time":1783701467}}},{"type":"comment_love","data":{"lover":"b15f9aad6d57ed2727e22d8f","comment":"72d708d1544123a6d37a88c2","parent":"c0ec212f420c78b8ddbfddee","read":true,"miscellaneous":{"creation_time":1783701136},"hash":180786599}},{"type":"post_love","data":{"lover":"43a1548ad5ebdccc7a9cadb4","post":"08fc68a23a7a7e03a4d71797","read":true,"miscellaneous":{"creation_time":1783700603},"hash":3802455020}},{"type":"post_love","data":{"lover":"ae3b56fa0cd439061997aaf8","post":"08fc68a23a7a7e03a4d71797","read":true,"miscellaneous":{"creation_time":1783694619},"hash":3662752085}}]
*/