import html from "../community/.html";

export async function renderCommunityCell(data, token) {
    const response = new Response(html)

    return new HTMLRewriter()
        .on('.community-banner img', {
            element(el) {

            }
        })
        .on('.card-title.community-title', {
            element(el) {

            }
        })
        .on('.member-count', {
            element(el) {
                
            }
        })
}