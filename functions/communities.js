import { getToken, updatePageWithCookie } from "../cookie";
import { httpFetch } from "./[[index]]";
import { renderCommunityCell } from '../templates/community/.js'
import { buildPost } from "../templates/post/.js";

export async function onRequest(context) {
    const { request, env } = context
    const assetUrl = new URL('/communities.html', request.url);
    let response = await env.ASSETS.fetch(assetUrl);
    const path = context.functionPath
    const rewriter = new HTMLRewriter()
    const timezone = request.cf.timezone

    const url = request.url
    console.log(request.url)
    const searchParams = new URLSearchParams(url)
    const cookie = request.headers.get("Cookie")
    const { user, token } = getToken(cookie)


    if (path) {
        const [recentGroups] = await Promise.all([
            httpFetch('/explore/communities/recent/get/1', 'GET', null),
        ])

        rewriter
            .on('#recent-communities .content-wrapper', {
                async element(el) {
                    for (let i = 0; i < recentGroups.groups.length; i++) {
                        el.append(
                            await renderCommunityCell(recentGroups.groups[i]),
                            { html: true,  ContentOptions: 'after' }
                        )
                    }
                }
            })

    }

    updatePageWithCookie(env, request, rewriter)
    return rewriter.transform(response)
}