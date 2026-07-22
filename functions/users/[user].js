import { getToken, updatePageWithCookie } from "../../cookie";
import { buildPost, md } from "../../templates/post/.js";
import { httpFetch } from '../[[index]].js'

export async function onRequest(context) {
    const { request, env } = context
    const assetUrl = new URL('/user.html', request.url);
    let response = await env.ASSETS.fetch(assetUrl);
    const path = context.functionPath
    const rewriter = new HTMLRewriter()
    const timezone = request.cf.timezone

    const url = request.url
    const accUser = context.params.user
    const searchParams = new URLSearchParams(url)
    const cookie = request.headers.get("Cookie")
    const { user, token } = getToken(cookie)

    const [userData, followers, following] = await Promise.all([
        httpFetch('/users/' + accUser, 'GET', null, 'json'),
        httpFetch('/users/' + accUser + '/followers/1/6', 'GET', null, 'json'),
        httpFetch('/users/' + accUser + '/following/1/6', 'GET', null, 'json')
    ])

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

    var description = userData.profile.description

    rewriter
        .on("title", {
            element(el) {
                el.setInnerContent(userData.profile.display_name + ' | Yapflen')
            }
        })
        .on('#user-profile', {
            element(el) {
                el.setAttribute("onscroll", "infiniteScroll(this,'users','" + accUser + "');banrHeight()")
            }
        })
        .on('#profile-banner-container', {
            element(el) {
                el.setAttribute('style', 'background-image:url("' + userData.profile.images.banner.large + '")')
            }
        })
        .on('#banner-user-pfp img', {
            element(el) {
                el.setAttribute('src', userData.profile.images.icon.large)
            }
        })
        .on('#banner-user-displayname', {
            element(el) {
                el.setInnerContent(userData.profile.display_name)
            }
        })
        .on('#banner-user-username', {
            element(el) {
                el.setInnerContent(userData.profile.username)
            }
        })
        .on('#followers-count', {
            element(el) {
                el.setAttribute("href", "/users/" + userData.profile.username + '/followers')
                el.setInnerContent(userData.stats.followers + ' people')
            }
        })
        .on('#following-count', {
            element(el) {
                el.setAttribute("href", "/users/" + userData.profile.username + '/following')
                el.setInnerContent(userData.stats.following + ' people')
            }
        })
        .on('#aboutme-card', {
            element(el) {
                if (description.trim()=="") {
                    el.remove()
                }
            }
        })
        .on('#aboutme-card .card-description', {
            element(el) {
                if (description.trim()!="") {
                    el.setInnerContent(md.render(description), { html: true })
                }
            }
        })
        .on('#followers-list', {
            element(el) {
                followers.followers.forEach(o => {
                    el.append('<div class="group-user-icon"><a href="/users/', { html: true, ContentOptions: 'after'})
                    el.append(o.profile.username)
                    el.append('"><img src="', { html: true, ContentOptions: 'after'})
                    el.append(o.profile.images.icon.medium)
                    el.append('"/></a></div>', { html: true, ContentOptions: 'after'})
                })
            }
        })
        .on('#following-list', {
            element(el) {
                following.following.forEach(o => {
                    el.append('<div class="group-user-icon"><a href="/users/', { html: true, ContentOptions: 'after'})
                    el.append(o.profile.username)
                    el.append('"><img src="', { html: true, ContentOptions: 'after'})
                    el.append(o.profile.images.icon.medium)
                    el.append('"/></a></div>', { html: true, ContentOptions: 'after'})
                })
            }
        })
        .on('#banner-media-links', {
            element(el) {
                userData.profile.links.forEach(l => {
                    el.append('<div class="link"><a target="_blank" href="', { html: true, ContentOptions: 'after'})
                    el.append(l.link)
                    el.append('"><img src="', { html: true, ContentOptions: 'after'})
                    el.append('https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&size=24&url=' + l.link)
                    el.append('"/></a></div>', { html: true, ContentOptions: 'after'})
                })
            }
        })

    let userPosts = await httpFetch('/users/' + accUser + '/posts', 'GET', null, 'json', token)
    insertPostsAtEl(userPosts.posts, '#user-profile .mobile', rewriter)

    updatePageWithCookie(env, request, rewriter)
    return rewriter.transform(response)
}