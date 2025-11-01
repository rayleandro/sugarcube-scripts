/* This is a heavily modified fork/rip off of Chapel's Message Macro v.1.0.1.

Usage:

<<message "Click me for more information">> (a note!)<<note>> (another note!)<</message>>.

Changes to Chapel's Message Macro:
1. Cycles thru multiple messages, separated by <<note>>, making it similar to <<cycle>>.
2. Wraps the message in a span which isn't styled with "display:block", allowing it to be used inline.
3. Allows for multiple messages with the same link text.
*/

Macro.add('message', {
    tags    : ['note'],
    handler : function () {
        const $content = $(document.createElement('span'))
        $content.hide();
        const $wrapper = $(document.createElement('span'));
        const $link    = $(document.createElement('a'));
        $link.attr("role", "button");
        const messages = this.payload.map((m) => m.contents);
        const label = this.args[0] ?? '';
        let on = -1;
        $link
            .wiki(label)
            .ariaClick(function () {
                const prev = on;
                const cur = prev >= messages.length - 1 ? -1 : prev + 1;
                if (cur === -1) {
                    $content.hide().empty();
                } else {
                    $content.empty();
                    $content.show();
                    $content.wiki(messages[cur]);
                }
                on = cur;
            });

        $wrapper
            .addClass('message-wrapper')
            .append($link)
            .append($content)
            .appendTo(this.output);
    }
});