import post_love from "../notification/loved_post/.html"

export async function renderNotification(notif) {
    const rewriter = new HTMLRewriter()
    var response = ''
    
    switch (notif.type) {
        case "post_love":
            response = new Response(post_love)
            rewriter
                .on('.notif-post-link', {element(el) {
                    el.setAttribute("href", "/post/" + notif.data.post)
                }})
                .on('.notif-user-link', {element(el) {
                    el.setAttribute("href", "/$" + notif.data.lover)
                }})
            break;
    
        default:
            return ''
    }

    if (!response) {
        return ''
    }
    return rewriter.transform(response).text()
}