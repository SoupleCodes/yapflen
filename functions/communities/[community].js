import { getToken, updatePageWithCookie } from "../../cookie.js";
import { buildPost, md } from "../../templates/post/.js";
import { httpFetch } from "../[[index]].js";

function setInnOfEl(rew,element,content) {
    rew.on(element, {
        element(el) {
            el.setInnerContent(content)
        }
    })
}

export async function onRequest(context) {
    const { request, env } = context
    const assetUrl = new URL('/community.html', request.url);
    let response = await env.ASSETS.fetch(assetUrl);
    const path = context.functionPath
    const rewriter = new HTMLRewriter()
    const timezone = request.cf.timezone

    const url = request.url
    const searchParams = new URLSearchParams(url)
    const cookie = request.headers.get("Cookie")
    const { user, token } = getToken(cookie)

    const name = context.params.community
    const [ data, members ] = await Promise.all([
        httpFetch('/communities/' + name, 'GET', null, 'json'),
        httpFetch('/communities/' + name + '/members', 'GET', null, 'json')
    ])
    const posts = await httpFetch('/communities/' + name + '/posts', 'GET', null, 'json')
    insertPostsAtEl(posts.posts, '.posts-wrapper .mobile', rewriter)

    function insertPostsAtEl(posts, el, rewriter) {
                rewriter.on(el, {
                    async element(el) {
                        for (let i = 0; i < posts.length; i++) {
                            var post = posts[i]
                            el.append(await buildPost(post, timezone, null, token, post, post.group.owner.username), { 
                                html: true, 
                                contentOptions: 'after' 
                            })
                        }
                    }
                })
    }

    setInnOfEl(rewriter, 'title', data.profile.name + ' | Yapflen')
    setInnOfEl(rewriter, '#community-display-name', data.profile.display_name)
    setInnOfEl(rewriter, '#community-username', '%' + data.profile.name)
    setInnOfEl(rewriter, '#member-count .stats-count', data.stats.members)
    setInnOfEl(rewriter, '#posts-count .stats-count', data.stats.posts)

    rewriter
        .on('#community-banner-wrapper img.community-banner', {
            element(el) {
                el.setAttribute('src', data.profile.images.banner.large)
            }
        })
        .on('#community-pfp img', {
            element(el) {
                el.setAttribute('src', data.profile.images.icon.large)
            }
        })
        .on('.masonry-container', {
            element(el) {
                if (token) {
                    el.before('<div class="join notice"><small class="notice-message">Join this community to post</small><button>Join community</button></div>', {
                        html: true
                    })
                }
            }
        })
        .on('#community-description', {
            element(el) {
                var description = data.profile.description
                if (description.trim()!="") {
                    el.setInnerContent('<small>' + md.render(description) + '</small>', { html: true })
                } else {
                    el.remove()
                }
            }
        })
        .on('#community-members-list', {
            element(el) {
                members.members.forEach(o => {
                    el.append('<div class="group-user-icon"><a href="/users/', { html: true, ContentOptions: 'after'})
                    el.append(o.profile.username)
                    el.append('"><img src="', { html: true, ContentOptions: 'after'})
                    el.append(o.profile.images.icon.medium)
                    el.append('"/></a></div>', { html: true, ContentOptions: 'after'})
                })
            }
        })

    updatePageWithCookie(env, request, rewriter)
    return rewriter.transform(response)
}