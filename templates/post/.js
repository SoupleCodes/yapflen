import html from "../post/.html";
import { renderVideoEl } from '../video/.js'
import markdownit from 'markdown-it'
import hljs from 'highlight.js';

function returnDate(d, tmz) {
    var daysElasped = Math.floor((new Date() - new Date(d)) / 86400000)
    if (daysElasped > 1) {
        return new Date(d).toLocaleTimeString([],{ month: "long", day: "numeric", year: "numeric", timeZone: tmz }).split(" at ")[0]
    } else if (daysElasped == 1) {
        return 'Yesterday'
    } else {
        return new Date(d).toLocaleTimeString([],{ hour: 'numeric', minute: 'numeric', timeZone: tmz }) 
    }
}

async function dealWithAttachment(el, file) {
    switch (file.type) {
        case "image":
            el.append('<img onerror="this.src=\'/images/error-image.png\'" src="', { html: true, ContentOptions: 'after'})
            el.append(file.large)
            el.append('" />', { html: true, ContentOptions: 'after'})
            break;
        case "video":
            el.append(await renderVideoEl(file), { html: true, ContentOptions: 'after'})
        default:
            break;
    }
}

const placeholder = [
        "What do you think about this?",
        "How do you feel about this?",
        "Any tips or ideas to add?",
        "What do you like or dislike about it?",
        "What comes to mind?"
]

export async function buildPost(data, tmz, repost, token) {
    const response = new Response(html)
    const md = markdownit({
        highlight: function (str, lang) {
          if (lang && hljs.getLanguage(lang)) {
            try {
              return hljs.highlight(str, { language: lang }).value;
            } catch (__) {}
          }
      
          return ''; // use external default escaping
        },
        linkify: true
    })

    return new HTMLRewriter()
        .on('.post-container', {
            element(el) {
                if (repost) {
                    el.setAttribute("id", 'repost-' + data.id)
                    el.setAttribute("class", "repost-container")
                } else {
                    el.setAttribute("id", 'post-' + data.id) 
                }
                el.setAttribute("data-author", data.author.profile.username)
                el.setAttribute("data-active", data.author.profile.status)
            }
        })

        .on('.post-user-icon-container', {
            element(el) {
                el.setAttribute("title", 'this user is ' + data.author.profile.status)
            }
        })
        .on('.post-user-icon-container img', {
            element(el) {
                var pfpURL = data.author.profile.images.icon.medium
                if (pfpURL=='https://static.darflen.com/uploads/medium/icon.jpg') {
                    if (data.author.profile.username!='darflen') {
                        pfpURL = '/images/default.png'
                    }
                }
                el.setAttribute("src", pfpURL ?? '/images/default.png') 
            }
        })

        .on('.post-user-displayname', {
            element(el) {
                el.setInnerContent(data.author.profile.display_name.trim()=="" ? data.author.profile.username : data.author.profile.display_name)
                if (data.repost) {
                    el.append('<span>', { html: true, ContentOptions: 'after'})
                    el.append(' reposted:')
                    el.append('</span>', { html: true, ContentOptions: 'after'})
                }
            }
        })

        .on('.post-user-time', {
            element(el) {
                el.setInnerContent(
                    String(data.audience[0]).toUpperCase() + String(data.audience).slice(1) +
                    (data.edited ? ' (edited)' : '') +
                    " - " +
                    returnDate(data.miscellaneous.creation_time * 1000, tmz)
                )
                el.setAttribute("title", new Date(data.miscellaneous.creation_time * 1000).toUTCString(
                    [],{ timeZone: tmz }
                ))
                if (data.group) {
                    el.append(' - <a href="/communities/', { html: true, ContentOptions: 'after'})
                    el.append(data.group.name||data.group.profile.name)
                    el.append('" title="', { html: true, ContentOptions: 'after'})
                    el.append(data.group.description||data.group.profile.description)
                    el.append('">', { html: true, ContentOptions: 'after'})
                    el.append(data.group.name||data.group.profile.name)
                    el.append('</a>', { html: true, ContentOptions: 'after'})
                }
            }
        })

        .on('.post-message-container', {
            element(el) {
                el.setInnerContent(md.render(data.content), { html: true, ContentOptions: 'after'})
            }
        })


        // Post stats
        .on('.loves.post-action small', {
            element(el) {
                el.setInnerContent(data.stats.loves)
            }
        })

        .on('.reposts.post-action small', {
            element(el) {
                el.setInnerContent(data.stats.reposts)
            }
        })


        // Reposts
        .on('.post-repost', {
            async element(el) {
                if (data.repost) {
                    el.append(await buildPost(data.repost, tmz, true), { html: true, ContentOptions: 'after'})
                } else {
                    el.remove()
                }
            }
        })

        
        // For polls
        .on('.post-poll', {
            element(el) {
                if (!data.poll) {
                    el.remove()
                } else {
                    var options = data.poll.options
                    for (let i = 0; i < options.length; i++) {
                        var option = options[i]
                        el.append('<div class="poll-option"><small>', { html: true, ContentOptions: 'after'})
                        el.append(option.option)
                        el.append('</small></div>', { html: true, ContentOptions: 'after'})
                    }
                }
            }
        })
        .on('.post-poll .post-poll-info', {
            element(el) {
                if (data.poll) {
                    var votes = data.poll.votes
                    var voteText = ''
                    if (votes > 1) {
                        voteText = votes + ' votes'
                    } else if (votes == 1) {
                        voteText = '1 vote'
                    } else {
                        voteText = 'No votes yet'
                    }

                    el.setInnerContent(voteText + ' - Ending in ' + 'some days ago')
                }
            }
        })


        // For viewing one attachment
        .on('.post-attachment', {
            element(el) {
                if (!(data.files && data.files.length==1)) {
                    el.remove()
                }
            }
        })
        .on('.post-attachment', {
            async element(el) {
                if (data.files && data.files.length==1) {
                    await dealWithAttachment(el, data.files[0])
                }
            }
        })

        // For viewing multiple
        .on('.post-image-slider', {
            element(el) {
                if (!(data.files && data.files.length>1)) {
                    el.remove()
                }
            }
        })
        .on('.post-image-slider .pagination', {
            element(el) {
                if (data.files && data.files.length>1) {
                    for (let i = 0; i < data.files.length; i++) {
                        el.append(`<div class="bullet${i > 0 ? '' : ' active'}"></div>`, { html: true, ContentOptions: 'after'})
                    }
                }
            }
        })
        .on('.post-image-slider ul', {
            async element(el) {
                if (data.files && data.files.length>1) {
                    var files = data.files
                    var len = files.length
                    for (let i = 0; i < len; i++) {
                        var attachment = files[i]
                        el.append('<li>', { html: true, ContentOptions: 'after'})
                        await dealWithAttachment(el, attachment)
                        el.append('</li>', { html: true, ContentOptions: 'after'})
                    }
                }
            }
        })


        // User actions
        .on('.post-user-actions-container', {
            element(el) {
                if (repost) el.remove()

                // If user is logged in
                if (token) {
                    el.append('<textarea placeholder="' + 
                        'Add a comment...' +
                        '" class="post-actions-textarea"></textarea>', {
                        html: true,
                        ContentOptions: 'after'
                    })
                }
            }
        })

        
        .transform(response).text()
}