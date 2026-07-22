import html from "../community/.html";

export async function renderCommunityCell(data, token) {
    const response = new Response(html)

    return new HTMLRewriter()
        .on('.community-card-wrapper', {
            element(el) {
                el.setAttribute("href", '/communites/' + data.profile.name)
            }
        })
        .on('.community-banner img', {
            element(el) {
                el.setAttribute("src", data.profile.images.icon.large)
            }
        })
        .on('.card-title.community-title', {
            element(el) {
                el.setInnerContent(data.profile.display_name)
            }
        })
        .on('.member-count', {
            element(el) {
                el.setInnerContent(data.stats.members + ' members')
            }
        })
    
    .transform(response).text()
}