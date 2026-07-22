import html from "../result/.html";

export async function renderResult(data) {
    const response = new Response(html)

    return new HTMLRewriter()
        .on('a.search-result-wrapper', {
            element(el) {
                el.setAttribute("href",
                    data.profile?.name ? '/communities/' + data.profile.name
                    : data.profile?.username ? '/users/' + data.profile.username
                    : '/posts/' + data.id
                )
            }
        })
        .on('.search-result-icon img', {
            element(el) {
                el.setAttribute("src", 
                    data.profile?.images.icon.medium ||
                    data.author?.profile.images.icon.medium ||
                    ""
                )
            }
        })
        .on('.result-title', {
            element(el) {
                el.setInnerContent(
                    data.profile?.display_name ||
                    data.profile?.username ||
                    data.author?.profile.display_name
                )
            }
        })
        .on('.result-stats-count', {
            element(el) {
                el.setInnerContent(
                    data.stats?.members ? data.stats.members + ' members'
                    : data.stats?.followers ? data.stats.followers + ' followers'
                    : data.content ? data.content.trim().substring(0,50) + ' ...'
                    : ''
                )
            }
        })
    .transform(response).text()
}