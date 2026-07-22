import { getToken, updatePageWithCookie } from "../cookie";
import { httpFetch } from "./[[index]]";
import { renderCommunityCell } from '../templates/community/.js'
import { buildPost } from "../templates/post/.js";

export async function onRequest(context) {
    const { request, env } = context
    const assetUrl = new URL('/search.html', request.url);
    let response = await env.ASSETS.fetch(assetUrl);
    const path = context.functionPath
    const rewriter = new HTMLRewriter()
    const timezone = request.cf.timezone

    const url = request.url
    console.log(request.url)
    const searchParams = new URLSearchParams(url)
    const cookie = request.headers.get("Cookie")
    const { user, token } = getToken(cookie)

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
        let query = url.split('?q=')[1].split('&')[0]
        const [groupsResults, usersResults, postsResults] = await Promise.all([
            httpFetch('/search/communities?q=' + query, 'GET', null),
            httpFetch('/search/users?q=' + query, 'GET', null),
            httpFetch('/search?q=' + query, 'GET', null)
        ])

        rewriter
            .on('#result-communities .content-wrapper', {
                async element(el) {
                    for (let i = 0; i < groupsResults.communities.length; i++) {
                        el.append(
                            await renderCommunityCell(groupsResults.communities[i]),
                            { html: true,  ContentOptions: 'after' }
                        )
                    }
                }
            })
            .on('input[name="q"]', {
                element(el) {
                    el.setAttribute("value", query)
                }
            })
            insertPostsAtEl(postsResults.posts, '#result-posts .mobile', rewriter)

    }

    updatePageWithCookie(env, request, rewriter)
    return rewriter.transform(response)
}