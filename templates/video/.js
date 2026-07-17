import html from "../video/.html";

export async function renderVideoEl(file) {
    const response = new Response(html)

    return new HTMLRewriter()
        .on('video', {
            element(el) {
                el.setAttribute("poster", file.thumbnail)
            }
        })
        .on('source', {
            element(el) {
                el.setAttribute("src", file.file)
            }
        })
    .transform(response).text()
}