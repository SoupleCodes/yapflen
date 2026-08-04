import { httpFetch } from "../../functions/[[index]].js";
import html from "../comment/.html";
import { md, pfp } from "../post/.js";
import { returnDate } from "../post/.js";

export async function buildComment(data, tmz, reply) {
    const response = new Response(html)

    return new HTMLRewriter()
        .on('.comment-user-icon-container img', {
            element(el) {
                el.setAttribute("src", pfp(data))
            }
        })
        .on('.comment-author a', {
            element(el) {
                el.setAttribute("href", "/users/" + data.author.profile.username)
                el.setInnerContent(data.author.profile.display_name)
            }
        })
        .on('.comment-date', {
            element(el) {
                el.setInnerContent(returnDate(data.miscellaneous.creation_time * 1000, tmz))
            }
        })
        .on('.comment-content', {
            element(el) {
                el.setInnerContent(md.render(data.content), { html: true })
            }
        })
        .on('.reply-toggle', {
            element(el) {
                if (data.stats.replies == 0 || reply) {
                    el.remove()
                }
            }
        })
        .on('.replies', {
            async element(el) {
                if (data.stats.replies > 0 && !reply) {
                    let repliesHTML = ''
                    let replies = await httpFetch('/replies/' + data.id + '/posts/1', "GET")
                    replies = replies.replies.reverse()
                    if (!(!Array.isArray(replies) || !replies.length)) {
                        for (let i = 0; i < replies.length; i++) {
                            let reply = replies[i]
                            repliesHTML += await buildComment(reply, tmz, true)
                        }
                        el.setInnerContent(repliesHTML, { html: true })
                    }
                } else {
                    el.remove()
                }
            }
        })

    .transform(response).text()
}