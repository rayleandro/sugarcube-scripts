/* Usage:

<<says "Ray">>
  Hey there!!!
<</says>>

<<says "Jun">>
  It's hot outside, isn't it?
  <<say "Ray">>
  Yeah, it sure is. Manila weather is a treacherous fiend.
  <<say "Jun">>
  Haha! Wanna go out sometime?
<</says>>

Using the <<says>> macro with child tags make consecutive sayboxes look vertically combined, i.e.
without margins between them.
*/

function makeSay (name, text) {
  let $box = $('<div class="sayBox"></div>');
  let $header = $('<div class="sayHeader"></div>');
  $header.wiki(name);
  let $text = $('<div class="sayText"></div>');
  $text.wiki(text);
  $box
    .append($header)
    .append($text);
  return $box;
}

Macro.add('says', {
  tags: ['say'],
  handler: function () {
    let $output = $(this.output);
    let $wrapper = $('<div class="sayings"></div>');
    for (const p of this.payload) {
      let name = p.args[0] ?? '';
      $wrapper.append(makeSay(name, p.contents));
    }
    $output.append($wrapper);
  }
})