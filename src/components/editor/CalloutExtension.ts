import { Node, mergeAttributes } from '@tiptap/core';

export type CalloutType = 'info' | 'warning' | 'tip' | 'important';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      /**
       * Toggle a callout block
       */
      toggleCallout: (attrs?: { type?: CalloutType }) => ReturnType;
    };
  }
}

export const CalloutExtension = Node.create({
  name: 'callout',

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info' as CalloutType,
        parseHTML: (element) =>
          (element.getAttribute('data-callout-type') as CalloutType) || 'info',
        renderHTML: (attributes) => ({
          'data-callout-type': attributes.type,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-callout]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-callout': '',
        class: `callout callout-${HTMLAttributes['data-callout-type'] || 'info'}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleCallout:
        (attrs) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, attrs);
        },
    };
  },
});
