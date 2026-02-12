import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ContentRefNodeView } from './ContentRefNodeView';

export interface ContentRefAttributes {
  type: string;      // ContentEntityType: attraction, destination, activity, accommodation, eating, region
  slug: string;      // Unique slug for content lookup
  title: string;     // Display title in the chip
  entityId?: string; // Optional entity ID for direct lookup
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    contentRef: {
      /**
       * Insert a content reference inline node
       */
      insertContentRef: (attrs: ContentRefAttributes) => ReturnType;
    };
  }
}

export const ContentRefExtension = Node.create({
  name: 'contentRef',

  group: 'inline',

  inline: true,

  atom: true, // Non-editable — the node is a single unit

  addAttributes() {
    return {
      type: {
        default: 'attraction',
        parseHTML: (element) => element.getAttribute('data-type') || 'attraction',
        renderHTML: (attributes) => ({ 'data-type': attributes.type }),
      },
      slug: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-slug') || '',
        renderHTML: (attributes) => ({ 'data-slug': attributes.slug }),
      },
      title: {
        default: '',
        parseHTML: (element) => element.textContent || '',
        renderHTML: () => ({}), // Title is rendered as text content
      },
      entityId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-entity-id') || null,
        renderHTML: (attributes) => {
          if (!attributes.entityId) return {};
          return { 'data-entity-id': attributes.entityId };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'content-ref',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'content-ref',
      mergeAttributes(HTMLAttributes),
      node.attrs.title || node.attrs.slug,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ContentRefNodeView);
  },

  addCommands() {
    return {
      insertContentRef:
        (attrs) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs,
            })
            .run();
        },
    };
  },
});
