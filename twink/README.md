# twink
I'm attempting to implement a few stretchtext elements ripped off Ink (hence, twine-ink, or twink), because I really want it for my game. I'm only gonna try to make them contained within passages, i.e., nothing to do with saving, i.e. when you redo/undo the slate gets wiped clean.

Wishlist:

1. **Scroll**: the element appended inside div#passage where new text made by Twink unfurls. it should be placed in the passage footer, so that author has full control over where it goes. this way, i don't have to think about special styling, and it'll be automatically purged upon passage exit.
  - Scroll Manager: keeps track of which nodes/choice nodes/streamlets have been unfurled. For future possibility of saving the scroll state. Super low priority.
2. **Nodes**: equivalent of stitches. They have an identifier. 
  - Node Manager: identifies nodes, including choice nodes
3. **Choices**: 
  - **Choice Gate**(?) the choice itself that has a label and can be chosen, can be shown or hidden, can be enabled or disabled.
  - **Choice Node**(?) the node locked behind the choice, which has an automatic identifier
  - **Choice Menu**(?) the element where choices are inserted
  - Choice Manager: keeps track of visible choices and order of choices
4. **Streamlet**: equivalent of gathers. They unfurl themselves once there are no more choices to handle. They can be initiated as part of a passage, a node, or a choice node.
  - **River**: Streamlet manager: a stack of stacks, new subrivers are made when Streamlets are created within nodes/choice nodes.