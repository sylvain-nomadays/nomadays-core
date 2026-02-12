'use client';

import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link,
  Undo2,
  Redo2,
  Info,
  RemoveFormatting,
} from 'lucide-react';
import type { CalloutType } from './CalloutExtension';
import { ContentRefToolbarButton } from './ContentRefToolbarButton';

// ─── Types ──────────────────────────────────────────────────────────

interface EditorToolbarProps {
  editor: Editor;
  compact?: boolean;
  enableContentRefs?: boolean;
}

interface ToolbarButton {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: () => void;
  isActive?: () => boolean;
  disabled?: boolean;
}

// ─── Toolbar Button ─────────────────────────────────────────────────

function ToolbarBtn({
  icon: Icon,
  label,
  action,
  isActive,
  disabled,
}: ToolbarButton) {
  const active = isActive?.() ?? false;

  return (
    <button
      type="button"
      onClick={action}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-primary-100 text-primary-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
      title={label}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function Separator() {
  return <div className="w-px h-5 bg-gray-200 mx-0.5" />;
}

// ─── Link Dialog helper ─────────────────────────────────────────────

function handleLinkAction(editor: Editor) {
  const previousUrl = editor.getAttributes('link').href;

  if (previousUrl) {
    // If already on a link, remove it
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }

  const url = window.prompt('URL du lien :', 'https://');
  if (url === null) return; // cancelled
  if (url === '' || url === 'https://') {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }

  editor
    .chain()
    .focus()
    .extendMarkRange('link')
    .setLink({ href: url })
    .run();
}

// ─── EditorToolbar ──────────────────────────────────────────────────

export function EditorToolbar({ editor, compact = false, enableContentRefs = false }: EditorToolbarProps) {
  if (!editor) return null;

  // ── Compact mode: minimal formatting ──
  if (compact) {
    return (
      <div className="flex items-center gap-0.5 p-1 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <ToolbarBtn
          icon={Bold}
          label="Gras (Ctrl+B)"
          action={() => editor.chain().focus().toggleBold().run()}
          isActive={() => editor.isActive('bold')}
        />
        <ToolbarBtn
          icon={Italic}
          label="Italique (Ctrl+I)"
          action={() => editor.chain().focus().toggleItalic().run()}
          isActive={() => editor.isActive('italic')}
        />
        <ToolbarBtn
          icon={Underline}
          label="Souligné (Ctrl+U)"
          action={() => editor.chain().focus().toggleUnderline().run()}
          isActive={() => editor.isActive('underline')}
        />
        <Separator />
        <ToolbarBtn
          icon={Link}
          label="Lien (Ctrl+K)"
          action={() => handleLinkAction(editor)}
          isActive={() => editor.isActive('link')}
        />
        <Separator />
        <ToolbarBtn
          icon={List}
          label="Liste à puces"
          action={() => editor.chain().focus().toggleBulletList().run()}
          isActive={() => editor.isActive('bulletList')}
        />
        {enableContentRefs && (
          <>
            <Separator />
            <ContentRefToolbarButton editor={editor} />
          </>
        )}
        <div className="flex-1" />
        <ToolbarBtn
          icon={Undo2}
          label="Annuler (Ctrl+Z)"
          action={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        />
        <ToolbarBtn
          icon={Redo2}
          label="Rétablir (Ctrl+Shift+Z)"
          action={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        />
      </div>
    );
  }

  // ── Full mode: all formatting options ──
  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1 border-b border-gray-200 bg-gray-50 rounded-t-lg">
      {/* Text formatting */}
      <ToolbarBtn
        icon={Bold}
        label="Gras (Ctrl+B)"
        action={() => editor.chain().focus().toggleBold().run()}
        isActive={() => editor.isActive('bold')}
      />
      <ToolbarBtn
        icon={Italic}
        label="Italique (Ctrl+I)"
        action={() => editor.chain().focus().toggleItalic().run()}
        isActive={() => editor.isActive('italic')}
      />
      <ToolbarBtn
        icon={Underline}
        label="Souligné (Ctrl+U)"
        action={() => editor.chain().focus().toggleUnderline().run()}
        isActive={() => editor.isActive('underline')}
      />

      <Separator />

      {/* Headings */}
      <ToolbarBtn
        icon={Heading2}
        label="Titre 2"
        action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={() => editor.isActive('heading', { level: 2 })}
      />
      <ToolbarBtn
        icon={Heading3}
        label="Titre 3"
        action={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={() => editor.isActive('heading', { level: 3 })}
      />

      <Separator />

      {/* Lists */}
      <ToolbarBtn
        icon={List}
        label="Liste à puces"
        action={() => editor.chain().focus().toggleBulletList().run()}
        isActive={() => editor.isActive('bulletList')}
      />
      <ToolbarBtn
        icon={ListOrdered}
        label="Liste numérotée"
        action={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={() => editor.isActive('orderedList')}
      />

      <Separator />

      {/* Block elements */}
      <ToolbarBtn
        icon={Quote}
        label="Citation"
        action={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={() => editor.isActive('blockquote')}
      />
      <ToolbarBtn
        icon={Info}
        label="Encart info"
        action={() =>
          editor
            .chain()
            .focus()
            .toggleCallout({ type: 'info' as CalloutType })
            .run()
        }
        isActive={() => editor.isActive('callout')}
      />
      <ToolbarBtn
        icon={Link}
        label="Lien (Ctrl+K)"
        action={() => handleLinkAction(editor)}
        isActive={() => editor.isActive('link')}
      />
      {enableContentRefs && (
        <ContentRefToolbarButton editor={editor} />
      )}

      <Separator />

      {/* Formatting reset */}
      <ToolbarBtn
        icon={RemoveFormatting}
        label="Supprimer le formatage"
        action={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
      />

      <div className="flex-1" />

      {/* Undo/Redo */}
      <ToolbarBtn
        icon={Undo2}
        label="Annuler (Ctrl+Z)"
        action={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      />
      <ToolbarBtn
        icon={Redo2}
        label="Rétablir (Ctrl+Shift+Z)"
        action={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      />
    </div>
  );
}
