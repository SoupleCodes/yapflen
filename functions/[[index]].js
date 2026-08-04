import { buildPost } from "../templates/post/.js"
import { buildComment } from "../templates/comment/.js"
import { getToken, updatePageWithCookie } from '../cookie.js'
import { renderNotification } from "../templates/notification/.js"
import { renderResult } from "../templates/result/.js"/*
import { Hono } from 'hono'
import { trimTrailingSlash } from "hono/trailing-slash"*/

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
/*
const app = new Hono()
app
    .use(trimTrailingSlash)
    .get('/', (c) => {
        return c.html('hi')
    })

    */

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
                    el.append(await buildPost(post, timezone, null, token, post), { 
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
                    html += await buildPost(post, timezone, null, token, post)
                }
                return new Response(html, {headers: {'Content-Type': 'text/html'}})
            case path.startsWith('/feed/render'):
                page = searchParams.get('page')

                let feedPosts = await httpFetch('/feed/get?page=' + page, 'GET', null, 'json', token)
                feedPosts = feedPosts.posts
                for (let i = 0; i < feedPosts.length; i++) {
                    var post = feedPosts[i]
                    html += await buildPost(post, timezone, null, token, post)
                }
                return new Response(html, {headers: {'Content-Type': 'text/html'}})
            case path.startsWith('/post/render'):
                let postsArr = JSON.parse(searchParams.get('posts'))
                for (let i = 0; i < postsArr.length; i++) {
                    var id = postsArr[i]
                    var fetchResult = await httpFetch('/posts/' + id, 'GET', null)

                    html += await buildPost(fetchResult.post, timezone, null, token, post)
                }
                return new Response(html, {headers: {'Content-Type': 'text/html'}})
            case path.startsWith('/post/comment'):
                const textarea = searchParams.get('textarea')
                const post_id = searchParams.get('post_id')

                var commentPostFormData = new FormData()
                commentPostFormData.append('textarea', textarea)
                commentPostFormData.append('post_id', post_id)
                
                const commentResponse = await httpFetch('/posts/' + post_id + '/comment', 'POST', commentPostFormData, 'formdata', token)
                var fetchResult = await httpFetch('/comments/' + commentResponse.comment_id, 'GET', null)
                
                return new Response(await buildComment(fetchResult.comment, timezone))
            case path.startsWith('/comments'):
                const commentsPostID = searchParams.get('post_id')

                const commentsResponse = await httpFetch('/posts/' + commentsPostID + '/comments', 'GET')
                const commentsArr = commentsResponse.comments
                for (let i = 0; i < commentsArr.length; i++) {
                    var c = commentsArr[i]
                    html += await buildComment(c, timezone)
                }
                return new Response(html)
            case path.startsWith('/search/render'):
                page = Number(searchParams.get('page')) - 1
                var q = searchParams.get('q')

                let searchPosts = await httpFetch('/search/?q=' + q + '/&p' + page, 'GET', null, 'json', token)
                searchPosts = searchPosts.posts
                for (let i = 0; i < searchPosts.length; i++) {
                    var post = searchPosts[i]
                    html += await buildPost(post, timezone, null, token, post)
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

                html = '<div style="padding: 15px 10px;background: #e6e6e6;">Search yapflen for "' + query + '"</div>'
                const [groupsResults, usersResults, postsResults] = await Promise.all([
                    httpFetch('/search/communities?q=' + query, 'GET', null),
                    httpFetch('/search/users?q=' + query, 'GET', null),
                    httpFetch('/search?q=' + query, 'GET', null)
                ])
                if (!groupsResults.communities
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
