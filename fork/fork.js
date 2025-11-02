/* Usage:
```
<<fork type=ul>>
  <<opt
    link= "Click me!"
    open= $ch1_ongoing and $found_key
    ex=false
  >>
    This text will be inserted above the fork once clicked, into a div. <br><br>

    The "ex= false" option means that this option is not exclusive, i.e., the other options won't
    be automatically removed when it is used.
  <<opt link= "No, I am the true route!">>
    <<goto "Passage">>
<</fork>>
```

This is mostly only useful for easier formatting or slightly easier conditional options.
*/

(() => {
const Fork = {
  forkWriteClass: 'fork-written',
  forkClass: 'fork',
  forkChildTags: ['option', 'opt', 'o'],
  defaultListTag: 'ul',
  defaultOptExclusive: true,
  defaultOptSticky: false,
};

const argparse = 
  function (rawString) {
    /* Intended for parsing custom macros' raw argument strings.

    Format:
    param1= value param2= value flag1= flag2= param3= value

    All values are evaluated as TwineScript exprs. 
    i.e., when you call this function, the final values will be resolved already.

    Param names are [A-z0-9_].
    */

    /* Matches all sequences of `param1= value`, incl. `flag1=`. */
    const reMatch = /([A-z0-9_]+=)(.*?)(?=[A-z0-9_]+=|$)/g;

    const record = {};

    const matches = [...rawString.matchAll(reMatch)];

    /* Error if combining all the tokens isn't equal to the original string */
    /* This probably doesn't catch all possible errors haha */
    if (matches.flatMap(e => e[0]).join('') !== rawString) {
      throw new Error("invalid macro arguments");
    }

    for (const match of matches) {
      const param = match[1].replace('=', '');
      const group2 = match[2].trim();
      
      let value;
      if (group2 === '') {
        /* Treat it as a flag */
        value = true;
      } else {
        /* Treat it as a parameter that takes an expression */
        value = Scripting.evalTwineScript(group2);
      }

      record[param] = value;
    }

    return record;
  }

Macro.add(['fork', 'ul', 'ol'], {
  skipArgs: true,
  tags: Fork.forkChildTags,
  handler() {
    /* parse fork args */
    const forkArgs = argparse(this.args.raw);
    console.log(this.name);

    /* what tag? */
    const tag = 'tag' in forkArgs ? 
      forkArgs.tag 
      : this.name !== 'fork' ? 
        this.name : Fork.defaultListTag;

    /* setup list element */
    let $list;

    if (tag === 'ul') {
      $list = $('<ul></ul>');
    } else if (tag === 'ol') {
      $list = $('<ol></ol>');
    } else {
      throw new Error("invalid html tag for a list");
    }
    $list.addClass(Fork.forkClass);

    /* loop thru payload, if cond true and is opt*/
    for (const macro of this.payload) {
      if (! (Fork.forkChildTags.includes(macro.name))) {
        continue
      }
      
      /* parse opt args */
      const optArgs = argparse(macro.args.raw);

      /* ensure openness, defaults to open */
      if ('open' in optArgs && !optArgs.open) {
        continue;
      } 

      /* ensure link text */
      if (! ('link' in optArgs) || optArgs.link === '') {
        throw new Error('empty link');
      }

      const exclusive = 'ex' in optArgs ? !!optArgs.ex : Fork.defaultOptExclusive;
      const sticky = 'sticky' in optArgs ? !!optArgs.sticky : Fork.defaultOptSticky;

      /* set up li  */
      const $li = $('<li></li>');
      const $link = $('<a></a>')
        .attr('role', 'button')
        .wiki(optArgs.link)
        .ariaClick(() => {
          /* run code */
          const $message = $('<div></div>')
            .wiki(macro.contents)
            .addClass(Fork.forkWriteClass);

          /* don't append if empty */
          if ($message.text().trim() !== '') {
            $message.insertBefore($list);
          }

          console.log(`ex: ${optArgs.ex} and ${'ex' in optArgs}`);

          /* unless ex is false, kill list element by default */
          /* else, kill li itself, unless sticky (untested)*/
          if (exclusive) {
            $list
              .empty()
              .remove();
          } else if (!sticky){
            $li
              .empty()
              .hide();
          }

          /* TODO kill list if no li left */
        });
      
      /* add li to list */
      $li.append($link);
      $list.append($li);
    }

    /* build output */
    $(this.output)
      .append($list);
  }
});

/* EXPORTS */

setup.Fork = Fork;

})();