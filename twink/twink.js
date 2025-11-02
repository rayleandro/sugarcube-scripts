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

  let $twink, $scroll; 

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

    unfurl(content) {
      const $scrollEntry = $(document.createElement('div'))
        .addClass([
          'twink-scroll-entry',
          'twink-in',
        ])
        .wiki(content);

      this.$buffer.append($scrollEntry);
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
  }

  const Nodes = {

    register: new Map(),

    _lastAutoID: 0,

    addNode(idArg = '', content) {

      /* optional ID only for choices */

      const id = idArg !== '' ? idArg : (++this._lastAutoID).toString();
      if (this.register.has(id)) {
        throw new TwinkError(`node id ${id} already taken`);
      }
      this.register.set(id, new Node(content));
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

    constructor(
      label, 
      node = null, 
      passage = null,
      sticky = true,
      exclusive = true,
      openWhen = 'true', 
      enabledWhen = 'true',
    ) {
      this.label = label; /* str */
      this.node = node; /* Node | null*/
      this.passage = passage; /* str | null*/
      this.sticky = sticky; /* bool */
      this.exclusive = exclusive; /* bool */
      this.openWhen = openWhen; /* str (tws) */
      this.enabledWhen = enabledWhen; /* str (tws) */
    }

    isOpen() {
      /* TODO */
    }

    isEnabled() {
      /* TODO */
    }

    use() {
      /* flow the relevant node */
      this.#used++;
    }
  }

  /* TODO [low priority] implement choices that don't get purged between passages. 
  might require separate register. and a 'purgedIf' condition
  TODO [low priority] some kind of priority system or reordering
  */
  const Choices = {

    register: new Map(),

    ordering: [],

    addChoice() {
      /* TODO */
    },

    purgeChoices() {
      /* TODO */
    },

    updateChoices() {
      /* TODO */
    }

  }

  /* twink progression during :passagedisplay */
  $(document).on(':passagedisplay', function ({detail: {content: content, passage: passage}}) {

    /* where we'll birth twink's children */
    $twink = $('#twink');
    $scroll = $(document.createElement('div'))
      .attr('id', 'twink-scroll')
      .appendTo($twink);

    Scroll.popScrollBuffer();

    /* TODO: hide the twink's children if they have nothing to show anyway */

  });

  /* exports */
  setup.Twink = {
    Scroll,
    Nodes,
  }

})();