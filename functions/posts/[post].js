import { getToken, updatePageWithCookie } from "../../cookie.js";
import { buildPost, md, pfp } from "../../templates/post/.js";
import { httpFetch } from "../[[index]].js";

export async function onRequest(context) {
    const { request, env } = context
    const assetUrl = new URL('/post.html', request.url);
    let response = await env.ASSETS.fetch(assetUrl);
    const path = context.functionPath
    const rewriter = new HTMLRewriter()
    const timezone = request.cf.timezone

    const url = request.url
    const searchParams = new URLSearchParams(url)
    const cookie = request.headers.get("Cookie")
    const { user, token } = getToken(cookie)

    const id = context.params.post
    const data = await httpFetch('/posts/' + id, 'GET')

    rewriter
        .on('#post-wrapper', {
            async element(el) {
                el.append(await buildPost(data.post, timezone, null, token, data.post), { 
                    html: true, 
                    contentOptions: 'after' 
                })
            }
        })

    updatePageWithCookie(env, request, rewriter)
    return rewriter.transform(response)
}