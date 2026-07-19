import html from "./templates/nav-account.html";

export function getToken(cookie) {
    if (!cookie) {
        return { user: null, token: null }
    }
    var cookieVal = cookie && cookie.split("=")[1]
    var cookieArr = cookie && cookieVal.split("||")

    return { user: cookieArr[0]??null, token: cookieArr[1]??null }
}

const placeholder = [
    "What are you thinking?",
    "What will you share today?",
    "What are you doing?",
    "What's something cool you saw today?",
    "What's inspiring you today?",
    "What's something you learned recently?",
    "Got something on your mind?"
]


export function updatePageWithCookie(env, req, rewriter) {
    var cookie = req.headers.get("Cookie")
    const { user, token } = getToken(cookie)
    if (user && token) {        
        rewriter
            .on("#nav-account", {
                async element(el) {
                    const response = new Response(html)

                    const newNav = await new HTMLRewriter()
                        .on('#nav-username', {
                            element(el) {
                                el.setInnerContent(user)
                            }
                        })
                    .transform(response).text()

                    el.setAttribute("class", "")
                    el.setInnerContent(newNav, { html: true })
                }
            })
            .on('#explore-posts .column2', {
                element(el) {
                    el.setAttribute("style", "margin-top: -182px;")
                }
            })
            .on('#composer-b', {
                element(el) {
                    el.setAttribute("placeholder", placeholder[Math.floor(Math.random() * placeholder.length)])
                }
            })
    }
}