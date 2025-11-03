(() => {
  /* WISHLIST
  use private properties more
  */

  /* CSS Selectors
  #twink
  #twink-scroll
  .twink-scroll-entry
  */

  class TwinkError extends Error {
    constructor (msg = '') {
      super(`twink broken! ${msg}`);
    }
  }

  let $twink, $scroll, $menu; 

  /* first :passagedisplay -> ensure that the #twink element exists  */
  /* we don't use :passagerender because all the necessary events will only trigger during after rendering */
  $(document).one(':passagedisplay', function (ev) {

    $twink = $('#twink');
    
    if ($twink.length === 0) {
      throw new TwinkError("passage didn't render #twink");
    }    
  });

  /* Scroll */
  const Scroll = {

    $buffer: $(document.createDocumentFragment()),

    unfurl(content, silent = false) {
      const $frag = $(document.createDocumentFragment())
        .wiki(content);
      
      if (silent) {
        /* Ripped off from silent.js */
        /* Discard the output, unless there were errors. */
        const errList = $frag.children('.error').map(errEl => errEl.textContent);

        if (errList.length > 0) {
          return this.error(`error${errList.length === 1 ? '' : 's'} within contents (${errList.join('; ')})`);
        }
      } else if ($frag.contents().length > 0) {
        console.log("WE'RE POGGING")
        /* find other ways to weed out empty unfurls */
        const $scrollEntry = $(document.createElement('div'))
          .addClass([
            'twink-scroll-entry',
            'twink-in',
          ])
          .append($frag);
        this.$buffer.append($scrollEntry);
      } else {
        /* empty, so don't unfurl anything */
        console.log("IT WAS EMPTY IDIOT")
      }
    },

    popScrollBuffer() {
      $scroll.append(this.$buffer);

      /* empty the buffer */
      this.$buffer = $(document.createDocumentFragment());
      /* TODO remember unfurled node/streamlet in history */
    }

  };

  /* Node */

  class Node {
    #used = 0;
    
    constructor(content) {
      this.content = content; /* str */
    }

    flow() {
      Scroll.unfurl(this.content);
      this.#used++;
    }

    isNode() {
      return true;
    }
  }

  const Nodes = {

    /* only for nodes with IDs, choices' auto nodes don't count */
    register: new Map(),

    addNode(id = null, content) {
      if (id === null) {
        return new Node(content);
      }

      if (this.register.has(id)) {
        throw new TwinkError(`node id ${id} already taken`);
      }
      
      const node = new Node(content);

      this.register.set(id, node);

      return node;
    }
  };

  const RE_NODE_ID = /^[A-z0-9_-]+$/;
  const RE_NUMBER = /^[0-9]+$/;

  /* <<node id>>
  (don't quote the arg)
  */
  Macro.add(['node'], {
    skipArgs: true,
    tags: ['nod'],
    handler: function () {
      /* TODO ensure that this is being called on a passage level */
      for (const node of this.payload) {
        
        /* validate ID */
        const idArg = node.args.raw.trim();
        let id;
        if (idArg.match(RE_NODE_ID)) {
          if (idArg.match(RE_NUMBER)) {
            throw new TwinkError(`invalid numeric node id ${idArg}`);
          }
          id = idArg;
        } else{
          throw new TwinkError(`no/invalid id ${idArg}`);
        }

        /* trim content */
        /* TODO config option for this behavior */
        const content = node.contents.trim();

        Nodes.addNode(id, content);
      }
    }
  });

  /* <<go id>>
  (don't quote the arg)
  */
  Macro.add(['go'], {
    skipArgs: true,
    handler: function () {
      const id = this.args.raw.trim();
      if (Nodes.register.has(id)) {
        Nodes.register.get(id).flow();
      } else {
        throw new TwinkError(`can't go to undefined node ${id}`);
      }
    }
  });

  /* Choices */

  class Choice {
    #used = 0; 

    constructor(label, obj) {
      console.log(obj.node);
      /* label: str */
      this.label = label.toString(); 

      /* node: Node | null (choice has no node) */    
      if ((obj.node ?? null) !== null) {
        try {
          if (!obj.node.isNode()) {
            throw new TwinkError(`${obj.node} not a node`);
          }
        } catch (e) {
          throw new TwinkError(`${obj.node} not a node`);
        }
        this.node = obj.node;
      } else {
        this.node = null;
      }

      /* passage: str | null (choice doesn't goto passage) */
      this.passage = (obj.passage ?? null) === null ? null : obj.passage.toString();

      /* sticky: bool, default false */
      this.sticky = !!obj.sticky;

      /* exclusive: bool, default true */
      this.exclusive = (obj.exclusive ?? null) === null ? true : !!obj.exclusive;

      /* openWhen: tws str, default true */
      switch (obj.openWhen) {
        case null:
        case undefined: 
        case '':
          this.openWhen = 'true';
          break;
        default:
          this.openWhen = obj.openWhen.toString();
      }

      /* enabledWhen: tws str, default true */
      switch (obj.enabledWhen) {
        case null:
        case undefined: 
        case '':
          this.enabledWhen = 'true';
          break;
        default:
          this.enabledWhen = obj.enabledWhen.toString();
      }

      /* disabledLabel: str with default template */
      this.disabledLabel = (obj.disabledLabel ?? null) === null ?
        `[Locked] ${label}` 
        : obj.disabledLabel.toString();
      
      /* usedBoundTo: str | null (don't bind #used to any story var) */
      this.usedBoundTo = (obj.usedBoundTo ?? null) === null ? null : obj.usedBoundTo.toString();
    }

    /* all conditions are evaluated based on truthiness */

    isOpen() {
      console.log(`used? ${this.#used}`);
      const openness = Scripting.evalTwineScript(this.openWhen);
      const isOpen = this.sticky || this.#used < 1 ? openness : false;
      console.log(`open? ${isOpen}`);
      return isOpen;
    }

    isEnabled() {
      return !!Scripting.evalTwineScript(this.enabledWhen);
    }

    use() {
      /* A choice can get used up thru diverts, even w/o manually selecting it, even if it's not open */

      /* TODO flow the relevant node */
      if (this.node !== null) {
        console.log('trying to flow node');
        this.node.flow();
      }

      /* TODO if passage, go, add buffer to postscript */

      this.#used++;
      if (this.usedBoundTo !== null && this.usedBoundTo in variables()) {
        variables()[this.usedBoundTo] = this.#used;
        /* TODO err if not a story var */
      }
    }

    isChoice() {
      return true;
    }
  }

  /* TODO [low priority] implement choices that don't get purged between passages. 
  might require separate register. and a 'purgedIf' condition
  TODO [low priority] some kind of priority system or reordering
  */
  const Choices = {

    /* not all choices get registered because they don't all have IDs */
    register: new Map(),

    /* this is what gets unfurled, this is like the model */
    menu: [],

    addChoice(id = null, label, obj) {
      const choice = new Choice(label, obj);

      /* registering */
      if (id !== null) {
        if (this.register.has(id)) {
          throw new TwinkError(`choice id ${id} already taken`);
        }
        this.register.set(id, new Choice(label, obj));
      }

      /* insert in menu */
      this.menu.push(choice);
    },

    purgeChoices() {
      /* TODO what else? */
      this.menu = [];
      $menu.empty();
    },

    /* this is what's actually used */
    /* i would like to use a generator so that you can't accidentally mess up the arr */
    /* you can copy the menu thru destructuring i think [...Choices.open()] */
    *choices() {
      for (const c of this.menu) {
        yield c;
      }
    },

    rebuildMenu(chosen = null) {
      console.log("rebuilding!!");
      /* TODO other reasons to update other choices after selecting? */
      /* if chosen is exclusive, purge */
      if (chosen !== null && chosen.exclusive) {
        console.log('purging');
        this.purgeChoices();
        if (chosen.sticky) {
          Choices.setMenu([chosen]);
        }
      }

      /* TODO config for ul or ol */
      const $list = $(document.createElement('ul'))
        .addClass('twink-menu-list');

      for (const choice of this.choices()) {
        if (choice.isOpen()) {
          const $li = $(document.createElement('li'));
          const $link = $(document.createElement('a'))
            .attr('role', 'button')
            .wiki(choice.label)
            .ariaClick((ev) => {

              /* choice use */
              console.log(choice);
              choice.use();

              /* scroll update */
              Scroll.popScrollBuffer();

              /* rebuild menu */
              Choices.rebuildMenu(choice);
            })
            .appendTo($li);
          $li.appendTo($list);
        }
      }

      if ($list.contents().length > 0) {
        $menu.empty();
        $menu.append($list);
      }
    },

    /* restore the list of choices */
    setMenu(newMenu) {
      /* TODO more error checking */
      for (const c of newMenu) {
        try {
          if (!c.isChoice()) {
            throw new TwinkError(`can't setMenu(); ${c} not a choice`);
          }
        } catch (e) {
          throw new TwinkError(`can't setMenu(); ${c} not a choice`);
        }
      }
      this.menu = newMenu;
    }

  }

  $(document).on(':passagestart', function ({detail: {content: content, passage: passage}}) {

    /* clean up node register */
    Nodes.register = new Map();

    /* clean up choice register */
    Choices.register = new Map();
  });

  /* called during 
    :passagedisplay
    after clicking on choices or other interactives 
  */
  function update() {
    Scroll.popScrollBuffer();
    /* TODO: hide the twink's children if they have nothing to show anyway */
    Choices.rebuildMenu();

  }

  /* twink progression during :passagedisplay */
  $(document).on(':passagedisplay', function ({detail: {content: content, passage: passage}}) {

    /* where we'll birth twink's children */  
    $twink = $('#twink');
    $scroll = $(document.createElement('div'))
      .attr('id', 'twink-scroll')
      .appendTo($twink);
    $menu = $(document.createElement('div'))
      .attr('id', 'twink-menu')
      .appendTo($twink);

    update();
  });

  /* exports */
  setup.Twink = {
    Scroll,
    Nodes,
    Choices,
  }

})();